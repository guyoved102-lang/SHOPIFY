-- queue_log — persistent audit trail for Redis queue events
-- Run once in Supabase SQL Editor: https://app.supabase.com → SQL Editor

create table if not exists queue_log (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null,
  queue       text not null,
  event_type  text not null,
  source      text not null,
  payload     jsonb not null default '{}',
  status      text not null default 'pending'
              check (status in ('pending', 'processed', 'failed')),
  processed_by text,
  created_at  timestamptz not null default now(),
  processed_at timestamptz
);

alter table queue_log enable row level security;

DO $$
BEGIN
  create policy "service role full access"
    on queue_log for all to service_role
    using (true) with check (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create index if not exists queue_log_status_idx on queue_log (status, created_at);
create index if not exists queue_log_type_idx   on queue_log (event_type);
create index if not exists queue_log_source_idx on queue_log (source);

grant all on public.queue_log to service_role;
revoke all on public.queue_log from anon;
revoke all on public.queue_log from authenticated;
