# PHASE ARCHITECTURE SKELETON
## Complete System Build-Before-Run Roadmap (23/06/2026)

---

## 📋 OVERVIEW

**Philosophy:** Build → Test → Verify → System Readiness → **Guy Manual Approval Only**

We outline the complete Phase 2-4 architecture **without executing** anything yet. Each phase has:
1. **Structural Skeleton** — agents, workflows, data flows
2. **Testing Criteria** — what must pass before transition (BULLETPROOF STANDARD)
3. **Milestone Tracking** — system monitors progress but **does not auto-activate**
4. **Guy-Only Activation** — after system proves readiness, Guy makes final decision

**Critical:** A0 Orchestrator monitors `agent_health_log` + order count + MRR. When ready:
- A0 calculates Readiness Score (0–100, threshold = 95/100)
- A0 runs automated DRY_RUN suite
- A0 notifies Guy: "Milestone + Readiness 95+ reached. Awaiting your approval."
- **Only Guy can set `system_config['ACTIVATE_PHASE_X'] = true`** → phases go live

No phase transitions without explicit Guy sign-off. Zero exceptions.

---

## PHASE 1 — NOW (ACTIVE)
**Status:** ✅ LIVE

**Agents:** A0, A1, **A2.5 (Quality Control)**, A2, A3–A6, A7, A9, A10–A13, A17

**A2.5 — Quality Control Gatekeeper (NEW)**
**Role:** Final checkpoint before product uploads to Shopify
- **Input:** Product from A2 (title, description, price, images, SKU)
- **Checks:**
  - Images: ≥ 3, all 1000px+, no watermarks, consistent lighting
  - Description: ≥ 200 words, includes material + fit + care
  - Price: within $18–$65 range
  - No duplicates in Shopify
  - Stock ≥ 5 units
- **Output:** Approved (→ A2 uploads) OR Rejected (with reason)
- **Trigger:** After A2 prepares product, before upload
- **Tech:** Supabase validation table, image SDK

**Phase 1 Output:** 
- Product pipeline: A1 research → A2 prepare → A2.5 quality gate → Shopify
- Content: blog, social, email
- Intelligence: trends, pricing, competitors

---

## PHASE 2 — C-SUITE LAYER
**Activation Trigger:** 25 orders OR $1,000 MRR (whichever comes first)

### Structural Skeleton

#### A14 — COO (Chief Operating Officer)
**Role:** Monthly operations summary + workflow audit
- **Input:** `agent_health_log` (all agents), order volume, fulfillment status
- **Output:** 
  - Monthly PDF report: agent performance, bottlenecks, efficiency score
  - Recommendations: which agents to optimize
  - Audit trail: what changed, when, by whom
- **Trigger:** Monthly (day 1, 08:00 UTC)
- **Dependencies:** None (read-only on all tables)

#### A15 — CFO (Chief Financial Officer)
**Role:** P&L, cash flow, tax readiness, forecasting
- **Input:** 
  - Shopify orders (revenue, refunds, taxes)
  - Supplier costs (from A1 research + A7 monitoring)
  - Infrastructure costs (GitHub, Supabase, Make.com)
- **Output:**
  - Daily: P&L snapshot (revenue vs. COGS)
  - Weekly: Cash position + outstanding receivables
  - Monthly: Full financial statements (Profit, Loss, Tax Reserve)
  - Quarterly: 3-month forecast + funding needs
- **Trigger:** Daily (08:00 UTC), Weekly (Monday), Monthly (1st)
- **Tech Stack:**
  - Supabase: new table `financials` (RLS ON)
  - corp/core/rtl_sheet_template.js — Hebrew RTL Google Sheets
  - Dual currency: USD revenue / ILS expenses
  - VAT tracking: env vars for `VAT_RATE`, `TAX_JURISDICTION`
- **Dependencies:** A0 health data, Shopify API, bank integrations (Phase 3+)

#### A8 — Analytics Reporter (Reactivated)
**Role:** Dashboard reporter — traffic, conversions, ROAS, retention
- **Input:** GA4, Meta Ads API, Shopify, Klaviyo
- **Output:**
  - Daily dashboard: website traffic, conversion rate, AOV
  - Campaign ROAS: Meta spend vs. revenue
  - Cohort analysis: repeat customer rate, LTV by acquisition channel
- **Trigger:** Daily (09:00 UTC)
- **Tech Stack:** supermetrics MCP + GA4 API + Meta Ads API
- **Dependencies:** GA4 stream verified, Meta Pixel firing

