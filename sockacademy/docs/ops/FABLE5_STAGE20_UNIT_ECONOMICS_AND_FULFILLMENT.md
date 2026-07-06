# FABLE5 STAGE 20 — True Unit Economics Reality Check + Day-1 Manual Fulfillment Runbook

**Written 06/07/2026 (Fable 5, Lead Strategic Architect dispatch). 100% read-only pass — no code, config, or doc changes except this file + the ledger/tracker entries it names. Timed deliberately to land BEFORE Guy decides Keystone items 3.1 (positioning) and 3.3 (price floor).**

**Verified directly this pass:** `agents/A1_product_research/agent.js:584-599` (`suggestRetailPrice`), `agents/A15_cfo/agent.js:83-115` (`getCatalogMargins`), `corp/core/products_table.sql` (full schema), `corp/core/pricing.js` (ceilings), `agents/A7_supplier_monitor/agent.js` (CJ API + `MARKUP_MULTIPLIER`), `.github/workflows/shopify-webhook-handler.yml` (order-event plumbing), `scripts/setup/register_webhooks.js` (webhook topics), `scripts/setup/create_faq_and_redirects.js` (shipping promises), `templates/index.json` + `sections/header-group.liquid` copy ("Free Shipping Over $50"), `PHASE_ARCHITECTURE_SKELETON.md` (A2.7 spec), `FABLE5_COMPETITIVE_PRICING.md`, `FABLE5_KEYSTONE_DECISION_MEMOS.md`, `FABLE5_STAGE16_DELIVERABLES.md` §4.3, `FABLE5_STAGE18_ORCHESTRATION_ARCHITECTURE.md`.

**Live-data caveat:** Supabase read access is not available in this environment (read-only MCP still blocked on the account PAT — tracker "Waiting on Guy" item 6). All product/price inputs below are **documented examples from `FABLE5_COMPETITIVE_PRICING.md` and A1's own plausibility bounds, not a live query.** The model is parameterized so real rows can be dropped in later without re-deriving anything.

---

# PART 1 — TRUE UNIT ECONOMICS REALITY CHECK

## 1.1 What every margin number in this project actually is (repo-verified)

Two functions produce every margin figure Guy has ever seen from this system, and both compute the same thing:

- **A1** (`agent.js:596-597`): `margin = retail - supplierPrice`; `marginPct = (retail - supplierPrice) / retail`.
- **A15 CFO** (`agent.js:97`): `gross_margin_pct = (retail_price - supplier_price) / retail_price` — this is the number in every `executive_reports` row and the input to A15's "Low avg catalog margin" alert threshold (`< 40%`, line 152).

**There is no handling anywhere in the codebase for payment fees, shipping cost to the customer, CJ order costs beyond item price, or refunds.** Confirmed by schema too: `products_table.sql` has exactly two money columns (`supplier_price`, `retail_price`) — no shipping-cost, fee, or landed-cost column exists, used or unused. So every number to date is a **raw product-cost margin**, not a contribution margin.

One adjacent live-code finding while in A7 (`agent.js:50,268`): on a supplier price change, A7 auto-reprices Shopify at `MARKUP_MULTIPLIER = 2.5×` supplier price — a multiplier that contradicts A1's own 3.8-5× logic and can set retail *below the $18 floor* (supplier $5 → retail $12.50). It is **currently inert** (both `PRICE_WARN_PCT`/`PRICE_CRITICAL_PCT` are null, so price-change events never fire — matches the yaml-reality-audit finding from 06/07), but it arms itself the moment Guy configures those thresholds. Queued as a code fix below; do not set those env vars before it's fixed.

## 1.2 The missing cost layers, one by one

Every line below is labeled **[REPO]** (verified in this repo), **[EXT]** (external published rate, not repo-verifiable), or **[EST]** (estimate — verify on the sample order, tracker item K).

