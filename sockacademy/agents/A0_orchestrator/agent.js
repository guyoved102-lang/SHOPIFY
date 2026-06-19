/**
 * A0 — Orchestrator Agent v1.0 (Phase B MVP)
 * Observation only — no triggers, no pipeline automation yet.
 *
 * Daily:  stuck detection on A1_Products → alert email if found
 * Weekly: Health Report email to Guy (runs every Sunday)
 */

require('dotenv').config({ path: '../../.env' });
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const nodemailer = require('nodemailer');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const DRY_RUN = process.env.DRY_RUN === 'true';
const FORCE_WEEKLY = process.env.FORCE_WEEKLY_REPORT === 'true';
const ADMIN_EMAIL = 'sockacademy.store@gmail.com';

const PRODUCTS_TAB = 'A1_Products';
const STATE_TAB = 'A0_STATE_LEDGER';

// ─── GOOGLE SHEETS ───────────────────────────────────────────────────────────

async function loadDoc() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID not set');

  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
  await doc.loadInfo();
  return doc;
}

// ─── STUCK DETECTION ─────────────────────────────────────────────────────────
// A0 runs at 09:00 UTC — 1 hour after A2 starts (07:00) and 40 min past A2's
// 20-min timeout. Any row still in 'uploading' at this point is definitively stuck.

async function runStuckDetection(doc) {
  const sheet = doc.sheetsByTitle[PRODUCTS_TAB];
  if (!sheet) {
    console.log(`⚠️  Tab "${PRODUCTS_TAB}" not found — skipping stuck detection`);
    return { stuckRows: [], markedCount: 0 };
  }

  const rows = await sheet.getRows();
  const stuckRows = [];
  const now = Math.floor(Date.now() / 1000);

  for (const row of rows) {
    const uploadStatus = (row.get('Upload Status') || '').trim();
    if (uploadStatus === 'uploading') {
      stuckRows.push({
        name: row.get('Product Name') || 'Unknown',
        pid: row.get('PID') || '?',
        row,
      });
    }
  }

  if (stuckRows.length === 0) {
    console.log('✅ Stuck detection: no stuck rows');
    return { stuckRows: [], markedCount: 0 };
  }

  console.log(`🚨 Found ${stuckRows.length} stuck row(s)`);
  let markedCount = 0;

  for (const { name, pid, row } of stuckRows) {
    console.log(`   → Stuck: "${name}" (PID: ${pid})`);
    if (DRY_RUN) {
      console.log(`     [DRY_RUN] Would write stuck:${now}`);
    } else {
      row.set('Upload Status', `stuck:${now}`);
      await row.save();
      markedCount++;
    }
  }

  return { stuckRows, markedCount };
}

// ─── STATE LEDGER ─────────────────────────────────────────────────────────────

async function readStateLedger(doc) {
  const sheet = doc.sheetsByTitle[STATE_TAB];
  if (!sheet) {
    console.log(`⚠️  Tab "${STATE_TAB}" not found`);
    console.log('   → Create manually in Google Sheets with columns:');
    console.log('     Agent | Status | LastRun | OutputKey | ErrorMessage | RetryCount | LockedBy');
    return null;
  }

  const rows = await sheet.getRows();
  const ledger = {};
  for (const row of rows) {
    const agent = row.get('Agent');
    if (agent) {
      ledger[agent] = {
        status: row.get('Status') || '',
        lastRun: row.get('LastRun') || '',
        outputKey: row.get('OutputKey') || '',
        errorMessage: row.get('ErrorMessage') || '',
        retryCount: row.get('RetryCount') || '0',
      };
    }
  }
  return { sheet, rows, ledger };
}

async function updateA0State(doc, status, errorMessage = '') {
  const result = await readStateLedger(doc);
  if (!result) return;

  const { sheet, rows, ledger } = result;
  const now = new Date().toISOString();

  if (ledger['A0']) {
    const a0Row = rows.find(r => r.get('Agent') === 'A0');
    if (a0Row) {
      a0Row.set('Status', status);
      a0Row.set('LastRun', now);
      a0Row.set('ErrorMessage', errorMessage);
      if (!DRY_RUN) await a0Row.save();
      else console.log(`[DRY_RUN] Would update A0 row: ${status}`);
    }
  } else {
    if (!DRY_RUN) {
      await sheet.addRow({
        Agent: 'A0',
        Status: status,
        LastRun: now,
        OutputKey: '',
        ErrorMessage: errorMessage,
        RetryCount: '0',
        LockedBy: '',
      });
    } else {
      console.log(`[DRY_RUN] Would add A0 row: ${status}`);
    }
  }
}