#### A16 — CX (Customer Experience Agent)
**Role:** NPS tracking, churn detection, loyalty segment identification
- **Input:** 
  - Shopify: customer history, repeat orders
  - Klaviyo: email engagement, unsubscribe rate
  - Manual NPS surveys (Typeform API)
- **Output:**
  - Weekly cohort report: new vs. repeat customers
  - Churn alerts: customers not ordering in 60+ days
  - VIP identification: top 10% by LTV → add to Klaviyo VIP segment
  - NPS summary: quarterly trend
- **Trigger:** Weekly (Wednesday 10:00 UTC)
- **Tech Stack:** Shopify API, Klaviyo API, Typeform API
- **Dependencies:** Order history > 1 week (warm data)

#### A20 — Inventory Intelligence (Phase 2 add-on)
**Role:** Stock monitoring, reorder point alerts, seasonal demand forecasting
- **Input:** 
  - Shopify: current inventory levels per SKU
  - A1: supplier cost per unit
  - Historical: sales velocity per SKU
- **Output:**
  - Daily: low stock alerts (< reorder point)
  - Weekly: demand forecast (next 4 weeks)
  - Supplier RFQ: auto-generate purchase orders when stock dips
- **Trigger:** Daily (07:00 UTC)
- **Tech Stack:** Shopify inventory API, CJ API for supplier pricing
- **Dependencies:** Real products in Shopify (> 5 SKUs)

---

## PHASE 3A — RISK & SECURITY
**Activation Trigger:** $5,000 MRR × 2 consecutive months (rolling window)

### Structural Skeleton

#### A17 — IP & Brand Protection (Already Built)
**Role:** Proactive monitoring for design theft, trademark infringement, counterfeits
- **Input:** 
  - Google Images Reverse Search
  - Amazon, eBay, AliExpress scans
  - USPTO / WIPO trademark databases
- **Output:**
  - Weekly report: unauthorized sellers, copycats detected
  - Cease & Desist templates (auto-generated)
  - IP watchlist maintenance
- **Trigger:** Weekly (Friday 15:00 UTC)
- **Tech Stack:** agent-browser MCP, perplexity MCP
- **Dependencies:** Trademark registration (Phase 3B+)

#### A18 — Fraud & Cybersecurity
**Role:** Chargeback monitoring, bot detection, payment fraud
- **Input:** 
  - Shopify: payment processor events (Stripe/PayPal)
  - Cloudflare: bot score, geographic anomalies
  - Order patterns: velocity, IP reputation
- **Output:**
  - Daily alerts: high-risk orders flagged for review
  - Weekly: fraud rate % of revenue
  - Monthly: security score (uptime, HTTPS, DDoS blocks)
- **Trigger:** Daily (01:00 UTC — off-peak)
- **Tech Stack:** Cloudflare API, Stripe API, MaxMind GeoIP
- **Dependencies:** Payment processor integration stable

#### A19 — Returns Intelligence
**Role:** RMA processing, reverse logistics, chargeback correlation
- **Input:** 
  - Shopify: refund requests
  - Reason codes: damage, wrong size, defect
- **Output:**
  - RMA log: all returns tracked with reason + resolution
  - Trend report: which products have high return rates
  - Reverse logistics: auto-generate return shipping labels
- **Trigger:** Daily (08:00 UTC)
- **Tech Stack:** Shopify refunds API, ShipStation API
- **Dependencies:** RMA process documented

#### A21 — Affiliate & Influencer ROI
**Role:** Partnership recruitment, tracking, commission payouts
- **Input:** 
  - Affiliate platforms (Impact, Refersion)
  - Influencer discovery (Modash)
  - Order attribution: which affiliate drove which sale
- **Output:**
  - Monthly: affiliate revenue + commission owed
  - Auto-payout via Stripe Connect
  - Outreach recommendations: which micro-influencers to contact
- **Trigger:** Monthly (15th @ 10:00 UTC — for prior month payout)
- **Tech Stack:** Impact API / Refersion API, Modash, Stripe Connect
- **Dependencies:** Affiliate program terms finalized

---

## PHASE 3B — SUPPLY CHAIN & GROWTH
**Activation Trigger:** $5,000 MRR × 2 months (same as Phase 3A)

### Structural Skeleton

