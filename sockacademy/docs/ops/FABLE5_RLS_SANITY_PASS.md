# FABLE5 RLS Sanity Pass — 05/07/2026

Fresh, independent read of every `.sql` file in the repo. **Not clean.** 1 broken file, 4 tables with no policy at all, 10 tables with the exact non-idempotent `CREATE POLICY` class that caused yesterday's production error, and a widespread `GRANT ALL TO anon/authenticated` least-privilege violation (currently inert, see below).

## Files checked (25 — all in `sockacademy/corp/core/`, none elsewhere in repo)

affiliates, agent_health_log, club_members, command_center_metrics, competitor_intel, competitor_prices, cro_snapshots, executive_reports, factory_reports, fraud_events, influencer_leads, inventory_alerts, knowledge_chunks, pending_approvals, pr_campaigns, pr_coverage, press_contacts, product_qc_log, products_table, queue_log, regulatory_events, returns_log, supply_chain_log, system_config, trends (`.sql`). Two files create two tables each (affiliates, club_members) → 27 tables.

## Table-by-table

| Table | RLS | Policy | Idempotent | Grants beyond service_role | Verdict |
|---|---|---|---|---|---|
| products | Y | **BROKEN** | — | anon, authenticated (ALL) | **FIX — invalid SQL** |
| fraud_events | Y | **NONE** | — | none | **FIX — add policy** |
| affiliates | Y | **NONE** | — | anon, authenticated (ALL + seq) | **FIX — add policy, trim grants** |
| affiliate_performance | Y | **NONE** | — | anon, authenticated (ALL + seq) | **FIX — add policy, trim grants** |
| regulatory_events | Y | **NONE** | — | anon, authenticated (ALL + seq) | **FIX — add policy, trim grants** |
| pending_approvals | Y | Y | **N** | anon, authenticated (ALL) | **FIX — idempotency** |
| queue_log | Y | Y | **N** (+2 bare indexes L24-25) | anon, authenticated (ALL) | **FIX — idempotency** |
| agent_health_log | Y | Y | **N** (header claims idempotent) | anon, authenticated (ALL) | **FIX — idempotency** |
| executive_reports | Y | Y | **N** (header claims idempotent) | anon, authenticated (ALL) | **FIX — idempotency** |
| club_members (PII) | Y | Y | **N** | none | **FIX — idempotency** |
| subscription_cycles | Y | Y | **N** | none | **FIX — idempotency** |
| press_contacts (PII) | Y | Y | **N** | none | **FIX — idempotency** |
| pr_campaigns | Y | Y | **N** | none | **FIX — idempotency** |
| pr_coverage | Y | Y | **N** | none | **FIX — idempotency** |
| trends | Y | Y | Y | anon, authenticated (ALL) | clean (grants note) |
| competitor_prices | Y | Y | Y | anon, authenticated (ALL) | clean (grants note) |
| competitor_intel | Y | Y | Y | anon, authenticated (ALL) | clean (grants note) |
| product_qc_log | Y | Y | Y | anon, authenticated (ALL) | clean (grants note) |
| system_config | Y | Y | Y | anon, authenticated (ALL) | clean (grants note — holds LAUNCH_MODE) |
| cro_snapshots | Y | Y | Y | anon, authenticated (ALL) | clean (grants note) |
| knowledge_chunks (new, post-audit) | Y | Y | Y | anon, authenticated (ALL) | clean (grants note) |
| returns_log | Y | Y | Y | none | clean |
| supply_chain_log | Y | Y | Y | none | clean |
| factory_reports | Y | Y | Y | none | clean |
| inventory_alerts | Y | Y | Y | none | clean |
| influencer_leads (PII: emails) | Y | Y | Y | none | clean |
| command_center_metrics | Y | Y | Y | none + explicit REVOKE anon/auth | clean — **the model pattern** |

## Real issues found

1. **`products_table.sql` line 43 — invalid PostgreSQL syntax.** `create policy if not exists "service role full access"` — PostgreSQL has no `IF NOT EXISTS` for `CREATE POLICY`. Running this file fails with a syntax error before the policy exists. If the live `products` table's policy was ever created by this file, verify it actually exists in Supabase (`select * from pg_policies where tablename='products'`). **Fix:** replace lines 43–45 with the `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` wrapper used in `trends.sql`.

2. **Four tables have RLS enabled but zero policies:** `fraud_events.sql` (whole file), `affiliates.sql` (both tables), `regulatory_events.sql`. Agents still work only because Supabase's `service_role` has `bypassrls`; there is no explicit policy safety net, deviating from the fleet convention. **Fix:** add the standard idempotent service_role policy to each.

3. **Ten non-idempotent `CREATE POLICY` statements** — the exact class that caused yesterday's production `duplicate_object` error: `pending_approvals.sql:18`, `queue_log.sql:20` (plus bare `create index` at lines 24–25), `agent_health_log.sql:30`, `executive_reports.sql:24`, `club_members.sql:32,35`, `press_contacts.sql:21`, `pr_campaigns.sql:17`, `pr_coverage.sql:15`. Re-running any of these files errors. `agent_health_log.sql` and `executive_reports.sql` headers falsely claim "Safe to run multiple times (idempotent)." **Fix:** wrap each in `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`.

4. **`GRANT ALL ... TO anon, authenticated` on 11 tables** (see table), including `system_config` (LAUNCH_MODE/phase flags), `products`, business-KPI tables, and `affiliates`/`regulatory_events` sequence grants. **Currently inert** — RLS is enabled with no anon/authenticated policy, so RLS denies all rows regardless of grants. But it violates least-privilege (Iron Law S3) and becomes live public exposure the moment anyone disables RLS on one table. `command_center_metrics.sql` already does it right (grant service_role only + explicit revokes). **Fix (low urgency, defense-in-depth):** replace the anon/authenticated grants with revokes per the command_center_metrics pattern.

PII cross-check (per FABLE5_PROJECT_MAP context): the tables holding personal data — `influencer_leads` (emails), `club_members` (emails + spend), `press_contacts` (emails) — all correctly grant service_role only and have deny-by-default RLS for anon. No PII is exposed today. `knowledge_chunks` (the post-audit table) is structurally correct except the broad grants noted above; its `match_knowledge_chunks` function is invoker-rights, so RLS still applies to callers.

## Bottom line

**No data is exposed right now** — every table has RLS enabled and no table grants anon/authenticated a *policy*, so deny-by-default holds everywhere, including all PII tables. But the pass is **not clean**: `products_table.sql` contains SQL that cannot execute, 4 tables lack any policy, 10 policy statements will reproduce yesterday's duplicate_object production error on re-run, and 11 tables carry unnecessary anon/authenticated grants. All fixes are small, mechanical, and listed above.
