-- pending_approvals — HitL table
-- Run once in Supabase SQL editor: https://app.supabase.com → SQL Editor

create table if not exists pending_approvals (
  id           uuid primary key default gen_random_uuid(),
  agent_id     text not null,
  action_type  text not null,
  description  text not null,
  payload_json jsonb not null default '{}',
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected','expired')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

alter table pending_approvals enable row level security;

DO $$
BEGIN
  create policy "service role full access"
    on pending_approvals
    for all
    to service_role
    using (true)
    with check (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create index if not exists pending_approvals_status_idx on pending_approvals (status, created_at);

grant all on public.pending_approvals to service_role;
revoke all on public.pending_approvals from anon;
revoke all on public.pending_approvals from authenticated;
