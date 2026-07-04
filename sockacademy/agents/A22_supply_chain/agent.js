/**
 * A22 — Supply Chain Intelligence Agent
 *
 * Runs daily at 06:15 UTC (offset from A7 at 06:00 to avoid CJ rate-limit collision).
 * Reads:  Supabase products table (active SKUs with cj_pid)
 *         CJ Dropshipping API (stock, processing time, availability per product)
 * Writes: supply_chain_log (one row per supplier check, timestamped)
 *         executive_reports (agent_id='A22', report_type='daily')
 * Sends:  email digest if risk flags detected
 *
 * Pre-revenue behavior: products may have 0 inventory on Shopify but CJ stock
 * represents actual supplier availability. Agent runs fully and reports supplier
 * health even before first sale.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic        = require('@anthropic-ai/sdk');
const nodemailer       = require('nodemailer');
const { withRetry }    = require('../../corp/core/anthropic-retry.js');
const { notifyTelegram, heTelegramMsg } = require('../../corp/core/telegram.js');
const { writeMetrics } = require('../../corp/core/metrics.js');

const DRY_RUN     = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'guyoved102@gmail.com';
const REPORT_DATE = new Date().toISOString().split('T')[0];
const CJ_BASE     = 'https://developers.cjdropshipping.com/api2.0';

let cjAccessToken = null;

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── CJ API ──────────────────────────────────────────────────────────────────

async function getCJToken() {
  if (cjAccessToken) return cjAccessToken;
  if (!process.env.CJ_API_KEY) throw new Error('CJ_API_KEY not set');

  const parts  = process.env.CJ_API_KEY.split('@');
  const email  = parts[0];
  const apiKey = parts[parts.length - 1];

  const res = await fetch(`${CJ_BASE}/v1/authentication/getAccessToken`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password: apiKey }),
  });
  const data = await res.json();
  if (!data.data?.accessToken) throw new Error(`CJ auth failed: ${JSON.stringify(data)}`);
  cjAccessToken = data.data.accessToken;
  return cjAccessToken;
}

async function getCJProductHealth(pid) {
  const token = await getCJToken();
  const res   = await fetch(`${CJ_BASE}/v1/product/query?pid=${pid}`, {
    headers: { 'CJ-Access-Token': token },
  });
  const data = await res.json();
  const p    = data.data;
  if (!p) return null;

  const variants        = p.productVariant || [];
  const totalStock      = variants.reduce((s, v) => s + (v.variantStock || 0), 0);
  const avgProcessDays  = parseFloat(p.processingTime || '3') || 3;

  return {
    available:       !!p.isOnSale,
    total_stock:     totalStock,
    processing_days: avgProcessDays,
    variant_count:   variants.length,
  };
}

// ─── MONITORED PRODUCTS ──────────────────────────────────────────────────────

async function getMonitoredProducts(sb) {
  const { data, error } = await sb
    .from('products')
    .select('product_name, cj_pid, category, retail_price')
    .not('cj_pid', 'is', null);
  if (error) throw new Error(`products query failed: ${error.message}`);
  return data || [];
}

// ─── HEALTH SCORING ──────────────────────────────────────────────────────────

function scoreSupplier(healthResults) {
  let score     = 100;
  const flags   = [];
  let available = 0;
  let totalStock = 0;
  let totalProcessingDays = 0;
  let checked   = 0;

  for (const r of healthResults) {
    if (!r.health) { score -= 5; flags.push({ flag: 'api_error', pid: r.pid }); continue; }
    checked++;
    totalStock          += r.health.total_stock;
    totalProcessingDays += r.health.processing_days;

    if (!r.health.available)      { score -= 15; flags.push({ flag: 'delisted',      pid: r.pid, name: r.name }); }
    else if (r.health.total_stock < 10) { score -= 8;  flags.push({ flag: 'low_stock',    pid: r.pid, name: r.name, stock: r.health.total_stock }); }
    else available++;

    if (r.health.processing_days > 7)  { score -= 5;  flags.push({ flag: 'slow_processing', pid: r.pid, days: r.health.processing_days }); }
  }

  const avgProcessDays = checked > 0 ? parseFloat((totalProcessingDays / checked).toFixed(1)) : null;
  const riskLevel      = score >= 85 ? 'low' : score >= 65 ? 'medium' : score >= 40 ? 'high' : 'critical';

  return {
    health_score:         Math.max(0, score),
    active_skus:          healthResults.length,
    available_skus:       available,
    avg_processing_days:  avgProcessDays,
    risk_level:           riskLevel,
    risk_flags:           flags,
  };
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function writeSupplyChainLog(sb, scoreData) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would insert to supply_chain_log:');
    console.log(JSON.stringify(scoreData, null, 2));
    return;
  }
  const { error } = await sb.from('supply_chain_log').insert({
    supplier_id:          'CJ_DROPSHIPPING',
    supplier_name:        'CJ Dropshipping',
    health_score:         scoreData.health_score,
    active_skus:          scoreData.active_skus,
    available_skus:       scoreData.available_skus,
    avg_processing_days:  scoreData.avg_processing_days,
    risk_level:           scoreData.risk_level,
    risk_flags:           scoreData.risk_flags,
    notes:                `Daily check — ${scoreData.active_skus} SKUs monitored`,
    checked_at:           new Date().toISOString(),
  });
  if (error) throw new Error(`supply_chain_log insert failed: ${error.message}`);
}

async function writeExecutiveReport(sb, summary, alerts, narrative) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would upsert executive_reports (A22)');
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A22',
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
    agent_id:        'A22',
    agent_name:      'Supply Chain Intelligence',
    run_status:      status,
    items_processed: meta.skus_checked || 0,
    metadata:        meta,
  });
  if (error) console.error(`⚠️  Health log failed: ${error.message}`);
}

// ─── ALERTS ──────────────────────────────────────────────────────────────────

function buildAlerts(scoreData) {
  const alerts = [];
  if (scoreData.risk_level === 'critical')
    alerts.push({ level: 'critical', message: `Supplier health critical (score ${scoreData.health_score}/100) — immediate review required` });
  else if (scoreData.risk_level === 'high')
    alerts.push({ level: 'critical', message: `Supplier health high-risk (score ${scoreData.health_score}/100)` });
  else if (scoreData.risk_level === 'medium')
    alerts.push({ level: 'warning', message: `Supplier health medium-risk (score ${scoreData.health_score}/100)` });

  const delisted = scoreData.risk_flags.filter(f => f.flag === 'delisted');
  if (delisted.length > 0)
    alerts.push({ level: 'critical', message: `${delisted.length} SKU(s) delisted from CJ: ${delisted.map(f => f.name || f.pid).join(', ')}` });

  const slowProcessing = scoreData.risk_flags.filter(f => f.flag === 'slow_processing');
  if (slowProcessing.length > 2)
    alerts.push({ level: 'warning', message: `${slowProcessing.length} SKU(s) have processing times >7 days` });

  if (scoreData.avg_processing_days && scoreData.avg_processing_days > 10)
    alerts.push({ level: 'warning', message: `Average processing time ${scoreData.avg_processing_days}d — consider sourcing alternatives` });

  return alerts;
}

// ─── NARRATIVE ───────────────────────────────────────────────────────────────

async function generateNarrative(scoreData) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt =
    `אתה מנהל Supply Chain Intelligence ב-SockAcademy — מותג גרביים פרמיום.\n` +
    `כתוב בעברית עסקית ומקצועית ברמה גבוהה סקירת שרשרת אספקה קצרה (2 משפטים) למנכ"ל. ` +
    `היה ישיר וממוקד-פעולה.\n\n` +
    `נתונים:\n${JSON.stringify(scoreData)}`;

  const msg = await withRetry(() => client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  }), 'A22');
  return msg.content[0].text.trim();
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendEmail(scoreData, alerts, narrative) {
  const hasCritical = alerts.some(a => a.level === 'critical');
  if (!process.env.GMAIL_APP_PASSWORD) return;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send A22 Supply Chain email to ${ADMIN_EMAIL}`);
    return;
  }

  if (!hasCritical && scoreData.risk_level === 'low') {
    console.log('ℹ️  Risk level LOW and no critical alerts — skipping email (non-critical day)');
    return;
  }

  const scoreColor = scoreData.health_score >= 85 ? '#4AAD80'
                   : scoreData.health_score >= 65  ? '#d97706' : '#dc2626';

  const flagsHtml = scoreData.risk_flags.slice(0, 8).map(f =>
    `<li style="margin:3px 0;color:#f0ede6">${f.flag} ${f.name ? `— ${f.name}` : ''} ${f.stock !== undefined ? `(stock: ${f.stock})` : ''} ${f.days ? `(${f.days}d)` : ''}</li>`
  ).join('');

  const alertHtml = alerts.map(a => {
    const c = a.level === 'critical' ? '#dc2626' : '#d97706';
    return `<li style="color:${c};margin:4px 0">${a.message}</li>`;
  }).join('');

  const html = `
<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A22 — Supply Chain Intelligence</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:12px">${REPORT_DATE}</p>

  ${narrative ? `<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:0 0 20px;background:#111;color:#f0ede6;font-style:italic">${narrative}</blockquote>` : ''}

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">CJ Dropshipping Health</h3>
  <table style="width:100%;margin-bottom:16px">
    <tr><td style="color:#9CA3AF;width:220px">Health score</td><td style="color:${scoreColor};font-weight:bold">${scoreData.health_score}/100</td></tr>
    <tr><td style="color:#9CA3AF">Risk level</td><td style="color:${scoreColor};text-transform:uppercase">${scoreData.risk_level}</td></tr>
    <tr><td style="color:#9CA3AF">SKUs monitored</td><td>${scoreData.active_skus}</td></tr>
    <tr><td style="color:#9CA3AF">Available SKUs</td><td style="color:#4AAD80">${scoreData.available_skus}</td></tr>
    <tr><td style="color:#9CA3AF">Avg. processing</td><td>${scoreData.avg_processing_days ? `${scoreData.avg_processing_days} days` : 'N/A'}</td></tr>
    <tr><td style="color:#9CA3AF">Risk flags</td><td style="color:${scoreData.risk_flags.length > 0 ? '#d97706' : '#4AAD80'}">${scoreData.risk_flags.length}</td></tr>
  </table>

  ${scoreData.risk_flags.length > 0 ? `
  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Risk Flags</h3>
  <ul style="padding-left:16px">${flagsHtml}</ul>` : ''}

  ${alerts.length > 0
    ? `<h3 style="color:#d97706;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Alerts</h3><ul style="padding-left:16px">${alertHtml}</ul>`
    : '<p style="color:#4AAD80;margin-top:16px">✅ Supply chain nominal</p>'}

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A22 Supply Chain Intelligence — ${REPORT_DATE}</p>
</div>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from:    '"SockAcademy Supply Chain" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject: `A22 Supply Chain — ${REPORT_DATE} | Score: ${scoreData.health_score}/100 | ${scoreData.risk_level.toUpperCase()}`,
    html,
  });
  console.log('📧 Supply chain digest sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.LAUNCH_MODE !== 'true') {
    console.log('[A22] DORMANT — set LAUNCH_MODE=true to activate. No API calls made.');
    process.exit(0);
  }

  console.log('\n🚢 A22 — Supply Chain Intelligence Agent');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const sb = getSupabase();
  console.log('✅ Supabase connected');

  let products;
  try {
    products = await getMonitoredProducts(sb);
  } catch (e) {
    await logHealth(sb, 'failure', { error: e.message });
    throw e;
  }

  console.log(`📦 Monitoring ${products.length} SKUs via CJ API`);

  if (products.length === 0) {
    const empty = { health_score: 100, active_skus: 0, available_skus: 0, avg_processing_days: null, risk_level: 'low', risk_flags: [] };
    const emptyNarr = 'No products with CJ IDs found in Supabase — supply chain monitoring standing by pending product sourcing.';
    await writeSupplyChainLog(sb, empty);
    await writeExecutiveReport(sb, empty, [], emptyNarr);
    await logHealth(sb, 'success', { skus_checked: 0 });
    console.log('ℹ️  No CJ products to monitor — logged and exiting cleanly');
    return;
  }

  const healthResults = await Promise.all(
    products.map(async p => {
      try {
        const health = await getCJProductHealth(p.cj_pid);
        return { pid: p.cj_pid, name: p.product_name, health };
      } catch (e) {
        console.warn(`⚠️  CJ query failed for ${p.cj_pid}: ${e.message}`);
        return { pid: p.cj_pid, name: p.product_name, health: null };
      }
    })
  );

  const scoreData = scoreSupplier(healthResults);
  const alerts    = buildAlerts(scoreData);
  const narrative = await generateNarrative(scoreData);

  console.log(`📊 Score: ${scoreData.health_score}/100 | Risk: ${scoreData.risk_level} | Flags: ${scoreData.risk_flags.length}`);
  if (narrative) console.log(`\n📝 ${narrative}`);
  if (alerts.length > 0) alerts.forEach(a => console.log(`   [${a.level.toUpperCase()}] ${a.message}`));
  else console.log('✅ No supply chain alerts');

  await writeSupplyChainLog(sb, scoreData);
  await writeExecutiveReport(sb, scoreData, alerts, narrative);
  await sendEmail(scoreData, alerts, narrative);

  // Command Center KPIs — feeds A0's unified daily brief
  if (!DRY_RUN) {
    await writeMetrics(sb, 'A22', REPORT_DATE, [
      { name: 'supply_chain_health_score', value: scoreData.health_score,       unit: 'count' },
      { name: 'skus_monitored',            value: scoreData.active_skus,        unit: 'count' },
      { name: 'risk_flags',                value: scoreData.risk_flags.length,  unit: 'count' },
    ]);
  }

  await logHealth(sb, 'success', { skus_checked: products.length, health_score: scoreData.health_score, risk_level: scoreData.risk_level });

  console.log('\n' + '─'.repeat(52));
  console.log('✅ A22 Supply Chain Intelligence complete');
}

main().catch(async e => {
  console.error('\n❌ A22 fatal:', e.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'failure', { error: e.message });
  } catch (_) {}
  await notifyTelegram(heTelegramMsg('A22 Supply Chain Intelligence', '🚨 כשל קריטי!',
    `ה-agent נכשל בהרצה. נדרשת בדיקה דחופה.\nשגיאה: <code>${e.message}</code>`));
  process.exit(1);
});
