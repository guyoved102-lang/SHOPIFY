-- A26 Regulatory Watch — regulatory_events table
-- Run once in Supabase SQL Editor before first live run.

CREATE TABLE IF NOT EXISTS regulatory_events (
  id             BIGSERIAL PRIMARY KEY,
  event_date     DATE        NOT NULL,
  region         TEXT        NOT NULL CHECK (region   IN ('EU', 'US', 'IL')),
  category       TEXT        NOT NULL CHECK (category IN ('privacy', 'consumer_protection', 'product_safety', 'advertising', 'tax_customs')),
  severity       TEXT        NOT NULL CHECK (severity  IN ('critical', 'warning', 'info')),
  title          TEXT        NOT NULL,
  summary        TEXT,
  source_url     TEXT,
  effective_date DATE,
  affects_policy BOOLEAN     NOT NULL DEFAULT false,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT regulatory_events_unique UNIQUE (event_date, region, title)
);

ALTER TABLE regulatory_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_regulatory_events_date     ON regulatory_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_regulatory_events_region   ON regulatory_events (region);
CREATE INDEX IF NOT EXISTS idx_regulatory_events_severity ON regulatory_events (severity);

-- ─── GRANTS — protocol #26 (service_role must have explicit access) ────────────
GRANT ALL ON TABLE regulatory_events                       TO service_role, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE regulatory_events_id_seq   TO service_role, anon, authenticated;
