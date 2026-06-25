-- A21 Affiliate & Influencer ROI — database setup
-- Run once in Supabase SQL editor before A21 first execution.
-- Creates: affiliates (partner registry) + affiliate_performance (daily snapshots)

-- ─── TABLE 1: affiliates — partner registry (maintained manually by Guy) ─────

CREATE TABLE IF NOT EXISTS affiliates (
  id              BIGSERIAL   PRIMARY KEY,
  name            TEXT        NOT NULL,
  handle          TEXT        NOT NULL,
  type            TEXT        NOT NULL
                   CONSTRAINT affiliates_type_check
                   CHECK (type IN ('influencer', 'affiliate', 'partner')),
  discount_code   TEXT        NOT NULL UNIQUE,
  commission_rate NUMERIC     NOT NULL DEFAULT 0.10,
  tier            TEXT        NOT NULL DEFAULT 'standard'
                   CONSTRAINT affiliates_tier_check
                   CHECK (tier IN ('standard', 'premium', 'vip')),
  platform        TEXT,
  active          BOOLEAN     NOT NULL DEFAULT true,
  joined_at       DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_affiliates_code   ON affiliates (discount_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_active ON affiliates (active);

-- ─── TABLE 2: affiliate_performance — daily snapshots (idempotent) ───────────

CREATE TABLE IF NOT EXISTS affiliate_performance (
  id              BIGSERIAL   PRIMARY KEY,
  report_date     DATE        NOT NULL,
  affiliate_id    BIGINT      NOT NULL REFERENCES affiliates(id),
  discount_code   TEXT        NOT NULL,
  orders_count    INT         NOT NULL DEFAULT 0,
  gross_revenue   NUMERIC     NOT NULL DEFAULT 0,
  commission_owed NUMERIC     NOT NULL DEFAULT 0,
  net_roi         NUMERIC     NOT NULL DEFAULT 0,
  rank            INT,
  period_days     INT         NOT NULL DEFAULT 30,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_performance_unique UNIQUE (report_date, affiliate_id)
);

ALTER TABLE affiliate_performance ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_affiliate_perf_date ON affiliate_performance (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_perf_aff  ON affiliate_performance (affiliate_id);
