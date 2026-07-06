# Fable 5 Stage 17 — Claude Code / Claude Desktop Settings Audit

> 📌 **Status:** the safe in-repo fixes from this audit (CLAUDE.md MCP/Skills table corrections, removal of the unused `magic` MCP server) were executed 05/07/2026. See `FABLE5_ACTION_TRACKER.md` for what remains. This file remains the detailed source.

**Author:** Fable 5 (Lead Strategic Architect) · **Date:** 2026-07-05 · **Mode:** read-only audit, no config changed
**Subject:** Guy's *tooling* configuration — the Claude Code / Claude Desktop setup he runs SockAcademy through. NOT the SockAcademy project itself (that was Stages 1–16).

**Legend:** ✅ VERIFIED (quoted from a local file) · ⚠️ UNVERIFIABLE (account/cloud-side — product-knowledge recommendation only, not an audit finding) · 🔴 action recommended · 🟡 optional · 🟢 leave as default.

---

## Sources actually inspected (local files)

| File | Key values found |
|---|---|
| `C:\Users\guyov\.claude\settings.json` (global) | `"model": "opusplan"`, `"effortLevel": "high"`, `"tui": "fullscreen"`, `enabledPlugins: {"superpowers@superpowers-marketplace": true}`, PreToolUse hook on `Edit\|Write` → `archive-primer-hook.js`, marketplace source `github.com/obra/superpowers-marketplace` |
| `C:\Users\guyov\.claude\settings.local.json` | **Does not exist** |
| `.claude\settings.json` (project) | ~150-entry `permissions.allow` list, `additionalDirectories`, `"fallbackModel": ["claude-haiku-4-5-20251001"]`, **PreToolUse Bash hook that blocks credential-looking commands** (regex: `password\|api[_-]?key\|secret\|token\|shpat_\|pk_\|sk-ant\|CJ[0-9]+@api` → `sys.exit(2)`) |
| `.claude\settings.local.json` (project) | Smaller allow list (npm/git/shopify/klaviyo) |
| `skills-lock.json` (repo root) | 4 Higgsfield skills pinned to `higgsfield-ai/skills` (github) with SHA-256 `computedHash` each |
| `C:\Users\guyov\.claude.json` → `mcpServers` | **Only one server installed: `magic`** (`npx -y @21st-dev/magic@latest`) **with a plaintext `API_KEY` in the file.** All project-level `mcpServers` blocks are `{}` |
| `sockacademy\CLAUDE.md` | CTO verdict tables for Skills / MCP servers / Slash commands (ACTIVE / ON-HOLD / BANNED / NOT APPLICABLE) |

**Headline contradiction (load-bearing):** `CLAUDE.md`'s MCP table marks `context7`, `agent-browser`, `supermetrics`, `notion`, `granola` as **ACTIVE** and `magic` as **NOT APPLICABLE**. The config files show the exact inverse: the five "ACTIVE" servers are **not installed anywhere I can find**, and the one server actually installed is `magic` — the one ruled out — carrying an exposed API key.

---

## SETTINGS ▸ General

**(a) What it controls:** App-wide preferences — theme, display language, startup behavior, default model, send-key, spellcheck. Mix of local UI prefs and account prefs.

**(b) Current state:** ⚠️ Mostly unverifiable — no dedicated local file. The model defaults ARE verifiable: global `settings.json` has `"model": "opusplan"` and `"tui": "fullscreen"`; project `settings.json` has `"fallbackModel": ["claude-haiku-4-5-20251001"]`.

**(c) Recommendation:** 🟢 `opusplan` (Opus for plan mode, Sonnet for execution) is the right default for a solo architect doing heavy planning — keep. The Haiku fallback is cost-smart and consistent with Zero-Burn — keep. No opinion on cosmetic prefs.

**(d) Handoff:** No change. Note: Guy's Hebrew-in-chat preference is driven by CLAUDE.md/memory, not the app language setting — no need to touch it here.

