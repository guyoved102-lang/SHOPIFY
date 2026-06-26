-- cro_snapshots — daily CRO funnel snapshots (A24 CRO Agent)
-- Run once in Supabase SQL Editor: https://app.supabase.com -> SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists cro_snapshots (
  id              uuid primary key default gen_random_uuid(),

  snapshot_date   date not null,
  period_days     int  not null default 7,

  -- GA4 Funnel (0 when GA4_ACTIVE=false)
  sessions        int          not null default 0,
  product_views   int          not null default 0,   -- view_item events
  add_to_carts    int          not null default 0,   -- add_to_cart events
  checkouts       int          not null default 0,   -- begin_checkout events
  purchases       int          not null default 0,   -- purchase/transaction events

  -- Conversion Rates (%)
  view_rate       numeric(6,2) not null default 0,   -- product_views / sessions
  cart_rate       numeric(6,2) not null default 0,   -- add_to_carts / product_views
  checkout_rate   numeric(6,2) not null default 0,   -- checkouts / add_to_carts
  purchase_rate   numeric(6,2) not null default 0,   -- purchases / checkouts
  overall_cvr     numeric(6,2) not null default 0,   -- purchases / sessions

  -- Revenue & Engagement
  ga4_revenue     numeric(10,2) not null default 0,
  bounce_rate     numeric(6,2)  not null default 0,

  -- Full payload for drill-down
  payload         jsonb not null default '{}',

  created_at      timestamptz not null default now(),

  unique (snapshot_date, period_days)
);

alter table cro_snapshots enable row level security;

DO $$
BEGIN
  CREATE POLICY "service role full access" ON cro_snapshots
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create index if not exists idx_cro_snapshots_date
  on cro_snapshots (snapshot_date desc);

grant all on public.cro_snapshots to service_role;
grant all on public.cro_snapshots to anon;
grant all on public.cro_snapshots to authenticated;
