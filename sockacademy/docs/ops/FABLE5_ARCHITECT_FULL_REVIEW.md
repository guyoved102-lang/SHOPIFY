# FABLE5 ARCHITECT FULL REVIEW — Unconstrained Top-Down Pass

> 📌 **Status tracked live in `FABLE5_ACTION_TRACKER.md`** (Stage 15 Action Plan A-H). This file remains the detailed source for the findings and reasoning behind each item — read it for depth, not for current status.

**Written 05/07/2026 (Fable 5, Lead Strategic Architect dispatch). Read-only on all project code — no code, theme, or config was touched. Outputs of this pass: this file + one appended ledger line.**

**Basis (read in full):** `FABLE5_INITIATIVE_LEDGER.md`, `FABLE5_LAUNCH_READINESS_PLAN.md`, `docs/strategy/VISION.md`, `docs/strategy/PHASE_ARCHITECTURE_SKELETON.md`, `sockacademy/CLAUDE.md`, `docs/superpowers/specs/2026-07-04-design-recommendations.md`, `docs/ops/ANTI_RECURRENCE_PROTOCOL.md` (all 41 incidents), `corp/core/orchestration/index.js`, all five skill files (`.claude/skills/boot-sockacademy`, `close-sockacademy`, `run-sockacademy-agents`, `workflow-navigator`, `sockacademy/.claude/skills/run-sockacademy`), plus a breadth sweep of `sockacademy/agents/*/agent.js` (30 agents), `corp/core/*.js` (14 shared modules), and `.github/workflows/` (34 workflows). Two claims below were newly verified by direct grep this pass and are marked **[verified this pass]**.