---

## SETTINGS ▸ Account

**(a) What it controls:** Identity, workspace/org membership, plan tier, login, sign-out.

**(b) Current state:** ⚠️ Unverifiable — cannot verify Guy's current state; this is account-side with no local file. Known from context only: `guyoved102@gmail.com`.

**(c) Recommendation:** 🟡 One concrete check: is this a **personal** account or an org/Team workspace? Personal is fine for a solo founder today; when SockAcademy adds a contractor or handles more customer data, a Team workspace changes retention and admin-audit options. No strong opinion until that milestone.

**(d) Handoff:** Nothing now. Revisit at first hire/contractor.

---

## SETTINGS ▸ Privacy

**(a) What it controls:** Whether conversations/code can be used for model training/improvement; data retention; feedback sharing.

**(b) Current state:** ⚠️ Unverifiable from any local file — cannot verify Guy's current state; this is a product-knowledge recommendation, not an audit finding.

**(c) Recommendation:** 🔴 **The single most important cloud-side setting for Guy to check personally.** Given his security history (Meta App Secret exposed in chat 20/06/2026, Klaviyo key redaction commit, the whole ANTI_RECURRENCE protocol), any "help improve Claude / use my data for training" toggle should be explicitly **OFF**. His sessions routinely contain store internals, competitive-intel output, and occasionally brush against secrets despite the rules.

**(d) Handoff:** Guy — open Settings ▸ Privacy, confirm training/data-sharing is disabled. One-time manual check; no agent can do this for you.

---

## SETTINGS ▸ Billing

**(a) What it controls:** Plan tier, payment method, invoices.

**(b) Current state:** ⚠️ Unverifiable — account-side.

**(c) Recommendation:** 🟢 No strong opinion without seeing the plan. Product-knowledge note: heavy background-agent dispatch + Opus planning points to Max-tier usage; if rate limits interrupt work mid-session, that's a plan-tier signal, not a config bug. Devil's advocate per Zero-Burn: do **not** upgrade "for safety" — right-size to actual limit-hits.

**(d) Handoff:** None.

---

## SETTINGS ▸ Usage

**(a) What it controls:** Read-only consumption dashboard — usage vs. plan limits, reset windows.

**(b) Current state:** ⚠️ Unverifiable — cloud-side telemetry.

**(c) Recommendation:** 🟡 For a Zero-Burn operator this is the most useful read-only screen in the app. Glance at it after heavy multi-agent days to calibrate Iron-Law-7 instinct against real numbers. Nothing to configure.

**(d) Handoff:** None (behavioral, not config).

---

## SETTINGS ▸ Capabilities

**(a) What it controls:** Toggles for built-in tool families — web search, code execution/analysis, file access, artifacts, connector gating.

**(b) Current state:** ⚠️ Unverifiable per-toggle. Indirect evidence: WebSearch/WebFetch and Artifacts tools were available in this very session, implying they're enabled.

**(c) Recommendation:** 🔴 Keep **Web Search** and **code/analysis** ON — the intelligence cluster and doc work depend on them. 🟡 Be deliberate about broad file-access / blanket connector capabilities: Guy's own rule S3 (Least Privilege) should apply to his *own tooling*, not just his agents. Enable per-need.

**(d) Handoff:** Guy — verify Web Search ON; audit any broad filesystem/connector capability and disable what isn't in active use.

---

## SETTINGS ▸ Claude Code

**(a) What it controls:** The harness itself — model, permission mode, hooks, allowlists, MCP, plugins, background tasks. The one section with rich local-file backing, so most of this is VERIFIED.

