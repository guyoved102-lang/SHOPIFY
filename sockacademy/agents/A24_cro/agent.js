/**
 * A24 — CRO Agent (Conversion Rate Optimization)
 *
 * Runs daily at 11:00 UTC.
 * Reads:  GA4 Data API (7-day funnel: sessions → view_item → add_to_cart → begin_checkout → purchase)
 *         Shopify orders API (last 7 days — revenue cross-check)
 *         Supabase cro_snapshots (previous snapshot for WoW comparison)
 * Writes: cro_snapshots (one row per date, idempotent by snapshot_date+period_days)
 *         executive_reports (agent_id='A24', report_type='daily')
 * Sends:  email CRO briefing — always (pre-revenue: 0 traffic, monitoring active)
 *
 * Three pillars, each wrapped in independent try/catch:
 *   Pillar 1 — GA4 Funnel Intelligence (sessions→views→cart→checkout→purchase)
 *   Pillar 2 — Shopify Revenue Intelligence (7d orders, AOV, top products)
 *   Pillar 3 — Trend & Bottleneck Analysis (WoW delta, biggest drop-off stage)
 *
 * Flags:
 *   DRY_RUN=true      no Supabase writes, no emails — logs intent only
 *   GA4_ACTIVE=false  GA4 funnel returns zeroes; Shopify remains active
 *
 * Pre-revenue behavior: 0 sessions → 0 funnel events → "monitoring active" report.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient }           = require('@supabase/supabase-js');
const Anthropic                  = require('@anthropic-ai/sdk');
const nodemailer                 = require('nodemailer');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { withRetry }               = require('../../corp/core/anthropic-retry.js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const { writeMetrics } = require('../../corp/core/metrics.js');
const { handleFatalError } = require('../../corp/core/self-heal.js');

const DRY_RUN    = process.env.DRY_RUN    === 'true';
const GA4_ACTIVE = process.env.GA4_ACTIVE === 'true';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const REPORT_DATE  = new Date().toISOString().split('T')[0];
const PERIOD_DAYS  = 7;

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── PILLAR 1 — GA4 FUNNEL ───────────────────────────────────────────────────

async function fetchGA4Funnel() {
  if (!GA4_ACTIVE) {
    console.log('[A24] GA4_ACTIVE=false — funnel metrics zeroed (pending GA4 setup)');
    return { sessions: 0, productViews: 0, addToCarts: 0, checkouts: 0, purchases: 0, revenue: 0, bounceRate: 0 };
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  if (!process.env.GA4_PROPERTY_ID)             throw new Error('GA4_PROPERTY_ID not set');

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const client      = new BetaAnalyticsDataClient({ credentials });
  const property    = `properties/${process.env.GA4_PROPERTY_ID}`;
  const dateRanges  = [{ startDate: `${PERIOD_DAYS}daysAgo`, endDate: 'today' }];

  const [[sessionRes], [eventRes]] = await Promise.all([
    client.runReport({
      property,
      dateRanges,
      metrics: [
        { name: 'sessions' },
        { name: 'purchaseRevenue' },
        { name: 'bounceRate' },
        { name: 'transactions' },
      ],
    }),
    client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics:    [{ name: 'eventCount' }],
    }),
  ]);

  const sv = sessionRes.rows?.[0]?.metricValues || [];
  const sessions  = parseInt(sv[0]?.value  || '0');
  const revenue   = parseFloat((sv[1]?.value || '0'));
  const bounceRate = parseFloat((sv[2]?.value || '0'));
  const purchases = parseInt(sv[3]?.value  || '0');

  const eventMap = {};
  for (const row of (eventRes.rows || [])) {
    const name  = row.dimensionValues?.[0]?.value;
    const count = parseInt(row.metricValues?.[0]?.value || '0');
    if (name) eventMap[name] = count;
  }

  return {
    sessions,
    productViews: eventMap['view_item']      || 0,
    addToCarts:   eventMap['add_to_cart']    || 0,
    checkouts:    eventMap['begin_checkout'] || 0,
    purchases,
    revenue:      parseFloat(revenue.toFixed(2)),
    bounceRate:   parseFloat(bounceRate.toFixed(2)),
  };
}

// ─── PILLAR 2 — SHOPIFY REVENUE INTELLIGENCE ─────────────────────────────────

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

async function fetchShopifyData() {
  const since   = new Date(Date.now() - PERIOD_DAYS * 86400000).toISOString();
  const headers = shopifyHeaders();
  const orders  = [];

  let url = `${shopifyBase()}/orders.json?limit=250&status=any&financial_status=paid&created_at_min=${since}`
          + `&fields=id,name,total_price,line_items,created_at`;

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Shopify orders: ${res.status} ${await res.text()}`);
    const data = await res.json();
    orders.push(...(data.orders || []));
    const link = res.headers.get('Link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }

  const totalRevenue = parseFloat(
    orders.reduce((s, o) => s + parseFloat(o.total_price || '0'), 0).toFixed(2)
  );
  const aov = orders.length > 0
    ? parseFloat((totalRevenue / orders.length).toFixed(2))
    : 0;

  const productTotals = {};
  for (const order of orders) {
    for (const item of (order.line_items || [])) {
      const key = item.title;
      if (!productTotals[key]) productTotals[key] = { units: 0, revenue: 0 };
      productTotals[key].units   += item.quantity;
      productTotals[key].revenue += parseFloat(item.price || '0') * item.quantity;
    }
  }

  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([title, stats]) => ({ title, units: stats.units, revenue: parseFloat(stats.revenue.toFixed(2)) }));

  return { ordersCount: orders.length, totalRevenue, aov, topProducts };
}

// ─── PILLAR 3 — TREND & BOTTLENECK ───────────────────────────────────────────

function calcRates(funnel) {
  const safe = (n, d) => d > 0 ? parseFloat((n / d * 100).toFixed(2)) : 0;
  return {
    viewRate:     safe(funnel.productViews, funnel.sessions),
    cartRate:     safe(funnel.addToCarts,   funnel.productViews),
    checkoutRate: safe(funnel.checkouts,    funnel.addToCarts),
    purchaseRate: safe(funnel.purchases,    funnel.checkouts),
    overallCvr:   safe(funnel.purchases,    funnel.sessions),
  };
}

function findBottleneck(funnel) {
  if (funnel.sessions === 0) return null;
  const stages = [
    { label: 'Sessions → Product Views',  from: funnel.sessions,     to: funnel.productViews },
    { label: 'Product Views → Add to Cart', from: funnel.productViews, to: funnel.addToCarts },
    { label: 'Add to Cart → Checkout',    from: funnel.addToCarts,   to: funnel.checkouts },
    { label: 'Checkout → Purchase',       from: funnel.checkouts,    to: funnel.purchases },
  ];
  return stages
    .filter(s => s.from > 0)
    .reduce((worst, s) => {
      const drop = (s.from - s.to) / s.from;
      const wDrop = worst ? (worst.from - worst.to) / worst.from : -1;
      return drop > wDrop ? s : worst;
    }, null);
}

async function fetchPreviousSnapshot() {
  const { data, error } = await getSupabase()
    .from('cro_snapshots')
    .select('*')
    .lt('snapshot_date', REPORT_DATE)
    .eq('period_days', PERIOD_DAYS)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`fetchPreviousSnapshot: ${error.message}`);
  return data || null;
}

// ─── SUPABASE WRITES ──────────────────────────────────────────────────────────

async function upsertSnapshot(funnel, rates, shopify) {
  const row = {
    snapshot_date: REPORT_DATE,
    period_days:   PERIOD_DAYS,
    sessions:      funnel.sessions,
    product_views: funnel.productViews,
    add_to_carts:  funnel.addToCarts,
    checkouts:     funnel.checkouts,
    purchases:     funnel.purchases,
    view_rate:     rates.viewRate,
    cart_rate:     rates.cartRate,
    checkout_rate: rates.checkoutRate,
    purchase_rate: rates.purchaseRate,
    overall_cvr:   rates.overallCvr,
    ga4_revenue:   funnel.revenue,
    bounce_rate:   funnel.bounceRate,
    payload: {
      shopify_orders:  shopify.ordersCount,
      shopify_revenue: shopify.totalRevenue,
      shopify_aov:     shopify.aov,
      top_products:    shopify.topProducts,
      ga4_active:      GA4_ACTIVE,
    },
  };

  if (DRY_RUN) {
    console.log('[DRY_RUN] Would upsert cro_snapshots:', JSON.stringify(row, null, 2));
    return;
  }
  const { error } = await getSupabase()
    .from('cro_snapshots')
    .upsert(row, { onConflict: 'snapshot_date,period_days' });
  if (error) throw new Error(`upsertSnapshot: ${error.message}`);
  console.log('[A24] Upserted cro_snapshots');
}

async function upsertReport(funnel, rates, shopify, bottleneck, narrative) {
  const payload = {
    funnel,
    rates,
    shopify,
    bottleneck: bottleneck?.label || null,
    ga4_active: GA4_ACTIVE,
    period_days: PERIOD_DAYS,
  };

  if (DRY_RUN) {
    console.log('[DRY_RUN] Would upsert executive_reports (A24)');
    return;
  }
  const { error } = await getSupabase()
    .from('executive_reports')
    .upsert(
      { agent_id: 'A24', report_type: 'daily', report_date: REPORT_DATE, payload },
      { onConflict: 'agent_id,report_type,report_date' }
    );
  if (error) throw new Error(`upsertReport: ${error.message}`);
  console.log('[A24] Upserted executive_reports');
}

// ─── NARRATIVE ────────────────────────────────────────────────────────────────

async function buildNarrative(funnel, rates, shopify, bottleneck, prev) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const ga4Status = GA4_ACTIVE
    ? `נתוני GA4 (${PERIOD_DAYS} ימים): ${funnel.sessions} sessions, CVR כולל ${rates.overallCvr}%`
    : 'GA4 בהמתנה לחיבור — נתוני funnel יתעדכנו לאחר הגדרת GA4.';

  const wowLine = prev
    ? `שינוי שבועי: CVR ${rates.overallCvr}% לעומת ${prev.overall_cvr}% שבוע שעבר.`
    : 'אין נתונים היסטוריים להשוואה — זהו snapshot ראשון.';

  const bottleneckLine = bottleneck
    ? `צוואר הבקבוק הגדול ביותר: ${bottleneck.label} (${bottleneck.from} → ${bottleneck.to}).`
    : 'אין צוואר בקבוק לזיהוי — אין תנועה פעילה.';

  const prompt =
    `אתה מנהל CRO (Conversion Rate Optimization) ב-SockAcademy — מותג גרביים פרמיום ישראלי.\n` +
    `כתוב בעברית עסקית ומקצועית ברמה גבוהה ניתוח CRO קצר (3-4 משפטים) הכולל: ` +
    `(1) סיכום ביצועי funnel, (2) זיהוי הנקודה הקריטית לשיפור, (3) המלצה אסטרטגית אחת ל-CRO.\n\n` +
    `נתוני ${REPORT_DATE}:\n` +
    `- ${ga4Status}\n` +
    `- Shopify ${PERIOD_DAYS}d: ${shopify.ordersCount} הזמנות, $${shopify.totalRevenue} revenue, AOV $${shopify.aov}\n` +
    `- ${bottleneckLine}\n` +
    `- ${wowLine}`;

  const msg = await withRetry(() => new Anthropic().messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 250,
    messages:   [{ role: 'user', content: prompt }],
  }), 'A24');
  return msg.content[0].text;
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

function kpiTile(label, value, sub) {
  return `<div style="background:#fff;border:1px solid #dee2e6;border-radius:6px;padding:12px 16px;min-width:110px;display:inline-block;margin:4px;vertical-align:top;">
    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
    <div style="font-size:22px;font-weight:bold;color:#2c3e50;margin-top:4px;">${value}</div>
    ${sub ? `<div style="font-size:11px;color:#aaa;margin-top:2px;">${sub}</div>` : ''}
  </div>`;
}

function funnelBar(label, count, maxCount, rate) {
  const pct   = maxCount > 0 ? Math.round(count / maxCount * 100) : 0;
  const width  = Math.max(pct, 2);
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:13px;color:#555;white-space:nowrap;width:160px;">${label}</td>
    <td style="padding:6px 4px;width:180px;">
      <div style="background:#e9ecef;border-radius:3px;height:14px;position:relative;">
        <div style="background:#2c3e50;width:${width}%;height:100%;border-radius:3px;"></div>
      </div>
    </td>
    <td style="padding:6px 0 6px 8px;font-size:13px;font-weight:bold;color:#2c3e50;width:60px;">${count.toLocaleString()}</td>
    <td style="padding:6px 0 6px 8px;font-size:12px;color:#888;width:60px;">${rate !== null ? `${rate}%` : '—'}</td>
  </tr>`;
}

function wowDelta(label, current, previous, suffix) {
  if (previous === null || previous === undefined) return '';
  const diff = current - previous;
  const color = diff >= 0 ? '#27ae60' : '#c0392b';
  const sign  = diff >= 0 ? '+' : '';
  return `<tr>
    <td style="padding:4px 12px 4px 0;font-size:12px;color:#666;">${label}</td>
    <td style="padding:4px 0;font-size:12px;font-weight:bold;color:#2c3e50;">${current}${suffix}</td>
    <td style="padding:4px 8px;font-size:12px;color:${color};">${sign}${diff.toFixed(2)}${suffix}</td>
  </tr>`;
}

async function sendEmail(funnel, rates, shopify, bottleneck, narrative, prev) {
  if (!process.env.GMAIL_APP_PASSWORD) throw new Error('GMAIL_APP_PASSWORD not set');

  const subject = funnel.sessions === 0
    ? `A24 CRO — ${REPORT_DATE} | 0 sessions | Monitoring Active`
    : `A24 CRO — ${REPORT_DATE} | ${funnel.sessions} sessions | CVR ${rates.overallCvr}% | $${shopify.totalRevenue}`;

  const maxCount = funnel.sessions || 1;

  const topProductsHtml = shopify.topProducts.length === 0
    ? `<p style="color:#888;font-size:13px;">אין הזמנות ב-${PERIOD_DAYS} ימים האחרונים.</p>`
    : shopify.topProducts.map((p, i) =>
        `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px 12px;font-size:13px;color:#666;">#${i + 1}</td>
          <td style="padding:8px 12px;font-size:13px;">${p.title}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;">${p.units}</td>
          <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:bold;">$${p.revenue.toLocaleString()}</td>
        </tr>`
      ).join('');

  const ga4Badge = GA4_ACTIVE
    ? `<span style="background:#27ae60;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">GA4 Active</span>`
    : `<span style="background:#e67e22;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">GA4 Pending Setup</span>`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#333;">
    <h2 style="color:#1a1a1a;border-bottom:2px solid #2c3e50;padding-bottom:10px;margin-bottom:4px;">
      A24 — CRO Intelligence
    </h2>
    <p style="color:#888;font-size:12px;margin-top:0;">
      📅 ${REPORT_DATE} &nbsp;|&nbsp; Period: Last ${PERIOD_DAYS} days &nbsp;|&nbsp; ${ga4Badge}
    </p>

    <div style="background:#f8f9fa;border-left:4px solid #2c3e50;padding:16px 20px;margin:20px 0;border-radius:0 4px 4px 0;">
      <h3 style="margin:0 0 8px;color:#2c3e50;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">AI CRO Analysis</h3>
      <p style="margin:0;line-height:1.8;color:#333;font-size:14px;">${narrative}</p>
    </div>

    <div style="margin:20px 0;">
      ${kpiTile('Sessions', funnel.sessions.toLocaleString(), `${PERIOD_DAYS}d`)}
      ${kpiTile('Overall CVR', `${rates.overallCvr}%`, 'sessions→purchase')}
      ${kpiTile('Orders', shopify.ordersCount.toString(), `${PERIOD_DAYS}d Shopify`)}
      ${kpiTile('Revenue', `$${shopify.totalRevenue.toLocaleString()}`, `${PERIOD_DAYS}d`)}
      ${kpiTile('AOV', `$${shopify.aov}`, 'avg order value')}
    </div>

    <h3 style="color:#1a1a1a;margin-top:28px;">Conversion Funnel</h3>
    <table style="border-collapse:collapse;margin-bottom:8px;">
      ${funnelBar('Sessions', funnel.sessions, maxCount, null)}
      ${funnelBar('Product Views', funnel.productViews, maxCount, rates.viewRate)}
      ${funnelBar('Add to Cart', funnel.addToCarts, maxCount, rates.cartRate)}
      ${funnelBar('Checkout Started', funnel.checkouts, maxCount, rates.checkoutRate)}
      ${funnelBar('Purchased', funnel.purchases, maxCount, rates.purchaseRate)}
    </table>
    ${bottleneck ? `<p style="font-size:13px;color:#c0392b;margin:8px 0;">
      ⚠️ <strong>Biggest drop-off:</strong> ${bottleneck.label} (${bottleneck.from.toLocaleString()} → ${bottleneck.to.toLocaleString()})
    </p>` : ''}

    ${prev ? `<h3 style="color:#1a1a1a;margin-top:28px;">Week-over-Week</h3>
    <table style="border-collapse:collapse;font-size:12px;">
      <tr style="background:#f8f9fa;">
        <th style="padding:4px 12px 4px 0;text-align:left;color:#888;">Metric</th>
        <th style="padding:4px 0;text-align:left;color:#888;">Current</th>
        <th style="padding:4px 8px;text-align:left;color:#888;">Change</th>
      </tr>
      ${wowDelta('Overall CVR', rates.overallCvr, prev.overall_cvr, '%')}
      ${wowDelta('Sessions', funnel.sessions, prev.sessions, '')}
      ${wowDelta('Cart Rate', rates.cartRate, prev.cart_rate, '%')}
      ${wowDelta('Checkout Rate', rates.checkoutRate, prev.checkout_rate, '%')}
    </table>` : ''}

    <h3 style="color:#1a1a1a;margin-top:28px;">Top Products (${PERIOD_DAYS}d Shopify)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#2c3e50;color:#fff;">
          <th style="padding:8px 12px;text-align:left;">#</th>
          <th style="padding:8px 12px;text-align:left;">Product</th>
          <th style="padding:8px 12px;text-align:right;">Units</th>
          <th style="padding:8px 12px;text-align:right;">Revenue</th>
        </tr>
      </thead>
      <tbody>${topProductsHtml}</tbody>
    </table>

    <p style="color:#bbb;font-size:11px;margin-top:28px;border-top:1px solid #eee;padding-top:12px;">
      SockAcademy A24 CRO Intelligence &nbsp;|&nbsp; GA4_ACTIVE=${GA4_ACTIVE}
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
    from:    '"SockAcademy A24" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject,
    html,
  });
  console.log('[A24] Email sent:', subject);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A24] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
    process.exit(0);
  }

  console.log(`[A24] Starting CRO Agent — ${REPORT_DATE}`);
  if (DRY_RUN)    console.log('[A24] DRY_RUN=true — no writes, no emails');
  if (!GA4_ACTIVE) console.log('[A24] GA4_ACTIVE=false — funnel data from Shopify only');

  let funnel   = { sessions: 0, productViews: 0, addToCarts: 0, checkouts: 0, purchases: 0, revenue: 0, bounceRate: 0 };
  let shopify  = { ordersCount: 0, totalRevenue: 0, aov: 0, topProducts: [] };
  let prev     = null;

  // Pillar 1 — GA4 Funnel
  try {
    funnel = await fetchGA4Funnel();
    console.log(`[A24] P1 GA4 Funnel: ${funnel.sessions} sessions | ${funnel.purchases} purchases | CVR ${calcRates(funnel).overallCvr}%`);
  } catch (err) {
    console.error('[A24] P1 GA4 Funnel failed (non-fatal):', err.message);
  }

  // Pillar 2 — Shopify Revenue
  try {
    shopify = await fetchShopifyData();
    console.log(`[A24] P2 Shopify: ${shopify.ordersCount} orders | $${shopify.totalRevenue} revenue | AOV $${shopify.aov}`);
  } catch (err) {
    console.error('[A24] P2 Shopify failed (non-fatal):', err.message);
  }

  // Pillar 3 — Trend
  try {
    prev = await fetchPreviousSnapshot();
    console.log(prev ? `[A24] P3 Previous snapshot: ${prev.snapshot_date}` : '[A24] P3 No previous snapshot');
  } catch (err) {
    console.error('[A24] P3 Previous snapshot failed (non-fatal):', err.message);
  }

  const rates      = calcRates(funnel);
  const bottleneck = findBottleneck(funnel);

  if (bottleneck) {
    console.log(`[A24] Bottleneck: ${bottleneck.label} (${bottleneck.from} → ${bottleneck.to})`);
  }

  await Promise.all([
    upsertSnapshot(funnel, rates, shopify),
    upsertReport(funnel, rates, shopify, bottleneck, null),
  ]);

  // Audit fix (2026-07-04): buildNarrative() calls Anthropic unconditionally —
  // skip the real API call under DRY_RUN so dry-run tests never spend budget.
  const narrative = DRY_RUN
    ? '[DRY_RUN] נרטיב לא נוצר — אין קריאת Anthropic במצב בדיקה.'
    : await buildNarrative(funnel, rates, shopify, bottleneck, prev);
  await sendEmail(funnel, rates, shopify, bottleneck, narrative, prev);

  // Command Center KPIs — feeds A0's unified daily brief
  if (!DRY_RUN) {
    await writeMetrics(getSupabase(), 'A24', REPORT_DATE, [
      { name: 'sessions_7d',      value: funnel.sessions,       unit: 'count' },
      { name: 'overall_cvr_pct',  value: rates.overallCvr,      unit: 'pct' },
      { name: 'revenue_7d_usd',   value: shopify.totalRevenue,  unit: 'usd' },
    ]);
  }

  console.log(`[A24] Complete — ${funnel.sessions} sessions | CVR ${rates.overallCvr}% | $${shopify.totalRevenue} revenue`);
}

main().catch(async err => {
  console.error('[A24] Fatal error:', err.message);
  let sb = null;
  try { sb = getSupabase(); } catch (_) {}
  await notifyTelegram(heTelegramMsg('A24 CRO', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${err.message}</code>`));
  await handleFatalError({ agentId: 'A24', agentName: 'CRO', err, supabase: sb });
  process.exit(1);
});
