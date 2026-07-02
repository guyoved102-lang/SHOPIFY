/**
 * SockAcademy A12 — Review Collector Agent
 *
 * SYSTEM PROMPT:
 * You are A12, a daily post-purchase review request agent for SockAcademy.
 * Your mission: 7 days after an order is fulfilled, send the customer a branded
 * review request email linking to the Judge.me review widget on their product page.
 * Idempotency is enforced via Shopify order tags — you tag each order
 * "review-requested" after sending, and skip any order already tagged.
 * You NEVER send to the same customer twice. You NEVER email gift card orders.
 * You run daily at 09:00 Israel time. DRY_RUN=true sends only to the admin email.
 *
 * Platform: Judge.me (review widget embedded on product pages at #judgeme_product_review)
 * Trigger: 7 days after Shopify fulfillment_status = shipped
 * Idempotency: Shopify order tag "review-requested" (no external state file)
 * Schedule: Daily 07:00 UTC = 09:00 Israel time
 */

require('dotenv').config({ path: '../../.env' });

const axios = require('axios');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const { writeMetrics } = require('../../corp/core/metrics.js');

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, errorMsg = '') {
  if (!supabase) return;
  try {
    const run_status = status === 'failed' ? 'failure' : status;
    await supabase.from('agent_health_log').insert({
      agent_id:      'A12',
      agent_name:    'Review Collector',
      run_status,
      error_message: errorMsg || null,
      metadata:      {},
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

const DRY_RUN = process.env.DRY_RUN === 'true';
const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_MASTER_TOKEN;
const GMAIL_USER = 'sockacademy.store@gmail.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const STORE_URL = 'https://sockacademy.store';
const SHOPIFY_API = `https://${SHOPIFY_DOMAIN}/admin/api/2025-01`;

const REVIEW_DAYS = 7;
const REVIEW_TAG = 'review-requested';

// --- SHOPIFY HELPERS ---

async function shopifyGet(endpoint) {
  const res = await axios.get(`${SHOPIFY_API}${endpoint}`, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
  return res.data;
}

async function shopifyPut(endpoint, body) {
  const res = await axios.put(`${SHOPIFY_API}${endpoint}`, body, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
  return res.data;
}

// Tag order as review-requested so we never send twice
async function tagOrderReviewed(orderId, currentTags) {
  const tags = currentTags
    ? `${currentTags}, ${REVIEW_TAG}`
    : REVIEW_TAG;

  await shopifyPut(`/orders/${orderId}.json`, {
    order: { id: orderId, tags },
  });
}

// --- ORDER FETCHING ---

async function getOrdersDueForReview() {
  const now = new Date();

  // Fetch orders updated between 7 and 9 days ago (broad window, then filter precisely)
  const updatedMin = new Date(now);
  updatedMin.setDate(updatedMin.getDate() - (REVIEW_DAYS + 2));

  const updatedMax = new Date(now);
  updatedMax.setDate(updatedMax.getDate() - REVIEW_DAYS);

  const data = await shopifyGet(
    `/orders.json?status=any&fulfillment_status=fulfilled` +
    `&updated_at_min=${updatedMin.toISOString()}` +
    `&updated_at_max=${updatedMax.toISOString()}` +
    `&limit=250` +
    `&fields=id,name,email,customer,line_items,fulfillments,tags`
  );

  const orders = data.orders || [];

  return orders.filter((order) => {
    // Must have email
    if (!order.email) return false;

    // Must not already be tagged
    if (order.tags && order.tags.includes(REVIEW_TAG)) return false;

    // Must have at least one fulfillment
    if (!order.fulfillments || order.fulfillments.length === 0) return false;

    // Fulfillment must have happened 7–8 days ago
    const fulfilled = new Date(order.fulfillments[0].created_at);
    const daysSince = (now - fulfilled) / (1000 * 60 * 60 * 24);
    return daysSince >= REVIEW_DAYS && daysSince < REVIEW_DAYS + 1;
  });
}

// --- EMAIL BUILDER ---

function buildProductHandle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function resolveHandles(lineItems, supabase) {
  const handles = {};
  for (const item of lineItems) {
    if (item.gift_card) continue;
    let handle = buildProductHandle(item.title);
    if (supabase) {
      try {
        const { data } = await supabase
          .from('products')
          .select('shopify_url')
          .ilike('product_name', item.title)
          .not('shopify_url', 'is', null)
          .limit(1);
        const url = data?.[0]?.shopify_url;
        if (url) {
          const slug = url.split('/products/')[1];
          if (slug) handle = slug;
        }
      } catch (_) {}
    }
    handles[item.title] = handle;
  }
  return handles;
}

function buildReviewEmailHtml(order, handles) {
  const firstName = order.customer?.first_name || 'there';

  const products = order.line_items
    .filter((item) => !item.gift_card)
    .map((item) => ({
      name: item.title,
      variant: item.variant_title !== 'Default Title' ? item.variant_title : null,
      handle: handles[item.title] || buildProductHandle(item.title),
    }));

  const productCards = products
    .map(
      (p) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding:16px;background:#222;border-radius:6px;">
          <p style="margin:0 0 2px;font-family:Georgia,serif;font-size:15px;color:#F0EDE6;">${p.name}</p>
          ${p.variant ? `<p style="margin:0 0 12px;font-size:12px;color:#666;">${p.variant}</p>` : '<p style="margin:0 0 12px;"></p>'}
          <a href="${STORE_URL}/products/${p.handle}#judgeme_product_review"
             style="display:inline-block;padding:9px 22px;background:#C9A84C;color:#0d0d0d;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-radius:3px;font-weight:700;">
            Leave a Review →
          </a>
        </td>
      </tr>
    </table>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="540" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;max-width:540px;">

  <!-- Header -->
  <tr><td style="background:#0d0d0d;padding:28px 36px;border-bottom:2px solid #C9A84C;">
    <p style="margin:0;font-family:Georgia,serif;font-size:20px;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;">SOCKACADEMY</p>
  </td></tr>

  <!-- Headline -->
  <tr><td style="padding:36px 36px 20px;">
    <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;color:#F0EDE6;line-height:1.3;">
      How are your socks, ${firstName}?
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.7;">
      Your order has had a week to settle in. We'd love to hear what you think —
      honest reviews help us keep raising the bar on quality, and help others
      find the right pair.
    </p>
    <p style="margin:0 0 16px;font-size:11px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;">Your recent purchase</p>
  </td></tr>

  <!-- Product cards -->
  <tr><td style="padding:0 36px 28px;">
    ${productCards}
  </td></tr>

  <!-- Closing note -->
  <tr><td style="padding:0 36px 32px;">
    <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">
      Takes less than a minute. If something wasn't right, just reply to this email —
      we'll make it right, no questions asked.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0d0d0d;padding:20px 36px;border-top:1px solid #2a2a2a;">
    <p style="margin:0;font-size:11px;color:#444;text-align:center;">
      SockAcademy · Premium Socks ·
      <a href="${STORE_URL}" style="color:#555;text-decoration:none;">sockacademy.store</a>
    </p>
    <p style="margin:6px 0 0;font-size:10px;color:#333;text-align:center;">
      You're receiving this because you placed an order with us. &nbsp;·&nbsp;
      <a href="mailto:hello@sockacademy.store?subject=Unsubscribe%20from%20review%20requests" style="color:#444;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// --- EMAIL SENDING ---

async function sendReviewRequest(order, transporter, supabase) {
  const firstName = order.customer?.first_name || 'there';
  const to = DRY_RUN ? ADMIN_EMAIL : order.email;
  const handles = await resolveHandles(order.line_items, supabase);

  await transporter.sendMail({
    from: `"SockAcademy" <${GMAIL_USER}>`,
    to,
    subject: `How are your SockAcademy socks, ${firstName}?`,
    html: buildReviewEmailHtml(order, handles),
  });

  return { order_id: String(order.id), order_name: order.name, email: order.email };
}

async function sendAdminSummary(sent, failed, transporter) {
  const total = sent.length + failed.length;
  if (total === 0) return;

  const rows = [
    ...sent.map((r) => `<tr><td style="padding:6px 12px;color:#4CAF50;font-family:monospace;font-size:12px;">✅ SENT</td><td style="padding:6px 12px;color:#888;font-size:12px;">${r.order_name}</td><td style="padding:6px 12px;color:#888;font-size:12px;">${r.email}</td></tr>`),
    ...failed.map((r) => `<tr><td style="padding:6px 12px;color:#ff6b6b;font-family:monospace;font-size:12px;">❌ FAIL</td><td style="padding:6px 12px;color:#888;font-size:12px;">${r.order_name}</td><td style="padding:6px 12px;color:#888;font-size:12px;">${r.email}</td></tr>`),
  ].join('');

  await transporter.sendMail({
    from: `"SockAcademy A12" <${GMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject: `[A12] Review Requests — ${sent.length} sent, ${failed.length} failed`,
    html: `
<div style="font-family:Arial,sans-serif;background:#1A1A1A;color:#F0EDE6;padding:32px;border-radius:8px;max-width:540px;margin:auto;">
  <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:18px;color:#C9A84C;">A12 — Review Collector</p>
  <p style="margin:0 0 24px;font-size:12px;color:#555;">${new Date().toUTCString()}</p>
  <p style="margin:0 0 4px;">✅ Sent: <strong style="color:#4CAF50;">${sent.length}</strong></p>
  <p style="margin:0 0 20px;">❌ Failed: <strong style="color:#ff6b6b;">${failed.length}</strong></p>
  <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #2a2a2a;border-radius:4px;overflow:hidden;">
    ${rows}
  </table>
</div>`,
  });
}

// --- MAIN ---

async function main() {
  const supabase = getSupabase();
  await logHealth(supabase, 'running');
  console.log('\n🧦 SockAcademy A12 — Review Collector');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(DRY_RUN ? '🔬 DRY_RUN — emails go to admin only, no Shopify tagging' : '🌐 LIVE');

  if (!process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ GMAIL_APP_PASSWORD not set');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  try {
    let orders;

    if (DRY_RUN) {
      // Mock order — sends to admin email so we can preview the design
      orders = [
        {
          id: 99999,
          name: '#1001',
          email: ADMIN_EMAIL,
          customer: { first_name: 'Guy' },
          tags: '',
          fulfillments: [{ created_at: new Date(Date.now() - REVIEW_DAYS * 86400000).toISOString() }],
          line_items: [
            { title: 'Merino Wool Crew Socks', variant_title: 'Navy Blue / L', gift_card: false },
            { title: 'Tactical Hiking Socks', variant_title: 'Black / L', gift_card: false },
          ],
        },
      ];
    } else {
      orders = await getOrdersDueForReview();
    }

    console.log(`📦 ${orders.length} order(s) due for review request`);

    if (orders.length === 0) {
      console.log('✅ Nothing to send today');
      return;
    }

    const sent = [];
    const failed = [];

    for (const order of orders) {
      try {
        process.stdout.write(`  → ${order.name} (${order.email}) ... `);
        const result = await sendReviewRequest(order, transporter, supabase);

        // Tag order in Shopify so we never send twice
        if (!DRY_RUN) {
          await tagOrderReviewed(order.id, order.tags);
        }

        sent.push(result);
        console.log('✅ sent');
      } catch (err) {
        console.log(`❌ ${err.message}`);
        failed.push({ order_id: String(order.id), order_name: order.name, email: order.email });
      }

      // Small delay between sends
      await new Promise((r) => setTimeout(r, 800));
    }

    if (!DRY_RUN) {
      await sendAdminSummary(sent, failed, transporter);

      // Command Center KPIs — feeds A0's unified daily brief (deterministic, no AI)
      if (supabase) {
        const metricDate = new Date().toISOString().split('T')[0];
        await writeMetrics(supabase, 'A12', metricDate, [
          { name: 'reviews_requested_sent',   value: sent.length,   unit: 'count' },
          { name: 'reviews_requested_failed', value: failed.length, unit: 'count' },
        ]);
      }
    }

    console.log(`\n✅ A12 done — ${sent.length} sent, ${failed.length} failed`);
    await logHealth(supabase, 'success');
  } catch (err) {
    console.error('❌ A12 fatal error:', err.message);
    await logHealth(supabase, 'failure', err.message).catch(() => {});
    await notifyTelegram(heTelegramMsg('A12 Review Collector', '🚨 כשל קריטי!',
      `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${err.message}</code>`));
    process.exit(1);
  }
}

main();