**(b) Current state:** ✅ Verified and quoted:
- Global `~/.claude/settings.json`: `"model":"opusplan"`, `"effortLevel":"high"`, `"tui":"fullscreen"`, superpowers plugin enabled, PreToolUse `archive-primer-hook.js` on Edit|Write.
- Project `.claude/settings.json`: **credential-blocking PreToolUse Bash hook** — blocks any Bash command matching `(password|api[_-]?key|secret|token|shpat_|pk_[A-Za-z0-9]|sk-ant|CJ[0-9]+@api)` with exit 2. This directly operationalizes rules S2/S4. Plus `fallbackModel` Haiku and a ~150-entry `permissions.allow` list.
- Project `.claude/settings.local.json`: additional npm/git/shopify allows.

**(c) Recommendation:**
- 🟢 The credential hook is the best single thing in the entire config. Keep it — and **promote a copy to global `~/.claude/settings.json`** so it protects every repo on the machine, not just this one.
- 🔴 **Prune the allowlist.** Many entries are one-off forensics frozen in config: specific run IDs (`gh run view 28116392788 --log-failed`), `curl` GitHub-search URLs from a skills-hunting session, transient `node -e` blobs. `Bash(gh run *)` already exists — the specific-ID entries are dead weight. The `/fewer-permission-prompts` skill exists for exactly this cleanup.
- 🟡 Two entries deserve scrutiny: `"Bash(node -e ' *)"` (arbitrary JS without a prompt) and `"Bash(git add *)"`. Both are wide for someone this security-conscious. I'd narrow or drop `node -e`.
- 🟢 `effortLevel: high` + `opusplan` + Haiku fallback = correct architect-workload economics. Keep.

**(d) Handoff:** (1) Copy credential hook into `~/.claude/settings.json`. (2) Pruning pass on the project allowlist — delete one-off/specific-ID entries, keep glob patterns. (3) Decide on `node -e` / `git add *` narrowing.

---

## SETTINGS ▸ Cowork

**(a) What it controls:** Claude's collaborative/agentic shared-workspace surface.

**(b) Current state:** ⚠️ Unverifiable, and I have **no local signal** Guy uses it at all.

**(c) Recommendation:** 🟢 **No strong opinion — stated plainly rather than padded.** His parallelism need is already served by background agents + git worktrees (verified in use). Leave as default unless a specific pain appears.

**(d) Handoff:** None.

---

## SETTINGS ▸ Claude in Chrome

**(a) What it controls:** The browser extension — lets Claude read and act on the current browser tab.

**(b) Current state:** ⚠️ Unverifiable — extension state is browser/account-side. Cannot verify whether it's installed or enabled.

**(c) Recommendation:** 🔴 **Do not enable casually.** Guy's browser holds live admin sessions: Shopify admin, Klaviyo, Meta Business Manager, GitHub, Supabase, GoDaddy. A tab-reading extension is a broad surface over all of them — and prompt-injection via a rendered page is exactly the vector his own S3 rule warns about for agents. His automation browser needs are already covered by the (doc-listed) `agent-browser` MCP, which is purpose-scoped. If he ever enables Claude-in-Chrome, it should be on a **separate clean browser profile** with no admin logins.

**(d) Handoff:** Guy — keep OFF, or isolate to a clean profile. Prefer `agent-browser` MCP for automation work.

---

## DESKTOP APP ▸ General

**(a) What it controls:** OS-level app behavior — launch at login, tray, notifications, auto-update.

**(b) Current state:** ⚠️ Unverifiable — no exposed config file found.

**(c) Recommendation:** 🟡 Auto-update ON (he already tracks CLI versions in his allowlist — he wants current features). Notifications ON is genuinely useful since background agents complete asynchronously. Rest is taste.

**(d) Handoff:** Confirm auto-update ON.

---

## DESKTOP APP ▸ Extensions

**(a) What it controls:** Desktop-app extensions / MCP-style add-ons (distinct from CLI `mcpServers`).

