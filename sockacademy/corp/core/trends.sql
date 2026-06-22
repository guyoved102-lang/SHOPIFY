-- trends — A10 Trend Scout weekly output
-- Run once in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists trends (
  id                  uuid primary key default gen_random_uuid(),

  scouted_at          timestamptz not null,
  rank                integer not null,
  trend_name          text not null,
  category            text,
  trend_score         integer,
  trend_direction     text check (trend_direction in ('rising', 'stable', 'falling')),
  google_signal       text,
  reddit_signal       text,
  cj_search_term      text,
  estimated_retail_usd numeric(10,2),
  rationale           text,

  created_at          timestamptz not null default now()
);

alter table trends enable row level security;

do $$ begin
  create policy "service role full access" on trends for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists trends_scouted_at_idx   on trends (scouted_at desc);
create index if not exists trends_rank_idx         on trends (rank);
create index if not exists trends_category_idx     on trends (category);
create index if not exists trends_direction_idx    on trends (trend_direction);

grant all on public.trends to service_role;
grant all on public.trends to anon;
grant all on public.trends to authenticated;
