# Fable 5 Initiative — Progress Ledger

**Purpose:** Guy has a limited-time free trial of Fable 5 (claude-fable-5) and wants to use it
for the highest-judgment work in the project — design recommendations, the ~77-finding security/PII
audit, strategy-doc reconciliation. Sessions/dispatches are kept short and scoped (fresh subagent per
stage) instead of one open-ended "read everything" session, both to conserve quota and because a
narrower context produces better judgment per task.

**Rule:** Every stage's deliverable is a written doc, and its outcome is logged here immediately
after it completes — this file is the memory that survives across separate dispatches/sessions, since
each Fable 5 subagent starts with zero memory of prior stages. Read this file before dispatching any
new stage to see what's already done and what the next stage should build on.

**Do not re-dispatch a stage marked `done` below.** Resume at the first `pending` stage.

---

## Stage 1: Project Map

**Status:** done
**Output:** `sockacademy/docs/ops/FABLE5_PROJECT_MAP.md`
**Scope:** Read-only. Curated institutional docs only (CLAUDE.md, VISION.md,
PHASE_ARCHITECTURE_SKELETON.md, ANTI_RECURRENCE_PROTOCOL.md, project_sockacademy_state.md,
clever-skipping-hamster.md audit plan) + a directory-level listing of `sockacademy/agents/` —
not full agent source. Produces a compact architecture/strategy map that later stages read
instead of re-deriving context from scratch.
**Key correction surfaced:** the ~77-finding audit plan (clever-skipping-hamster.md) is NOT
"Batch 1 done, 2-7 pending" as this ledger originally assumed — `project_sockacademy_state.md`'s
"Fable 5 Plan Execution — COMPLETE" section (dated 04/07/2026, verified directly, not from stale
skill-file text) confirms all 7 batches + Tasks 30/31 + all 9 Guy decisions (G-1..G-9) are done,
committed, CI green. Old Stages 3 and 5 below are superseded because of this — see their entries.

## Stage 2: Design Recommendations ("few steps forward")

**Status:** done (on retry) — `sockacademy/docs/superpowers/specs/2026-07-04-design-recommendations.md`.
14 concrete recommendations, small-to-bold. Controller-verified: both `sections/sock-finder.liquid`
and `sections/bento-grid.liquid` are real existing files; `templates/index.json`'s homepage section
order includes `sock-finder` (present but last in a long list — plausibly "buried" as claimed) and
does NOT include `bento-grid` (confirmed built-but-unused). Top recommendation: "Sock Finder v2" —
reframe the existing quiz result to render the recommended product with its full Material Profile
+ fitting reasoning, so a visitor *experiences* the claimed sock authority rather than reading
assertions of it; ~80% of the machinery already exists. Aware of Stage 9's brand-voice gap finding
(homepage copy currently reads mid-market) — factored into the recommendations rather than assuming
the current copy is already at-register.

---

**Entire Fable 5 Initiative (Stages 1-14) is now complete as of 05/07/2026.** Master synthesis at
`FABLE5_LAUNCH_READINESS_PLAN.md` is the one document to work from going forward.
**Output:** `sockacademy/docs/superpowers/specs/2026-07-04-design-recommendations.md`
**Scope:** Read-only. Reads Stage 1's map, current theme (Liquid/CSS), `DESIGN_DECISIONS.md`,
brand benchmarks (Loro Piana/Sunspel/Falke) + external premium-DTC research. Produces a
recommendations doc — no code changes. Guy reviews and approves individual items before any
implementation; current site stays untouched (git-tracked, always revertible) throughout.
**Guy's creative brief (verbatim intent, 04/07/2026):** wants the site to be much more
compelling/"magnetic" — doesn't have exact vocabulary yet, but wants visitors to land on the
site, want to stay, and react "wow." Explicitly open to ambitious/bold feature ideas, not just
polish. This must still fit Iron Law 2 (premium/authoritative register, zero gimmicks/childish
novelty) — the brief is for "wow via craft," Loro Piana-register delight, not gimmick features.

## Stage 3: Security/PII Audit Continuation (Batch 2-7) — SUPERSEDED, do not dispatch

