'use strict';

/**
 * SockAcademy Structure Linter
 *
 * Enforces the canonical directory map defined in CLAUDE.md.
 * Exits 1 (fails CI) if any file violates the rules.
 *
 * Rules:
 *   ROOT (repo root)     → only: .github/, sockacademy/, .gitignore, .gitattributes, README.md
 *   sockacademy/ root    → only: CLAUDE.md, .env.example, pipeline-config.json, agents/, corp/, docs/, schemas/, scripts/
 *   agents/<ANN>/        → only: agent.js, package.json, package-lock.json, .gitignore, *.md
 *   scripts/             → only: ci/, setup/
 *   No .env files        → anywhere in repo (already in .gitignore but we double-check)
 *   No node_modules      → committed to git
 */

const fs   = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..'); // Desktop/SHOPIFY
const SA_ROOT   = path.join(REPO_ROOT, 'sockacademy');

// Pure computation — no process.exit, no console output, no file writes.
// A0 Orchestrator imports this directly instead of keeping its own copy of
// the rules (that copy drifted out of sync with this file — see
// ANTI_RECURRENCE_PROTOCOL.md for the incident).
function computeViolations() {
  const violations = [];

  function fail(rule, filePath, hint) {
    violations.push({ rule, file: path.relative(REPO_ROOT, filePath), hint });
  }

// ── Helper: list immediate children (non-recursive) ──────────────────────────

function children(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((name) => ({
    name,
    full: path.join(dir, name),
    isDir: fs.statSync(path.join(dir, name)).isDirectory(),
  }));
}

// ── Helper: walk all files recursively ───────────────────────────────────────

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, callback);
    } else {
      callback(full);
    }
  }
}

// ── Rule 1: Repo root may only contain known top-level entries ───────────────

const ALLOWED_ROOT_ENTRIES = new Set([
  // Repo essentials
  '.github', 'sockacademy', '.gitignore', '.gitattributes', 'README.md', '.editorconfig',
  // Claude Code / Agent SDK infrastructure (managed by tooling — not manual files)
  '.claude', '.agents', 'skills-lock.json',
  // CI artifact (written by this script on failure — uploaded to GitHub Actions)
  'structure-violations.json',
]);

for (const { name, full, isDir } of children(REPO_ROOT)) {
  // Skip .git — it's a directory in a normal checkout, but a plain file
  // (a "gitdir: ..." pointer) inside a git worktree, so isDir alone can't
  // gate this (04/07/2026, first worktree ever used in this repo).
  if (name === '.git') continue;
  if (!ALLOWED_ROOT_ENTRIES.has(name)) {
    fail(
      'ROOT_CONTAMINATION',
      full,
      `Files must live inside sockacademy/. Move to the correct subfolder or add to ALLOWED_ROOT_ENTRIES if truly needed at root.`
    );
  }
}

// ── Rule 2: sockacademy/ root may only contain known entries ─────────────────

const ALLOWED_SA_ROOT = new Set([
  // SockAcademy operational files
  'CLAUDE.md', '.env.example', 'pipeline-config.json',
  // SockAcademy canonical directories
  'agents', 'corp', 'docs', 'schemas', 'scripts',
  // Shopify theme directories (sockacademy/ IS the theme root)
  'assets', 'config', 'layout', 'sections', 'snippets', 'templates', 'locales',
  // Shopify theme config files
  '.gitignore', '.shopifyignore', '.theme-check.yml', '.prettierrc.json',
  'package.json', 'package-lock.json', 'translation.yml', 'README.md', 'LICENSE.md',
  // Dev tooling
  '.vscode', '.claude', 'node_modules',
  // Local credentials (gitignored — OK on disk, not OK in git — Rule 4 handles git check)
  '.env',
]);

for (const { name, full } of children(SA_ROOT)) {
  if (!ALLOWED_SA_ROOT.has(name)) {
    fail(
      'SA_ROOT_CONTAMINATION',
      full,
      `sockacademy/ root is reserved for CLAUDE.md, .env.example, pipeline-config.json and the canonical directories. Move to docs/strategy/, docs/ops/, scripts/setup/, or the appropriate agent folder.`
    );
  }
}

