# A18 — Fraud & Cybersecurity Agent
## Design Spec — SockAcademy Phase 3A
**Date:** 2026-06-25
**Status:** Approved — ready for implementation
**Author:** Guy Oved + Claude (CTO session)

---

## 1. Overview

A18 is a daily security intelligence agent monitoring three fraud pillars: chargebacks, bot traffic, and payment health. It runs from day one in dormant-but-breathing mode — all pipelines live, all data flows, all reports generated. Zero orders produces a clean "0 fraud events" report. When fraud occurs post-launch, the same code path handles it with no changes required.

**Approach selected:** Single `agent.js`, per-pillar `try/catch` isolation. A pillar failure returns `{ status: 'error' }` in the consolidated result — agent continues, sends partial report, flags failed pillar explicitly in email.

---

## 2. Flags & Environment

```js
const DRY_RUN           = process.env.DRY_RUN === 'true';
const CLOUDFLARE_ACTIVE = process.env.CLOUDFLARE_ACTIVE === 'true';
```

| Flag | Default in CI | Effect |
|---|---|---|
| `DRY_RUN=true` | `true` | No Supabase writes, no emails — logs intent only |
| `CLOUDFLARE_ACTIVE=false` | `false` | Cloudflare block returns `null`; Pillar 2 uses Shopify signals only |

`CLOUDFLARE_ACTIVE` is never set to `true` in GitHub Secrets until DNS is routed through Cloudflare. Activation requires one secret update — no code changes.

**Required env vars (all exist in current 25-secret set — no new secrets needed):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `SHOPIFY_MASTER_TOKEN`, `SHOPIFY_SHOP_DOMAIN`
- `GMAIL_APP_PASSWORD`
- `ANTHROPIC_API_KEY`

**Future env vars (only needed when `CLOUDFLARE_ACTIVE=true`):**
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_ACCOUNT_ID`

---

## 3. File Structure

```
sockacademy/agents/A18_fraud_cybersecurity/
  agent.js
  package.json
  package-lock.json

.github/workflows/
  a18-fraud-cybersecurity.yml

sockacademy/db/
  fraud_events.sql
```

---

## 4. Execution Flow

```
main()
  ├── connectSupabase()
  ├── fetchShopifyOrders()              ← single fetch, shared across all pillars
  │
  ├── [Pillar 1] runChargebackPillar(orders)    try/catch → result1
  ├── [Pillar 2] runBotTrafficPillar(orders)    try/catch → result2
  ├── [Pillar 3] runPaymentHealthPillar(orders) try/catch → result3
  │
  ├── consolidate(result1, result2, result3)
  ├── buildAlerts(summary)
  ├── upsertFraudEvents(events)         ← fraud_events table
  ├── generateNarrative(summary)        ← claude-sonnet-4-6
  ├── writeExecutiveReport(summary)     ← executive_reports (agent_id='A18')
  ├── sendEmail(summary, alerts, narrative)
  └── logHealth(status)                 ← agent_health_log
