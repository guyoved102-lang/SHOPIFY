/**
 * A14 — COO (Chief Operating Officer) Agent
 *
 * Runs every Monday 10:00 UTC.
 * Queries Supabase for agent fleet health and pipeline metrics.
 * Generates a Weekly Operations Report and emails it to Guy.
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const DRY_RUN = process.env.DRY_RUN === 'true';
const ADMIN_EMAIL = 'guyoved102@gmail.com';

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function logHealth(supabase, status, meta = {}) {
  if (DRY_RUN) return;
  try {
    await supabase.from('agent_health_log').insert({
      agent_id:   'A14',
      agent_name: 'COO Operations Report',
      run_status: status,
      metadata:   meta,
    });
  } catch (e) { console.error('Health log failed:', e.message); }
}

// ─── SUPABASE QUERIES ─────────────────────────────────────────────────────────

async function getAgentHealthSummary(supabase) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('agent_health_log')
    .select('agent_id, agent_name, run_status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`agent_health_log query failed: ${error.message}`);

  const byAgent = {};
  for (const row of (data || [])) {
    if (!byAgent[row.agent_id]) {
      byAgent[row.agent_id] = {
        name:    row.agent_name,
        success: 0,
        failure: 0,
        lastRun: row.created_at,
      };
    }
    if (row.run_status === 'success') byAgent[row.agent_id].success++;
    else byAgent[row.agent_id].failure++;
  }
  return byAgent;
}

async function getProductPipelineStats(supabase) {
  const { data, error } = await supabase.from('products').select('upload_status');
  if (error) throw new Error(`products query failed: ${error.message}`);

  const stats = { pending: 0, qc_approved: 0, qc_rejected: 0, uploaded: 0, total: 0 };
  for (const p of (data || [])) {
    stats.total++;
    const us = p.upload_status || '';
    if (us === '')                    stats.pending++;
    else if (us === 'qc_approved')    stats.qc_approved++;
    else if (us.startsWith('qc_rejected')) stats.qc_rejected++;
    else if (us.startsWith('uploaded'))    stats.uploaded++;
  }
  return stats;
}

async function getQcSummary(supabase) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('product_qc_log')
    .select('qc_result')
    .gte('created_at', since);
  if (error) return { approved: 0, rejected: 0, passRate: null };

  const approved = (data || []).filter(r => r.qc_result === 'approved').length;
  const rejected = (data || []).filter(r => r.qc_result === 'rejected').length;
  const total = approved + rejected;
  return {
    approved,
    rejected,
    passRate: total > 0 ? Math.round((approved / total) * 100) : null,
  };
}

async function getLaunchMode(supabase) {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'LAUNCH_MODE')
    .single();
  return data?.value === 'true';
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

function buildReportHtml(agents, pipeline, qc, launchMode, weekLabel) {
  const agentRows = Object.entries(agents).map(([id, a]) => {
    const total = a.success + a.failure;
    const rate  = total > 0 ? Math.round((a.success / total) * 100) : 100;
    const rateColor = a.failure > 2 ? '#c0392b' : a.failure > 0 ? '#d97706' : '#4AAD80';
    const lastRun = new Date(a.lastRun).toLocaleDateString('he-IL', {
      weekday: 'short', day: '2-digit', month: '2-digit',
    });
    return `<tr>
      <td style="padding:4px 8px;font-weight:bold">${id}</td>
      <td style="padding:4px 8px">${a.name}</td>
      <td style="padding:4px 8px;color:#4AAD80">${a.success}</td>
      <td style="padding:4px 8px;color:${a.failure > 0 ? '#c0392b' : '#888'}">${a.failure}</td>
      <td style="padding:4px 8px;color:${rateColor}">${rate}%</td>
      <td style="padding:4px 8px;color:#888">${lastRun}</td>
    </tr>`;
  }).join('');

  const noAgentData = Object.keys(agents).length === 0;
  const qcPassStr   = qc.passRate !== null ? `${qc.passRate}%` : 'N/A';
  const qcColor     = qc.passRate === null ? '#888' : qc.passRate >= 80 ? '#4AAD80' : '#c0392b';

  return `<div style="font-family:monospace;max-width:700px;background:#0a0a0a;color:#f0ede6;padding:20px;border-radius:4px">
  <h2 style="color:#C9A84C;margin:0 0 4px">A14 COO — Weekly Operations Report</h2>
  <p style="color:#9CA3AF;margin:0 0 20px;font-size:12px">${weekLabel}</p>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px">System Status</h3>
  <table style="width:100%;margin-bottom:8px">
    <tr>
      <td style="color:#9CA3AF;width:160px">LAUNCH_MODE</td>
      <td style="color:${launchMode ? '#4AAD80' : '#c0392b'}">${launchMode ? 'ACTIVE' : 'INACTIVE'}</td>
    </tr>
  </table>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Agent Fleet — Last 7 Days</h3>
  ${noAgentData
    ? '<p style="color:#888">No runs recorded this week.</p>'
    : `<table style="width:100%;border-collapse:collapse">
        <tr style="background:#1a1a1a">
          <th style="padding:4px 8px;text-align:left;color:#C9A84C">ID</th>
          <th style="padding:4px 8px;text-align:left;color:#C9A84C">Agent</th>
          <th style="padding:4px 8px;text-align:left;color:#4AAD80">Pass</th>
          <th style="padding:4px 8px;text-align:left;color:#c0392b">Fail</th>
          <th style="padding:4px 8px;text-align:left;color:#C9A84C">Rate</th>
          <th style="padding:4px 8px;text-align:left;color:#9CA3AF">Last Run</th>
        </tr>
        ${agentRows}
      </table>`}

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">Product Pipeline</h3>
  <table style="width:100%;margin-bottom:8px">
    <tr><td style="color:#9CA3AF;width:200px">Total products</td><td>${pipeline.total}</td></tr>
    <tr><td style="color:#9CA3AF">Pending QC</td><td>${pipeline.pending}</td></tr>
    <tr><td style="color:#9CA3AF">QC Approved (A2 queue)</td><td style="color:#4AAD80">${pipeline.qc_approved}</td></tr>
    <tr><td style="color:#9CA3AF">QC Rejected</td><td style="color:${pipeline.qc_rejected > 0 ? '#c0392b' : '#888'}">${pipeline.qc_rejected}</td></tr>
    <tr><td style="color:#9CA3AF">Uploaded to Shopify</td><td style="color:#4AAD80">${pipeline.uploaded}</td></tr>
  </table>

  <h3 style="color:#C9A84C;border-bottom:1px solid #333;padding-bottom:4px;margin-top:20px">QC Performance — Last 7 Days</h3>
  <table style="width:100%;margin-bottom:8px">
    <tr><td style="color:#9CA3AF;width:200px">Approved</td><td style="color:#4AAD80">${qc.approved}</td></tr>
    <tr><td style="color:#9CA3AF">Rejected</td><td style="color:${qc.rejected > 0 ? '#c0392b' : '#888'}">${qc.rejected}</td></tr>
    <tr><td style="color:#9CA3AF">Pass Rate</td><td style="color:${qcColor}">${qcPassStr}</td></tr>
  </table>

  <hr style="border-color:#333;margin:20px 0">
  <p style="color:#555;font-size:11px">SockAcademy A14 COO Agent — Weekly Operations Report</p>
</div>`;
}

async function sendReport(html, weekLabel) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('   [no GMAIL_APP_PASSWORD] skipping email');
    return;
  }
  if (DRY_RUN) {
    console.log('   [DRY_RUN] Would send COO report email');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: '"SockAcademy COO" <sockacademy.store@gmail.com>',
    to:   ADMIN_EMAIL,
    subject: `A14 COO Weekly Report — ${weekLabel}`,
    html,
  });
  console.log('   Email sent');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nA14 COO — Weekly Operations Report');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);
  console.log('─'.repeat(52));

  const supabase = getSupabase();
  console.log('Supabase connected');

  const weekLabel = new Date().toLocaleDateString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });

  console.log('\nFetching operational data...');
  const [agents, pipeline, qc, launchMode] = await Promise.all([
    getAgentHealthSummary(supabase),
    getProductPipelineStats(supabase),
    getQcSummary(supabase),
    getLaunchMode(supabase),
  ]);

  console.log(`   Agent fleet: ${Object.keys(agents).length} agents tracked`);
  console.log(`   Pipeline: ${pipeline.total} products (${pipeline.qc_approved} ready, ${pipeline.uploaded} uploaded)`);
  console.log(`   QC: ${qc.approved} approved, ${qc.rejected} rejected`);
  console.log(`   LAUNCH_MODE: ${launchMode}`);

  const html = buildReportHtml(agents, pipeline, qc, launchMode, weekLabel);
  await sendReport(html, weekLabel);
  await logHealth(supabase, 'success', { agents: Object.keys(agents).length, pipeline });

  console.log('\n' + '─'.repeat(52));
  console.log('Done');
}

main().catch(async err => {
  console.error('\nA14 fatal:', err.message);
  try {
    const sb = getSupabase();
    await logHealth(sb, 'failure', { error: err.message });
  } catch (_) {}
  process.exit(1);
});
