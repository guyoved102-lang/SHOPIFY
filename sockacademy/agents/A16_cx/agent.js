/**
 * A16 — CX Agent (Customer Experience)
 *
 * Runs daily at 22:00 UTC.
 * Analyzes Shopify order fulfillment and repeat purchase rate (last 30 days).
 * Pulls Klaviyo subscriber count.
 * Writes: executive_reports (agent_id='A16', report_type='daily')
 * Sends: daily CX digest email to Guy
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const DRY_RUN        = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL    = 'guyoved102@gmail.com';
const REPORT_DATE    = new Date().toISOString().split('T')[0];
const SHOPIFY_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_TOKEN  = process.env.SHOPIFY_MASTER_TOKEN;
const KLAVIYO_KEY    = process.env.KLAVIYO_PRIVATE_API_KEY;
const SHOPIFY_API    = `https://${SHOPIFY_DOMAIN}/admin/api/2025-01`;

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, meta = {}) {
  if (DRY_RUN) return;
  try {
    await supabase.from('agent_health_log').insert({
      agent_id:   'A16',
      agent_name: 'CX Customer Experience',
      run_status: status,
      metadata:   meta,
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

// ─── SHOPIFY ──────────────────────────────────────────────────────────────────

async function fetchOrders(daysBack) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    console.log('   [skip] Shopify credentials not set');
    return [];
  }
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const url = `${SHOPIFY_API}/orders.json?created_at_min=${encodeURIComponent(since)}&status=any&limit=250`;
  const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN } });
  if (!res.ok) throw new Error(`Shopify orders fetch failed: ${res.status}`);
  const data = await res.json();
  return data.orders || [];
}

function analyzeOrders(orders) {
  const total       = orders.length;
  const fulfilled   = orders.filter(o => o.fulfillment_status === 'fulfilled').length;
  const partial     = orders.filter(o => o.fulfillment_status === 'partial').length;
  const unfulfilled = orders.filter(o => !o.fulfillment_status).length;

  const emailCounts = {};
  for (const o of orders) {
    const email = o.email?.toLowerCase();
    if (email) emailCounts[email] = (emailCounts[email] || 0) + 1;
  }
  const uniqueCustomers  = Object.keys(emailCounts).length;
  const repeatCustomers  = Object.values(emailCounts).filter(c => c > 1).length;
  const repeatRate       = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;
  const fulfillmentRate  = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  return { total, fulfilled, partial, unfulfilled, fulfillmentRate, uniqueCustomers, repeatCustomers, repeatRate };
}

// ─── KLAVIYO ──────────────────────────────────────────────────────────────────

async function fetchKlaviyoListStats() {
  if (!KLAVIYO_KEY) return null;
  try {
    const headers = {
      'Authorization': `Klaviyo-API-Key ${KLAVIYO_KEY}`,
      'revision':      '2024-10-15',
    };

    const listsRes = await fetch('https://a.klaviyo.com/api/lists', { headers });
    const lists    = listsRes.ok ? ((await listsRes.json()).data || []) : [];

    // get unique profile count — profiles endpoint avoids double-counting subscribers shared across lists
    let uniqueSubscribers = null;
    let subscribersNote   = 'largest list (dedup unavailable)';
    try {
      const profilesRes = await fetch('https://a.klaviyo.com/api/profiles/?page[size]=1', { headers });
      if (profilesRes.ok) {
        const total = (await profilesRes.json())?.meta?.total;
        if (typeof total === 'number') {
          uniqueSubscribers = total;
          subscribersNote   = 'unique profiles';
        }
      }
    } catch (_) {}

    // Fallback: max single-list count is better than sum (sum double-counts cross-list members)
    const fallbackCount = lists.length > 0
      ? Math.max(...lists.map(l => l.attributes?.profile_count || 0))
      : 0;

    return {
      listCount:        lists.length,
      totalSubscribers: uniqueSubscribers ?? fallbackCount,
      subscribersNote,
    };
  } catch (e) {
    console.log(`   [Klaviyo error] ${e.message}`);
    return null;
  }
}

// ─── ALERTS ──────────────────────────────────────────────────────────────────

function buildAlerts(orderStats, klaviyo) {
  const alerts = [];
  if (!klaviyo) alerts.push({ level: 'warning', message: 'Klaviyo data unavailable — check API key' });
  if (orderStats.total === 0) alerts.push({ level: 'info', message: 'Pre-revenue: CX monitoring active, awaiting first orders' });
  if (orderStats.total > 0 && orderStats.fulfillmentRate < 80)
    alerts.push({ level: 'critical', message: `Low fulfillment rate: ${orderStats.fulfillmentRate}% — investigate supplier` });
  if (orderStats.repeatRate > 15) alerts.push({ level: 'info', message: `Repeat purchase rate: ${orderStats.repeatRate}% — healthy loyalty signal` });
  return alerts;
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function writeReport(sb, kpis, alerts) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would upsert to executive_reports (A16)');
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A16',
    report_date: REPORT_DATE,
    report_type: 'daily',
    kpis,
    alerts,
    narrative:   null,
  }, { onConflict: 'agent_id,report_date,report_type' });
  if (error) throw new Error(`executive_reports upsert failed: ${error.message}`);
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

function buildCxHtml(orderStats, klaviyo, weekLabel) {
  const fulfillColor = orderStats.total === 0 ? '#888'
    : orderStats.fulfillmentRate >= 90 ? '#4AAD80'
    : orderStats.fulfillmentRate >= 70 ? '#d97706'
    : '#c0392b';

  const repeatColor = orderStats.repeatRate > 20 ? '#4AAD80'
    : orderStats.repeatRate > 0 ? '#d97706'
    : '#888';

  const orderSection = orderStats.total === 0
    ? '<p style="color:#888">No orders yet — baseline established.</p>'
    : `<table style="width:100%;margin-bottom:8px">
        <tr><td style="color:#9CA3AF;width:200px">Total orders (30d)</td><td>${orderStats.total}</td></tr>
        <tr><td style="color:#9CA3AF">Fulfilled</td><td style="color:#4AAD80">${orderStats.fulfilled}</td></tr>
        <tr><td style="color:#9CA3AF">Partial</td><td style="color:${orderStats.partial > 0 ? '#d97706' : '#888'}">${orderStats.partial}</td></tr>
        <tr><td style="color:#9CA3AF">Unfulfilled</td><td style="color:${orderStats.unfulfilled > 0 ? '#c0392b' : '#888'}">${orderStats.unfulfilled}</td></tr>
        <tr><td style="color:#9CA3AF">Fulfillment Rate</td><td style="color:${fulfillColor}">${orderStats.fulfillmentRate}%</td></tr>
      </table>`;

  const loyaltySection = orderStats.total === 0
    ? ''
    : `<h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Customer Loyalty — Last 30 Days</h3>
       <table style="width:100%;margin-bottom:8px">
         <tr><td style="color:#9CA3AF;width:200px">Unique customers</td><td>${orderStats.uniqueCustomers}</td></tr>
         <tr><td style="color:#9CA3AF">Repeat customers</td><td style="color:${repeatColor}">${orderStats.repeatCustomers}</td></tr>
         <tr><td style="color:#9CA3AF">Repeat purchase rate</td><td style="color:${repeatColor}">${orderStats.repeatRate}%</td></tr>
       </table>`;

  const klaviyoSection = klaviyo
    ? `<h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Email List (Klaviyo)</h3>
       <table style="width:100%;margin-bottom:8px">
         <tr><td style="color:#9CA3AF;width:200px">Total lists</td><td>${klaviyo.listCount}</td></tr>
         <tr><td style="color:#9CA3AF">Total subscribers</td>
             <td style="color:${klaviyo.totalSubscribers > 0 ? '#4AAD80' : '#888'}">${klaviyo.totalSubscribers.toLocaleString()} <span style="color:#555;font-size:10px">(${klaviyo.subscribersNote})</span></td></tr>
       </table>`
    : '<p style="color:#888;font-size:11px">Klaviyo: no data (API error or key not set).</p>';

  return `<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A16 CX — Weekly Customer Experience Report</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:12px">${weekLabel}</p>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">Order Fulfillment — Last 30 Days</h3>
  ${orderSection}
  ${loyaltySection}
  ${klaviyoSection}

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A16 CX Agent — Weekly Customer Experience Report</p>
</div>`;
}

async function sendReport(html, weekLabel) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('   [no GMAIL_APP_PASSWORD] skipping email');
    return;
  }
  if (DRY_RUN) {
    console.log('   [DRY_RUN] Would send CX report email');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: '"SockAcademy CX" <sockacademy.store@gmail.com>',
    to:   ADMIN_EMAIL,
    subject: `A16 CX Weekly Report — ${weekLabel}`,
    html,
  });
  console.log('   Email sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nA16 CX — Weekly Customer Experience Report');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const supabase = getSupabase();
  console.log('Supabase connected');

  const weekLabel = new Date().toLocaleDateString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });

  console.log('\nFetching CX data...');
  const [orders, klaviyo] = await Promise.all([
    fetchOrders(30),
    fetchKlaviyoListStats(),
  ]);

  const orderStats = analyzeOrders(orders);
  console.log(`   Orders (30d): ${orderStats.total} | Fulfillment: ${orderStats.fulfillmentRate}%`);
  console.log(`   Repeat rate: ${orderStats.repeatRate}%`);
  if (klaviyo) console.log(`   Klaviyo: ${klaviyo.totalSubscribers} subscribers`);

  const alerts = buildAlerts(orderStats, klaviyo);
  const kpis   = { orderStats, klaviyo };

  if (alerts.length > 0) {
    console.log(`\n⚠️  ${alerts.length} alert(s):`);
    alerts.forEach(a => console.log(`   [${a.level.toUpperCase()}] ${a.message}`));
  } else {
    console.log('\n✅ No alerts');
  }

  await writeReport(supabase, kpis, alerts);
  const html = buildCxHtml(orderStats, klaviyo, weekLabel);
  await sendReport(html, weekLabel);
  await logHealth(supabase, 'success', {
    orders30d:        orderStats.total,
    fulfillmentRate:  orderStats.fulfillmentRate,
    repeatRate:       orderStats.repeatRate,
    klaviyoSubs:      klaviyo?.totalSubscribers || 0,
    alerts:           alerts.length,
  });

  console.log('\n' + '─'.repeat(52));
  console.log('✅ A16 CX complete');
}

main().catch(async err => {
  console.error('\nA16 fatal:', err.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'failure', { error: err.message });
  } catch (_) {}
  process.exit(1);
});
