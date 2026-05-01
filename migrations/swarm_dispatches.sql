-- =============================================================================
-- SWARM PHASE 4 - DISPATCHES TABLE
-- File: C:\AuditDNA\backend\migrations\swarm_dispatches.sql
--
-- Single new table. Reuses existing brain_events for event log, autonomy_queue
-- for task queueing, autonomy_agents for agent registry. swarm_dispatches is
-- the audit trail of which agent handled which event with what outcome.
--
-- Run: psql -h localhost -p 5432 -U postgres -d auditdna -f swarm_dispatches.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS swarm_dispatches (
  id              BIGSERIAL PRIMARY KEY,
  agent_name      VARCHAR(64) NOT NULL,
  event_type      VARCHAR(100),
  event_id        BIGINT,
  brain_event_id  INTEGER,
  payload         JSONB,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  result          JSONB,
  error_message   TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  CONSTRAINT swarm_dispatches_status_check CHECK (status IN (
    'pending','running','succeeded','failed','skipped','retried','dead_letter','circuit_open'
  ))
);

CREATE INDEX IF NOT EXISTS idx_swarm_dispatches_agent      ON swarm_dispatches (agent_name);
CREATE INDEX IF NOT EXISTS idx_swarm_dispatches_status     ON swarm_dispatches (status);
CREATE INDEX IF NOT EXISTS idx_swarm_dispatches_event_type ON swarm_dispatches (event_type);
CREATE INDEX IF NOT EXISTS idx_swarm_dispatches_created    ON swarm_dispatches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swarm_dispatches_brain_evt  ON swarm_dispatches (brain_event_id);

-- Health summary table (1-min rollups so SwarmConsole loads instantly)
CREATE TABLE IF NOT EXISTS swarm_metrics (
  id              BIGSERIAL PRIMARY KEY,
  bucket_minute   TIMESTAMPTZ NOT NULL,
  agent_name      VARCHAR(64),
  dispatched      INTEGER NOT NULL DEFAULT 0,
  succeeded       INTEGER NOT NULL DEFAULT 0,
  failed          INTEGER NOT NULL DEFAULT 0,
  skipped         INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER,
  p95_duration_ms INTEGER,
  CONSTRAINT swarm_metrics_unique UNIQUE (bucket_minute, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_swarm_metrics_bucket ON swarm_metrics (bucket_minute DESC);

-- Watermark so coordinator picks up where it left off across restarts
CREATE TABLE IF NOT EXISTS swarm_watermark (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  last_event_id     INTEGER NOT NULL DEFAULT 0,
  last_polled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coordinator_started_at TIMESTAMPTZ,
  CONSTRAINT swarm_watermark_singleton CHECK (id = 1)
);

INSERT INTO swarm_watermark (id, last_event_id, last_polled_at)
VALUES (1, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Done
SELECT 'swarm_dispatches schema ready' AS status;
