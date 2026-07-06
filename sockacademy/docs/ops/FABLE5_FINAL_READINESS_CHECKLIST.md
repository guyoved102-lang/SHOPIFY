# FABLE 5 — Final Readiness Checklist (Stage 21 Capstone)
**Authored 07/07/2026 (Stage 21 capstone; Sonnet, per Guy's explicit "lean capstone" scope choice).**
**Supersedes: —. Companion to:** `FABLE5_AUTONOMOUS_OS_ROADMAP.md`, `FABLE5_MULTI_INBOX_COMMAND_CENTER.md`, `FABLE5_CIRCUIT_BREAKER_MAP.md`.

> **This doc cross-links, it never duplicates.** Every gate below points at the section of an existing
> Stage 21 document that actually defines it. Restating that content here a second time would recreate
> the exact two-sources-of-truth trap `FABLE5_CIRCUIT_BREAKER_MAP.md`'s blind spot #5 warns about
> (ANTI_RECURRENCE #31/#42) — so if a gate's wording ever needs to change, it changes in its source doc,
> and this checklist just keeps pointing at it.

## 0. Purpose

One deliberate go/no-go page before any lane of the fabric flips from designed to **Autonomous ON**.
Exactly **one manual-verify tripwire per domain** (Email · Social · Backend · Web), plus the single
"canary" metric that answers Guy's mandatory question. **Nothing flips before its named O-trigger has
fired *and* its gate below passes** — this doc adds no new triggers, it only makes the existing ones
checkable in one glance.

## 1. The four domain gates

| Domain | The one thing Guy verifies by hand | How to verify | Gate (must have already fired) | Source |
|---|---|---|---|---|
| **Email** | D4 is fully live — MX exists on `sockacademy.store`, `hello@` actually receives (ImprovMX forward), SPF/DKIM/DMARC pass, and Shopify's Sender email is `hello@sockacademy.store` — **never** a `@gmail.com` address | Send a real test message to `hello@sockacademy.store`; confirm it lands in the forward target. Independently re-run the DNS check (`nslookup` for MX/SPF) | **O-2** (A16.5 / Multi-Inbox go-live) | `FABLE5_MULTI_INBOX_COMMAND_CENTER.md` §2; tracker "Waiting on Guy" #2 (D4, in flight) |
| **Social** | The A5 HITL retrofit has shipped, and A5 stayed DRY_RUN the entire time until it did | Before the retrofit: confirm no `META_ACCESS_TOKEN` is set on A5's live path. After: confirm a QA-gate-passed post writes a `pending_approvals` row (`action_type:'social_post'`) and **publishes nothing** unless `A5_ARM=true` **and** Guy clicks approve | **O-1** | `FABLE5_AUTONOMOUS_OS_ROADMAP.md` §4 |
| **Backend (the money path)** | Q-HARDEN is live and the daily Shopify↔`fulfillments` reconciliation cron runs at **0% discrepancy** | Place one real (or sandbox) paid order; confirm a `fulfillments` row is created — no order sits silently unprocessed | **O-1** | `FABLE5_CIRCUIT_BREAKER_MAP.md` §4 + §"Answer to Guy's mandatory question" #1 |
| **Web** | The Hallucination-Defense policy is actually enforced **before** `agent-browser` is adopted | Confirm every external-search finding used in a decision carries a source + date, and that nothing purchases/publishes/refunds/messages a third party on the strength of one unverified web finding — all such actions still route through `pending_approvals` | **O-1** | `FABLE5_AUTONOMOUS_OS_ROADMAP.md` §8 |

## 2. The canary — Guy's mandatory question, answered once, not re-derived

**The single biggest architectural trap that would fail silently rather than loudly:** a paid Shopify
order that never gets fulfilled, because `queue.js`'s `pop()` has no consumer today and nothing else
confirms an order arrived beyond Shopify's own staff notification. The fabric can look 100% complete on
paper while this one path — the only one that touches money — quietly dead-ends.

**The one canary metric:** the daily reconciliation's **discrepancy count between Shopify paid orders
and `fulfillments`**. The moment it is anything other than **0**, that is the alert — truth catches what
an event silently dropped, before a customer ever has to.

Full detail, plus the other seven ranked blind spots, live in `FABLE5_CIRCUIT_BREAKER_MAP.md` §4 and its
closing "Answer to Guy's mandatory question" section — this is a pointer, not a restatement.

**The meta-answer, unhedged (carried over verbatim in spirit):** completeness is not readiness. This
fabric can be bulletproof on paper and still be worth nothing until order #25 gives it something to
conduct.

## 3. The standing rule

No lane flips to **Autonomous ON** before **both**:
1. its named O-trigger (O-1/O-2/O-3) has actually fired, **and**
2. its §1 manual-verify above passes.

Build no breaker, and arm no autonomy, before its trigger. This checklist is the single page Guy reads
to confirm both are true — the rest of the reasoning stays in the three source documents.

**End of checklist.**
