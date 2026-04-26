-- =============================================================================
-- File: niner_bridge.sql
-- Save to: C:\AuditDNA\backend\migrations\niner_bridge.sql
-- =============================================================================
-- Sprint D Wave 2 - Niner Bridge orchestration tables
-- Run with: psql -f migrations\niner_bridge.sql
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_templates (
  id              SERIAL PRIMARY KEY,
  grower_id       INTEGER,
  inventory_id    INTEGER,
  commodity       TEXT NOT NULL,
  variety         TEXT,
  origin          TEXT,
  volume_lbs      NUMERIC,
  price_fob       NUMERIC,
  unit            TEXT DEFAULT 'lb',
  available_from  DATE,
  available_until DATE,
  -- AI-generated content
  subject_line    TEXT,
  body_html       TEXT,
  body_text       TEXT,
  language        TEXT DEFAULT 'EN',
  reasoning_engine TEXT DEFAULT 'AuditDNA Platform Reasoning',
  ai_model        TEXT,
  -- Matching
  matched_buyer_count INTEGER DEFAULT 0,
  matched_buyer_ids   INTEGER[],
  matched_buyer_emails TEXT[],
  -- Lifecycle
  status          TEXT NOT NULL DEFAULT 'pending_admin'
                  CHECK (status IN ('pending_admin','admin_reviewing','approved','scheduled','sent','rejected','expired')),
  admin_id        INTEGER,
  admin_name      TEXT,
  approved_at     TIMESTAMP,
  scheduled_for   TIMESTAMP,
  sent_at         TIMESTAMP,
  rejection_reason TEXT,
  regen_count     INTEGER DEFAULT 0,
  -- Audit
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_templates_status     ON pending_templates(status);
CREATE INDEX IF NOT EXISTS idx_pending_templates_grower     ON pending_templates(grower_id);
CREATE INDEX IF NOT EXISTS idx_pending_templates_commodity  ON pending_templates(commodity);
CREATE INDEX IF NOT EXISTS idx_pending_templates_created    ON pending_templates(created_at DESC);

CREATE TABLE IF NOT EXISTS niner_pipeline_events (
  id            SERIAL PRIMARY KEY,
  template_id   INTEGER REFERENCES pending_templates(id) ON DELETE CASCADE,
  grower_id     INTEGER,
  inventory_id  INTEGER,
  stage         TEXT NOT NULL,
  outcome       TEXT DEFAULT 'success',
  meta          JSONB,
  ms_elapsed    INTEGER,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_events_template ON niner_pipeline_events(template_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_stage    ON niner_pipeline_events(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created  ON niner_pipeline_events(created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id              SERIAL PRIMARY KEY,
  template_id     INTEGER REFERENCES pending_templates(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  recipient_role  TEXT,
  delivery_channel TEXT,
  delivered_at    TIMESTAMP,
  read_at         TIMESTAMP,
  acted_on_at     TIMESTAMP,
  delivery_error  TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_template  ON inventory_alerts(template_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_recipient ON inventory_alerts(recipient_email);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_unread    ON inventory_alerts(template_id) WHERE read_at IS NULL;

-- Pipeline funnel view (for dashboard analytics)
CREATE OR REPLACE VIEW v_niner_pipeline_funnel AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) FILTER (WHERE stage = 'uploaded')   AS uploaded,
  COUNT(*) FILTER (WHERE stage = 'templated')  AS templated,
  COUNT(*) FILTER (WHERE stage = 'matched')    AS matched,
  COUNT(*) FILTER (WHERE stage = 'notified')   AS notified,
  COUNT(*) FILTER (WHERE stage = 'approved')   AS approved,
  COUNT(*) FILTER (WHERE stage = 'scheduled')  AS scheduled,
  COUNT(*) FILTER (WHERE stage = 'sent')       AS sent,
  COUNT(*) FILTER (WHERE stage = 'failed')     AS failed
FROM niner_pipeline_events
GROUP BY 1
ORDER BY 1 DESC;

-- Quick "what needs my attention" query for admin dashboard
CREATE OR REPLACE VIEW v_pending_admin_queue AS
SELECT
  pt.id,
  pt.commodity,
  pt.variety,
  pt.origin,
  pt.volume_lbs,
  pt.price_fob,
  pt.available_from,
  pt.matched_buyer_count,
  pt.subject_line,
  pt.language,
  pt.created_at,
  EXTRACT(EPOCH FROM (NOW() - pt.created_at)) / 60 AS minutes_waiting
FROM pending_templates pt
WHERE pt.status = 'pending_admin'
ORDER BY pt.created_at ASC;

COMMENT ON TABLE pending_templates IS 'Niner Bridge: AI-generated buyer letters awaiting admin approval and scheduling.';
COMMENT ON TABLE niner_pipeline_events IS 'Niner Bridge: full audit trail of pipeline stages for replay and metrics.';
COMMENT ON TABLE inventory_alerts IS 'Niner Bridge: admin notification log (ntfy + email delivery records).';
COMMENT ON VIEW  v_niner_pipeline_funnel IS 'Sprint D analytics: daily funnel counts, uploaded -> sent.';
COMMENT ON VIEW  v_pending_admin_queue IS 'Admin UI: alerts awaiting review, sorted by oldest first.';
