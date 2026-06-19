/**
 * A2 — Product Upload Agent v1.0
 * קורא Google Sheets → מייצר תיאור SEO עם Claude → מעלה ל-Shopify כ-Draft
 * טריגר: GitHub Actions יומי / ידני
 */

require('dotenv').config({ path: '../../.env' });
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_API_VERSION = '2025-01';
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'A1_Products';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DRY_RUN = process.env.DRY_RUN === 'true';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOOGLE SHEETS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function loadSheet() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID not set');

  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
  await doc.loadInfo();
  return doc.sheetsByTitle[SHEET_NAME] || doc.sheetsByIndex[0];
}

async function getApprovedRows(sheet) {
  const rows = await sheet.getRows();
  return rows.filter(row =>
    (row.get('Status') || '').trim() === 'Approved' &&
    !row.get('Upload Status')
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLAUDE — תיאור SEO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateDescription(product) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are writing a product description for SockAcademy — the world's first dedicated sock authority. Think: Nike-level positioning, but for premium socks.

Brand voice: authoritative, precise, understated luxury. No hype. No adjective stacking. The tone is that of an expert who has tested every sock in existence and this is the one worth buying.

Product: ${product.name}
Category: ${product.category}
Materials: ${product.materials || 'premium materials'}
Price: $${product.retailPrice}

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
// SHOPIFY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function createShopifyProduct(product) {
  const tags = buildTags(product);

  const payload = {
    product: {
      title: product.name,
      body_html: product.description,
      vendor: 'SockAcademy',
      product_type: product.category || 'Socks',
      status: 'draft',
      tags: tags.join(', '),
      variants: [{
        price: product.retailPrice.toFixed(2),
        compare_at_price: (product.retailPrice * 1.25).toFixed(2),
        inventory_management: null,
        fulfillment_service: 'manual',
        requires_shipping: true,
        taxable: true,
      }],
      images: product.imageUrl ? [{ src: product.imageUrl, alt: product.name }] : [],
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
  if (mat.includes('cotton')) tags.push('egyptian-cotton');
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
  <h2 style="color:#1a1a2e">🧦 A2 — דוח העלאת מוצרים</h2>
  <p style="color:#666">תאריך: ${new Date().toLocaleDateString('he-IL')}</p>

  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0">
    <h3 style="color:#16a34a;margin:0 0 12px">✅ הועלו בהצלחה: ${success.length}</h3>
    ${success.map(r => `
      <div style="margin:8px 0;padding:8px;background:#fff;border-radius:4px">
        <strong>${r.name}</strong><br>
        <a href="https://${SHOPIFY_DOMAIN.replace('.myshopify.com', '')}.myshopify.com/admin/products/${r.id}" style="color:#2563eb;font-size:13px">
          פתח ב-Shopify Admin →
        </a>
      </div>
    `).join('')}
  </div>

  ${failed.length ? `
  <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0">
    <h3 style="color:#dc2626;margin:0 0 12px">❌ שגיאות: ${failed.length}</h3>
    ${failed.map(r => `<p style="margin:4px 0">• <strong>${r.name}</strong>: ${r.error}</p>`).join('')}
  </div>` : ''}

  <p style="color:#999;font-size:12px;margin-top:24px">SockAcademy A2 Agent — Upload completed</p>
</div>`;

  await transporter.sendMail({
    from: 'SockAcademy Agent <sockacademy.store@gmail.com>',
    to: 'guyoved102@gmail.com',
    subject: `🧦 A2 — ${success.length} מוצרים הועלו ל-Shopify${failed.length ? ` (${failed.length} שגיאות)` : ''}`,
    html,
  });

  console.log('📧 סיכום נשלח למייל');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('🚀 A2 — Product Upload Agent v1.0');
  console.log('━'.repeat(40));

  // Validate required env vars
  const missing = ['SHOPIFY_MASTER_TOKEN', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SHEET_ID', 'ANTHROPIC_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌ חסרים: ${missing.join(', ')}`);
    process.exit(1);
  }

  let sheet;
  try {
    sheet = await loadSheet();
    console.log(`📊 שגיון לגיליון: ${sheet.title}`);
  } catch (e) {
    console.error(`❌ Google Sheets: ${e.message}`);
    process.exit(1);
  }

  const approvedRows = await getApprovedRows(sheet);
  console.log(`📋 מוצרים מאושרים להעלאה: ${approvedRows.length}`);

  if (approvedRows.length === 0) {
    console.log('✅ אין מוצרים חדשים — הכל עדכני');
    return;
  }

  const results = [];

  for (const row of approvedRows) {
    const product = {
      name: row.get('Product Name'),
      category: row.get('Category'),
      materials: row.get('Materials'),
      supplierPrice: parseFloat(row.get('Supplier Price') || 0),
      retailPrice: parseFloat(row.get('Retail Price') || 0),
      imageUrl: row.get('Image URL'),
      score: row.get('Score'),
      platform: row.get('Platform'),
      rating: row.get('Rating'),
      orders: row.get('Orders'),
    };

    if (!product.name) continue;

    try {
      process.stdout.write(`⏳ ${product.name}... `);

      product.description = await generateDescription(product);

      if (DRY_RUN) {
        console.log(`✅ [DRY_RUN] description generated, skipping Shopify upload`);
        results.push({ name: product.name, id: 'DRY_RUN', success: true });
      } else {
        const shopifyProduct = await createShopifyProduct(product);
        row.set('Upload Status', 'Uploaded');
        row.set('Shopify ID', String(shopifyProduct.id));
        row.set('Shopify URL', `https://sockacademy.store/products/${shopifyProduct.handle}`);
        row.set('Upload Date', new Date().toISOString().split('T')[0]);
        await row.save();
        console.log(`✅ #${shopifyProduct.id}`);
        results.push({ name: product.name, id: shopifyProduct.id, success: true });
      }

    } catch (e) {
      console.log(`❌ ${e.message}`);
      try {
        row.set('Upload Status', `Error: ${e.message.slice(0, 150)}`);
        await row.save();
      } catch (_) {}
      results.push({ name: product.name, error: e.message, success: false });
    }

    await new Promise(r => setTimeout(r, 800));
  }

  console.log('━'.repeat(40));
  console.log(`✅ הסתיים — ${results.filter(r => r.success).length}/${results.length} הועלו`);

  await sendSummaryEmail(results);
}

main().catch(e => {
  console.error('💥 Fatal:', e.message);
  process.exit(1);
});
