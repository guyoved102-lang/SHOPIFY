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

alter table pr_coverage enable row level security;

create policy "service role full access" on pr_coverage
  for all to service_role using (true) with check (true);

grant all on public.pr_coverage to service_role;
