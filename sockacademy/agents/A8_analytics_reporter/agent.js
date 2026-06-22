/**
 * A8 — Analytics Reporter v1.0
 * GA4 Data API → Weekly HTML email report
 * Trigger: GitHub Actions every Sunday 07:00 UTC (10:00 Israel) / manual
 */

require('dotenv').config({ path: '../../.env' });
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const ADMIN_EMAIL = 'guyoved102@gmail.com';
const DRY_RUN = process.env.DRY_RUN === 'true';

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── HEALTH MONITORING ───────────────────────────────────────────────────────

async function logHealth(supabase, status, errorMessage = '') {
  try {
    const run_status = status.toLowerCase() === 'failed' ? 'failure' : status.toLowerCase();
    await supabase.from('agent_health_log').insert({
      agent_id:      'A8',
      agent_name:    'Analytics Reporter',
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
    to: 'sockacademy.store@gmail.com',
    subject: 'A8 Analytics Reporter FAILED — action needed',
    html: `<div style="font-family:monospace"><h2>A8 Failed</h2><p><strong>Time:</strong> ${new Date().toISOString()}</p><pre style="background:#f5f5f5;padding:12px">${errorMessage}</pre></div>`,
  }).catch(e => console.error('Alert email failed:', e.message));
}

// ─── GA4 CLIENT ──────────────────────────────────────────────────────────────

function getGA4Client() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  return new BetaAnalyticsDataClient({ credentials: JSON.parse(json) });
}

// ─── GA4 DATA FETCHERS ───────────────────────────────────────────────────────

async function fetchWeeklyMetrics(client) {
  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
    ],
  });

  const row = response.rows?.[0];
  if (!row) return null;

  return {
    sessions:           parseInt(row.metricValues[0].value  || '0'),
    users:              parseInt(row.metricValues[1].value  || '0'),
    pageviews:          parseInt(row.metricValues[2].value  || '0'),
    bounceRate:         parseFloat(row.metricValues[3].value || '0'),
    avgSessionDuration: parseFloat(row.metricValues[4].value || '0'),
    conversions:        parseInt(row.metricValues[5].value  || '0'),
    revenue:            parseFloat(row.metricValues[6].value || '0'),
  };
}

async function fetchTopPages(client) {
  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics:    [{ name: 'screenPageViews' }],
    orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10,
  });

  return (response.rows || []).map(row => ({
    path:  row.dimensionValues[0].value,
    views: parseInt(row.metricValues[0].value || '0'),
  }));
}

async function fetchTrafficSources(client) {
  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics:    [{ name: 'sessions' }],
    orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 8,
  });

  return (response.rows || []).map(row => ({
    channel:  row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value || '0'),
  }));
}

