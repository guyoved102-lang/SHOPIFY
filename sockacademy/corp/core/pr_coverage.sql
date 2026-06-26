-- A27 PR Agent — tracked media coverage
create table if not exists pr_coverage (
  id             uuid default gen_random_uuid() primary key,
  publication    text not null,
  url            text unique,
  headline       text,
  sentiment      text check (sentiment in ('positive', 'neutral', 'negative')),
  reach_estimate integer,
  coverage_date  date,
  created_at     timestamptz default now()
);
