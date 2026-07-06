# FABLE5 CRON EFFICIENCY REVIEW

> 📌 **Consolidated 06/07/2026:** the cron reschedule + staleness-threshold pairing + collision fixes recommended here were executed on 06/07/2026 (see `FABLE5_ACTION_TRACKER.md` item 2.4 for status). This file remains the detailed source.

**Date:** 05/07/2026 · Read-only pass over all 34 files in `.github/workflows/` + `corp/core/orchestration/index.js` (STALENESS_HOURS) + CLAUDE.md scheduling notes. Pre-launch context respected (LAUNCH_MODE dormancy is intentional; judged on CI waste/noise only, not traffic).

## Full schedule table

| Workflow | Agent | Schedule (UTC) | Status |
|---|---|---|---|
| a0-orchestrator.yml | A0 Orchestrator | daily 06:00 | live |
| a1-product-research.yml | A1 Product Research | Mon 07:00 | live |
| a2-product-upload.yml | A2 Product Upload | daily 08:00 | live |
| a25-quality-control.yml | **A2.5** Quality Gate | daily 07:30 | live |
| a3-content.yml | A3 SEO Blog | Mon 09:00 | live |
| a4-meta-ads.yml | A4 Meta Ads | Tue 07:00 | dormant + `disabled_manually` in GitHub |
| a5-social.yml | A5 Instagram | Sun/Wed/Fri 07:00 | live (publish failing — known blocker) |
| a6-email-sync.yml | A6 Klaviyo | **no cron** (push + manual) | live |
| a7-supplier-monitor.yml | A7 Supplier Monitor | daily 06:00 | live |
| a8-analytics-reporter.yml | A8 Analytics | Sun 07:00 | live |
| a9-legal-compliance.yml | A9 Legal | manual only (dry_run input) | frozen — correct |
| a10-trend-scout.yml | A10 Trends | Sun 06:00 | dormant |
| a11-price-intelligence.yml | A11 Pricing | Wed 06:00 | live |
| a12-review-collector.yml | A12 Reviews | Thu 07:00 | live |
| a13-competitive-intel.yml | A13 Competitive | Sun 06:00 + Mon/Wed/Fri 01:00 | dormant |
| a14-coo.yml | A14 COO | daily 21:00 | dormant |
| a15-cfo.yml | A15 CFO | daily 22:30 | live (intentionally ungated) |
| a16-cx.yml | A16 CX | daily 22:00 | dormant |
| a17-token-refresher.yml | A17 Token Refresh | 1st of every 2nd month 08:00 | live |
| a18-fraud-cybersecurity.yml | A18 Fraud | daily 09:00 | dormant |
| a19-returns-intelligence.yml | A19 Returns | daily 08:30 | dormant |
| a20-inventory-intelligence.yml | A20 Inventory | daily 07:00 | dormant |
| a21-affiliate-roi.yml | A21 Affiliate ROI | daily 10:00 | dormant |
| a22-supply-chain.yml | A22 Supply Chain | daily 06:15 | dormant |
| a23-factory-relations.yml | A23 Factory | monthly, 1st 09:00 | dormant |
| a24-cro.yml | A24 CRO | daily 11:00 | dormant |
| a25-influencer.yml | A25 Influencer | daily 09:00 | dormant |
| a26-regulatory-watch.yml | A26 Regulatory | Mon 08:00 | dormant |
| a27-pr.yml | A27 PR | Fri 07:00 | dormant |
| a28-club.yml | A28 Club | Mon 08:00 | dormant |
| structure-lint / hitl-approve / verify-self-heal / shopify-webhook-handler | infra | no cron (push/PR/dispatch) | fine |

## Real issues found

