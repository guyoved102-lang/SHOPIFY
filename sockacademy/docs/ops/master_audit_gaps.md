# Agent Mastery Audit — SockAcademy
**Date:** 23/06/2026 | **Agents scanned:** 19 | **Source of truth — do not modify**

---

## LEGEND
- 🔴 Red = Phase 1 (Critical — production broken)
- 🟡 Yellow = Phase 2 (High-impact quality lift)
- ✅ = Fixed & committed

---

## A0 — Orchestrator
🔴 ✅ Gap 1: `readHealthLog()` fetches ALL rows with no time filter. Should filter to last 7 days. (Performance)
🔴 ✅ Gap 2: Readiness Score never compares to previous score. (Logic)
🟡    Gap 3: Weekly report only sends on Sunday. No executive summary Mon–Sat. (UX)
🟡    Gap 4: Stuck product alert mentions "marked in Google Sheets" — stale copy. (Copy)

## A1 — Product Research
🔴 ✅ Gap 1: `TRENDING_2025` is hardcoded — never reads live trend data from A10. (Intelligence)
🔴 ✅ Gap 2: No deduplication across weeks. Same products appear every Monday. (Signal Quality)
🟡    Gap 3: `suggestRetailPrice()` lacks ceiling guard. (Business Logic)
🟡    Gap 4: AliExpress scraping lacks exponential backoff on 429 errors. (Reliability)

## A2 — Product Upload
🔴 ✅ Gap 1: `compare_at_price` generates a fake "was" price. Legal/policy risk. (Compliance)
🔴 ✅ Gap 2: No image URL validation (404 checks) before upload. (Quality)
🟡 ✅ Gap 3: `buildTags()` cotton check — verified correct in current code (`&&` + `else if` pattern already disambiguates). (Data Quality)
🟡 ✅ Gap 4: No Shopify rate limit (429) handling — 4-attempt retry loop with Retry-After header. (Reliability)

## A2.5 — Quality Control
🔴 ✅ Gap 1: `qc_rejected` only stores the FIRST failure reason, not all. (Decision Quality)
🔴 ✅ Gap 2: Products failing mid-upload (`upload_status='error:'`) are invisible to A2.5. (Gap)
🟡 ✅ Gap 3: Binary reject at score=49 — BORDERLINE_SCORE=45, scores 45-49 trigger `sendBorderlineAlert()` + `qc_borderline` status. (Business Logic)

## A3 — Content
🔴 ✅ Gap 1: Uses `claude-haiku` for brand-critical content — was NOT fixed in Phase 1. Fixed now: `claude-sonnet-4-6`. (Brand)
🟡 ✅ Gap 2: No internal link validation — `validateInternalLinks()` strips broken sockacademy.store hrefs before publish. (SEO)
🟡 ✅ Gap 3: Articles publish immediately — `getPeakPublishAt()` schedules next Tuesday 08:00 UTC (10:00 AM Israel). (Performance)

## A4 — Meta Ads
🔴 ✅ Gap 1: `HERO_PRODUCTS` URLs are hardcoded 404s. (Critical)
🟡 ✅ Gap 2: ROAS-weighted product selection — `buildProductROASMap()` reads last 8 runs; `selectROASWeightedProduct()` sorts by avg ROAS, random fallback on first run. (Optimization)
🟡 ✅ Gap 3: Zero-conversion detection — `actions` field added to insights; spend>$5 + 0 purchases → "PAUSE IMMEDIATELY" section in email, separate from low-ROAS. (Business Logic)

## A5 — Social Content
🔴 ✅ Gap 1: Writes images to Shopify theme `/assets/` instead of proper CDN (50MB limit risk). (Infrastructure)
🟡 ✅ Gap 2: Theme deduplication — `selectFreshTheme()` reads last 24 health log runs, picks first unused theme; LRU fallback when all 24 exhausted. (Content Strategy)
🟡 ✅ Gap 3: Reels support — Tuesday REEL post added with `imageSize:1024x1536`; `generateImage()` uses dynamic size + vertical aspect prompt; `publishToInstagram()` sends `media_type:REELS`. (Distribution)