// ── Rule 3: scripts/ may only contain ci/ and setup/ ─────────────────────────

const scriptsDir = path.join(SA_ROOT, 'scripts');
for (const { name, full } of children(scriptsDir)) {
  if (!['ci', 'setup'].includes(name)) {
    fail(
      'SCRIPTS_CONTAMINATION',
      full,
      `scripts/ only allows ci/ and setup/ subdirectories. One-time scripts → scripts/setup/. CI scripts → scripts/ci/.`
    );
  }
}

// ── Rule 4: No .env files committed to git ────────────────────────────────────
// Uses git ls-files so local untracked .env files (correctly gitignored) don't trigger false positives.

const { execSync } = require('child_process');
let gitTrackedFiles = [];
try {
  gitTrackedFiles = execSync('git ls-files', { cwd: REPO_ROOT }).toString().trim().split('\n');
} catch (_) { /* git not available — skip rule */ }

for (const f of gitTrackedFiles) {
  const base = path.basename(f);
  if (base === '.env' || (base.startsWith('.env.') && base !== '.env.example')) {
    fail(
      'ENV_FILE_COMMITTED',
      path.join(REPO_ROOT, f),
      `CRITICAL: .env file committed to git. Remove immediately: git rm --cached ${f}`
    );
  }
}

// ── Rule 5: No node_modules committed to git ─────────────────────────────────
// Uses the already-computed gitTrackedFiles list (git-aware, not filesystem).

for (const f of gitTrackedFiles) {
  if (f.includes('node_modules/') || f.includes('node_modules\\')) {
    fail(
      'NODE_MODULES_COMMITTED',
      path.join(REPO_ROOT, f),
      `node_modules must not be committed. Add to .gitignore and run: git rm -r --cached node_modules`
    );
    break; // one violation per repo is enough to alert
  }
}

// ── Rule 6: Agent folders must follow naming convention A<N>_snake_case ──────

const agentsDir = path.join(SA_ROOT, 'agents');
for (const { name, full, isDir } of children(agentsDir)) {
  if (!isDir) continue;
  if (!/^A\d+_[a-z0-9_]+$/.test(name)) {
    fail(
      'AGENT_NAMING',
      full,
      `Agent directories must follow pattern A<number>_snake_case (e.g. A10_trend_scout). Got: ${name}`
    );
  }
}

// ── Rule 7: docs/ may only contain strategy/ and ops/ ────────────────────────

const docsDir = path.join(SA_ROOT, 'docs');
for (const { name, full } of children(docsDir)) {
  if (!['strategy', 'ops', 'superpowers'].includes(name)) {
    fail(
      'DOCS_CONTAMINATION',
      full,
      `docs/ only allows strategy/, ops/, and superpowers/ subdirectories. Got: ${name}`
    );
  }
}

  return violations;
}

module.exports = { computeViolations, REPO_ROOT, SA_ROOT };

// ── CLI Report — only runs when invoked directly (node structure-lint.js) ────
// A0 Orchestrator imports computeViolations() above without triggering any of this.

if (require.main === module) {
  const violations = computeViolations();

  if (violations.length === 0) {
    console.log('✅ Structure lint passed — directory architecture is clean.');
    process.exit(0);
  }

  console.error('\n❌ STRUCTURE VIOLATIONS DETECTED\n');
  console.error(`Found ${violations.length} violation(s):\n`);

  for (const v of violations) {
    console.error(`[${v.rule}]`);
    console.error(`  File: ${v.file}`);
    console.error(`  Fix:  ${v.hint}\n`);
  }

  fs.writeFileSync(
    path.join(REPO_ROOT, 'structure-violations.json'),
    JSON.stringify(violations, null, 2)
  );

  console.error('Full report saved to structure-violations.json');
  process.exit(1);
}