**(b) Current state:** ⚠️ Partially verifiable. What the files DO show: the only MCP server in `~/.claude.json` is `magic`. The five servers CLAUDE.md marks ACTIVE (`context7`, `agent-browser`, `supermetrics`, `notion`, `granola`) appear in **no local config**. Either they live in a Desktop-app extension store I cannot read, or the CLAUDE.md table has drifted from reality.

**(c) Recommendation:** 🔴 Reconcile documentation with installed reality (full argument under Connectors below). Each extension is attack surface — install only what's used.

**(d) Handoff:** Guy/Claude — check Desktop ▸ Extensions for the five "ACTIVE" servers. If absent, the CLAUDE.md verdicts assert a false state and must be corrected.

---

## DESKTOP APP ▸ Developer

**(a) What it controls:** Developer mode — MCP management UI, verbose logs, dev tools, raw config access.

**(b) Current state:** ⚠️ Unverifiable toggle; he is clearly a power user (custom hooks, plugins, MCP) so it is likely on or wanted.

**(c) Recommendation:** 🟡 Keep Developer mode ON — he needs MCP logs to debug servers. **One real caution:** verbose/MCP logs can capture payloads containing tokens, and this machine's main project folder lives under **OneDrive**. Secrets in logs written to a OneDrive-synced path would silently replicate to the cloud. He should confirm where Claude's debug logs land.

**(d) Handoff:** Guy — one-time check that Claude Code / MCP debug logs are NOT written under `C:\Users\guyov\OneDrive\...`.

---

## CUSTOMIZE ▸ Skills

**(a) What it controls:** Installed Skills the assistant can invoke.

**(b) Current state:** ✅ Verified:
- Project skills in `.claude/skills/`: `boot-sockacademy`, `close-sockacademy`, `run-sockacademy-agents`, `workflow-navigator`; plus `run-sockacademy` in `sockacademy/.claude/skills/`.
- `skills-lock.json`: 4 Higgsfield skills (`higgsfield-generate`, `-marketplace-cards`, `-product-photoshoot`, `-soul-id`) pinned to `higgsfield-ai/skills` with SHA-256 `computedHash` values.
- superpowers plugin skills via the marketplace.
- CLAUDE.md Skills verdict table: `claude-seo` ACTIVE, `hyperframes`/`ai-second-brain`/`doc-skills` ACTIVE, `frontend-design`/`notebooklm-skill` ON-HOLD, `caveman` BANNED, `humanizer` INTERNAL.

**(c) Recommendation:**
- 🟢 The hash-pinning in `skills-lock.json` is excellent supply-chain hygiene — third-party skills locked to content hashes cannot be silently tampered with upstream. Keep and extend to any future third-party skill.
- 🟡 Gap, not disagreement: several superpowers skills that directly serve Iron Law 4 (`systematic-debugging`, `verification-before-completion`, `test-driven-development`) are installed but absent from the verdict table. Bless them explicitly as ACTIVE so future agents treat them as sanctioned, not gray-zone.
- 🟢 I do not dispute any existing ACTIVE/BANNED/ON-HOLD skill verdict.

**(d) Handoff:** Add the three superpowers QA skills to the CLAUDE.md Skills table as ACTIVE. No installs needed.

---

## CUSTOMIZE ▸ Connectors

**(a) What it controls:** Account-level connectors / MCP integrations to external services (Google suite, Notion, custom MCP servers).

**(b) Current state:** ✅/⚠️ Mixed — **the biggest finding of this audit:**
- ✅ `~/.claude.json` `mcpServers` contains exactly one server: `magic` (`npx -y @21st-dev/magic@latest`) with an `API_KEY` value **in plaintext** (value redacted from this doc per Iron Law S2 — never print secrets, even partial or fragmentary).
- ⚠️ Account-side claude.ai connectors visible from this session: Gmail and Google Drive (connected), Google Calendar (needs re-authorization). Their exact scopes are unverifiable locally.
- 🔴 **Doc-vs-reality inversion:** CLAUDE.md rules `magic` NOT APPLICABLE (verdict 02/07/2026 — its builder/inspiration/refiner tools emit React JSX/TSX; SockAcademy is Shopify Liquid with zero .jsx/.tsx). Yet `magic` is the one server installed. Meanwhile the five servers marked ACTIVE are installed nowhere I can find.

