-- ============================================================
-- AUDITDNA — PII REMEDIATION MIGRATION
-- File: C:\AuditDNA\backend\database\migrate_pii_hash.sql
-- Run against: auditdna_mortgage database
--
-- PURPOSE:
--   Hash all existing plain-text consumer_email values and
--   bucket all consumer_zip values already in the database.
--   Rename columns to reflect their protected state.
--
-- RUN ORDER:
--   1. Back up database FIRST (pg_dump)
--   2. Set HASH_SALT below to match your .env HASH_SALT value
--   3. Run this entire file in pgAdmin Query Tool
--   4. Verify row counts match before/after
--   5. Deploy updated intelligence.js
--
-- ⚠️  REPLACE 'YOUR_HASH_SALT_FROM_ENV' BELOW WITH YOUR
--     ACTUAL HASH_SALT VALUE FROM YOUR .env FILE BEFORE RUNNING
-- ============================================================

-- Enable pgcrypto for HMAC-SHA256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── STEP 0: COUNTS BEFORE (verify after) ─────────────────────
SELECT
  'lender_violations'  AS tbl,
  COUNT(*)             AS total_rows,
  COUNT(consumer_email) AS rows_with_email
FROM lender_violations
UNION ALL
SELECT
  'loan_sale_tracking',
  COUNT(*),
  COUNT(consumer_email)
FROM loan_sale_tracking;

-- ── STEP 1: ADD NEW HASHED/BUCKETED COLUMNS ──────────────────
ALTER TABLE lender_violations
  ADD COLUMN IF NOT EXISTS consumer_email_hash  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS consumer_zip_bucket  VARCHAR(6);

ALTER TABLE loan_sale_tracking
  ADD COLUMN IF NOT EXISTS consumer_email_hash  VARCHAR(64);

-- ── STEP 2: POPULATE — hash existing emails ──────────────────
-- ⚠️  Replace 'YOUR_HASH_SALT_FROM_ENV' with your actual HASH_SALT
UPDATE lender_violations
SET consumer_email_hash = ENCODE(
  HMAC(
    LOWER(TRIM(consumer_email)),
    'YOUR_HASH_SALT_FROM_ENV',
    'sha256'
  ), 'hex'
)
WHERE consumer_email IS NOT NULL
  AND consumer_email_hash IS NULL;

UPDATE loan_sale_tracking
SET consumer_email_hash = ENCODE(
  HMAC(
    LOWER(TRIM(consumer_email)),
    'YOUR_HASH_SALT_FROM_ENV',
    'sha256'
  ), 'hex'
)
WHERE consumer_email IS NOT NULL
  AND consumer_email_hash IS NULL;

-- ── STEP 3: POPULATE — bucket existing ZIPs ──────────────────
UPDATE lender_violations
SET consumer_zip_bucket = SUBSTRING(
  REGEXP_REPLACE(consumer_zip, '[^0-9]', '', 'g'), 1, 3
) || 'XX'
WHERE consumer_zip IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(consumer_zip, '[^0-9]', '', 'g')) >= 3
  AND consumer_zip_bucket IS NULL;

-- ── STEP 4: VERIFY hashes populated ─────────────────────────
SELECT
  'lender_violations'  AS tbl,
  COUNT(*)             AS total_rows,
  COUNT(consumer_email_hash) AS hashed_rows,
  COUNT(consumer_zip_bucket) AS bucketed_rows,
  COUNT(CASE WHEN consumer_email IS NOT NULL AND consumer_email_hash IS NULL THEN 1 END) AS missed
FROM lender_violations
UNION ALL
SELECT
  'loan_sale_tracking',
  COUNT(*),
  COUNT(consumer_email_hash),
  NULL,
  COUNT(CASE WHEN consumer_email IS NOT NULL AND consumer_email_hash IS NULL THEN 1 END)
FROM loan_sale_tracking;

-- ── STEP 5: DROP PLAIN-TEXT COLUMNS ──────────────────────────
-- Only run after verifying Step 4 shows missed = 0
ALTER TABLE lender_violations
  DROP COLUMN IF EXISTS consumer_email,
  DROP COLUMN IF EXISTS consumer_zip;

ALTER TABLE loan_sale_tracking
  DROP COLUMN IF EXISTS consumer_email;

-- ── STEP 6: ADD INDEXES ON HASHED COLUMNS ────────────────────
CREATE INDEX IF NOT EXISTS idx_lv_email_hash
  ON lender_violations(consumer_email_hash);

CREATE INDEX IF NOT EXISTS idx_lst_email_hash
  ON loan_sale_tracking(consumer_email_hash);

-- ── STEP 7: FINAL VERIFICATION ───────────────────────────────
-- Confirm plain-text columns are gone, hashed columns exist
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('lender_violations','loan_sale_tracking')
  AND column_name LIKE 'consumer_%'
ORDER BY table_name, column_name;

-- Expected result:
--   lender_violations   | consumer_email_hash | character varying | 64
--   lender_violations   | consumer_state      | character varying | 10
--   lender_violations   | consumer_zip_bucket | character varying |  6
--   loan_sale_tracking  | consumer_email_hash | character varying | 64
--   loan_sale_tracking  | consumer_state      | character varying | 10

-- ── STEP 8: LOG THE MIGRATION ────────────────────────────────
DO $$
BEGIN
  INSERT INTO audit_access_log
    (user_email, role, endpoint, outcome, attempted_at)
  VALUES
    ('system', 'migration', 'migrate_pii_hash.sql', 'GRANTED', NOW());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'audit_access_log not yet created — skipping log entry';
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- consumer_email is now hashed in both tables.
-- consumer_zip is now bucketed in lender_violations.
-- Plain-text columns dropped.
-- Deploy updated intelligence.js to complete the fix.
-- ============================================================