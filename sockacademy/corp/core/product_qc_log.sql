-- product_qc_log — audit trail for A2.5 Quality Control decisions
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- Safe to run multiple times (idempotent)

create table if not exists product_qc_log (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid references products(id) on delete set null,
  product_name     text,
  qc_result        text not null check (qc_result in ('approved', 'rejected')),
  checks_passed    jsonb,
  rejection_reason text,
  created_at       timestamptz not null default now()
);

alter table product_qc_log enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_qc_log'
    AND policyname = 'service role full access'
  ) THEN
    CREATE POLICY "service role full access"
      ON product_qc_log FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

create index if not exists qc_log_product_id_idx  on product_qc_log (product_id);
create index if not exists qc_log_result_idx      on product_qc_log (qc_result);
create index if not exists qc_log_created_at_idx  on product_qc_log (created_at desc);

grant all on public.product_qc_log to service_role;
grant all on public.product_qc_log to anon;
grant all on public.product_qc_log to authenticated;
