# FABLE5 STAGE 18 — Orchestration Architecture: "One Big Orchestra"
**Written 06/07/2026 (Fable 5, Lead Strategic Architect dispatch). Design document only — the backend feature freeze (Iron Law 1 completion clause) is in force, and this doc respects it: nothing here is built until the triggers named in Part III fire. Read-only pass on all code; every load-bearing claim below was verified directly this dispatch, not inherited.**

**Basis (read in full this pass):** `corp/core/queue.js`, `corp/core/orchestration/index.js` (current version, with the Stage 15 `.limit(500)` patch), `agents/A0_orchestrator/agent.js` (notification surface), `.github/workflows/shopify-webhook-handler.yml`, `.github/workflows/hitl-approve.yml`, trigger census of all 34 workflows, `PHASE_ARCHITECTURE_SKELETON.md` A2.7/A16.5 entries, `FABLE5_ARCHITECT_FULL_REVIEW.md` §3.3-3.4, `FABLE5_ACTION_TRACKER.md`, `CLAUDE.md`.

**Guy's question, verbatim intent:** "how do we turn all of this into one big orchestra run by AI in the best way there is."

---

## The verdict in one paragraph

Guy, you already have most of the orchestra. Thirty agents reading and writing one shared Supabase, one monitor (A0) that sees all of them, one Telegram channel that tells you what matters, one HITL table that gates anything dangerous — that *is* coordination, and at 0-25 orders it is close to the best coordination architecture that exists for this company. What you are feeling as "30 independent cron jobs" is not a missing conductor; it is a missing **audience**. The genuinely missing instruments are the two already written into the constitution — A2.7 Fulfillment and A16.5 CS — and they, not a grand orchestration layer, are where event-driven earns its keep, because they are the only agents whose failure costs money within hours instead of nothing within a week. So my answer has two halves: (1) here is the real target-state design, fully specified so Claude can build it phase by phase when the triggers fire; (2) my unhedged devil's-advocate verdict — **build none of it now**, and even at Phase 2, build only the slice that fulfillment itself needs. The orchestra metaphor is right; the timing question is "when does the hall have people in it."

---

# PART I — CRITIQUE: what actually exists, and what it actually lacks

## 1.1 A0 today: a monitor wearing an orchestrator's title (confirmed, current code)

Stage 15's diagnosis holds against the current source. `corp/core/orchestration/index.js` computes a health map (now bounded at `.limit(500)`), cluster scores, staleness, HITL backlog, and queue depths — and `generateDecisions()` returns objects whose only consumers are `console.log`, `sendEmail`, and `notifyTelegram` in `agents/A0_orchestrator/agent.js`. I grepped A0 for any actuation call (`createWorkflowDispatch`, `gh workflow run`, anything): **zero**. Every "decision" is a request for Guy to act.

The interesting finding is that **the actuation mechanism already exists in this repo and is proven**: `shopify-webhook-handler.yml:95-106` calls `github.rest.actions.createWorkflowDispatch` (with the existing `GH_PAT_SECRETS_WRITE` PAT) to trigger `a7-supplier-monitor.yml` on a low-stock event. So A0's passivity is a *policy choice*, not a capability gap — the day we decide A0 may act, the pattern, the PAT, and the API are already in the codebase. That materially shrinks the build cost of Part II.

Also worth naming: at 0 orders, A0-as-printer is **correct**, not deficient. Guy-as-exception-handler is the highest-quality decision engine available, and its capacity (a few alerts/day) is nowhere near saturated. A0's design only becomes wrong when the alert rate or the cost-of-delay outgrows one human's Telegram attention — which is a Phase 2+ event by definition.

## 1.2 The queue substrate: a well-shaped embryo with three missing organs

`corp/core/queue.js` is honest, small, and correctly shaped: 5 named queues matching the real hand-off seams (upload/content/orders/stock/intel), a clean event envelope, graceful no-op without Upstash, and a `queue_log` journal in Supabase. Zero consumers anywhere in the fleet — `pop()` is exported and never imported. Before anything transactional rides on it, three gaps must be closed, and I want them named precisely because they are exactly the gaps that eat a paid order silently:

1. **No ack semantics.** `pop()` is a destructive `blpop`. A worker that crashes one line after popping has *lost the event* — for `sa:queue:orders` that means a customer paid and nothing anywhere remembers to fulfill. Minimum fix: pop moves the event to a per-queue `processing` list (`LMOVE`), delete only on explicit `complete()`; a sweeper requeues anything stuck in `processing` past a timeout.
2. **`queue_log` has no lifecycle.** Rows are inserted as `'pending'` and never touched again — there is no `mark done/failed`, so the journal cannot answer "which events were never processed," which is the one question that matters. Minimum fix: `complete(eventId)` / `fail(eventId, err, attempt)` updating status + attempt count.
3. **No retry counter, no dead-letter.** A poison event (malformed payload, CJ API down for an hour) either vanishes or loops forever depending on consumer code. Minimum fix: `attempts` in the envelope; after N=3, push to `sa:queue:dead` + Telegram + a `pending_approvals` row so the DLQ drains through the *existing* HITL surface instead of a new UI.

Call this whole package **Q-HARDEN**. It is ~1 file + 1 small SQL migration, and it is the true first task of the A2.7 build — not a separate pre-project.

## 1.3 The runtime truth nobody should design around wishfully

The fleet runs on GitHub Actions. There are **no resident processes** — nothing can sit in `blpop` waiting. So any "event-driven" design here is really: *webhook → a short-lived workflow run that processes the event immediately, with the queue as a durable journal and retry buffer* — plus a sweeper cron for what failed. This is not Kafka and must not pretend to be. It is, however, entirely sufficient: the current webhook path (Shopify → `register_webhooks.js`-registered webhooks → Make.com → `repository_dispatch` → handler workflow) already delivers an event into a running Node process within ~1-2 minutes of the Shopify event. For fulfillment, minutes are fine; the CJ order does not need to be placed in 200ms. The moment this stops being sufficient (p95 latency or GitHub Actions minutes exhaustion — realistically north of ~500 orders/month), the escape hatch is moving the consumer to a Supabase Edge Function, and *only the consumer* — the queue contract, `queue_log`, and reconciliation all survive that move unchanged. Design for the substrate you have; keep the seam clean for the one you might need.

## 1.4 The trigger census (34 workflows, verified this pass)

