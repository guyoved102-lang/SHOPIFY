# FABLE 5 — Autonomous Operating System Roadmap ("The Connectivity Fabric")
**Dispatched 06/07/2026 (Fable 5, Lead Strategic Architect; executed by Sonnet). Design document only — zero code shipped by this stage except where explicitly marked optional below.**
**Supersedes: —. Extends:** `FABLE5_STAGE18_ORCHESTRATION_ARCHITECTURE.md` (A0's actuation ladder + O-0/O-1/O-2/O-3 triggers), `FABLE5_STAGE16_DELIVERABLES.md` (the A2.7/A16.5 amendment), and `CLAUDE.md`'s existing "MCP Servers — Corporate Function Map" table.

> **READ THIS FIRST — the constraint that governs every line below.**
> The **Backend Feature Freeze** (`CLAUDE.md`, Iron Law 1 completion clause, added 05/07/2026, approved by Guy) is ACTIVE: *"עד PHASE_2_ACTIVATE_BY_GUY: רק תיקוני bugs, פריטי launch-plan, ותפעול תוכן. אפס agents/modules/tables/workflows חדשים."* Zero new agents/modules/tables/workflows until Guy manually activates Phase 2 at **25 orders OR $1,000 MRR**. This document is a **Stage-18-style approved-blueprint-now / build-later** artifact. Nothing here is built today except (a) documents and (b) one explicitly optional, narrowly-scoped instrumentation pilot (§7). Every build item names the trigger that unlocks it. Approving this doc costs zero code.

## 0. Executive framing — what "10/10 Autonomous OS" actually means here

Guy, the honest reframe first, because it changes what "definitive automation fabric" should contain. This is not an *Agent-based reporting* project that needs to *become* an autonomous OS. It is a 30-agent corporation that already shares one Supabase brain, one Telegram nervous system (`corp/core/telegram.js`), one approval gate (`pending_approvals` + `corp/core/hitl.js`), one health monitor (A0 + `agent_health_log` + `corp/core/orchestration/index.js`), and one fleet-wide crash reflex (`corp/core/self-heal.js`). The "fabric" is roughly 80% woven. What is genuinely missing is not a grand new layer — it is **three specific joins and one policy retrofit**:

1. **A consumer for the event queue.** `corp/core/queue.js` pushes `orderCreated`/`stockLow` events and journals them to `queue_log`, but `pop()` has *zero importers anywhere*. Nothing drains the queue. (This is Stage 18's "Q-HARDEN," already designed, not yet built.)
2. **The two transactional instruments** — A2.7 Fulfillment and A16.5 Customer Service Desk — already written into the constitution (Stage 16), still unbuilt.
3. **A single HITL retrofit on A5** — which today publishes to Instagram *fully autonomously* (`agents/A5_social/agent.js:557-567`), a live violation of the 10/10 "human-in-the-loop only" rule.
4. **Observability that is written but dead** — `corp/core/observability.js` (LangFuse) has zero importers.

Everything else in this roadmap is *governance* — deciding which connections earn their place, and designing the fail-safe *before* the connection, not after. That is the "Connectivity Filter," and it is the highest-value part of this document, because the project's documented #1 failure mode is perfecting a customer-less machine. This document's job is to make the fabric *complete and bulletproof* while forbidding it from *growing* before there is order volume to justify it.

**The naming rule (avoiding a known hazard).** This project already has an "SA-Cluster Phase 1–6" and a "Brand-Architecture Phase 1–5"; a bare "Phase 1/2/3" here would be a third, ambiguous system and has already caused doc drift once (ANTI_RECURRENCE #31). This roadmap therefore uses **three named tracks** bound to Stage 18's existing revenue triggers — never bare phase numbers:

| Track | Meaning | Bound to Stage 18 trigger | Revenue gate |
|---|---|---|---|
| **CONFIG TRACK** | Docs + read-only config, zero backend surface | **O-0 (now)** | none — freeze-compliant today |
| **EVENT TRACK** | Webhook → Claude → action, HITL-gated | **O-1** | `PHASE_2_ACTIVATE_BY_GUY` (25 orders / $1K MRR) |
| **AUTONOMY TRACK** | Self-optimizing loops + circuit-breaker monitoring | **O-2 → O-3** | O-2: A2.7 live+clean 1mo or ~50 orders · O-3: $5K MRR × 2mo |

These map onto Guy's mission "Phase 1 / Phase 2 / Phase 3" but are named so they can never be misread as SA-Cluster phases. Meta CAPI keeps its own existing label: **"Phase 2 gate"** (the constitution's term), which coincides with O-1.

---

## 1. The Connectivity Filter — grading every connection

**Grading rubric.** Each connection scored on two axes, then given a verdict:
- **Superpower (leverage 1–5):** how much autonomous capability it unlocks that cannot be gotten another way.
- **Surface-for-Failure (risk 1–5):** ongoing maintenance overhead + blast radius if it breaks/leaks + attack surface.
- **Verdict logic:** high Superpower + low Surface = **ADOPT**. High both = **ADOPT-WITH-BREAKER** (only if the circuit breaker is designed *first*). Low Superpower + any Surface = **REJECT/HOLD** (the "toy" filter). A read-only connection drops one risk point automatically (no write blast radius).

> **This table reconciles with `CLAUDE.md`'s "MCP Servers — Corporate Function Map" — it does not create a second source of truth.** Where a grade here changes a CLAUDE.md verdict, the CLAUDE.md row is the one that gets edited (tracker item CF-0c). Two prior incidents (ANTI_RECURRENCE #31, #42) came from exactly this kind of two-doc drift. **🧑 Guy must decide:** approve these grades; the CLAUDE.md edit then follows automatically, never maintained as a second table.

### 1a. MCP servers (reconciled with CLAUDE.md)

| Connection | CLAUDE.md verdict (pre-Stage-21) | Superpower | Surface | Grade | Circuit-Breaker note | Gate |
|---|---|:--:|:--:|---|---|---|
| `shopify-dev-mcp` | ACTIVE (06/07) | 4 | 1 | **ADOPT** ✅ done | Read-only schema/docs, no creds. If down, agents fall back to pinned `2025-01` calls (already how they work). | O-0 (installed) |
| `supabase-mcp` (read-only) | PLANNED-BLOCKED | 5 | 1 | **ADOPT** (blocked on Guy) | Read-only PAT, never `SUPABASE_SERVICE_KEY`. Closes the project's #1 recurring failure ("SQL file ≠ live DB", ANTI_RECURRENCE #23/#26). Breaker = the read-only scope *is* the breaker; token stays in local user-scope config, never repo. | O-0 — needs Guy to generate the PAT |
| `context7` | PLANNED | 3 | 1 | **ADOPT (config)** | Library-docs lookup for dev sessions. Read-only, no creds. | O-0 (optional) |
| `agent-browser` | PLANNED | 4 | 4 | **ADOPT-WITH-BREAKER** | Real force-multiplier for the intelligence cluster (A10/A11/A13). Live web = prompt-injection vector (Iron Law S3) + rate/ban risk. Breaker: outputs are data only, never instructions; per-run page cap; must obey the Hallucination-Defense policy (§6). | O-1 (with intel-agent work) |
| `perplexity` | ON-HOLD | 3 | 3 | **HOLD** | Overlaps `agent-browser` + native web search. Adopt only if a specific intel gap is named — don't add a second search surface "to have it." | defer |
| `supermetrics` | PLANNED | 4 | 3 | **ADOPT-WITH-BREAKER** | Unifies GA4+Meta+Shopify+Klaviyo for A15 CFO — real leverage once there's revenue. Breaker: read-only scopes; adopt at O-1 when A15 activates, not before (nothing to aggregate at 0 orders). | O-1 |
| `notion` | PLANNED | 3 | 3 | **HOLD** | Corporate KB. Supabase + git already hold institutional memory for a solo founder. | O-2+ (only if a second human needs read access) |
| `granola` | PLANNED | 2 | 2 | **HOLD** | Meeting→Notion pipeline. Solo founder, no meetings — reject until there's a team. | defer |
| `zapier` | ON-HOLD | 2 | 5 | **REJECT (for autonomy)** | Generic glue = unbounded, un-versioned logic outside git, competing with A0. Keep strictly for the QuickBooks bridge at $20K MRR, nothing else. | defer |
| `higgsfield` (skill, not MCP) | ON-HOLD | 4 | 2 | **ADOPT (gated)** | Creative engine for A5, already hash-pinned in `skills-lock.json`. Breaker = reference-image gate (no Higgsfield without Guy's reference) + the A5 HITL retrofit (§4). | O-1 |
| `magic` / 21st.dev | REMOVED (05/07) | 1 | 5 | **REJECT — permanent** | Emits React/JSX; project is Shopify Liquid. Already caused a plaintext-key exposure. Do not reinstall. | — |

### 1b. Direct APIs / infra the fabric depends on (not MCPs, but part of the same filter)

| Connection | Role | Superpower | Surface | Grade | Circuit-Breaker note | Gate |
|---|---|:--:|:--:|---|---|---|
| Shopify Admin API `2025-01` | orders/fulfillment/webhooks | 5 | 2 | **ADOPT** (in use) | Version pinned (Iron Law 3). Reconciliation cron shadows every webhook. | live |
| Shopify Webhooks → Make.com → `repository_dispatch` | event source | 5 | 3 | **ADOPT-WITH-BREAKER** | Push half works; Make.com is a single point of failure. Breaker: daily Shopify↔`fulfillments` reconciliation catches any dropped webhook within 24h. | live push / O-1 consume |
| Upstash Redis (`queue.js`) | event queue | 4 | 3 | **ADOPT (needs Q-HARDEN)** | Push works, no consumer, no ack. Breaker = Q-HARDEN: ack-on-pop, retry ≤3, dead-letter → `pending_approvals`. Free-tier quota is a named trap (Circuit-Breaker Map). | O-1 |
| Meta Graph API v20.0 (IG/FB publish) | A5/A4 social | 4 | 5 | **ADOPT-WITH-BREAKER (blocking)** | **Highest-risk connection in the fabric.** Autonomous posting = ban risk + brand-voice risk. Breaker = the A5 HITL retrofit (§4) + rate-limit breaker (Circuit-Breaker Map). **Do not run A5 live until the retrofit ships.** | retrofit before any live use |
| Meta CAPI (Conversions API) | server-side events | 4 | 3 | **ADOPT (Phase 2 gate)** | Docs-only today, spec identical in three places. Placed, not redesigned (§5). Breaker: SHA256 PII hashing + `event_id` dedup already specified. | Phase 2 gate (= O-1) |
| Gmail API / IMAP (multi-inbox) | inbound email | 4 | 4 | **ADOPT-WITH-BREAKER** | Multi-inbox command center (see companion doc). Breaker: read-only where possible; `hello@` via ImprovMX forward (D4, in flight); auto-reply allowlist stays narrow. | O-2 (A16.5) |
| LangFuse (`observability.js`) | LLM tracing | 4 | 1 | **ADOPT (pilot now)** | Written, dead (zero importers). Pure observability, no write blast radius. Makes every future cost/latency claim provable instead of asserted. See §7. | O-0 pilot / O-1 fleet |
| Telegram Bot API (`telegram.js`) | alerting | 5 | 1 | **ADOPT** (in use) | Canonical Hebrew format is the only sanctioned alert path. If Telegram fails, `self-heal.js` + email are the fallback. | live |
| CJ Dropshipping API | fulfillment | 5 | 3 | **ADOPT (A2.7)** | Transactional. Idempotent on `shopify_order_id`; reconciliation cron. | O-1 (A2.7) |

**Toy-integration rejections, stated plainly:** `granola`, standalone `perplexity`, generic `zapier`-as-glue, and any "AI browses the web and acts" pattern without the Hallucination-Defense gate. Each fails the filter on Superpower ≤ Surface.

---

## 2. The phased blueprint — mapped onto Stage 18's O-triggers

This blueprint **is Stage 18's rung/trigger scheme, extended** — not a competing scheme. Stage 18 already defined A0's actuation ladder (Rung 0 observe / Rung 1 allowlisted re-dispatch / Rung 2 quarantine / Rung 3 DO-NOT-BUILD) and triggers O-0/O-1/O-2/O-3. This roadmap slots new work into those same triggers.

### CONFIG TRACK — O-0 (now, freeze-compliant, zero backend surface)

| ID | Item | Owner |
|---|---|---|
| CF-0a | Approve this roadmap + the Connectivity Filter grades as the definitive fabric blueprint | 🧑 |
| CF-0b | Generate a Supabase read-only PAT → unblock `supabase-mcp` (closes the #1 recurring failure) | 🧑 |
| CF-0c | Reconcile CLAUDE.md's MCP table with §1's grades (edit in place, single source of truth) | 🤖 |
| CF-0d | LangFuse **pilot**: wire `observability.js` into ONE agent (A3 or A8) as a bug-class instrumentation change — see §7 | 🤖 (needs Guy's go-ahead) |
| CF-0e | Formalize the **Health-Check System** doc (composite of 4 existing mechanisms) — see §6 | 🤖 |
| CF-0f | A5 HITL-retrofit *design* (code gated to O-1) — see §4 | 🧠 done here |

### EVENT TRACK — O-1 (at `PHASE_2_ACTIVATE_BY_GUY`)

Built as **one program**, in Stage 18's order (fulfillment first — a COO report about hand-fulfilled orders is a diary, not an OS):

1. **Q-HARDEN** (`queue.js`): ack-on-pop, `queue_log` lifecycle (`pending → processing → done/failed` + `attempts`), dead-letter → `pending_approvals` + Telegram. *(Stage 18 O-1.1.)*
2. **`queue-drainer.yml`** sweeper cron: requeue stale, retry ≤3, dead-letter overflow.
3. **A2.7 Fulfillment** shadow → auto (webhook → queue → consumer → CJ), HITL ramp on first 10 orders via `pending_approvals`, daily reconciliation cron live *before* auto mode.
4. **A5 HITL retrofit ships** (§4) — A5 may only go live *after* this. Meta Graph API stays dark until then.
5. **Meta CAPI** built server-side per existing spec (§5).
6. **LangFuse fleet-wide** — now that agent code is already open for this work.
7. **`supermetrics` + `agent-browser`** adopted with breakers (intel + CFO clusters activate here).

### AUTONOMY TRACK — O-2, then O-3

| Trigger | Item |
|---|---|
| **O-2** (A2.7 live+clean 1mo / ~50 orders) | **A16.5 CS Desk** on inbound-message events (hard-depends on A2.7 `fulfillments` + attorney-approved policy). **Multi-Inbox Command Center** goes live here (see companion doc). **A0 Rung 1** in *propose mode*. |
| **O-3** ($5K MRR × 2mo, or a real flapping incident) | **A0 Rung 2** quarantine (kill-switch via `system_config`, fleet-wide startup check). **Optional new capability:** A0 gains an **active liveness canary** (§6) — the one genuinely-new Health-Check capability, if Guy approves it. Reassess consumer runtime (Edge Function). |
| **Never** (until a named recurring incident) | **Rung 3** — DAG scheduling, LLM-in-the-loop orchestration, migrating editorial agents off cron. |

---

## 3. Multi-Inbox Command Center — summary

See the full companion document, `FABLE5_MULTI_INBOX_COMMAND_CENTER.md`, for the complete routing rules. In one paragraph: this extends A16.5 (the CS desk *is* the multi-inbox design) by adding Legal/Founder/Ops lanes on top of the already-designed Brand/CS lane, reconciled with the in-flight D4 email-auth fix. **Auto-Reply is allowed only for a narrow allowlist** (order-status/WISMO once A2.7 tracking data exists, FAQ-answerable questions, unsubscribe/opt-out acks). **Everything with money, anger, legal content, or a person's name in a complaint = Draft-and-Approve** via `pending_approvals` + Telegram. Gate: **O-2**, with A16.5.

## 4. Social HITL retrofit — A5 (and any future Facebook agent)

**The problem (verified live):** `agents/A5_social/agent.js:557-567` calls `publishToInstagram()` autonomously in LIVE mode the moment `META_ACCESS_TOKEN` + `META_IG_USER_ID` are set. The only gate is the automated Sonnet QA-gate (`corp/core/qa-gate.js`) — **no Guy approval step exists.** This violates the 10/10 rule ("AI generates → Guy approves with one click").

**The retrofit — reuse the exact A9 pattern, do not invent a new one:**
- A5 imports `requestApproval` from `corp/core/hitl.js` (the same export A9 already uses).
- After the QA-gate passes a post, A5 writes a `pending_approvals` row with a **new `action_type: 'social_post'`** (payload = caption + image URL + platform + scheduled slot), Telegrams Guy via `heTelegramMsg`, and **exits — it does not publish.**
- Add `case 'social_post'` to `corp/core/hitl-execute.js` (which currently dispatches `legal_page_update`/`price_change`/`meta_budget`/`blast_campaign`/`product_delete`). On approve, it calls A5's publish path.
- **Double-arm guard:** add an `A5_ARM` env flag (mirroring the real `A9_ARM` pattern in `agents/A9_legal_compliance/agent.js:25`, added after the 03/07/2026 incident, ANTI_RECURRENCE #35). A live post is blocked unless `A5_ARM=true`, so a stray run can never open a real publish request.
- **Same design pre-registers a future Facebook agent:** any external-publishing agent uses `action_type: 'social_post'` (or its own variant) + its own `_ARM` flag. One approval surface, one executor, one habit for Guy.

> **Precision note (corrects an earlier imprecise assumption):** `getApprovedHitL()`/`executeHitLPublish()` are *local functions inside `agents/A9_legal_compliance/agent.js`* (not exports of `hitl.js`). The reusable export from `hitl.js` is exactly `{ requestApproval, getApproval, resolveApproval, expireStaleApprovals }`. The retrofit above uses the real, exported API.

**Gate: retrofit design = O-0 (this doc). Retrofit code = O-1. A5 must not run LIVE before it ships** — until then A5 stays in its current safe state (DRY_RUN, no `META_ACCESS_TOKEN`).

## 5. Meta CAPI placement

No redesign. CAPI is docs-only, specified identically in CLAUDE.md's Iron Law 2, `VISION.md`, and `docs/superpowers/specs/2026-06-22-full-roadmap-design.md`: server-side, events PageView/ViewContent/AddToCart/InitiateCheckout/Purchase, SHA256 PII hashing, `event_id` dedup with the client pixel. **Placement: Phase 2 gate (= O-1), built in the EVENT TRACK.** Its circuit breaker is already in the spec (dedup + hashing); this roadmap adds one: **CAPI failures must alert via `notifyTelegram`, never fail silently** — a silently-broken CAPI corrupts every downstream ad-optimization decision without anyone noticing.

## 6. Health-Check System — the formalization decision

**Verdict: formalize the composite, build no new agent.** Proposing a fifth standalone "Health-Check Agent" would (a) violate the Backend Feature Freeze and (b) directly contradict Stage 18's explicit "build none of it now" verdict. The Health-Check System already exists as four working mechanisms; the deliverable is a **doc + dashboard exercise (zero new code)** that names them as one system:

1. **A0 Orchestrator** + `agent_health_log` + `corp/core/orchestration/index.js` (`runOrchestration()`, `CLUSTERS`, `STALENESS_HOURS`, cluster health scoring, HITL backlog, queue depths).
2. **`corp/core/self-heal.js`** — wired fleet-wide into every agent's `main().catch()`; classifies `infra` vs `code`, infra → HITL card, code → GitHub Issue (never an auto-PR).
3. **`sockacademy/scripts/ci/yaml-reality-audit.js`** — deterministic diff of every agent's YAML secrets/env vs `gh secret list` + `package.json`.
4. **PARANOIA MODE** self-audit checklist at every milestone.

**The one genuinely-new capability none of the four cover — a decision for Guy, not a default.** All four check *internal* state (did the agent run, is config consistent, did code throw). **None actively probes whether an *external* dependency is alive right now** — e.g., is the Meta token still valid, is the CJ API reachable, did SPF/DKIM silently drift (the exact D4 failure class), is Upstash within its free-tier quota. The D4 incident (a silent DNS/auth failure with zero alert until manually caught) is live proof this gap is real.

**Recommendation — framed as an A0 enhancement, not a new agent:** at **O-3**, A0 gains a **liveness-canary capability**: a scheduled pass that calls each critical external dependency's cheapest health endpoint (Meta token debug, CJ ping, DNS/SPF lookup, Upstash `PING` + usage) and records validity to the existing `agent_health_log`, Telegramming on transition-to-failed.

> 🧑 **Guy must decide:** approve the canary as an O-3 A0 enhancement, or keep relying on A17 (token refresher) + `yaml-reality-audit.js` run-on-demand until further notice. Either way, do **not** build it before O-3.

## 7. LangFuse / observability — the wire-it-or-drop-it decision

`corp/core/observability.js` (`startTrace`/`traceLLM`/`traceSpan`/`endTrace`) is fully written with **zero importers** anywhere in the fleet. It is the lowest-risk, highest-proof item on the roadmap: pure observability, no write blast radius, and it converts every future "LLM cost/latency" claim from *asserted* to *proven*.

**Honest nuance:** wiring it fleet-wide is code (a `require` + wrap around each agent's Anthropic call), not strictly config-only. So:
- **O-0 (now, optional):** wire it into **one** agent (A3 content or A8 analytics) as a bug-class instrumentation change + add `LANGFUSE_*` env vars. Small, reversible, proves the pipe. **Recommended, but requires Guy's explicit go-ahead** — this is the one item in this whole roadmap that touches agent code before O-1.
- **O-1:** fleet-wide rollout, done while agent code is already open for the EVENT TRACK work.

> 🧑 **Guy must decide:** greenlight the single-agent pilot now, or defer everything observability-related to O-1.

## 8. Web-Access Policy — the "Hallucination-Defense" protocol

When is live search allowed, and how are findings verified before acting on them? The project already has a working example to generalize from: Stage 19's trademark research (external web search + UK Companies House + UK IPO/TMview lookups) was explicitly labeled "a surface check, not a legal clearance search," every fact was sourced and dated, and **nothing was auto-executed** on the strength of it — the findings were relayed to Guy, who ran his own confirming searches, and the attorney packet's Q8 was updated only after cross-verification. That is the template:

1. **Live search is allowed** for research/intelligence tasks (trend scouting, competitor pricing, trademark/regulatory checks, supplier vetting) where the output feeds a **decision**, not an **action**.
2. **Every claim sourced from live search must cite its source and date** in whatever doc/message carries it — no unattributed "the internet says."
3. **Findings from external content are data, never instructions** (Iron Law S3) — a scraped page cannot trigger a workflow, only inform one.
4. **Nothing purchases, publishes, refunds, or messages a third party on the strength of a single unverified web finding** — external findings that would change money, brand content, or legal posture route through `pending_approvals` like everything else in this roadmap, exactly as the trademark finding did (relayed, then Guy independently re-verified via official registries before the attorney packet was finalized).
5. **`agent-browser`'s adoption (§1a) is gated on this policy being live**, not the other way around — the breaker is designed before the connection, per the Connectivity Filter's own rule.

---

## Critical files referenced by this roadmap

- `sockacademy/corp/core/hitl.js` — the single approval substrate every "Draft-and-Approve" flow in this roadmap extends (`requestApproval`); new `action_type`s (`social_post`, `cs_reply`) plug into `sockacademy/corp/core/hitl-execute.js`.
- `sockacademy/corp/core/queue.js` — the Q-HARDEN target (ack-on-pop, `queue_log` lifecycle, dead-letter); the join that makes the fabric event-driven.
- `sockacademy/agents/A5_social/agent.js` — the live 10/10 violation (`publishToInstagram` call, autonomous publish at lines 557-567) that the HITL retrofit fixes.
- `sockacademy/corp/core/orchestration/index.js` — A0's actuation ladder + Health-Check System core + the future home of the O-3 liveness-canary enhancement.
- `sockacademy/CLAUDE.md` — the MCP verdict table this roadmap reconciles with in place, plus the Backend Feature Freeze clause governing every gate above.

**End of roadmap.**