// ─── PRODUCTS SUMMARY ─────────────────────────────────────────────────────────

async function buildProductsSummary(doc) {
  const sheet = doc.sheetsByTitle[PRODUCTS_TAB];
  if (!sheet) return null;

  const rows = await sheet.getRows();
  const s = { total: 0, approved: 0, uploaded: 0, errors: 0, stuck: 0, pending: 0 };

  for (const row of rows) {
    const status = (row.get('Status') || '').trim();
    const uploadStatus = (row.get('Upload Status') || '').trim();
    s.total++;
    if (status === 'Approved') s.approved++;
    if (uploadStatus.startsWith('uploaded:')) s.uploaded++;
    else if (uploadStatus.startsWith('error:')) s.errors++;
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
    <p><strong>Recovery:</strong> Open Google Sheets → A1_Products → clear <code>Upload Status</code> to <code>""</code> for retry,
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
        <tr><td style="padding:4px 8px">Total rows in A1_Products</td><td style="padding:4px 8px">${summary.total}</td></tr>
        <tr><td style="padding:4px 8px">Approved (by Guy)</td><td style="padding:4px 8px">${summary.approved}</td></tr>
        <tr><td style="padding:4px 8px">✅ Uploaded to Shopify</td><td style="padding:4px 8px">${summary.uploaded}</td></tr>
        <tr><td style="padding:4px 8px">❌ Upload errors</td><td style="padding:4px 8px">${summary.errors}</td></tr>
        <tr><td style="padding:4px 8px">🚨 Stuck (needs action)</td><td style="padding:4px 8px">${summary.stuck}</td></tr>
        <tr><td style="padding:4px 8px">⏳ Pending (awaiting approval)</td><td style="padding:4px 8px">${summary.pending}</td></tr>
      </table>`
    : '<p><em>A1_Products tab not accessible.</em></p>';

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
    : '<p><em>State ledger is empty — agents will write here in Phase C.</em></p>';

  return `<div style="font-family:monospace;max-width:700px">
    <h2>📊 SockAcademy Weekly Health Report</h2>
    <p><strong>${dateStr}</strong><br>Generated: ${ts}</p>
    <hr>
    <h3>🏭 Product Pipeline (A1_Products)</h3>
    ${pipelineSection}
    <h3>📋 A0_STATE_LEDGER</h3>
    ${ledgerSection}
    <h3>${stuckCount > 0 ? `🚨 Stuck Rows This Run: ${stuckCount}` : '✅ Stuck Detection: Clean'}</h3>
    ${stuckCount > 0
      ? `<p>${stuckCount} row(s) were marked <code>stuck:TIMESTAMP</code> — check the stuck alert email or A1_Products tab.</p>`
      : '<p>No stuck rows detected. Pipeline is clean.</p>'}
    <hr>
    <p style="color:#888;font-size:11px">
      SockAcademy A0 Orchestrator — Phase B MVP |
      <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}">Open Google Sheets</a>
    </p>
  </div>`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 A0 Orchestrator — Phase B MVP');
  console.log(`   ${new Date().toISOString()} | DRY_RUN=${DRY_RUN} | FORCE_WEEKLY=${FORCE_WEEKLY}`);
  console.log('─'.repeat(52));

  const doc = await loadDoc();
  console.log(`✅ Sheets connected: "${doc.title}"`);

  // Step 1 — Stuck detection (every run)
  console.log('\n[1/3] Stuck Detection');
  const { stuckRows, markedCount } = await runStuckDetection(doc);

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
    const summary = await buildProductsSummary(doc);
    const ledgerResult = await readStateLedger(doc);

    await sendEmail(
      `📊 SockAcademy Weekly Health — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jerusalem' })}`,
      weeklyReportHtml(summary, ledgerResult?.ledger || null, stuckRows.length)
    );
  } else {
    console.log('\n[2/3] Weekly Report — skipped (not Sunday)');
  }

  // Step 3 — Update A0's own state in ledger
  console.log('\n[3/3] Updating A0_STATE_LEDGER');
  await updateA0State(doc, 'COMPLETE');
  console.log('✅ A0 state written');

  console.log('\n' + '─'.repeat(52));
  console.log(`✅ Done | stuck marked: ${markedCount} | DRY_RUN=${DRY_RUN}`);
}

main().catch(err => {
  console.error('\n❌ A0 fatal:', err.message);
  process.exit(1);
});