**Supersession note (Anti-Recurrence #31 compliance):** nothing here overrides `VISION.md` or `PHASE_ARCHITECTURE_SKELETON.md`. Where I disagree with the constitution, I say so explicitly and flag it as a **[CONSTITUTIONAL CONFLICT]** for Guy to rule on — I do not silently reinterpret it.

---

## The verdict in one paragraph

The machine is built. It is, honestly, over-built: 30 agents, 34 workflows, 14 shared core modules, 41 anti-recurrence protocols, a 12-stage self-review initiative — and zero orders, zero live inventory, zero traffic. Iron Law 1 ("build everything before selling") has reached its own terminal condition: the thing it demanded exists. The single greatest risk to SockAcademy today is not a bug, not a security hole, not brand drift — it is that building and auditing have become the product. Every week spent perfecting a machine that has never touched a customer is a week of zero information about whether any of its assumptions are true. The launch plan (`FABLE5_LAUNCH_READINESS_PLAN.md`) is correct and sufficient; the strategic job now is to execute its 12 steps and stop generating new pre-launch work — including, frankly, reviews like this one. Below I do the job I was asked to do, but item #1 of the action plan is: **ship.**

---

# PART I — CRITIQUE

## 1. Iron Law 1 has been satisfied — continuing to invoke it is scope creep **[CONSTITUTIONAL CONFLICT — flagged, not overridden]**

`CLAUDE.md` Iron Law 1: "אפס השקה עד שהבסיס 100% בנוי, בדוק, ומסונכרן." Fine. The base is now 100% built (30/30 agents), tested (77-finding audit executed, 7 batches complete, CI green), and synchronized (orchestration clusters, Command Center, Telegram, HITL). The law's own condition is met. Yet the project's gravitational pull is still toward *more building*: RAG knowledge base plans, Module 4, more review stages. Notice the irony: the **frontend** has a formal freeze (Iron Law 4) while the **backend** — already 30 agents deep — has never had one. The asymmetry is backwards for a store whose next milestone is its first customer.

**My position:** declare Phase 1 build COMPLETE as a locked status, institute a *backend feature freeze* (bug fixes and launch-plan items only — no new agents, no new modules, no new infrastructure) until 25 orders, and redirect all build energy into the launch plan's 12 steps. This does not contradict the constitution; it *enforces* it — `PHASE_ARCHITECTURE_SKELETON.md` already says Phase 2+ features wait for revenue triggers. What's been happening is Phase 2-6 *quality* work smuggled in under Phase 1's flag.

## 2. Design Freeze — direct verdict: lift it partially, now

I was asked not to hedge, so: **the Design Freeze has outlived its purpose and should be partially lifted immediately.**

The freeze (Iron Law 4, `CLAUDE.md`: "פוקוס בלעדי: pipeline הסוכנים + backend sync") existed to protect agent-pipeline build focus. That work is finished — the thing the freeze protected no longer needs protecting. Meanwhile, two independent Fable 5 reviews (`FABLE5_BRAND_VOICE_AUDIT.md`, `2026-07-04-design-recommendations.md`) converge on the same fact: the homepage is the weakest live surface of the whole project, using words banned by the brand's own QA rubric, and the product page renders a perpetual fake sale that directly contradicts the brand's stated no-discount posture. The freeze is currently protecting the project's *worst* asset from its *best-reviewed* fixes.

And the timing argument is decisive: **pre-launch, with zero traffic, is the cheapest moment in the store's entire life to change design.** No customers to disturb, no conversion data to invalidate, full git revertibility. Every week the freeze holds past launch, changes get more expensive.

What "partial" means concretely — three tiers:
- **Lift now (approve as one batch):** design-recommendations items **#1** (retire sale grammar), **#14** (homepage copy re-cut to MG-1 register), **#8** (Sock Finder v2). These are the spec's own top picks, they are copy/register work not structural redesign, and #14 arguably complies with even the freeze's letter (content, not CSS). One decision from Guy unlocks all three.
- **Hold behind the positioning decision (launch plan Tier 3.1):** items #2-#7, #12, #13 — good, but their copy register depends on whether the brand decides "premium-performance now, luxury at Phase 4." Sequencing them before that decision risks rework.
- **Keep frozen until Phase 2+ (the spec itself agrees):** #9-#11 (content-production-heavy: macro photography, provenance, The Rejects — all gated on real product/testing operations that don't exist yet).

The freeze should then convert from "freeze" to what it already is in practice: **change control** — every item passes Guy individually. A freeze that admits per-item exceptions is change control wearing a freeze's name; naming it honestly removes the psychological barrier that's currently blocking approved-quality work.

## 3. Stress test — at 1,000 orders/month, what breaks first

### 3.1 Fulfillment breaks first, because it does not exist. **[verified this pass]**

Grep across the entire `sockacademy/` tree for `createOrder`, `placeOrder`, CJ order-submission endpoints, or any fulfillment automation: **zero matches.** The 30-agent fleet covers pre-purchase exhaustively (research A1, upload A2/A2.5, content A3/A5, ads A4, email A6, intel A10-A13) and post-purchase *analytics* (A12 reviews, A16 CX, A19 returns intelligence) — but the transactional core of a dropshipping business — *customer pays → supplier order placed at CJ → tracking number synced back → customer notified* — has no agent, no module, no roadmap line. A22 "Supply Chain Intelligence" monitors shipment ETAs of orders someone else placed; nobody places them. The current answer is: Guy, by hand, via the CJ dashboard, per order.

At 25 orders/month this is fine — even desirable (Guy learns the failure modes firsthand). At 1,000 orders/month it is ~33 manual fulfillments *per day*, and the entire virtual corporation — the COO agent, the CFO agent, the PR agent — watches analytically while its one human runs the warehouse. **This is the single biggest architecture gap in the project, and no document names it.** The org chart built the C-suite before the shipping department.

**Recommendation:** do not build it now (backend freeze, §1). But **write it into the constitution now**: add "A2.7 — Order Fulfillment (CJ order placement + tracking sync + fulfillment status writeback to Shopify)" to `PHASE_ARCHITECTURE_SKELETON.md` **Phase 2**, same 25-orders trigger as the C-Suite — arguably *ahead* of A14/A15 in build order, because a COO report about orders Guy fulfills by hand is a diary, not an operating system. CJ has a documented order-creation API (`/shopping/order/createOrder` family); Make.com already watches Shopify orders, so the trigger plumbing half-exists.

### 3.2 Customer service breaks second — the fleet has no mouth.

The old 11-agent roster in `CLAUDE.md` had "A10 — שירות לקוחות" — that concept died in the renumbering and was never re-homed. A16 CX is churn/NPS *analytics*, not ticket answering. At 1,000 orders/month expect 50-100 inbound contacts/month ("where is my order," size exchanges, refunds) — all landing on Guy's Gmail, competing with the dozens of agent emails the fleet already sends him (the exact failure mode the Telegram standard was created for). **Recommendation:** name it (A-CS or fold into A16 as a second function), Phase 2 skeleton entry, trigger 25 orders. Shopify Inbox + a Claude-drafted-reply, Guy-approves-send HITL loop is a one-week build *when its trigger fires* — not now.

### 3.3 A0 is a monitor wearing an orchestrator's title — and it reads the whole table every run. **[verified this pass]**

`corp/core/orchestration/index.js:71-77` — `fetchHealthMap()` selects **every row of `agent_health_log` ever written**, ordered descending, no `.limit()`, then keeps only the first row per agent and discards the rest. Today that's harmless. With 30 agents logging on cron for a year it becomes a full-table scan of tens of thousands of rows on every daily A0 run, growing forever — memory, latency, and Supabase bandwidth all unbounded, in the one component whose job is to detect degradation. Fix is mechanical (a `.limit(200)` is 90% of the fix; a per-agent-latest RPC is 100%) — this belongs in the same PR as the launch plan's step 4 cron work.

The deeper pattern: A0's "Decision Engine" **decides nothing** — it prints. It cannot re-run a failed agent, cannot quarantine a flapping one, cannot reorder work. Every "decision" is a Telegram/email for Guy to act on. That is the correct design at 0 orders (human-in-the-loop everything). But be honest about the scaling shape: at scale, A0-as-built converts system load into *Guy load* linearly. The Phase 2 gate's DRY_RUN suite in the skeleton is the right hook — when Phase 2 arrives, A0 needs one real actuator (re-dispatch a failed workflow via `gh workflow run`) before the fleet doubles its active count.

### 3.4 The runtime itself: 34 cron workflows on GitHub Actions.

Cron-with-no-retries is fine for content and intel. It is the wrong substrate for anything transactional (fulfillment, CS) — those need event-driven with retry semantics. The pieces already exist in embryo (Upstash queues in `corp/core/queue.js`, `shopify-webhook-handler.yml`, Make.com webhooks) but consumers are still cron agents, so a queue can fill for hours before anything drains it (A0 warns at depth 20 — warns Guy, again). No action now; this is the Phase 2/3 architecture decision to make *when fulfillment is built*: transactional agents hang off webhooks/queues, editorial agents stay on cron.

### 3.5 Already-diagnosed load-bearing items (no re-audit, just ranked into this picture)
The QA gate 100%-rejection (plumbing bugs, `FABLE5_QA_GATE_ANALYSIS.md`) means the content machine produces nothing at any scale until fixed — launch plan step 6 covers it. The A5 silent publish failure and the staleness/cron mismatches are steps 4/7. Nothing to add except: these are *throughput* fixes and belong before launch; everything in §3.1-3.4 is *scale* work and belongs behind revenue triggers.

## 4. The real bottleneck is a queue of undecided decisions on Guy's desk

Cross-referencing the launch plan's execution order against what has actually moved since it was written: the *code* items move (staleness fix shipped, commit `3bb691e`; compliance fix `fd90ca0`). The *decision* items sit: positioning (3.1), discount mechanics (3.2), single-pair floor (3.3), VISION.md A-numbering (3.5), attorney packet send (1.3), Shopify token recreation (1.1). Six of the seven things blocking launch are Guy-only, none takes more than an hour, and several gate long chains behind them — 3.1 alone blocks the homepage rewrite, the article retirement, the discount resolution, and half the design recommendations.

This is the classic solo-founder inversion: **the founder's attention flows to where the system is strongest (reviewing code, where five automated nets already exist) and away from where he is the only net (brand/legal/pricing judgment).** See §6.

## 5. The documentation metabolism is generating faster than it retires

The project's #1 self-documented failure mode (Anti-Recurrence #31, #36, #39, the ledger's own Stage 1 correction) is *docs asserting a state that code/reality doesn't match*. The countermeasure so far has been to write more docs, more carefully. There are now 14+ `FABLE5_*.md` files, a 1,066-line `CLAUDE.md` awaiting its approved consolidation, three separate "Phase N" numbering systems requiring a disambiguation rule in the boot skill, and stale state tables inside two skill files — one of which (stale text in `boot-sockacademy`) already caused a real incident: the ledger's original Stage 3/5 framing was wrong because it trusted skill-file text over live memory.

