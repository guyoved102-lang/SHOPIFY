-- system_config — global configuration flags for SockAcademy automation
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- Safe to run multiple times (idempotent)
--
-- Phase activation flags (Guy sets these manually — zero auto-activation):
--   LAUNCH_MODE            = 'true'  → Phase 1 is live
--   PHASE_2_ACTIVATE_BY_GUY = 'true' → activates Phase 2 C-Suite agents
--   PHASE_3_ACTIVATE_BY_GUY = 'true' → activates Phase 3 Risk & Supply Chain
--   PHASE_4_ACTIVATE_BY_GUY = 'true' → activates Phase 4 Brand Elevation
--   PHASE_5_ACTIVATE_BY_GUY = 'true' → activates Phase 5 Market Authority
--   PHASE_6_ACTIVATE_BY_GUY = 'true' → activates Phase 6 Exit Readiness
--   PHASE_6_STRATEGIC_DECISION = 'true' → manual override for Phase 6 (bypasses MRR threshold)

create table if not exists system_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table system_config enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'system_config'
    AND policyname = 'service role full access'
  ) THEN
    CREATE POLICY "service role full access"
      ON system_config FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

grant all on public.system_config to service_role;
grant all on public.system_config to anon;
grant all on public.system_config to authenticated;

-- Seed defaults (only insert if key does not already exist)
insert into system_config (key, value)
  values ('LAUNCH_MODE', 'false')
  on conflict (key) do nothing;
