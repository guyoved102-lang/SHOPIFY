-- A27 PR Agent — press contacts table
create table if not exists press_contacts (
  id            uuid default gen_random_uuid() primary key,
  name          text not null,
  publication   text not null,
  email         text,
  linkedin_url  text,
  beat          text,
  tier          integer not null check (tier in (1, 2)),
  region        text not null check (region in ('global', 'israel')),
  language      text not null check (language in ('en', 'he')),
  last_contacted date,
  contact_count integer default 0,
  notes         text,
  created_at    timestamptz default now(),
  unique (name, publication)
);

alter table press_contacts enable row level security;

create policy "service role full access" on press_contacts
  for all to service_role using (true) with check (true);

grant all on public.press_contacts to service_role;
