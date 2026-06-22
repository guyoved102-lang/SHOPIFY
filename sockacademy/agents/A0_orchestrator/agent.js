/**
 * A0 — Orchestrator Agent v2.0 (SA-6 Decision Engine integrated)
 *
 * Daily:  stuck detection + HitL expiry + SA-6 decision engine
 * Weekly: Health Report email (Sundays) with cluster scores
 * Always: Workspace structure check
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { runOrchestration, CLUSTERS } = require('../../corp/core/orchestration');

const DRY_RUN = process.env.DRY_RUN === 'true';
const FORCE_WEEKLY = process.env.FORCE_WEEKLY_REPORT === 'true';
const ADMIN_EMAIL = 'guyoved102@gmail.com';

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
    if (row.agent_id) {
      const existing = ledger[row.agent_id];
      if (!existing || row.created_at > existing.lastRun) {
        ledger[row.agent_id] = {
          status:       row.run_status || '',
          lastRun:      row.created_at || '',
          errorMessage: row.error_message || '',
          retryCount:   '0',
        };
      }
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
  const run_status = status.toLowerCase() === 'failed' ? 'failure' : status.toLowerCase();
  const { error } = await supabase
    .from('agent_health_log')
    .insert({
      agent_id:      'A0',
      agent_name:    'Orchestrator',
      run_status,
      error_message: errorMessage || null,
      metadata:      {},
    });
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
    .map(({ product_name, cj_pid }) => `<tr><td style="padding:4px 8px">${product_name}</td><td style="padding:4px 8px">${cj_pid || '?'}</td></tr>`)
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

function orchestrationAlertHtml(decisions, clusterScores) {
  const ts = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const criticals = decisions.filter(d => d.severity === 'critical');
  const warnings  = decisions.filter(d => d.severity === 'warning');

  const rows = (items, color) => items.map(d =>
    `<tr>
      <td style="padding:5px 8px;font-family:monospace;font-size:12px;color:${color}">[${d.type}]</td>
      <td style="padding:5px 8px;font-size:13px">${d.agentId}</td>
      <td style="padding:5px 8px;font-size:13px">${d.message}</td>
    </tr>`
  ).join('');

  const clusterRows = Object.entries(clusterScores).map(([name, s]) => {
    const bar = s.score === 100 ? '✅' : s.score >= 50 ? '⚠️' : '🔴';
    return `<tr>
      <td style="padding:4px 8px">${bar} ${name}</td>
      <td style="padding:4px 8px;text-align:center">${s.score}%</td>
      <td style="padding:4px 8px">${s.healthy}/${s.total} healthy</td>
      <td style="padding:4px 8px;font-size:11px;color:#9ca3af">${s.failing ? `${s.failing} failing` : ''}${s.stale ? ` ${s.stale} stale` : ''}${s.noData ? ` ${s.noData} no data` : ''}</td>
    </tr>`;
  }).join('');

  return `<div style="font-family:monospace;max-width:720px">
    <h2 style="color:#c0392b">🔴 SA-6 Orchestrator — Critical Alert</h2>
    <p><strong>Time (IL):</strong> ${ts}</p>
    <p><strong>${criticals.length} critical issue(s)</strong> detected by SA-6 Decision Engine.</p>

    ${criticals.length > 0 ? `
    <h3 style="color:#c0392b">🔴 Critical</h3>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0">
      <tr style="background:#f2f2f2"><th style="padding:4px 8px">Type</th><th style="padding:4px 8px">Agent</th><th style="padding:4px 8px">Details</th></tr>
      ${rows(criticals, '#c0392b')}
    </table>` : ''}

    ${warnings.length > 0 ? `
    <h3>⚠️ Warnings</h3>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0">
      <tr style="background:#f2f2f2"><th style="padding:4px 8px">Type</th><th style="padding:4px 8px">Agent</th><th style="padding:4px 8px">Details</th></tr>
      ${rows(warnings, '#d97706')}
    </table>` : ''}

    <h3>Super-Agent Cluster Health</h3>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0">
      <tr style="background:#f2f2f2">
        <th style="padding:4px 8px;text-align:left">Cluster</th>
        <th style="padding:4px 8px;text-align:center">Score</th>
        <th style="padding:4px 8px">Status</th>
        <th style="padding:4px 8px">Issues</th>
      </tr>
      ${clusterRows}
    </table>

    <hr>
    <p style="color:#888;font-size:11px">SockAcademy SA-6 Orchestrator — Decision Engine v2.0</p>
  </div>`;
}

function clusterHealthHtml(clusterScores) {
  const rows = Object.entries(clusterScores).map(([name, s]) => {
    const bar   = s.score === 100 ? '✅' : s.score >= 50 ? '⚠️' : '🔴';
    const issues = [
      s.failing > 0 ? `${s.failing} failing` : '',
      s.stale   > 0 ? `${s.stale} stale`     : '',
      s.noData  > 0 ? `${s.noData} no data`  : '',
    ].filter(Boolean).join(', ') || '—';
    return `<tr>
      <td style="padding:4px 8px">${bar} ${name}</td>
      <td style="padding:4px 8px;text-align:center;font-weight:bold">${s.score}%</td>
      <td style="padding:4px 8px">${s.healthy}/${s.total}</td>
      <td style="padding:4px 8px;color:#6b7280;font-size:12px">${issues}</td>
    </tr>`;
  }).join('');

  return `<table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:8px 0">
    <tr style="background:#f2f2f2">
      <th style="padding:4px 8px;text-align:left">Cluster</th>
      <th style="padding:4px 8px;text-align:center">Score</th>
      <th style="padding:4px 8px">Healthy</th>
      <th style="padding:4px 8px">Issues</th>
    </tr>
    ${rows}
  </table>`;
}

function weeklyReportHtml(summary, ledger, stuckCount, clusterScores) {
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

  const clusterSection = clusterScores
    ? clusterHealthHtml(clusterScores)
    : '<p><em>SA-6 cluster data not available.</em></p>';

  return `<div style="font-family:monospace;max-width:700px">
    <h2>📊 SockAcademy Weekly Health Report</h2>
    <p><strong>${dateStr}</strong><br>Generated: ${ts}</p>
    <hr>
    <h3>🤖 SA-6 Super-Agent Cluster Health</h3>
    ${clusterSection}
    <h3>🏭 Product Pipeline (Supabase: products)</h3>
    ${pipelineSection}
    <h3>📋 agent_health_log (latest per agent)</h3>
    ${ledgerSection}
    <h3>${stuckCount > 0 ? `🚨 Stuck Rows This Run: ${stuckCount}` : '✅ Stuck Detection: Clean'}</h3>
    ${stuckCount > 0
      ? `<p>${stuckCount} row(s) were marked <code>stuck:TIMESTAMP</code> — check the stuck alert email.</p>`
      : '<p>No stuck rows detected. Pipeline is clean.</p>'}
    <hr>
    <p style="color:#888;font-size:11px">
      SockAcademy SA-6 Orchestrator v2.0 |
      <a href="https://supabase.com/dashboard/project/hpxjlzkdezyvoicqflhl">Open Supabase Dashboard</a>
    </p>
  </div>`;
}

// ─── WORKSPACE HEALTH CHECK ──────────────────────────────────────────────────
// Runs the same rules as scripts/ci/structure-lint.js but from inside A0.
// Reports violations by email so Guy is alerted even without a CI run.

const path = require('path');
const fsSync = require('fs');

function runWorkspaceHealthCheck() {
  const REPO_ROOT = path.resolve(__dirname, '../../..');
  const SA_ROOT   = path.join(REPO_ROOT, 'sockacademy');

  const violations = [];

  function kids(dir) {
    if (!fsSync.existsSync(dir)) return [];
    return fsSync.readdirSync(dir).map((n) => ({
      name: n,
      full: path.join(dir, n),
      isDir: fsSync.statSync(path.join(dir, n)).isDirectory(),
    }));
  }

  // Root entries
  const ALLOWED_ROOT = new Set(['.github', 'sockacademy', '.gitignore', '.gitattributes', 'README.md', '.editorconfig']);
  for (const { name, full } of kids(REPO_ROOT)) {
    if (name === '.git') continue;
    if (!ALLOWED_ROOT.has(name))
      violations.push({ rule: 'ROOT_CONTAMINATION', file: path.relative(REPO_ROOT, full) });
  }

  // sockacademy/ root entries
  const ALLOWED_SA = new Set(['CLAUDE.md', '.env.example', 'pipeline-config.json', 'agents', 'corp', 'docs', 'schemas', 'scripts']);
  for (const { name, full } of kids(SA_ROOT)) {
    if (!ALLOWED_SA.has(name))
      violations.push({ rule: 'SA_ROOT_CONTAMINATION', file: path.relative(REPO_ROOT, full) });
  }

  // docs/ subdirs
  for (const { name, full } of kids(path.join(SA_ROOT, 'docs'))) {
    if (!['strategy', 'ops', 'superpowers'].includes(name))
      violations.push({ rule: 'DOCS_CONTAMINATION', file: path.relative(REPO_ROOT, full) });
  }

  // scripts/ subdirs
  for (const { name, full } of kids(path.join(SA_ROOT, 'scripts'))) {
    if (!['ci', 'setup'].includes(name))
      violations.push({ rule: 'SCRIPTS_CONTAMINATION', file: path.relative(REPO_ROOT, full) });
  }

  // Agent naming convention
  for (const { name, full, isDir } of kids(path.join(SA_ROOT, 'agents'))) {
    if (isDir && !/^A\d+_[a-z0-9_]+$/.test(name))
      violations.push({ rule: 'AGENT_NAMING', file: path.relative(REPO_ROOT, full) });
  }

  return violations;
}

function workspaceAlertHtml(violations) {
  const ts = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const rows = violations.map((v) =>
    `<tr><td style="padding:4px 8px;color:#c0392b"><strong>${v.rule}</strong></td><td style="padding:4px 8px;font-family:monospace">${v.file}</td></tr>`
  ).join('');

  return `<div style="font-family:monospace;max-width:700px">
    <h2 style="color:#c0392b">🏗️ A0 — Workspace Structure Violation</h2>
    <p><strong>Time (IL):</strong> ${ts}</p>
    <p>The following files/directories violate the canonical architecture defined in CLAUDE.md.</p>
    <p><strong>Action required:</strong> move or delete the items below, then push a clean commit.</p>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0">
      <tr style="background:#f2f2f2">
        <th style="padding:4px 8px;text-align:left">Rule</th>
        <th style="padding:4px 8px;text-align:left">Violating Path</th>
      </tr>
      ${rows}
    </table>
    <p>The CI <strong>structure-lint.yml</strong> workflow also enforces these rules on every push.</p>
    <hr>
    <p style="color:#888;font-size:11px">SockAcademy A0 Orchestrator — Workspace Health Check</p>
  </div>`;
}

// ─── HITL MAINTENANCE ────────────────────────────────────────────────────────

async function expireStaleApprovals(supabase) {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('pending_approvals')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw new Error(error.message);
    const count = data?.length ?? 0;
    if (count > 0) console.log(`⏰ Expired ${count} stale HitL approval(s) older than 24h`);
    return count;
  } catch (e) {
    console.error('expireStaleApprovals failed:', e.message);
    return 0;
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 A0 Orchestrator — SA-6 v2.0');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN} | FORCE_WEEKLY=${FORCE_WEEKLY}`);
  console.log('─'.repeat(52));

  const supabase = getSupabase();
  console.log('✅ Supabase connected');
  await updateA0State(supabase, 'RUNNING');

  // Step 1 — Stuck detection + HitL expiry (every run)
  console.log('\n[1/5] Stuck Detection & HitL Expiry');
  const { stuckRows, markedCount } = await runStuckDetection(supabase);
  await expireStaleApprovals(supabase);

  if (stuckRows.length > 0) {
    await sendEmail(
      `🚨 A0 Alert: ${stuckRows.length} stuck product row(s) — action needed`,
      stuckAlertHtml(stuckRows)
    );
  }

  // Step 2 — SA-6 Decision Engine (every run)
  console.log('\n[2/5] SA-6 Decision Engine');
  let orchestrationResult = null;
  try {
    orchestrationResult = await runOrchestration(supabase);
    const { decisions, clusterScores, criticalCount } = orchestrationResult;

    if (criticalCount > 0 && !DRY_RUN) {
      await sendEmail(
        `🔴 SA-6 Alert: ${criticalCount} critical issue(s) detected`,
        orchestrationAlertHtml(decisions, clusterScores)
      );
    }
  } catch (e) {
    console.error(`⚠️  SA-6 Decision Engine failed: ${e.message}`);
  }

  // Step 3 — Weekly health report (Sundays or forced)
  const isSunday = new Date().getDay() === 0;
  if (isSunday || FORCE_WEEKLY) {
    console.log('\n[3/5] Weekly Health Report');
    const summary = await buildProductsSummary(supabase);
    const ledger  = await readHealthLog(supabase);

    await sendEmail(
      `📊 SockAcademy Weekly Health — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jerusalem' })}`,
      weeklyReportHtml(summary, ledger, stuckRows.length, orchestrationResult?.clusterScores ?? null)
    );
  } else {
    console.log('\n[3/5] Weekly Report — skipped (not Sunday)');
  }

  // Step 4 — Workspace structure health check (every run)
  console.log('\n[4/5] Workspace Health Check');
  const structureViolations = runWorkspaceHealthCheck();
  if (structureViolations.length === 0) {
    console.log('✅ Workspace structure clean — no violations');
  } else {
    console.error(`🏗️  ${structureViolations.length} structure violation(s) found:`);
    structureViolations.forEach((v) => console.error(`   [${v.rule}] ${v.file}`));
    await sendEmail(
      `🏗️ A0 Alert: ${structureViolations.length} workspace structure violation(s)`,
      workspaceAlertHtml(structureViolations)
    );
  }

  // Step 5 — Update A0's own state in health log
  console.log('\n[5/5] Updating agent_health_log');
  await updateA0State(supabase, 'COMPLETE');
  console.log('✅ A0 state written');

  const criticals = orchestrationResult?.criticalCount ?? 0;
  const warnings  = orchestrationResult?.warningCount  ?? 0;
  console.log('\n' + '─'.repeat(52));
  console.log(`✅ Done | stuck: ${markedCount} | SA-6: ${criticals}🔴 ${warnings}⚠️ | structure: ${structureViolations.length} violations`);
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
