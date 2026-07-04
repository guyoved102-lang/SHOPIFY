'use strict';

/**
 * SockAcademy Fleet Status Report Generator (PROCESS-3, Fable 5 audit, 04/07/2026)
 *
 * Generates a live agent status table from code (LAUNCH_MODE/DRY_RUN presence,
 * via verify-fleet-status.js) plus, optionally, the latest GitHub Actions run
 * per workflow (via `gh run list`, if the gh CLI is authenticated).
 *
 * This replaces the old pattern of copy-pasting a "Cluster Health" table from
 * a previous session's boot output — that table went stale for 2+ sessions
 * before an audit caught it (see ANTI_RECURRENCE_PROTOCOL.md). Run this
 * instead of trusting a remembered table.
 *
 * Run: node scripts/ci/generate-fleet-report.js
 * (Requires `gh` CLI authenticated for the CI-status column; falls back to
 * "unknown" per row if `gh` is unavailable — never fails the whole report.)
 */

const { execSync } = require('child_process');
const { computeFleetStatus } = require('./verify-fleet-status.js');

function getWorkflowRuns() {
  try {
    const raw = execSync('gh run list --limit 60 --json name,conclusion,createdAt', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(raw);
  } catch (e) {
    return null; // gh unavailable or not authenticated — degrade gracefully
  }
}

function latestConclusionFor(runs, agentId) {
  if (!runs) return 'unknown (gh unavailable)';
  // Workflow names are like "A18 — Fraud & Cybersecurity" — match on the agent id prefix.
  const matches = runs.filter((r) => r.name && r.name.toUpperCase().startsWith(agentId.replace('_', '.') + ' ') || (r.name && r.name.toUpperCase().startsWith(agentId + ' ')));
  if (matches.length === 0) return 'no recent run';
  return matches[0].conclusion || 'in progress';
}

function main() {
  const rows = computeFleetStatus();
  const runs = getWorkflowRuns();

  console.log('| Agent | LAUNCH_MODE gate | DRY_RUN guard | Last CI run |');
  console.log('|---|---|---|---|');

  for (const row of rows.sort((a, b) => {
    const na = parseInt(a.id.replace('A', '').replace('_', '.'), 10);
    const nb = parseInt(b.id.replace('A', '').replace('_', '.'), 10);
    return na - nb;
  })) {
    const gate = row.hasLaunchMode ? '✅ gated' : '⚪ none (check exempt list)';
    const dry  = row.hasDryRun ? '✅ present' : '⚪ none (check exempt list)';
    const ci   = latestConclusionFor(runs, row.id);
    console.log(`| ${row.id} | ${gate} | ${dry} | ${ci} |`);
  }

  console.log('\nGenerated from code (scripts/ci/verify-fleet-status.js) + `gh run list` — not from memory.');
  console.log('\nCaveat: "gate"/"guard" columns check for the literal string, not a functioning gate.');
  console.log('A0 and A15 both contain "LAUNCH_MODE" (A0 monitors it, A15 writes it for other agents)');
  console.log('without being gated by it themselves — see verify-fleet-status.js EXPECTED_NO_LAUNCH_MODE');
  console.log('for the authoritative exempt list and the reason for each entry.');
}

main();
