# FABLE5 PROJECT MAP — SockAcademy

> 📌 **Consolidated 06/07/2026:** this doc's findings feed into `FABLE5_LAUNCH_READINESS_PLAN.md` (current execution order) and are tracked live in `FABLE5_ACTION_TRACKER.md`. This file remains the detailed source — read it for depth, not for current status.

**Purpose:** compact context primer for future zero-memory model dispatches. Read this before re-deriving anything. Written 04/07/2026 (Fable 5, read-only pass over: CLAUDE.md, VISION.md, PHASE_ARCHITECTURE_SKELETON.md, ANTI_RECURRENCE_PROTOCOL.md, memory/project_sockacademy_state.md, plans/clever-skipping-hamster.md, directory listings only of agents/ + corp/core/).

**What this is:** SockAcademy = premium sock e-commerce (Shopify + Node.js), solo founder Guy (CEO, Hebrew-speaking, technically fluent non-engineer). Monorepo of **30 independent agents** (A0–A28 + A2.5), each with its own package.json + GitHub Actions cron workflow, sharing `corp/core/` utilities. Zero sales yet — deliberate: "build the entire machine before selling one product."

---

## Architecture at a glance — Super-Agent clusters

Canonical cluster map lives in `corp/core/orchestration/index.js` (`CLUSTERS` + `STALENESS_HOURS`); A0 monitors it daily. CLAUDE.md's "6 Super-Agents" section is the original 20/06 decision — the fleet has since grown to **10 clusters**:

- **SA-1 Intelligence** — A1 (product research/CJ), A10 (trends), A11 (pricing), A13 (competitive intel)
- **SA-2 Content** — A2 (product upload), A2.5 (quality gate), A3 (SEO blog), A5 (Instagram)
- **SA-3 Revenue** — A4 (Meta Ads), A6 (Klaviyo email)
- **SA-4 Operations** — A7 (supplier monitor), A9 (legal compliance — FROZEN domain), A12 (reviews)
- **SA-5 Analytics** — A8 (analytics reporter)
- **SA-6 Orchestrator** — A0 (daily health check, readiness scoring, phase-milestone monitor)
- **SA-7 C-Suite** — A14 (COO), A15 (CFO — live, legitimately ungated), A16 (CX)
- **SA-8 Supply Chain** — A17 (Meta token refresher), A19 (returns), A20 (inventory), A22 (supply chain), A23 (factory relations)
- **SA-9 Risk & Security** — A18 (fraud), A21 (affiliate ROI) *(added to CLUSTERS 04/07/2026)*
- **SA-10 Revenue Growth** — A24 (CRO), A25 (influencer), A26 (regulatory), A27 (PR), A28 (subscription club) *(added 04/07/2026)*

Key shared infra in `corp/core/`: `telegram.js` (Hebrew alerts), `metrics.js`/`command-center.js` (KPIs), `hitl.js` (human-in-the-loop approvals via Supabase `pending_approvals`), `self-heal.js` (fatal-error → GitHub Issue/HITL ticket, wired into all 30), `qa-gate.js` (Claude-judged content QA for A3/A5), `anthropic-retry.js`, `pricing.js` (RETAIL_CEILING), `rag-query.js`/`rag-ingest.js` (Module 4, dormant), `observability.js`, `queue.js`, plus per-table `.sql` files. Guardrail scripts: `scripts/ci/structure-lint.js`, `scripts/ci/verify-fleet-status.js` (code-vs-docs drift gate, runs in CI + A0), `scripts/setup/run-agent-safely.js` (DRY_RUN=true default; the only sanctioned way to run agents manually).

## Current phase & constraints

