-- Drop if schema changed: DROP TABLE IF EXISTS factory_reports;
CREATE TABLE IF NOT EXISTS factory_reports (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_name        text,
  factory_location    text,
  product_category    text,
  moq                 integer,
  cost_per_unit_usd   numeric(10,2),
  lead_time_days      integer,
  quality_score       integer,
  certifications      jsonb DEFAULT '[]',
  contact_info        text,
  source_notes        text,
  report_date         date,
  created_at          timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS factory_reports_report_date_idx ON factory_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS factory_reports_category_idx    ON factory_reports(product_category);
CREATE INDEX IF NOT EXISTS factory_reports_score_idx       ON factory_reports(quality_score DESC);

ALTER TABLE factory_reports ENABLE ROW LEVEL SECURITY;

do $$ begin
  create policy "service role full access" on factory_reports for all to service_role using (true) with check (true);
exception when duplicate_object then null;
end $$;
