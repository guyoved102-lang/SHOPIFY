-- products — primary product table (A1 writes, A2 reads + updates)
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists products (
  id             uuid primary key default gen_random_uuid(),

  -- CJ Dropshipping identity
  cj_pid         text unique,          -- CJ product ID (used as upsert key)

  -- Research data (A1)
  name           text not null,
  category       text,
  materials      text[],               -- array: ['merino', 'cotton']
  platform       text,                 -- 'CJ', 'AliExpress', etc.
  rating         numeric(3,2),
  orders_count   integer,
  supplier_price numeric(10,2),
  retail_price   numeric(10,2),
  score          integer,              -- A1 quality score 0–100
  image_url      text,
  product_url    text,
  run_date       date,                 -- date of A1 scan

  -- Approval workflow
  status         text not null default 'Pending'
                 check (status in ('Pending','Approved','Rejected','Uploaded')),

  -- Upload tracking (A2)
  upload_status  text not null default '',   -- '' | 'uploading' | 'uploaded:<shopify_id>' | 'error'
  shopify_id     text,
  shopify_url    text,
  upload_date    date,

  -- Timestamps
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- RLS
alter table products enable row level security;

create policy "service role full access"
  on products for all to service_role
  using (true) with check (true);

-- Indexes
create index if not exists products_status_idx        on products (status);
create index if not exists products_upload_status_idx on products (upload_status);
create index if not exists products_run_date_idx      on products (run_date desc);
create index if not exists products_score_idx         on products (score desc);

grant all on public.products to service_role;
grant all on public.products to anon;
grant all on public.products to authenticated;
