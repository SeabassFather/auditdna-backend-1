-- ============================================================
-- File: send_audit_extend.sql
-- Save to: C:\AuditDNA\backend\migrations\send_audit_extend.sql
-- Run with: psql $DB -f C:\AuditDNA\backend\migrations\send_audit_extend.sql
-- ============================================================
-- Extends email_activity_log to track:
--   - sender_email (which team member sent the email)
--   - industry (Mortgage / Produce / Coconut / Investor / etc)
--   - attachment_count
--   - body_preview (first 500 chars, for audit dashboard)
--   - recipient_count (how many recipients in the same blast - for grouped reporting)
-- ============================================================

ALTER TABLE email_activity_log
  ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS industry VARCHAR(80),
  ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS body_preview TEXT,
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS blast_id VARCHAR(64);

-- Indexes for the dashboard tile + digest queries
CREATE INDEX IF NOT EXISTS idx_eal_sender ON email_activity_log(sender_email);
CREATE INDEX IF NOT EXISTS idx_eal_created ON email_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eal_industry ON email_activity_log(industry);
CREATE INDEX IF NOT EXISTS idx_eal_blast ON email_activity_log(blast_id);

-- Verify
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'email_activity_log'
ORDER BY ordinal_position;
