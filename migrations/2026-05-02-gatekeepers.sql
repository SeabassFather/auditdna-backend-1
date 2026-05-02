-- =============================================================================
-- File: C:\AuditDNA\backend\migrations\2026-05-02-gatekeepers.sql
-- 11-agent gatekeeper pipeline + Margie audit archive tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS gatekeeper_runs (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID NOT NULL UNIQUE,
  request_type  VARCHAR(120) NOT NULL,
  source        VARCHAR(80),
  actor_user_id INTEGER,
  actor_role    VARCHAR(40),
  payload       JSONB,
  result        JSONB,
  status        VARCHAR(24) NOT NULL DEFAULT 'running',
  error_msg     TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  duration_ms   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_gk_runs_started ON gatekeeper_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gk_runs_type    ON gatekeeper_runs (request_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gk_runs_status  ON gatekeeper_runs (status, started_at DESC);

CREATE TABLE IF NOT EXISTS gatekeeper_stages (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID NOT NULL REFERENCES gatekeeper_runs(run_id) ON DELETE CASCADE,
  stage_number  SMALLINT NOT NULL,
  stage_name    VARCHAR(40) NOT NULL,
  agent         VARCHAR(40) NOT NULL,
  status        VARCHAR(24) NOT NULL,
  output        JSONB,
  error_msg     TEXT,
  started_at    TIMESTAMPTZ NOT NULL,
  finished_at   TIMESTAMPTZ,
  duration_ms   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_gk_stages_runid ON gatekeeper_stages (run_id, stage_number);
CREATE INDEX IF NOT EXISTS idx_gk_stages_agent ON gatekeeper_stages (agent, started_at DESC);

CREATE TABLE IF NOT EXISTS margie_archive (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID,
  request_type  VARCHAR(120),
  summary       TEXT,
  intel         JSONB,
  full_record   JSONB,
  filed_by      VARCHAR(40) NOT NULL DEFAULT 'margie',
  filed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_period VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_margie_filed  ON margie_archive (filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_margie_period ON margie_archive (report_period, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_margie_type   ON margie_archive (request_type, filed_at DESC);

-- Daily roll-up view for Margie's reports
CREATE OR REPLACE VIEW margie_daily_summary AS
SELECT
  DATE(filed_at) AS report_date,
  request_type,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE full_record->>'status' = 'success') AS success_count,
  COUNT(*) FILTER (WHERE full_record->>'status' = 'failed')  AS failure_count,
  AVG((full_record->>'duration_ms')::INTEGER) AS avg_duration_ms
FROM margie_archive
GROUP BY DATE(filed_at), request_type
ORDER BY report_date DESC, request_type;