Every stale doc is a loaded gun pointed at a future session. The structural fix is a **retirement rule**, not more writing discipline: (a) once `FABLE5_LAUNCH_READINESS_PLAN.md` absorbed a finding, its source doc is archive-tier — banner it "SUPERSEDED BY LAUNCH PLAN" at the top, one line, done; (b) **skills must contain procedures, never state** — agent status tables, secrets counts, baselines all live in memory/`CLAUDE.md` only (see §8 and the skill deliverable in Part III); (c) execute the already-approved-ready CLAUDE.md consolidation as launch-plan step 11, last, as planned.

## 6. Founding Founder Friction — the direct part

**Guy: stop touching —**
- **[FRICTION-1] Per-item approval of mechanical, twice-verified fixes.** Launch-plan steps 4-7 (staleness+cron PR, SQL/RLS batch, QA writer fixes, A5 alert) were each found by one Fable 5 pass and independently re-verified by a controller. Approving each individually makes you a queue for work that doesn't need your judgment — CI, structure-lint, the security hook, and PARANOIA MODE are the nets, and they're good. Approve them as **one batch decision** ("execute launch-plan steps 4-7"), get one report at the end. Part III's skill encodes exactly this.
- **[FRICTION-2] Reading raw fleet-audit output.** You have an orchestrator, a Command Center, and a Hebrew Telegram standard precisely so you consume *summaries*. If you find yourself reading per-agent YAML diffs, the delegation layer has failed and the fix is the layer, not your hours.
- **[FRICTION-3] Commissioning further review passes.** After ~14 Fable 5 stages the marginal finding is now Tier-4 ("trim inert GRANTs"). The audit function has hit diminishing returns; every additional pass costs your scarcest resource (decision attention) to read.

