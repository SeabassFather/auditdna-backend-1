-- ============================================================
-- File: ai_letters_log.sql
-- Save to: C:\AuditDNA\backend\migrations\ai_letters_log.sql
-- Run: psql $DB -f C:\AuditDNA\backend\migrations\ai_letters_log.sql
-- ============================================================
-- Logs every AI letter generation for cost tracking, audit, and
-- the 50/day rate-limit guard.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_letters_log (
  id BIGSERIAL PRIMARY KEY,
  user_email VARCHAR(255),
  tone VARCHAR(40),
  commodity VARCHAR(80),
  recipient_role VARCHAR(40),
  custom_prompt TEXT,
  length_preset VARCHAR(20),

  subject TEXT,
  body_en TEXT,
  body_es TEXT,
  suggested_attachments TEXT[],

  model VARCHAR(80),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_estimate_usd NUMERIC(10, 6),

  status VARCHAR(32) DEFAULT 'success',
  error_message TEXT,

  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_letters_user      ON ai_letters_log(user_email);
CREATE INDEX IF NOT EXISTS idx_ai_letters_created   ON ai_letters_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_letters_commodity ON ai_letters_log(commodity);
CREATE INDEX IF NOT EXISTS idx_ai_letters_status    ON ai_letters_log(status);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_letters_log'
ORDER BY ordinal_position;
