# FABLE 5 — Master Action Tracker
**Created 05/07/2026, after Stage 15 (Lead Strategic Architect full-project review).**

**Purpose:** a single living checklist of everything Fable 5 has recommended and everything still
to come — status, owner, and outcome per item. `FABLE5_INITIATIVE_LEDGER.md` stays the
chronological log of what each Fable dispatch produced; this file is the cross-cutting status board
that gets checked off as items actually execute. Update this file (not the ledger) whenever an item's
status changes. New Fable dispatches append new items here rather than starting a new tracker.

**Owner legend:** 🧑 Guy-only decision · 🤖 Claude (Sonnet/Opus) executes · 🧠 Fable drafts/analyzes first.

---

## 📍 Waiting on Guy — prioritized, updated 15/07/2026

Every 🤖-only item with zero decision-blocker has now been executed (see the Log at the bottom for
the full 06/07/2026 overnight + Phase-1 batch). **Everything below requires Guy personally** — reading
this list top-to-bottom is the fastest way back into the project. Nothing here is time-critical in the
sense of "the business breaks tomorrow" — but items 1-2 have the worst cost-of-delay asymmetry in the
whole tracker (cheap now, potentially catastrophic later), so they're listed first on purpose, not by
document order.

0. **✅ DONE 11/07/2026 — A5 live-posting stopped (Part 1) AND full HITL retrofit built (Part 2).**
   Original problem (10/07): `agents/A5_social/agent.js:45` computed `DRY_RUN = !ACCESS_TOKEN || !IG_USER_ID`,
   and once `META_ACCESS_TOKEN`/`META_IG_USER_ID` were set in GitHub Secrets, DRY_RUN silently evaluated
   `false` — A5 was posting to Instagram live with zero human approval, a real violation of Guy's 10/10
   human-in-the-loop rule (flagged Stage 21 CF-1b). Two-part remediation, both agreed in Guy's "Legal &
   Autonomy Reset" prompt (10/07):
   1. **Done 11/07/2026 (Guy approved: "מאשר").** Interim hard stop: `DRY_RUN = true;` hardcoded.
      Superseded same day by Part 2's proper fix (below).
   2. **Done 11/07/2026 (Guy approved: "מעולה תעשה את זה") — CF-1b closed.** Full HITL retrofit, mirroring
      A9's exact pattern:
      - `agent.js`: `DRY_RUN` is env-derived again; new `A5_ARM` env flag is a second, independent gate
        (mirrors `A9_ARM`, ANTI_RECURRENCE #35) — both must be set before a real approval request opens.
      - `agent.js`: direct `publishToInstagram()` Meta API call removed entirely from this file. A
        QA-approved post now calls the shared `requestApproval()` (same one A9 uses) with
        `actionType: 'social_post'` instead.
      - `corp/core/hitl-execute.js`: new `action_type === 'social_post'` branch — this is the ONLY place
        the real Instagram Graph API call happens now, and only after Guy approves via `hitl-approve.yml`.
      - `.github/workflows/hitl-approve.yml`: added `META_IG_USER_ID` secret (had `META_ACCESS_TOKEN` only).
      - `.github/workflows/a5-social.yml`: added explicit `DRY_RUN: 'true'` to the cron env (was implicit/
        hardcoded before) — deliberately did **not** add `A5_ARM` here, so going live later requires Guy to
        edit the workflow file directly (two deliberate changes: `DRY_RUN: 'false'` + `A5_ARM: 'true'`),
        never just a workflow_dispatch button click. Exactly mirrors A9's `A9_ARM` omission from its YAML.
      **Verified:** `node --check` clean on both changed .js files, `node scripts/ci/verify-fleet-status.js`
      green (no drift). **Not verified:** a live end-to-end smoke test of the new `social_post` HITL path
      was NOT run (would cost real Anthropic/OpenAI tokens and send Guy one real approval email) — the
      scheduled cron stays `DRY_RUN=true` so production behavior is unchanged until Guy deliberately arms it.
      If Guy wants a controlled test before trusting this in production, ask to run one with a `_test:true`
      payload (already supported by `hitl-execute.js`'s generic short-circuit) so it stops before the real
      Meta API call.
1. **🔴 Trademark check — ESCALATED + RESOLVED (self-search phase) 06/07/2026** (`FABLE5_STAGE19_BLIND_SPOTS.md`
   §E2) — Guy ran the self-search himself and cross-verified via two independent sources (UK IPO direct +
   TMview/WIPO Global Brand DB): confirmed **REGISTERED** UK trademark `UK00003187452`, "Sock Academy"
   (Sock Academy Limited), Class 25 ("Socks and clothing"), filed 23/09/2016, expires 23/09/2026 — a
   confirmed live registered mark in the exact goods class, our primary conflict. Also found a separate,
   unrelated entity "Dance Sock Academy Limited" with Class 25 marks in New Zealand + Australia (different
   name, lower relevance) and two irrelevant substring false-positives (disregard). USPTO (US) and
   EUIPO (via TMview cross-office search) both came back clean — no apparent US or EU-wide conflict. ILPO
   (Israel) remains unconfirmed (input error, not re-run) — leave to the attorney. Q8 in
   `FABLE5_ATTORNEY_PREP.md` and the Gmail attorney-packet draft have both been updated with the full,
   precise picture. **Self-search phase is done** — remaining steps are Guy-only: real attorney email in
   place of the placeholder, the 4 legal-doc PDFs/Word attached, internal note deleted, then send.
   **06/07/2026 — Guy confirmed steps 1-3 done (attaching the Word/RTF export, replacing the placeholder
   email); draft not sent yet.** He explicitly asked to hold step 4 (delete the internal
   "[INTERNAL NOTE TO SELF — DELETE BEFORE SENDING]" reminder block in the Gmail draft body) until he
   says the trigger phrase **"אני הולך לעורך דין"** (I'm going to the attorney) — treat that phrase,
   whenever it's said (this session or a future one), as the cue to walk him through deleting that note
   and doing a final pre-send check before he actually sends the packet.
   Highest cost-asymmetry item in the project, now with hard evidence instead of a hypothesis.
2. **🔴 Shopify email authentication (§D4) — IN PROGRESS 06/07/2026, mid-flow, resume here.**
   Original finding confirmed live via `nslookup` (also cross-checked against Google's 8.8.8.8): no SPF
   TXT on `sockacademy.store`, `shop1/shop2._domainkey` NXDOMAIN, DMARC `rua=` pointed at GoDaddy's own
   void mailbox. **New finding this session:** Shopify's Sender email was set to a personal Gmail —
   first `guyoved100@gmail.com` (one of the two addresses already banned from code use, ANTI_RECURRENCE
   #7), then briefly `sockacademy.store@gmail.com` (still `@gmail.com`, still blocks domain
   authentication — Shopify's own UI warns "Public domains like Gmail don't support custom sending").
   **Bigger discovery: there is no MX record at all on `sockacademy.store` root domain** — confirmed via
   two independent DNS lookups — meaning `hello@sockacademy.store` cannot receive mail *at all* today,
   not even the Shopify verification email. This is not what a prior session set up; grepped every doc
   that mentions `hello@sockacademy.store`/forwarding/MX (Stage16, Stage20, Klaviyo doc, Phase
   Architecture) — none of them ever actually configured this. It was discussed, never done.

   **Fix path chosen:** GoDaddy's free "Email Forwarding" product is gone from this account (only paid
   Microsoft 365 upsell shown) — using **ImprovMX** (free, forwarding-only) instead, via GoDaddy's
   "Connect Email → Create MX records for an external email service" flow (GoDaddy auto-detected
   ImprovMX's standard MX values, no manual entry needed).

   **Exact state where this was paused:** GoDaddy is showing "We found the MX records for Improvmx,"
   **Step 1/2**, with a "Continue" button not yet clicked. **Still needed, in this order:**
   1. Click "Continue" in GoDaddy to finish adding the ImprovMX MX records (step 2/2).
   2. Sign up at improvmx.com (free), add domain `sockacademy.store` there (claims it — the DNS MX
      record alone does nothing without this), and create the alias `hello` → forwards to
      `sockacademy.store@gmail.com`.
   3. Change Shopify Sender email back to `hello@sockacademy.store` (currently sitting on
      `sockacademy.store@gmail.com` — a Gmail address, which will never authenticate).
   4. Wait for DNS propagation, then re-verify (I can re-run the DNS check on request).
   5. Back in Shopify Notifications: confirm the email-verification link (should now actually arrive,
      forwarded via ImprovMX → `sockacademy.store@gmail.com`), then click into "Email domain
      authentication — Needs setup" for the exact CNAME values, add them at GoDaddy DNS.
   6. "DMARC record setup — View steps" in the same Shopify panel — follow Shopify's own recommended
      rua= value (better than guessing one).
   Best done before the first real order.
3. **Send the attorney packet** (tracker item 1.3 / Keystone B) — the single true external pre-launch
   blocker. Now includes Q8 (item 1 above).
2b. **🔴 NEW 10/07/2026 — Payment gateway confirmed unconfigured.** Guy checked Shopify Admin →
   Settings → Payments (screenshot): no native Shopify Payments provider is set up ("Choose a
   provider" empty state — confirms Stage 20's Israel-unavailability suspicion). PayPal is the only
   provider added, but its own setup shows **"Setup incomplete."** This means **no live gateway can
   process a real charge today** — a more fundamental gap than D4, independent of it (a customer could
   have a working checkout email and still not be able to pay). Fix: finish PayPal account setup in
   Shopify Admin (Guy-only, needs his PayPal business account credentials). Confirms the pricing model
   should use the third-party fee tier — done same session, see `corp/core/pricing.js`
   `LIVE_GATEWAY_IS_THIRD_PARTY = true` (commit pending). At the $22 floor this drops true CM from
   45.3% to 41.8% — still healthy, alert threshold (`<30%`) unaffected.
4. **Keystone Decision Week** (item B below) — **3.3 (price floor → $22) and 3.5 (VISION numbering →
   skeleton canonical) decided and executed 08/07/2026.** Still open: 3.1 positioning (deferred by
   Guy 05/07 — doesn't want to lock copy before real products are curated) and 3.2 discounts (blocked
   on 3.1). 3.1 unblocks the homepage rewrite (2.7) and the Design Freeze partial-lift batch (item C,
   which also unblocks Sock Finder v2 + the new footer contrast fix found tonight).
5. **Remaining Stage 19 quick checks**, no particular order, ~5-30 min each: Shopify tax settings (no
   US collection enabled), GoDaddy 2FA/auto-renew/transfer-lock, continuity note + Google Inactive
   Account Manager, monthly manual Supabase dump, Israeli tax file via accountant.
6. **Optional, whenever convenient:** generate a Supabase read-only Personal Access Token (Dashboard →
   Account Settings → Access Tokens) so Claude can install the read-only Supabase MCP server (exact
   command already in `CLAUDE.md`'s MCP table) — lets future sessions verify the live DB schema
   directly instead of asking you to relay it. (Same PAT also unblocks Stage 21 item CF-0b below.)
7. **Cheap, zero-code sign-off:** read `FABLE5_AUTONOMOUS_OS_ROADMAP.md` (+ its three companion docs —
   `FABLE5_MULTI_INBOX_COMMAND_CENTER.md`, `FABLE5_CIRCUIT_BREAKER_MAP.md`, and the new
   `FABLE5_FINAL_READINESS_CHECKLIST.md` capstone) and approve/amend the Connectivity Fabric plan (Stage
   21, CF-0a below) — nothing builds before its named trigger either way, so this isn't urgent, but it's
   pure reading + a yes/no, and three small decisions ride along (CF-3b liveness canary, CF-3c
   legal-inbox address, CF-0d LangFuse-pilot go-ahead).
8. **NEW 10/07/2026 — Legal "Emergency Patch" review, requested by Guy ("Legal & Autonomy Reset").**
   Confirmed first: **the ToS/Privacy/Shipping/Refund pages are NOT live on the storefront today** —
   `agents/A9_legal_compliance/agent.js` requires `A9_ARM=true` (frozen, never armed) + a Supabase
   `pending_approvals` row manually approved by Guy before anything publishes (`publish` step at
   `agent.js:509+`). So this is a review of the **draft `body_html` blocks already in the attorney-packet
   email** (same content, not a separate live-site audit) — lower risk than it sounds, nothing a customer
   can see today. Still queued: 🤖 vulnerability scan of the four draft documents + a plain-language
   "emergency patch" proposal Guy can approve, **held per Guy's explicit instruction** ("Do not modify any
   site-live content until we review the Emergency Patch proposal" — moot since nothing is live, but the
   review-before-any-doc-edit discipline still applies to the draft text itself).
9. **NEW 10/07/2026 — Supplier-quality upgrade (Guy's "Legal & Autonomy Reset," clarified).** Guy is
   **not** abandoning the dropship model (no warehousing) and **not** re-attempting the 01/07/2026
   Private-Label-now pivot that ANTI_RECURRENCE #31 walked back — confirmed directly with Guy, this
   reads as the same pattern at first glance but isn't. The actual ask: swap CJ/AliExpress-tier quality
   for higher-quality dropship platforms (Spocket named explicitly + others), while keeping Private
   Label at Phase 4 ($15K MRR) exactly as `VISION.md`/`PHASE_ARCHITECTURE_SKELETON.md` already say — **no
   doc supersession needed, this is Phase 1 execution, not a phase-order change.**
   - **Good news, verified in code:** `agents/A1_product_research/agent.js` already has full, real
     (non-stub) search implementations for **Spocket, EPROLO, Modalyst, Syncee, AppScenic** — all
     graceful no-ops today, each needs only its own `*_API_KEY` in GitHub Secrets to activate. This is
     an activation task, not a build task.
   - **Caveat:** endpoint/auth shapes for all five were written against each platform's *published* API
     docs, never tested against a real account — expect a short debug pass on first real key.
   - **Research done 10/07/2026 (web search, sources in ledger):** recommended activation order —
     **Spocket first** (best US/EU apparel fit, most established), then Modalyst/Syncee if Spocket's
     sock inventory proves thin. Two platforms not yet in code (BrandsGateway — luxury-brand focus;
     DropCommerce — vetted North American suppliers) noted but not recommended to add without a
     concrete gap Spocket/Modalyst/Syncee don't cover.
   - **For later (Phase 4 Private Label, NOT now):** shortlist of actual sock manufacturers researched
     for future reference — DeadSoxy (US, vertically integrated), Sokisahtel (merino/alpaca, MOQ 100),
     B2Bsox (direct factory), Walt Technology Group (OEM, MOQ 180). Zero action needed today — filed for
     when Phase 4 triggers.
   - **Guy's next step:** sign up for Spocket (or preferred alternative), confirm it carries usable sock
     inventory, get an API key, hand it to Claude to activate + smoke-test.
10. **🆕 NEW 15/07/2026 — WHOIS privacy leak, real customer contact evidence.** A customer ("Radex,"
    `radexconsult74@gmail.com`) emailed Guy's **personal** Gmail directly, subject "Hello Guyoved" — a
    name pattern that matches the `guyoved100`/`guyoved102` email prefixes, not anything shown on the
    storefront. Verified live (Shopify Admin API, read-only): the native Contact form is correctly wired
    (`shop.customer_email` = `hello@sockacademy.store`), so this did **not** come through the site's
    contact flow. Most likely channel: GoDaddy WHOIS registrant record, not yet confirmed
    privacy-protected — this overlaps the existing loose Stage 19 checklist line ("GoDaddy 2FA/auto-renew/
    transfer-lock" in item 5 above) but had never been independently flagged as an active leak until this
    incident. Two fixes, both 🧑-only, ~5 min combined:
    1. GoDaddy → Domain Settings → Privacy Protection → Enable (closes the actual leak channel).
    2. Shopify Admin → Settings → Account → change `shop.email` (account owner, currently
       `guyoved100@gmail.com`) to `sockacademy.store@gmail.com` — so even a future WHOIS/account-level
       exposure surfaces a business address, not a personal one.
    Same-session fix already applied (see Log 15/07/2026): the 4 `active` products were switched to
    Shopify `status: draft` via Admin API — closes the separate, independent risk of a customer browsing
    a not-yet-ready storefront (`inventory_policy: deny` already prevented any real transaction, but the
    visible browsing experience is now gone too). Blog/policy pages deliberately left live — SEO
    investment preserved. Full writeup: `ANTI_RECURRENCE_PROTOCOL.md` #45.

    **✅ RESOLVED 18/07/2026 — with a correction to the diagnosis above.** Guy checked GoDaddy
    Registration Settings directly: Domain Privacy was **already "On"**, and the registrant Contact Info
    already showed `sockacademy.store@gmail.com` — never the personal address. So GoDaddy WHOIS was
    **not** the actual leak channel (fix #1 above turned out to be a non-issue; nothing to change there).
    Tried to confirm via GoDaddy's Activity Log when Privacy/Contact were last set, to pin down the real
    historical vector — that page is gated behind a paid "Domain Protection Plan" ("NO ACTIVE PLAN"), so
    the exact leak timeline **stays unconfirmed**. Decision: not worth paying for the plan to solve one
    already-mitigated incident; the sub-investigation is closed as inconclusive-but-safe going forward.
    Fix #2 (Shopify `shop.email`) *was* real and is now done: Settings → Users → Store owner → the
    account-owner email was `guyoved100@gmail.com` (not editable from the Users page itself — Shopify
    routes this through the personal Shopify Account at accounts.shopify.com → General → Email → Update).
    Verified live: Store owner now shows `sockacademy.store@gmail.com`. Note for later: a Google login
    connected to `guyoved100@gmail.com` still shows under "Login service" on the account page — not
    touched, flagged so a future session doesn't assume it was also migrated.

---

## Stage 18 — dispatched 06/07/2026: Target-state orchestration architecture
**Ask:** design how A0 becomes an actual conductor (can re-dispatch/quarantine, not just report),
which agents move to the existing-but-unused event-driven queue substrate (`corp/core/queue.js`)
first vs. which stay on cron, and a phased migration plan compatible with the backend freeze
(design-only, no code until Phase 2). Separate from the discovery queue below per Guy's explicit
choice (06/07/2026).

**Status: ✅ Done 06/07/2026.** Output: `FABLE5_STAGE18_ORCHESTRATION_ARCHITECTURE.md`. **Verdict:
build none of it now** — cron + monitoring + Guy-as-exception-handler is the correct architecture at
0 orders, not a compromise. A0 already has a proven actuation mechanism in-repo
(`shopify-webhook-handler.yml:95`) — growing it into a conductor is a policy choice, not a build
gap. `queue.js` needs "Q-HARDEN" (ack-on-pop, `queue_log` lifecycle, retry+dead-letter) as A2.7's
own first task. Full phased plan with named triggers in the doc (O-0 now / O-1 at
`PHASE_2_ACTIVATE_BY_GUY` / O-2 after 1mo clean / O-3 at Phase 3 $5K MRR×2mo). No execution items
open from this stage until Phase 2 activates — nothing to do right now except Guy reading/approving
the blueprint.

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| S18-a | Approve Stage 18 as the Phase 2 orchestration blueprint (or amend) | 🧑 | Not started | Zero code either way — pure sign-off, no urgency until Phase 2 trigger nears |
| S18-b | O-1 build (Q-HARDEN + queue-drainer.yml + A2.7 shadow→auto mode) | 🤖 (at trigger) | Blocked on `PHASE_2_ACTIVATE_BY_GUY` | Do not start early — explicit anti-over-engineering finding |
| S18-c | O-2 build (A16.5 + A0 Rung 1 propose mode) | 🤖 (at trigger) | Blocked on A2.7 live+clean 1mo or 50 orders | — |
| S18-d | O-3 build (A0 Rung 2 quarantine + consumer runtime reassessment) | 🤖 (at trigger) | Blocked on Phase 3 ($5K MRR×2mo) | — |
| S18-e | Rung 3 (DAG scheduling/reordering/LLM-orchestration/migrate editorial off cron) | — | **DO NOT BUILD** | Only revisit if a named recurring incident proves Rungs 1-2 insufficient |

## Stage 19 — done 06/07/2026 (overnight, dispatched while Guy asleep — quota was available, 100% read-only)
**Ask:** blind-spot discovery across categories A-E below. **Output:** `FABLE5_STAGE19_BLIND_SPOTS.md`
(+ ledger entry, controller-verified). **Two real findings, both independently confirmed by Claude
via live DNS query + web search, not just taken on Fable's word:**

- 🔴 **E2 — a same-name UK sock company exists.** "Sock Academy Ltd", UK Companies House **05743003**,
  active, incorporated 15/03/2006, owns `sockacademy.com`, formerly "United Oddsocks Limited"
  (2006-2017), 12 employees, sells novelty socks in 18 countries. Registered-*mark* status
  unverified (no DB access) — but the company itself is 100% real, confirmed independently.
  **This is the single highest-consequence open item in the whole tracker** — cost to check now is
  free, cost to discover after traction would be the most expensive event in the project's history.
- 🔴 **D4 — Shopify transactional email cannot authenticate as the brand domain today**, confirmed
  via direct DNS query: no SPF TXT on `sockacademy.store` root, `shop1/shop2._domainkey` both
  NXDOMAIN, DMARC live at `p=quarantine` reporting to GoDaddy's default mailbox (silent failure by
  construction). Klaviyo marketing email is fine (properly delegated). ~15 min fix, before first order.

12-item consolidated action list is in the doc itself — nearly all 🧑-only (settings/DNS/self-search/
accountant tasks), a few config-only 🤖-pending-approval (MCP servers), one bundled into the already-
queued Sock Finder v2 pass. Nothing here needs a new agent/table/workflow before Phase 2 — fully
freeze-compliant. **Top 3 for Guy to do first, in order of cost-asymmetry: (1) add trademark Q8 to
the attorney packet before sending it + do the free 30-min self-search tonight/this week, (2)
Shopify sender-domain authentication + SPF + DMARC redirect (~15 min), (3) the rest of the 12-item
list at his own pace — none of the rest is time-sensitive.**

**Phase 1 execution — done 06/07/2026 (all 🤖-only items with zero decision-blocker, per the newly
adopted [[feedback_fable5_execution_protocol]]):** item 9 (axe-core scan, 3 pages, real footer
contrast/landmark defect found — see doc Addendum) and item 10 (Shopify Dev MCP installed and
verified). Item 10b (Supabase MCP) genuinely blocked — needs a Supabase account PAT only Guy can
generate. Item H (separate, Stage 15 origin) also done same session — see its row above.

## Stage 20 — dispatched 06/07/2026: True unit economics + Day-1 manual fulfillment runbook
**Ask:** (1) Claude found tonight that every margin number in the codebase (A1's pricing,
A15 CFO's reports) is `retail_price - supplier_price` only — zero Shopify fee, payment fee,
shipping cost, or CJ per-order handling fee anywhere. Fable to build a true contribution-margin
model and give a direct price-floor recommendation, timed specifically to land before Guy makes the
pending 3.1/3.3 Keystone decisions. (2) A Day-1 manual fulfillment runbook — Stage 18 concluded Guy
fulfills the first orders by hand, but no document walks through that process step by step.

**Status: ✅ Done 06/07/2026.** Output: `FABLE5_STAGE20_UNIT_ECONOMICS_AND_FULFILLMENT.md` (+ ledger
entry). **Part 1 verdict:** confirmed — the only margin math in the repo is `retail − supplier_price`
(A1 `agent.js:596-597`, A15 `agent.js:97`; no fee/shipping columns exist in `products_table.sql`).
True contribution model (payment fees + shipping + CJ costs + 5% refund allowance; supplier costs are
documented examples, not a live Supabase query — MCP still blocked on item 6 above): **naive margins
are overstated by ~20-40 points.** $18 floor → true CM ~$6.30/unit (34.9%; ~$4.70 on a WELCOME10
first order); $24 → ~$11.80 (49.2%). Honest calibration: break-even is ~$11-12, so nothing is
underwater — the finding is overstated *reporting* plus a thin floor, not a hole. **Unhedged
recommendation: single-pair floor $24** (top of memo 3.3's own $22-24 band) — independently confirms
memo 3.3-A on economics grounds; **explicitly neutral on 3.1** (changes the floor within either
positioning, not which positioning is viable; does not override Guy's deferred luxury lean). Biggest
unverifiable-from-repo variable: which payment gateway is live (Shopify Payments ~2.9%+$0.30 vs.
third-party ~5.5%+$0.49 on Basic) — one screen in Shopify Admin decides it. Adjacent live-code find:
A7's `MARKUP_MULTIPLIER=2.5×` auto-reprice can set retail below the $18 floor; inert today (price
thresholds null per item H's audit) but arms itself if `PRICE_WARN_PCT` is ever set. **Part 2:**
first Day-1 runbook exists — verified NO code notifies Guy of an order today (the webhook→queue chain
has zero consumers; real trigger = Shopify staff email + mobile-app push, external defaults); 7-item
pre-flight, 7-step per-order procedure (payment check → 1h cancellation window → `products.cj_pid`
lookup → CJ dashboard order → tracking → Shopify Fulfill-items → Google Sheet log that seeds A2.7's
future `fulfillments` reconciliation), 3 in-register customer templates, printable 11pm checklist.
Scale ceiling named: **~3 orders/day sustained (or 25 cumulative — converges with the Phase 2 trigger
by itself) = activate Phase 2 and build A2.7 first**, per Stage 18 O-1. Fully freeze-compliant — all
code corrections queued, none implemented.

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| S20-a | Read Part 1 before deciding 3.3 (and 3.1) — floor recommendation $24 | 🧑 | ✅ **Done 08/07/2026** | Guy decided $22 instead of the $24 recommendation — still clears the $18 novelty-overlap band. See 3.3 above. |
| S20-b | Runbook pre-flight (~30 min): Shopify app push ON, Settings→Payments gateway check, Settings→Shipping <$50 rate check, CJ login/wallet, CJ-Shopify-app connection check, real-`cj_pid` check, D4 email-auth fix | 🧑 | Not started | Everything needed so order #1 is a 15-min non-event; D4 + cj_pid items already tracked elsewhere — no duplication, this is the bundle |
| S20-c | Sample order (item K) also captures: CJ invoice lines (item/shipping/any fee), real payout fees, delivery days → replace every [EST] in the Part 1 model | 🧑 | Not started | Rides the already-tracked item K, zero extra effort |
| S20-d | Fix margin math: A15 `getCatalogMargins` + A1 `suggestRetailPrice` → true-contribution formula via shared constants in `corp/core/pricing.js`; recalibrate A15's `<40%` alert | 🤖 (with Guy's go-ahead) | ✅ **Done 08/07/2026** | Guy gave go-ahead same session (away from computer, text-only decision). `pricing.js` now exports `trueContributionMargin()` + fee/shipping/refund constants per Stage 20's formula. A15's `gross_margin_pct` honestly renamed to `product_cost_margin_pct`; new `true_cm_pct` added; alert recalibrated to `avg_true_cm_pct < 30` (was `<40` on the naive figure, which never fired). A1's `suggestRetailPrice` now returns `trueCM`/`trueCMPct` alongside the naive figures, shown in both the email and console output. |
| S20-e | Guard A7's 2.5× auto-reprice (floor/ceiling clamp) BEFORE `PRICE_WARN_PCT`/`PRICE_CRITICAL_PCT` are ever configured | 🤖 (with Guy's go-ahead) | ✅ **Done 08/07/2026** | `pricing.js` gained `PRICE_FLOOR` (=22, single source of truth, also now used by A2.5 instead of its own local constant) + `clampRetailPrice(rawPrice, category)`. Wired into both A7's `buildMessage` (alert text) and `handleChange` (the actual Shopify write) so the displayed and applied numbers can never diverge. Safe to configure `PRICE_WARN_PCT`/`PRICE_CRITICAL_PCT` now. |
| S20-f | Manual fulfillment log (Google Sheet, columns per runbook §2.2 step 6) | 🧑 (2 min, at first order) | Not started | Deliberately NOT a Supabase table (freeze); becomes A2.7's seed/reconciliation data |

**Controller-verified same night:** all repo-citable claims checked directly and matched exactly —
A1/A15 margin formulas, `products_table.sql` schema (`cj_pid` + `product_url` exist; only
`supplier_price`/`retail_price` are money columns, no fee/shipping column), FAQ's "within 1 hour"
cancellation text, "Free Shipping Over $50" header copy. **One [EXT] claim upgraded from hedge to
near-certain:** web search confirms Shopify Payments is **not available in Israel** — so the
higher-fee scenario (~5.5%+$0.49, not the optimistic 2.9%+$0.30) is very likely Guy's actual reality,
strengthening the $24-floor case further. **One inaccuracy caught and flagged (not corrected in the
doc — Guy should know the doc has this flaw):** Part 2 repeatedly treats "the site promises 48h
dispatch" as an existing live commitment (steps 1, 4, the 11pm checklist). The actual live FAQ
(`scripts/setup/create_faq_and_redirects.js:36`) only promises "7–14 business days" shipping with
**no dispatch-time commitment at all** — the "48-hour dispatch" language is Stage 16's *proposed*
future copy (`FABLE5_STAGE16_DELIVERABLES.md:230`), still gated on the unapproved homepage/copy batch
(item I), not live. The runbook's operational logic (batch each morning, day-3 ticket trigger) is
still sound practice regardless — just don't tell a customer "we promised 48h" until item I ships.

---

## Stage 21 — dispatched 06/07/2026: The Connectivity Fabric (Autonomous OS Roadmap)
**Ask (Guy):** evolve the fleet from agent-based reporting into a bulletproof, fully autonomous
operating system across email/social/backend/web — a "Connectivity Filter" grading every MCP/API on
Superpower vs. Surface-Area-for-Failure, a Multi-Inbox Command Center, a social-media HITL policy, a
phased automation blueprint, and a Health-Check Agent proposal, plus an answer to "what are the hidden
blind spots."
**Status: ✅ Design done 06/07/2026 (Fable 5 planning pass, executed by Sonnet).** Output:
`FABLE5_AUTONOMOUS_OS_ROADMAP.md`, `FABLE5_MULTI_INBOX_COMMAND_CENTER.md`, `FABLE5_CIRCUIT_BREAKER_MAP.md`.
**Verdict: the fabric is already ~80% woven — complete it, don't grow it.** Zero code built before named
triggers; this stage **extends** Stage 18's O-0/O-1/O-2/O-3 triggers and Stage 16's A2.7/A16.5 design,
it is not a competing scheme. Fully Backend-Feature-Freeze-compliant — the only code-adjacent item is
an *optional* single-agent LangFuse pilot (CF-0d), gated on Guy's explicit go-ahead.

**Key correction to Guy's brief, caught during design:** a standalone "Health-Check Agent" would
duplicate four mechanisms that already exist (A0 + `agent_health_log`, fleet-wide `self-heal.js`,
`yaml-reality-audit.js`, PARANOIA MODE) and would directly contradict Stage 18's own "build none of it
now" verdict — formalized as one system instead (§CF-0e), with a single narrowly-scoped future
enhancement (an O-3 liveness canary) flagged as Guy's decision, not a default.

**Live gap found during design (not created by it):** `agents/A5_social/agent.js` publishes to
Instagram **fully autonomously today** whenever Meta credentials are set — zero Guy approval step,
only an automated QA-gate. This is a real violation of the 10/10 human-in-the-loop rule Guy asked for,
and is this stage's highest-priority retrofit (CF-1b) — **A5 must stay DRY_RUN until it ships.**

| # | Item | Owner | Gate | Status | Notes |
|---|------|-------|------|--------|-------|
| CF-0a | Approve the Autonomous OS Roadmap + Connectivity Filter grades | 🧑 | O-0 now | Not started | Zero code — pure sign-off |
| CF-0b | Generate a Supabase read-only PAT → unblock `supabase-mcp` | 🧑 | O-0 now | Not started | Closes the #1 recurring failure (SQL file ≠ live DB, ANTI_RECURRENCE #23/#26). Exact command already in CLAUDE.md's MCP table |
| CF-0c | Reconcile CLAUDE.md's MCP table with the Connectivity Filter's grades (edit in place) | 🤖 | O-0 now | ✅ **Done 06/07** | Single source of truth — never a second parallel table (ANTI_RECURRENCE #31/#42) |
| CF-0d | LangFuse pilot — wire `observability.js` into ONE agent (A3 or A8) | 🤖 (needs Guy's go-ahead) | O-0 now | ✅ **Done 06/07/2026** (this row was stale — verified directly in `A3_content/agent.js:122-166`: `obs.startTrace`/`traceLLM`/`endTrace` already wrap the Claude call, fail-open) | Fleet-wide rollout still deferred to CF-1e. Won't produce real traces until Guy adds `LANGFUSE_SECRET_KEY`/`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_HOST` to GitHub Secrets (Guy-only, needs his LangFuse account) |
| CF-0e | Formalize the "Health-Check System" doc (composite of 4 existing mechanisms) | 🤖 | O-0 now | ✅ **Done 06/07** | Docs-only, in the roadmap §6 — explicitly NOT a new agent |
| CF-0f | A5 HITL-retrofit design (code gated to O-1) | 🧠 | O-0 now | ✅ **Done 06/07** | See roadmap §4 — reuses `requestApproval` + new `action_type:'social_post'` + `A5_ARM` guard, mirroring the real `A9_ARM` pattern |
| CF-1a | Q-HARDEN `queue.js` (ack-on-pop, `queue_log` lifecycle, dead-letter → `pending_approvals`) | 🤖 | O-1 | Blocked on `PHASE_2_ACTIVATE_BY_GUY` | = Stage 18 item S18-b; A2.7's first task |
| CF-1b | A5 HITL retrofit code + `case 'social_post'` in `hitl-execute.js` + `A5_ARM` env | 🤖 | O-1 → re-proposed 10/07 as bug-fix exception, see item 0 above | Not started — no longer urgent | **✅ Interim patch done 11/07/2026** (`agents/A5_social/agent.js:45` hardcoded `DRY_RUN = true`) — live-posting risk closed. This full retrofit (real HITL approval flow, not just a hard stop) is now a normal-priority build, schedule whenever Guy wants |
| CF-1c | Meta CAPI server-side build (per the existing 3-doc spec, no redesign) | 🤖 | Phase 2 gate (= O-1) | Blocked | Alert via `notifyTelegram` on any failure — never silent |
| CF-1d | Adopt `supermetrics` + `agent-browser` with their designed breakers (CFO/intel clusters) | 🤖 | O-1 | Blocked | Read-only scopes; `agent-browser` also gated on the Hallucination-Defense policy (roadmap §8) |
| CF-1e | LangFuse fleet-wide rollout | 🤖 | O-1 | Blocked | Do while agent code is already open for O-1 work |
| CF-2a | A16.5 CS Desk + Multi-Inbox Command Center go live | 🤖 | O-2 | Blocked on A2.7 live+clean 1mo/50 orders + attorney-approved policy | See `FABLE5_MULTI_INBOX_COMMAND_CENTER.md` |
| CF-2b | A0 Rung 1 propose-mode (allowlisted re-dispatch) | 🤖 | O-2 | Blocked | = Stage 18 item S18-c |
| CF-3a | A0 Rung 2 quarantine (kill-switch `system_config`, fleet startup check) | 🤖 | O-3 | Blocked on $5K MRR × 2mo | = Stage 18 item S18-d |
| CF-3b | **DECISION:** approve A0's active liveness-canary (external-dependency health probe) | 🧑 decides → 🤖 builds | O-3 | Not started | The one genuinely-new Health-Check capability (roadmap §6); alternative is keeping A17 + `yaml-reality-audit.js` on-demand |
| CF-3c | Legal-adjacent inbox address name (multi-inbox 4th lane) | 🧑 | O-2 | Not started | e.g. `legal@sockacademy.store` — needed before A16.5/Multi-Inbox go live |
| CF-X | Rung 3 (DAG/LLM-orchestration) + generic `zapier`-as-glue + `granola`/standalone `perplexity` | — | — | **DO NOT BUILD / REJECT** | Fail the Connectivity Filter (Surface ≥ Superpower); Rung 3 also directly contradicts Stage 18 |
| CF-0g | Final Readiness Checklist authored (capstone) | 🤖 | O-0 now | ✅ **Done 07/07** | Consolidates the four Stage 21 docs into one go/no-go page (4 domain gates + the canary metric); cross-links, never duplicates — see `FABLE5_FINAL_READINESS_CHECKLIST.md` |

## Queued candidates from earlier drafting (superseded by the completed Stage 19 above — kept for record)
**Added 05/07/2026, expanded 06/07/2026, Guy's request:** Fable actively researches; Sonnet/Opus
execute after. Guy explicitly wants topics he wouldn't know to ask about himself — "blind spots I'm
not aware of and don't know how to phrase." This is distinct from Stage 15's "Missed Leverage" (which
covered project strategy/ops) — these are categories a first-time solo founder typically never thinks
to check until something goes wrong. Claude (not Fable) identified and drafted this list, per the
standing brain/executor split.

**A. External tooling (original ask):** skills/MCP servers/tools worth adding that nobody has proposed yet.

**B. Legal exposure beyond the attorney packet (1.3 only covers ToS/privacy/medical-claims):**
- Personal liability: no legal entity exists yet (`memory`: "אין ישות משפטית עדיין") while already
  taking international payments — what personal financial exposure does Guy carry today, and at what
  revenue/risk point does forming an entity stop being optional?
- ADA/WCAG web-accessibility risk — US e-commerce sites (even pre-revenue ones with live checkout)
  are a known target for demand-letter mills; nobody has audited the theme for this at all.
- Sales tax / VAT nexus — at what order volume/geography does Guy owe tax registration somewhere,
  and is Shopify's tax settings actually configured for it.

**C. Business continuity / bus-factor:** the entire company is one person + AI agents holding all
credentials. What happens if Guy is unreachable for a week (illness, travel)? Is there any documented
recovery path (2FA backup codes, an emergency access list, who else could even log in)? This has never
been asked anywhere in the project's 42 anti-recurrence protocols.

**D. Infrastructure single points of failure Guy hasn't priced in:**
- Free-tier cliffs: Supabase, Upstash, GitHub Actions minutes — what happens to the *business* if one
  is exhausted unexpectedly (e.g. during a real traffic spike, the one moment it matters most)?
- Data backup: if the Supabase project were deleted or corrupted tomorrow, is there any backup of the
  actual data (not just the SQL schema in git)?
- Domain/registrar account security — is 2FA on at GoDaddy; what's the actual hijack/lockout risk for
  the one domain the whole business runs on?
- Email deliverability — SPF/DKIM/DMARC on the sending domains (Klaviyo, Gmail); a misconfiguration
  here silently sends every customer email to spam with zero alert to Guy.

**E. Insurance and brand-name risk:**
- General/product liability insurance for a business that ships physical goods to customers — likely
  never considered, genuinely relevant the moment there's a real order.
- Trademark clearance in the *other* direction: is "SockAcademy" actually free to use, or does it risk
  infringing an existing mark somewhere Guy would sell into? (Different question from A17's own-mark
  protection, which only watches for copycats *of* SockAcademy.)

---

## Source documents (read in this order for full context)
1. `FABLE5_LAUNCH_READINESS_PLAN.md` — Stage 14 master synthesis, Tier 1-3, steps 1-12 (the original launch plan).
2. `FABLE5_ARCHITECT_FULL_REVIEW.md` — Stage 15 full-project review (this tracker's action items A-H below).
3. This file — status of everything from both, kept current.

---

## Stage 15 Action Plan (A–H)

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| A | Ship the existing launch plan (steps 1-12) — no new plan | 🤖 | In progress | Step 2.1 (SQL/RLS batch) done 05/07. **2.2 (QA-gate writer fixes) done 06/07** — `d6b6c24`. **2.4 (cron reschedule + collision splits + staleness pairing) done 06/07** — `8188fb6`. Steps 2.6-2.7 still queued (2.6 blocked on Guy approving the consolidation outline; 2.7 blocked on 3.1 positioning decision). |
| B | Keystone decision week (6 sitting decisions) | 🧑 | Not started | See breakdown below — highest leverage, unblocks ~10 downstream items |
| C | Partial Design Freeze lift — 3-item batch (#1 sale-grammar, #14 homepage copy, #8 Sock Finder v2) | 🧑 approves → 🤖 executes | Not started | Freeze stays in force for all other design items |
| D | Backend feature freeze until 25 orders (Iron Law 1 completion clause) | 🧑 sign-off → 🤖 amends CLAUDE.md | ✅ **Done 05/07** | Guy approved bundle; clause added to Iron Law 1 in CLAUDE.md, commit pending |
| E | Constitution amendment: add A2.7 Order Fulfillment + CS function to Phase 2 skeleton | 🧑 approves → 🤖 drafts amendment | ✅ **Done 05/07** | Guy approved bundle; pasted verbatim into PHASE_ARCHITECTURE_SKELETON.md after A20, commit pending |
| F | Bound `orchestration/index.js:71-77` health query (`.limit(500)`) | 🤖 | ✅ **Done 05/07** | `.limit(500)` added, commit pending |
| G | Doc retirement pass (banner superseded FABLE5 docs + skill de-stating) | 🤖 | ✅ **Done 06/07** | Skill de-stating was already done (Stage 15). Banners added to all 14 completed-stage FABLE5_*.md docs pointing to this tracker + the launch plan as current-status source; `FABLE5_ACTION_TRACKER.md`/`FABLE5_INITIATIVE_LEDGER.md`/`FABLE5_LAUNCH_READINESS_PLAN.md` themselves and the brand-new `FABLE5_STAGE18_*.md` left unbannered (they ARE the current-status docs). |
| H | YAML Reality Audit → deterministic script (`scripts/ci/yaml-reality-audit.js`) | 🤖 | ✅ **Done 06/07** | `c896907`. Not wired into CI (would be a new workflow, reserved for Guy's sign-off under the freeze) — run on demand. First real run found 3 pre-existing config gaps for Guy to triage (not fixed — values/priority are his call): A0's optional Gmail-personal-inbox read is silently inert (`GMAIL_PERSONAL_APP_PASSWORD` never configured); A7's low-stock/price-change alerting gracefully degrades to disabled (`STOCK_LOW_THRESHOLD`/`PRICE_WARN_PCT`/`PRICE_CRITICAL_PCT` never configured, code null-guards it); A1's `MAKE_A1_WEBHOOK` flag is a false-positive at CRITICAL severity — code calls it "legacy, אופציונלי" and guards on presence. |

## B — Keystone Decision Week (breakdown, all 🧑 Guy-only, ≤1hr each)

| # | Decision | Blocks | Status |
|---|----------|--------|--------|
| 3.1 | Brand positioning: premium-performance-now vs. luxury-claim-now | Homepage rewrite, article retirement, discount question, design batch (C) | **Deferred (Guy, 05/07/2026)** — leaning toward eventual luxury/"Rolex" framing, but explicitly does not want to lock copy language before real products are chosen/curated. Item I (homepage copy) stays untouched until this resolves — do not proceed on brand-voice copy without re-checking here first. |
| 3.2 | Discount mechanics resolution | Product page copy (item C, #1) | Not started |
| 3.3 | Single-pair price floor | Pricing pages, positioning (3.1) | ✅ **Done 08/07/2026** — Guy chose **$22** (not Stage 20's $24 recommendation, still above the $18 novelty-overlap floor). Applied to `A2_5_quality_control/agent.js` PRICE_MIN, `A10_trend_scout`, `A3_content/landing.js`, `A4_meta_ads`, `sock-finder.liquid`, `VISION.md`, `CLAUDE.md`, `README.md`. |
| 3.5 | VISION.md A-numbering cleanup | Documentation consistency | ✅ **Done 08/07/2026** — Guy confirmed `PHASE_ARCHITECTURE_SKELETON.md` is canonical. `VISION.md` Build Phases section renumbered ("Scale Phase" → "Phase 4"), Private Label section's stale "at Phase 3" reference for A23 fixed to "Phase 4". |
| 1.1 | Shopify token — ✅ **DONE 05/07/2026** (see `SHOPIFY_TOKEN_RUNBOOK.md`) | Agents A2/A3/A5/A7/A9/A12 | **Done** |
| 1.3 | Attorney packet send (`FABLE5_ATTORNEY_PREP.md`) | MG-2 publish, the only true external blocker | Not started — **⚠️ add Q8 before sending (Stage 19, 06/07/2026): a real UK company "Sock Academy Ltd" (Companies House 05743003) predates us and holds sockacademy.com — ask attorney to run a knock-out trademark search before this packet goes out, costs nothing extra since it hasn't been sent yet** |

*Handoff:* ✅ **Memos drafted 05/07/2026** — `FABLE5_KEYSTONE_DECISION_MEMOS.md` (5 memos: 3.1, 3.2, 3.3, 3.5, 1.3 — each ≤half page, Hebrew, options/recommendation/consequences). Waiting on Guy to read and decide.

## Part III — Skill Deliverables

| Skill | Action | Status |
|-------|--------|--------|
| `ship-approved-batch` (new) | Create `.claude/skills/ship-approved-batch/SKILL.md` per Stage 15 spec | ✅ **Done 05/07** — local only, `.claude/` is gitignored by design |
| `run-sockacademy-agents` (rewrite) | Replace with de-stated version (no agent-status tables) | ✅ **Done 05/07** — local only |
| `workflow-navigator` | Retire (delete) or reduce to trigger-phrase table only | ✅ **Done 05/07** — deleted per Fable's recommendation, local only |

---

## Stage 16 Action Plan (I–N)
**Source:** `FABLE5_STAGE16_DELIVERABLES.md` (Stage 16 — homepage copy re-cut, A2.7/A16.5 constitutional amendment, GTM strategy, open-field findings).

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| I | Homepage copy re-cut — approve 50-row old→new table (item #14) | 🧑 approves → 🤖 executes | Not started | 13 KEEP, 37 changed, 5 [VERIFY] need Guy's personal fact-check, 2 [3.1-sensitive]. Apply to `templates/index.json` + 3 JS strings in `sections/sock-finder.liquid` (~lines 494-504), one commit, before/after screenshots. |
| J | Constitution amendment: A2.7 Order Fulfillment + A16.5 Customer Service Desk → Phase 2 skeleton | 🧑 approves → 🤖 pastes verbatim | ✅ **Done — same as item E above (05/07)** | Stale duplicate caught 06/07/2026: this is the identical work Stage-15 item E already completed (verified directly — `A2.7`/`A16.5` entries exist in `PHASE_ARCHITECTURE_SKELETON.md` after A20). J was added later from Stage 16 without checking it against E first. No action needed. |
| K | GTM plan: sample order of 3-5 SKUs (~$50-80) — Guy-only, unblocks photography + curation claims + CJ path test | 🧑 | Not started | Highest-ROI/cheapest action available; gates D1's [VERIFY] rows and the Founding Cohort launch (Gate A in the GTM sequence). |
| L | GTM plan: Founding Cohort capture band (design item #13) — prioritize once 3.1 lands | 🧑 approves → 🤖 builds | Not started | The one channel that can deliver the first 25 orders alone (150-500 signups × 5-8% conversion). Register rule: allocation, never discount. |
| M | Sock Finder constitutional violations — remove "Funny" quiz path + BLOCKED novelty results; re-bracket budget question off sub-$18 | 🧑 approves → 🤖 fixes | ✅ **Done 05/07** | Guy approved bundle; "funny" vibe + all 4 novelty result rows removed, budget re-bracketed to $18-28/$28-45/$45+. Verified clean via grep. Full v2 result-screen rewrite (item #8) still separate/pending. |
| N | Homepage facts micro-audit — "Est. 2024" (false founding date) + "50+ Sock Categories" (actual: 9 collections/5 products) | 🧑 confirms true founding year → 🤖 sweeps remaining pages | Not started | Both live fabrications caught this pass, fixed in D1's copy table (rows 6, 36). One-pass "every number/date is true or gone" sweep still owed for product pages, About, FAQ, size guide. |

## Stage 16 — Additional flag (no tracker row, Guy-only judgment)
- **Last-mile/unboxing gap (D4.3):** no document anywhere addresses what a customer actually receives (CJ dropship mailer, 8-15+ day delivery, no branding). Three cheap mitigations proposed (honest delivery-time copy, CJ branded packaging pricing, insert card) — decidable during the sample order (item K). Not tracked as a numbered item since it's exploratory, but flagged for Guy's attention.
- **Founder-story acquisition experiment** ("solo founder built a 30-agent AI corp to sell socks") — flagged as a real but fenced option in the GTM plan; Guy's call whether to pursue, deliberately not made a tracker action since it's optional and register-risky if mishandled.

## Stage 17 Action Plan (O–S) — Claude Code/Desktop tooling audit (not SockAcademy code)
**Source:** `FABLE5_STAGE17_CLAUDE_SETTINGS_AUDIT.md`.

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| O | 🔴 Verify Settings ▸ Privacy has training/data-sharing OFF | 🧑 | Not started | Cloud-side, unverifiable locally — manual check only, highest leverage given credential-exposure history |
| P | 🔴 Remove `magic` MCP server from `~/.claude.json` + rotate its API key | 🧑 | Not started | Deprecated per CLAUDE.md's own verdict (NOT APPLICABLE — React/JSX tool, project is Liquid); key sits in plaintext locally |
| Q | 🔴 Reconcile `sockacademy/CLAUDE.md`'s MCP verdict table with installed reality | 🧑 decides → 🤖 edits | Not started | 5 servers marked ACTIVE (context7, agent-browser, supermetrics, notion, granola) are not installed anywhere found; doc currently misleads any agent reading it |
| R | Promote credential-blocking PreToolUse hook to global `~/.claude/settings.json`; prune ~150-entry project allowlist | 🤖 (with Guy's go-ahead) | Not started | One-off run-IDs/curl URLs are dead weight; `Bash(node -e ' *)` and `Bash(git add *)` flagged as overly broad for narrowing |
| S | Add 3 superpowers QA skills (systematic-debugging, verification-before-completion, test-driven-development) to CLAUDE.md Skills table as ACTIVE | 🤖 | Not started | Gap, not disagreement — already installed/used, just undocumented |

**🔴 Security incident from this stage (self-contained, already fixed):** the Stage 17 subagent printed a fragment of the real `magic` MCP server's API key into its own output doc — a direct S2 violation. Caught and redacted by Claude before the file was ever staged (`git status` confirmed untracked — no exposure to git history or the public GitHub repo). Logged as **ANTI_RECURRENCE #42** with a rule extending S2 explicitly to subagents that read real config files. Item P (key rotation) stands regardless, per Fable's own original recommendation.

## Launch Plan Step 2.1 — SQL/RLS batch (✅ Done 05/07/2026)
Per `FABLE5_RLS_SANITY_PASS.md`. `products_table.sql` was already fixed in an earlier session.
This pass fixed the rest:
- Added missing service_role policies: `fraud_events`, `affiliates`, `affiliate_performance`, `regulatory_events` (4 tables, 0 policies before)
- Wrapped 8 non-idempotent `CREATE POLICY` statements in `DO $$ ... EXCEPTION WHEN duplicate_object` (or verified 3 more already used an equivalent `IF NOT EXISTS (SELECT ... pg_policies)` pattern): `pending_approvals`, `queue_log` (+ de-duped its bare indexes), `agent_health_log`, `executive_reports`, `club_members` (both tables), `press_contacts`, `pr_campaigns`, `pr_coverage`
- Hardened least-privilege on the 7 files touched: `GRANT ALL TO anon/authenticated` → `GRANT service_role` + explicit `REVOKE ... FROM anon/authenticated`
- **Deferred (low urgency per Fable):** same grants hardening on `trends`, `competitor_prices`, `competitor_intel`, `product_qc_log`, `system_config`, `cro_snapshots`, `knowledge_chunks` — currently inert (RLS denies anon/authenticated regardless), not a correctness bug, queued for a future pass.
- **Guy-only follow-up:** re-run the corrected SQL files in Supabase SQL Editor for any table already created with the old broken/non-idempotent version.

## Standing rule (resolved 05/07/2026 — see `feedback_fable5_brain_executor_model` memory)
Fable produces plans/analysis; Sonnet/Opus always execute the downstream drafting/code. Do not
re-dispatch Fable for work already handed off to "Claude" in its own output (memos, copy tables,
amendment text, code). Only re-dispatch Fable for genuinely new strategic/architectural judgment calls.

---

## Log
- 2026-07-15 — Customer email ("Can u ship to Ohio?") reached Guy's personal Gmail, revealing the
  storefront was fully public (Password Protection never enabled since theme launch 14/06). Verified live
  via Shopify Admin API (read-only): all 6 products had `inventory_policy: deny` (zero real transaction
  risk existed — no order could have completed regardless), the Contact form correctly routes to
  `hello@sockacademy.store`, MX records for the domain now resolve to ImprovMX (progress since 10/07's
  paused state — D4 item 2 above), but the `hello@` alias itself is still unconfirmed. Traced the actual
  contact vector to a likely GoDaddy WHOIS leak (subject line "Hello Guyoved" matches the personal Gmail
  prefix, not anything on the storefront) rather than the Contact form. Fix applied same session: 4
  `active` products switched to Shopify `status: draft` via Admin API (one-off API call, not a new agent)
  — removes storefront browsing/inquiry exposure while blog/policy pages stay live for SEO.
  `ANTI_RECURRENCE_PROTOCOL.md` #45 added and pushed (`35add98`, CI green) documenting the full gap. Item
  10 above queues the two remaining Guy-only fixes (GoDaddy WHOIS privacy toggle + Shopify account-owner
  email change).
- 2026-07-11 — Guy approved ("מאשר") executing item 0 Part 1. `agents/A5_social/agent.js:45` changed from
  `DRY_RUN = !ACCESS_TOKEN || !IG_USER_ID` to a hardcoded `DRY_RUN = true` — A5 no longer auto-publishes to
  Instagram under any credential state; live-posting risk flagged 10/07 is closed. `node --check` +
  `node scripts/ci/verify-fleet-status.js` both clean, no other files needed changes (workflow env untouched
  — the gate is in code, not env-derived, so it can't silently flip back on). Item 0 and CF-1b rows updated
  to reflect Part 1 done / Part 2 (full HITL retrofit) now normal-priority, not urgent.
- 2026-07-10 — Guy free at the computer after several async exchanges. Full tracker re-scan + Hebrew
  status report delivered (all open items across Stages 15-21). Guy sent a "Legal & Autonomy Reset"
  prompt: (1) A5 DRY_RUN patch + commit to the full HITL retrofit ("Option 2," build it right) — **agreed
  but not yet executed**, see item 0 (top priority for next turn); (2) legal emergency-patch review of
  the draft ToS/Privacy/Shipping/Refund content — confirmed first that nothing is live on the storefront
  yet, so this is lower-risk than it sounds (item 8); (3) a supplier-quality pivot away from CJ/AliExpress
  that initially read as a repeat of the 01/07/2026 Private-Label-now incident (ANTI_RECURRENCE #31) —
  flagged directly to Guy with the exact commit history, and Guy clarified it's actually much narrower:
  stay dropship (no warehousing), upgrade supplier tier only, Private Label stays at Phase 4 unchanged —
  no doc supersession needed (item 9). Verified `A1_product_research/agent.js` already has real
  (untested-live) code for Spocket/EPROLO/Modalyst/Syncee/AppScenic — an activation task, not a build
  task. Web research done for platform recommendation (Spocket first) + a separate future shortlist of
  actual sock manufacturers for the eventual Phase 4 pivot. Nothing committed to git this pass — pure
  documentation/planning sync, per Guy's explicit request to keep project systems synchronized before
  continuing. **Next session/turn should open with item 0 (A5).**
- 2026-07-05 — Tracker created after Stage 15. All items above are Not Started; nothing executed yet.
- 2026-07-05 — Item B handoff done: `FABLE5_KEYSTONE_DECISION_MEMOS.md` drafted by Claude (Sonnet), 5 memos ready for Guy's read. Brain/executor model confirmed by Guy and saved to memory.
- 2026-07-05 — Stage 16 items I-N added: homepage copy re-cut (50-row table), A2.7/A16.5 constitutional amendment draft, GTM plan, and two new verified findings (Sock Finder recommends BLOCKED novelty products below the price floor; homepage carries two fabricated facts — false founding year, false category count). All Not Started.
- 2026-07-05 — Stage 17 items O-S added: Claude Code/Desktop tooling audit (magic MCP key exposure + removal, MCP doc-vs-reality reconciliation, allowlist pruning, skills table gap). Security incident found and fixed same-pass: subagent printed a key fragment into its own doc, redacted before any commit, logged as ANTI_RECURRENCE #42.
- 2026-07-06 (overnight, Guy asleep — standing authorization, see memory `project_fable5_overnight_run.md`) — Stage 18 landed (`bbe14b1`). Executed three already-fully-specified items from the pre-approved launch-plan execution order: **2.4** cron reschedule + collision splits + STALENESS_HOURS pairing (`8188fb6`, CI green); **2.2** QA-gate writer fixes in A3/A5 `agent.js` — raised token caps, removed the fallback that fabricated a guaranteed-fail caption, fixed A5's self-contradicting humanizer rule, added A3's missing rubric rules to its own prompt (`d6b6c24`, CI green); **G** doc-retirement banners on all 14 completed-stage FABLE5_*.md docs pointing back to this tracker. Dispatched Stage 19 (blind-spot discovery, categories A-E) in background — quota was available, no code risk (read-only). No Guy-only items touched.
- 2026-07-08 (same session, continued) — Guy asked what else could move forward without him at a
  computer. Offered S20-d (true margin math), S20-e (A7 reprice guard), CF-0d (LangFuse pilot), and an
  A8 LAUNCH_MODE gate (closing the known F12 low-risk finding); Guy said do all four. Discovered CF-0d
  was already shipped 06/07 (`A3_content/agent.js:122-166` already wraps its Claude call in
  `obs.startTrace`/`traceLLM`/`endTrace`) — corrected the stale "Queued" row above instead of
  re-implementing it. Executed the other three: S20-d and S20-e (rows above); A8 gate added (`main()`
  early-return + `LAUNCH_MODE: 'false'` in the workflow, matching the A16/A24 pattern — A8 is a Phase 2
  C-Suite agent per the skeleton, not a Phase-1-exempt one like A3/A5, so this closes a real gating gap,
  not just a cosmetic one).
- 2026-07-08 — Guy away from the computer, asked to work the "Waiting on Guy" list in recommended
  order adjusted for that constraint. Checked the attorney-packet Gmail draft directly (MCP): it still
  has the placeholder `attorney@example.com` recipient and the internal delete-before-sending note —
  contradicts this tracker's prior "Guy confirmed steps 1-3 done" note; flagged to Guy, no action taken
  (needs the real attorney email + Guy's trigger phrase, both Guy-only regardless of device). D4 (GoDaddy
  MX/email auth) also skipped — needs live browser clicks, no MCP available for GoDaddy. Keystone 3.3
  and 3.5 do not require a screen, just a decision, so asked Guy directly: **3.3 → $22** (not Stage 20's
  $24 recommendation); **3.5 → skeleton is canonical**, VISION.md updated to match. Both executed same
  session — see rows above. 3.2 left open (blocked on 3.1, which Guy already deferred).
- 2026-07-06 (same session as the trademark/D4 work) — Stage 21 dispatched and landed: Guy asked for a definitive "Connectivity Fabric" / Autonomous OS roadmap (MCP grading, multi-inbox, social HITL, phased blueprint, circuit breakers). Two read-only Explore passes mapped existing infra (`queue.js`/`hitl.js`/`self-heal.js`/`orchestration/index.js`/Stage 18/Stage 16/A5/CAPI/MCP table/tracker) before a Fable-model planning pass (honoring the brain/executor rule) produced the actual design, which Sonnet then reviewed against the live codebase and wrote into three new docs (`FABLE5_AUTONOMOUS_OS_ROADMAP.md`, `FABLE5_MULTI_INBOX_COMMAND_CENTER.md`, `FABLE5_CIRCUIT_BREAKER_MAP.md`) plus this Stage 21 table and a CLAUDE.md MCP-table reconciliation. Two real findings surfaced, not invented: (1) a standalone "Health-Check Agent" (as originally asked) would have duplicated four existing mechanisms and violated both the Freeze and Stage 18's own verdict — formalized as one system instead; (2) A5 (`agents/A5_social/agent.js`) publishes to Instagram fully autonomously today with zero Guy approval step — a live 10/10-rule violation, now the top-priority O-1 retrofit (CF-1b). Zero code shipped except the CLAUDE.md table edit (docs-only); everything else is gated behind O-1/O-2/O-3 and needs Guy's sign-off (CF-0a) plus a few small decisions (CF-3b canary, CF-3c legal-inbox address, CF-0d LangFuse-pilot go-ahead).