**Guy: start owning —**
- **[FRICTION-4] The six sitting decisions (§4), this week, timeboxed.** Positioning (3.1) is the keystone: one hour, one written paragraph ("SockAcademy is premium-performance at premium-performance prices until Phase 4; the Loro Piana register is the ceiling we build toward, not the claim we make today" — or the opposite, your call). That single paragraph unblocks the homepage, the articles, the discount question, and the design batch.
- **[FRICTION-5] The attorney send (1.3).** It's an email with an attached packet that already exists. It is the only true external blocker, its latency is measured in attorney-weeks, and every day unsent adds a day to the launch date.
- **[FRICTION-6] Being the customer.** Post-launch, your highest-value hours are the ones no agent can do: talking to the first 25 buyers, watching session recordings, holding the product. The fleet handles everything measurable; you own everything felt.

**Interaction efficiency:** the boot/close protocols are heavy but earn their cost — keep them. Two cheapenings: (a) boot's Stage 1.7 "YAML Reality Audit" is an LLM re-deriving, every session, what a script could compute deterministically — **this is a production-system fix, not a skill fix**: write `scripts/ci/yaml-reality-audit.js` (cross-reference package.json deps ↔ YAML env ↔ `gh secret list`), run it in CI on workflow changes, and let the boot skill just execute the script and read its output. (b) Retire or gut `workflow-navigator` (§8).