1. **Payment processing.** [EXT] Shopify Payments' published standard online card rate on the Basic plan is **2.9% + $0.30** per transaction (US benchmark); Shopify Payments *bundles* processor + gateway — there is no separate "Shopify transaction fee" when using it. **However:** [EXT, decision-relevant] Shopify Payments' country list has historically *not included Israel*; if this store runs a third-party gateway (e.g. PayPal at ~3.5% + fixed), Shopify Basic adds its own **2% third-party-gateway transaction fee on top** — total ~5.5% + $0.49. Which gateway is live is not determinable from the repo. **Guy: check Shopify Admin → Settings → Payments — this one screen decides whether fees are ~3% or ~5.5% of every sale.** The model below uses 2.9% + $0.30 (best case) and shows the third-party delta. A possible extra ~1.5-2% currency-conversion fee on USD→ILS payouts is also [EXT] and worth confirming on the first real payout.
2. **CJ per-order fulfillment/handling fee.** [EXT] CJ Dropshipping's published model is **product cost + shipping cost, no monthly fee and no separate per-order handling fee** for standard dropshipping — CJ's margin is embedded in the item price. Medium confidence (their pricing page has said this consistently); treat as assumed-zero and **confirm on the sample order** — if a service fee appears on the CJ invoice, add it as a per-order constant.
3. **Shipping to the customer.** [EST] One pair of socks ≈ 60-120g. CJ's economy lines (CJPacket ordinary) China→US for that weight class typically run **~$3.50-6.50, 8-15 days**; UK/EU similar (~$4-7). Model uses **$5.00 per single-pair order** ($7 for a 2-pair order). [REPO] Who eats it: the live site promises "Free Shipping Over $50" (`templates/index.json:19`, `sections/header-group.json:14`, FAQ) and the FAQ says under-$50 shipping is "calculated at checkout" — so **≥$50 orders: the brand eats the full CJ shipping cost; <$50 orders: whatever the checkout charges offsets it, but the configured checkout rates live in Shopify Admin, not the repo — unverified.** The model's single-pair rows assume worst case (brand eats it); if checkout charges e.g. $4.99, add that straight back to contribution. Nothing anywhere in the repo prices shipping into `retail_price` — A1's multiplier is applied to item cost only [REPO].
4. **Returns/refunds.** [EST] Online apparel overall returns ~15-25% (industry range); socks are structurally one of the lowest-return apparel categories (low fit risk, hygiene norms) — a reasonable planning band is **2-8%**. Model uses a **5% full-refund allowance** on revenue. Note the skeleton's own A16.5 entry already leans replace-or-refund-without-return — under that policy a *replacement* costs item + shipping again (≈ **$10** at these assumptions), which matters at the low floor (see 1.4).
5. **WELCOME10.** [REPO] 10% first-order discount is live (CLAUDE.md). Every founding-cohort first order is effectively priced at 0.9 × floor. Shown as a table note.
6. **Fixed costs (context, not per-unit).** [EXT] Shopify Basic ≈ $39/mo + domain; everything else free-tier. At ~$10 true contribution/unit, ~4 orders/month cover the subscription — not a launch risk, just the baseline.

## 1.3 The true contribution model

`True CM = P − C − S − (fee% × P + fee$) − refund_allowance(5% × P)`
where P = retail, C = CJ item cost, S = CJ shipping (customer-side offset unknown, assumed $0).

Supplier costs are **documented examples** [EST]: C = $5 for standard-premium (A1's own code flags real merino under $4 as implausible, so $4-6 is the realistic band for the current catalog's cotton/blend tier), C = $6-8 for premium/merino. Live products sell at ~$34.99 (per the pricing/brand-voice audits).

| Price point | C | S | Fees (2.9%+$0.30) | Refund 5% | **True CM** | **True CM %** | Naive repo margin % | Overstatement |
|---|---|---|---|---|---|---|---|---|
| **$18.00** (current floor) | $5 | $5 | $0.82 | $0.90 | **$6.28** | **34.9%** | 72.2% | **−37 pts** |
| **$22.00** (memo 3.3 low) | $5 | $5 | $0.94 | $1.10 | **$9.96** | **45.3%** | 77.3% | −32 pts |
| **$24.00** (memo 3.3 high) | $5 | $5 | $1.00 | $1.20 | **$11.80** | **49.2%** | 79.2% | −30 pts |
| **$28.00** (premium floor) | $6 | $5 | $1.11 | $1.40 | **$14.49** | **51.7%** | 78.6% | −27 pts |
| **$35.00** (merino floor ≈ live ~$34.99) | $8 | $5 | $1.32 | $1.75 | **$18.94** | **54.1%** | 77.1% | −23 pts |
| **$56.00** (2×$28, free ship) | $12 | $7 | $1.92 | $2.80 | **$32.28** | **57.6%** | 78.6% | −21 pts |