```

Shopify data fetched once, passed to all three pillars. No redundant API calls.

---

## 5. Pillar 1 — Chargeback Monitoring

**Data source:** `GET /orders.json?status=any&financial_status=charged_back` (last 30 days)

**KPIs:**
```js
{
  chargeback_count:       N,
  chargeback_rate_pct:    N,      // (chargebacks / total_orders) * 100
  total_amount_at_risk:   N.NN,   // USD
  high_value_chargebacks: [orderId, ...]  // orders > $300
}
```

**Alert thresholds:**

| Condition | Severity |
|---|---|
| `chargeback_rate_pct > 1.0` | CRITICAL |
| `chargeback_rate_pct > 0.5` | WARNING |
| Single chargeback order > $300 | WARNING |
| 0 chargebacks | INFO |

---

## 6. Pillar 2 — Bot Traffic Detection

### Mode A: `CLOUDFLARE_ACTIVE=false` (current)

**Data source:** Shopify orders — `browser_ip`, `risk_level`, `created_at` (last 30d aggregate, last 24h velocity)

**Signals:**
1. **Velocity flag** — same `browser_ip` on 3+ distinct orders within 24h
2. **High-risk cluster** — Shopify `risk_level: 'high'` on 3+ orders in 24h
3. **Card-testing pattern** — same `browser_ip`, different payment methods, AOV < $50, multiple orders in 24h

**KPIs:**
```js
{
  high_risk_order_count:  N,
  velocity_flags:         [{ ip, count, orders: [id, ...] }, ...],
  card_testing_suspects:  [{ ip, order_count, unique_cards }, ...],
  cloudflare_bot_pct:     null    // dormant
}
```

### Mode B: `CLOUDFLARE_ACTIVE=true` (future)

**Additional data source:** Cloudflare Analytics GraphQL API + Firewall Events

```js
async function getCloudflareData() {
  if (!CLOUDFLARE_ACTIVE) return null;
  const token  = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) throw new Error('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID not set');
  // Query 1: Bot traffic ratio via Analytics GraphQL (last 24h)
  // Query 2: Firewall events (blocked threats count)
  return { bot_pct, blocked_threats, top_threat_countries };
}
```

**Alert thresholds:**

| Condition | Severity |
|---|---|
| IP with 5+ orders in 24h | CRITICAL |
| IP with 3–4 orders in 24h | WARNING |
| 3+ Shopify high-risk orders in 24h | WARNING |
| Card-testing pattern detected | CRITICAL |
| Cloudflare `bot_pct > 30%` (when active) | WARNING |

---

## 7. Pillar 3 — Payment Health

**Data source:** Shopify orders last 30 days — `financial_status`, order amounts, customer email

**Logic:**
- `financial_status: 'voided'` = payment attempted and failed → gateway decline proxy
- Multiple orders same customer/email with different cards in 24h = suspicious
- AOV anomaly: 24h AOV > 3× 30-day rolling AOV = fraud spike signal

**KPIs:**
```js
{
  total_orders_30d:             N,
  voided_orders_30d:            N,
  gateway_decline_rate_pct:     N,     // (voided / (voided + paid)) * 100
  suspicious_payment_patterns:  N,
  avg_order_value_30d:          N.NN,
  avg_order_value_24h:          N.NN,
  aov_anomaly_detected:         bool
}
```

**Alert thresholds:**

| Condition | Severity |
|---|---|
| `gateway_decline_rate_pct > 15` | CRITICAL |
| `gateway_decline_rate_pct > 8` | WARNING |
| `aov_anomaly_detected = true` | WARNING |
| `suspicious_payment_patterns >= 2` | WARNING |

---

## 8. Supabase Schema

### New table: `fraud_events`

```sql
CREATE TABLE IF NOT EXISTS fraud_events (
  id           BIGSERIAL PRIMARY KEY,
  event_date   DATE        NOT NULL,
  pillar       TEXT        NOT NULL
                CHECK (pillar IN ('chargeback', 'bot_traffic', 'payment_health')),
  severity     TEXT        NOT NULL
                CHECK (severity IN ('critical', 'warning', 'info')),
  signal_type  TEXT        NOT NULL,
  value        NUMERIC,
  threshold    NUMERIC,
  order_id     BIGINT,
  browser_ip   TEXT,
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_date, pillar, signal_type)
);

ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fraud_events_date     ON fraud_events (event_date DESC);
CREATE INDEX idx_fraud_events_pillar   ON fraud_events (pillar);
CREATE INDEX idx_fraud_events_severity ON fraud_events (severity);
```

### Existing tables (no schema changes):

| Table | Usage |
|---|---|
| `executive_reports` | Upsert daily — `agent_id='A18'`, `report_type='daily'` |
| `agent_health_log` | Run status, items_processed count |

---

## 9. Consolidation & Report Structure

```js
const summary = {
  report_date:   REPORT_DATE,
  total_events:  criticalCount + warningCount,
  pillars: {
    chargeback:     result1,   // { status: 'ok'|'error', kpis: {}, alerts: [] }
    bot_traffic:    result2,
    payment_health: result3,
  },
  top_severity: 'critical' | 'warning' | 'info' | 'error',
};
```

A pillar with `status: 'error'` renders a red "PILLAR ERROR" block in the email — never silent.

---

## 10. Email

**Always sent** — mirrors A19 pattern.

**Subject:** `A18 Fraud & Security — {DATE} | {N} events | CB: {X}% | Bot: {Y} flags | Payment: {Z}%`

**Body (dark theme, monospace, Loro Piana tone):**
1. Sonnet narrative (2–3 sentences, CEO-level security briefing)
2. Summary table — one row per pillar, color-coded status
3. Alerts section — CRITICAL red, WARNING orange, all-clear green
4. Per-pillar detail tables (top 3 items each)
5. Footer — date, Cloudflare status indicator

**Narrative model:** `claude-sonnet-4-6`

**Prompt:** "You are the Fraud & Cybersecurity intelligence system for SockAcademy, a premium sock brand. Write a 2-3 sentence security briefing for the CEO. Assess the overall threat level. Name the most significant signal if events exist. Give one concrete recommendation if action is required. If 0 events, confirm clean security posture and monitoring status. Be direct."

**SMTP:** `sockacademy.store@gmail.com` (Iron Law 3)
**To:** `guyoved102@gmail.com`

---

## 11. GitHub Actions YAML

```yaml
name: A18 — Fraud & Cybersecurity
on:
  schedule:
    - cron: '0 9 * * *'    # 09:00 UTC daily — 30 min after A19 (08:30 UTC)
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: sockacademy/agents/A18_fraud_cybersecurity/package-lock.json
      - run: npm ci
        working-directory: sockacademy/agents/A18_fraud_cybersecurity
      - run: node agent.js
        working-directory: sockacademy/agents/A18_fraud_cybersecurity
        env:
          DRY_RUN:              'false'
          CLOUDFLARE_ACTIVE:    'false'
          SUPABASE_URL:         ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SHOPIFY_MASTER_TOKEN: ${{ secrets.SHOPIFY_MASTER_TOKEN }}
          SHOPIFY_SHOP_DOMAIN:  ${{ secrets.SHOPIFY_SHOP_DOMAIN }}
          GMAIL_APP_PASSWORD:   ${{ secrets.GMAIL_APP_PASSWORD }}
          ANTHROPIC_API_KEY:    ${{ secrets.ANTHROPIC_API_KEY }}
```

No new GitHub Secrets required.

---

## 12. Pre-Revenue Behavior

All three pillars execute against real Shopify data. With 0 orders:

| Pillar | Result |
|---|---|
| Chargeback | `count=0`, `rate=0%` → INFO |
| Bot Traffic | 0 orders → 0 velocity flags → INFO |
| Payment Health | 0 orders → `decline_rate=0%` → INFO |

Email sent: "Monitoring active — 0 fraud events detected. Infrastructure verified."
Sonnet confirms system health. Executive report written to Supabase.
Same code path as live — zero stubs, zero special cases.

---

## 13. Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.4",
    "@anthropic-ai/sdk": "^0.39.0",
    "nodemailer": "^6.10.1",
    "dotenv": "^16.5.0"
  }
}
```

No new dependencies beyond existing agent stack.

---

## 14. What Is NOT in A18

- No HITL / `pending_approvals` — Phase B pre-launch feature, separate from this agent
- No Shopify order tagging — future enhancement, not in scope
- No frontend / dashboard — Design Freeze in effect
- No new GitHub Secrets needed at launch
