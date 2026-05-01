-- =============================================================================
-- MARGIE + MINIAPI WATCHERS migration
-- File: C:\AuditDNA\backend\migrations\2026-05-01-margie-and-watchers.sql
-- =============================================================================

\echo '== MARGIE + MINIAPI WATCHERS MIGRATION =='

-- MARGIE: structured audit log of ALL agent activity
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id                BIGSERIAL PRIMARY KEY,
  agent_name        VARCHAR(40)  NOT NULL,
  event_type        VARCHAR(80)  NOT NULL,
  category          VARCHAR(40),
  severity          VARCHAR(20),
  summary           TEXT,
  brain_event_id    BIGINT,
  payload           JSONB,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_agent      ON ai_audit_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_audit_category   ON ai_audit_log(category);
CREATE INDEX IF NOT EXISTS idx_audit_severity   ON ai_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON ai_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_brain_event_id ON ai_audit_log(brain_event_id);

-- Prevent re-logging the same brain event
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_unique_brain_event ON ai_audit_log(brain_event_id) WHERE brain_event_id IS NOT NULL;

-- ENRIQUE / KIKI / ELIOTT proposals
CREATE TABLE IF NOT EXISTS ai_miniapi_watchers (
  id                SERIAL PRIMARY KEY,
  agent_name        VARCHAR(20)  NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'proposed',
  severity          VARCHAR(20),
  diagnosis         TEXT,
  human_action      TEXT,
  auto_recoverable  BOOLEAN      DEFAULT FALSE,
  context           JSONB,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  acknowledged_at   TIMESTAMPTZ,
  acknowledged_by   VARCHAR(64),
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT
);

CREATE INDEX IF NOT EXISTS idx_miniapi_watchers_agent      ON ai_miniapi_watchers(agent_name);
CREATE INDEX IF NOT EXISTS idx_miniapi_watchers_status     ON ai_miniapi_watchers(status);
CREATE INDEX IF NOT EXISTS idx_miniapi_watchers_severity   ON ai_miniapi_watchers(severity);
CREATE INDEX IF NOT EXISTS idx_miniapi_watchers_created_at ON ai_miniapi_watchers(created_at DESC);

-- brain_state may not exist - create if missing (used for Margie watermark)
CREATE TABLE IF NOT EXISTS brain_state (
  key         VARCHAR(80) PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

\echo '== POST-MIGRATION =='

SELECT 'ai_audit_log' AS table_name,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_audit_log') AS present,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ai_audit_log') AS index_count
UNION ALL
SELECT 'ai_miniapi_watchers',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_miniapi_watchers'),
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ai_miniapi_watchers')
UNION ALL
SELECT 'brain_state',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brain_state'),
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'brain_state');

\echo '== MIGRATION COMPLETE =='