- **Phase (SA-Cluster numbering — `PHASE_ARCHITECTURE_SKELETON.md` is THE authoritative source): Phase 1, LIVE.** Dropship-first curated catalog; Private Label = Phase 4 (Year 2 target per VISION.md).
- **Next trigger — Phase 2 (C-Suite):** 25 orders OR $1,000 MRR, **plus** A0 Readiness Score ≥95 for 48h, plus automated DRY_RUN suite, plus **Guy's explicit manual approval** (`system_config['PHASE_2_ACTIVATE_BY_GUY']`). Unlocks A14 COO, A15 CFO, A8 Analytics, A16 CX, A20 Inventory. Later gates: Phase 3A/3B $5K MRR ×2mo; Phase 4 $15K ×2mo (Private Label, A29–A32); Phase 5 $40K ×2mo; Phase 6 $80K ×3mo or manual. **No phase ever auto-activates.**
- **Iron Laws (terse; full prose in CLAUDE.md):** (1) Strategic Patience — zero launch/sales until full infra is built+tested. (2) Brand — $250+ tier, Loro Piana/Sunspel/Falke register, zero emoji in marketing, no discount/urgency/childish copy. (3) Tech — zero placeholders/TODOs, zero hardcoded credentials (env+GitHub Secrets only), DRY via corp/core, Shopify API `2025-01` / Klaviyo `2024-10-15` locked, Node 24 in all workflows. (4) Mentor Mode / continuous QA. (5) Proactive Elevation. (6) Telegram alerts in Hebrew via `heTelegramMsg()` — canonical format, mandatory. (7) LAUNCH_MODE dormancy gate — dormant agents make ZERO API calls; flipping `LAUNCH_MODE` to `'true'` requires Guy's explicit in-session approval, no exceptions. Plus chat-security laws S1–S4 (no full-file code dumps, no secrets in chat, least-privilege, git secret-sweep before every push) and category blocks (no kids/pet/novelty socks; price floors $18/$28/$35/$65).
- **Operational rules future dispatches must obey:** every manual agent run = `DRY_RUN=true` (ANTI_RECURRENCE #35 — a forgotten flag once fired a real legal-page HITL request); never run A9 without explicit intent (triple-guarded: DRY_RUN + `A9_ARM` + workflow dry_run default true); `docs/` allows only `strategy/`, `ops/`, `superpowers/` subdirs; new strategy docs claiming "Locked" require a Supersession Check (#31); Next Session Primer updates are merge-not-replace (#36, enforced by a PreToolUse hook archiving to `memory/PRIMER_HISTORY.log`); dependency fixes must touch every agent's own package.json, not the root (#39); new npm requires in corp/core need an "Install corp/core dependencies" step in every consuming workflow (#37). `ANTI_RECURRENCE_PROTOCOL.md` holds **40 numbered protocols** — check it before "fixing" anything that smells familiar.

## Open architectural tensions (real, unresolved, as of 04/07/2026)

1. **Attorney review of A9 legal templates — the single true pre-live blocker** (open since ~27/06; memory Primer + audit both agree it's the only one). MG-2 article publish is held behind it (Regulatory Hold). Source: `project_sockacademy_state.md` Primer, `clever-skipping-hamster.md`.
2. **Phase-numbering collision is contained, not eliminated:** ≥3 independent "Phase N" systems coexist (SA-Cluster = canonical; Brand Architecture/VIA UI phases; Private Label Sub-Phase A–E; BRAND_STRATEGY gender "stages"). ANTI_RECURRENCE #31 documents the incident; Batch 5 fixed known contradictions (incl. renaming the trap file `SOCKACADEMY_VISION.md` to a superseded snapshot), but any doc saying "Phase" must be disambiguated before acting on it. Sources: #31, Batch 5 notes.
3. **CLAUDE.md itself carries stale internal layers:** "6 Super-Agents" (now 10 clusters), an old "11 agents" roster, "Phase 2 after 10 sales" (canonical: 25 orders/$1K), and a 19/06 "Immediate Action Required" secrets list largely resolved elsewhere. VISION.md's Agent Fleet Status table is dated 18/06 and stale. Code + `verify-fleet-status.js` + memory outrank these tables. Do not "fix" without Guy — flagged, not resolved here.
4. **A15/A16/A24 gating asymmetry (decided, but know it):** A15 CFO intentionally runs live ungated (exempt — it writes LAUNCH_MODE state); A16/A24 got real gates only 04/07 (G-1) after being "documented dormant, actually live" — the audit's #1 root cause ("docs assert, code doesn't enforce"). `verify-fleet-status.js` is the structural fix; treat any doc/code status mismatch it reports as real.
5. **A4 Meta Ads workflow is `disabled_manually` in GitHub** — pre-existing, deliberately not re-enabled; Guy's call. **A5 Instagram publishing fails 100% of runs** (Meta permissions / IG_USER_ID issue — Guy-only fix in Meta Business Suite; workflow still shows "success" because the error is caught internally). Source: memory blockers #11, #14.
6. **QA gate holds 100% of A3/A5 content** (Module 2, real runs): rubric is strict enforcement of already-approved brand rules, but currently nothing passes without human edit. Guy must choose: accept / strengthen writer prompts / watch `qa_passed` KPIs. Source: memory 04/07 שיחה 2.
7. **PHASE_ARCHITECTURE_SKELETON internal defects** (Readiness 95 vs 85 mismatch; A29–A31 "missing agents" table contradicts its own Phase 4 skeleton) — flagged LOW-14 in the audit, unfixed.
8. Minor open Guy items (non-blocking): A17 KPI wiring, GMAIL_APP_PASSWORD provenance, Gmail MCP connector, GDRIVE_BACKUP_FOLDER_ID (Drive API off), logo decision, flagship variants S/M+L/XL, dropship-platform manual inventory check before activating the A1 `search*()` scaffolds.

## Audit plan status — `~/.claude/plans/clever-skipping-hamster.md`

The plan is a one-time end-to-end Fable 5 audit: Part A is a master synthesis of ~77 de-duplicated findings (3 CRITICAL, ~12 HIGH, ~24 MEDIUM, ~30 LOW, 8 PROCESS), 3 systemic root causes (docs-assert-code-doesn't-enforce; no safe-by-default execution; newest agents shipped without the safety net), organized into 7 shippable batches plus 9 Guy decisions (G-1..G-9); Part B appends the 5 full domain reports (history/memory, strategy docs, fleet code, infra/CI, frontend/design) as evidence. **Status correction: despite framings that say "Batch 1 done, Batches 2–7 pending," the memory state file (more recent, 04/07/2026) records the plan as FULLY EXECUTED** — all 7 batches, Tasks 30/31, and all nine G-decisions resolved and implemented, CI green (commits `60d4b5a` → `fa68f0f`). Trust the memory file's "Fable 5 Plan Execution — COMPLETE" section over any stale pending claim; if in doubt, run `scripts/ci/verify-fleet-status.js` and read recent `git log`.

## What this map deliberately excludes

This map was built **without reading any agent source code** (`agents/*/agent.js`), workflow YAMLs, corp/core module internals, theme/Liquid files, or SQL contents — only the six documents listed in the header plus directory listings. Agent behavior descriptions above are what the docs claim, and this project's #1 documented failure mode is precisely "documentation asserts a state the code doesn't enforce." **Any future stage that needs actual runtime behavior (gates, flags, write paths, prompts) must read the relevant files directly and/or run `node scripts/ci/verify-fleet-status.js` — never act on this map's status claims alone.** Also excluded: live Supabase/Shopify/Klaviyo state, GitHub Actions run history, and anything decided after 04/07/2026.