## 7. Pareto — the 20% and the 80% per domain

| Domain | The 20% that yields 80% | The 80% that is now noise — stop/defer |
|---|---|---|
| **Code** | Launch-plan steps 1-7 (token, medical-claim gate, attorney send, cron/staleness, SQL batch, QA writers, A5 alert) + the `fetchHealthMap` limit | Any new agent/module/infra pre-25-orders; further audit passes; Tier-4 hardening; polishing dormant Phase 3-6 agents; the ~270 no-op CI runs/month (step 4 kills these) |
| **Marketing** | Homepage re-cut (#14) + Sock Finder v2 (#8) + 3-5 real products with real photos and live inventory | A5's 3-posts/week cadence to zero followers (halve until launch); expanding A10/A13 intel breadth nobody consumes yet; pre-launch ad creative iteration in A4 |
| **Sourcing** | Get 3-5 CJ products **actually orderable** — verified stock, real photos, real supplier lead times (everything is currently Sold Out and A7 monitors MOCK products) | Merino-only scan narrowing; factory/private-label intelligence (Phase 4 by constitution); MOQ modeling before first order |
| **Ops/Docs** | Execute the CLAUDE.md consolidation once; banner superseded FABLE5 docs; de-state the skills | New strategy docs; reconciliation passes beyond the 2 live contradictions; new anti-recurrence protocols for incidents that haven't recurred |

## 8. The skills layer — good bones, two diseases

The skills are genuinely above-average tooling for a solo operation. Boot/close with the Primer continuity gate + PreToolUse archive hook is excellent institutional memory engineering. Two problems:

1. **State rot inside procedure files.** `run-sockacademy-agents/SKILL.md` carries an 11-agent status table ("A8 activates after 10 sales" — contradicts the canonical 25-orders/$1K trigger) and `boot-sockacademy` carried the stale baseline that misled the ledger once already. A skill is read as truth at the worst possible moment (cold start, zero context). **Rule: skills describe *how*, never *what is*.** Part III delivers the de-stated rewrite.
2. **`workflow-navigator` is noise-positive.** It instructs Claude to interrupt every conversation with tool tips, and references commands that don't exist in the current CLI surface (`/batch`, `/btw`, `/usage` as slash commands). Its useful content is one table. Verdict: retire it, or cut to the trigger-phrase table only. It also violates its own project's Zero-Waste principle — a co-pilot that costs attention per message to occasionally save a keystroke.

And per the mandate's distinction: **no skill in Part III papers over a production problem.** The YAML audit belongs in `scripts/ci/` (§6), the fulfillment gap belongs in the constitution (§3.1), the health-query bound belongs in `orchestration/index.js` (§3.3). The skills below only package human-AI workflow.

---

# PART II — ACTION PLAN

Ordered. Each item: file → leverage → concrete handoff for Claude (Opus/Sonnet). Items marked **[GUY]** are decisions/actions only Guy can take.

### A. Ship the existing launch plan — no new plan
**File:** `docs/ops/FABLE5_LAUNCH_READINESS_PLAN.md` (steps 1-12).
**Leverage:** everything; it's already written and verified.
**Handoff:** none needed — this review adds items B-H *into* that plan's flow, it does not replace it.

### B. **[GUY]** The keystone decision week
**Files:** launch plan Tier 3 (3.1, 3.2, 3.3, 3.5) + Tier 1 (1.1, 1.3).
**Leverage:** six one-hour-or-less Guy-only items currently gating ~10 downstream tasks. 3.1 (positioning) first — it's upstream of 3.2, 3.3, step 9, and the design batch.
**Handoff for Claude:** prepare a single-page decision memo per item (options, recommendation, consequences — max half a page each, in Hebrew), delivered as one Telegram-linked packet, so Guy decides from summaries instead of re-reading source audits.

### C. **[GUY approves once]** Partial Design Freeze lift — the 3-item batch
**Files:** `docs/superpowers/specs/2026-07-04-design-recommendations.md` items #1, #14, #8; `sections/main-product.liquid`, `templates/index.json`, `sections/sock-finder.liquid`.
**Leverage:** the highest wow-per-risk changes on the most public surfaces, at the cheapest possible moment (zero traffic). Fixes audit-flagged banned-word surfaces the QA gate can't reach.
**Handoff:** one implementation session: #1 (remove Sale badge/strikethrough/trust-badge demotion — flag the `compare_at_price` data decision to Guy inline), #14 (line-by-line homepage copy table old→new for Guy's approval *as a table*, then apply), #8 (result screen renders product + Material Profile + one reasoning sentence; retitle). Screenshot set before/after via theme preview. Freeze remains in force for everything else.

### D. Backend feature freeze until 25 orders **[CONSTITUTIONAL — needs Guy sign-off, then it IS the constitution]**
**Files:** `sockacademy/CLAUDE.md` (add to Iron Law 1 as its completion clause), `memory/project_sockacademy_state.md`.
**Leverage:** stops the highest-burn failure mode (perfecting a customer-less machine); makes Iron Law 1's terminal condition explicit so future sessions can't smuggle Phase 2+ work in under it.
**Handoff:** a 5-line amendment: "Phase 1 build declared COMPLETE [date]. Until PHASE_2_ACTIVATE_BY_GUY: bug fixes, launch-plan items, and content ops only. No new agents, modules, tables, or workflows."

### E. Constitution amendment: name the missing organs (fulfillment + CS)
**File:** `docs/strategy/PHASE_ARCHITECTURE_SKELETON.md` Phase 2 section.
**Leverage:** §3.1/§3.2 — the two functions that actually break at scale are currently unnamed anywhere; naming them with a trigger prevents the Phase 2 build order from starting with reporting agents while Guy hand-fulfills.
**Handoff:** add "A2.7 — Order Fulfillment" (CJ order placement API + tracking writeback + Shopify fulfillment status; trigger: Phase 2, build **before** A14/A15) and a CS function (Shopify Inbox + HITL-approved Claude drafts; trigger: Phase 2). Must carry a "Supersedes: —, Adds: two Phase 2 agents, no reordering of existing phases" line per Anti-Recurrence #31. Design-doc only now — no code (item D).

### F. Bound the orchestrator's health query
**File:** `corp/core/orchestration/index.js:71-77`.
**Leverage:** removes an unbounded-growth query from the health monitor itself; 3-line change.
**Handoff:** add `.limit(500)` to the select (500 ≈ 16 days × 30 agents headroom) + a comment explaining why; ideally replace later with a per-agent-latest RPC — note that as a Phase 2 TODO in the launch plan, not code now. Ride along with launch-plan step 4's PR.

### G. Doc retirement pass
**Files:** all `docs/ops/FABLE5_*.md` except the ledger and launch plan; `run-sockacademy-agents/SKILL.md`; `workflow-navigator/SKILL.md`.
**Leverage:** §5 — kills the project's #1 failure mode at its source instead of at its symptoms.
**Handoff:** (1) one-line "**SUPERSEDED — absorbed into FABLE5_LAUNCH_READINESS_PLAN.md [date]. Historical record only.**" banner atop each absorbed FABLE5 doc; (2) replace `run-sockacademy-agents/SKILL.md` with Part III's de-stated version; (3) retire `workflow-navigator` (delete or reduce to its trigger-phrase table — Guy's call, recommend delete).