**Status:** moot — already fully executed (see Stage 1's correction above). Batches 2-7,
Tasks 30/31, and G-1..G-9 are all done. Do not re-run.

## Stage 3': CLAUDE.md Consolidation (replaces old Stage 3)

**Status:** done — `sockacademy/docs/ops/FABLE5_CLAUDE_MD_CONSOLIDATION.md` written. Full
section-by-section classification (KEEP/STALE/ARCHIVE/DELETE) of all 31 CLAUDE.md sections +
proposed consolidated outline (~1,066 → ~450-500 lines). Awaiting Guy's review/approval before
any real restructuring edit happens.
**Critical escalation surfaced by this pass, verified directly (not just taken on the subagent's
word):** the exposed Klaviyo key (`pk_QSMqNV_...`) is printed in full inside `CLAUDE.md` itself —
a tracked, committed file — and `gh repo view` confirms the repo (`guyoved102-lang/SHOPIFY`) is
**PUBLIC**. `git log --all -S "pk_QSMqNV"` shows the key has been in the repo since the very first
commit. This is a live public exposure, not a historical one. Redacted the value from `CLAUDE.md`
locally (commit/push pending Guy's go-ahead). See `project_sockacademy_state.md` PENDING #15 for
full detail — key rotation is the only real fix; deleting the text doesn't erase git history.
**Output:** proposed consolidated `sockacademy/CLAUDE.md` (or a clearly-scoped diff) — Guy
approves before it's actually edited
**Scope:** Read-only analysis first. `CLAUDE.md` itself was flagged by Stage 1 as carrying
multiple stale layers: an old "6 Super-Agents" section (fleet has grown to 10 clusters), an
old "11 agents" roster, a stale "Phase 2 after 10 sales" trigger (canonical is 25 orders/$1K
per `PHASE_ARCHITECTURE_SKELETON.md`), and a 19/06 "Immediate Action Required" secrets list
largely resolved elsewhere. This is a live instance of the project's #1 documented failure
mode (docs assert a state the code/memory doesn't match) — worth Fable-5-level judgment to
untangle which sections are current-truth vs. historical record worth archiving vs. safe to
delete outright.

## Stage 4: Strategy Doc Phase-Numbering Reconciliation

**Status:** done — `sockacademy/docs/ops/FABLE5_PHASE_RECONCILIATION.md`. H11/M9/M10/M11 confirmed
already fixed. Two new live contradictions found and spot-verified directly by controller: (1)
`VISION.md:88` lists A20 as Phase 3 while canonical (`PHASE_ARCHITECTURE_SKELETON.md`/CLAUDE.md)
has A20 in Phase 2; (2) `MASTER_STRATEGY.html:855` still shows "$5K MRR×3" (old window) — the M10
fix only touched `BRAND_STRATEGY.md`, not this file. Both are doc-only fixes, awaiting Guy review.
**Output:** one reconciliation doc addressing H11, M9, M10, M11 (conflicting Phase-N numbering
across `SOCKACADEMY_VISION.md`, `PRIVATE_LABEL_ROADMAP.md`, `BRAND_STRATEGY.md`,
`DESIGN_DECISIONS.md`) against the canonical `PHASE_ARCHITECTURE_SKELETON.md`.
**Scope:** Read-only analysis + proposed single canonical numbering; Guy approves before any
doc edits.

## Stage 5: G-1 Decision Support (A16/A24 Gating) — SUPERSEDED, do not dispatch

**Status:** moot — G-1 (and G-2..G-9) already resolved and implemented per the completed audit
plan. A16/A24 already have real `LAUNCH_MODE` gates as of 04/07/2026.

## Stage 6: Tooling, Integrations & Claude Config Review

**Status:** done — verified directly by controller (read the actual settings files, confirmed
git-tracking status, confirmed hook mechanism). Real finding: live Shopify + Klaviyo credentials
sitting in plaintext in `.claude/settings.local.json` allow-rules (gitignored, never committed,
but plaintext on disk under a OneDrive-synced folder), AND the PreToolUse credential-scan hook in
`.claude/settings.json` is a no-op (`$CLAUDE_TOOL_INPUT` is never set by Claude Code — hooks get
JSON on stdin, not that env var) — so Iron Law S4 has had no real enforcement. Guy approved — fixed 04/07/2026: stripped the 9 credential-bearing allow-entries from
`settings.local.json` (verified via `node -e JSON.parse(...)` that both settings files still
parse, and re-grepped for `shpat_|atkn_|pk_QSMqNV` to confirm zero remaining matches beyond the
hook's own pattern string); rewrote the PreToolUse hook in `settings.json` to parse the real
stdin JSON (`tool_input.command`) and `exit 2` (actually blocks) instead of the old no-op
`$CLAUDE_TOOL_INPUT` grep; also pruned the permanently-allowlisted `rm -rf .../sockacademy/.git`
entry (finding #3). **Still outstanding — Guy-only:** rotate the Shopify access token and the
Klaviyo private key that were sitting in that file (Shopify Admin / Klaviyo dashboard).
**Output:** `sockacademy/docs/ops/FABLE5_TOOLING_REVIEW.md`
**Scope:** Read-only. Two inputs Guy sent directly (a screenshot of a product called "Paperclip"
— structured AI-task tickets + full trace + immutable audit log, 72.7k GitHub stars — and a link
to `opensesh.github.io/our-links`, a design studio's link-in-bio page offering free resources
incl. a "Claude Code Harness" and "Brand Design System") are handed to the subagent as text
since it can't view the image itself. Also reviews: the MCP Servers table in `CLAUDE.md`
(several are `ON-HOLD`: higgsfield, perplexity, zapier; `magic` ruled NOT APPLICABLE for stack
reasons) to see if current project state (audit complete, attorney review pending) changes any
verdict; the real `.claude/` config in both the main repo and this worktree
(`settings.json`, `settings.local.json`, custom skills under `.claude/skills/`) for any
configuration improvement; and a general "what else is worth connecting" pass.
**Guy's ask (verbatim intent, 04/07/2026):** wants Fable 5's own take on the Paperclip
screenshot + the opensesh link specifically (not just my read), plus whether there are more
integrations/connections worth making in general, and whether Claude Code settings could be
improved.

## Stage 7: QA Gate 100%-Rejection Analysis

**Status:** done — `sockacademy/docs/ops/FABLE5_QA_GATE_ANALYSIS.md`. Verdict: prompt/writer-side
bugs, not tonal drift. Controller-verified directly: A5's `max_tokens: 300` (agent.js:166, likely
truncates JSON) and a real internal contradiction (agent.js:190/195 caps body at 3×20=60 words,
but agent.js:203's schema demands 80-110 words total) — both confirmed real by grep. Also found:
A5's JSON-parse-failure fallback fabricates a caption that auto-fails rubric rules; A3's rubric
enforces an opener rule + banned-word list its prompt never mentions. Real rejection reasons
aren't persisted anywhere (only sent to Telegram/email) — recommend logging them going forward.
Awaiting Guy review before any prompt/code changes.
**Output:** `sockacademy/docs/ops/FABLE5_QA_GATE_ANALYSIS.md`
**Scope:** Read-only. `corp/core/qa-gate.js` (the rubric), recent actual A3/A5 QA rejection
reasons (Supabase `qa_passed`/`social_qa_held_count` history or agent logs if reachable), and the
writer prompts in `agents/A3_content/agent.js` / `agents/A5_social/agent.js`. Diagnoses why 100%
of content is currently rejected and recommends: strengthen writer prompts, relax the rubric, or
wait-and-watch — with reasoning, not just a pick.

## Stage 8: Attorney-Review Prep Package (A9)

**Status:** done — `sockacademy/docs/ops/FABLE5_ATTORNEY_PREP.md`. Templates themselves close to
attorney-ready. One structural issue needs a real ruling: ToS asserts Delaware law + AAA
arbitration while operator is an Israeli individual with no US entity. **Verified directly by
controller — real, live regulatory risk, not just quarantined in `research_materials.md` as
previously believed:** `agents/A3_content/agent.js`'s `BLOG_TOPICS` array contains "Copper-Infused
Socks: The Science Behind the Hype" (keywords incl. "antimicrobial socks"); `agents/A5_social/agent.js`
has "Antimicrobial fibers — copper-infused socks decoded" in its live caption topic rotation;
`scripts/setup/content-generator.js:444-459` contains a full drafted article making explicit
medical claims about diabetic foot health (neuropathy, infection risk, "socks are... a health
device"). None of these are gated — if A3/A5's topic rotation ever selects the copper/antimicrobial
entries, or if the content-generator script is ever run, regulated health claims could reach real
output before attorney review. Logged to `project_sockacademy_state.md` PENDING as a Guy decision
(delete the topics/file vs. hold for the same attorney review) — this is a content/legal judgment
call, not something to silently code-fix.
**Output:** `sockacademy/docs/ops/FABLE5_ATTORNEY_PREP.md`
**Scope:** Read-only. Organizes A9's actual legal templates (ToS/Privacy/GDPR/FTC) plus every
known open legal question already surfaced this project (medical-claim quarantine H10, MG-2
regulatory hold, etc.) into one clean packet + a short list of specific questions for the
attorney — goal: make the real legal review fast and cheap for Guy.

## Stage 9: Brand-Voice Content Drift Audit

**Status:** done — `sockacademy/docs/ops/FABLE5_BRAND_VOICE_AUDIT.md`. Strong, well-sourced result
(exact quotes + file citations for every finding). Verdict: the live content estate is two-tier —
MG-1/newer articles/Welcome Email 2 genuinely hit the Loro Piana register; the **homepage** (4x
"perfect", rhetorical "Why SOCKACADEMY?", both gate-banned words/patterns that the gate never
actually reviews since it only covers unshipped A3/A5 content) and the older 5 articles read
mid-market. Cross-cutting patterns found: punching-down comparisons, price-math justification,
and a real self-contradiction (Email 3 claims "we don't do aggressive discounts" while every
product carries a permanent fake-strikethrough `compare_at_price` and WELCOME10 has a 48h expiry).
Top recommendation: fix the homepage first, then retire/rewrite the older 5 articles, then decide
as a brand call whether the discount mechanics stay. All doc/content changes — Guy approves before
anything is touched (Design Freeze + brand-copy sensitivity).
**Output:** `sockacademy/docs/ops/FABLE5_BRAND_VOICE_AUDIT.md`
**Scope:** Read-only. Spot-checks actual published blog articles / social captions against the
Loro Piana-register brand rubric (Iron Law 2) to catch drift the automated qa-gate isn't built to
catch (subtle tone issues, not just banned-word matches).

## Stage 10: Competitive/Pricing Deep Dive

**Status:** done — `sockacademy/docs/ops/FABLE5_COMPETITIVE_PRICING.md`, 12 real cited sources.
**Verdict, connects directly to Stage 9's finding:** current floors ($18/$28/$35/$65) are
correctly positioned for what the brand actually is — premium-performance (Bombas/Darn Tough
tier) — but nowhere near the *stated* Loro Piana/Falke benchmark (cheapest real Loro Piana sock
found: $150, which exceeds SockAcademy's own coded ceiling — verified: `corp/core/pricing.js`'s
`RETAIL_CEILING` tops out at $90 for Gift Sets). Same pattern as the brand-voice audit: the brand
talks true-luxury but is actually priced/positioned as premium-performance. Recommendation: keep
floors, one surgical raise (single pair $18→~$22 to clear the Happy Socks/Stance novelty band),
defer true-luxury pricing to Phase 4 private label — no supplier-cost lock found on the floors,
the real constraint is dropship product quality capping the ceiling, not the floor.
**Output:** `sockacademy/docs/ops/FABLE5_COMPETITIVE_PRICING.md`
**Scope:** Real external research (web search) on Bombas/Happy Socks/Falke/Darn Tough/Pantherella
etc. — pricing tiers, positioning gaps — to sanity-check SockAcademy's price floors
($18/$28/$35/$65) before launch. Goes deeper than A13's automated scan.

## Stage 11: Instagram Publish-Failure Telegram Alert (Design Only)

**Status:** done — `sockacademy/docs/ops/FABLE5_A5_ALERT_DESIGN.md`. Controller-verified: the
silent per-post `catch (e) { console.error(...) }` block is real, at `agents/A5_social/agent.js:553`.
Design: once-per-run aggregated Hebrew Telegram alert (not per-post, to avoid spamming an
already-known issue), canonical fleet format, ~10-line single-file change — ready for a future
mechanical-tier implementer subagent. Not implemented yet (design only, per scope) — Guy decides
when to schedule the actual code change.

---

**Batch (Stages 7-11) fully complete as of 05/07/2026.** Only Stage 2 (design recommendations)
remains outstanding from the whole initiative — still running in the background as of this note.

## Stage 12: Fresh RLS/Security Sanity Pass (All Current `.sql` Files)

**Status:** done — `sockacademy/docs/ops/FABLE5_RLS_SANITY_PASS.md`. **No live data exposure today**
(RLS deny-by-default holds on all 27 tables) but real fixes needed, one controller-verified:
`corp/core/products_table.sql:43` has `create policy if not exists "service role full access"` —
confirmed real, invalid PostgreSQL syntax (no such clause exists for `CREATE POLICY`; would throw
a syntax error if this script is ever (re-)run against Supabase, same failure class as the two
real production SQL errors already hit this session). Also found: `fraud_events`, `affiliates`,
`affiliate_performance`, `regulatory_events` have RLS enabled but zero policies (works only via
service_role's RLS-bypass); 10 non-idempotent bare `CREATE POLICY` statements across 8 files
(same recurring risk class); 11 tables incl. `system_config` and `knowledge_chunks` carry inert
`GRANT ALL TO anon, authenticated` (blocked by RLS today, but excess permission — worth tightening
as defense-in-depth). Not fixed yet — this batch touches 8+ files, so it's queued for Stage 14's
synthesis rather than silently bulk-fixed; Guy should see the full list before a batch SQL fix.
**Output:** `sockacademy/docs/ops/FABLE5_RLS_SANITY_PASS.md`
**Scope:** Read-only. Every `.sql` file currently in `corp/core/` — confirm 100% RLS coverage
right now (the big audit fixed this once; this is an independent fresh-eyes re-check, since new
tables like `knowledge_chunks.sql` were added after that audit — closes the loop rather than
assuming it's still true).

## Stage 13: Cron Schedule / GitHub Actions Efficiency Review

**Status:** done — `sockacademy/docs/ops/FABLE5_CRON_EFFICIENCY.md`. Two real problems, one
controller-verified: `corp/core/orchestration/index.js:46,48` sets `STALENESS_HOURS` for A8/A10 to
36 with a comment literally saying `// daily`, but their actual crons (`a8-analytics-reporter.yml`,
`a10-trend-scout.yml`) are both `* * 0` (Sunday-only, weekly) — confirmed real. This likely makes
A0 falsely flag both as "stale" for ~6 of 7 days, which feeds directly into the Phase 2 Readiness
≥95 gate ("no exceptions" per CLAUDE.md) — a false-negative here could be silently delaying a real
phase transition. Second finding (not independently re-verified, lower stakes): 9 LAUNCH_MODE-
dormant agents still run daily crons (~270+ no-op CI runs/month, Zero-Waste principle violation)
plus 2 same-minute live/live overlaps (A0/A7, A5/A8) with concrete proposed fixes. A3/A4/A12
confirmed matching documented intent. All queued for Stage 14 rather than fixed piecemeal.
**A8/A10 staleness threshold — FIXED 05/07/2026** (commit `3bb691e`, CI green, Guy approved):
changed to 200h/`// weekly` matching A3-A7/A11-A13. The other findings (dormant daily crons,
same-minute overlaps) remain open in the plan.
**Output:** `sockacademy/docs/ops/FABLE5_CRON_EFFICIENCY.md`
**Scope:** Read-only. All `.github/workflows/*.yml` — check for schedule collisions, agents that
run more frequently than their actual output justifies (Zero-Waste cron principle already in
CLAUDE.md), and any workflow that looks mis-scheduled relative to its dependencies (e.g. running
before an upstream agent it depends on has run).

## Stage 14: Master Synthesis — Launch Readiness Action Plan

**Status:** done — `sockacademy/docs/ops/FABLE5_LAUNCH_READINESS_PLAN.md` (221 lines, 4 tiers +
execution order, every item cited to source doc). First dispatch hit the account session-limit
mid-write (resets 12:20pm Asia/Jerusalem) but the file landed anyway; retry re-verified it against
all 12 sources item-by-item and confirmed accurate, adding one refinement (unsourced factual
claims from the brand-voice audit folded into Tier 2). **Controller then hand-corrected item 1.1**
— the plan's #1 headline item said "rotate Klaviyo key" as still-open, but Guy already rotated it
and the CLAUDE.md redaction was already committed/pushed (`94d39c5`) earlier this same session;
fixed to reflect only the Shopify token rotation is still open (and why — the Managed-Installation
app confusion). **This is the one document to actually work from going forward.**

**Stage 2 status:** still has not produced output after a very long time (far longer than any
other stage) — likely stuck or silently hit the same session-limit class of error without a
notification surfacing. Not re-dispatched yet given today's account-level rate limiting; consider
a fresh retry (same prompt, new dispatch) rather than continuing to wait indefinitely.
**Output:** `sockacademy/docs/ops/FABLE5_LAUNCH_READINESS_PLAN.md`
**Scope:** Read-only. Reads every `FABLE5_*.md` doc produced by this whole initiative (Stages
1,3',4,6,7,8,9,10,11,12,13) plus the memory PENDING list, and produces ONE ranked, prioritized
action plan — this is the actual deliverable Guy asked for ("תוכנית הפעלה"). Dispatch this one
last, after all other stages are in.

**Guy's instruction (05/07/2026):** ~2 hour autonomous budget to run whatever else is genuinely
worth Fable 5's judgment, one stage at a time (pacing rule unchanged), ending in the master
synthesis/action-plan stage above. Anything not finished in the window gets queued for later, not
rushed.
**Output:** `sockacademy/docs/ops/FABLE5_A5_ALERT_DESIGN.md`
**Scope:** Read-only design doc (no code changes) for the Telegram alert on A5 Instagram publish
failure that Guy explicitly queued earlier this session ("רעיון לשלב הבא... אחרי שיחת ה-Fable 5").
That conversation has now happened — this stage produces the design so an implementation pass
(separate, code-touching, needs Guy's review before merge) can follow later.

**Guy's instruction for Stages 7-11 (04/07/2026):** proceed slowly, one dispatch at a time (not
all in parallel) to conserve tokens/context — dispatch the next stage only after the previous one
completes. Guy is away from the computer for a few hours; work autonomously, no need to check in
per-stage. Add more stages if genuinely more good candidates surface.

---

## Log

- 2026-07-04 — Ledger created. Stage 1 dispatched (model: fable, background).
- 2026-07-04 — Stage 1 complete. File landed at the wrong path (worktree copy of `sockacademy/`,
  because the dispatch prompt gave a relative path and the subagent's cwd was the RAG-branch
  worktree) — moved to the correct main-checkout path. Stage 1 surfaced that the audit plan is
  already fully done, contradicting this ledger's original Stage 3/5 framing (which came from
  stale text in the `boot-sockacademy` skill file, not the live memory state) — corrected above.
  Old Stage 3 replaced with Stage 3' (CLAUDE.md consolidation). Old Stage 5 marked moot.
- 2026-07-05 — Stage 15 (Lead Strategic Architect full-project review, unconstrained top-down): done — `sockacademy/docs/ops/FABLE5_ARCHITECT_FULL_REVIEW.md`. Verdicts: partially lift Design Freeze now (items #1/#14/#8 as one batch); declare Phase 1 build COMPLETE + backend feature freeze until 25 orders [constitutional conflict, flagged for Guy]; two new verified findings — zero fulfillment code exists anywhere in the repo (biggest scale gap, unnamed in any roadmap → add A2.7 Fulfillment + CS to skeleton Phase 2), and `orchestration/index.js:71-77` reads the entire `agent_health_log` table unbounded every A0 run; founder-friction audit (batch-approve mechanical fixes, own the 6 sitting Tier-1/3 decisions); skill deliverables: new `ship-approved-batch`, de-stated `run-sockacademy-agents` rewrite, retire `workflow-navigator`.
- 2026-07-05 — Stage 16 (continuation, three-part dispatch): done — `sockacademy/docs/ops/FABLE5_STAGE16_DELIVERABLES.md`. (1) Homepage copy re-cut: full 50-row old→new table for every `templates/index.json` string + 3 JS micro-strings in `sock-finder.liquid`, MG-1 register, ready for Guy's line-by-line approval. (2) Constitutional amendment drafted verbatim for `PHASE_ARCHITECTURE_SKELETON.md` Phase 2: A2.7 Order Fulfillment (CJ order placement + tracking writeback, build order ahead of A14/A15) + A16.5 Customer Service Desk (re-homes the old roster's lost "A10 שירות לקוחות" concept), full Role/Input/Output/Trigger/Tech/Dependencies format + Phase 2 Gate additions. (3) Zero-budget GTM plan to the first 25 orders: channel priority is owned Founding Cohort list > founder-led community credibility > SEO (A3, once QA-gate-unblocked) > IG (trust checkpoint only) > paid (correctly dormant); named what no agent can do (speak in communities, hold the product, do outreach, be the customer's peer). Two new verified findings in the open field: `sock-finder.liquid`'s live quiz recommends BLOCKED novelty products ("Funny" vibe path) at a below-$18-floor price bracket — a constitutional violation on the homepage's most interactive surface; and the homepage carries two fabricated facts ("Est. 2024" vs. all project records starting 06/2026, "50+ Sock Categories" vs. actual 9 collections/5 products). Also flagged the unaddressed last-mile/unboxing gap (CJ dropship mailer, no branding) as Guy-only judgment, not a tracker item. Tracker updated with items I-N.
