/**
 * A19 — Returns Intelligence Agent
 *
 * Runs daily at 08:30 UTC.
 * Reads:  Shopify refunds API (last 30d sliding window)
 * Writes: returns_log (one row per refund, idempotent by refund_id)
 *         executive_reports (agent_id='A19', report_type='daily')
 * Sends:  email digest — always (pre-revenue: 0 returns, monitoring active)
 *
 * Pre-revenue behavior: no orders → no refunds → reports 0 returns, runs clean.
 * Same code handles both states. No stubs.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic        = require('@anthropic-ai/sdk');
const nodemailer       = require('nodemailer');
const { withRetry }    = require('../../corp/core/anthropic-retry.js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const { writeMetrics } = require('../../corp/core/metrics.js');
const { handleFatalError } = require('../../corp/core/self-heal.js');

const DRY_RUN     = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const REPORT_DATE = new Date().toISOString().split('T')[0];

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

async function fetchOrdersWithRefunds() {
  const orders = [];
  const since  = new Date(Date.now() - 30 * 86400000).toISOString();
  let url = `${shopifyBase()}/orders.json?limit=250&status=any&created_at_min=${since}&fields=id,name,financial_status,refunds,line_items,created_at`;
  const headers = shopifyHeaders();

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Shopify orders: ${res.status} ${await res.text()}`);
    const data = await res.json();
    orders.push(...(data.orders || []));
    const link = res.headers.get('Link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return orders;
}

// ─── PARSE REFUNDS ───────────────────────────────────────────────────────────

function parseRefunds(orders) {
  const rows = [];

  for (const order of orders) {
    if (!order.refunds || order.refunds.length === 0) continue;

    const lineItemMap = {};
    for (const li of order.line_items || []) {
      lineItemMap[li.id] = li;
    }

    for (const refund of order.refunds) {
      if (!refund.refund_line_items || refund.refund_line_items.length === 0) continue;

      for (const rli of refund.refund_line_items) {
        const li = lineItemMap[rli.line_item_id] || rli.line_item || {};
        rows.push({
          order_id:         order.id,
          order_name:       order.name,
          refund_id:        refund.id,
          product_title:    li.title || li.name || 'Unknown',
          sku:              li.sku   || null,
          quantity:         rli.quantity || 1,
          reason:           rli.restock_type || refund.note || 'unspecified',
          financial_status: order.financial_status,
          refund_amount:    parseFloat(rli.subtotal || 0),
          currency:         'USD',
          return_date:      refund.created_at
            ? refund.created_at.split('T')[0]
            : order.created_at.split('T')[0],
        });
      }
    }
  }
  return rows;
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

function buildSummary(refundRows, totalOrders) {
  const totalRefunds   = refundRows.length;
  const totalAmount    = refundRows.reduce((s, r) => s + (r.refund_amount || 0), 0);
  const returnRate     = totalOrders > 0 ? (totalRefunds / totalOrders * 100).toFixed(1) : 0;

  const reasonCounts = {};
  for (const r of refundRows) {
    const key = (r.reason || 'unspecified').slice(0, 60);
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  }
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, count }));

  const skuCounts = {};
  for (const r of refundRows) {
    if (r.sku) skuCounts[r.sku] = (skuCounts[r.sku] || 0) + 1;
  }
  const topReturnedSkus = Object.entries(skuCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sku, count]) => ({ sku, count }));

  return {
    total_orders_30d:    totalOrders,
    total_refunds_30d:   totalRefunds,
    total_refund_amount: parseFloat(totalAmount.toFixed(2)),
    return_rate_pct:     parseFloat(returnRate),
    top_reasons:         topReasons,
    top_returned_skus:   topReturnedSkus,
  };
}

function buildAlerts(summary) {
  const alerts = [];
  if (summary.return_rate_pct > 10)
    alerts.push({ level: 'critical', message: `Return rate ${summary.return_rate_pct}% — exceeds 10% threshold, investigate sourcing quality` });
  else if (summary.return_rate_pct > 5)
    alerts.push({ level: 'warning',  message: `Return rate ${summary.return_rate_pct}% — above 5% baseline, monitor trend` });
  if (summary.total_refunds_30d > 0 && summary.top_reasons.length > 0) {
    const topReason = summary.top_reasons[0];
    if (topReason.count >= 3)
      alerts.push({ level: 'warning', message: `Most common return reason: "${topReason.reason}" (×${topReason.count}) — consider product description review` });
  }
  return alerts;
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function upsertReturns(sb, rows) {
  if (DRY_RUN) {
    console.log(`\n[DRY_RUN] Would upsert ${rows.length} rows to returns_log`);
    return;
  }
  for (const row of rows) {
    const { error } = await sb.from('returns_log').upsert(row, { onConflict: 'refund_id' });
    if (error) console.warn(`⚠️  returns_log upsert failed (refund ${row.refund_id}): ${error.message}`);
  }
}

async function writeExecutiveReport(sb, summary, alerts, narrative) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would upsert executive_reports (A19)');
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A19',
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
    agent_id:        'A19',
    agent_name:      'Returns Intelligence',
    run_status:      status,
    items_processed: meta.refunds_processed || 0,
    metadata:        meta,
  });
  if (error) console.error(`⚠️  Health log failed: ${error.message}`);
}

// ─── NARRATIVE ───────────────────────────────────────────────────────────────

async function generateNarrative(summary) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt =
    `אתה מנהל Returns Intelligence ב-SockAcademy — מותג גרביים פרמיום.\n` +
    `כתוב בעברית עסקית ומקצועית ברמה גבוהה סקירה קצרה (2 משפטים) למנכ"ל על מגמות ` +
    `ההחזרות היום. היה ישיר. אם אין החזרות כלל — אשר רשומת החזרות נקייה ושהמערכת פעילה ומנטרת.\n\n` +
    `נתונים:\n${JSON.stringify(summary)}`;

  const msg = await withRetry(() => client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  }), 'A19');
  return msg.content[0].text.trim();
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendEmail(summary, alerts, narrative) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send A19 Returns email to ${ADMIN_EMAIL}`);
    return;
  }

  const rateColor = summary.return_rate_pct > 10 ? '#dc2626'
                  : summary.return_rate_pct > 5  ? '#d97706' : '#4AAD80';

  const alertHtml = alerts.length > 0
    ? `<h3 style="color:#d97706;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Alerts</h3>
       <ul style="padding-left:16px">${alerts.map(a => {
         const c = a.level === 'critical' ? '#dc2626' : '#d97706';
         return `<li style="color:${c};margin:4px 0">${a.message}</li>`;
       }).join('')}</ul>`
    : '<p style="color:#4AAD80;margin-top:16px">✅ No return alerts</p>';

  const topReasonsHtml = summary.top_reasons.length > 0
    ? summary.top_reasons.map(r => `<tr><td style="padding:4px 8px;color:#f0ede6">${r.reason}</td><td style="padding:4px 8px;text-align:center">${r.count}</td></tr>`).join('')
    : '<tr><td colspan="2" style="padding:4px 8px;color:#9CA3AF">No returns recorded</td></tr>';

  const html = `
<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A19 — Returns Intelligence</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:12px">${REPORT_DATE}</p>

  ${narrative ? `<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:0 0 20px;background:#111;color:#f0ede6;font-style:italic">${narrative}</blockquote>` : ''}

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">Returns Summary — Last 30 Days</h3>
  <table style="width:100%;margin-bottom:16px">
    <tr><td style="color:#9CA3AF;width:220px">Total orders</td><td>${summary.total_orders_30d}</td></tr>
    <tr><td style="color:#9CA3AF">Total refunds</td><td>${summary.total_refunds_30d}</td></tr>
    <tr><td style="color:#9CA3AF">Return rate</td><td style="color:${rateColor}">${summary.return_rate_pct}%</td></tr>
    <tr><td style="color:#9CA3AF">Total refunded</td><td>$${summary.total_refund_amount.toFixed(2)}</td></tr>
  </table>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Top Return Reasons</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#1a1a1a">
      <th style="padding:4px 8px;text-align:left;color:#9CA3AF;font-size:11px">Reason</th>
      <th style="padding:4px 8px;text-align:center;color:#9CA3AF;font-size:11px">Count</th>
    </tr>
    ${topReasonsHtml}
  </table>

  ${alertHtml}

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A19 Returns Intelligence — ${REPORT_DATE}</p>
</div>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from:    '"SockAcademy Returns" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject: `A19 Returns — ${REPORT_DATE} | Rate: ${summary.return_rate_pct}% | ${summary.total_refunds_30d} refunds`,
    html,
  });
  console.log('📧 Returns digest sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A19] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
    process.exit(0);
  }

  console.log('\n↩️  A19 — Returns Intelligence Agent');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const sb = getSupabase();
  console.log('✅ Supabase connected');

  let orders;
  try {
    orders = await fetchOrdersWithRefunds();
  } catch (e) {
    await logHealth(sb, 'failure', { error: e.message });
    throw e;
  }

  console.log(`📦 Orders fetched: ${orders.length}`);

  const refundRows = parseRefunds(orders);
  const summary    = buildSummary(refundRows, orders.length);
  const alerts     = buildAlerts(summary);

  console.log(`↩️  Refunds: ${refundRows.length} | Return rate: ${summary.return_rate_pct}%`);
  if (alerts.length > 0) alerts.forEach(a => console.log(`   [${a.level.toUpperCase()}] ${a.message}`));
  else console.log('✅ No return alerts');

  const narrative = await generateNarrative(summary);
  if (narrative) console.log(`\n📝 ${narrative}`);

  await upsertReturns(sb, refundRows);
  await writeExecutiveReport(sb, summary, alerts, narrative);
  await sendEmail(summary, alerts, narrative);

  // Command Center KPIs — feeds A0's unified daily brief
  if (!DRY_RUN) {
    await writeMetrics(sb, 'A19', REPORT_DATE, [
      { name: 'returns_30d',        value: summary.total_refunds_30d,   unit: 'count' },
      { name: 'return_rate_pct',    value: summary.return_rate_pct,     unit: 'pct' },
      { name: 'refund_amount_usd',  value: summary.total_refund_amount, unit: 'usd' },
    ]);
  }

  await logHealth(sb, 'success', { refunds_processed: refundRows.length, return_rate: summary.return_rate_pct });

  console.log('\n' + '─'.repeat(52));
  console.log('✅ A19 Returns Intelligence complete');
}

main().catch(async e => {
  console.error('\n❌ A19 fatal:', e.message);
  let sb = null;
  try {
    sb = getSupabase();
    await logHealth(sb, 'failure', { error: e.message });
  } catch (_) {}
  await notifyTelegram(heTelegramMsg('A19 Returns Intelligence', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${e.message}</code>`));
  await handleFatalError({ agentId: 'A19', agentName: 'Returns Intelligence', err: e, supabase: sb });
  process.exit(1);
});
