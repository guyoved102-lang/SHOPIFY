'use strict';

/**
 * SockAcademy YAML Reality Audit — deterministic version of the manual check
 * that `/boot-sockacademy` (שלב 1.7) has always run by hand.
 *
 * Fable 5 Action Tracker item H (FABLE5_ACTION_TRACKER.md). Read-only: this
 * script writes nothing, changes nothing, and exits 0 unconditionally — it is
 * a diagnostic report, not a CI gate. Run it on demand (boot, pre-deploy, or
 * whenever cron/agent files change):
 *
 *   node sockacademy/scripts/ci/yaml-reality-audit.js
 *
 * Rule table encoded below is the exact one from
 * `.claude/skills/boot-sockacademy/SKILL.md` שלב 1.7:
 *   - Supabase drift (URL)   : package.json has @supabase/supabase-js but the
 *                              workflow YAML never references SUPABASE_URL   → CRITICAL
 *   - Supabase drift (KEY)   : same, but SUPABASE_SERVICE_KEY missing        → CRITICAL
 *   - Secret missing         : YAML references secrets.X but X isn't a real
 *                              GitHub secret (per `gh secret list`)          → CRITICAL
 *   - Google stale           : package.json lacks google-spreadsheet but the
 *                              YAML sets GOOGLE_* env vars anyway            → STALE
 *   - Model violation        : agent.js calls claude-haiku (Iron Law 6 bans
 *                              haiku for any narrative/summary generation)   → BRAND
 *
 * The agent↔workflow filename map is explicit, not inferred from the numeric
 * prefix — `a25-quality-control.yml` is agent A2.5, `a25-influencer.yml` is
 * agent A25 (a documented gotcha, see FABLE5_CRON_EFFICIENCY.md). Inferring
 * from the filename number would silently mis-map one of these.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../../..'); // Desktop/SHOPIFY
const AGENTS_DIR = path.join(REPO_ROOT, 'sockacademy', 'agents');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');

// Explicit agentId -> { dir, workflow } map (30 agents, verified against the
// live repo 06/07/2026 — update this table if an agent is added/renamed).
const AGENT_MAP = {
  A0: { dir: 'A0_orchestrator', workflow: 'a0-orchestrator.yml' },
  A1: { dir: 'A1_product_research', workflow: 'a1-product-research.yml' },
  A2: { dir: 'A2_product_upload', workflow: 'a2-product-upload.yml' },
  'A2.5': { dir: 'A2_5_quality_control', workflow: 'a25-quality-control.yml' },
  A3: { dir: 'A3_content', workflow: 'a3-content.yml' },
  A4: { dir: 'A4_meta_ads', workflow: 'a4-meta-ads.yml' },
  A5: { dir: 'A5_social', workflow: 'a5-social.yml' },
  A6: { dir: 'A6_email_sync', workflow: 'a6-email-sync.yml' },
  A7: { dir: 'A7_supplier_monitor', workflow: 'a7-supplier-monitor.yml' },
  A8: { dir: 'A8_analytics_reporter', workflow: 'a8-analytics-reporter.yml' },
  A9: { dir: 'A9_legal_compliance', workflow: 'a9-legal-compliance.yml' },
  A10: { dir: 'A10_trend_scout', workflow: 'a10-trend-scout.yml' },
  A11: { dir: 'A11_price_intelligence', workflow: 'a11-price-intelligence.yml' },
  A12: { dir: 'A12_review_collector', workflow: 'a12-review-collector.yml' },
  A13: { dir: 'A13_competitive_intel', workflow: 'a13-competitive-intel.yml' },
  A14: { dir: 'A14_coo', workflow: 'a14-coo.yml' },
  A15: { dir: 'A15_cfo', workflow: 'a15-cfo.yml' },
  A16: { dir: 'A16_cx', workflow: 'a16-cx.yml' },
  A17: { dir: 'A17_token_refresher', workflow: 'a17-token-refresher.yml' },
  A18: { dir: 'A18_fraud_cybersecurity', workflow: 'a18-fraud-cybersecurity.yml' },
  A19: { dir: 'A19_returns_intelligence', workflow: 'a19-returns-intelligence.yml' },
  A20: { dir: 'A20_inventory_intelligence', workflow: 'a20-inventory-intelligence.yml' },
  A21: { dir: 'A21_affiliate_roi', workflow: 'a21-affiliate-roi.yml' },
  A22: { dir: 'A22_supply_chain', workflow: 'a22-supply-chain.yml' },
  A23: { dir: 'A23_factory_relations', workflow: 'a23-factory-relations.yml' },
  A24: { dir: 'A24_cro', workflow: 'a24-cro.yml' },
  A25: { dir: 'A25_influencer', workflow: 'a25-influencer.yml' },
  A26: { dir: 'A26_regulatory_watch', workflow: 'a26-regulatory-watch.yml' },
  A27: { dir: 'A27_pr', workflow: 'a27-pr.yml' },
  A28: { dir: 'A28_club', workflow: 'a28-club.yml' },
};

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function readJsonIfExists(p) {
  const raw = readIfExists(p);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Step A: real GitHub secrets (degrades gracefully if `gh` unavailable) ────
function getRealSecrets() {
  try {
    const out = execSync('gh secret list --json name', { cwd: REPO_ROOT, encoding: 'utf8' });
    const parsed = JSON.parse(out);
    return { set: new Set(parsed.map((s) => s.name)), available: true };
  } catch (err) {
    return { set: new Set(), available: false, error: err.message };
  }
}

// ── Step B: per-agent cross-reference ────────────────────────────────────────
function auditAgent(agentId, { dir, workflow }, secretsInfo) {
  const issues = [];
  const pkgPath = path.join(AGENTS_DIR, dir, 'package.json');
  const agentJsPath = path.join(AGENTS_DIR, dir, 'agent.js');
  const yamlPath = path.join(WORKFLOWS_DIR, workflow);

  const pkg = readJsonIfExists(pkgPath);
  const yaml = readIfExists(yamlPath);
  const agentJs = readIfExists(agentJsPath);

  if (!pkg) {
    issues.push({ severity: 'CRITICAL', text: `package.json missing or unparseable (${path.relative(REPO_ROOT, pkgPath)})` });
  }
  if (!yaml) {
    issues.push({ severity: 'CRITICAL', text: `workflow YAML missing (${path.relative(REPO_ROOT, yamlPath)})` });
  }
  if (!pkg || !yaml) return issues; // can't cross-reference without both

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const hasSupabaseDep = 'supabase-js' in deps || '@supabase/supabase-js' in deps;
  const hasGoogleDep = 'google-spreadsheet' in deps;

  if (hasSupabaseDep) {
    if (!yaml.includes('SUPABASE_URL')) {
      issues.push({ severity: 'CRITICAL', text: 'Supabase drift: @supabase/supabase-js in package.json but SUPABASE_URL never referenced in workflow YAML' });
    }
    if (!yaml.includes('SUPABASE_SERVICE_KEY')) {
      issues.push({ severity: 'CRITICAL', text: 'Supabase drift: @supabase/supabase-js in package.json but SUPABASE_SERVICE_KEY never referenced in workflow YAML' });
    }
  }

  if (!hasGoogleDep && /GOOGLE_[A-Z_]+/.test(yaml)) {
    issues.push({ severity: 'STALE', text: 'YAML sets GOOGLE_* env var(s) but google-spreadsheet is not a package.json dependency' });
  }

  const secretRefs = [...yaml.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]);
  const uniqueSecretRefs = [...new Set(secretRefs)];
  if (secretsInfo.available) {
    for (const secretName of uniqueSecretRefs) {
      if (secretName === 'GITHUB_TOKEN') continue; // implicit, always present
      if (!secretsInfo.set.has(secretName)) {
        issues.push({ severity: 'CRITICAL', text: `workflow references secrets.${secretName}, which is not in \`gh secret list\`` });
      }
    }
  }

  if (agentJs && /claude-haiku/i.test(agentJs)) {
    issues.push({ severity: 'BRAND', text: 'agent.js calls a claude-haiku model — Iron Law 6 requires claude-sonnet-4-6 for any narrative/summary generation' });
  }

  return issues;
}

// ── Run ───────────────────────────────────────────────────────────────────────
function main() {
  const secretsInfo = getRealSecrets();
  const today = new Date().toISOString().slice(0, 10);

  console.log(`🔍 YAML REALITY AUDIT — ${today}`);
  console.log('━'.repeat(70));
  if (!secretsInfo.available) {
    console.log(`⚠️  \`gh secret list\` unavailable (${secretsInfo.error || 'unknown error'}) — secret-existence checks SKIPPED, all other checks still ran.`);
    console.log('━'.repeat(70));
  }

  let totalIssues = 0;
  const rows = [];

  for (const [agentId, mapping] of Object.entries(AGENT_MAP)) {
    const issues = auditAgent(agentId, mapping, secretsInfo);
    totalIssues += issues.length;
    if (issues.length === 0) {
      rows.push({ agentId, status: '✅', issue: '—' });
    } else {
      for (const issue of issues) {
        rows.push({ agentId, status: issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'BRAND' ? '🟡' : '🟡', issue: `[${issue.severity}] ${issue.text}` });
      }
    }
  }

  const agentColWidth = Math.max(...rows.map((r) => r.agentId.length), 'Agent'.length);
  console.log(`${'Agent'.padEnd(agentColWidth)} | Status | Issue`);
  console.log(`${'-'.repeat(agentColWidth)}-|--------|${'-'.repeat(50)}`);
  for (const row of rows) {
    console.log(`${row.agentId.padEnd(agentColWidth)} | ${row.status.padEnd(6)} | ${row.issue}`);
  }

  console.log('━'.repeat(70));
  console.log(totalIssues === 0 ? '🆕 issues found: none — clean' : `🆕 issues found: ${totalIssues}`);
  console.log('━'.repeat(70));

  // Diagnostic tool, not a CI gate — always exit 0. A future session/CI job
  // can choose to `process.exit(1)` on totalIssues > 0 if it's ever wired
  // into an actual workflow (not done here — that would be a new CI step,
  // which the Backend Feature Freeze reserves for Guy's sign-off).
  process.exit(0);
}

main();