Deltas to apply per row:
- **Third-party gateway + 2% Shopify fee** [EXT]: subtract a further ~$0.65-1.00/unit (e.g. $22 row: $9.96 → ~$9.20).
- **WELCOME10 first order** [REPO]: at $18 → true CM ≈ **$4.70**; at $22 → ≈ $7.90; at $24 → ≈ $9.60.
- **Checkout shipping charge on <$50 orders** (if configured): add it back ~1:1.

**Break-even sanity check (honest calibration):** solving True CM = 0 at C=$5/S=$5 gives P ≈ **$11.20** (≈ $11.70 under the worst-case gateway). So nothing in the current price architecture is underwater — this dispatch did *not* find a business-killing hole, and it should not be read as one. What it found is that **every margin the fleet reports is overstated by roughly 20-40 percentage points**, and that the overstatement is largest exactly at the price point Guy is about to decide (the single-pair floor).

## 1.4 Direct recommendation — the price floor (feeds Keystone 3.3)

**Set the single-pair floor at $24 — the top of the memo's own $22-24 band. Unhedged.**

- At **$18**, true contribution is ~$6.30/unit (~35%) — and ~$4.70 on a WELCOME10 first order, the order type the entire GTM plan (Founding Cohort) is built to generate. One replace-don't-return service gesture (≈$10 item+ship) burns the contribution of ~1.6 orders. There is zero room for even cheap paid acquisition — $6 of contribution cannot buy a single converting click at apparel CPCs. $18 is not a loss; it is a floor with no shock absorber.
- At **$24**, true contribution is ~$11.80 (~49%), still ~$9.60 on a WELCOME10 first order; one service gesture costs less than one order's margin; the unit finally carries a defensible buffer. $22 is acceptable ($9.96, 45%) — but since the memo's stated rationale for the raise is clearing the Happy Socks/Stance novelty band, and $24 clears it by more while remaining inside the CLAUDE.md-approved $18-28 range, take the extra $2. It is worth ~18% more contribution per unit at zero structural cost, pre-traffic, when conversion-rate risk is hypothetical.
- **$28/$35/$65 floors: leave as-is** (unchanged from Stage 10). Their true margins (52-54%) are genuinely healthy — the earlier verdict that "the floors are sound" survives the corrected math *except at $18*.
- The competitive-pricing doc's own numbers already justified $22-24 on positioning grounds; this analysis reaches the same band independently on economics grounds. Two unrelated methods, one answer — that is what a defensible floor looks like.

## 1.5 What this changes for 3.1 (positioning) — plainly