#### A22 — Supply Chain Intelligence
**Role:** Global supplier monitoring, delay alerts, alternative sourcing
- **Input:** 
  - Supplier APIs (CJ, AliExpress, Direct factories)
  - Shipping tracking (17Track, Flexport)
  - Macro events: port closures, tariffs, geopolitical
- **Output:**
  - Real-time: shipment ETA updates
  - Weekly: supplier health scores
  - Risk alerts: 30-day port closure predicted → source alternative
- **Trigger:** Daily (06:00 UTC)
- **Tech Stack:** CJ API, agent-browser MCP for 17Track
- **Dependencies:** Supplier relationships established

#### A23 — Private Label & Logistics
**Role:** Factory sourcing, quality scorecards, custom packaging design
- **Input:** 
  - Factory inquiries (Alibaba, Global Sources)
  - MOQ analysis (minimum order quantity)
  - Design specifications (Higgsfield AI)
- **Output:**
  - Factory audit reports: quality score, lead time, cost per unit
  - Custom product specs: materials, packaging, branding
  - Order tracking: production timeline → customs → warehouse
- **Trigger:** On-demand (triggered by A1 research) + Monthly review
- **Tech Stack:** agent-browser MCP, Higgsfield MCP
- **Dependencies:** Capital available for MOQ

#### A24 — CRO (Conversion Rate Optimization)
**Role:** A/B testing, landing page optimization, funnel analysis
- **Input:** 
  - GA4: behavior flow, drop-off points
  - Session recordings (Hotjar)
  - A/B test results
- **Output:**
  - Monthly: CRO roadmap (top 3 conversion leaks to fix)
  - A/B test recommendations: button copy, form fields, checkout steps
  - Implementation: Shopify theme updates
- **Trigger:** Weekly analysis (Monday 10:00 UTC)
- **Tech Stack:** GA4 API, Hotjar API, Google Optimize
- **Dependencies:** Design Freeze lifted (Phase 3B start)

#### A25 — Influencer Partnerships
**Role:** Long-term partnerships with premium lifestyle influencers
- **Input:** 
  - Influencer database (filtered: 50K-500K followers, alignment score)
  - Campaign ideas: seasonal, product launches
- **Output:**
  - Monthly: outreach list + personalized pitches
  - Campaign tracking: engagement rate, click-through, conversion
  - Payment: USD invoicing via Stripe
- **Trigger:** Monthly (1st @ 10:00 UTC)
- **Tech Stack:** Modash API, agent-browser for DM outreach
- **Dependencies:** Brand guidelines finalized

#### A26 — Regulatory Watch
**Role:** Monitor EU/US/Israel regulatory changes affecting e-commerce
- **Input:** 
  - SEC.gov, EUR-Lex, Israel Ministry of Commerce
  - Industry groups (NRF, GFAA)
- **Output:**
  - Quarterly: compliance alert + action items
  - Example: "EU VAT changes Jan 2025 → update A15 VAT_RATE"
  - Legal letter templates: ready to send to lawyers
- **Trigger:** Quarterly (Jan 1, Apr 1, Jul 1, Oct 1)
- **Tech Stack:** agent-browser MCP
- **Dependencies:** Trademark registration complete

#### A27 — PR & Media
**Role:** Press release distribution, media pitches, earned media
- **Input:** 
  - Company milestones (fundraising, product launch, partnerships)
  - Press release database (PRNewswire, Cision)
- **Output:**
  - Quarterly press releases
  - Media kit (one-pager + images)
  - Outreach to fashion/lifestyle journalists
  - Earned media tracking: mentions, brand sentiment
- **Trigger:** On-demand + Quarterly
- **Tech Stack:** agent-browser MCP, doc-skills for PDF generation
- **Dependencies:** Brand story refined

#### A28 — Subscription Club (SockAcademy Club)
**Role:** Recurring subscription service — auto-replenishment program
- **Value Prop:** "Automated, cyclical wardrobe replenishment. Your socks arrive every 3 months. Standards maintained."
- **Input:** 
  - Subscription sign-ups (Shopify Subscriptions app)
  - Customer preferences: sock types, frequency, budget
- **Output:**
  - Quarterly shipment schedule (auto-generated)
  - Personalized box: curated based on member profile
  - Retention: cancel rate < 5%
  - Revenue: predictable recurring
- **Trigger:** Monthly processing (1st @ 07:00 UTC)
- **Tech Stack:** Shopify Subscriptions API, Klaviyo for retention emails
- **Dependencies:** Subscription infrastructure live (Shopify app)

---

