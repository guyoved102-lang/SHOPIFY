/**
 * A21 — Affiliate & Influencer ROI Agent
 *
 * Runs daily at 10:00 UTC.
 * Reads:  Supabase affiliates table (partner registry)
 *         Shopify orders API (last 30d sliding window)
 * Writes: affiliate_performance (one row per affiliate per day, idempotent)
 *         executive_reports (agent_id='A21', report_type='daily')
 * Sends:  email affiliate briefing — always (pre-revenue: 0 affiliates, monitoring active)
 *
 * Attribution: pure Shopify discount_code matching (case-insensitive). No UTM.
 * Revenue base: current_subtotal_price — excludes shipping, taxes, and refunds.
 * Commission: gross_revenue × commission_rate (from affiliates table).
 * Ranking: gross_revenue DESC, orders_count DESC (tie-breaker).
 *
 * Flags:
 *   DRY_RUN=true  no Supabase writes, no emails — logs intent only
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic        = require('@anthropic-ai/sdk');
const nodemailer       = require('nodemailer');
const { withRetry }    = require('../../corp/core/anthropic-retry.js');

const DRY_RUN     = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL = 'guyoved102@gmail.com';
const REPORT_DATE = new Date().toISOString().split('T')[0];

const ELIGIBLE_STATUSES = new Set(['paid', 'partially_paid', 'partially_refunded']);

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

async function fetchOrders() {
  const orders  = [];
  const headers = shopifyHeaders();
  const since   = new Date(Date.now() - 30 * 86400000).toISOString();

  let url = `${shopifyBase()}/orders.json?limit=250&status=any&created_at_min=${since}`
          + `&fields=id,name,financial_status,current_subtotal_price,discount_codes,created_at`;

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Shopify orders: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const valid = (data.orders || []).filter(o => ELIGIBLE_STATUSES.has(o.financial_status));
    orders.push(...valid);
    const link = res.headers.get('Link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return orders;
}

// ─── AFFILIATES ───────────────────────────────────────────────────────────────

async function fetchAffiliates() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('affiliates')
    .select('*')
    .eq('active', true);
  if (error) throw new Error(`Supabase affiliates: ${error.message}`);
  return data || [];
}

// ─── ATTRIBUTION & RANKING ───────────────────────────────────────────────────

function attributeOrders(affiliates, orders) {
  const results = [];

  for (const affiliate of affiliates) {
    try {
      const code = affiliate.discount_code.toUpperCase();
      let ordersCount  = 0;
      let grossRevenue = 0;

      for (const order of orders) {
        const codes = (order.discount_codes || []).map(d => d.code.toUpperCase());
        if (!codes.includes(code)) continue;
        ordersCount++;
        grossRevenue += parseFloat(order.current_subtotal_price || 0);
      }

      grossRevenue         = parseFloat(grossRevenue.toFixed(2));
      const commissionOwed = parseFloat((grossRevenue * affiliate.commission_rate).toFixed(2));
      const netRoi         = parseFloat((grossRevenue - commissionOwed).toFixed(2));

      results.push({ affiliate, ordersCount, grossRevenue, commissionOwed, netRoi });
    } catch (err) {
      console.error(`[A21] Attribution error for ${affiliate.discount_code}: ${err.message}`);
      results.push({
        affiliate,
        ordersCount:    0,
        grossRevenue:   0,
        commissionOwed: 0,
        netRoi:         0,
        error:          err.message,
      });
    }
  }

  results.sort((a, b) => b.grossRevenue - a.grossRevenue || b.ordersCount - a.ordersCount);
  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ─── SUPABASE WRITES ──────────────────────────────────────────────────────────

async function upsertPerformance(ranked) {
  if (DRY_RUN) {
    console.log('[DRY_RUN] Would upsert affiliate_performance:', ranked.length, 'rows');
    return;
  }
  const rows = ranked.map(r => ({
    report_date:     REPORT_DATE,
    affiliate_id:    r.affiliate.id,
    discount_code:   r.affiliate.discount_code,
    orders_count:    r.ordersCount,
    gross_revenue:   r.grossRevenue,
    commission_owed: r.commissionOwed,
    net_roi:         r.netRoi,
    rank:            r.rank,
    period_days:     30,
  }));
  const { error } = await getSupabase()
    .from('affiliate_performance')
    .upsert(rows, { onConflict: 'report_date,affiliate_id' });
  if (error) throw new Error(`upsertPerformance: ${error.message}`);
  console.log(`[A21] Upserted ${rows.length} affiliate_performance rows`);
}

async function upsertReport(ranked, totals) {
  const payload = {
    total_affiliates:  ranked.length,
    active_affiliates: ranked.length,
    total_orders:      totals.totalOrders,
    total_revenue:     totals.totalRevenue,
    total_commission:  totals.totalCommission,
    total_net_roi:     totals.totalNetRoi,
    top_affiliate:     ranked[0]?.affiliate.name || null,
    rankings: ranked.map(r => ({
      rank:       r.rank,
      name:       r.affiliate.name,
      handle:     r.affiliate.handle,
      code:       r.affiliate.discount_code,
      platform:   r.affiliate.platform,
      orders:     r.ordersCount,
      revenue:    r.grossRevenue,
      commission: r.commissionOwed,
      net_roi:    r.netRoi,
    })),
  };
  if (DRY_RUN) {
    console.log('[DRY_RUN] Would upsert executive_reports:', JSON.stringify(payload, null, 2));
    return;
  }
  const { error } = await getSupabase()
    .from('executive_reports')
    .upsert(
      { agent_id: 'A21', report_type: 'daily', report_date: REPORT_DATE, payload },
      { onConflict: 'agent_id,report_type,report_date' }
    );
  if (error) throw new Error(`upsertReport: ${error.message}`);
  console.log('[A21] Upserted executive_reports');
}

// ─── NARRATIVE ────────────────────────────────────────────────────────────────

async function buildNarrative(ranked, totals) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const rankingSummary = ranked.length === 0
    ? 'אין affiliates פעילים כרגע. המערכת במצב standby ומוכנה לgrowth.'
    : ranked.map(r =>
        `#${r.rank} ${r.affiliate.name} (${r.affiliate.discount_code}): ` +
        `${r.ordersCount} הזמנות, ₪${r.grossRevenue} revenue, ` +
        `₪${r.commissionOwed} עמלה, Net ROI ₪${r.netRoi}`
      ).join('\n');

  const prompt =
    `אתה מנהל Affiliate & Influencer Marketing ב-SockAcademy — מותג גרביים פרמיום ישראלי.\n` +
    `כתוב בעברית עסקית ומקצועית ברמה גבוהה סקירה מנהלית קצרה (3-4 משפטים) של ביצועי ` +
    `ה-Affiliates היום. הדגש ביצועים בולטים, מגמות, והמלצה אחת אסטרטגית קצרה.\n\n` +
    `נתוני ${REPORT_DATE}:\n` +
    `- סה"כ affiliates פעילים: ${ranked.length}\n` +
    `- סה"כ הזמנות מיוחסות: ${totals.totalOrders}\n` +
    `- סה"כ revenue: ₪${totals.totalRevenue}\n` +
    `- סה"כ עמלות: ₪${totals.totalCommission}\n` +
    `- Net ROI: ₪${totals.totalNetRoi}\n\n` +
    `דירוג שותפים:\n${rankingSummary}`;

  const msg = await withRetry(() => new Anthropic().messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 200,
    messages:   [{ role: 'user', content: prompt }],
  }), 'A21');
  return msg.content[0].text;
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

function buildKpiTile(label, value) {
  return `<div style="background:#fff;border:1px solid #dee2e6;border-radius:6px;padding:12px 16px;min-width:120px;display:inline-block;margin:4px;">
    <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
    <div style="font-size:22px;font-weight:bold;color:#2c3e50;margin-top:4px;">${value}</div>
  </div>`;
}

async function sendEmail(ranked, totals, narrative) {
  if (!process.env.GMAIL_APP_PASSWORD) throw new Error('GMAIL_APP_PASSWORD not set');

  const top = ranked[0];
  const subject = ranked.length === 0
    ? `A21 Affiliate ROI — ${REPORT_DATE} | 0 affiliates | Monitoring Active`
    : `A21 Affiliate ROI — ${REPORT_DATE} | ${ranked.length} affiliates | ₪${totals.totalRevenue} | Top: ${top.affiliate.name}`;

  const rankingRows = ranked.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">
        אין affiliates פעילים — המערכת מוכנה לonboarding שותפים.
      </td></tr>`
    : ranked.map(r => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:10px 12px;font-weight:bold;color:#2c3e50;">#${r.rank}</td>
        <td style="padding:10px 12px;">${r.affiliate.name}<br>
          <span style="font-size:11px;color:#888;">${r.affiliate.handle || ''} ${r.affiliate.platform ? `· ${r.affiliate.platform}` : ''}</span>
        </td>
        <td style="padding:10px 12px;font-family:monospace;font-size:13px;background:#f8f9fa;">${r.affiliate.discount_code}</td>
        <td style="padding:10px 12px;text-align:right;">${r.ordersCount}</td>
        <td style="padding:10px 12px;text-align:right;">₪${r.grossRevenue.toLocaleString()}</td>
        <td style="padding:10px 12px;text-align:right;color:#c0392b;">₪${r.commissionOwed.toLocaleString()}</td>
        <td style="padding:10px 12px;text-align:right;color:#27ae60;font-weight:bold;">₪${r.netRoi.toLocaleString()}</td>
      </tr>`).join('');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#333;">
    <h2 style="color:#1a1a1a;border-bottom:2px solid #2c3e50;padding-bottom:10px;margin-bottom:4px;">
      A21 — Affiliate &amp; Influencer ROI
    </h2>
    <p style="color:#888;font-size:12px;margin-top:0;">📅 ${REPORT_DATE} &nbsp;|&nbsp; Period: Last 30 days &nbsp;|&nbsp; Attribution: Shopify discount codes</p>

    <div style="background:#f8f9fa;border-left:4px solid #2c3e50;padding:16px 20px;margin:20px 0;border-radius:0 4px 4px 0;">
      <h3 style="margin:0 0 8px;color:#2c3e50;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">AI Executive Summary</h3>
      <p style="margin:0;line-height:1.8;color:#333;font-size:14px;">${narrative}</p>
    </div>

    <div style="margin:20px 0;">
      ${buildKpiTile('Affiliates', ranked.length)}
      ${buildKpiTile('Total Orders', totals.totalOrders)}
      ${buildKpiTile('Revenue', `₪${totals.totalRevenue.toLocaleString()}`)}
      ${buildKpiTile('Commission', `₪${totals.totalCommission.toLocaleString()}`)}
      ${buildKpiTile('Net ROI', `₪${totals.totalNetRoi.toLocaleString()}`)}
    </div>

    <h3 style="color:#1a1a1a;margin-top:28px;">Performance Rankings</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#2c3e50;color:#fff;">
          <th style="padding:10px 12px;text-align:left;">Rank</th>
          <th style="padding:10px 12px;text-align:left;">Partner</th>
          <th style="padding:10px 12px;text-align:left;">Code</th>
          <th style="padding:10px 12px;text-align:right;">Orders</th>
          <th style="padding:10px 12px;text-align:right;">Revenue</th>
          <th style="padding:10px 12px;text-align:right;">Commission</th>
          <th style="padding:10px 12px;text-align:right;">Net ROI</th>
        </tr>
      </thead>
      <tbody>${rankingRows}</tbody>
    </table>

    <p style="color:#bbb;font-size:11px;margin-top:28px;border-top:1px solid #eee;padding-top:12px;">
      SockAcademy A21 Affiliate &amp; Influencer ROI Intelligence
    </p>
  </div>`;

  if (DRY_RUN) {
    console.log('[DRY_RUN] Would send email:', subject);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sockacademy.store@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from:    '"SockAcademy A21" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject,
    html,
  });
  console.log('[A21] Email sent:', subject);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A21] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
    process.exit(0);
  }

  console.log(`[A21] Starting Affiliate & Influencer ROI — ${REPORT_DATE}`);
  if (DRY_RUN) console.log('[A21] DRY_RUN=true — no writes, no emails');

  const [affiliates, orders] = await Promise.all([
    fetchAffiliates(),
    fetchOrders(),
  ]);
  console.log(`[A21] ${affiliates.length} active affiliates | ${orders.length} eligible orders (last 30d)`);

  const ranked = attributeOrders(affiliates, orders);

  const totals = {
    totalOrders:     ranked.reduce((s, r) => s + r.ordersCount, 0),
    totalRevenue:    parseFloat(ranked.reduce((s, r) => s + r.grossRevenue, 0).toFixed(2)),
    totalCommission: parseFloat(ranked.reduce((s, r) => s + r.commissionOwed, 0).toFixed(2)),
    totalNetRoi:     parseFloat(ranked.reduce((s, r) => s + r.netRoi, 0).toFixed(2)),
  };

  await Promise.all([
    upsertPerformance(ranked),
    upsertReport(ranked, totals),
  ]);

  const narrative = await buildNarrative(ranked, totals);
  await sendEmail(ranked, totals, narrative);

  console.log(`[A21] Complete — ${ranked.length} affiliates | ₪${totals.totalRevenue} revenue | ₪${totals.totalNetRoi} net ROI`);
}

main().catch(err => {
  console.error('[A21] Fatal error:', err.message);
  process.exit(1);
});
