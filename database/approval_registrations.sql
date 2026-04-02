-- Save to: C:\AuditDNA\backend\database\approval_registrations.sql
-- Run in pgAdmin against both: auditdna (local) and railway (Railway DB)

CREATE TABLE IF NOT EXISTS approval_registrations (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200),
  email            VARCHAR(200) UNIQUE NOT NULL,
  password_hash    VARCHAR(200),
  company          VARCHAR(200),
  origin           VARCHAR(200),
  phone            VARCHAR(50),
  country          VARCHAR(10)  DEFAULT 'mx',
  paca_number      VARCHAR(50),
  tier             VARCHAR(20)  DEFAULT 'free',
  docs_completed   JSONB        DEFAULT '[]',
  status           VARCHAR(20)  DEFAULT 'pending',
  access_code      VARCHAR(20),
  pin              VARCHAR(10),
  approval_note    TEXT,
  approved_by      VARCHAR(100),
  approved_at      TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_registrations(status);
CREATE INDEX IF NOT EXISTS idx_approval_email  ON approval_registrations(email);
CREATE INDEX IF NOT EXISTS idx_approval_tier   ON approval_registrations(tier);

-- Verify
SELECT 'approval_registrations table ready' AS status;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'approval_registrations' ORDER BY ordinal_position;