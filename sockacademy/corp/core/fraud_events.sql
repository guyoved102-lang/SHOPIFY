-- A18 Fraud & Cybersecurity — fraud_events table
-- Run once in Supabase SQL editor before A18 first execution.

CREATE TABLE IF NOT EXISTS fraud_events (
  id           BIGSERIAL PRIMARY KEY,
  event_date   DATE        NOT NULL,
  pillar       TEXT        NOT NULL
                CONSTRAINT fraud_events_pillar_check
                CHECK (pillar IN ('chargeback', 'bot_traffic', 'payment_health')),
  severity     TEXT        NOT NULL
                CONSTRAINT fraud_events_severity_check
                CHECK (severity IN ('critical', 'warning', 'info')),
  signal_type  TEXT        NOT NULL,
  value        NUMERIC,
  threshold    NUMERIC,
  order_id     BIGINT,
  browser_ip   TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fraud_events_unique UNIQUE (event_date, pillar, signal_type)
);

ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service role full access" ON fraud_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fraud_events_date     ON fraud_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_events_pillar   ON fraud_events (pillar);
CREATE INDEX IF NOT EXISTS idx_fraud_events_severity ON fraud_events (severity);

GRANT ALL ON TABLE fraud_events TO service_role;
REVOKE ALL ON TABLE fraud_events FROM anon;
REVOKE ALL ON TABLE fraud_events FROM authenticated;
