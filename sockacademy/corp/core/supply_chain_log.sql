-- Drop if schema changed: DROP TABLE IF EXISTS supply_chain_log;
CREATE TABLE IF NOT EXISTS supply_chain_log (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id           text,
  supplier_name         text NOT NULL,
  health_score          integer,
  active_skus           integer DEFAULT 0,
  available_skus        integer DEFAULT 0,
  avg_processing_days   numeric(5,1),
  risk_level            text DEFAULT 'low',
  risk_flags            jsonb DEFAULT '[]',
  notes                 text,
  checked_at            timestamp with time zone DEFAULT now(),
  created_at            timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supply_chain_log_checked_at_idx  ON supply_chain_log(checked_at DESC);
CREATE INDEX IF NOT EXISTS supply_chain_log_risk_level_idx  ON supply_chain_log(risk_level);
CREATE INDEX IF NOT EXISTS supply_chain_log_supplier_id_idx ON supply_chain_log(supplier_id);

ALTER TABLE supply_chain_log ENABLE ROW LEVEL SECURITY;

do $$ begin
  create policy "service role full access" on supply_chain_log for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;
