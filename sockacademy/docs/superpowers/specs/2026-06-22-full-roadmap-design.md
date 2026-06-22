# SockAcademy — Full System Roadmap Design
# נוצר: 22/06/2026 | אושר ע"י גיא לפני כתיבה

---

## What We Are Building

SockAcademy is a Shopify-based e-commerce store for premium men's socks.
Behind the storefront runs a system of AI agents that automate every business
function: research, content, ads, email, analytics, supplier management,
compliance, and competitive intelligence.

The system is designed to run itself. Guy's role shifts from operator to
strategic owner as revenue milestones are hit.

**One master trigger starts everything:** `LAUNCH_MODE = true` in Supabase.
SA-6 Orchestrator reads this flag and cascades activation across all agents.

---

## Architecture Overview

### The Shopify Storefront
- Platform: Shopify (dropshipping Phase 1–3, private label Phase 4+)
- Max 12 active SKUs at any time (brand decision — scarcity = luxury)
- Men's socks only until $5K MRR × 3 months → then women's collection

### The 6 Super-Agents
| Super-Agent | Agents | Role |
|-------------|--------|------|
| SA-1 Intelligence | A1, A10, A11, A13 | Research, trends, pricing, competitors |
| SA-2 Content | A2, A3, A5 | Upload, content writing, social |
| SA-3 Revenue | A4, A6 | Meta ads, email/Klaviyo |
| SA-4 Operations | A7, A9, A12 | Supplier, compliance, reviews |
| SA-5 Analytics | A8 | GA4, reporting |
| SA-6 Orchestrator | A0, Decision Engine | Health, decisions, queue monitoring |

### Revenue-Gated Activation
SA-6 Decision Engine monitors orders/MRR in real time. When milestones are
hit, agents activate automatically — no manual intervention.

### Human-in-the-Loop (HitL)
Every significant agent action writes to `pending_approvals` in Supabase.
Guy receives an email → approves or rejects → agent executes.
No agent acts autonomously on high-stakes decisions.

### Data Layer
- **Supabase** (PostgreSQL): primary database, 7 tables, RLS ON everywhere
- **Upstash Redis**: inter-agent queue monitoring
- **pgvector** (Phase 4): semantic search for product matching
- **Mem0** (Phase 4): persistent agent memory across sessions

### Observability
- **LangFuse**: agent traces and performance (pending LANGFUSE keys)
- **GitHub Actions**: CI/CD, all 15 agents run on schedule
- **SA-6 weekly report**: cluster health email every Sunday

---

## Phase 1 — Core Foundation (CURRENT — Pre-launch)

**Status:** 14/15 agents ✅. 3 tasks remaining before launch-ready.

**Goal:** Everything works. The machine is ready. No gaps.

### Remaining Tasks (in order):

#### Task 1: Human-in-the-Loop System (PRE-LAUNCH BLOCKER)
- `pending_approvals` table already exists in Supabase
- Need: email alert when row inserted + SA-6 reads and routes approvals
- Need: Guy approval/reject mechanism (email link or Supabase UI)
- Without HitL: agents have no safety net before executing actions

#### Task 2: End-to-End Pipeline Test A1→A2→Shopify
- A1 finds product → A2 uploads to Shopify
- Validate with dummy product (DRY_RUN first, then live)
- Confirm agent_health_log entries appear for both agents

#### Task 3: Content & SQL Cleanup
- Abandoned Cart email: update placeholder content in Klaviyo
- Welcome Series: fix "⚠️ warning" text visible to customers
- Run 3 SQL files in Supabase Editor:
  `trends.sql`, `competitor_prices.sql`, `competitor_intel.sql`

**Launch trigger:** All 3 tasks complete → Guy sets `LAUNCH_MODE = true` → machine starts.

---

## Phase 2 — C-Suite Layer ($1K MRR OR 25 orders)

**Trigger:** SA-6 detects milestone → activates Phase 2 agents automatically.

**Goal:** Business intelligence. The store runs; now we understand it.

### Agents to Build:
| Agent | Name | Function |
|-------|------|----------|
| A14 | COO Agent | Operations summary, bottleneck detection |
| A15 | CFO Agent | P&L tracking, margins, cost analysis |
| A16 | CX Agent | Customer experience, NPS, support patterns |
| A20 | Inventory Agent | Stock levels, reorder alerts |

### Infrastructure:
- **Meta CAPI (server-side):** Replace client-side pixel with server-side
  Conversions API. SHA256 hashing, event deduplication. Higher match rates,
  iOS14+ compliant.
- **A8 Analytics full activation:** Weekly GA4 reports with insights, not
  just data dumps.

