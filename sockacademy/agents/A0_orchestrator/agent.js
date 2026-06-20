/**
 * A0 — Orchestrator Agent v1.0 (Phase B MVP)
 * Observation only — no triggers, no pipeline automation yet.
 *
 * Daily:  stuck detection on A1_Products → alert email if found
 * Weekly: Health Report email to Guy (runs every Sunday)
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const DRY_RUN = process.env.DRY_RUN === 'true';
const FORCE_WEEKLY = process.env.FORCE_WEEKLY_REPORT === 'true';
const ADMIN_EMAIL = 'sockacademy.store@gmail.com';

// ─── SUPABASE ────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ─── STUCK DETECTION ─────────────────────────────────────────────────────────
// A0 runs at 09:00 UTC — 1 hour after A2 starts (07:00) and 40 min past A2's
// 20-min timeout. Any row still in 'uploading' at this point is definitively stuck.

async function runStuckDetection(supabase) {
  const { data: rows, error } = await supabase
    .from('products')
    .select('id, product_name, cj_pid, upload_status')
    .eq('upload_status', 'uploading');

  if (error) throw new Error(`Supabase stuck query failed: ${error.message}`);

  const stuckRows = rows || [];
  if (stuckRows.length === 0) {
    console.log('✅ Stuck detection: no stuck rows');
    return { stuckRows: [], markedCount: 0 };
  }

  console.log(`🚨 Found ${stuckRows.length} stuck row(s)`);
  const now = Math.floor(Date.now() / 1000);
  let markedCount = 0;

  for (const row of stuckRows) {
    console.log(`   → Stuck: "${row.product_name}" (PID: ${row.cj_pid || '?'})`);
    if (DRY_RUN) {
      console.log(`     [DRY_RUN] Would write stuck:${now}`);
    } else {
      const { error: updateErr } = await supabase
        .from('products')
        .update({ upload_status: `stuck:${now}` })
        .eq('id', row.id);
      if (updateErr) console.error(`     ⚠️ Failed to mark stuck: ${updateErr.message}`);
      else markedCount++;
    }
  }

  return { stuckRows, markedCount };
}

// ─── HEALTH LOG ───────────────────────────────────────────────────────────────

async function readHealthLog(supabase) {
  const { data: rows, error } = await supabase
    .from('agent_health_log')
    .select('*');

  if (error) {
    console.log(`⚠️  Could not read agent_health_log: ${error.message}`);
    return null;
  }

  const ledger = {};
  for (const row of rows || []) {
    if (row.agent) {
      ledger[row.agent] = {
        status:       row.status || '',
        lastRun:      row.last_run || '',
        outputKey:    row.output_key || '',
        errorMessage: row.error_message || '',
        retryCount:   String(row.retry_count || '0'),
      };
    }
  }
  return ledger;
}

async function updateA0State(supabase, status, errorMessage = '') {
  const now = new Date().toISOString();
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would log A0 state: ${status}`);
    return;
  }
  const { error } = await supabase
    .from('agent_health_log')
    .upsert(
      { agent: 'A0', status, last_run: now, error_message: errorMessage, updated_at: now },
      { onConflict: 'agent' }
    );
  if (error) console.error(`⚠️  State log failed: ${error.message}`);
  else console.log(`📋 A0 state → ${status}`);
}

// ─── PRODUCTS SUMMARY ─────────────────────────────────────────────────────────

async function buildProductsSummary(supabase) {
  const { data: rows, error } = await supabase
    .from('products')
    .select('status, upload_status');

  if (error) throw new Error(`Products summary failed: ${error.message}`);

  const s = { total: 0, approved: 0, uploaded: 0, errors: 0, stuck: 0, pending: 0 };
  for (const row of rows || []) {
    const status = (row.status || '').trim();
    const uploadStatus = (row.upload_status || '').trim();
    s.total++;
    if (status === 'Approved') s.approved++;
    if (uploadStatus.startsWith('uploaded:')) s.uploaded++;
    else if (uploadStatus.startsWith('error:') || uploadStatus.startsWith('Error:')) s.errors++;
    else if (uploadStatus.startsWith('stuck:')) s.stuck++;
    else if (uploadStatus === '') s.pending++;
  }
  return s;
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendEmail(subject, html) {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  GMAIL_APP_PASSWORD not set — skipping email');
    return;
  }
  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would send: "${subject}"`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'sockacademy.store@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: '"SockAcademy A0" <sockacademy.store@gmail.com>',
    to: ADMIN_EMAIL,
    subject,
    html,
  });
  console.log(`📧 Sent: "${subject}"`);
}

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

function stuckAlertHtml(stuckRows) {
  const ts = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const rowsHtml = stuckRows
    .map(({ name, pid }) => `<tr><td style="padding:4px 8px">${name}</td><td style="padding:4px 8px">${pid}</td></tr>`)
    .join('');

  return `<div style="font-family:monospace;max-width:620px">
    <h2 style="color:#c0392b">🚨 A0 Stuck Detection Alert</h2>
    <p><strong>Time (IL):</strong> ${ts}</p>
    <p><strong>${stuckRows.length} row(s)</strong> had <code>Upload Status = "uploading"</code> past A2's 20-min timeout.</p>
    <p>These rows have been marked <code>stuck:UNIX_TIMESTAMP</code> in Google Sheets.</p>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0">
      <tr style="background:#f2f2f2">
        <th style="padding:4px 8px;text-align:left">Product Name</th>
        <th style="padding:4px 8px;text-align:left">PID</th>
      </tr>
      ${rowsHtml}
    </table>
    <p><strong>Recovery:</strong> Open Supabase Dashboard → products table → clear <code>upload_status</code> to <code>""</code> for retry,
    or set to <code>error:manual-skip</code> to permanently skip.</p>
    <hr>
    <p style="color:#888;font-size:11px">SockAcademy A0 Orchestrator — Phase B MVP</p>
  </div>`;
}

function weeklyReportHtml(summary, ledger, stuckCount) {
  const ts = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jerusalem' });

  const pipelineSection = summary
    ? `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0">
        <tr style="background:#f2f2f2">
          <th style="padding:4px 8px;text-align:left">Metric</th>
          <th style="padding:4px 8px;text-align:left">Count</th>
        </tr>
        <tr><td style="padding:4px 8px">Total products in Supabase</td><td style="padding:4px 8px">${summary.total}</td></tr>
        <tr><td style="padding:4px 8px">Approved (by Guy)</td><td style="padding:4px 8px">${summary.approved}</td></tr>
        <tr><td style="padding:4px 8px">✅ Uploaded to Shopify</td><td style="padding:4px 8px">${summary.uploaded}</td></tr>
        <tr><td style="padding:4px 8px">❌ Upload errors</td><td style="padding:4px 8px">${summary.errors}</td></tr>
        <tr><td style="padding:4px 8px">🚨 Stuck (needs action)</td><td style="padding:4px 8px">${summary.stuck}</td></tr>
        <tr><td style="padding:4px 8px">⏳ Pending (awaiting approval)</td><td style="padding:4px 8px">${summary.pending}</td></tr>
      </table>`
    : '<p><em>Products table not accessible.</em></p>';

  const ledgerSection = ledger && Object.keys(ledger).length > 0
    ? `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0">
        <tr style="background:#f2f2f2">
          <th style="padding:4px 8px;text-align:left">Agent</th>
          <th style="padding:4px 8px;text-align:left">Status</th>
          <th style="padding:4px 8px;text-align:left">Last Run (IL)</th>
          <th style="padding:4px 8px;text-align:left">Error</th>
        </tr>
        ${Object.entries(ledger).map(([agent, d]) =>
          `<tr>
            <td style="padding:4px 8px">${agent}</td>
            <td style="padding:4px 8px">${d.status || '—'}</td>
            <td style="padding:4px 8px">${d.lastRun ? new Date(d.lastRun).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }) : '—'}</td>
            <td style="padding:4px 8px">${d.errorMessage || '—'}</td>
          </tr>`
        ).join('')}
      </table>`
    : '<p><em>agent_health_log is empty — agents will write here as they run.</em></p>';

  return `<div style="font-family:monospace;max-width:700px">
    <h2>📊 SockAcademy Weekly Health Report</h2>
    <p><strong>${dateStr}</strong><br>Generated: ${ts}</p>
    <hr>
    <h3>🏭 Product Pipeline (Supabase: products)</h3>
    ${pipelineSection}
    <h3>📋 agent_health_log</h3>
    ${ledgerSection}
    <h3>${stuckCount > 0 ? `🚨 Stuck Rows This Run: ${stuckCount}` : '✅ Stuck Detection: Clean'}</h3>
    ${stuckCount > 0
      ? `<p>${stuckCount} row(s) were marked <code>stuck:TIMESTAMP</code> — check the stuck alert email or A1_Products tab.</p>`
      : '<p>No stuck rows detected. Pipeline is clean.</p>'}
    <hr>
    <p style="color:#888;font-size:11px">
      SockAcademy A0 Orchestrator — Phase B MVP |
      <a href="https://supabase.com/dashboard/project/hpxjlzkdezyvoicqflhl">Open Supabase Dashboard</a>
    </p>
  </div>`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 A0 Orchestrator — Phase B MVP');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN} | FORCE_WEEKLY=${FORCE_WEEKLY}`);
  console.log('─'.repeat(52));

  const supabase = getSupabase();
  console.log('✅ Supabase connected');
  await updateA0State(supabase, 'RUNNING');

  // Step 1 — Stuck detection (every run)
  console.log('\n[1/3] Stuck Detection');
  const { stuckRows, markedCount } = await runStuckDetection(supabase);

  if (stuckRows.length > 0) {
    await sendEmail(
      `🚨 A0 Alert: ${stuckRows.length} stuck product row(s) — action needed`,
      stuckAlertHtml(stuckRows)
    );
  }

  // Step 2 — Weekly health report (Sundays or forced)
  const isSunday = new Date().getDay() === 0;
  if (isSunday || FORCE_WEEKLY) {
    console.log('\n[2/3] Weekly Health Report');
    const summary = await buildProductsSummary(supabase);
    const ledger  = await readHealthLog(supabase);

    await sendEmail(
      `📊 SockAcademy Weekly Health — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jerusalem' })}`,
      weeklyReportHtml(summary, ledger, stuckRows.length)
    );
  } else {
    console.log('\n[2/3] Weekly Report — skipped (not Sunday)');
  }

  // Step 3 — Update A0's own state in health log
  console.log('\n[3/3] Updating agent_health_log');
  await updateA0State(supabase, 'COMPLETE');
  console.log('✅ A0 state written');

  console.log('\n' + '─'.repeat(52));
  console.log(`✅ Done | stuck marked: ${markedCount} | DRY_RUN=${DRY_RUN}`);
}

main().catch(async err => {
  console.error('\n❌ A0 fatal:', err.message);
  try {
    const sb = getSupabase();
    await updateA0State(sb, 'ERROR', err.message);
    await sendEmail(
      '🚨 A0 Orchestrator FAILED — action needed',
      `<div style="font-family:monospace"><h2>🚨 A0 Fatal Error</h2><p><strong>Time:</strong> ${new Date().toISOString()}</p><pre style="background:#f5f5f5;padding:12px">${err.message}</pre></div>`
    );
  } catch (_) {}
  process.exit(1);
});
