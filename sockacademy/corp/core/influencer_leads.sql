-- A25 Influencer Outreach — influencer_leads table
-- Run once in Supabase SQL Editor before deploying A25
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS influencer_leads (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  handle            text          NOT NULL,
  full_name         text,
  email             text          NOT NULL,
  niche             text          NOT NULL,
  follower_count    integer,
  engagement_rate   numeric(5,2),
  aesthetic_tags    text[]        DEFAULT '{}',
  fit_score         integer       CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_justification text,
  draft_subject     text,
  draft_body        text,
  status            text          NOT NULL DEFAULT 'new'
                                  CHECK (status IN ('new','draft_ready','sent','replied','rejected')),
  processed_at      timestamptz,
  sent_at           timestamptz,
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT uq_influencer_handle UNIQUE (handle)
);

ALTER TABLE influencer_leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'influencer_leads' AND policyname = 'service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY service_role_all ON influencer_leads FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END;
$$;

GRANT ALL ON TABLE influencer_leads TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

COMMENT ON TABLE influencer_leads IS 'A25 Influencer Outreach — lead pipeline. Guy inputs rows; A25 processes and drafts outreach.';
COMMENT ON COLUMN influencer_leads.status IS 'new → draft_ready → sent → replied/rejected';
COMMENT ON COLUMN influencer_leads.sent_at IS 'Timestamp when Guy manually sent the outreach (approval SLA tracking)';