**(c) Recommendation:**
- 🔴 **Remove the `magic` MCP server, and rotate its API key regardless.** It is ruled out by Guy's own CTO verdict, unusable on his stack, and its key sits in plaintext in a user-profile config file. This is a clean Least-Privilege + Zero-Burn win: delete an unused, key-bearing, doc-rejected integration. (Devil's advocate on the existing verdict: NOT APPLICABLE was the *right call* but was **under-enforced** — a verdict of "unusable" should have triggered uninstall, not coexistence with a live key. Verdict-without-cleanup is the gap.)
- 🔴 **Fix the MCP table.** The ACTIVE labels on context7/agent-browser/supermetrics/notion/granola read as intent, not installed state. Any agent reading CLAUDE.md currently believes tools exist that don't — that's a correctness bug in a document agents treat as ground truth. Either install them (if genuinely wanted now) or relabel to PLANNED/ON-HOLD with a note.
- 🟡 Google connectors: keep to least privilege. Gmail/Drive only if a live workflow uses them; Calendar is currently unauthenticated — leave it that way until a scheduling need exists.

**(d) Handoff:** (1) `claude mcp remove magic` (or Desktop UI) + rotate the 21st.dev key. (2) Correct the CLAUDE.md MCP verdict table to reflect installed reality. (3) Review Google connector scopes; don't re-auth Calendar without a use case.

---

## CUSTOMIZE ▸ Plugins

**(a) What it controls:** Plugin marketplaces + installed plugins (bundles of skills/commands/hooks/agents).

**(b) Current state:** ✅ Verified: `"enabledPlugins": {"superpowers@superpowers-marketplace": true}` with marketplace source `git: https://github.com/obra/superpowers-marketplace.git`; plugin cache shows superpowers **6.0.3** installed, shipping its own `hooks/hooks.json`.

**(c) Recommendation:**
- 🟢 superpowers is high-quality and backs his TDD/debugging/worktree workflows — keep enabled.
- 🟡 **Supply-chain caveat:** unlike his hash-pinned skills, the plugin floats with the upstream repo and executes hooks. That's the one gap in his otherwise tight supply-chain discipline. Low likelihood, non-zero impact: either pin to a reviewed version or make a periodic glance at the plugin's hooks part of an existing ops routine.

**(d) Handoff:** Decide: pin superpowers to a known-good version, or add "review plugin hooks after update" to the close-session checklist. Not urgent.

---

## Prioritized — what Guy should change first

1. 🔴 **Privacy: verify training/data-sharing is OFF** (Settings ▸ Privacy). Highest leverage, lowest effort, manual-only — directly indicated by his credential-exposure history.
2. 🔴 **Remove the `magic` MCP server and rotate its plaintext API key** in `C:\Users\guyov\.claude.json`. Unused (Liquid stack), doc-rejected (NOT APPLICABLE), key-leaking. One command + one key rotation.
3. 🔴 **Reconcile CLAUDE.md's MCP table with installed reality** — five servers claimed ACTIVE are not installed; the doc is misleading every agent that reads it. Fix the verdicts or install the tools.
4. 🔴 **Promote the credential-blocking hook to global settings and prune the ~150-entry allowlist** (kill one-off run-ID/curl entries; narrow `Bash(node -e ' *)`).
5. 🟡 **Keep Claude-in-Chrome OFF** (or isolated browser profile) and confirm MCP/debug logs are not written under the OneDrive path.

---

*Stage 17 complete. Read-only audit — no configuration was modified. Items marked ⚠️ are product-knowledge recommendations that only Guy can verify in the app UI.*