### H. YAML Reality Audit becomes a script (production fix, not a skill fix)
**Files:** new `scripts/ci/yaml-reality-audit.js`; `.claude/skills/boot-sockacademy/SKILL.md` Stage 1.7.
**Leverage:** converts a per-session LLM ritual (slow, nondeterministic, token-burning) into a deterministic 2-second script; boot sessions get faster and more reliable simultaneously.
**Handoff:** script cross-references each agent's `package.json` deps ↔ its workflow YAML `env` block ↔ `gh secret list` output (passed in, so the script stays offline-testable); emits the existing table format; exits nonzero on CRITICAL. Wire into CI on `workflows/**` changes. Boot skill Stage 1.7 becomes "run the script, report its output." *(Waiver from item D's freeze: this is a CI script, not product infrastructure — but it can also simply wait until after launch; Guy's call.)*

---

# PART III — SKILL DELIVERABLES

Both confirmed **workflow-assist only**: Skill 1 packages a human-approval workflow (the fixes it ships are real code changes reviewed elsewhere); Skill 2 is a de-stating rewrite of an existing procedure file. Neither substitutes for the production-system fixes in Part II (which are routed to code/constitution where they belong).

## Skill 1 — NEW: `ship-approved-batch` (fixes FRICTION-1)

Location: `.claude/skills/ship-approved-batch/SKILL.md`

