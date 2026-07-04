'use strict';

/**
 * SockAcademy Fleet Status Verifier
 *
 * PROCESS-1 (Fable 5 audit, 04/07/2026) — the audit's single highest-leverage
 * finding: every past LAUNCH_MODE/DRY_RUN drift (A15, then A16+A24, ROOT-1)
 * was caught by a human re-reading code by hand, never by an automated gate.
 * This script is that gate. It greps the fleet for LAUNCH_MODE/DRY_RUN
 * presence and hard-fails if the result differs from the EXPECTED_* tables
 * below — so any future gating change requires an explicit, reviewed edit to
 * this file, not a silent drift between memory/docs and the actual code.
 *
 * Run: node scripts/ci/verify-fleet-status.js
 * Exits 1 (fails CI) on any mismatch.
 */

const fs   = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '../../agents');

// Agents with NO literal `process.env.LAUNCH_MODE` check in agent.js —
// i.e. they run live regardless of a LAUNCH_MODE flag. Each entry states why
// that's intentional (verified 04/07/2026 audit, Batch 1-4 + G-1 fixes).
const EXPECTED_NO_LAUNCH_MODE = {
  A1:    'pre-launch value (product research) — exempt per Iron Law 7',
  A2:    'pre-launch value (product upload, exits early on empty queue) — exempt',
  'A2_5': 'QC gate before Shopify upload — exempt, always needed',
  A3:    'pre-launch value (SEO blog building) — exempt per Iron Law 7',
  A5:    'pre-launch value (brand/social building) — exempt per Iron Law 7',
  A6:    'triggers on content push, not cron — exempt',
  A7:    'pre-launch value (supplier monitor) — exempt',
  A8:    'read-only analytics, low risk — documented exception (F12), not gated',
  A9:    'frozen legal domain, one-shot tool — NOT gated pending Guy G-2/G-3',
  A11:   'pre-launch value (price intelligence) — exempt',
  A12:   'pre-launch value (review collector) — exempt',
  A17:   'bimonthly token refresher, no strict threshold — exempt',
};

// Agents with NO literal `process.env.DRY_RUN` check in agent.js.
// A9 removed 04/07/2026 (Guy G-2) — DRY_RUN + A9_ARM hard-guard added.
const EXPECTED_NO_DRY_RUN = {
  A7: 'no DRY_RUN guard (low blast radius, documented F9) — not yet fixed',
};

function agentDirs() {
  return fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function agentIdFromDir(dirName) {
  // 'A2_5_quality_control' -> 'A2_5', 'A10_trend_scout' -> 'A10'
  const m = dirName.match(/^(A\d+(?:_\d+)?)/);
  return m ? m[1] : dirName;
}

function computeFleetStatus() {
  const rows = [];
  for (const dir of agentDirs()) {
    const agentJs = path.join(AGENTS_DIR, dir, 'agent.js');
    if (!fs.existsSync(agentJs)) continue;
    const src = fs.readFileSync(agentJs, 'utf8');
    rows.push({
      id: agentIdFromDir(dir),
      dir,
      hasLaunchMode: src.includes('LAUNCH_MODE'),
      hasDryRun: src.includes('DRY_RUN'),
    });
  }
  return rows;
}

function verify() {
  const rows = computeFleetStatus();
  const mismatches = [];

  for (const row of rows) {
    const expectedNoLaunch = Object.prototype.hasOwnProperty.call(EXPECTED_NO_LAUNCH_MODE, row.id);
    const expectedNoDryRun = Object.prototype.hasOwnProperty.call(EXPECTED_NO_DRY_RUN, row.id);

    if (expectedNoLaunch && row.hasLaunchMode) {
      mismatches.push(`${row.id}: expected NO LAUNCH_MODE (${EXPECTED_NO_LAUNCH_MODE[row.id]}) but agent.js now contains it — update EXPECTED_NO_LAUNCH_MODE or investigate why the gate was added/removed.`);
    }
    if (!expectedNoLaunch && !row.hasLaunchMode) {
      mismatches.push(`${row.id}: has NO LAUNCH_MODE check and is not in EXPECTED_NO_LAUNCH_MODE — either add the gate, or add it to the exempt table with a reason.`);
    }
    if (expectedNoDryRun && row.hasDryRun) {
      mismatches.push(`${row.id}: expected NO DRY_RUN (${EXPECTED_NO_DRY_RUN[row.id]}) but agent.js now contains it — update EXPECTED_NO_DRY_RUN.`);
    }
    if (!expectedNoDryRun && !row.hasDryRun) {
      mismatches.push(`${row.id}: has NO DRY_RUN guard and is not in EXPECTED_NO_DRY_RUN — either add the guard, or add it to the exempt table with a reason.`);
    }
  }

  return { rows, mismatches };
}

module.exports = { computeFleetStatus, verify, EXPECTED_NO_LAUNCH_MODE, EXPECTED_NO_DRY_RUN };

// ── CLI Report — only runs when invoked directly ─────────────────────────────
if (require.main === module) {
  const { rows, mismatches } = verify();

  console.log(`Scanned ${rows.length} agents.\n`);

  if (mismatches.length === 0) {
    console.log('✅ Fleet LAUNCH_MODE/DRY_RUN status matches the documented baseline — no drift.');
    process.exit(0);
  }

  console.error('\n❌ FLEET STATUS DRIFT DETECTED — code no longer matches the documented baseline\n');
  for (const m of mismatches) {
    console.error(`  - ${m}`);
  }
  console.error(`\n${mismatches.length} mismatch(es). This is the exact failure mode that caused the A15/A16/A24`);
  console.error('incidents (documentation asserted a gate that the code did not enforce). Fix the code');
  console.error('or update scripts/ci/verify-fleet-status.js\'s EXPECTED_* tables with a reason — do not');
  console.error('silently ignore this.');
  process.exit(1);
}
