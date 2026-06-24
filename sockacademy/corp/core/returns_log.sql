-- Drop if schema changed: DROP TABLE IF EXISTS returns_log;
CREATE TABLE IF NOT EXISTS returns_log (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id         bigint,
  order_name       text,
  refund_id        bigint,
  product_title    text,
  sku              text,
  quantity         integer DEFAULT 1,
  reason           text,
  financial_status text,
  refund_amount    numeric(10,2),
  currency         text DEFAULT 'USD',
  return_date      date,
  created_at       timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS returns_log_refund_id_idx ON returns_log(refund_id) WHERE refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS returns_log_return_date_idx      ON returns_log(return_date DESC);
CREATE INDEX IF NOT EXISTS returns_log_sku_idx              ON returns_log(sku);

ALTER TABLE returns_log ENABLE ROW LEVEL SECURITY;

do $$ begin
  create policy "service role full access" on returns_log for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;