### Gender Expansion:
- Women as **gift buyers** landing page ("The Perfect Gift for the Man Who
  Has Everything"). Same products, different copy angle.

---

## Phase 3 — Intelligence Expansion ($5K MRR × 2 consecutive months)

**Goal:** The system protects itself and grows itself.

### Agents to Build (full):
| Agent | Name | Function |
|-------|------|----------|
| A17 | Token Refresher | Auto-rotate API keys before expiry |
| A18 | Fraud Shield | Flag suspicious orders before fulfillment |
| A19 | Returns Intelligence | Pattern analysis on return reasons |
| A21 | Affiliate Engine | Track influencer/partner referral revenue |
| A24 | CRO Agent | A/B test suggestions, conversion optimization |

### Agents to Build (skeleton — future-ready):
| Agent | Name | Skeleton Purpose |
|-------|------|-----------------|
| A22 | Wholesale Scout | Framework ready for B2B when volume justifies |
| A23 | Factory Connector | API stubs for supplier communication |
| A26 | Sustainability | Ready for Phase 4 private label sourcing |

### Women's Collection Launch:
- Separate product line with separate narrative voice
- "The one detail that makes the whole outfit make sense"
- Triggered by $5K MRR × 3 months (can overlap with Phase 3)

---

## Phase 4 — Empire Foundation ($15K MRR)

**Goal:** From dropshipping store to owned brand. The biggest phase.

### Private Label (A23 full build):
- Negotiate directly with 2–3 manufacturers
- SockAcademy brand on packaging, labels, inserts
- $5K × 3 months = private label trigger (already in strategy docs)
- 30–40% margin vs 15–20% on dropshipping

### SockAcademy Club (A28 Club Engine):
| Tier | Price | Frequency | What They Get |
|------|-------|-----------|---------------|
| Essential | $45/mo | Monthly | 2 pairs curated |
| Curator | $80/mo | Monthly | 4 pairs + material guide |
| Atelier | $140/bi-monthly | Every 2 months | 6 pairs + private sourcing note |

### PR & Authority (A27 Agent):
- Pitch to GQ, Esquire, Mr Porter
- "First sock authority" narrative push
- Dress-for-success editorial content

### Infrastructure Upgrades:
- **Mem0**: persistent agent memory (learns product performance over time)
- **pgvector**: semantic product search, style matching
- **Shopify Webhooks**: replace cron-based blind polling with event-driven
- **Control Center UI**: internal dashboard — Guy sees all agent activity

---

## Phase 5 — Global Scale ($50K MRR)

**Goal:** Multiple stores. One system managing them all.

### Geographic Expansion:
- EU Store (EUR, German/French/Italian copy)
- UK Store (GBP, British tone)
- Each store = separate Shopify instance

### Agents to Build:
| Agent | Name | Function |
|-------|------|----------|
| A29 | Localization Agent | Translation, currency, cultural tone |
| A30 | EU Compliance Agent | GDPR, VAT, customs, returns law |

### SA Certification Program:
- Other sock brands pay for "SockAcademy Approved" badge
- Annual audit fee: ~$2,500/brand
- 10 brands = $25K/year passive revenue
- SockAcademy becomes the authority that validates the category

---

## Phase 6 — Institution ($200K MRR)

**Goal:** SockAcademy is no longer a store. It is the category.

### SA Media:
- YouTube: material science, craftsmanship, styling
- Podcast: "The Detail" — interviews with designers, stylists, sock makers
- Content monetized separately from product

### SA Academy:
- Online courses on sock materials, craftsmanship, wardrobe strategy
- Positioning: "Wine Spectator did for wine. We do for socks."
- Courses priced $97–$297

### A31 Media Production Agent:
- Auto-schedules content across channels
- Distributes to YouTube, Podcast, Newsletter, Instagram

---

## The ONE BIG TRIGGER

```
Supabase → system_config table
Key:   LAUNCH_MODE
Value: true
```

When Guy sets this flag:
1. SA-6 reads it on next cron cycle (every 30 min)
2. SA-6 sends activation signal to all Phase 1 agents
3. A1 begins product research
4. A2 uploads first product to Shopify
5. A3 writes content, A5 posts to social, A4 starts ads, A6 syncs email
6. A8 begins tracking → SA-6 monitors MRR
7. When MRR hits $1K → Phase 2 activates automatically
8. System runs itself from here

Guy's job after LAUNCH_MODE = true:
- Approve HitL requests (email notifications)
- Review weekly SA-6 health report (every Sunday)
- Add secrets when prompted (A17 rotation)

---

## Revenue Milestone Summary

| Milestone | Trigger | What Activates |
|-----------|---------|----------------|
| LAUNCH_MODE = true | Guy | All Phase 1 agents |
| 10 orders | Automatic | A8 full analytics |
| 25 orders OR $1K MRR | Automatic | Phase 2: A14, A15, A16, A20, Meta CAPI |
| $5K MRR × 2 months | Automatic | Phase 3: A17–A24, Women's collection |
| $5K MRR × 3 months | Automatic | Private label supplier conversations |
| $15K MRR | Automatic | Phase 4: Club, PR, Control Center |
| $50K MRR | Automatic | Phase 5: EU, UK, SA Certification |
| $200K MRR | Automatic | Phase 6: Media, Academy |

---

## Phase 1 Remaining — Execution Order

1. **Human-in-the-Loop** — SA-6 integration + email alert [BLOCKER]
2. **Pipeline Test** — A1 → A2 → Shopify (DRY_RUN → LIVE)
3. **Content Cleanup** — Klaviyo emails + 3 SQL files in Supabase Editor

After these 3: set `LAUNCH_MODE = true`. Everything starts.

---

## Open Items for Guy (Non-Blocking)

| Item | Where | Notes |
|------|-------|-------|
| META_APP_ID | GitHub Secrets | A17 needs this for token refresh |
| GH_PAT_SECRETS_WRITE | GitHub Secrets | A17 needs this for rotation |
| UPSTASH_REDIS_REST_URL + TOKEN | GitHub Secrets | SA-6 queue monitoring ready |
| Delete 2 Draft Welcome Series | Klaviyo | Duplicate drafts |
| DNS mail.sockacademy.store | Domain registrar | Email deliverability |

---

*מסמך זה מייצג את הנכס האסטרטגי המלא של SockAcademy.*
*לא לשנות ללא אישור גיא. כל שינוי = commit חדש עם סיבה.*