**It does not change which positioning is viable. It narrows nothing between option A (premium-performance-now) and option B (luxury-claim-now); it adjusts the floor within either.** True luxury (option B) was already ruled out for Phase 1 on *product* grounds (dropship goods can't testify to a $150 register — Stage 10, memo 3.1), and 45-55% true contribution margins neither rescue B nor undermine A. If anything the corrected math mildly *reinforces* A: a premium-performance brand at $24-35 with ~50% true contribution is a self-funding organic-growth machine; a luxury claim would demand spending that contribution on presentation the product can't back.

**Flag for Guy, explicitly:** this is new decision-relevant information arriving after the 3.1/3.3 memos were drafted. It **strengthens memo 3.3's recommendation (raise the floor) and is neutral on memo 3.1** — it does not override the existing lean toward eventual luxury framing (deferred, per Guy 05/07); it just prices Phase 1 honestly while that lean matures toward Phase 4.

## 1.6 Queued code fixes — 🤖 future session, NOT now (freeze discipline)

None of these require a new agent/table/workflow; all are corrections to existing code, so they qualify as bug-fix-class work under the freeze — but they touch financial reporting logic, so they get Guy's explicit go-ahead first, not silent execution:

1. **A15 true-contribution formula** (`agents/A15_cfo/agent.js:90-114`): rename the current field honestly (`product_cost_margin_pct`) AND add `est_contribution_margin_pct` using constants (fee%, fee$, est. shipping, refund allowance) in a shared module — natural home: extend `corp/core/pricing.js`, which is already the pricing single-source-of-truth. Recalibrate the `< 40%` alert against the *contribution* figure. Timing: fine to fold into A15's Phase 2 activation (A15 is a Phase 2 agent anyway); do it earlier only if Guy wants the CFO reports honest pre-revenue — cheap either way.
2. **A1 same fix** (`agents/A1_product_research/agent.js:596-597`): A1's suggestion emails show `marginPct` to Guy during product approval — the number he curates by. Same shared-constants fix.
3. **A7 `MARKUP_MULTIPLIER` guard** (`agents/A7_supplier_monitor/agent.js:50,268`): before anyone ever sets `PRICE_WARN_PCT`/`PRICE_CRITICAL_PCT`, the 2.5× auto-reprice must be floor-clamped (respect `corp/core/pricing.js` ceilings AND the VISION price floors) or aligned with A1's multiplier logic. Until fixed: **do not configure those thresholds** (they are unset today, so the path is inert).
4. **Sample-order calibration task** (🧑, rides tracker item K): capture from the first real CJ order — actual CJ invoice line items (item, shipping, any service fee), actual checkout fees from the Shopify payout, actual delivery days. Replace every [EST] above with measured values; the model then stops being an estimate.

---

# PART 2 — DAY-1 MANUAL FULFILLMENT RUNBOOK

**Premise (Stage 18, confirmed):** until A2.7 exists (Phase 2), Guy personally fulfills every order. The skeleton says this is deliberate for orders ~1-25 — the founder learns the failure modes before automating them. This is the document that was missing: what Guy actually does when order #1 arrives.

## 2.1 The trigger — what actually tells Guy an order exists (verified)

**Repo reality:** the webhook chain exists and works — Shopify `orders/create`/`orders/paid` → Make.com → `repository_dispatch` → `shopify-webhook-handler.yml` → `queue.orderCreated()` push to Upstash. **And then nothing.** No consumer, no Telegram, no email — the event sits in a queue no one reads (Stage 18's known gap, correctly frozen until A2.7). **No code in this repo will notify Guy of an order today.**

**What notifies him instead (external Shopify defaults):**
- Shopify's built-in **staff "New order" email** to the store-owner address — verify it's on: Shopify Admin → Settings → Notifications → Staff notifications. (These come from Shopify's own sending domain, so they are NOT affected by the D4 email-auth gap — that gap hits *customer*-facing mail.)
- **The Shopify mobile app with push notifications enabled — install it now, tonight.** This is the real 11pm trigger; email alone is too easy to sleep through, and there is no Telegram fallback until A2.7.

**One-time pre-flight (do these BEFORE the first order, ~30 min total):**
- [ ] Install Shopify mobile app + enable order push notifications. 🧑
- [ ] Check Settings → Payments: which gateway is live (decides the Part 1 fee reality). 🧑
- [ ] Check Settings → Shipping: what a <$50 order actually charges the customer at checkout. 🧑
- [ ] Confirm CJ account login works + CJ wallet has ~$50 balance (a CJ order you can't pay for at 11pm is a fulfillment delay with a countdown attached). 🧑
- [ ] Determine whether the Shopify store is **connected to CJ's official Shopify app** (CJ dashboard → Authorization/My Stores). The repo's integration is API/webhook-only — nothing in the codebase implies the CJ app link exists, and it changes step 3 below. 🧑
- [ ] Verify the live products' `cj_pid` values in Supabase are REAL CJ IDs — A7 was documented as monitoring MOCK products (VISION.md fleet table); a mock ID means you cannot find the item on CJ at order time. This check rides the sample order (tracker item K). 🧑
- [ ] Do the D4 email-authentication fix (Waiting-on-Guy item 2) — otherwise the customer's order/shipping confirmations may land in spam, and the first "where is my order?" email arrives before the socks do. 🧑

## 2.2 Per-order procedure (the full version)

**Step 0 — Payment check (2 min).** Shopify Admin → Orders → the order. Confirm: payment status **Paid** (not Pending/Authorized), and the fraud-analysis panel shows no red flags. Never place a CJ order against an unpaid or flagged order — this is the same payment-cleared rule A2.7 will encode.

**Step 1 — Honor the cancellation window.** The live FAQ promises customers can modify/cancel **within 1 hour**. So: wait ≥1 hour after the order before placing it with CJ. Practical rule: **place CJ orders in one daily batch** (e.g. every morning ~09:00) — well inside the site's stated "dispatched within 48 hours," zero risk of paying CJ for an order the customer just cancelled, and it converts night orders into a calm morning task instead of an 11pm scramble.

**Step 2 — Pull the CJ identity of each line item.** The mapping lives in Supabase `products`: `cj_pid` (CJ product ID), `product_url` (CJ listing), `shopify_id` (join key to the Shopify product). Fastest lookup: Supabase Dashboard → Table Editor → `products` → filter by `product_name`. Keep a one-page cheat-sheet of the (currently ~5) live products' name → cj_pid → CJ URL so at order time this is a glance, not a query.

**Step 3 — Place the order on CJ (path depends on pre-flight):**
- **Path A — CJ Shopify app is connected:** the paid order auto-appears in CJ dashboard → Orders (usually minutes). Open it, confirm the variant mapping and address are right, choose shipping method, click confirm/pay. Done.
- **Path B — no app connection (assume this until proven otherwise):** CJ dashboard → Orders → **Create Order** (manual). Product: paste the `cj_pid` / open `product_url` and select the exact variant (size/color must match the Shopify line item exactly). Shipping address: copy **character-for-character** from the Shopify order (customer-entered — do not "fix" anything except obvious country-format requirements). Shipping method: CJPacket-class economy (8-15 days, matches the FAQ promise) — express only if the customer paid for express at checkout. Pay from CJ wallet/card. **Record the CJ order number immediately** (step 6).

**Step 4 — Get the tracking number.** CJ processes 1-3 days, then a tracking number appears on the CJ order (email + dashboard). If **no tracking after 3 calendar days**: open a CJ support ticket ("dispute/inquiry" on the order) same day — the 48h-dispatch site promise is already broken and the customer note in 2.3 applies.

**Step 5 — Put the tracking into Shopify (this is what the customer sees).** Shopify Admin → Orders → the order → **Fulfill items** → enter tracking number → carrier: pick the real last-mile carrier if CJ names one (USPS, Yun Express, 4PX…); otherwise "Other" with tracking URL `https://t.17track.net/en#nums=<tracking>` → keep "Send shipment details to your customer" checked → Fulfill. Shopify sends the native shipping-confirmation email with the tracking link; the order flips to Fulfilled. **This step is the entire customer-visible difference between a brand and a mystery** — never batch-delay it; do it the moment tracking exists.

**Step 6 — Log it.** One row per order in a simple fulfillment log (Google Sheet — do NOT create a new Supabase table under the freeze): `shopify_order#, order date, CJ order#, CJ item cost, CJ shipping cost, any CJ fee, date placed, tracking#, date tracking entered, delivered date, notes`. Two reasons: (a) it is the manual version of — and the seed data for — A2.7's `fulfillments` table and its 0%-discrepancy reconciliation; (b) the three cost columns feed the Part 1 model with real numbers per order. Weekly 2-minute reconciliation: count of Paid orders in Shopify == rows in the log == orders in CJ. Any mismatch is the worst failure class in the company (a paid, unfulfilled order) — fix same day.

**Step 7 — Watch delivery (passive).** Once/day, glance at 17track for open shipments. Delivered → mark the log. Stuck >20 days → treat as at-risk: message the customer *before* they message you (template C below), open a CJ dispute.

## 2.3 What to tell the customer, and when (manual A16.5)

All automatic today [REPO-adjacent — Shopify/Klaviyo native]: order confirmation (Shopify, on purchase), shipping confirmation + tracking (Shopify, at step 5). Manual sends, brand register (Iron Law 2 — short, factual, no exclamation marks, no emoji), from hello@sockacademy.store:

- **A. Dispatch delay** (no CJ tracking by 48h after order): *"Your order is being prepared and will dispatch shortly. Tracking follows the moment it ships. Delivery typically runs 8-14 days — we state it plainly because most won't."*
- **B. First-order note** (optional, founding-cohort era, sent with or just after fulfillment): *"Your pair is on its way — tracking below. One request: when it arrives, wear it a full day before you judge it. That's the test we hold every pair to."*
- **C. Shipment at risk** (>20 days in transit, proactive): *"Your order is taking longer than our standard. We're on it with the carrier. If it hasn't arrived within 7 days, we replace it — no forms, no return."* (Consistent with the replace-don't-return economics in Part 1 and the A16.5 skeleton policy lean. The replacement decision itself stays Guy-only.)
- **Stage 16 §4.3 tie-in:** the honest delivery framing ("Dispatched within 48 hours. Delivered in 8-14 days.") belongs on the product/FAQ surfaces *before* launch — slow shipping confessed is premium; slow shipping discovered is fatal. That copy change is part of the pending homepage/copy batch (item I), not this runbook.

## 2.4 The 11pm checklist (print this)

**When the order push arrives, tonight's job is only steps 1-3. The rest is tomorrow morning.**

```
TONIGHT (5 minutes, half-asleep is fine)
 1. Open Shopify app → the order. Status = Paid? Fraud panel clean?
    → Not Paid / flagged: do nothing. Re-check in the morning.
 2. Anything unusual? (PO box, express shipping paid, >3 pairs, weird address)
    → Note it for the morning. Nothing else.
 3. Go back to sleep. The site promises 48h dispatch. You have time.

TOMORROW MORNING (~10 min/order, batch all overnight orders)
 4. Confirm >1h has passed since each order (cancellation window).
 5. For each line item: get cj_pid from the cheat-sheet / Supabase `products`.
 6. CJ dashboard → order exists already (app-connected)? Confirm + pay.
    Otherwise: Create Order → exact variant → address copied character-
    for-character from Shopify → economy shipping (CJPacket class) → pay.
 7. Log the row: Shopify#, CJ#, item cost, shipping cost, date.

WHEN CJ EMITS TRACKING (day 1-3)
 8. Shopify → order → Fulfill items → tracking# + carrier (or "Other" +
    17track URL) → "Send shipment details" ON → Fulfill.
 9. Log the tracking# + date. If no tracking by day 3: CJ ticket + send
    customer template A.

DAILY (2 min)   17track glance on open shipments; >20 days → template C.
WEEKLY (2 min)  Paid orders in Shopify == log rows == CJ orders. Mismatch
                = same-day fix, highest priority in the company.
```

## 2.5 Where this breaks, and the number that triggers A2.7

Per-order manual cost: ~10-15 min (steps 4-9) plus the daily/weekly sweeps. The failure modes at volume, in the order they'll appear: (1) a missed order in the daily batch (the reconciliation catches it — weekly becomes daily-mandatory above ~3 orders/day); (2) address/variant transcription errors under time pressure; (3) tracking-entry lag stretching past the customer's patience; (4) Guy traveling/sick = the company's only fulfillment worker is offline (the Stage 19 bus-factor item, now with a per-day cost attached).

**The number: sustained ~5 orders/day (~150/mo) is the hard ceiling for one person doing this well; ~3/day sustained for a week is the honest yellow line.** And the arithmetic converges with the constitution on its own: 25 cumulative orders — the Phase 2 activation trigger — arrives within days at that pace. So the rule requires no new policy: **the moment order flow makes this runbook feel like a job rather than an errand (≥3/day sustained, or 25 cumulative — whichever first), that is `PHASE_2_ACTIVATE_BY_GUY`, and A2.7 is the first build (before A14/A15, per its skeleton entry), starting with Q-HARDEN per Stage 18 O-1.** This runbook is deliberately disposable: its whole purpose is to be replaced by A2.7 with Guy knowing exactly what the automation must never get wrong, because he did it by hand first.

---

# Bottom line — two actions

1. **3.3 (Guy, before/with the Keystone decisions):** raise the single-pair floor to **$24** ($22 acceptable, $24 preferred). True contribution at $18 is ~$6.30/unit (~35%) — positive but shock-absorber-free; at $24 it is ~$11.80 (~49%). The corrected math independently confirms memo 3.3's recommendation and is **neutral on 3.1** — premium-performance-now (option A) stands on its existing rationale; nothing here forces or forbids Guy's deferred luxury lean.
2. **Fulfillment (Guy, ~30 min tonight):** do the 2.1 pre-flight list (Shopify app push, gateway check, CJ login/wallet, CJ-app connection check, real-cj_pid check, D4 email fix) — after that, this runbook makes order #1 a 15-minute non-event instead of an improvisation. Everything the runbook could not verify from the repo (gateway, checkout shipping rates, CJ app link, CJ fees) is measured for free on the sample order (tracker item K), which remains the single highest-ROI pending action in the project.

**End of Stage 20 deliverables.**
