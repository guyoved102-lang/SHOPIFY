/**
 * A2 — Product Upload Agent v2.0
 * קורא Supabase → מייצר תיאור SEO עם Claude Sonnet → מעלה ל-Shopify כ-Draft
 * טריגר: GitHub Actions יומי / ידני
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_API_VERSION = '2025-01';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DRY_RUN = process.env.DRY_RUN === 'true';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getSupabase() {
  if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function getApprovedProducts(supabase) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'Approved')
    .eq('upload_status', 'qc_approved');

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data || [];
}

async function setUploadStatus(supabase, id, status) {
  const { error } = await supabase
    .from('products')
    .update({ upload_status: status })
    .eq('id', id);
  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

async function markUploaded(supabase, id, shopifyProduct) {
  const { error } = await supabase
    .from('products')
    .update({
      upload_status: `uploaded:${shopifyProduct.id}`,
      shopify_id: String(shopifyProduct.id),
      shopify_url: `https://sockacademy.store/products/${shopifyProduct.handle}`,
      upload_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id);
  if (error) throw new Error(`Supabase markUploaded failed: ${error.message}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE — תיאור SEO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateDescription(product) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are writing a product description for SockAcademy — the world's first dedicated sock authority. Think: Nike-level positioning, but for premium socks.

Brand voice: authoritative, precise, understated luxury. No hype. No adjective stacking. The tone is that of an expert who has tested every sock in existence and this is the one worth buying.

Product: ${product.product_name}
Category: ${product.category || 'Premium Socks'}
Materials: ${product.materials || 'premium materials'}
Price: $${product.retail_price}

Rules:
- 150-200 words, HTML format (<p> and <ul><li> tags)
- Open with ONE strong declarative sentence (no "introducing" or "meet the")
- 4-5 bullet points: specific, material-focused, technical where relevant
- Mention SockAcademy only as the curator/authority, never as the manufacturer
- No exclamation marks. No generic words: amazing, incredible, perfect, best
- End with a calm, confident close — no pushy CTA
- Return ONLY the HTML, no explanation`
    }],
  });
  return msg.content[0].text.trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IMAGE VALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function validateImageUrl(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPIFY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function createShopifyProduct(product) {
  const tags = buildTags(product);

  const payload = {
    product: {
      title: product.product_name,
      body_html: product.description,
      vendor: 'SockAcademy',
      product_type: product.category || 'Socks',
      status: 'draft',
      tags: tags.join(', '),
      variants: [{
        price: Number(product.retail_price).toFixed(2),
        inventory_management: null,
        fulfillment_service: 'manual',
        requires_shipping: true,
        taxable: true,
      }],
      images: product.image_url ? [{ src: product.image_url, alt: product.product_name }] : [],
    }
  };

  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_MASTER_TOKEN,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shopify ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.product;
}

function buildTags(product) {
  const tags = ['sockacademy', 'a2-agent'];
  const cat = (product.category || '').toLowerCase();
  const mat = (product.materials || '').toLowerCase();

  if (cat) tags.push(cat.replace(/[^a-z0-9]+/g, '-'));
  if (mat.includes('merino')) tags.push('merino-wool');
  if (mat.includes('bamboo')) tags.push('bamboo');
  if (mat.includes('cashmere')) tags.push('cashmere');
  if (mat.includes('egyptian') && mat.includes('cotton')) tags.push('egyptian-cotton');
  else if (mat.includes('cotton')) tags.push('cotton');
  if (mat.includes('copper')) tags.push('copper-fiber');
  if (cat.includes('athletic')) tags.push('sport', 'performance');
  if (cat.includes('dress')) tags.push('dress-socks', 'formal');
  if (cat.includes('gift')) tags.push('gift', 'gift-set');

  return [...new Set(tags)];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMAIL SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function sendSummaryEmail(results) {
  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#1a1a2e">A2 — דוח העלאת מוצרים</h2>
  <p style="color:#666">תאריך: ${new Date().toLocaleDateString('he-IL')}</p>

  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0">
    <h3 style="color:#16a34a;margin:0 0 12px">הועלו בהצלחה: ${success.length}</h3>
    ${success.map(r => `
      <div style="margin:8px 0;padding:8px;background:#fff;border-radius:4px">
        <strong>${r.name}</strong><br>
        <a href="https://${SHOPIFY_DOMAIN}/admin/products/${r.id}" style="color:#2563eb;font-size:13px">
          פתח ב-Shopify Admin
        </a>
      </div>
    `).join('')}
  </div>

  ${failed.length ? `
  <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0">
    <h3 style="color:#dc2626;margin:0 0 12px">שגיאות: ${failed.length}</h3>
    ${failed.map(r => `<p style="margin:4px 0">• <strong>${r.name}</strong>: ${r.error}</p>`).join('')}
  </div>` : ''}

  <p style="color:#999;font-size:12px;margin-top:24px">SockAcademy A2 Agent v2.0 — Supabase + Claude Sonnet</p>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy Agent <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: `A2 — ${success.length} מוצרים הועלו ל-Shopify${failed.length ? ` (${failed.length} שגיאות)` : ''}`,
    html,
  });

  console.log('📧 סיכום נשלח למייל');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH MONITORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function logHealth(supabase, status, errorMessage = '') {
  try {
    const run_status = status.toLowerCase() === 'failed' ? 'failure' : status.toLowerCase();
    await supabase.from('agent_health_log').insert({
      agent_id:      'A2',
      agent_name:    'Product Upload',
      run_status,
      error_message: errorMessage || null,
      metadata:      {},
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

async function sendErrorAlert(errorMessage) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: '"SockAcademy Agents" <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: '🚨 A2 Product Upload FAILED — action needed',
    html: `<div style="font-family:monospace"><h2>🚨 A2 Failed</h2><p><strong>Time:</strong> ${new Date().toISOString()}</p><pre style="background:#f5f5f5;padding:12px;border-radius:4px">${errorMessage}</pre></div>`,
  }).catch(e => console.error('Alert email failed:', e.message));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('🚀 A2 — Product Upload Agent v2.0 (Supabase + Claude Sonnet)');
  console.log('━'.repeat(50));

  const missing = ['SHOPIFY_MASTER_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌ חסרים: ${missing.join(', ')}`);
    process.exit(1);
  }

  let supabase;
  try {
    supabase = getSupabase();
    console.log('✅ Supabase מחובר');
  } catch (e) {
    console.error(`❌ Supabase: ${e.message}`);
    process.exit(1);
  }

  await logHealth(supabase, 'RUNNING');

  const approvedProducts = await getApprovedProducts(supabase);
  console.log(`📋 מוצרים מאושרים להעלאה: ${approvedProducts.length}`);

  if (approvedProducts.length === 0) {
    console.log('✅ אין מוצרים חדשים — הכל עדכני');
    return;
  }

  const results = [];

  for (const product of approvedProducts) {
    if (!product.product_name) continue;

    try {
      process.stdout.write(`⏳ ${product.product_name}... `);

      if (DRY_RUN) {
        product.description = await generateDescription(product);
        console.log(`✅ [DRY_RUN] description generated, skipping Shopify upload`);
        results.push({ name: product.product_name, id: 'DRY_RUN', success: true });
      } else {
        // Optimistic lock: write 'uploading' BEFORE calling Shopify.
        // If A2 crashes after this and before markUploaded, the row stays 'uploading'
        // and will be skipped on retry — preventing duplicate Shopify products.
        await setUploadStatus(supabase, product.id, 'uploading');

        product.description = await generateDescription(product);

        if (product.image_url) {
          const imageOk = await validateImageUrl(product.image_url);
          if (!imageOk) {
            console.log(`   ⚠️  Image URL unreachable — uploading without image`);
            product.image_url = null;
          }
        }

        const shopifyProduct = await createShopifyProduct(product);

        await markUploaded(supabase, product.id, shopifyProduct);
        console.log(`✅ #${shopifyProduct.id}`);
        results.push({ name: product.product_name, id: shopifyProduct.id, success: true });
      }

    } catch (e) {
      console.log(`❌ ${e.message}`);
      try {
        await setUploadStatus(supabase, product.id, `Error: ${e.message.slice(0, 150)}`);
      } catch (_) {}
      results.push({ name: product.product_name, error: e.message, success: false });
    }

    await new Promise(r => setTimeout(r, 800));
  }

  console.log('━'.repeat(50));
  console.log(`✅ הסתיים — ${results.filter(r => r.success).length}/${results.length} הועלו`);

  await sendSummaryEmail(results);
  await logHealth(supabase, 'SUCCESS');
}

main().catch(async e => {
  console.error('💥 Fatal:', e.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'ERROR', e.message);
    await sendErrorAlert(e.message);
  } catch (_) {}
  process.exit(1);
});
