-- =============================================================================
-- EMMA - OAuth Medic migration
-- File: C:\AuditDNA\backend\migrations\2026-05-01-emma-oauth-medic.sql
-- =============================================================================

\echo '== EMMA OAUTH MEDIC MIGRATION =='

CREATE TABLE IF NOT EXISTS ai_oauth_repair (
  id                SERIAL PRIMARY KEY,
  status            VARCHAR(20)  NOT NULL DEFAULT 'proposed',
  recipe            VARCHAR(60)  NOT NULL,
  diagnosis         TEXT,
  confidence        NUMERIC(3,2),
  human_action      TEXT,
  auto_recoverable  BOOLEAN      DEFAULT FALSE,
  context           JSONB,
  error_history     JSONB,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  approved_at       TIMESTAMPTZ,
  approved_by       VARCHAR(64),
  rejected_at       TIMESTAMPTZ,
  rejected_by       VARCHAR(64),
  reject_reason     TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_oauth_repair_status ON ai_oauth_repair(status);
CREATE INDEX IF NOT EXISTS idx_ai_oauth_repair_created_at ON ai_oauth_repair(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_oauth_repair_recipe ON ai_oauth_repair(recipe);

\echo '== POST-MIGRATION =='

SELECT 'ai_oauth_repair' AS table_name,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_oauth_repair') AS present,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ai_oauth_repair') AS index_count;

\echo '== EMMA MIGRATION COMPLETE =='