- **26 agent workflows on `schedule:` cron** (all with `workflow_dispatch:` manual fallback) — the editorial/intel/reporting fleet.
- **Event-shaped plumbing that exists:** `shopify-webhook-handler.yml` (`repository_dispatch`, handles `orders/create|paid` → `queue.orderCreated()`, `inventory_levels/update` → `queue.stockLow()` + direct A7 dispatch, `products/*` → log only). This is real, working webhook→queue plumbing — with nothing downstream of the push.
- **Manual/CI:** `a9-legal-compliance` (dispatch-only, correct), `hitl-approve` (dispatch — Guy's approval actuator), `a6-email-sync` (push+dispatch), `structure-lint` (push), `verify-self-heal` (dispatch).

So the honest gap list for "webhooks → queue → worker" is short: the webhook half exists end-to-end; **the missing pieces are exactly (a) Q-HARDEN, (b) any consumer at all, (c) a sweeper/reconciliation loop.** That's it. This is a much smaller build than "event-driven migration" sounds.

---

# PART II — THE TARGET-STATE DESIGN

## 2.1 The orchestra has three sections, deliberately unequal

**Section A — Editorial & Intelligence: stays on cron. Forever, until proven otherwise.**
A1, A3, A4, A5, A8, A10, A11, A12, A13, A14, A15, A16, A19-A28 — everything whose output is a report, a draft, a scan, or a digest. The argument, so it never gets relitigated: their work is *time-based, not event-based* (a weekly trend scan has no triggering event; "it's Monday" is the event); a missed run costs approximately nothing (the next run covers it — there is no customer waiting); cron on GitHub Actions is free, observable in one UI, and debuggable by rerun; and moving them to events would add a queue hop, an ack protocol, and a new failure mode in exchange for **zero latency benefit** — nobody is waiting for the blog post at second-granularity. Migrating these to the queue would be architecture as fashion. The Zero-Waste principle already in Iron Law 3 covers this: infrastructure that adds no output is waste.

The one legitimate future exception: the A1→A2 `product.approved` hand-off (the queue's `UPLOAD` lane was built for it). Even that is weekly-cadence editorial work today; migrate it only if product throughput ever becomes a real pipeline (Phase 4 private-label era), and treat it then as a convenience, not a necessity.

**Section B — Transactional: event-driven, exactly as the constitution already says.**
A2.7 and A16.5, per their committed skeleton entries. The full path, naming every piece and whether it exists:

```
Shopify webhook (orders/paid)                     — EXISTS (register_webhooks.js + Make.com relay)
  → repository_dispatch → shopify-webhook-handler — EXISTS
    → queue.push('sa:queue:orders', …)            — EXISTS (journal write included)
    → [NEW] inline consumer step in the same
      workflow run: pop-with-ack → A2.7 worker    — DOES NOT EXIST (this is A2.7 itself)
        → HITL ramp: first 10 orders write the CJ
          payload to pending_approvals, Guy
          approves via hitl-approve.yml            — PATTERN EXISTS (hitl-execute.js), per skeleton
        → after 10/10 clean: auto-place, idempotent
          on shopify_order_id, `fulfillments` row  — DOES NOT EXIST (per skeleton, Phase 2)
  → [NEW] sweeper cron (queue-drainer.yml, every 30
    min): requeue stuck `processing`, retry failed
    ≤3, dead-letter + Telegram + pending_approvals — DOES NOT EXIST
  → daily reconciliation cron: Shopify paid orders
    ↔ fulfillments at 0% discrepancy               — DOES NOT EXIST (mandated by skeleton)
```

Design rule to lock: **every event path gets a reconciliation cron shadowing it.** Events are for speed; the daily sweep is for truth. A dropped webhook (Make.com hiccup, GitHub outage) must be caught within 24h by comparing source-of-truth (Shopify) to effect (`fulfillments`), not discovered by an angry customer. This "events + reconciliation belt-and-braces" is the single most important sentence in this document.

**Section C — The conductor: A0 grows actuators on a trust ladder.**

## 2.2 What A0 becomes: the actuation ladder

**Rung 0 (today): observe and report.** Keep. Correct at current scale.

**Rung 1 — Re-dispatch, allowlisted, once.** The smallest actuation worth building, and the only one I endorse for early Phase 2:
- When `generateDecisions()` emits `AGENT_FAILING` for an agent on an explicit **retry allowlist**, A0 calls `createWorkflowDispatch` on that agent's workflow (mechanism already proven in-repo, §1.1). Max **one retry per agent per 24h** (a `orchestrator_actions` Supabase table is both the rate-limiter and the audit log).
- **The allowlist is the safety design, so get it right:** only idempotent, non-publishing agents — A7, A8, A10-A13, A19-A22, A26 (scan/report agents; a re-run at worst re-scans). **Never** A3/A5 (a retry after a partial run can double-publish a blog post or Instagram post — the QA-gate incident history says treat publishing agents as radioactive to automation), never A2/A2.5 (writes to the store), never A4 (spends money), never A9 (opens HITL requests), and A2.7's retries belong to its own queue semantics, not to A0.
- **Trust ramp, mirroring A2.7's HITL ramp exactly:** the first 10 Rung-1 actions run in *propose mode* — A0 writes the intended action to `pending_approvals` and Telegrams Guy "אני מציע להריץ מחדש את X, סיבה Y" with the approve path. After 10 proposals with zero bad calls, flip a `system_config` flag and A0 acts first, reports after: "הרצתי מחדש את X (ניסיון 1/1), סיבה Y". The Telegram grammar shift — from *please act* to *acted, FYI* — is the entire cultural change, delivered through the alerting standard that already exists rather than around it.

**Rung 2 — Quarantine flapping agents.** Trigger: same agent fails ≥3 runs in 7 days (computable from `agent_health_log`, which A0 already reads). Action: stop Rung-1 retries for it, set `quarantine:<agentId>=true` in `system_config`, escalate to Guy at critical severity. Enforcement requires each agent to check the flag at startup and exit `DORMANT` if quarantined — a ~5-line addition to the shared startup path, rolled out fleet-wide once. This is Phase 3 tier: it only pays for itself when a flapping agent can burn something (Actions minutes, API quota, Guy's attention) faster than a weekly human glance catches it, which is not true today.

**Rung 3 — DO NOT BUILD (the over-engineering line, drawn explicitly):** dynamic work reordering, a DAG scheduler where A0 dispatches the whole pipeline, priority queues, an LLM-in-the-loop making orchestration decisions, autoscaling anything. Why: the fleet's real DAG is shallow (A1→A2→A3/A5 and everything else independent), the cadence is weekly, and GitHub's cron is a perfectly good scheduler for it. An A0 that dispatches everything becomes the single point of failure for a fleet that currently has none — today, A0 can die and 29 agents keep working; invert that and you've built fragility and called it sophistication. A company at this scale earns a DAG scheduler at roughly the point it earns a second human, and probably later. If a future stage proposes Rung 3, the burden of proof is a named, recurring incident that Rungs 1-2 demonstrably could not have handled.

## 2.3 How this composes with the existing safety nets (not around them)

- **`pending_approvals` (HITL)** becomes the universal actuation gate: A2.7's first 10 orders, A0's first 10 retries, and the dead-letter queue all drain through it. One approval surface, one `hitl-approve.yml` actuator, one habit for Guy. No new approval UI, ever, until the Command Center Phase C dashboard subsumes it.
- **Telegram standard**: unchanged format, new verb tense. Alerts stay alerts; Rung-1+ adds action-reports. Every autonomous action produces exactly one Hebrew Telegram line — silence-on-action is banned from day one (this is the A5-silent-failure lesson applied prophylactically).
- **Command Center**: `orchestrator_actions` joins the snapshot, so the weekly digest answers "מה A0 עשה לבד השבוע" in one table. Autonomy without a ledger is how trust dies; the ledger *is* the feature.
- **A0's existing queue-depth check** (`QUEUE_DEPTH_WARN=20`) finally gets meaning once consumers exist: depth >20 with a live consumer means the consumer is stuck → that is itself a Rung-1 retry trigger for `queue-drainer.yml`.

---

# PART III — DEVIL'S ADVOCATE, THEN THE PHASED PLAN

## 3.1 The honest answer to "is this worth building now": No.

Unhedged: **a 0-order company should not build an event-driven orchestration layer, and "cron + good monitoring + Guy as the exception handler" is not a compromise — it is the correct architecture for this stage.** Reasons, in strength order:

1. **The cost of the status quo is zero.** Every agent that can fail today is editorial. A failed weekly run costs nothing measurable: Telegram reports it same-day, the next cron covers it in ≤7 days, and no customer exists to notice. Orchestration exists to reduce cost-of-failure and cost-of-delay; both are currently ~$0. You cannot optimize a zero.
2. **The freeze is right, and this would violate its spirit even where it dodges the letter.** The project's documented #1 burn pattern is perfecting a customer-less machine. An orchestration layer is the *most seductive possible version* of that burn — deep, elegant, infinitely refinable, and worth nothing until volume arrives.
3. **The "orchestra" is more assembled than it feels.** Shared state (Supabase), shared standards (Telegram/metrics/health-log), one monitor, one approval gate — the coordination substrate exists. What's missing is *actuation*, and actuation without load is a demo.
4. **Premature orchestration adds failure surface.** Every ack protocol, sweeper, and retry policy is new code that can itself fail — and at this scale would fail *more often than the thing it protects*.

The one nuance that keeps this from being pure deferral: **the design must exist before the trigger fires** — because when order 26 arrives, the correct move is to execute a blueprint, not to design under fulfillment pressure. That is this document. The queue substrate already built is not waste; it is pre-positioned and correctly shaped. It should simply keep waiting, exactly as it is, for its first real customer: A2.7.

And a reframe for Guy, because the question deserves it: what you can do *now* toward "one big orchestra," freeze-compliantly, is not code — it is the six sitting decisions and the first 25 orders. The orchestra's missing piece is the audience. Everything in Part II is written, costed, and waiting; ship the launch plan and the triggers below will fire on their own.

## 3.2 The phased plan (each phase names its trigger — nothing starts without it)

**O-0 — Now (freeze-compliant, zero code):**
Guy reads this doc and approves it as the Phase 2 orchestration blueprint (or amends it). Nothing else. Deliverable already in hand: this file, referenced from the tracker.

**O-1 — At `PHASE_2_ACTIVATE_BY_GUY` (25 orders OR $1K MRR — the constitution's existing trigger):**
Build order within the A2.7 project (this *is* the event-driven pilot — shadow mode of the real thing, not a throwaway pilot on a toy lane):
1. **Q-HARDEN** (§1.2): ack-on-pop via `LMOVE`+`complete()`, `queue_log` lifecycle (`pending→processing→done/failed`, attempts), DLQ→`pending_approvals`+Telegram. One PR, testable offline with `DRY_RUN`.
2. **`queue-drainer.yml`** sweeper (30-min cron): requeue stuck, retry ≤3, dead-letter overflow.
3. **A2.7 shadow mode** = the skeleton's HITL ramp: webhook→queue→consumer runs the full chain but terminates in a `pending_approvals` row with the drafted CJ payload; Guy approves via `hitl-approve.yml`; placement executes on approval. First 10 orders. This validates every pipe with a human valve at the end.
4. **A2.7 auto mode** after 10/10 clean + the skeleton's gate tests (3 mock DRY_RUN orders, 1 real self-addressed order) + **daily reconciliation cron live before auto mode, not after.**

**O-2 — A2.7 live and clean for ~1 month, or ~50 cumulative orders (whichever first):**
5. **A16.5** on inbound-message events, per its skeleton entry (hard-depends on A2.7's `fulfillments` data and the attorney-approved policy corpus — both are gates, don't build around them).
6. **A0 Rung 1** in propose mode (§2.2). Trigger rationale: this is the point where a failed run first costs real money/hours, so auto-retry first earns its keep here — not before.

**O-3 — Phase 3 trigger ($5K MRR × 2 months), or earlier if a real flapping incident occurs:**
7. **A0 Rung 2** quarantine (kill-switch in `system_config`, fleet-wide startup check).
8. Reassess the consumer runtime: if order volume or Actions-minutes pressure warrants, move the A2.7 consumer to a Supabase Edge Function behind the same queue contract (§1.3). Decision, not default.

**Never (until a named recurring incident proves otherwise):** Rung 3 — DAG scheduling, reordering, LLM-driven orchestration, migrating editorial agents off cron.

## 3.3 Concrete handoff for Claude (Opus/Sonnet), per phase

- **O-1.1 Q-HARDEN** — `corp/core/queue.js`: add `complete(queue, eventId)`, `fail(queue, eventId, err)`, change `pop()` to `LMOVE src → src:processing` returning `{event, ack, nack}`; new `requeueStale(queue, olderThanMin)`. SQL: `alter table queue_log add column attempts int default 0, add column processed_at timestamptz` (idempotent-guarded per the Stage 12 SQL rules). Unit-test with Upstash absent (no-op path) and present.
- **O-1.2 `queue-drainer.yml`** — new workflow, cron `*/30`, dispatch fallback; runs a small `corp/core/queue-drain.js`: `requeueStale` all 5 queues, re-attempt failed ≤3 via the registered consumer map (initially only `sa:queue:orders`→A2.7 handler), dead-letter + `notifyTelegram` (canonical Hebrew format) + `pending_approvals` insert on overflow. Note: this workflow is new infra — it ships **inside the A2.7 build at Phase 2**, never before.
- **O-1.3/1.4 A2.7** — implement per its `PHASE_ARCHITECTURE_SKELETON.md` entry verbatim (it is the spec; do not re-derive). Consumer runs inline in `shopify-webhook-handler.yml`'s `handle-order` job as an added step after the existing queue push.
- **O-2.6 A0 Rung 1** — `corp/core/orchestration/index.js`: new `executeDecisions(decisions, {mode})` honoring `RETRY_ALLOWLIST` (hardcoded const, per §2.2 — publishing/spending agents excluded *in code*, not config); `orchestrator_actions` table (RLS ON, service-role policy per Stage 12 patterns); `agents/A0_orchestrator/agent.js` gains the propose-mode branch writing to `pending_approvals`. Auto-mode flip = `system_config` key `a0_actuation_mode: propose|auto`, changed only by Guy.
- **O-3.7 Rung 2** — shared startup guard in `corp/core/` (one function, required by all agents' boot path) checking `system_config.quarantine:<id>`; A0 sets it on the 3-in-7 rule; Telegram escalation critical-severity.
- Every item above: Telegram on failure (Pre-Deploy Gate rule 5), `writeMetrics()` KPIs (rule 6), RLS ON for new tables, and the skeleton's Phase 2 Gate tests as the acceptance bar.

---

# What I would tell Guy in one sentence

The orchestra you asked for is two instruments short — fulfillment and customer service, both already on the score for Phase 2 — and one conductor's baton (a single, allowlisted, retry-once actuator for A0) away from complete; everything else is already playing in time, and the only thing to build right now is nothing: go sell 25 pairs of socks, and this blueprint will be waiting exactly where you left it.

**End of design.**
