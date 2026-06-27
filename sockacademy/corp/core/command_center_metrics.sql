-- command_center_metrics — time-series KPI store for Supabase Studio visualization
-- EAV model: one row per metric per agent per day.
-- Query example: SELECT metric_date, numeric_value FROM command_center_metrics
--                WHERE metric_name = 'revenue_7d_usd' ORDER BY metric_date;
-- Run once in Supabase SQL Editor: https://app.supabase.com -> SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists command_center_metrics (
  id            uuid primary key default gen_random_uuid(),

  agent_id      text not null,           -- 'A14', 'A15', 'A8', etc.
  metric_date   date not null,           -- the calendar day this metric represents
  metric_name   text not null,           -- e.g. 'revenue_7d_usd', 'agents_healthy'
  numeric_value numeric(18, 4),          -- populated for quantitative metrics
  text_value    text,                    -- populated for categorical / label metrics
  unit          text,                    -- 'usd', 'ils', 'pct', 'count', 'rate', etc.

  created_at    timestamptz not null default now(),

  unique (agent_id, metric_date, metric_name)
);

alter table command_center_metrics enable row level security;

create policy "service role full access"
  on command_center_metrics
  for all
  to service_role
  using (true)
  with check (true);

-- Fast lookup: all metrics for a given agent over time
create index if not exists idx_ccm_agent_date
  on command_center_metrics (agent_id, metric_date desc);

-- Fast lookup: one metric across all agents / all dates (chart data)
create index if not exists idx_ccm_metric_name_date
  on command_center_metrics (metric_name, metric_date desc);

create index if not exists idx_ccm_created_at
  on command_center_metrics (created_at desc);

grant all on public.command_center_metrics to service_role;
grant all on public.command_center_metrics to anon;
grant all on public.command_center_metrics to authenticated;

-- ─── Convenience view: latest snapshot of every metric per agent ──────────────
-- Usage: SELECT * FROM command_center_latest WHERE agent_id = 'A15';
create or replace view command_center_latest as
select distinct on (agent_id, metric_name)
  agent_id,
  metric_name,
  metric_date,
  numeric_value,
  text_value,
  unit
from command_center_metrics
order by agent_id, metric_name, metric_date desc;

grant select on public.command_center_latest to service_role;
grant select on public.command_center_latest to anon;
grant select on public.command_center_latest to authenticated;
