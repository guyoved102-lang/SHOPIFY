-- agent_health_log -- cross-session agent run log
-- Run once in Supabase SQL Editor: https://app.supabase.com -> SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists agent_health_log (
  id            uuid primary key default gen_random_uuid(),

  agent_id      text not null,        -- 'A0', 'A1', 'A2', etc.
  agent_name    text not null,        -- 'Orchestrator', 'Product Research', etc.

  run_status    text not null         -- 'success', 'failure', 'warning', 'skipped'
                check (run_status in ('success', 'failure', 'warning', 'skipped')),

  gh_run_id     text,                 -- GitHub Actions run ID (for drill-down)
  gh_run_url    text,                 -- direct link to the run log

  duration_ms   integer,              -- runtime in milliseconds
  items_processed integer,            -- e.g. products scanned, posts published

  error_message text,                 -- first error if run_status = 'failure'
  error_code    text,                 -- short code e.g. 'MISSING_SECRET', 'API_TIMEOUT'

  metadata      jsonb not null default '{}',  -- agent-specific payload

  created_at    timestamptz not null default now()
);

alter table agent_health_log enable row level security;

DO $$
BEGIN
  create policy "service role full access"
    on agent_health_log
    for all
    to service_role
    using (true)
    with check (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create index if not exists idx_agent_health_agent_id   on agent_health_log (agent_id);
create index if not exists idx_agent_health_run_status on agent_health_log (run_status);
create index if not exists idx_agent_health_created_at on agent_health_log (created_at desc);

grant all on public.agent_health_log to service_role;
revoke all on public.agent_health_log from anon;
revoke all on public.agent_health_log from authenticated;
