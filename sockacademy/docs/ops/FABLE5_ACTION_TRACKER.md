# FABLE 5 — Master Action Tracker
**Created 05/07/2026, after Stage 15 (Lead Strategic Architect full-project review).**

**Purpose:** a single living checklist of everything Fable 5 has recommended and everything still
to come — status, owner, and outcome per item. `FABLE5_INITIATIVE_LEDGER.md` stays the
chronological log of what each Fable dispatch produced; this file is the cross-cutting status board
that gets checked off as items actually execute. Update this file (not the ledger) whenever an item's
status changes. New Fable dispatches append new items here rather than starting a new tracker.

**Owner legend:** 🧑 Guy-only decision · 🤖 Claude (Sonnet/Opus) executes · 🧠 Fable drafts/analyzes first.

---

## 📍 Waiting on Guy — prioritized, updated 06/07/2026

Every 🤖-only item with zero decision-blocker has now been executed (see the Log at the bottom for
the full 06/07/2026 overnight + Phase-1 batch). **Everything below requires Guy personally** — reading
this list top-to-bottom is the fastest way back into the project. Nothing here is time-critical in the
sense of "the business breaks tomorrow" — but items 1-2 have the worst cost-of-delay asymmetry in the
whole tracker (cheap now, potentially catastrophic later), so they're listed first on purpose, not by
document order.

1. **🔴 Trademark check** (`FABLE5_STAGE19_BLIND_SPOTS.md` §E2) — a real UK company "Sock Academy
   Ltd" (Companies House 05743003, since 2006, owns `sockacademy.com`) shares this brand's exact name.
   Add Q8 to the attorney packet *before* sending it (already drafted in `FABLE5_ATTORNEY_PREP.md`),
   and do the free 30-min USPTO/UKIPO/EUIPO/ILPO self-search. Highest cost-asymmetry item in the project.
2. **🔴 Shopify email authentication** (§D4) — `sockacademy.store` can't authenticate order-confirmation
   emails today (no SPF, DKIM CNAMEs missing, DMARC reports vanish into GoDaddy). ~15 min: Shopify
   Admin → Notifications → Sender email → Authenticate domain, then a root SPF TXT + redirect the
   DMARC `rua=`. Best done before the first real order.
3. **Send the attorney packet** (tracker item 1.3 / Keystone B) — the single true external pre-launch
   blocker. Now includes Q8 (item 1 above).
4. **Keystone Decision Week** (item B below — 3.1 positioning, 3.2 discounts, 3.3 price floor, 3.5
   VISION numbering) — memos already drafted in `FABLE5_KEYSTONE_DECISION_MEMOS.md`, ≤1hr total. 3.1
   unblocks the homepage rewrite (2.7) and the Design Freeze partial-lift batch (item C, which also
   unblocks Sock Finder v2 + the new footer contrast fix found tonight).
5. **Remaining Stage 19 quick checks**, no particular order, ~5-30 min each: Shopify tax settings (no
   US collection enabled), GoDaddy 2FA/auto-renew/transfer-lock, continuity note + Google Inactive
   Account Manager, monthly manual Supabase dump, Israeli tax file via accountant.
6. **Optional, whenever convenient:** generate a Supabase read-only Personal Access Token (Dashboard →
   Account Settings → Access Tokens) so Claude can install the read-only Supabase MCP server (exact
   command already in `CLAUDE.md`'s MCP table) — lets future sessions verify the live DB schema
   directly instead of asking you to relay it.

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
| S20-a | Read Part 1 before deciding 3.3 (and 3.1) — floor recommendation $24 | 🧑 | Not started | New decision-relevant input for the Keystone memos; supports memo 3.3-A, neutral on 3.1 |
| S20-b | Runbook pre-flight (~30 min): Shopify app push ON, Settings→Payments gateway check, Settings→Shipping <$50 rate check, CJ login/wallet, CJ-Shopify-app connection check, real-`cj_pid` check, D4 email-auth fix | 🧑 | Not started | Everything needed so order #1 is a 15-min non-event; D4 + cj_pid items already tracked elsewhere — no duplication, this is the bundle |
| S20-c | Sample order (item K) also captures: CJ invoice lines (item/shipping/any fee), real payout fees, delivery days → replace every [EST] in the Part 1 model | 🧑 | Not started | Rides the already-tracked item K, zero extra effort |
| S20-d | Fix margin math: A15 `getCatalogMargins` + A1 `suggestRetailPrice` → true-contribution formula via shared constants in `corp/core/pricing.js`; recalibrate A15's `<40%` alert | 🤖 (with Guy's go-ahead) | Queued | Bug-fix-class under the freeze but touches financial reporting — Guy approves timing; natural slot: A15's Phase 2 activation, earlier if Guy wants honest pre-revenue reports |
| S20-e | Guard A7's 2.5× auto-reprice (floor/ceiling clamp) BEFORE `PRICE_WARN_PCT`/`PRICE_CRITICAL_PCT` are ever configured | 🤖 (with Guy's go-ahead) | Queued | Inert today; standing rule until fixed: do not set those env vars |
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
| 3.3 | Single-pair price floor | Pricing pages, positioning (3.1) | Not started |
| 3.5 | VISION.md A-numbering cleanup | Documentation consistency | Not started |
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
- 2026-07-05 — Tracker created after Stage 15. All items above are Not Started; nothing executed yet.
- 2026-07-05 — Item B handoff done: `FABLE5_KEYSTONE_DECISION_MEMOS.md` drafted by Claude (Sonnet), 5 memos ready for Guy's read. Brain/executor model confirmed by Guy and saved to memory.
- 2026-07-05 — Stage 16 items I-N added: homepage copy re-cut (50-row table), A2.7/A16.5 constitutional amendment draft, GTM plan, and two new verified findings (Sock Finder recommends BLOCKED novelty products below the price floor; homepage carries two fabricated facts — false founding year, false category count). All Not Started.
- 2026-07-05 — Stage 17 items O-S added: Claude Code/Desktop tooling audit (magic MCP key exposure + removal, MCP doc-vs-reality reconciliation, allowlist pruning, skills table gap). Security incident found and fixed same-pass: subagent printed a key fragment into its own doc, redacted before any commit, logged as ANTI_RECURRENCE #42.
- 2026-07-06 (overnight, Guy asleep — standing authorization, see memory `project_fable5_overnight_run.md`) — Stage 18 landed (`bbe14b1`). Executed three already-fully-specified items from the pre-approved launch-plan execution order: **2.4** cron reschedule + collision splits + STALENESS_HOURS pairing (`8188fb6`, CI green); **2.2** QA-gate writer fixes in A3/A5 `agent.js` — raised token caps, removed the fallback that fabricated a guaranteed-fail caption, fixed A5's self-contradicting humanizer rule, added A3's missing rubric rules to its own prompt (`d6b6c24`, CI green); **G** doc-retirement banners on all 14 completed-stage FABLE5_*.md docs pointing back to this tracker. Dispatched Stage 19 (blind-spot discovery, categories A-E) in background — quota was available, no code risk (read-only). No Guy-only items touched.
