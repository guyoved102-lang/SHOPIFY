# FABLE5 STAGE 16 — Deliverables: Homepage Copy Re-Cut · A2.7/A16.5 Constitutional Amendment · Go-to-Market Plan
**Written 05/07/2026 (Fable 5, Lead Strategic Architect dispatch, Stage 16 — continuation of Stage 15). Read-only on all code/theme/config; outputs of this pass: this file + appended tracker rows + one ledger line.**

> 📌 **Status tracked live in `FABLE5_ACTION_TRACKER.md`** (items I-N). This file remains the detailed source — read it for depth, not for current status.

**Basis (read in full this pass):** `FABLE5_INITIATIVE_LEDGER.md`, `FABLE5_ARCHITECT_FULL_REVIEW.md` (my own Stage 15 output — built on, not repeated), `FABLE5_ACTION_TRACKER.md`, `FABLE5_KEYSTONE_DECISION_MEMOS.md`, `VISION.md`, `PHASE_ARCHITECTURE_SKELETON.md` (Phase 2 format studied closely), `sockacademy/CLAUDE.md`, `2026-07-04-design-recommendations.md`, `FABLE5_BRAND_VOICE_AUDIT.md`, `templates/index.json`, and the live Liquid of `hero.liquid`, `ticker` settings, `features.liquid`, `collections-preview.liquid`, `about.liquid`, `blog-preview.liquid`, `sock-finder.liquid`. Fulfillment-gap re-verified by fresh grep this pass: zero `createOrder`/order-placement code in any agent — the "fulfillment" strings in A2/A12/A16 are read-only status filters.

**Positioning assumption:** all copy below assumes Keystone Memo 1's recommendation (premium-performance now, luxury register as ceiling not claim, true luxury at Phase 4). Rows whose wording would change if Guy chooses the other direction are marked **[3.1-sensitive]**. Per my own Stage 15 categorization, #14 does not *wait* for 3.1 — but those marked rows should be re-read for one minute if 3.1 lands the other way.