**1. Nine dormant agents still run DAILY — the fleet's largest live Zero-Waste violation.**
A14 (21:00), A16 (22:00), A18 (09:00), A19 (08:30), A20 (07:00), A21 (10:00), A22 (06:15), A24 (11:00), A25 (09:00) are all `LAUNCH_MODE: 'false'` yet cron-daily. Each run does checkout + Node setup + **two npm installs** (agent + corp/core) before the gate exits — roughly 270+ no-op runs and ~400–500 CI minutes per month of pure noise. A13 adds 3 extra dormant runs/week (Mon/Wed/Fri 01:00 "strike alerts" that can't strike while dormant). Fix — weekly, staggered, keeping each agent's familiar hour: A20 `0 7 * * 2`, A19 `30 8 * * 2`, A18 `0 9 * * 2`, A21 `0 10 * * 2`, A22 `15 6 * * 2`, A24 `0 11 * * 2`, A25 `0 9 * * 3`, A14 `0 21 * * 1`, A16 `0 22 * * 1`; A13 drop the `0 1 * * 1,3,5` line, keep `0 6 * * 0`. **Must be paired with issue 2's threshold fix**, or A0 will flag them stale.

**2. STALENESS_HOURS contradicts actual crons — A0 falsely flags A8 and A10 as stale ~6 days a week.**
`corp/core/orchestration/index.js` sets A8: 36h and A10: 36h ("daily"), but both crons are weekly (Sun 07:00 / Sun 06:00). As coded, A0's daily health check marks them stale from ~Monday evening until Sunday, dragging cluster scores — and Readiness Score ≥95 for 48h is a **Phase 2 gate**, so this mismatch can silently block Phase 2 forever. Reverse drift on A7: threshold 200h ("weekly") but cron is daily. Fix (code, one file): set A8 and A10 to `200`; decide A7's real cadence (see issue 3) and align its comment. If issue 1's crons go weekly, also set A18/A19/A20/A21/A22/A24/A25 from 36 → 200.

**3. A0 and A7 fire at the exact same minute (daily 06:00), both live, both on Supabase.**
A0 reads `agent_health_log` while A7 is mid-run writing to it (plus Shopify + CJ). Not fatal, but it's the only live/live same-minute pair and it's trivially avoidable. Fix: A7 → `30 5 * * *` (finishes before A0 reads), which also matches A0's role as the morning reader.

**4. A5 and A8 collide Sunday 07:00 — the reporter reads metrics its subject is writing at that moment.**
Both live, both touch Supabase metrics. A8's weekly report can capture A5's Sunday run half-done. Fix: A8 → `0 12 * * 0` (after all morning agents, still Sunday).

**Cosmetic (fix only if touching these files anyway):** A18+A25 share daily 09:00 and A26+A28 share Mon 08:00 (all dormant — zero API contention, CI-only overlap; issue 1's stagger resolves both). A27 Fri 07:00 coincides with A5 Fri — dormant vs live, harmless. Separately: `a25-quality-control.yml` is agent **A2.5** while `a25-influencer.yml` is A25 — confusing filename, not a scheduling problem.

## Confirmed fine — do not worry about these

- **A3 Mon 09:00 exactly matches CLAUDE.md** ("אחרי A1, ללא collision"): A1 Mon 07:00 → A3 Mon 09:00, clean 2h gap. A4 `0 7 * * 2` and A12 `0 7 * * 4` also match their documented rationale verbatim.
- **A2.5 07:30 → A2 08:00** — deliberate gate-before-upload ordering, correct.
- **A19 08:30 → A18 09:00 → A21 10:00 → A24 11:00** — a documented, self-consistent stagger chain (comments in each file agree with each other). The *ordering* is right; only the daily-while-dormant frequency is the problem (issue 1).
- **Evening C-suite stagger** A14 21:00 / A16 22:00 / A15 22:30 — no collisions; A15 daily-live is intentional (it writes LAUNCH_MODE state).
- **A17 bimonthly, A23 monthly, A9 manual-only with dry_run default** — appropriately sparse/guarded.
- **A6 has no cron at all** (push + manual) — zero waste; flag to Guy only to confirm it's intentional that Klaviyo sync never runs on a schedule.
- **A2 daily 08:00 despite A1 being weekly** is defensible: HITL product approvals can land any day, so a daily pickup is reasonable — not counted as a violation.
- Infra workflows (structure-lint, hitl-approve, verify-self-heal, webhook handler) have no crons — nothing to fix.

## Bottom line

No dependency-order violations and no dangerous live/live races beyond two easily-fixed same-minute overlaps (A0/A7, A5/A8). The two things genuinely worth acting on: **(a)** nine dormant agents burning daily CI runs against the project's own Zero-Waste law, and **(b)** the STALENESS_HOURS/cron mismatch that makes A0 falsely report A8/A10 stale — the only finding with real downstream teeth, since it feeds the Phase 2 readiness gate. Everything documented in CLAUDE.md (A3/A4/A12) still matches reality exactly.
