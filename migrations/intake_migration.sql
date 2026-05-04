-- ============================================================================
-- AUDITDNA INTAKE SYSTEM - DATABASE MIGRATION
-- Tables: intake_cases, intake_files, intake_id_verification,
--         intake_consent, intake_chain_log
-- Patent US2025-059 - Immutable Audit Database Schema
-- File: C:\AuditDNA\backend\migrations\intake_migration.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- intake_cases - top-level case record
-- One row per case, lifecycle = INTAKE_OPEN -> SUBMITTED -> PROCESSING -> CLOSED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intake_cases (
  case_id              VARCHAR(80)  PRIMARY KEY,
  mode                 VARCHAR(20)  NOT NULL,            -- 'spartan' | 'trojan'
  request_id           VARCHAR(80),
  service_code         VARCHAR(40),
  service_name         VARCHAR(200),
  category             VARCHAR(120),
  category_id          INTEGER,
  status               VARCHAR(40)  NOT NULL DEFAULT 'INTAKE_OPEN',
  path                 VARCHAR(20),                       -- 'escrow' | 'legal' | 'direct'
  counsel_opt_in       BOOLEAN,                           -- NULL = N/A, true/false otherwise
  state_legal_limit    INTEGER,
  estimated_recovery   NUMERIC(14,2),
  consumer_state       VARCHAR(2),
  consumer_email       VARCHAR(200),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  submitted_at         TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_intake_cases_status ON intake_cases(status);
CREATE INDEX IF NOT EXISTS idx_intake_cases_mode   ON intake_cases(mode);
CREATE INDEX IF NOT EXISTS idx_intake_cases_email  ON intake_cases(consumer_email);
CREATE INDEX IF NOT EXISTS idx_intake_cases_created ON intake_cases(created_at DESC);

-- ----------------------------------------------------------------------------
-- intake_files - uploaded documents (bytea content)
-- 25MB limit per file enforced in app layer; max 10 files per case
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intake_files (
  id              BIGSERIAL    PRIMARY KEY,
  case_id         VARCHAR(80)  NOT NULL REFERENCES intake_cases(case_id) ON DELETE CASCADE,
  original_name   VARCHAR(500),
  mime_type       VARCHAR(120),
  size_bytes      BIGINT,
  sha256          VARCHAR(64)  NOT NULL,
  client_hash     VARCHAR(64),
  hash_match      BOOLEAN,
  content         BYTEA,
  uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_files_case   ON intake_files(case_id);
CREATE INDEX IF NOT EXISTS idx_intake_files_sha256 ON intake_files(sha256);

-- ----------------------------------------------------------------------------
-- intake_id_verification - 1:1 with case
-- Government ID front + back (optional) + selfie + consumer info
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intake_id_verification (
  case_id              VARCHAR(80)  PRIMARY KEY REFERENCES intake_cases(case_id) ON DELETE CASCADE,
  full_name            VARCHAR(200),
  email                VARCHAR(200),
  phone                VARCHAR(40),
  state                VARCHAR(2),
  dob                  DATE,
  id_front_sha256      VARCHAR(64),
  id_front_content     BYTEA,
  id_front_size        BIGINT,
  id_back_sha256       VARCHAR(64),
  id_back_content      BYTEA,
  id_back_size         BIGINT,
  selfie_sha256        VARCHAR(64),
  selfie_content       BYTEA,
  selfie_size          BIGINT,
  verified_at          TIMESTAMPTZ,
  verification_status  VARCHAR(20) DEFAULT 'PENDING'      -- PENDING | VERIFIED | REJECTED | MANUAL_REVIEW
);

CREATE INDEX IF NOT EXISTS idx_intake_idv_email ON intake_id_verification(email);
CREATE INDEX IF NOT EXISTS idx_intake_idv_state ON intake_id_verification(state);

-- ----------------------------------------------------------------------------
-- intake_consent - 1:1 with case
-- 5 consent flags + e-signature (typed name) + consent hash + IP/UA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intake_consent (
  case_id          VARCHAR(80)  PRIMARY KEY REFERENCES intake_cases(case_id) ON DELETE CASCADE,
  cfpb_filing      BOOLEAN     NOT NULL DEFAULT FALSE,
  fund_reassign    BOOLEAN     NOT NULL DEFAULT FALSE,
  escrow_setup     BOOLEAN     NOT NULL DEFAULT FALSE,
  communications   BOOLEAN     NOT NULL DEFAULT FALSE,
  service_fee      BOOLEAN     NOT NULL DEFAULT FALSE,
  signed_name      VARCHAR(200),
  consent_hash     VARCHAR(64),
  user_agent       TEXT,
  ip_address       VARCHAR(80),
  signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- intake_chain_log - case-scoped hash chain (immutable audit trail)
-- One row per event: CASE_OPENED, FILE_UPLOADED, ID_VERIFIED, CONSENT_SIGNED,
--                    CASE_SUBMITTED, etc.
-- chain_hash = sha256(prev_hash || JSON({eventType, payload, ts}))
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intake_chain_log (
  id               BIGSERIAL    PRIMARY KEY,
  case_id          VARCHAR(80)  NOT NULL REFERENCES intake_cases(case_id) ON DELETE CASCADE,
  event_type       VARCHAR(40)  NOT NULL,
  prev_hash        VARCHAR(64)  NOT NULL,
  chain_hash       VARCHAR(64)  NOT NULL,
  payload_summary  TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_chain_case  ON intake_chain_log(case_id, id);
CREATE INDEX IF NOT EXISTS idx_intake_chain_event ON intake_chain_log(event_type);

-- ----------------------------------------------------------------------------
-- Verification queries (run manually after migration to confirm)
-- ----------------------------------------------------------------------------
-- SELECT 'intake_cases' AS t, COUNT(*) FROM intake_cases
-- UNION ALL SELECT 'intake_files', COUNT(*) FROM intake_files
-- UNION ALL SELECT 'intake_id_verification', COUNT(*) FROM intake_id_verification
-- UNION ALL SELECT 'intake_consent', COUNT(*) FROM intake_consent
-- UNION ALL SELECT 'intake_chain_log', COUNT(*) FROM intake_chain_log;
