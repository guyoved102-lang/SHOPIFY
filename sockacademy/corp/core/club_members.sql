-- A28 SockAcademy Club — subscription members registry
create table if not exists club_members (
  id                  uuid default gen_random_uuid() primary key,
  shopify_customer_id text not null unique,
  email               text not null,
  name                text,
  tier                text not null check (tier in ('standard', 'connoisseur', 'director')),
  status              text not null default 'invited' check (status in ('invited', 'active', 'paused', 'cancelled')),
  joined_at           date,
  next_cycle_date     date,
  total_cycles        integer default 0,
  total_spent_usd     numeric(10,2) default 0,
  notes               text,
  created_at          timestamptz default now()
);

-- A28 SockAcademy Club — subscription cycle records
create table if not exists subscription_cycles (
  id               uuid default gen_random_uuid() primary key,
  member_id        uuid references club_members(id) on delete cascade,
  cycle_date       date not null,
  shopify_order_id text,
  status           text not null default 'pending' check (status in ('pending', 'fulfilled', 'skipped', 'failed')),
  amount_usd       numeric(10,2),
  notes            text,
  created_at       timestamptz default now()
);

alter table club_members enable row level security;
alter table subscription_cycles enable row level security;

create policy "service role full access" on club_members
  for all to service_role using (true) with check (true);

create policy "service role full access" on subscription_cycles
  for all to service_role using (true) with check (true);

grant all on public.club_members to service_role;
grant all on public.subscription_cycles to service_role;
