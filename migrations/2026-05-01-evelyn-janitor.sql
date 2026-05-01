-- =============================================================================
-- EVELYN - Code Janitor migration
-- File: C:\AuditDNA\backend\migrations\2026-05-01-evelyn-janitor.sql
-- =============================================================================

\echo '== EVELYN CODE JANITOR MIGRATION =='

CREATE TABLE IF NOT EXISTS ai_code_cleanup (
  id                  SERIAL PRIMARY KEY,
  status              VARCHAR(20)  NOT NULL DEFAULT 'proposed',
  kind                VARCHAR(40)  NOT NULL,
  file_path           TEXT         NOT NULL,
  file_size           BIGINT,
  age_days            INTEGER,
  reason              TEXT,
  claude_verdict      VARCHAR(20),
  claude_confidence   NUMERIC(3,2),
  claude_reasoning    TEXT,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  approved_at         TIMESTAMPTZ,
  approved_by         VARCHAR(64),
  rejected_at         TIMESTAMPTZ,
  rejected_by         VARCHAR(64),
  reject_reason       TEXT,
  executed_at         TIMESTAMPTZ,
  execution_error     TEXT
);

-- Partial unique index: prevent re-proposing the same file while it's still pending
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_code_cleanup_path_pending
  ON ai_code_cleanup (file_path)
  WHERE status = 'proposed';

CREATE INDEX IF NOT EXISTS idx_ai_code_cleanup_status     ON ai_code_cleanup(status);
CREATE INDEX IF NOT EXISTS idx_ai_code_cleanup_kind       ON ai_code_cleanup(kind);
CREATE INDEX IF NOT EXISTS idx_ai_code_cleanup_created_at ON ai_code_cleanup(created_at DESC);

\echo '== POST-MIGRATION =='

SELECT 'ai_code_cleanup' AS table_name,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_code_cleanup') AS present,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ai_code_cleanup') AS index_count;

\echo '== EVELYN MIGRATION COMPLETE =='
