-- A27 PR Agent — outreach campaigns
create table if not exists pr_campaigns (
  id              uuid default gen_random_uuid() primary key,
  campaign_name   text not null unique,
  subject_en      text,
  subject_he      text,
  body_en         text,
  body_he         text,
  status          text default 'draft' check (status in ('draft', 'active', 'completed', 'paused')),
  launch_date     date,
  product_context jsonb default '{}',
  created_at      timestamptz default now()
);

alter table pr_campaigns enable row level security;

DO $$
BEGIN
  create policy "service role full access" on pr_campaigns
    for all to service_role using (true) with check (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

grant all on public.pr_campaigns to service_role;
