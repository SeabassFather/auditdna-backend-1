-- =============================================================================
-- GG SMTP MEDIC - migration
-- File: C:\AuditDNA\backend\migrations\2026-05-01-gg-smtp-medic.sql
-- =============================================================================

\echo '== GG SMTP MEDIC MIGRATION =='

CREATE TABLE IF NOT EXISTS ai_smtp_repair (
  id                  SERIAL PRIMARY KEY,
  error_message       TEXT NOT NULL,
  error_code          VARCHAR(64),
  transporter_config  JSONB,
  matched_recipes     JSONB,
  proposal_json       JSONB NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'proposed',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at          TIMESTAMPTZ,
  rejected_at         TIMESTAMPTZ,
  approver            VARCHAR(64),
  reject_reason       TEXT,
  CONSTRAINT ai_smtp_repair_status_chk CHECK (status IN ('proposed','approved','rejected','applied','superseded'))
);

CREATE INDEX IF NOT EXISTS idx_ai_smtp_repair_status     ON ai_smtp_repair(status);
CREATE INDEX IF NOT EXISTS idx_ai_smtp_repair_created    ON ai_smtp_repair(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_smtp_repair_proposed   ON ai_smtp_repair(created_at DESC) WHERE status = 'proposed';

\echo '== POST-MIGRATION =='
SELECT 'ai_smtp_repair' AS table_name,
       (SELECT to_regclass('ai_smtp_repair') IS NOT NULL) AS present,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ai_smtp_repair') AS index_count;

\echo '== GG MIGRATION COMPLETE =='