// ─── EMAIL TEMPLATE ──────────────────────────────────────────────────────────

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function buildReportHtml(metrics, topPages, sources) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });
  const ts = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const noData = !metrics || (metrics.sessions === 0 && metrics.users === 0);

  const statCards = [
    ['Sessions',     metrics?.sessions?.toLocaleString()                   || '0'],
    ['Users',        metrics?.users?.toLocaleString()                      || '0'],
    ['Pageviews',    metrics?.pageviews?.toLocaleString()                  || '0'],
    ['Bounce Rate',  metrics ? `${(metrics.bounceRate * 100).toFixed(1)}%` : '—'],
    ['Avg. Session', metrics ? formatDuration(metrics.avgSessionDuration)  : '—'],
    ['Revenue',      metrics ? `$${metrics.revenue.toFixed(2)}`            : '$0.00'],
  ];

  const pagesHtml = topPages.length
    ? topPages.map((p, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
          <td style="padding:6px 10px;color:#555;font-size:13px">${p.path}</td>
          <td style="padding:6px 10px;text-align:right;font-size:13px">${p.views.toLocaleString()}</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="padding:10px;color:#aaa;text-align:center;font-size:13px">No data yet</td></tr>';

  const sourcesHtml = sources.length
    ? sources.map((s, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
          <td style="padding:6px 10px;color:#555;font-size:13px">${s.channel}</td>
          <td style="padding:6px 10px;text-align:right;font-size:13px">${s.sessions.toLocaleString()}</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="padding:10px;color:#aaa;text-align:center;font-size:13px">No data yet</td></tr>';

  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#1a1a1a">
  <div style="background:#1a1a1a;padding:20px 24px">
    <h1 style="color:#C9A84C;margin:0;font-size:20px;font-weight:600;letter-spacing:1px">SockAcademy Analytics</h1>
    <p style="color:#888;margin:4px 0 0;font-size:13px">Weekly Report — ${dateStr}</p>
  </div>

  <div style="padding:24px">
    ${noData ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px;margin-bottom:24px">
      <p style="margin:0;color:#92400e;font-size:13px">No traffic data yet — store is pre-launch. This report will populate once visitors arrive.</p>
    </div>` : ''}

    <h2 style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 14px">Last 7 Days</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <tr>
        ${statCards.slice(0,3).map(([label, val]) =>
          `<td style="width:33%;padding:14px;background:#f8f8f8;border-radius:6px;text-align:center;vertical-align:top">
            <div style="font-size:24px;font-weight:700;color:#1a1a1a">${val}</div>
            <div style="font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          </td>`).join('<td style="width:8px"></td>')}
      </tr>
      <tr><td colspan="5" style="height:10px"></td></tr>
      <tr>
        ${statCards.slice(3).map(([label, val]) =>
          `<td style="width:33%;padding:14px;background:#f8f8f8;border-radius:6px;text-align:center;vertical-align:top">
            <div style="font-size:24px;font-weight:700;color:#1a1a1a">${val}</div>
            <div style="font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
          </td>`).join('<td style="width:8px"></td>')}
      </tr>
    </table>

    <h2 style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px">Top Pages</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <tr style="background:#f2f2f2">
        <th style="padding:6px 10px;text-align:left;font-size:12px;font-weight:600">Page</th>
        <th style="padding:6px 10px;text-align:right;font-size:12px;font-weight:600">Views</th>
      </tr>
      ${pagesHtml}
    </table>

    <h2 style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px">Traffic Sources</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <tr style="background:#f2f2f2">
        <th style="padding:6px 10px;text-align:left;font-size:12px;font-weight:600">Channel</th>
        <th style="padding:6px 10px;text-align:right;font-size:12px;font-weight:600">Sessions</th>
      </tr>
      ${sourcesHtml}
    </table>

    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#bbb;font-size:11px;margin:0">
      SockAcademy A8 Analytics Reporter v1.0 &nbsp;|&nbsp; GA4 Property: ${PROPERTY_ID} &nbsp;|&nbsp; ${ts}
    </p>
  </div>
</div>`;
}

async function sendReport(html) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('GMAIL_APP_PASSWORD not set — skipping email');
    return;
  }
  if (DRY_RUN) {
    console.log('[DRY_RUN] Would send weekly analytics report to', ADMIN_EMAIL);
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  const dateLabel = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'Asia/Jerusalem',
  });
  await transporter.sendMail({
    from: '"SockAcademy A8" <sockacademy.store@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `SockAcademy Weekly Analytics — ${dateLabel}`,
    html,
  });
  console.log('Report sent to', ADMIN_EMAIL);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nA8 — Analytics Reporter v1.0');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(44));

  const missing = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);

  const supabase = getSupabase();
  await logHealth(supabase, 'RUNNING');

  const client = getGA4Client();
  console.log('GA4 client initialized');

  const [metrics, topPages, sources] = await Promise.all([
    fetchWeeklyMetrics(client),
    fetchTopPages(client),
    fetchTrafficSources(client),
  ]);

  console.log(`Sessions: ${metrics?.sessions ?? 0} | Users: ${metrics?.users ?? 0} | Revenue: $${metrics?.revenue?.toFixed(2) ?? '0.00'}`);

  const html = buildReportHtml(metrics, topPages, sources);
  await sendReport(html);

  await logHealth(supabase, 'SUCCESS');
  console.log('Done.');
}

main().catch(async e => {
  console.error('Fatal:', e.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'ERROR', e.message);
    await sendErrorAlert(e.message);
  } catch (_) {}
  process.exit(1);
});