```markdown
---
name: ship-approved-batch
description: |
  Execute a batch of pre-verified, Guy-approved fix items from a named plan
  document (e.g. FABLE5_LAUNCH_READINESS_PLAN.md steps 4-7) as one delegated
  run: per-item commit, CI-green gate between items, single consolidated
  Hebrew report at the end. Use when Guy approves multiple plan items at once
  ("בצע סעיפים X-Y מהתוכנית") instead of approving each individually.
---

# /ship-approved-batch — Delegated Batch Execution

**Trigger:** Guy names a plan doc + item range and says to execute
(e.g. "בצע 4-7 מה-launch plan"). Approval of the RANGE is the approval —
do not re-ask per item.

## Hard rules
1. **Scope lock:** only items explicitly named. Anything discovered mid-run
   that is not in the range → log to the report's "נמצא בדרך" section, do NOT fix.
2. Every item was already reviewed/verified in its source doc — implement
   exactly what the source doc specifies. If the source doc's spec is ambiguous
   or reality has drifted from it → SKIP the item, flag in report. Never improvise.
3. LAUNCH_MODE / live-run safety: all agent test runs via
   `DRY_RUN=true node scripts/setup/run-agent-safely.js <AgentId>` (Anti-Recurrence #35).
4. Design Freeze + brand copy remain out of scope unless the approved range
   explicitly includes a design item Guy already unlocked.

## Per-item loop (strict order, no parallelism)
1. Read the item's spec in the plan doc + its cited source doc section.
2. Implement. Smallest possible diff.
3. Security sweep: `git diff --cached | grep -iE "(api_key|secret|password|token|sk-|pk_|shpat_)"` — match = STOP.
4. Commit (one commit per item, message cites the plan item number).
5. Push, then WAIT for CI: `gh run list --limit 3` until completed.
   - CI red → fix forward if trivially caused by this item; otherwise revert
     the item's commit, mark item FAILED in report, continue to next item.
6. Update `memory/project_sockacademy_state.md` PENDING for that item immediately
   (Trigger-1 rule), not at the end.

## Final report (Hebrew, Telegram-format compatible)
- לכל סעיף: ✅ בוצע [hash] / ⏭️ דולג + סיבה / 🔴 נכשל + מצב נוכחי
- נמצא בדרך (out-of-scope findings, untouched)
- CI: סטטוס סופי
- מה נשאר לגיא

**One batch = one Guy decision in, one report out. That is the entire point.**
```

## Skill 2 — REWRITE: `run-sockacademy-agents` (de-stated; fixes the documented stale-skill incident class)

Replaces `.claude/skills/run-sockacademy-agents/SKILL.md`. All agent-status tables removed — status lives in memory/CLAUDE.md only. Bakes in Anti-Recurrence #34/#35.

