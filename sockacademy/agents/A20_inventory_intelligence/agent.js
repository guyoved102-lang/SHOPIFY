/**
 * A20 — Inventory Intelligence Agent
 *
 * Runs daily at 07:00 UTC.
 * Reads:  Shopify products + variants (inventory_quantity per variant)
 *         Shopify orders (last 30d) for velocity calculation
 *         Supabase products table (supplier cost)
 * Writes: inventory_alerts (one row per SKU, upserted)
 *         executive_reports (agent_id='A20', report_type='daily')
 * Sends:  email digest to Guy — always (pre-revenue: monitoring summary)
 *
 * Pre-revenue behavior: products intentionally at 0 inventory.
 * Agent runs fully, reports 0-stock state, wakes up automatically when
 * inventory is restocked before launch.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic        = require('@anthropic-ai/sdk');
const nodemailer       = require('nodemailer');

const DRY_RUN              = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL          = 'guyoved102@gmail.com';
const REPORT_DATE          = new Date().toISOString().split('T')[0];
const DEFAULT_REORDER_PT   = parseInt(process.env.DEFAULT_REORDER_POINT || '10');
const LEAD_TIME_DAYS       = parseInt(process.env.LEAD_TIME_DAYS || '14');

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── SHOPIFY ─────────────────────────────────────────────────────────────────

function shopifyHeaders() {
  if (!process.env.SHOPIFY_MASTER_TOKEN) throw new Error('SHOPIFY_MASTER_TOKEN not set');
  if (!process.env.SHOPIFY_SHOP_DOMAIN)  throw new Error('SHOPIFY_SHOP_DOMAIN not set');
  return {
    'X-Shopify-Access-Token': process.env.SHOPIFY_MASTER_TOKEN,
    'Content-Type': 'application/json',
  };
}

function shopifyBase() {
  return `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2025-01`;
}

async function fetchAllProducts() {
  const products = [];
  let url = `${shopifyBase()}/products.json?limit=250&status=active`;
  const headers = shopifyHeaders();

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Shopify products: ${res.status} ${await res.text()}`);
    const data = await res.json();
    products.push(...(data.products || []));
    const link = res.headers.get('Link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return products;
}

async function fetchOrders30d() {
  const orders = [];
  const since  = new Date(Date.now() - 30 * 86400000).toISOString();
  let url = `${shopifyBase()}/orders.json?limit=250&status=any&created_at_min=${since}&fields=id,line_items,financial_status`;
  const headers = shopifyHeaders();

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Shopify orders: ${res.status}`);
    const data = await res.json();
    orders.push(...(data.orders || []));
    const link = res.headers.get('Link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return orders;
}

// ─── SUPPLIER COSTS ──────────────────────────────────────────────────────────

async function fetchSupplierCosts(sb) {
  const { data, error } = await sb
    .from('products')
    .select('product_name, cj_pid, cost_price')
    .not('cj_pid', 'is', null);
  if (error) {
    console.warn(`⚠️  Could not fetch supplier costs: ${error.message}`);
    return {};
  }
  const map = {};
  for (const row of data || []) {
    if (row.cj_pid) map[row.cj_pid] = parseFloat(row.cost_price) || null;
  }
  return map;
}

// ─── VELOCITY ────────────────────────────────────────────────────────────────

function calculateVelocity(orders) {
  const unitsSoldBySku = {};
  for (const order of orders) {
    if (!['paid', 'partially_paid'].includes(order.financial_status)) continue;
    for (const item of order.line_items || []) {
      const sku = item.sku || `variant_${item.variant_id}`;
      unitsSoldBySku[sku] = (unitsSoldBySku[sku] || 0) + (item.quantity || 1);
    }
  }
  return unitsSoldBySku;
}

// ─── ALERT LEVEL ─────────────────────────────────────────────────────────────

function alertLevel(stock, reorderPt) {
  if (stock === 0)               return 'out_of_stock';
  if (stock < reorderPt * 0.5)  return 'critical';
  if (stock < reorderPt)        return 'low';
  return 'ok';
}

// ─── BUILD SKU RECORDS ───────────────────────────────────────────────────────

function buildSkuRecords(products, velocityMap, supplierCosts) {
  const records = [];

  for (const product of products) {
    for (const variant of product.variants || []) {
      const sku      = variant.sku || `shopify_${variant.id}`;
      const velocity = velocityMap[sku] || 0;

      // Reorder point: 2× 30-day velocity to cover lead time, minimum DEFAULT_REORDER_PT
      const dynamicRop = velocity > 0
        ? Math.ceil((velocity / 30) * LEAD_TIME_DAYS * 2)
        : DEFAULT_REORDER_PT;
      const reorderPt = Math.max(dynamicRop, DEFAULT_REORDER_PT);

      const stock    = variant.inventory_quantity || 0;
      const forecast = parseFloat((velocity * (30 / 30) * (LEAD_TIME_DAYS / 30)).toFixed(2));

      records.push({
        sku,
        product_id:    product.id,
        product_title: product.title,
        variant_title: variant.title !== 'Default Title' ? variant.title : null,
        current_stock: stock,
        reorder_point: reorderPt,
        velocity_30d:  velocity,
        forecast_4w:   parseFloat((velocity * (28 / 30)).toFixed(2)),
        alert_level:   alertLevel(stock, reorderPt),
        supplier_cost: null,
        checked_at:    new Date().toISOString(),
      });
    }
  }
  return records;
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function upsertInventoryAlerts(sb, records) {
  if (DRY_RUN) {
    console.log(`\n[DRY_RUN] Would upsert ${records.length} rows to inventory_alerts`);
    return;
  }
  for (const rec of records) {
    const { error } = await sb.from('inventory_alerts').upsert(rec, { onConflict: 'sku' });
    if (error) console.warn(`⚠️  inventory_alerts upsert failed for ${rec.sku}: ${error.message}`);
  }
}

async function writeExecutiveReport(sb, summary, alerts, narrative) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would upsert to executive_reports (A20)');
    console.log(JSON.stringify({ agent_id: 'A20', kpis: summary }, null, 2));
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A20',
    report_date: REPORT_DATE,
    report_type: 'daily',
    kpis:        summary,
    alerts,
    narrative,
  }, { onConflict: 'agent_id,report_date,report_type' });
  if (error) throw new Error(`executive_reports upsert failed: ${error.message}`);
}

async function logHealth(sb, status, meta = {}) {
  if (DRY_RUN) return;
  const { error } = await sb.from('agent_health_log').insert({
    agent_id:        'A20',
    agent_name:      'Inventory Intelligence',
    run_status:      status,
    items_processed: meta.skus_checked || 0,
    metadata:        meta,
  });
  if (error) console.error(`⚠️  Health log failed: ${error.message}`);
}

// ─── NARRATIVE ───────────────────────────────────────────────────────────────

async function generateNarrative(summary) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 180,
    messages: [{
      role:    'user',
      content: `You are the Inventory Intelligence system for SockAcademy, a premium sock brand. Write a 2-sentence inventory briefing for the CEO based on this data. Be direct and factual. If pre-revenue (0 orders), note the system is monitoring and ready.\n\n${JSON.stringify(summary)}`,
    }],
  });
  return msg.content[0].text.trim();
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendEmail(summary, alertRows, narrative) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send A20 Inventory email to ${ADMIN_EMAIL}`);
    return;
  }

  const levelColor = { out_of_stock: '#dc2626', critical: '#d97706', low: '#d97706', ok: '#4AAD80' };

  const skuTable = alertRows
    .filter(r => r.alert_level !== 'ok')
    .slice(0, 15)
    .map(r => `
      <tr>
        <td style="padding:4px 8px;color:#f0ede6">${r.product_title}</td>
        <td style="padding:4px 8px;color:#9CA3AF;font-size:11px">${r.sku}</td>
        <td style="padding:4px 8px;text-align:center">${r.current_stock}</td>
        <td style="padding:4px 8px;text-align:center">${r.reorder_point}</td>
        <td style="padding:4px 8px;color:${levelColor[r.alert_level] || '#f0ede6'};font-weight:bold;text-transform:uppercase;font-size:11px">${r.alert_level.replace('_', ' ')}</td>
      </tr>`).join('');

  const preRevenueNote = summary.total_orders_30d === 0
    ? `<p style="color:#9CA3AF;font-size:12px;margin:12px 0">Pre-revenue phase — inventory intentionally at 0 pending supplier restocking. Monitoring active.</p>`
    : '';

  const html = `
<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A20 — Inventory Intelligence</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:12px">${REPORT_DATE}</p>

  ${narrative ? `<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:0 0 20px;background:#111;color:#f0ede6;font-style:italic">${narrative}</blockquote>` : ''}
  ${preRevenueNote}

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">Inventory Summary</h3>
  <table style="width:100%;margin-bottom:16px">
    <tr><td style="color:#9CA3AF;width:220px">SKUs monitored</td><td>${summary.skus_checked}</td></tr>
    <tr><td style="color:#9CA3AF">Orders (last 30d)</td><td>${summary.total_orders_30d}</td></tr>
    <tr><td style="color:#9CA3AF">OK</td><td style="color:#4AAD80">${summary.ok}</td></tr>
    <tr><td style="color:#9CA3AF">Low stock</td><td style="color:${summary.low > 0 ? '#d97706' : '#4AAD80'}">${summary.low}</td></tr>
    <tr><td style="color:#9CA3AF">Critical</td><td style="color:${summary.critical > 0 ? '#dc2626' : '#4AAD80'}">${summary.critical}</td></tr>
    <tr><td style="color:#9CA3AF">Out of stock</td><td style="color:${summary.out_of_stock > 0 ? '#dc2626' : '#4AAD80'}">${summary.out_of_stock}</td></tr>
  </table>

  ${skuTable ? `
  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">Alerts (non-OK SKUs)</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#1a1a1a">
      <th style="padding:4px 8px;text-align:left;color:#9CA3AF;font-size:11px">Product</th>
      <th style="padding:4px 8px;text-align:left;color:#9CA3AF;font-size:11px">SKU</th>
      <th style="padding:4px 8px;text-align:center;color:#9CA3AF;font-size:11px">Stock</th>
      <th style="padding:4px 8px;text-align:center;color:#9CA3AF;font-size:11px">Reorder</th>
      <th style="padding:4px 8px;text-align:left;color:#9CA3AF;font-size:11px">Level</th>
    </tr>
    ${skuTable}
  </table>` : '<p style="color:#4AAD80">✅ All SKUs within reorder thresholds</p>'}

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A20 Inventory Intelligence — ${REPORT_DATE}</p>
</div>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const critCount = summary.critical + summary.out_of_stock;
  await transporter.sendMail({
    from:    '"SockAcademy Inventory" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject: `A20 Inventory — ${REPORT_DATE} | ${critCount > 0 ? `🔴 ${critCount} critical` : '✅ All monitored'}`,
    html,
  });
  console.log('📧 Inventory digest sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📦 A20 — Inventory Intelligence Agent');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const sb = getSupabase();
  console.log('✅ Supabase connected');

  let products, orders, supplierCosts;
  try {
    [products, orders, supplierCosts] = await Promise.all([
      fetchAllProducts(),
      fetchOrders30d(),
      fetchSupplierCosts(sb),
    ]);
  } catch (e) {
    await logHealth(sb, 'failure', { error: e.message });
    throw e;
  }

  console.log(`📦 Products: ${products.length} | Orders 30d: ${orders.length}`);

  const velocityMap = calculateVelocity(orders);
  const records     = buildSkuRecords(products, velocityMap, supplierCosts);

  const summary = {
    skus_checked:      records.length,
    total_orders_30d:  orders.length,
    ok:                records.filter(r => r.alert_level === 'ok').length,
    low:               records.filter(r => r.alert_level === 'low').length,
    critical:          records.filter(r => r.alert_level === 'critical').length,
    out_of_stock:      records.filter(r => r.alert_level === 'out_of_stock').length,
    top_low_stock:     records
      .filter(r => r.alert_level !== 'ok')
      .sort((a, b) => a.current_stock - b.current_stock)
      .slice(0, 5)
      .map(r => ({ sku: r.sku, title: r.product_title, stock: r.current_stock, reorder: r.reorder_point })),
  };

  const reportAlerts = [];
  if (summary.out_of_stock > 0 && orders.length > 0)
    reportAlerts.push({ level: 'critical', message: `${summary.out_of_stock} SKU(s) out of stock with active sales velocity` });
  if (summary.critical > 0)
    reportAlerts.push({ level: 'warning', message: `${summary.critical} SKU(s) below 50% of reorder point` });
  if (summary.low > 0)
    reportAlerts.push({ level: 'info', message: `${summary.low} SKU(s) below reorder point` });

  console.log(`📊 Summary: ${summary.ok} ok | ${summary.low} low | ${summary.critical} critical | ${summary.out_of_stock} OOS`);

  const narrative = await generateNarrative(summary);
  if (narrative) console.log(`\n📝 ${narrative}`);

  await upsertInventoryAlerts(sb, records);
  await writeExecutiveReport(sb, summary, reportAlerts, narrative);
  await sendEmail(summary, records, narrative);
  await logHealth(sb, 'success', { skus_checked: records.length, critical: summary.critical, out_of_stock: summary.out_of_stock });

  console.log('\n' + '─'.repeat(52));
  console.log('✅ A20 Inventory Intelligence complete');
}

main().catch(async e => {
  console.error('\n❌ A20 fatal:', e.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'failure', { error: e.message });
  } catch (_) {}
  process.exit(1);
});