**Restating my Stage 15 position, once, briefly** (Guy's framing invited candor): "everything built before we put up a product" is a condition I respect and — as of Stage 15 — consider *met* for the backend. What is genuinely not yet built is the **market-facing layer**: sellable inventory, real photographs, a warm list, community credibility. Those are also "building" — but they can only be built in contact with the market. Deliverable 3 below is written so that building the go-to-market machine and launching stop being opposites: the Founding Cohort list is construction work, not selling. Nothing in this stage asks Guy to sell before he's ready; it asks him to stop treating audience-building as if it were selling.

---

# DELIVERABLE 1 — Homepage Copy Re-Cut (design-recommendations item #14) — READY TO SHIP

**Scope:** every visitor-facing string on the homepage. Copy only — zero CSS, zero structural change. Register target: MG-1 / Welcome Email 2 (the estate's own best pieces). Hard rules applied: no "perfect" (was ×4), no rhetorical questions, no "around the world", no accessibility framing, no self-labeling ("premium quality" as a badge), no hedging ("we believe"), no puffery ("on the planet", "changes everything"), no unverifiable claims introduced.

**Implementation notes for Claude (read before touching anything):**
1. `about` and `blog_preview` in `templates/index.json` have empty `settings: {}` — their live text comes from schema **defaults** in the `.liquid` files. Apply new copy by **writing explicit settings into `index.json`**, not by editing schema defaults (defaults leak to any other page using those sections; index.json is the homepage's own data).
2. Sock Finder heading strings are `index.json` settings (safe), but its result/UI strings live **inside the section's JavaScript** (`sections/sock-finder.liquid` ~lines 494–504). Those three micro-strings are included below as copy edits; the full quiz-matrix rewrite belongs to item #8, *except* the two constitutional violations flagged in Deliverable 4 — those should not wait.
3. Rows marked **[VERIFY]** contain factual claims Guy must personally confirm true before shipping. Do not ship a [VERIFY] row unverified — the brand-voice audit's pattern #4 (unsourced claims stated as fact) must not be re-introduced by the fix.
4. Row 20 ("No Theatre" option) is only shippable together with design item #1 (sale-grammar removal) — same approved batch C, but if #1 slips, use the fallback in that row.

## The table — old → new, line by line

### Hero (`index.json → sa_hero.settings`)

| # | Key | Current (live) | Proposed | Notes |
|---|-----|----------------|----------|-------|
| 1 | `eyebrow` | The World's Sock Specialists | **KEEP** | On-register assertion. Note: "world's" appears 3× on the page (rows 1, 34, ticker) — varied below. |
| 2 | `heading` | Wear Something\nWorth Noticing | **KEEP** | Audit already judged the hero line fine. |
| 3 | `subtext` | Premium socks, expertly curated from the world's finest makers. Every pair earns its place. | Merino, Egyptian cotton, Coolmax — selected pair by pair. Every one earns its place. | Removes self-praise adverb ("expertly") and the unverifiable "world's finest makers"; leads with material facts instead. **[3.1-sensitive]** — under a luxury-now ruling this line would need real mill provenance. |
| 4 | `cta_label` | Shop Now | Explore the Catalogue | "Shop Now" is urgency grammar. |
| 5 | `cta2_label` | Our Story | **KEEP** | Plain and fine. |
| 6 | `badge_text` | Est. 2024 · Premium Quality | Est. 2026 | **[VERIFY]** — "Est. 2024" appears to be false (every project record starts 06/2026). A fabricated founding date on a brand built on "standards" is a live integrity defect — see Deliverable 4.2. "Premium Quality" is self-labeling; a $250-tier brand never says the word "premium" about itself in a badge. |

### Ticker (`index.json → ticker.settings.text`)

| # | Key | Current (live) | Proposed | Notes |
|---|-----|----------------|----------|-------|
| 7 | `text` | PREMIUM QUALITY · FREE SHIPPING OVER $50 · THE WORLD'S FIRST SOCK AUTHORITY · MERINO WOOL · COOLMAX TECHNOLOGY · GIFT SETS AVAILABLE | THE WORLD'S FIRST SOCK AUTHORITY · MERINO WOOL · EGYPTIAN COTTON · COOLMAX · CURATED, NOT COLLECTED | Removes the two mid-market signals ("FREE SHIPPING OVER $50", "GIFT SETS AVAILABLE") and the self-label. If the $50 free-shipping threshold is a real live offer, state it quietly at cart/footer level — a marquee is the wrong register for logistics. **Optional upgrade:** design item #2's "From the Archive" fact ticker (e.g. "MERINO FINER THAN 19.5 MICRONS SITS BELOW THE SKIN'S PRICKLE THRESHOLD · A HAND-LINKED TOE CLOSES THE SEAM WITHOUT A RIDGE") is strictly better — but Stage 15 tiered #2 behind the positioning decision, so the minimal recut here is the ship-now value and the fact ticker is one Guy nod away. |

### Features / "Why SOCKACADEMY?" (`index.json → features`)

| # | Key | Current (live) | Proposed | Notes |
|---|-----|----------------|----------|-------|
| 8 | `settings.eyebrow` | Why choose us | Three commitments | |
| 9 | `settings.heading` | Why SOCKACADEMY? | The SockAcademy Standard | Kills the rhetorical question (gate-banned pattern sitting on the live homepage). |
| 10 | `card-1.title` | Premium Quality | Material, Stated | |
| 11 | `card-1.text` | Only the finest materials for your feet. | The fiber content of every pair is disclosed — grade and blend, stated plainly. | **[VERIFY]** — true only if every live product listing actually states fiber content. Current 5 products do; this line makes it a standing commitment. |
| 12 | `card-2.title` | Global Selection | Curated, Not Collected | Retires the "around the world" family entirely — "global selection" reads AliExpress, per the audit. |
| 13 | `card-2.text` | Socks from around the world. | A deliberately small catalogue. Most of what we review never enters it. | **[VERIFY]** — structurally true (A1 scores dozens, few are listed; A2.5 gate rejects), but Guy must be willing to stand behind it as a public claim. |
| 14 | `card-3.title` | Expert Curation | Kept Right | |
| 15 | `card-3.text` | Hand-picked by sock specialists. | If a pair falls short of its listing, we replace it. That is the whole policy. | A checkable promise instead of filler. Wording must survive attorney review of the returns policy (packet 1.3) — flag to attorney. |

### Collections preview (`index.json → collections_preview`)

| # | Key | Current (live) | Proposed | Notes |
|---|-----|----------------|----------|-------|
| 16 | `settings.eyebrow` | Shop by category | The Catalogue | |
| 17 | `settings.heading` | Our Collections | **KEEP** | |
| 18 | `settings.subheading` | Find the perfect sock for every occasion. | Six categories. One standard. | Removes banned "perfect" (1 of 4). |
| 19 | `card-noshow.text` | Invisible comfort for low-cut shoes. | **KEEP** | Passable register; not worth churn. |
| 20 | `card-crew.text` | The everyday classic. | **KEEP** | |
| 21 | `card-sport.text` | Coolmax ultra-light performance. | Coolmax construction. Built for movement. | "ultra-light" is ad-staccato. |
| 22 | `card-hiking.text` | Merino wool & Thermolite for any terrain. | Merino and Thermolite, chosen by terrain. | Removes "any terrain" puffery; "chosen by" restores the curation frame. |
| 23 | `card-formal.text` | Polished styles for the office and beyond. | Fine-gauge knits for tailoring. | "and beyond" is filler. |
| 24 | `card-gift.text` | The perfect sock set for every occasion. | Curated sets, presented properly. | Removes banned "perfect" (2 of 4). |
| 25 | `card-*.button_label` | Shop (×6) | **KEEP** | Functional, neutral. |

### About band (`index.json → about.settings` — currently empty; write these as explicit settings)

| # | Key | Current (live via schema default) | Proposed | Notes |
|---|-----|----------------------------------|----------|-------|
| 26 | `eyebrow` | Brand Story | The Academy | |
| 27 | `hero_title` | The World's First Sock Authority | **KEEP** | The brand line. |
| 28 | `hero_lead` | Born from a simple obsession — that the sock you wear changes how you move, feel, and present yourself to the world. SOCKACADEMY exists to prove it. | Founded on a single conviction: what you wear closest to the ground deserves the same standard as everything above it. | Shorter, declarative, no "present yourself to the world" chattiness. Echoes the estate's own best line family. |
| 29 | `pillar_1_title` | Our Mission | **KEEP** | |
| 30 | `pillar_1_text` | To make premium socks accessible to everyone — curating only the styles and materials that meet our exacting standards of comfort, craft, and lasting quality. | To bring authority to a category that has never had one. Materials stated. Construction disclosed. Standards kept. | Kills the accessibility framing (the spec's named target) and the "exacting standards" self-praise. **[3.1-sensitive]** in the mild sense: this is the premium-performance voice, deliberately not a heritage-luxury voice. |
| 31 | `pillar_2_title` | Our Standard | **KEEP** | |
| 32 | `pillar_2_text` | Every sock in our catalog is selected by hand. We test for durability, fit, and feel before anything earns the SOCKACADEMY name. No shortcuts. No compromise. | Every pair in the catalogue is selected by hand and judged on material, construction, and fit. What falls short is declined. | Removes the "we test for durability" wear-test claim the audit flagged as unverified pre-launch, and the "No shortcuts. No compromise." staccato. "Judged" (review) is defensible where "tested" (lab) is not. |
| 33 | `pillar_3_title` | Our Promise | **KEEP** | |
| 34 | `pillar_3_text` | If it's not right, we make it right. Every order ships with the confidence that your satisfaction is the only outcome we accept. | If it's not right, we make it right. That is the whole policy. | Sentence 1 is genuinely good Sunspel-plainness — keep it; sentence 2 was corporate filler. (Deliberately rhymes with row 15 — one promise, said twice at two altitudes, is a feature.) |
| 35 | `quote` | We believe the smallest details define the greatest brands. | The smallest details define the greatest brands. | Delete the hedge. Assertion is the entire register difference. |
| 36 | `stat_1_value` / `stat_1_label` | 50+ / Sock Categories | 19.5μ / Below this, merino cannot itch | **Current stat is fabricated** — the store has 9 collections and 5 products; "50+ Sock Categories" is false on a live surface (see Deliverable 4.2). Replacement is established fiber science (the prickle-receptor micron threshold), already used in MG-1's register. **[VERIFY]** the exact figure against MG-1's own text so the site agrees with itself. |
| 37 | `stat_2_value` / `stat_2_label` | 100% / Premium Materials Only | 3 / Questions asked before we recommend a pair | Self-label out; a true, checkable fact about the Sock Finder in. |
| 38 | `stat_3_value` / `stat_3_label` | Global / Ships Worldwide | 0 / Novelty pairs. By policy. | True by constitution (the BLOCKED list) and the single most differentiating fact available at zero inventory. **Dependency:** requires Deliverable 4.1's Sock Finder fix to ship first or simultaneously — today the homepage quiz *recommends novelty socks*, which would make this stat a lie on the same page. |

### Blog preview (`index.json → blog_preview.settings` — currently empty; write as explicit settings)

| # | Key | Current (live via schema default) | Proposed | Notes |
|---|-----|----------------------------------|----------|-------|
| 39 | `label` (eyebrow) | From The Academy | **KEEP** | |
| 40 | `title` | Sock Knowledge | Required Reading | Confident, on-conceit for an "Academy", zero gimmick. |
| 41 | `post_1` excerpt | Merino wool isn't just for cold weather. It is the most versatile sock material on the planet — knowing its weight is knowing your fit. | Merino is not a cold-weather fiber. It is a thermostat. Weight, micron, and gauge decide everything else. | "on the planet" is the same puffery family as "around the world". |
| 42 | `post_2` excerpt | From boardroom to trail, the right sock changes everything. Our definitive guide to matching sock type, height, and material to every situation. | Height, weight, and fiber are decisions, not defaults. How to make them correctly, occasion by occasion. | Removes "changes everything" + "definitive guide" self-label. |
| 43 | `post_3` excerpt | The one garment closest to the ground, worn every day, touched by nothing. We make the case for why the humble sock deserves your full attention. | The garment closest to the ground, worn daily, considered never. The case for attention. | "humble" undercuts the thesis. |
| 44 | Button | Visit The Academy → | **KEEP** | Implementation note: verify the three cards' links point at real live articles (card 1 should link MG-1 once its publish status is confirmed). |

### Sock Finder (`index.json → sock_finder.settings` + 3 JS micro-strings)

| # | Key | Current (live) | Proposed | Notes |
|---|-----|----------------|----------|-------|
| 45 | `eyebrow` | Sock Finder | The Fitting | Direct lift from design item #8's own naming — shipping the *name* now costs nothing even though the full v2 result-screen is a separate item. |
| 46 | `title` | Find Your Perfect Sock | Three Questions. One Considered Answer. | Removes banned "perfect" (3 of 4). |
| 47 | `subtitle` | 3 questions. 10 seconds. Your ideal pair. | Answer three questions. Receive a recommendation — with the reasoning. | "10 seconds" is quiz-toy framing; the reasoning promise is what #8 will fulfil. |
| 48 | JS: result eyebrow (`sock-finder.liquid` ~494) | Your perfect match | The recommendation | Removes banned "perfect" (4 of 4) — this one hides in JavaScript, which is why the audit's count of 4 only found 3 in JSON. |
| 49 | JS: final step label (~504) | All done! | Fitting complete | Exclamation mark + chirp. |
| 50 | JS: result CTA (~499) | Shop Now → | View the pair → | |

**Total: 50 rows — 13 KEEP, 37 changed, 5 [VERIFY], 2 [3.1-sensitive].** Guy can approve this in one sitting; Claude applies approved rows to `index.json` (+3 JS strings) in one commit, screenshots before/after via theme preview per the Stage 15 item-C handoff.

---

# DELIVERABLE 2 — Constitutional Amendment: A2.7 Order Fulfillment + A16.5 Customer Service Desk

**What this is:** the actual text to insert into `docs/strategy/PHASE_ARCHITECTURE_SKELETON.md`, Phase 2 section, immediately after the `#### A20 — Inventory Intelligence` entry and before the `## PHASE 3A` heading. Matches the existing Phase 2 entry format exactly (Role / Input / Output / Trigger / Tech Stack / Dependencies). Numbering rationale: fractional insertion follows the A2.5 precedent — A2.7 sits in the transactional pipeline lane beside A2/A2.5; A16.5 sits beside its analytical sibling A16. Design-doc only — **no code until Phase 2 activates** (backend freeze, Stage 15 item D).

**Handoff for Claude:** paste the block below verbatim into the skeleton at the location above, after Guy approves (tracker item). Also append the "Phase 2 Gate additions" checklist into the existing Phase 2 Gate section, under Functionality Testing. Run the Supersession Check (ANTI_RECURRENCE #31 / CLAUDE.md) before commit as usual.

---

> **AMENDMENT TEXT BEGINS**
>
> #### A2.7 — Order Fulfillment (Transactional Core)
> **Supersedes: —. Adds: two Phase 2 agents (A2.7, A16.5). No reordering of existing phases.**
> **Role:** The missing transactional organ — customer pays → supplier order placed at CJ → tracking synced back → Shopify fulfillment status updated → customer notified. Until this agent exists, every order is fulfilled by Guy by hand via the CJ dashboard (deliberately so for orders ~1–25: the founder learns the failure modes firsthand before automating them).
> - **Input:**
>   - Shopify `orders/paid` webhook (plumbing half-exists: `shopify-webhook-handler.yml` + Make.com order watch as fallback)
>   - Product ↔ CJ variant/SKU mapping from A1/A2 Supabase records (must be real CJ IDs — A7 currently monitors MOCK products; blocking dependency)
>   - CJ order-creation API (`/shopping/order/createOrder` family) + CJ tracking endpoints
> - **Output:**
>   - CJ purchase order placed per paid Shopify order (idempotent — one CJ order per Shopify order ID, ever)
>   - New Supabase table `fulfillments` (RLS ON): shopify_order_id, cj_order_id, status, tracking_number, timestamps, audit JSONB
>   - Tracking number + fulfillment status written back to Shopify (Fulfillment API) → customer receives Shopify-native shipping notification
>   - Telegram alert (Hebrew canonical format) on ANY placement/tracking failure — a silently unfulfilled paid order is the single worst failure in the company
>   - Daily reconciliation report: paid orders ↔ placed CJ orders must match at 0% discrepancy (same standard the Phase 2 Gate already applies to Make.com ↔ Shopify)
> - **Trigger:** Event-driven (webhook → Upstash queue → worker), NOT cron — transactional work needs retry semantics, not daily sweeps. One daily reconciliation cron as the safety net. (Editorial/intel agents stay on cron; this is the first agent on the queue substrate `corp/core/queue.js` was built for.)
> - **Tech Stack:** CJ API, Shopify Admin API `2025-01` (Fulfillment endpoints), Upstash Redis queue, Supabase `fulfillments`, `corp/core/telegram.js`, `corp/core/metrics.js` (KPIs: orders placed, mean pay→placement latency, failures)
> - **Dependencies:**
>   - Real, verified CJ product IDs + variant mapping (replaces A7's MOCK set)
>   - HITL ramp: first 10 automated orders require Guy approval via the `pending_approvals` pattern (Control Center Phase B) before CJ placement; auto-placement only after 10/10 clean
>   - Payment-cleared check before placement (no CJ order on pending/high-risk payments — coordinate with A18's future fraud flags)
>   - **Build order: FIRST among Phase 2 agents — before A14/A15.** A COO report about orders the founder fulfills by hand is a diary, not an operating system (Stage 15 §3.1).
>
> #### A16.5 — Customer Service Desk (the fleet's mouth)
> **Role:** Answer inbound customer contact — "where is my order," sizing, exchange/refund initiation — as drafted-by-Claude, approved-and-sent-by-Guy (HITL). Distinct from A16, which is churn/NPS *analytics*: A16 measures the customer relationship; A16.5 conducts it. Re-homes the old roster's "A10 — שירות לקוחות" concept that died in renumbering and was never replaced.
> - **Input:**
>   - Inbound messages: Shopify Inbox + hello@sockacademy.store
>   - Order + tracking state from A2.7's `fulfillments` table (a CS desk without fulfillment data can only apologize — hard dependency)
>   - Approved policy corpus: FAQ, shipping/returns policy **as attorney-approved** (post packet 1.3), size guide
> - **Output:**
>   - Drafted replies in the brand register — **Iron Law 2 applies to CS replies**; the support inbox is a brand surface, and at this tier arguably the most-read one
>   - Escalation queue to Guy (Telegram): refunds, exceptions, anything with money or anger in it — Claude never sends autonomously
>   - Weekly contact-reason digest → feeds A16 (CX analytics) and, at Phase 3, A19 (returns intelligence)
>   - Supabase `cs_tickets` (RLS ON): message, draft, resolution, response-time KPIs via `writeMetrics()`
> - **Trigger:** Event-driven on inbound message (target: draft ready for Guy within 1 hour); weekly digest cron
> - **Tech Stack:** Shopify Inbox API / Gmail API, Claude, Supabase, `corp/core/telegram.js`
> - **Dependencies:**
>   - A2.7 live (tracking data is most of CS volume)
>   - Attorney-approved returns/refund policy (replies cite policy; policy must be final)
>   - Returns-economics decision by Guy: at premium register + CJ dropship, physically returning a $28 pair to a China warehouse is uneconomical — the correct policy is almost certainly replace-or-refund-without-return, which is *both* the premium move ("we make it right, keep the pair") and the profitable one. Decide before the first ticket, not during it.
>
> **Phase 2 Gate additions (append under Functionality Testing):**
> - [ ] A2.7: DRY_RUN full chain on 3 mock paid orders → CJ payload correct, idempotency holds on replay, `fulfillments` rows written, zero live CJ calls
> - [ ] A2.7: 1 REAL end-to-end test order (Guy's own address, cheapest SKU) → CJ placement, tracking writeback, customer email all verified — this doubles as the first live validation of supplier lead time and packaging (see Stage 16 Deliverable 4.3)
> - [ ] A16.5: 5 mock tickets (WISMO, size, refund, angry, out-of-scope) → drafts on-register, escalation fires on refund/angry, zero autonomous sends
> - [ ] Reconciliation: mock discrepancy injected → Telegram alert fires
>
> **AMENDMENT TEXT ENDS**

---

# DELIVERABLE 3 — Go-to-Market: Zero-Budget Path to the First 25 Orders

No prior stage produced this; here it is. Constraints taken as given: $0 ad budget, 0 traffic, 0 followers, 0 list, solo founder, and a fleet whose marketing arm is currently: A4 dormant (LAUNCH_MODE-gated — correctly), A5 failing 100% of publishes (known open issue), A6 live but with nothing flowing into it, A3 producing nothing (QA gate rejects 100% — launch-plan step 6), A10/A13 producing intelligence no one consumes yet.

## 3.0 The honest premise

At zero traffic, "marketing" is not a fleet function. Every agent in the marketing division is an **amplifier** — it multiplies attention that already exists. Zero multiplied by thirty agents is zero. The first 25 orders will come from work that looks nothing like the machine: a founder talking to humans, a list built one email at a time, and a product that can actually be bought. The fleet's job in this phase is to make sure that when a human *does* arrive — because Guy put them there — nothing leaks: the site convinces (Deliverable 1), the email flows catch (A6, already live), the content proves authority (A3, once unblocked). That is a real and sufficient job. It is not acquisition.

## 3.1 Step zero — there is nothing to market yet (gate, not channel)

Every product is Sold Out; A7 monitors MOCK products; photography is placeholder-grade. No channel decision matters until **3–5 SKUs are genuinely orderable**: real CJ IDs, verified stock, real supplier lead times, and — non-negotiable — **Guy has ordered samples of all 3–5 and held them**. The sample order does triple duty: (a) you cannot claim curation of socks no one at the company has worn — every "selected by hand" line in Deliverable 1 is unbacked until this happens; (b) the samples are the only honest source of product photography (Higgsfield drafts are fine for layout, not for the object itself); (c) it is the first live test of the CJ ordering path A2.7 will later automate — lead time, packaging, and quality observed firsthand. **Cost: ~$50–80. This is the single highest-ROI marketing spend available to the project, and it is also the cheapest.**

## 3.2 Channel priority — and why

**Priority 1: The Founding Cohort list (owned; A6 is the one marketing agent that's both live and working).**
The arithmetic backbone of the first 25 orders. A premium brand's first customers should come from a warm allocation list, not cold traffic: 300–500 cohort signups converting at 5–8% (allocation-framed founding lists convert well above generic newsletters) yields 15–40 orders — the Phase 2 trigger, from the list alone. Design item #13 (Founding Cohort band, "allocation by count, not by date") is the capture surface; the audit already judged it the estate's one register-legitimate scarcity device. **Register rule:** the cohort offer is *priority allocation*, never a discount — which also quietly resolves half of the WELCOME10-vs-register tension (memo 3.2) for this audience. Note: #13 sits in Stage 15's hold-behind-3.1 tier; 3.1 is the keystone decision already on Guy's desk — this plan raises #13's priority the moment 3.1 lands.

**Priority 2: Founder-led community credibility (the channel no agent can touch).**
Menswear and buy-it-for-life communities (Styleforum, the relevant subreddits, quality-focused Discords) are where premium sock buyers actually form opinions, and they are constitutionally hostile to brands that market at them and generous to people who *know things*. SockAcademy's entire brand thesis — material scholarship — is precisely the currency these communities trade in. Guy participates as himself, answers fiber/fit questions genuinely, and links MG-1 / the future Fiber Index when it's the honest answer. Slow, unscalable, and the only channel that produces trust at zero spend. Realistic yield: it doesn't sell socks directly; it fills the cohort list and creates the handful of credible strangers whose first orders become the first reviews.

**Priority 3: SEO / the Academy content (A3) — plant now, harvest in months.**
The one acquisition channel the fleet genuinely serves. Organic long-tail ("merino sock micron guide", "dress sock gauge") compounds and fits the authority brand perfectly — but its lag is 3–6 months, so it cannot deliver the first 25. Start it now *because* of the lag: unblock the QA gate (launch-plan step 6 — until then the content machine produces literally nothing), publish MG-1's status properly, and let A3 build the archive that makes Priority 2's links land somewhere impressive.

**Deliberately last: Instagram (A5).** Fix the publish failure (launch-plan step) — but treat IG as a **trust checkpoint, not a channel**: when a community member checks whether SockAcademy is real, a coherent, quietly premium grid answers the question. Nobody's first 25 orders come from posting 3×/week to zero followers; Stage 15 already recommended halving cadence, and this plan reaffirms it. **Not at all in this phase: paid (A4).** Zero budget decides this, but even with budget: no ad spend before unit economics are known from real orders and before there's creative made from real product photography. A4's dormancy is correct strategy, not a limitation.

## 3.3 The sequence (gates, not dates)

1. **Gate A — Sellable:** 3–5 real SKUs orderable; samples in Guy's hands; photos shot; homepage re-cut (Deliverable 1) live; Founding Cohort capture live. *(Depends on: 3.1 decision, batch C approval — both already queued on Guy's desk.)*
2. **Gate B — Credible:** MG-1 verified live; QA gate fixed so A3 publishes; Guy active in 2–3 communities (participation, not promotion); IG grid coherent (6–9 posts). Cohort list growing — the honest range for a solo founder's first month is **150–500 signups**; the gate is the number, not the calendar.
3. **Gate C — Open:** Allocation opens to the cohort, in signup order, framed exactly as MG-1 framed it (by count, not by date). Every one of the first 25 buyers gets a personal, non-templated email from Guy (Stage 15 FRICTION-6: the founder is the only agent who can *be the customer's peer*). Guy hand-fulfills every order via CJ — by design, per the A2.7 amendment.
4. **At 25 orders:** Phase 2 trigger fires. First build: A2.7. The founder stops being the warehouse; the fleet earns its C-suite.

**Metrics that matter in this phase:** cohort signups; signup→order conversion; first-order feedback (verbatim, collected personally). **Metrics that do not:** ROAS, traffic, follower counts, posting cadence — anything that measures the amplifier while the signal is still human-sized.

## 3.4 What the fleet structurally cannot do here (the human-must list)

1. **Speak in communities.** A5/A10 can listen; none may post as a person — platform ToS, authenticity, prompt-injection exposure (Iron Law S3), and one detected AI post in an enthusiast forum would be a permanent brand execution. Guy only.
2. **Hold the product.** No agent can verify the thing being curated. Samples (3.1 above) are founder work.
3. **Do outreach.** A21/A25 are Phase 3 by constitution, and cold AI outreach at a premium register would be self-defeating anyway. Any pre-launch influencer/press contact is a personal note from a founder, or nothing.
4. **Be the customer's peer.** The first 25 conversations are the project's entire primary research budget. No delegation.
5. **Tell the founder's story.** One asset this plan flags rather than spends: *"solo founder built a 30-agent AI corporation to sell premium socks"* is, frankly, a stronger cold-attention magnet than the socks — builder communities (IndieHackers, HN, r/EntrepreneurRideAlong) would carry it for free. **Register caution:** that story sells to builders, not sock buyers, and Iron Law 2 should keep the machine story off the store itself. If used, it's Guy's personal-identity content that *links* to SockAcademy — a deliberate, reversible experiment, Guy's call. I flag it because ignoring the project's single most viral true fact would be negligent; I fence it because it is also the easiest way to make the brand about the gimmick.

---

# DELIVERABLE 4 — Open Field: three things no prior stage touched

## 4.1 The homepage quiz violates the constitution — live, today **[verified this pass]**

`sections/sock-finder.liquid` (~lines 379–414): the quiz's second question offers **"Funny"** as a vibe, and its result matrix recommends **"Novelty Crew 2-Pack," "Collector's Funny Edition," "The Guaranteed Laugh," "Premium Funny Formal Set"** — novelty/funny is on the BLOCKED-forever list in both `CLAUDE.md` and `VISION.md` ("נובלטי / פאני / קריקטורים — BLOCKED"). Separately, the budget question's cheapest bracket is **"Under $15"** — below the constitutional $18 price floor, promising products that cannot exist. So the most interactive surface on the homepage actively recommends product categories the brand is forbidden to sell, at prices it is forbidden to charge. Every prior audit missed it because the brand-voice audit read `index.json` (not the section's JS) and design item #8 flagged only the title. **Fix:** the full matrix rewrite belongs to item #8 (Sock Finder v2), but the two violations should not wait for #8's design cycle — minimal surgical fix: remove the "Funny" option + its 4 result rows, remap "Artsy" or fold to 3 vibes, and re-bracket budget to `$18–28 / $28–45 / $45+` (matching the constitutional floors). Deliverable 1 row 38 depends on this.

## 4.2 The homepage states facts that are false — a 20-minute integrity micro-audit is due

Two found this pass: **"Est. 2024"** (hero badge — every project record begins June 2026) and **"50+ Sock Categories"** (about stats — the store has 9 collections, 5 products). Both are live, both are fabrications of exactly the kind the brand's whole thesis ("authority," "standards," falsifiable claims) cannot survive being caught on — and a menswear-forum skeptic (Deliverable 3, Priority 2) is precisely the person who checks. The copy table fixes both, but the pattern deserves one sweep: **before Gate B, Guy or Claude runs a one-pass "every number and date on a public surface is true or gone" audit** (homepage ✓ this pass; product pages, About page, FAQ, size guide remain). This is different from the brand-voice audit (register) — it is a *facts* audit, and it has never been done.

## 4.3 The last mile is the weakest brand surface, and no document mentions it

The entire brand experience is designed up to the checkout — and not one word anywhere in the estate addresses what arrives: a CJ dropship mailer, typically 8–15+ days later, likely with China-origin labeling and zero SockAcademy presence. For a $28–65 "standards" brand, the unboxing *is* the product review. Three cheap mitigations, all pre-launch decidable: (a) **honest delivery framing** on product/FAQ pages — stated plainly in the register ("Dispatched within 48 hours. Delivered in 8–14 days. We state it because most won't.") — slow shipping confessed is premium; slow shipping discovered is fatal; (b) **CJ's custom-packaging options** (branded polybag/insert card at low per-unit cost) — Guy prices this during the sample order (3.1), zero extra effort; (c) a **packaging insert** — one card, MG-1 register, material notes for the pair inside — designable now, printable via CJ later. The sample order tells us everything; the decision costs one Telegram message. Flagging because Deliverables 1–3 all raise the promise the box then has to keep.

---

# Handoff summary (for the tracker)

| Deliverable | Guy decides | Claude executes |
|---|---|---|
| D1 copy re-cut | Approve table rows 1–50 (one sitting; [VERIFY] rows need his personal confirmation) | Apply approved rows to `index.json` + 3 JS strings, one commit, before/after screenshots |
| D2 amendment | Approve amendment text | Paste verbatim into `PHASE_ARCHITECTURE_SKELETON.md` Phase 2 + gate additions; Supersession Check; no code |
| D3 GTM | Own it: sample order (~$50–80), community presence, cohort framing; decide founder-story experiment | Fix QA gate + A5 publish (already launch-plan steps 5–7); build cohort capture band when 3.1 lands + #13 unlocks |
| D4.1 quiz violations | Approve minimal fix | Remove "Funny" path + re-bracket budget in `sock-finder.liquid` (can ride in batch C with #8) |
| D4.2 facts audit | Confirm true founding year | One-pass numbers/dates audit of remaining public surfaces |
| D4.3 last mile | Price CJ branded packaging during sample order; approve delivery-framing copy | Draft delivery-framing lines + insert card copy (MG-1 register) once Guy has CJ pricing |

**End of Stage 16 deliverables.**
