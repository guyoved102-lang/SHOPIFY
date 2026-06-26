/**
 * A14 — COO Agent (Chief Operating Officer)
 *
 * Runs daily at 21:00 UTC — after all operational agents have completed.
 * Reads: agent_health_log (last 24h), products (pipeline state), product_qc_log (last 7d)
 * Writes: executive_reports (agent_id='A14', report_type='daily')
 * Sends: daily ops digest email to Guy
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');
const { withRetry } = require('../../corp/core/anthropic-retry.js');

const DRY_RUN     = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL = 'guyoved102@gmail.com';
const REPORT_DATE = new Date().toISOString().split('T')[0];

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── DATA COLLECTION ─────────────────────────────────────────────────────────

async function getAgentHealthSummary(sb) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from('agent_health_log')
    .select('agent_id, agent_name, run_status, error_message, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`agent_health_log query failed: ${error.message}`);

  const runs = data || [];
  const latestByAgent = {};
  for (const run of runs) {
    if (!latestByAgent[run.agent_id]) latestByAgent[run.agent_id] = run;
  }

  const latest = Object.values(latestByAgent);
  return {
    total_runs:  runs.length,
    agents_seen: latest.length,
    healthy:     latest.filter(r => r.run_status === 'success').length,
    failed:      latest.filter(r => r.run_status === 'failure').length,
    warning:     latest.filter(r => r.run_status === 'warning').length,
    failures:    latest
      .filter(r => r.run_status === 'failure')
      .map(r => ({ agent: r.agent_id, name: r.agent_name, error: r.error_message })),
  };
}

async function getPipelineMetrics(sb) {
  const [pendingQc, qcApproved, uploading, uploaded7d, totalUploaded] = await Promise.all([
    sb.from('products').select('*', { count: 'exact', head: true })
      .eq('status', 'Approved').eq('upload_status', ''),
    sb.from('products').select('*', { count: 'exact', head: true })
      .eq('upload_status', 'qc_approved'),
    sb.from('products').select('*', { count: 'exact', head: true })
      .eq('upload_status', 'uploading'),
    sb.from('products').select('*', { count: 'exact', head: true })
      .like('upload_status', 'uploaded:%')
      .gte('upload_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
    sb.from('products').select('*', { count: 'exact', head: true })
      .like('upload_status', 'uploaded:%'),
  ]);

  return {
    pending_qc:     pendingQc.count     || 0,
    qc_approved:    qcApproved.count    || 0,
    uploading:      uploading.count     || 0,
    uploaded_7d:    uploaded7d.count    || 0,
    total_uploaded: totalUploaded.count || 0,
  };
}

async function getQCMetrics(sb) {
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data, error } = await sb
    .from('product_qc_log')
    .select('qc_result, rejection_reason')
    .gte('created_at', since7d);
  if (error) throw new Error(`product_qc_log query failed: ${error.message}`);

  const logs     = data || [];
  const approved = logs.filter(r => r.qc_result === 'approved').length;
  const rejected = logs.filter(r => r.qc_result === 'rejected').length;
  const total    = logs.length;

  const reasonCounts = {};
  for (const r of logs.filter(l => l.rejection_reason)) {
    const key = r.rejection_reason.split(';')[0].trim().slice(0, 60);
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  }

  return {
    qc_runs_7d:      total,
    qc_approved_7d:  approved,
    qc_rejected_7d:  rejected,
    qc_pass_rate_7d: total > 0 ? Math.round((approved / total) * 100) : null,
    top_rejection_reasons: Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count })),
  };
}

// ─── ALERTS ──────────────────────────────────────────────────────────────────

function buildAlerts(health, pipeline, qc) {
  const alerts = [];

  for (const f of health.failures)
    alerts.push({ level: 'critical', message: `Agent ${f.agent} (${f.name}) failed — ${f.error || 'no details'}` });

  if (health.warning > 0)
    alerts.push({ level: 'warning', message: `${health.warning} agent(s) ran with warnings` });

  if (pipeline.uploading > 0)
    alerts.push({ level: 'warning', message: `${pipeline.uploading} product(s) stuck in 'uploading' — possible A2 crash mid-run` });

  if (pipeline.qc_approved > 5)
    alerts.push({ level: 'info', message: `${pipeline.qc_approved} products queued for A2 upload` });

  if (qc.qc_pass_rate_7d !== null && qc.qc_pass_rate_7d < 50)
    alerts.push({ level: 'warning', message: `QC pass rate 7d: ${qc.qc_pass_rate_7d}% — review A1 sourcing quality` });

  if (health.agents_seen === 0)
    alerts.push({ level: 'critical', message: 'No agents ran in last 24h — GitHub Actions may be down' });

  return alerts;
}

// ─── NARRATIVE ───────────────────────────────────────────────────────────────

async function generateNarrative(health, pipeline, qc, alerts) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const ctx = JSON.stringify({ health, pipeline, qc, alerts }, null, 2);
  const msg = await withRetry(() => client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [{
      role:    'user',
      content: `You are the COO of SockAcademy, a premium sock e-commerce brand. Write a 3-sentence daily operations briefing for the CEO based on this data. Be direct, factual, and flag only what needs attention. No greetings, no sign-off.\n\n${ctx}`,
    }],
  }), 'A14');
  return msg.content[0].text.trim();
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

async function writeReport(sb, kpis, alerts, narrative) {
  if (DRY_RUN) {
    console.log('\n[DRY_RUN] Would upsert to executive_reports:');
    console.log(JSON.stringify({ agent_id: 'A14', report_date: REPORT_DATE, kpis, alerts, narrative }, null, 2));
    return;
  }
  const { error } = await sb.from('executive_reports').upsert({
    agent_id:    'A14',
    report_date: REPORT_DATE,
    report_type: 'daily',
    kpis,
    alerts,
    narrative,
  }, { onConflict: 'agent_id,report_date,report_type' });
  if (error) throw new Error(`executive_reports upsert failed: ${error.message}`);
}

async function logHealth(sb, status, meta = {}) {
  if (DRY_RUN) return;
  const { error } = await sb.from('agent_health_log').insert({
    agent_id:        'A14',
    agent_name:      'COO — Operations',
    run_status:      status,
    items_processed: meta.agents_seen || 0,
    metadata:        meta,
  });
  if (error) console.error(`⚠️ Health log failed: ${error.message}`);
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendDigestEmail(health, pipeline, qc, alerts, narrative) {
  if (!process.env.GMAIL_APP_PASSWORD) return;
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send COO digest email to ${ADMIN_EMAIL}`);
    return;
  }

  const alertRows = alerts.map(a => {
    const color = a.level === 'critical' ? '#dc2626' : a.level === 'warning' ? '#d97706' : '#2563eb';
    return `<li style="color:${color};margin:4px 0">${a.message}</li>`;
  }).join('');

  const failureBlock = health.failures.length === 0
    ? '<p style="color:#4AAD80;margin:4px 0">All agents healthy ✅</p>'
    : health.failures.map(f =>
        `<p style="color:#dc2626;margin:4px 0">❌ <strong>${f.agent}</strong> — ${f.error || 'no details'}</p>`
      ).join('');

  const qcPassStr  = qc.qc_pass_rate_7d !== null ? `${qc.qc_pass_rate_7d}%` : 'N/A';
  const qcColor    = qc.qc_pass_rate_7d === null ? '#9CA3AF'
                   : qc.qc_pass_rate_7d >= 80    ? '#4AAD80' : '#dc2626';

  const html = `
<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A14 COO — Daily Operations Report</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:12px">${REPORT_DATE}</p>

  ${narrative ? `<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:0 0 20px;background:#111;color:#f0ede6;font-style:italic">${narrative}</blockquote>` : ''}

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">Agent Fleet — Last 24h</h3>
  <table style="width:100%;margin-bottom:8px">
    <tr><td style="color:#9CA3AF;width:180px">Total runs</td><td>${health.total_runs}</td></tr>
    <tr><td style="color:#9CA3AF">Healthy</td><td style="color:#4AAD80">${health.healthy}</td></tr>
    <tr><td style="color:#9CA3AF">Failed</td><td style="color:${health.failed > 0 ? '#dc2626' : '#4AAD80'}">${health.failed}</td></tr>
    <tr><td style="color:#9CA3AF">Warnings</td><td style="color:${health.warning > 0 ? '#d97706' : '#4AAD80'}">${health.warning}</td></tr>
  </table>
  ${failureBlock}

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Product Pipeline</h3>
  <table style="width:100%">
    <tr><td style="color:#9CA3AF;width:220px">Pending QC</td><td>${pipeline.pending_qc}</td></tr>
    <tr><td style="color:#9CA3AF">QC Approved (A2 queue)</td><td style="color:#4AAD80">${pipeline.qc_approved}</td></tr>
    <tr><td style="color:#9CA3AF">Stuck 'uploading'</td><td style="color:${pipeline.uploading > 0 ? '#dc2626' : '#4AAD80'}">${pipeline.uploading}</td></tr>
    <tr><td style="color:#9CA3AF">Uploaded last 7 days</td><td>${pipeline.uploaded_7d}</td></tr>
    <tr><td style="color:#9CA3AF">Total live on Shopify</td><td style="color:#4AAD80">${pipeline.total_uploaded}</td></tr>
  </table>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">QC Gate — Last 7 Days</h3>
  <table style="width:100%">
    <tr><td style="color:#9CA3AF;width:220px">Total QC runs</td><td>${qc.qc_runs_7d}</td></tr>
    <tr><td style="color:#9CA3AF">Pass rate</td><td style="color:${qcColor}">${qcPassStr}</td></tr>
    <tr><td style="color:#9CA3AF">Approved</td><td style="color:#4AAD80">${qc.qc_approved_7d}</td></tr>
    <tr><td style="color:#9CA3AF">Rejected</td><td style="color:${qc.qc_rejected_7d > 0 ? '#dc2626' : '#4AAD80'}">${qc.qc_rejected_7d}</td></tr>
  </table>
  ${qc.top_rejection_reasons.length > 0
    ? `<p style="margin-top:8px;font-size:12px;color:#9CA3AF">Top rejection reasons: ${qc.top_rejection_reasons.map(r => `${r.reason} (×${r.count})`).join(' | ')}</p>`
    : ''}

  ${alerts.length > 0
    ? `<h3 style="color:#d97706;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Alerts (${alerts.length})</h3><ul style="padding-left:16px">${alertRows}</ul>`
    : '<p style="color:#4AAD80;margin-top:20px">✅ No alerts — operations nominal</p>'}

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A14 COO Agent — ${REPORT_DATE}</p>
</div>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from:    '"SockAcademy COO" <sockacademy.store@gmail.com>',
    to:      ADMIN_EMAIL,
    subject: `A14 COO — ${REPORT_DATE} | ${health.failed > 0 ? `🔴 ${health.failed} failure(s)` : '✅ Nominal'}`,
    html,
  });
  console.log('📧 COO digest sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📊 A14 — COO Operations Agent');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const sb = getSupabase();
  console.log('✅ Supabase connected');

  let health, pipeline, qc;
  try {
    [health, pipeline, qc] = await Promise.all([
      getAgentHealthSummary(sb),
      getPipelineMetrics(sb),
      getQCMetrics(sb),
    ]);
  } catch (e) {
    await logHealth(sb, 'failure', { error: e.message });
    throw e;
  }

  console.log(`\n🤖 Fleet (24h): ${health.healthy} healthy | ${health.failed} failed | ${health.warning} warnings`);
  console.log(`📦 Pipeline: ${pipeline.pending_qc} pending QC | ${pipeline.qc_approved} qc_approved | ${pipeline.uploaded_7d} uploaded (7d)`);
  console.log(`🔍 QC (7d): ${qc.qc_approved_7d} approved | ${qc.qc_rejected_7d} rejected | ${qc.qc_pass_rate_7d ?? 'N/A'}% pass rate`);

  const alerts    = buildAlerts(health, pipeline, qc);
  const kpis      = { health, pipeline, qc };
  const narrative = await generateNarrative(health, pipeline, qc, alerts);

  if (narrative) console.log(`\n📝 ${narrative}`);
  if (alerts.length > 0) {
    console.log(`\n⚠️  ${alerts.length} alert(s):`);
    alerts.forEach(a => console.log(`   [${a.level.toUpperCase()}] ${a.message}`));
  } else {
    console.log('\n✅ No alerts');
  }

  await writeReport(sb, kpis, alerts, narrative);
  await sendDigestEmail(health, pipeline, qc, alerts, narrative);
  await logHealth(sb, 'success', { agents_seen: health.agents_seen, alerts: alerts.length });

  console.log('\n' + '─'.repeat(52));
  console.log('✅ A14 COO complete');
}

main().catch(async e => {
  console.error('\n❌ A14 fatal:', e.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'failure', { error: e.message });
  } catch (_) {}
  process.exit(1);
});
