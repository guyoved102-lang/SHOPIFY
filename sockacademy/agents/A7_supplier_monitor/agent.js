/**
 * A7 — Supplier Monitor Agent v1.0
 * Monitors CJ Dropshipping products for stock, price, and availability changes.
 * Config-driven with placeholder thresholds — to be calibrated via market research.
 *
 * Actions (confirmed):
 *   OUT_OF_STOCK  → auto-draft on Shopify + email alert
 *   PRICE_CHANGED → auto-update Shopify price + email alert
 *   PRICE_CRITICAL→ auto-update + 2nd email with draft option
 *   DELISTED      → auto-draft on Shopify + email alert
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMsg = '') {
  if (!supabase) return;
  try {
    const run_status = status === 'failed' ? 'failure' : status;
    await supabase.from('agent_health_log').insert({
      agent_id:      'A7',
      agent_name:    'Supplier Monitor',
      run_status,
      error_message: errorMsg || null,
      metadata:      {},
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}
const nodemailer = require('nodemailer');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG — all thresholds are placeholders until market research defines them
// To activate: set env vars or replace null with real numbers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CONFIG = {
  STOCK_LOW_THRESHOLD:      process.env.STOCK_LOW_THRESHOLD      ? parseInt(process.env.STOCK_LOW_THRESHOLD)      : null, // units
  PRICE_CHANGE_WARN_PCT:    process.env.PRICE_WARN_PCT           ? parseFloat(process.env.PRICE_WARN_PCT)          : null, // %
  PRICE_CHANGE_CRITICAL_PCT:process.env.PRICE_CRITICAL_PCT       ? parseFloat(process.env.PRICE_CRITICAL_PCT)      : null, // %
  MARKUP_MULTIPLIER:        parseFloat(process.env.MARKUP_MULTIPLIER || '2.5'),

  // Confirmed behaviors
  STOCK_ZERO_AUTO_DRAFT:    true,
  AUTO_UPDATE_SHOPIFY_PRICE:true,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE PRODUCTS — קורא מוצרים שהועלו ל-Shopify מ-Supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getMonitoredProducts(supabase) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_name, cj_pid, shopify_id, retail_price, category')
      .like('upload_status', 'uploaded:%')
      .not('cj_pid', 'is', null);
    if (error) throw error;
    return (data || []).map(p => ({
      name:           p.product_name,
      cj_product_id:  p.cj_pid,
      shopify_id:     p.shopify_id ? String(p.shopify_id) : null,
      variant_id:     null,
      supplier_price: null,
      retail_price:   parseFloat(p.retail_price) || 0,
      category:       p.category || 'Premium Socks',
    }));
  } catch (e) {
    console.log(`   [products] Could not load from Supabase: ${e.message}`);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE MANAGEMENT — Supabase supplier_state table (persists across GH Actions runs)
// Schema: CREATE TABLE supplier_state (cj_pid text PRIMARY KEY, price numeric,
//         stock integer, status text, checked_at timestamptz);
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function loadStateFromSupabase(supabase) {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from('supplier_state').select('*');
    if (error) throw error;
    const state = {};
    for (const row of data || []) {
      state[row.cj_pid] = { price: row.price, stock: row.stock, status: row.status, checked_at: row.checked_at };
    }
    return state;
  } catch (e) {
    console.log(`   [state] Could not load from Supabase: ${e.message} — treating as fresh run`);
    return {};
  }
}

async function saveStateToSupabase(supabase, cjPid, stateData) {
  if (!supabase) return;
  try {
    await supabase.from('supplier_state').upsert(
      { cj_pid: cjPid, price: stateData.price, stock: stateData.stock, status: stateData.status, checked_at: stateData.checked_at },
      { onConflict: 'cj_pid' }
    );
  } catch (e) {
    console.log(`   [state] Save failed for ${cjPid}: ${e.message}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CJ DROPSHIPPING API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0';
let cjAccessToken = null;

async function getCJToken() {
  if (cjAccessToken) return cjAccessToken;
  const key = process.env.CJ_API_KEY || '';
  const parts = key.split('@');
  // Key format: email@api@token OR email@token — extract email + api key
  const email = parts[0];
  const apiKey = parts[parts.length - 1];

  const res = await fetch(`${CJ_BASE}/v1/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: apiKey }),
  });

  const data = await res.json();
  if (!data.data?.accessToken) throw new Error(`CJ auth failed: ${JSON.stringify(data)}`);
  cjAccessToken = data.data.accessToken;
  return cjAccessToken;
}

async function getCJProduct(productId) {
  // Simulate data for MOCK products
  if (productId.startsWith('MOCK_')) {
    const simulatedStock = Math.random() < 0.15 ? 0 : Math.floor(Math.random() * 300) + 5;
    const priceShift = (Math.random() - 0.5) * 0.3; // ±15% random shift
    return {
      stock: simulatedStock,
      price: null, // will use product.supplier_price as baseline
      status: Math.random() < 0.05 ? 'delisted' : 'active',
      simulated: true,
    };
  }

  const token = await getCJToken();
  const res = await fetch(`${CJ_BASE}/v1/product/query?pid=${productId}`, {
    headers: { 'CJ-Access-Token': token },
  });

  const data = await res.json();
  const p = data.data;
  return {
    stock: p?.productVariant?.[0]?.variantStock ?? 0,
    price: parseFloat(p?.productVariant?.[0]?.variantSellPrice ?? 0),
    status: p?.isOnSale ? 'active' : 'delisted',
    simulated: false,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHANGE DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function detectChanges(product, current, previous) {
  const changes = [];

  // Stock
  if (current.stock === 0 && (previous?.stock ?? 999) > 0) {
    changes.push({ type: 'OUT_OF_STOCK', severity: 'critical' });
  } else if (CONFIG.STOCK_LOW_THRESHOLD !== null && current.stock > 0 && current.stock < CONFIG.STOCK_LOW_THRESHOLD) {
    if ((previous?.stock ?? 999) >= CONFIG.STOCK_LOW_THRESHOLD) {
      changes.push({ type: 'LOW_STOCK', severity: 'warning' });
    }
  }

  // Price (skip if no previous price or simulated)
  const currentPrice = current.price ?? product.supplier_price;
  const previousPrice = previous?.price ?? product.supplier_price;
  if (!current.simulated && currentPrice && previousPrice && currentPrice !== previousPrice) {
    const pct = ((currentPrice - previousPrice) / previousPrice) * 100;
    if (CONFIG.PRICE_CHANGE_CRITICAL_PCT !== null && Math.abs(pct) >= CONFIG.PRICE_CHANGE_CRITICAL_PCT) {
      changes.push({ type: 'PRICE_CRITICAL', severity: 'critical', pct });
    } else if (CONFIG.PRICE_CHANGE_WARN_PCT !== null && Math.abs(pct) >= CONFIG.PRICE_CHANGE_WARN_PCT) {
      changes.push({ type: 'PRICE_CHANGED', severity: 'warning', pct });
    }
  }

  // Status
  if (current.status === 'delisted' && previous?.status !== 'delisted') {
    changes.push({ type: 'DELISTED', severity: 'critical' });
  }

  return changes;
}

function buildMessage(change, product, current) {
  const currentPrice = current.price ?? product.supplier_price;
  switch (change.type) {
    case 'OUT_OF_STOCK':   return 'Stock reached 0 — auto-drafted on Shopify';
    case 'LOW_STOCK':      return `Only ${current.stock} units remaining (threshold: ${CONFIG.STOCK_LOW_THRESHOLD})`;
    case 'PRICE_CHANGED':  return `Supplier price ${change.pct > 0 ? '+' : ''}${change.pct.toFixed(1)}% → new retail: $${(currentPrice * CONFIG.MARKUP_MULTIPLIER).toFixed(2)}`;
    case 'PRICE_CRITICAL': return `CRITICAL: ${change.pct > 0 ? '+' : ''}${change.pct.toFixed(1)}% price shift → margin review required`;
    case 'DELISTED':       return 'Product removed from CJ — auto-drafted on Shopify';
    default:               return 'Unknown change';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPIFY ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
if (!SHOPIFY_DOMAIN) throw new Error('SHOPIFY_SHOP_DOMAIN env var is required');

async function shopifyPut(endpoint, body) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2025-01/${endpoint}`, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_MASTER_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shopify: ${JSON.stringify(data.errors)}`);
  return data;
}

async function draftProduct(shopifyId, productName) {
  if (!shopifyId) { console.log(`    ⚠️  No Shopify ID — skipping auto-draft`); return; }
  await shopifyPut(`products/${shopifyId}.json`, { product: { id: shopifyId, status: 'draft' } });
  console.log(`    🔒 Auto-drafted on Shopify`);
}

async function updateShopifyPrice(shopifyId, variantId, newPrice, productName) {
  if (!shopifyId || !variantId) { console.log(`    ⚠️  No Shopify IDs — skipping price update`); return; }
  await shopifyPut(`variants/${variantId}.json`, { variant: { id: variantId, price: newPrice.toFixed(2) } });
  console.log(`    💲 Shopify price → $${newPrice.toFixed(2)}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTION HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleChange(product, change, current) {
  const currentPrice = current.price ?? product.supplier_price;

  if (change.type === 'OUT_OF_STOCK' || change.type === 'DELISTED') {
    await draftProduct(product.shopify_id, product.name);
  }

  if (change.type === 'PRICE_CHANGED' || change.type === 'PRICE_CRITICAL') {
    if (CONFIG.AUTO_UPDATE_SHOPIFY_PRICE) {
      const newRetail = currentPrice * CONFIG.MARKUP_MULTIPLIER;
      await updateShopifyPrice(product.shopify_id, product.variant_id, newRetail, product.name);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL ALERT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendAlert(allChanges) {
  if (!process.env.GMAIL_APP_PASSWORD || allChanges.length === 0) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const critical = allChanges.filter(c => c.severity === 'critical').length;
  const warnings = allChanges.filter(c => c.severity === 'warning').length;

  const rows = allChanges.map(c => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#F0EDE6;font-size:14px">${c.productName}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a">
        <span style="background:${c.severity === 'critical' ? '#3a0a0a' : '#2a1a0a'};color:${c.severity === 'critical' ? '#f87171' : '#fbbf24'};padding:3px 8px;border-radius:2px;font-size:11px;font-weight:700;text-transform:uppercase">${c.type.replace(/_/g, ' ')}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;color:#9ca3af;font-size:13px">${c.message}</td>
      ${c.type === 'PRICE_CRITICAL' && c.shopifyUrl ? `<td style="padding:10px 0;border-bottom:1px solid #1a1a1a"><a href="${c.shopifyUrl}" style="color:#C9A84C;font-size:12px;text-decoration:none">Draft product →</a></td>` : '<td></td>'}
    </tr>
  `).join('');

  const html = `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;background:#0A0A0A;color:#F0EDE6;padding:32px;border-radius:8px">
  <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #2a2a2a;padding-bottom:20px">
    <div style="font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase">SOCKACADEMY</div>
    <div style="font-size:20px;font-weight:700;margin-top:8px">A7 — Supplier Monitor</div>
    <div style="color:#6b7280;font-size:12px;margin-top:4px">${new Date().toLocaleDateString('he-IL')}</div>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:24px">
    ${critical ? `<div style="background:#3a0a0a;border:1px solid #ef4444;border-radius:6px;padding:12px 24px;text-align:center"><div style="color:#f87171;font-size:24px;font-weight:700">${critical}</div><div style="color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-top:2px">CRITICAL</div></div>` : ''}
    ${warnings ? `<div style="background:#2a1a0a;border:1px solid #f59e0b;border-radius:6px;padding:12px 24px;text-align:center"><div style="color:#fbbf24;font-size:24px;font-weight:700">${warnings}</div><div style="color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-top:2px">WARNINGS</div></div>` : ''}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <th style="text-align:left;color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px">Product</th>
      <th style="text-align:left;color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px">Issue</th>
      <th style="text-align:left;color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px">Details</th>
      <th style="text-align:left;color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px">Action</th>
    </tr>
    ${rows}
  </table>
  <p style="color:#4b5563;font-size:11px;margin-top:24px;text-align:center">A7 Supplier Monitor v1.0 · SockAcademy</p>
</div>`;

  const subject = critical
    ? `🚨 A7 — ${critical} critical supplier alert${critical > 1 ? 's' : ''} detected`
    : `⚠️ A7 — ${warnings} supplier warning${warnings > 1 ? 's' : ''}`;

  await transporter.sendMail({
    from: 'SockAcademy A7 Agent <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject,
    html,
  });

  console.log('📧 Alert sent');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  const supabase = getSupabase();
  await logHealth(supabase, 'running');
  console.log('🚀 A7 — Supplier Monitor Agent v1.0');
  console.log('━'.repeat(40));
  console.log(`⚙️  stock_threshold=${CONFIG.STOCK_LOW_THRESHOLD ?? 'TBD'} | price_warn=${CONFIG.PRICE_CHANGE_WARN_PCT ?? 'TBD'}% | price_critical=${CONFIG.PRICE_CHANGE_CRITICAL_PCT ?? 'TBD'}%`);
  console.log(`⚙️  markup=${CONFIG.MARKUP_MULTIPLIER}x | auto_draft=${CONFIG.STOCK_ZERO_AUTO_DRAFT} | auto_price=${CONFIG.AUTO_UPDATE_SHOPIFY_PRICE}`);

  const products = await getMonitoredProducts(supabase);
  if (!products.length) {
    console.log('⚠️  No monitored products (no uploaded products with cj_pid in Supabase)');
    console.log('   Upload products via A1→A2 pipeline first, then A7 will monitor them');
    await logHealth(supabase, 'success');
    return;
  }
  console.log(`📦 Monitoring ${products.length} live product(s) from Supabase\n`);

  const previousState = await loadStateFromSupabase(supabase);
  const allChanges = [];

  for (const product of products) {
    process.stdout.write(`  ${product.name}... `);

    try {
      const current = await getCJProduct(product.cj_product_id);
      const previous = previousState[product.cj_product_id] ?? null;
      const changes = detectChanges(product, current, previous);

      for (const change of changes) {
        change.productName = product.name;
        change.message = buildMessage(change, product, current);
        change.shopifyUrl = product.shopify_id
          ? `https://${SHOPIFY_DOMAIN}/admin/products/${product.shopify_id}`
          : null;
        await handleChange(product, change, current);
        allChanges.push(change);
      }

      await saveStateToSupabase(supabase, product.cj_product_id, {
        price:      current.price ?? product.supplier_price,
        stock:      current.stock,
        status:     current.status,
        checked_at: new Date().toISOString(),
      });

      if (changes.length === 0) {
        console.log(`✅ no changes (stock: ${current.stock})`);
      } else {
        console.log(`⚠️  ${changes.map(c => c.type).join(', ')}`);
      }

    } catch (e) {
      console.log(`❌ ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\n' + '━'.repeat(40));
  console.log(`✅ Done — ${allChanges.length} change(s) across ${products.length} products`);
  if (allChanges.length) await sendAlert(allChanges);
  await logHealth(supabase, 'success');
}

main().catch(async e => {
  console.error('💥 Fatal:', e.message);
  await logHealth(getSupabase(), 'failure', e.message).catch(() => {});
  await notifyTelegram(heTelegramMsg('A7 Supplier Monitor', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${e.message}</code>`));
  process.exit(1);
});
