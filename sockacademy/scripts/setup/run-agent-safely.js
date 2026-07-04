'use strict';

/**
 * Safe-by-default agent runner (PROCESS-2, Fable 5 audit, 04/07/2026 — ROOT-2)
 *
 * The 03/07/2026 live-fire incident happened because a manual smoke test
 * forgot `DRY_RUN=true` and hit live Klaviyo/email/HITL endpoints. This
 * wrapper makes that mistake structurally hard to repeat: DRY_RUN defaults
 * to true unconditionally, and agents with no DRY_RUN support at all
 * (A7, A9) refuse to run live without a second, explicit confirmation flag.
 *
 * Usage:
 *   node scripts/setup/run-agent-safely.js A1                 # DRY_RUN=true (default, safe)
 *   node scripts/setup/run-agent-safely.js A1 --live           # DRY_RUN=false, real writes
 *   node scripts/setup/run-agent-safely.js A9 --live           # BLOCKED — no DRY_RUN support
 *   node scripts/setup/run-agent-safely.js A9 --live --i-understand-this-writes-live-data
 *                                                               # allowed, with a loud warning
 */

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', '..', 'agents');

// Agents with zero DRY_RUN support in code — a --live run on these is
// unconditionally live from the first line. Keep in sync with
// scripts/ci/verify-fleet-status.js's EXPECTED_NO_DRY_RUN table.
const NO_DRY_RUN_SUPPORT = {
  A7: 'no DRY_RUN guard at all — a "live" run writes real Supabase/email data immediately',
  A9: 'FROZEN legal domain, one-shot tool, no DRY_RUN by design — a "live" run can open a real HITL approval request (see the 03/07/2026 incident)',
};

function resolveAgentDir(agentId) {
  const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });
  const match = entries.find((e) => e.isDirectory() && e.name.startsWith(agentId + '_'));
  return match ? path.join(AGENTS_DIR, match.name) : null;
}

function main() {
  const args = process.argv.slice(2);
  const agentId = args[0];
  const live = args.includes('--live');
  const confirmed = args.includes('--i-understand-this-writes-live-data');

  if (!agentId) {
    console.error('Usage: node scripts/setup/run-agent-safely.js <AgentId> [--live] [--i-understand-this-writes-live-data]');
    console.error('Example: node scripts/setup/run-agent-safely.js A1');
    process.exit(1);
  }

  const agentDir = resolveAgentDir(agentId);
  if (!agentDir) {
    console.error(`No agent directory found starting with "${agentId}_" under agents/`);
    process.exit(1);
  }

  if (live && Object.prototype.hasOwnProperty.call(NO_DRY_RUN_SUPPORT, agentId) && !confirmed) {
    console.error(`\n🛑 BLOCKED: ${agentId} has no DRY_RUN support — ${NO_DRY_RUN_SUPPORT[agentId]}`);
    console.error(`A --live run on ${agentId} is not a "mostly safe, some real writes" run — it is fully live from the start.`);
    console.error(`If you are certain this is intended, re-run with:`);
    console.error(`  node scripts/setup/run-agent-safely.js ${agentId} --live --i-understand-this-writes-live-data\n`);
    process.exit(1);
  }

  const dryRun = live ? 'false' : 'true';

  if (live) {
    console.log(`⚠️  LIVE RUN — ${agentId} — DRY_RUN=false. Real writes will occur.`);
  } else {
    console.log(`✅ Safe run (default) — ${agentId} — DRY_RUN=true. No live writes.`);
  }

  const result = spawnSync('node', ['agent.js'], {
    cwd: agentDir,
    stdio: 'inherit',
    env: Object.assign({}, process.env, { DRY_RUN: dryRun }),
  });

  process.exit(result.status === null ? 1 : result.status);
}

main();
