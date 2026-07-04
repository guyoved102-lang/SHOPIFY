/**
 * A18 — Fraud & Cybersecurity Agent
 *
 * Runs daily at 09:00 UTC.
 * Reads:  Shopify orders API (last 30d sliding window)
 * Writes: fraud_events (one row per signal, idempotent by date+pillar+signal_type)
 *         executive_reports (agent_id='A18', report_type='daily')
 * Sends:  email security briefing — always (pre-revenue: 0 events, monitoring active)
 *
 * Three pillars, each wrapped in independent try/catch:
 *   Pillar 1 — Chargeback Monitoring
 *   Pillar 2 — Bot Traffic Detection (Shopify signals + Cloudflare dormant)
 *   Pillar 3 — Payment Health
 *
 * Flags:
 *   DRY_RUN=true          no Supabase writes, no emails — logs intent only
 *   CLOUDFLARE_ACTIVE=false  Cloudflare block returns null; Pillar 2 uses Shopify only
 *
 * Pre-revenue behavior: 0 orders → 0 fraud events → "monitoring active" report.
 * Same code path as live. No stubs.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic        = require('@anthropic-ai/sdk');
const nodemailer       = require('nodemailer');
const { withRetry }    = require('../../corp/core/anthropic-retry.js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const { writeMetrics } = require('../../corp/core/metrics.js');
const { handleFatalError } = require('../../corp/core/self-heal.js');

const DRY_RUN           = process.env.DRY_RUN === 'true';
const CLOUDFLARE_ACTIVE = process.env.CLOUDFLARE_ACTIVE === 'true';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const REPORT_DATE       = new Date().toISOString().split('T')[0];

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

async function fetchAllOrders(sinceDate) {
  const orders  = [];
  const headers = shopifyHeaders();
  let url = `${shopifyBase()}/orders.json?limit=250&status=any&created_at_min=${sinceDate}`
    + `&fields=id,name,financial_status,total_price,created_at,browser_ip,risk_level,email,customer`;

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

// ─── CLOUDFLARE (dormant until CLOUDFLARE_ACTIVE=true) ───────────────────────

async function getCloudflareData() {
  if (!CLOUDFLARE_ACTIVE) return null;

  const token  = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId)
    throw new Error('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID not set');

  const until = new Date().toISOString();
  const since = new Date(Date.now() - 24 * 3600000).toISOString();

  const botQuery = {
    query: `query BotAnalytics($zoneId: String!, $since: String!, $until: String!) {
      viewer {
        zones(filter: { zoneTag: $zoneId }) {
          httpRequests1hGroups(
            filter: { datetime_geq: $since, datetime_leq: $until }
            limit: 24
            orderBy: [datetime_ASC]
          ) {
            sum { requests botMapDetail { botScore count } }
          }
        }
      }
    }`,
    variables: { zoneId, since, until },
  };

  const [analyticsRes, firewallRes] = await Promise.all([
    fetch('https://api.cloudflare.com/client/v4/graphql', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(botQuery),
    }),
    fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/security/events?since=${since}&until=${until}&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    ),
  ]);

  if (!analyticsRes.ok) throw new Error(`Cloudflare Analytics: ${analyticsRes.status}`);
  if (!firewallRes.ok)  throw new Error(`Cloudflare Firewall: ${firewallRes.status}`);

  const analyticsData = await analyticsRes.json();
  const firewallData  = await firewallRes.json();

  const groups         = analyticsData?.data?.viewer?.zones?.[0]?.httpRequests1hGroups || [];
  const totalRequests  = groups.reduce((s, g) => s + (g.sum?.requests || 0), 0);
  const botRequests    = groups.reduce((s, g) => {
    const details = g.sum?.botMapDetail || [];
    return s + details.filter(d => d.botScore < 30).reduce((n, d) => n + (d.count || 0), 0);
  }, 0);

  return {
    bot_pct:          totalRequests > 0 ? parseFloat((botRequests / totalRequests * 100).toFixed(1)) : 0,
    blocked_threats:  (firewallData?.result || []).length,
    total_requests:   totalRequests,
  };
}

// ─── FRAUD EVENT BUILDER ─────────────────────────────────────────────────────

function buildFraudEvents(pillar, alerts) {
  return alerts.map(a => ({
    event_date:  REPORT_DATE,
    pillar,
    severity:    a.level,
    signal_type: a.signal,
    value:       a.value  ?? null,
    threshold:   a.threshold ?? null,
    order_id:    a.order_id  ?? null,
    browser_ip:  a.browser_ip ?? null,
    metadata:    { message: a.message },
  }));
}

// ─── PILLAR 1 — CHARGEBACK MONITORING ────────────────────────────────────────

async function runChargebackPillar(orders30d) {
  try {
    const chargedBack   = orders30d.filter(o => o.financial_status === 'charged_back');
    const totalOrders   = orders30d.length;
    const chargebackCount  = chargedBack.length;
    const totalAmountAtRisk = chargedBack.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
    const chargebackRatePct = totalOrders > 0
      ? parseFloat((chargebackCount / totalOrders * 100).toFixed(2))
      : 0;
    const highValueChargebacks = chargedBack
      .filter(o => parseFloat(o.total_price || 0) > 300)
      .map(o => ({ id: o.id, name: o.name, amount: parseFloat(o.total_price || 0) }));

    const kpis = {
      chargeback_count:       chargebackCount,
      chargeback_rate_pct:    chargebackRatePct,
      total_amount_at_risk:   parseFloat(totalAmountAtRisk.toFixed(2)),
      high_value_chargebacks: highValueChargebacks,
      total_orders_30d:       totalOrders,
    };

    const alerts = [];
    if (chargebackRatePct > 1.0)
      alerts.push({ level: 'critical', signal: 'chargeback_rate', value: chargebackRatePct, threshold: 1.0,
        message: `Chargeback rate ${chargebackRatePct}% exceeds 1% threshold — payment processor risk` });
    else if (chargebackRatePct > 0.5)
      alerts.push({ level: 'warning', signal: 'chargeback_rate', value: chargebackRatePct, threshold: 0.5,
        message: `Chargeback rate ${chargebackRatePct}% approaching 1% threshold` });

    for (const cb of highValueChargebacks)
      alerts.push({ level: 'warning', signal: 'high_value_chargeback', value: cb.amount, threshold: 300,
        order_id: cb.id,
        message: `High-value chargeback on order ${cb.name} — $${cb.amount.toFixed(2)}` });

    return { status: 'ok', kpis, alerts, events: buildFraudEvents('chargeback', alerts) };
  } catch (e) {
    return { status: 'error', error: e.message, kpis: null, alerts: [], events: [] };
  }
}

// ─── PILLAR 2 — BOT TRAFFIC DETECTION ────────────────────────────────────────

async function runBotTrafficPillar(orders30d) {
  try {
    const since24h  = Date.now() - 24 * 3600000;
    const orders24h = orders30d.filter(o => new Date(o.created_at).getTime() >= since24h);

    // Velocity detection — group by browser_ip in last 24h
    const ipMap = {};
    for (const order of orders24h) {
      if (!order.browser_ip) continue;
      if (!ipMap[order.browser_ip]) ipMap[order.browser_ip] = [];
      ipMap[order.browser_ip].push(order.id);
    }
    const velocityFlags = Object.entries(ipMap)
      .filter(([, ids]) => ids.length >= 3)
      .map(([ip, ids]) => ({ ip, count: ids.length, orders: ids }));

    // High-risk cluster from Shopify risk assessment
    const highRiskCount = orders24h.filter(o => o.risk_level === 'high').length;

    // Card-testing — same IP, 2+ small orders (<$50)
    const cardTestSuspects = Object.entries(ipMap)
      .map(([ip]) => {
        const ipOrders   = orders24h.filter(o => o.browser_ip === ip);
        const smallOrders = ipOrders.filter(o => parseFloat(o.total_price || 0) < 50);
        return smallOrders.length >= 2 ? { ip, order_count: smallOrders.length } : null;
      })
      .filter(Boolean);

    const cfData = await getCloudflareData();

    const kpis = {
      high_risk_order_count: highRiskCount,
      velocity_flags:        velocityFlags,
      card_testing_suspects: cardTestSuspects,
      cloudflare_bot_pct:    cfData?.bot_pct    ?? null,
      cloudflare_blocked:    cfData?.blocked_threats ?? null,
      orders_24h:            orders24h.length,
    };

    const alerts = [];
    for (const flag of velocityFlags) {
      if (flag.count >= 5)
        alerts.push({ level: 'critical', signal: 'velocity_flag', value: flag.count, threshold: 5,
          browser_ip: flag.ip,
          message: `Bot velocity: IP ${flag.ip} placed ${flag.count} orders in 24h` });
      else
        alerts.push({ level: 'warning', signal: 'velocity_flag', value: flag.count, threshold: 3,
          browser_ip: flag.ip,
          message: `Velocity flag: IP ${flag.ip} — ${flag.count} orders in 24h` });
    }
    if (highRiskCount >= 3)
      alerts.push({ level: 'warning', signal: 'high_risk_cluster', value: highRiskCount, threshold: 3,
        message: `${highRiskCount} high-risk orders flagged by Shopify in 24h` });
    for (const s of cardTestSuspects)
      alerts.push({ level: 'critical', signal: 'card_testing', value: s.order_count, threshold: 2,
        browser_ip: s.ip,
        message: `Card testing suspected: IP ${s.ip} — ${s.order_count} small-value orders` });
    if (cfData && cfData.bot_pct > 30)
      alerts.push({ level: 'warning', signal: 'cloudflare_bot_traffic', value: cfData.bot_pct, threshold: 30,
        message: `Bot traffic ${cfData.bot_pct}% of sessions (Cloudflare Analytics)` });

    return { status: 'ok', kpis, alerts, events: buildFraudEvents('bot_traffic', alerts) };
  } catch (e) {
    return { status: 'error', error: e.message, kpis: null, alerts: [], events: [] };
  }
}

// ─── PILLAR 3 — PAYMENT HEALTH ────────────────────────────────────────────────

async function runPaymentHealthPillar(orders30d) {
  try {
    const since24h  = Date.now() - 24 * 3600000;
    const orders24h = orders30d.filter(o => new Date(o.created_at).getTime() >= since24h);

    const paidOrders   = orders30d.filter(o => o.financial_status === 'paid');
    const voidedOrders = orders30d.filter(o => o.financial_status === 'voided');
    const totalForRate = paidOrders.length + voidedOrders.length;
    const declineRatePct = totalForRate > 0
      ? parseFloat((voidedOrders.length / totalForRate * 100).toFixed(2))
      : 0;

    // Multi-order same customer in 24h
    const emailMap = {};
    for (const order of orders24h) {
      const email = order.email || order.customer?.email;
      if (!email) continue;
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(order.id);
    }
    const suspiciousPatterns = Object.values(emailMap).filter(ids => ids.length >= 3).length;

    // AOV anomaly — 24h vs 30d baseline
    const aov30d = paidOrders.length > 0
      ? paidOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0) / paidOrders.length
      : 0;
    const paid24h = orders24h.filter(o => o.financial_status === 'paid');
    const aov24h  = paid24h.length > 0
      ? paid24h.reduce((s, o) => s + parseFloat(o.total_price || 0), 0) / paid24h.length
      : 0;
    const aovAnomalyDetected = aov30d > 0 && aov24h > aov30d * 3;

    const kpis = {
      total_orders_30d:            orders30d.length,
      voided_orders_30d:           voidedOrders.length,
      paid_orders_30d:             paidOrders.length,
      gateway_decline_rate_pct:    declineRatePct,
      suspicious_payment_patterns: suspiciousPatterns,
      avg_order_value_30d:         parseFloat(aov30d.toFixed(2)),
      avg_order_value_24h:         parseFloat(aov24h.toFixed(2)),
      aov_anomaly_detected:        aovAnomalyDetected,
    };

    const alerts = [];
    if (declineRatePct > 15)
      alerts.push({ level: 'critical', signal: 'gateway_decline_rate', value: declineRatePct, threshold: 15,
        message: `Gateway decline rate ${declineRatePct}% — investigate payment configuration` });
    else if (declineRatePct > 8)
      alerts.push({ level: 'warning', signal: 'gateway_decline_rate', value: declineRatePct, threshold: 8,
        message: `Decline rate ${declineRatePct}% above healthy baseline` });
    if (aovAnomalyDetected)
      alerts.push({ level: 'warning', signal: 'aov_anomaly', value: aov24h, threshold: parseFloat((aov30d * 3).toFixed(2)),
        message: `AOV spike: $${aov24h.toFixed(2)} vs $${aov30d.toFixed(2)} 30-day baseline (3× threshold)` });
    if (suspiciousPatterns >= 2)
      alerts.push({ level: 'warning', signal: 'suspicious_payment_patterns', value: suspiciousPatterns, threshold: 2,
        message: `${suspiciousPatterns} multi-order same-customer patterns detected in 24h` });

    return { status: 'ok', kpis, alerts, events: buildFraudEvents('payment_health', alerts) };
  } catch (e) {
    return { status: 'error', error: e.message, kpis: null, alerts: [], events: [] };
  }
}

// ─── CONSOLIDATION ────────────────────────────────────────────────────────────

function consolidate(r1, r2, r3) {
  const allAlerts  = [...r1.alerts, ...r2.alerts, ...r3.alerts];
  const criticals  = allAlerts.filter(a => a.level === 'critical').length;
  const warnings   = allAlerts.filter(a => a.level === 'warning').length;
  const hasError   = r1.status === 'error' || r2.status === 'error' || r3.status === 'error';

  let topSeverity = 'info';
  if (criticals > 0)      topSeverity = 'critical';
  else if (warnings > 0)  topSeverity = 'warning';
  else if (hasError)      topSeverity = 'error';

  return {
    report_date:    REPORT_DATE,
    total_events:   criticals + warnings,
    critical_count: criticals,
    warning_count:  warnings,
    top_severity:   topSeverity,
    pillars: {
      chargeback:     r1,
      bot_traffic:    r2,
      payment_health: r3,
    },
  };
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function upsertFraudEvents(sb, r1, r2, r3) {
  const allEvents = [...r1.events, ...r2.events, ...r3.events];
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would upsert ${allEvents.length} fraud_events rows`);
    return;
  }
  for (const ev of allEvents) {
    const { error } = await sb.from('fraud_events').upsert(ev, {
      onConflict: 'event_date,pillar,signal_type',
    });
    if (error) console.warn(`⚠️  fraud_events upsert failed (${ev.signal_type}): ${error.message}`);
  }
}

async function writeExecutiveReport(sb, summary, narrative) {
  if (DRY_RUN) {
    console.log('[DRY_RUN] Would upsert executive_reports (A18)');
    return;
  }
  const allAlerts = [
    ...summary.pillars.chargeback.alerts,
    ...summary.pillars.bot_traffic.alerts,
    ...summary.pillars.payment_health.alerts,
  ];
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A18',
    report_date: REPORT_DATE,
    report_type: 'daily',
    kpis: {
      chargeback:     summary.pillars.chargeback.kpis,
      bot_traffic:    summary.pillars.bot_traffic.kpis,
      payment_health: summary.pillars.payment_health.kpis,
    },
    alerts:    allAlerts,
    narrative,
  }, { onConflict: 'agent_id,report_date,report_type' });
  if (error) throw new Error(`executive_reports upsert failed: ${error.message}`);
}

async function logHealth(sb, status, meta = {}) {
  if (DRY_RUN) return;
  const { error } = await sb.from('agent_health_log').insert({
    agent_id:        'A18',
    agent_name:      'Fraud & Cybersecurity',
    run_status:      status,
    items_processed: meta.events_processed || 0,
    metadata:        meta,
  });
  if (error) console.error(`⚠️  Health log failed: ${error.message}`);
}

// ─── NARRATIVE ────────────────────────────────────────────────────────────────

async function generateNarrative(summary) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const briefingData = JSON.stringify({
    total_events:    summary.total_events,
    top_severity:    summary.top_severity,
    chargeback_rate: summary.pillars.chargeback.kpis?.chargeback_rate_pct,
    bot_flags:       summary.pillars.bot_traffic.kpis?.velocity_flags?.length,
    decline_rate:    summary.pillars.payment_health.kpis?.gateway_decline_rate_pct,
    pillar_errors:   Object.entries(summary.pillars)
      .filter(([, v]) => v.status === 'error')
      .map(([k]) => k),
  });

  const msg = await withRetry(() => client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{
      role:    'user',
      content: `You are the Fraud & Cybersecurity intelligence system for SockAcademy, a premium sock brand. Write a 2-3 sentence security briefing for the CEO. Assess the overall threat level. Name the most significant signal if events exist. Give one concrete recommendation if action is required. If 0 events, confirm clean security posture and system monitoring status. Be direct and precise.\n\n${briefingData}`,
    }],
  }), 'A18');
  return msg.content[0].text.trim();
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

function severityColor(level) {
  if (level === 'critical') return '#dc2626';
  if (level === 'warning')  return '#d97706';
  if (level === 'error')    return '#7c3aed';
  return '#4AAD80';
}

function pillarSummaryText(name, kpis) {
  if (!kpis) return '—';
  if (name === 'Chargeback')
    return `Rate: ${kpis.chargeback_rate_pct}% | ${kpis.chargeback_count} chargebacks`;
  if (name === 'Bot Traffic')
    return `${kpis.high_risk_order_count} high-risk | ${kpis.velocity_flags?.length || 0} velocity flags`;
  if (name === 'Payment Health')
    return `Decline: ${kpis.gateway_decline_rate_pct}% | AOV 24h: $${kpis.avg_order_value_24h?.toFixed(2) || '0.00'}`;
  return '';
}

function pillarRowHtml(name, result) {
  if (result.status === 'error')
    return `<tr>
      <td style="padding:6px 8px;color:#9CA3AF">${name}</td>
      <td style="padding:6px 8px;color:#7c3aed">PILLAR ERROR</td>
      <td style="padding:6px 8px;color:#7c3aed;font-size:11px">${result.error || ''}</td>
    </tr>`;

  const alertCount = result.alerts.length;
  const statusText = alertCount === 0 ? 'Clean' : `${alertCount} alert${alertCount > 1 ? 's' : ''}`;
  const statusColor = alertCount === 0 ? '#4AAD80' : severityColor(result.alerts[0]?.level);
  return `<tr>
    <td style="padding:6px 8px;color:#9CA3AF">${name}</td>
    <td style="padding:6px 8px;color:${statusColor}">${statusText}</td>
    <td style="padding:6px 8px;color:#f0ede6;font-size:11px">${pillarSummaryText(name, result.kpis)}</td>
  </tr>`;
}

function alertsBlockHtml(summary) {
  const all = [
    ...summary.pillars.chargeback.alerts,
    ...summary.pillars.bot_traffic.alerts,
    ...summary.pillars.payment_health.alerts,
  ];
  if (all.length === 0)
    return '<p style="color:#4AAD80;margin:0">No fraud alerts — security posture clean.</p>';

  return `<ul style="padding-left:16px;margin:0">${all.map(a =>
    `<li style="color:${severityColor(a.level)};margin:4px 0">
      <span style="font-size:10px;text-transform:uppercase;opacity:0.8">[${a.level}]</span> ${a.message}
    </li>`
  ).join('')}</ul>`;
}

async function sendEmail(summary, narrative) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send A18 security briefing to ${ADMIN_EMAIL}`);
    return;
  }

  const sevColor = severityColor(summary.top_severity);
  const cb = summary.pillars.chargeback.kpis;
  const bt = summary.pillars.bot_traffic.kpis;
  const ph = summary.pillars.payment_health.kpis;

  const subject = [
    `A18 Fraud & Security — ${REPORT_DATE}`,
    `${summary.total_events} events`,
    `CB: ${cb?.chargeback_rate_pct ?? '—'}%`,
    `Bot: ${bt?.velocity_flags?.length ?? '—'} flags`,
    `Payment: ${ph?.gateway_decline_rate_pct ?? '—'}%`,
  ].join(' | ');

  const html = `
<div style="font-family:monospace;max-width:720px;background:#0a0a0a;color:#f0ede6;padding:24px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px;font-size:16px">A18 — Fraud & Cybersecurity</h2>
  <p style="color:#9CA3AF;margin:0 0 2px;font-size:12px">${REPORT_DATE}</p>
  <p style="color:${sevColor};margin:0 0 20px;font-size:11px;text-transform:uppercase;letter-spacing:1px">
    Threat Level: ${summary.top_severity.toUpperCase()} &nbsp;|&nbsp; ${summary.total_events} event${summary.total_events !== 1 ? 's' : ''}
    ${CLOUDFLARE_ACTIVE ? '' : ' &nbsp;|&nbsp; Cloudflare: dormant'}
  </p>

  ${narrative ? `<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:0 0 24px;background:#111;color:#f0ede6;font-style:italic;font-size:13px">${narrative}</blockquote>` : ''}

  <h3 style="color:#C9A84C;border-bottom:1px solid #222;padding-bottom:6px;margin:0 0 8px;font-size:13px">Pillar Status</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr style="background:#1a1a1a">
      <th style="padding:6px 8px;text-align:left;color:#9CA3AF;font-size:11px;width:140px">Pillar</th>
      <th style="padding:6px 8px;text-align:left;color:#9CA3AF;font-size:11px;width:110px">Status</th>
      <th style="padding:6px 8px;text-align:left;color:#9CA3AF;font-size:11px">Summary</th>
    </tr>
    ${pillarRowHtml('Chargeback', summary.pillars.chargeback)}
    ${pillarRowHtml('Bot Traffic', summary.pillars.bot_traffic)}
    ${pillarRowHtml('Payment Health', summary.pillars.payment_health)}
  </table>

  <h3 style="color:#C9A84C;border-bottom:1px solid #222;padding-bottom:6px;margin:0 0 12px;font-size:13px">Alerts</h3>
  <div style="margin-bottom:24px">${alertsBlockHtml(summary)}</div>

  <hr style="border:none;border-top:1px solid #1a1a1a;margin:24px 0 12px">
  <p style="color:#444;font-size:11px;margin:0">
    SockAcademy A18 Fraud &amp; Cybersecurity &mdash; ${REPORT_DATE} &nbsp;|&nbsp;
    Cloudflare: ${CLOUDFLARE_ACTIVE ? 'active' : 'dormant (CLOUDFLARE_ACTIVE=false)'}
  </p>
</div>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from:    '"SockAcademy Security" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject,
    html,
  });
  console.log(`📧 A18 security briefing sent to ${ADMIN_EMAIL}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A18] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
    process.exit(0);
  }

  console.log('\n🔐 A18 — Fraud & Cybersecurity Agent');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN} | CLOUDFLARE_ACTIVE=${CLOUDFLARE_ACTIVE}`);
  console.log('─'.repeat(60));

  const sb = getSupabase();
  console.log('✅ Supabase connected');

  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  console.log('📦 Fetching Shopify orders (30d)...');
  let orders30d;
  try {
    orders30d = await fetchAllOrders(since30d);
  } catch (e) {
    await logHealth(sb, 'failure', { error: e.message, stage: 'shopify_fetch' });
    throw e;
  }
  console.log(`   Orders fetched: ${orders30d.length}`);

  console.log('\n[Pillar 1] Chargeback Monitoring...');
  const r1 = await runChargebackPillar(orders30d);
  console.log(`   Status: ${r1.status} | Alerts: ${r1.alerts.length}`);
  if (r1.status === 'error') console.warn(`   ⚠️  ${r1.error}`);

  console.log('[Pillar 2] Bot Traffic Detection...');
  const r2 = await runBotTrafficPillar(orders30d);
  console.log(`   Status: ${r2.status} | Alerts: ${r2.alerts.length}${CLOUDFLARE_ACTIVE ? ' | Cloudflare: active' : ''}`);
  if (r2.status === 'error') console.warn(`   ⚠️  ${r2.error}`);

  console.log('[Pillar 3] Payment Health...');
  const r3 = await runPaymentHealthPillar(orders30d);
  console.log(`   Status: ${r3.status} | Alerts: ${r3.alerts.length}`);
  if (r3.status === 'error') console.warn(`   ⚠️  ${r3.error}`);

  const summary = consolidate(r1, r2, r3);
  console.log(`\n📊 Summary: ${summary.total_events} events | Severity: ${summary.top_severity}`);

  await upsertFraudEvents(sb, r1, r2, r3);

  const narrative = await generateNarrative(summary);
  if (narrative) console.log(`\n📝 ${narrative}`);

  await writeExecutiveReport(sb, summary, narrative);
  await sendEmail(summary, narrative);

  // Command Center KPIs — feeds A0's unified daily brief
  if (!DRY_RUN) {
    await writeMetrics(sb, 'A18', REPORT_DATE, [
      { name: 'fraud_events_total',       value: summary.total_events,                              unit: 'count' },
      { name: 'chargeback_rate_pct',      value: r1.kpis?.chargeback_rate_pct ?? 0,                  unit: 'pct' },
      { name: 'gateway_decline_rate_pct', value: r3.kpis?.gateway_decline_rate_pct ?? 0,              unit: 'pct' },
      { name: 'top_severity',             text: summary.top_severity },
    ]);
  }

  await logHealth(sb, 'success', {
    events_processed: r1.events.length + r2.events.length + r3.events.length,
    total_orders:     orders30d.length,
    top_severity:     summary.top_severity,
  });

  console.log('\n' + '─'.repeat(60));
  console.log('✅ A18 Fraud & Cybersecurity complete');
}

main().catch(async e => {
  console.error('\n❌ A18 fatal:', e.message);
  let sb = null;
  try {
    sb = getSupabase();
    await logHealth(sb, 'failure', { error: e.message });
  } catch (_) {}
  await notifyTelegram(heTelegramMsg('A18 Fraud & Cybersecurity', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${e.message}</code>`));
  await handleFatalError({ agentId: 'A18', agentName: 'Fraud & Cybersecurity', err: e, supabase: sb });
  process.exit(1);
});
