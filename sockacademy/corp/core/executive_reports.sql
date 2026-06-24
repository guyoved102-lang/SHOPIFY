-- executive_reports — daily C-Suite digest table (SA-7: A14 COO, A15 CFO, A16 CX)
-- Run once in Supabase SQL Editor: https://app.supabase.com -> SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists executive_reports (
  id          uuid primary key default gen_random_uuid(),

  agent_id    text not null,          -- 'A14', 'A15', 'A16'
  report_date date not null,
  report_type text not null default 'daily'
              check (report_type in ('daily', 'weekly', 'monthly')),

  kpis        jsonb not null default '{}',  -- agent-specific KPI payload (schema per agent)
  alerts      jsonb not null default '[]',  -- [{ level: 'critical'|'warning'|'info', message: '' }]
  narrative   text,                          -- Claude-generated plain-text summary (~100 words)

  created_at  timestamptz not null default now(),

  unique (agent_id, report_date, report_type)
);

alter table executive_reports enable row level security;

create policy "service role full access"
  on executive_reports
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_exec_reports_agent_date
  on executive_reports (agent_id, report_date desc);

create index if not exists idx_exec_reports_created_at
  on executive_reports (created_at desc);

grant all on public.executive_reports to service_role;
grant all on public.executive_reports to anon;
grant all on public.executive_reports to authenticated;
