-- Drop if schema changed: DROP TABLE IF EXISTS inventory_alerts;
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sku                 text NOT NULL,
  product_id          bigint,
  product_title       text,
  variant_title       text,
  current_stock       integer DEFAULT 0,
  reorder_point       integer DEFAULT 10,
  velocity_30d        numeric(10,2) DEFAULT 0,
  forecast_4w         numeric(10,2) DEFAULT 0,
  alert_level         text DEFAULT 'ok',
  supplier_cost       numeric(10,2),
  checked_at          timestamp with time zone DEFAULT now(),
  created_at          timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_alerts_sku_idx  ON inventory_alerts(sku);
CREATE INDEX IF NOT EXISTS inventory_alerts_alert_level_idx ON inventory_alerts(alert_level);
CREATE INDEX IF NOT EXISTS inventory_alerts_checked_at_idx  ON inventory_alerts(checked_at DESC);

ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

do $$ begin
  create policy "service role full access" on inventory_alerts for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;
