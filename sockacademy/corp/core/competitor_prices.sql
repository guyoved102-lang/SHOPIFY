-- competitor_prices — A11 Price Intelligence weekly output
-- Run once in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists competitor_prices (
  id           uuid primary key default gen_random_uuid(),

  timestamp    timestamptz not null,
  brand        text not null,
  product_name text,
  category     text,
  price_usd    numeric(10,2),
  sa_floor     numeric(10,2),
  delta_vs_sa  numeric(10,2),
  url          text,
  status       text,

  created_at   timestamptz not null default now()
);

alter table competitor_prices enable row level security;

create policy "service role full access"
  on competitor_prices for all to service_role
  using (true) with check (true);

create index if not exists competitor_prices_timestamp_idx on competitor_prices (timestamp desc);
create index if not exists competitor_prices_brand_idx     on competitor_prices (brand);
create index if not exists competitor_prices_category_idx  on competitor_prices (category);
