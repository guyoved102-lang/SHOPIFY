# A21 — Affiliate & Influencer ROI Agent — Design Spec
**Date:** 2026-06-25
**Phase:** 3A — dormant until LAUNCH_MODE (DRY_RUN=false)
**Cron:** `0 10 * * *` — 10:00 UTC daily

---

## 1. Purpose

Daily agent that measures every affiliate and influencer partner's revenue contribution, computes precise commissions owed, and ranks all partners by performance. Attribution is 100% Shopify discount-code based — no UTM dependency. Pre-revenue state: runs cleanly with zero affiliates and reports "system ready".

---

## 2. Architecture

Single-file Node.js agent. Two Supabase tables (affiliates registry + daily performance snapshots). Shopify Orders REST API as data source. claude-sonnet-4-6 for Hebrew executive narrative. nodemailer for email delivery.

---

## 3. Flags

```
DRY_RUN=true   → no Supabase writes, no email — logs intent only
```

No additional dormant flags. Data-driven behavior: zero affiliates = zero rows = clean report.

---

## 4. Supabase Schema

### Table 1 — `affiliates` (manual registry, Guy maintains)

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | — |
| name | TEXT NOT NULL | "Maya Cohen" |
| handle | TEXT NOT NULL | "@mayacohen_style" |
| type | TEXT CHECK | 'influencer' / 'affiliate' / 'partner' |
| discount_code | TEXT UNIQUE NOT NULL | Attribution key, e.g. 'MAYA10' |
| commission_rate | NUMERIC DEFAULT 0.10 | 0.10 = 10% |
| tier | TEXT CHECK | 'standard' / 'premium' / 'vip' |
| platform | TEXT | 'instagram' / 'tiktok' / 'youtube' / 'email' |
| active | BOOLEAN DEFAULT true | Soft-delete via false |
| joined_at | DATE DEFAULT CURRENT_DATE | — |
| notes | TEXT | Free text |
| created_at | TIMESTAMPTZ | — |

RLS ON. UNIQUE index on `discount_code`. Index on `active`.

### Table 2 — `affiliate_performance` (daily snapshot, idempotent)

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL PK | — |
| report_date | DATE NOT NULL | Attribution date |
| affiliate_id | BIGINT REFERENCES affiliates(id) | — |
| discount_code | TEXT NOT NULL | Denormalized for query speed |
| orders_count | INT DEFAULT 0 | Orders in 30d window |
| gross_revenue | NUMERIC DEFAULT 0 | current_subtotal_price sum |
| commission_owed | NUMERIC DEFAULT 0 | gross_revenue × commission_rate |
| net_roi | NUMERIC DEFAULT 0 | gross_revenue − commission_owed |
| rank | INT | 1 = best performer |
| period_days | INT DEFAULT 30 | Sliding window |
| created_at | TIMESTAMPTZ | — |

UNIQUE(report_date, affiliate_id). RLS ON.

---

## 5. Attribution Logic

**Rule 1 — Case-insensitive discount code match only:**
```
order.discount_codes[].code.toUpperCase() === affiliate.discount_code.toUpperCase()
```

**Rule 2 — Eligible order statuses:**
- Included: `paid`, `partially_paid`, `partially_refunded`
- Excluded: `cancelled`, `refunded`, `voided`

**Rule 3 — Revenue base = `current_subtotal_price`:**
- Excludes shipping fees and taxes
- Automatically reflects refund adjustments (Shopify keeps this field current)
- Commission = `gross_revenue × commission_rate` (on net product revenue only)

**Rule 4 — Ranking:**
- Primary: `gross_revenue DESC`
- Tie-breaker: `orders_count DESC`

---

## 6. Shopify API

Endpoint: `/admin/api/2025-01/orders.json`
Window: last 30 days (sliding)
Fields: `id, name, financial_status, current_subtotal_price, discount_codes, created_at`
Pagination: Link header `rel="next"` (250 per page)

---

## 7. Logic Flow

```
1. fetchAffiliates()   → Supabase: SELECT * FROM affiliates WHERE active=true
2. fetchOrders()       → Shopify: last 30d, paginated, filtered by financial_status
3. attributeOrders()   → per affiliate: case-insensitive code match + revenue sum
4. rankAffiliates()    → sort by gross_revenue DESC, orders_count DESC tie-break
5. upsertPerformance() → affiliate_performance ON CONFLICT(report_date, affiliate_id)
6. upsertReport()      → executive_reports ON CONFLICT(agent_id, report_type, report_date)
7. buildNarrative()    → claude-sonnet-4-6, max_tokens: 200, strict professional Hebrew
8. sendEmail()         → nodemailer via sockacademy.store@gmail.com
```

Steps 5+6 run in parallel (`Promise.all`).
Steps 1+2 run in parallel (`Promise.all`).
Error isolation: each affiliate wrapped in independent try/catch — one failure does not block others.

---

## 8. executive_reports Payload

```json
{
  "agent_id":          "A21",
  "report_type":       "daily",
  "report_date":       "2026-06-25",
  "payload": {
    "total_affiliates":   3,
    "active_affiliates":  3,
    "total_orders":       12,
    "total_revenue":      1450.00,
    "total_commission":   145.00,
    "total_net_roi":      1305.00,
    "top_affiliate":      "Maya Cohen",
    "rankings": [
      { "rank": 1, "name": "Maya Cohen", "handle": "@mayacohen_style", "code": "MAYA10",
        "platform": "instagram", "orders": 7, "revenue": 890.00, "commission": 89.00, "net_roi": 801.00 }
    ]
  }
}
```

---

## 9. Email

**Subject (with affiliates):**
`A21 Affiliate ROI — {DATE} | {N} affiliates | ₪{revenue} | Top: {name}`

**Subject (zero affiliates):**
`A21 Affiliate ROI — {DATE} | 0 affiliates | Monitoring Active`

**Body sections:**
1. AI Executive Summary — claude-sonnet-4-6, Hebrew עסקית מקצועית ברמה גבוהה, 200 tokens
2. KPI tiles: Affiliates / Total Orders / Revenue / Commission / Net ROI
3. Performance Rankings table: Rank | Name | Code | Orders | Revenue | Commission | Net ROI
4. Footer: "Attribution: Shopify discount codes only"

---

## 10. GitHub Actions

**File:** `.github/workflows/a21-affiliate-roi.yml`
**Cron:** `0 10 * * *` (10:00 UTC — 30 min after A18 at 09:00)
**Node:** `24`
**DRY_RUN:** `'false'` (hardcoded in YAML)

**Secrets (all existing — zero new):**
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SHOPIFY_MASTER_TOKEN`, `SHOPIFY_SHOP_DOMAIN`, `GMAIL_APP_PASSWORD`, `ANTHROPIC_API_KEY`

---

## 11. File Map

```
sockacademy/agents/A21_affiliate_roi/
  agent.js              ← single file ~280 lines
  package.json
  package-lock.json
sockacademy/corp/core/
  affiliates.sql        ← both tables: affiliates + affiliate_performance
.github/workflows/
  a21-affiliate-roi.yml
```

---

## 12. Pre-Deploy Gate

| # | Check |
|---|-------|
| 1 | package-lock.json committed |
| 2 | All YAML secrets present in GitHub (✅ all 6 already exist) |
| 3 | cache-dependency-path resolves to committed file |
| 4 | DRY_RUN=true node agent.js passes — 0 affiliates → clean run |
