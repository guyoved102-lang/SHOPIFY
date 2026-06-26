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