## A6 — Email Sync
🟡 ✅ Gap 1: Email copy extracted to `email_templates.json` — agent loads at startup; content editable without code deploy; exits cleanly if file missing. (Operability)
🟡 ✅ Gap 2: A/B subject tracking — `getActiveABVariant()` alternates A/B each run via health log; confirmation email shows both subject variants with active badge; Guy updates Klaviyo flow per schedule. (Optimization)

## A7 — Supplier Monitor
🔴 ✅ Gap 1: `state.json` persistence broken on GitHub Actions. (Critical)
🔴 ✅ Gap 2: Monitors `MOCK_PRODUCTS` instead of real Supabase products. (Critical)
🟡    Gap 3: Shopify API version is `2024-01` instead of `2025-01`. (Consistency)

## A8 — Analytics Reporter
🔴 ✅ Gap 1: Error alerts go to wrong email (`sockacademy.store` instead of `guyoved102`). (Ops)
🔴 ✅ Gap 2: No week-over-week delta for context. (Decision Quality)
🟡 ✅ Gap 3: No conversion rate calculation. (Business Logic)

## A9 — Legal Compliance
🔴 ✅ Gap 1: `EFFECTIVE_DATE` regenerates every run instead of deliberate version bump. (Legal)
🔴 ✅ Gap 2: HitL approval submits but doesn't re-trigger publish. (Logic)

## A10 — Trend Scout
🔴 ✅ Gap 1: Uses `claude-haiku`. Must use Sonnet. (Brand)
🟡    Gap 2: `google-trends-api` needs robust null-path fallback. (Reliability)
🟡    Gap 3: Seed keywords static. No vocabulary growth over time. (Intelligence)

## A11 — Price Intelligence
🔴 ✅ Gap 1: Error alerts go to wrong email. (Ops)
🔴    Gap 2: No price trend analysis over time. (Intelligence)
🟡    Gap 3: No alert when >50% of competitor fetches fail. (Data Quality)

## A12 — Review Collector
🔴 ✅ Gap 1: `buildProductHandle()` is a guess, risks 404s. (Quality)
🔴 ✅ Gap 2: No unsubscribe link (CAN-SPAM/GDPR risk). (Compliance)
🔴 ✅ Gap 3: Uses `shipped` instead of `fulfilled` for Shopify filter. (Bug)

## A13 — Competitive Intelligence
🔴 ✅ Gap 1: Error alerts go to wrong email. (Ops)
🔴 ✅ Gap 2: Strike mode requires manual CLI trigger instead of automation. (Automation)
🟡    Gap 3: No deduplication across runs (alert fatigue). (Signal Quality)

## A14/A15/A16 — C-Suite (COO/CFO/CX)
🔴 ✅ Gap 1: Separate emails, no consolidated executive summary. (Business Value)
🟡    Gap 2: A15 CFO missing `system_config` write / A0 notification. (Architecture)
🟡    Gap 3: A16 CX double-counts total subscribers across Klaviyo lists. (Data Accuracy)

---

## Phase 2 Execution Log — Yellow Gaps

| Batch | Agents | Status |
|-------|--------|--------|
| Batch 0 | A10 (model + DRY_RUN + categories + health metadata) | ✅ Applied, committed |
| Batch 1 | A0 + A1 | ✅ Applied, committed 90f06ca |
| Batch 2 | A2 + A2.5 + A3 | ✅ Applied, committed 03a1893 |
| Batch 3 | A4 + A5 + A6 | ✅ Applied, committed 95a37e1 |
| Batch 4 | A7 + A11 + A13 | ⏳ Pending |
| Batch 5 | A14 + A15 + A16 | ⏳ Pending |

---

*Last updated: 23/06/2026 — Phase 2 in progress*
