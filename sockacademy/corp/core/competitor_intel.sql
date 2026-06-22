-- competitor_intel — A13 Competitive Intelligence weekly output
-- Run once in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists competitor_intel (
  id            uuid primary key default gen_random_uuid(),

  run_date      text not null,
  mode          text,
  market        text,
  tier          text,
  competitor    text not null,
  category      text,
  price_min     numeric(10,2),
  price_max     numeric(10,2),
  new_products  text,
  out_of_stock  boolean not null default false,
  active_promo  boolean not null default false,
  promo_detail  text,
  opportunity   text,
  action        text,
  urgency       text,
  summary       text,

  created_at    timestamptz not null default now()
);

alter table competitor_intel enable row level security;

do $$ begin
  create policy "service role full access" on competitor_intel for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists competitor_intel_run_date_idx   on competitor_intel (run_date desc);
create index if not exists competitor_intel_competitor_idx on competitor_intel (competitor);
create index if not exists competitor_intel_market_idx     on competitor_intel (market);
create index if not exists competitor_intel_urgency_idx    on competitor_intel (urgency);

grant all on public.competitor_intel to service_role;
grant all on public.competitor_intel to anon;
grant all on public.competitor_intel to authenticated;