```markdown
---
name: run-sockacademy-agents
description: |
  Run, test, smoke-test, or debug any SockAcademy agent safely. Covers: running
  an agent locally, verifying CJ API auth, checking last run results, triggering
  GitHub Actions workflows. Use when asked to run, test, execute, trigger, or
  debug any SockAcademy agent.
---

# SockAcademy Agents — Run Skill (procedures only)

**This file contains NO agent status information — by design.** Which agents
are live/dormant/gated changes weekly; the source of truth is
`memory/project_sockacademy_state.md` + `grep -L "LAUNCH_MODE" sockacademy/agents/*/agent.js`
run fresh. A status table here WILL rot and mislead a cold session
(it already did once — see FABLE5_INITIATIVE_LEDGER.md, Stage 1 correction).

## The one iron rule (Anti-Recurrence #35)
Every manual agent run, always, no exceptions — even "probably gated" agents:
```bash
DRY_RUN=true node scripts/setup/run-agent-safely.js <AgentId>
```
Never bare `node agent.js`. Before any multi-agent loop, list the unprotected:
`grep -L "LAUNCH_MODE" sockacademy/agents/*/agent.js` — treat those as high-risk.
**A9 in particular: never run without explicit intent — it opens real HITL
approval requests and emails Guy.**

## "Ready" means it ran, not that it parses (Anti-Recurrence #34)
`node -c` is not a test. An agent counts as verified only when a real
`DRY_RUN=true` run reaches its final log line (success or "DORMANT").

## Locations
- Agents: `sockacademy/agents/A<N>_<name>/` (each has its own package.json —
  root package.json is NOT what CI installs; Anti-Recurrence #39)
- Env: `sockacademy/.env` — agents load it via `config({ path: '../../.env' })`,
  so run from the agent's own directory
- Shared modules: `sockacademy/corp/core/` (workflows need a separate
  "Install corp/core dependencies" step; Anti-Recurrence #37)

## Smoke driver (CJ auth + quick check, ~5s)
```bash
node .claude/skills/run-sockacademy-agents/smoke.mjs        # quick
node .claude/skills/run-sockacademy-agents/smoke.mjs --full # full A1 scan, ~3min, sends email
```

## GitHub Actions
```bash
gh workflow run <workflow>.yml                 # manual trigger
gh run list --workflow=<workflow>.yml --limit 3
gh run view <run-id> --log
```

## Gotchas (stable facts only)
- CJ auth: `{ apiKey }` POST body — NOT email+password (account is Google-OAuth).
- Gmail SMTP: needs `GMAIL_APP_PASSWORD` (App Password, 2FA on
  sockacademy.store@gmail.com) — sender is ALWAYS sockacademy.store@gmail.com.
- AliExpress scraping returns 0 (blocked) — expected; CJ provides real data.
- CI failing at ~11s = setup (package-lock / secret / cache path), never code.

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| `CJ_API_KEY not set` | check `sockacademy/.env` exists + var present |
| `APIkey is wrong` | key expired — regenerate at developers.cjdropshipping.com |
| `Cannot find module X` | `npm install` in THAT agent's directory (not root) |
| `supabaseUrl is required` at load | missing `{ path: '../../.env' }` in dotenv call (AR #34) |
| Push rejected GH013 | secret in code — env var + orphan-branch technique |
```

## Skill 3 — RETIRE: `workflow-navigator`
No replacement text — the deliverable is deletion (or reduction to its trigger-phrase table if Guy wants to keep "סיום שיחה" → close-protocol routing, which `close-sockacademy` already handles anyway). Rationale in §8.

---

# What I would tell Guy in one sentence

The machine you set out to build exists and is good; the only thing it has never done is meet a customer — spend next week making the six decisions only you can make, approve the three-item design batch, send the attorney packet, and let the fleet do the thing it was built for.

**End of review.**