## TESTING & VERIFICATION CRITERIA

### Phase 2 Gate (Before A14–A20 activate) — BULLETPROOF STANDARD

**Operational Data Quality (Strict):**
- [ ] agent_health_log has >14 days consecutive clean data (zero gaps, zero dropped rows)
- [ ] A0 daily health report runs error-free 14/14 days + success rate ≥ 99%
- [ ] Shopify order count ≥ 10 (not 5 — need warm dataset for meaningful analysis)
- [ ] Klaviyo email opens ≥ 25% (not 20% — premium brand standard)
- [ ] Repeat customer rate already > 5% (signals product-market fit)
- [ ] No failed orders in 7-day window (payment processing clean)

**Financial Data Integrity (Audit-Ready):**
- [ ] Supabase `financials` table: RLS ON, 3-column audit: created_by, updated_by, audit_log JSONB
- [ ] COGS sourcing verified: every product ↔ A1 research cost, traceable link in Supabase
- [ ] Make.com → Google Sheets reconciliation: order count matches Shopify (0% discrepancy)
- [ ] Currency conversion tested: USD/ILS rate pulled from live source (not hardcoded), spot-check 3 conversions
- [ ] Tax calculation: 3 mock scenarios tested (sale, refund, international) — Guy manually verifies
- [ ] Double-entry bookkeeping: every transaction appears in 2 tables (orders + financials), balanced

**Security & Access Control:**
- [ ] A15 CFO database access: only `financials` + read-only to orders. No PII access. RLS policy tested.
- [ ] A14 COO database access: read-only on all tables. No write permissions.
- [ ] Secrets rotation: KLAVIYO_PRIVATE_API_KEY, SHOPIFY_MASTER_TOKEN pulled from env only (0 hardcoded)
- [ ] Git security sweep: `git diff HEAD~14..HEAD` scanned for secrets (regex: api_key|password|token|secret)

**Functionality Testing (DRY_RUN):**
- [ ] A14 COO: 
  - DRY_RUN manual report (all outputs go to /tmp, not to Sheets)
  - Report structure: header, agent metrics table (5 agents minimum), action items section
  - Guy reviews: is the information actionable? Is it clear?
- [ ] A15 CFO:
  - DRY_RUN P&L for past 30 days
  - Verify: revenue - COGS = GP%, tax reserve = revenue × 0.17 (IL VAT)
  - Forecast: test 3-month projection logic (does extrapolation make sense?)
  - Guy reviews: are numbers credible? Does math check out?
- [ ] A8 Analytics:
  - DRY_RUN pull GA4 data for past 7 days
  - Verify: session count, bounce rate, conversion rate match GA4 dashboard
  - ROAS formula: (revenue from Meta / Meta spend) — test with mock data
  - Guy reviews: do the metrics tell a story? Any red flags?
- [ ] A16 CX:
  - DRY_RUN identify repeat customers (orders ≥ 2)
  - Verify: repeat customer LTV > 1.5x first-time customer LTV
  - Churn detection: flag customers with 0 orders in last 60 days, count them
  - Guy reviews: is the segmentation making sense?
- [ ] A20 Inventory:
  - DRY_RUN set reorder point to 50% of product's average 30-day velocity
  - Trigger low stock alert manually, verify email/Slack notification fired
  - Test: add inventory, verify alert clears
  - Guy reviews: is reorder point realistic?

**Sign-off Protocol:**
1. Guy runs all DRY_RUN agents locally
2. Guy manually audits 3 outputs (P&L, COO report, Analytics dashboard)
3. Guy signs off: "Phase 2 agents are production-ready"
4. **Only after sign-off:** A14–A20 workflows added to pipeline-config.json

---

### Phase 3A Gate (Before A17–A21 activate)

**Risk Infrastructure:**
- [ ] Stripe fraud module enabled
- [ ] Cloudflare WAF rules live
- [ ] IP watchlist database created (Supabase)
- [ ] Affiliate program terms documented

**Testing:**
- [ ] A17 IP: test detection (manual fake seller on eBay) → C&D generated
- [ ] A18 Fraud: test high-risk order scenario → flag triggered, no false positives
- [ ] A19 Returns: RMA created, reverse label generated, refund processed
- [ ] A21 Affiliate: commission calculation verified with mock order

**Sign-off:** Guy reviews test results.

---

### Phase 3B Gate (Before A22–A28 activate)

