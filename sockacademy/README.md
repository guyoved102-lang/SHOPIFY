# SockAcademy — Autonomous Multi-Agent E-Commerce System

> **"The world's first fully autonomous sock brand."**
> Premium socks. AI-driven operations. Zero daily management.

---

## What This Is

SockAcademy is a production Shopify store powered by a suite of 13 autonomous AI agents (A1–A13) built on Node.js and GitHub Actions. Each agent owns a specific business function — from product research to legal compliance — and runs on a schedule without human intervention.

**Store:** [sockacademy.store](https://sockacademy.store)
**Shopify internal:** `11eqwi-ji.myshopify.com`
**Philosophy:** System-First. No real traffic until all agents are tested end-to-end.

---

## Agent Pipeline — Current Status

| Agent | Role | Status | Schedule |
|---|---|---|---|
| **A1** | Product Research — CJ Dropshipping scanner | ✅ Live | Mon 10:00 IL |
| **A2** | Product Upload — auto-publish approved products | ✅ Built | On trigger |
| **A3** | Content — weekly blog + landing page `/pages/join` | ✅ Built | Weekly |
| **A4** | Meta Ads — campaign creation + optimization | ✅ Built (DRY_RUN) | Daily |
| **A5** | Social Content — Claude → DALL-E → Instagram | ✅ Built | 3×/week |
| **A6** | Klaviyo Email Sync — abandoned cart 3 templates | ✅ Built | On trigger |
| **A7** | Supplier Monitor — stock + price alerts | ✅ Built | Daily 08:00 IL |
| **A8** | Analytics Reporter — GA4 dashboard | ⏳ After 10 sales | Daily |
| **A9** | Legal Compliance — ToS, Privacy, Shipping, Refund | ✅ Built | One-shot |
| **A10** | Trend Scout — Google Trends + Reddit → Claude → Sheets | ✅ Built | Sun 08:00 IL |
| **A11** | Price Intelligence — competitor pricing (5 brands) | ✅ Built | Wed 08:00 IL |
| **A12** | Review Collector — post-purchase Judge.me requests | ✅ Built | Daily 09:00 IL |
| **A13** | Supplier Negotiator — private label phase | ⏳ Phase 2 | On trigger |

---

## Tech Stack

- **Runtime:** Node.js 20, GitHub Actions (cron + workflow_dispatch)
- **Store:** Shopify API v2024-01
- **Email:** Klaviyo (flows) + Nodemailer/Gmail (agent alerts)
- **AI:** Anthropic Claude (`claude-haiku-4-5-20251001`) — analysis & content
- **Images:** DALL-E 3 (A5), Higgsfield (manual, reference required)
- **Data:** Google Sheets (service account JWT) — A1, A10, A11 write here
- **Reviews:** Judge.me (free plan)
- **Analytics:** GA4 `G-YMG2N14HD4`

---

## Brand Rules (Hard-coded across all agents)

```
BLOCKED: dog socks | children's socks | novelty/funny/cartoon socks
PRICE FLOORS: single pair $22+ | premium $28+ | tactical/merino $35+ | gift set $65+
RATING MINIMUM: 4.5 stars — never compromise on quality
PRIVATE LABEL TRIGGER: $5,000/month × 3 consecutive months
```

---

## Repository Structure

```
sockacademy/
├── agents/
│   ├── A1_product_research/
│   ├── A2_product_upload/
│   ├── A3_content/
│   ├── A4_meta_ads/
│   ├── A5_social/
│   ├── A6_email_sync/
│   ├── A7_supplier_monitor/
│   ├── A9_legal_compliance/
│   ├── A10_trend_scout/
│   ├── A11_price_intelligence/
│   └── A12_review_collector/
├── .env                    ← all credentials (never committed)
├── CLAUDE.md               ← AI assistant context
├── docs/strategy/VISION.md ← canonical brand & system vision (constitution-tier)
└── README.md               ← this file

.github/workflows/
├── a1-product-research.yml
├── a4-meta-ads.yml
├── a5-social-content.yml
├── a7-supplier-monitor.yml
├── a10-trend-scout.yml
├── a11-price-intelligence.yml
└── a12-review-collector.yml
```

---

## GitHub Secrets Required

| Secret | Used By |
|---|---|
| `SHOPIFY_MASTER_TOKEN` | All agents |
| `SHOPIFY_SHOP_DOMAIN` | A12 |
| `KLAVIYO_PRIVATE_API_KEY` | A6 |
| `ANTHROPIC_API_KEY` | A5, A10 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | A10, A11 |
| `GOOGLE_SHEET_ID` | A1, A10, A11 |
| `GMAIL_APP_PASSWORD` | A7, A9, A10, A11, A12 |
| `OPENAI_API_KEY` | A5 (DALL-E) — pending |
| `META_ACCESS_TOKEN` | A4, A5 — pending |
| `META_AD_ACCOUNT_ID` | A4 — pending |
| `META_IG_USER_ID` | A5 — pending |

---

## Pending Operational Steps

1. Install **Judge.me** on Shopify App Store (unlocks A12)
2. Add `SHOPIFY_SHOP_DOMAIN` to GitHub Secrets
3. Obtain **META tokens** (unlocks A4 + A5 = traffic)
4. Set `MAKE_A1_WEBHOOK` GitHub Secret
5. Attorney review of A9 legal templates before live traffic

---

*Built by Guy Oved · Powered by Claude · Last updated: June 17, 2026*
