-- ============================================================================
-- AuditDNA — Corrective Migration v2
-- File: C:\AuditDNA\backend\migrations\email_campaigns_v2_rename.sql
--
-- Issue: First migration tried to create suppression_list and internal_messages
--        but those names are already taken by:
--          - suppression_list  (CAN-SPAM compliance, privacy-hashed, in use)
--          - internal_messages (autonomy-loop alerts, in use)
--
-- Fix: Use new namespaced names:
--          - email_suppression  (replaces my version of suppression_list)
--          - employee_inbox     (replaces my version of internal_messages)
-- ============================================================================

-- Drop my failed empty stubs first (the migration created the new tables but
-- failed when trying to add indexes - so check & drop only if they're empty
-- and have my schema, NOT the existing ones).
-- Since both already-existing tables have data/different schema, the "CREATE TABLE IF NOT EXISTS"
-- silently skipped, leaving the wrong schema in place. So we don't drop anything -
-- we just create new differently-named tables.

-- ----------------------------------------------------------------------------
-- email_suppression (replaces my suppression_list)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_suppression (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(200) UNIQUE NOT NULL,
  reason        VARCHAR(50) NOT NULL,
  added_at      TIMESTAMP DEFAULT NOW(),
  added_by      VARCHAR(100),
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_suppression_email ON email_suppression(email);

-- ----------------------------------------------------------------------------
-- employee_inbox (replaces my internal_messages)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_inbox (
  id                 SERIAL PRIMARY KEY,
  thread_id          INTEGER,
  from_user          VARCHAR(100) NOT NULL,
  to_users           JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_users           JSONB DEFAULT '[]'::jsonb,
  subject            TEXT,
  body               TEXT NOT NULL,
  body_html          TEXT,
  attachments        JSONB DEFAULT '[]'::jsonb,
  priority           VARCHAR(20) DEFAULT 'normal',
  read_by            JSONB DEFAULT '[]'::jsonb,
  starred_by         JSONB DEFAULT '[]'::jsonb,
  archived_by        JSONB DEFAULT '[]'::jsonb,
  related_contact_id INTEGER,
  related_vertical   VARCHAR(40),
  created_at         TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emp_inbox_to ON employee_inbox USING GIN (to_users);
CREATE INDEX IF NOT EXISTS idx_emp_inbox_from ON employee_inbox(from_user);
CREATE INDEX IF NOT EXISTS idx_emp_inbox_thread ON employee_inbox(thread_id);
CREATE INDEX IF NOT EXISTS idx_emp_inbox_created ON employee_inbox(created_at DESC);

-- ============================================================================
-- Done. Verify:
--   SELECT COUNT(*) FROM email_suppression;
--   SELECT COUNT(*) FROM employee_inbox;
-- ============================================================================