**Supply Chain & Growth Infrastructure:**
- [ ] CJ API + supplier database populated
- [ ] Factory MOQ data sourced
- [ ] Hotjar / GA4 event tracking live
- [ ] Influencer database (Modash) > 50 qualified contacts

**Testing:**
- [ ] A22 Supply Chain: shipment tracking pulls data, ETA calculated
- [ ] A23 Private Label: factory audit report generated
- [ ] A24 CRO: A/B test framework ready, sample test runs
- [ ] A25 Influencer: outreach email templates generated
- [ ] A26 Regulatory: quarterly alert mock triggered
- [ ] A27 PR: press release formatted, media kit compiled
- [ ] A28 Subscription: subscription product created in Shopify, 1 test sign-up

**Sign-off:** Guy reviews all outputs.

---

## MILESTONE TRACKING & AUTO-ACTIVATION MECHANISM

### Architecture

**System Config Table** (Supabase)
```sql
CREATE TABLE system_config (
  key VARCHAR(100) PRIMARY KEY,
  value VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Current Metrics Table** (Supabase)
```sql
CREATE TABLE system_metrics (
  metric_name VARCHAR(100),
  value NUMERIC,
  measured_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (metric_name, measured_at)
);
```

### A0 Orchestrator — Readiness Monitor (NOT Auto-Activate)

**Every day @ 06:00 UTC, A0 Step 1 monitors (but does NOT auto-activate):**

1. **Count orders in last 30 days**
   ```sql
   SELECT COUNT(*) FROM orders 
   WHERE created_at > NOW() - INTERVAL '30 days'
   AND status IN ('paid', 'fulfilled')
   ```

2. **Calculate 30-day MRR**
   ```sql
   SELECT SUM(total_price) / 30 FROM orders 
   WHERE created_at > NOW() - INTERVAL '30 days'
   ```

3. **Calculate Readiness Score (0–100)**
   - Data quality (>14 days clean data): +20 pts
   - Financial integrity (reconciled orders ↔ financials): +20 pts
   - Customer satisfaction (repeat > 5%, no chargebacks): +20 pts
   - System health (zero critical errors 7 days): +20 pts
   - Product quality (<3% return rate): +10 pts
   - **Threshold for readiness: 95/100**

4. **Check milestones — Readiness-Only Update (NO activation):**

   **Phase 2 Readiness Check:**
   - IF (orders_30d ≥ 25) OR (mrr ≥ 1000) AND Readiness ≥ 95
   - THEN:
     - set system_config['PHASE_2_READINESS_SCORE'] = [score]
     - set system_config['PHASE_2_MILESTONE_HIT'] = true
     - set system_config['PHASE_2_MILESTONE_DATE'] = NOW()
     - Run automated DRY_RUN suite for A14, A15, A8, A16, A20 (parallel)
     - set system_config['PHASE_2_DRY_RUN_COMPLETE'] = true
     - Send email to Guy:
       ```
       Subject: Phase 2 Ready for Activation
       
       Milestone: ✅ (25+ orders OR $1K+ MRR)
       Readiness Score: 95+ ✅
       DRY_RUN: ✅ Complete (all reports at /tmp/dry_run_phase2/)
       
       System is ready. Manual approval required:
       Set PHASE_2_ACTIVATE_BY_GUY = true in system_config when ready.
       ```
     - **STOP. Wait for Guy approval.**

   **Phase 3A Readiness Check:**
   - IF (mrr ≥ 5000 for 2 consecutive months) AND Readiness ≥ 95
   - THEN: [same pattern as Phase 2]
   - Email to Guy: "Phase 3A ready. Awaiting approval."

   **Phase 3B Readiness Check:**
   - IF (same as 3A) AND system_config['PHASE_3A_ACTIVE'] = true
   - THEN: [same pattern]
   - Email: "Phase 3B ready. Awaiting approval."

   **Phase 4 (Scale) Readiness Check:**
   - IF (mrr ≥ 15000 for 2 consecutive months) AND Readiness ≥ 95
   - THEN: [same pattern]
   - Email: "Phase 4 ready. Awaiting approval."

5. **Guy-Only Activation**
   - When Guy manually sets: `system_config['PHASE_X_ACTIVATE_BY_GUY'] = true`
   - A0 detects this flag on next run
   - A0 activates: moves agents from `future_agents` to active `pipelines`
   - A0 sets: `system_config['PHASE_X_ACTIVE'] = true` + `PHASE_X_ACTIVATED_AT` = NOW()
   - A0 sends confirmation: "Phase X is LIVE"

### Pipeline-config.json Updates

When Phase 2 activates:
- Uncomment Phase 2 agents block in `future_agents` section
- Move to active `pipelines` array
- Set cron schedules (A14 monthly, A15 daily, A8 daily, A16 weekly, A20 daily)

Example:
```json
"pipelines": [
  // ... existing Phase 1 pipelines ...
  {
    "id": "coo-pipeline",
    "name": "COO Monthly Operations",
    "trigger": { "type": "cron", "schedule": "0 8 1 * *" },
    "agents": ["A14"],
    "activated": "2026-07-15T10:23:00Z"
  },
  // ... more Phase 2 ...
]
```

### Safeguards (Zero Compromise)

- **Double-check Readiness:** A0 must see Readiness ≥ 95 for 2 consecutive checks (48 hours) before notifying Guy
- **Dual-Layer Verification:** Even with milestone + 95 score, Guy must explicitly approve
- **Automated DRY_RUN first:** A0 runs full DRY_RUN suite before notifying Guy (tests all outputs)
- **Guy-Only Activation:** A0 never auto-activates. Guy must manually set flag to activate.
- **Notification with proof:** Email includes Readiness score breakdown + DRY_RUN results + milestone proof
- **No time-based auto-activation:** System will never activate based on elapsed time. Only Guy decides.
- **Warm-up period (optional):** Guy can request extended warm-up before activating (A0 continues monitoring)

---

## PROPOSED OPTIMIZATIONS & ADDITIONS

### 1. Quality Control Agent (A2.5) — Insert Between A2 & Shopify

**Rationale:** Phase 1 uploads products directly. Risk: bad image, wrong price, incomplete description → customer refund.

**Role:** Final checkpoint before product goes live
- **Input:** Product from A2 (title, description, price, images, SKU)
- **Checks:**
  - Images: ≥ 3 images, all 1000px+, no watermarks, consistent lighting
  - Description: ≥ 200 words, includes material + fit + care instructions
  - Price: within brand range ($18–$65), not underselling
  - Duplicate: not already in Shopify
  - Inventory: stock level ≥ 5 units
- **Output:** Approved or Rejected (with reason)
- **Trigger:** Before A2 uploads. DRY_RUN: simulate on 3 test products
- **Tech:** Supabase validation table, image SDK for analysis

**Impact:** Prevent low-quality listings. Saves refunds. Guy spot-checks 5 rejections/week.

---

### 2. Readiness Score for Phase Activation (A0 Enhancement)

**Current:** A0 checks if 25 orders ≥ 1K MRR → activate Phase 2

**Proposed:** A0 also calculates **Readiness Score** (0–100):
- Data quality: >14 days clean agent_health_log (+20 pts)
- Financial integrity: financials table reconciles with Shopify orders (+20 pts)
- Customer satisfaction: repeat rate > 5%, no chargebacks (+20 pts)
- System health: zero critical errors in 7 days (+20 pts)
- Product quality: <3% return rate (+10 pts)
- **Threshold to activate:** Score ≥ 85 AND milestone hit

**Benefit:** Prevents activation into broken systems. Guy sets threshold.

---

### 3. Automated Pre-Launch DRY_RUN Suite (A0 Step 1.5)

**Current:** Guy must manually DRY_RUN each Phase 2 agent. Labor-intensive.

**Proposed:** A0 (weekly, Saturday 03:00 UTC):
1. Spins up DRY_RUN for A14, A15, A8, A16, A20 in parallel
2. Generates report: all outputs in `/dry_run_reports/<timestamp>/`
3. Sends email to Guy: "Phase 2 DRY_RUN complete. Review reports at [URL]"
4. If any failure: alert Guy + hold readiness score

**Benefit:** Continuous validation. Guy only needs to review (not run).

---

### Missing Agents to Consider (Optional — Your Call)

| Agent | Purpose | Phase | Recommend? |
|-------|---------|-------|-----------|
| A2.5 | Quality Control | Phase 1 | **✅ Recommended** — prevents product quality issues |
| A29 | Financial Planning | Phase 4 | ⏳ Phase 4 only — not urgent now |
| A30 | Team Operations | Phase 4 | ⏳ Phase 4 only — not urgent now |
| A31 | Brand Partnerships | Phase 3B | 🤔 Optional — could accelerate growth if prioritized |

---

## CLARIFYING QUESTIONS FOR GUY

(Awaiting answers below)

---

**End of Document**
