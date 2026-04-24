-- ═══════════════════════════════════════════════════════════════════════════
-- SECURE BUYERS REGISTRY — PostgreSQL Schema
-- Mexausa Food Group, Inc. | AuditDNA Agriculture Intelligence
-- Save to: C:\AuditDNA\backend\sql\secure_buyers_schema.sql
-- Run with: psql "postgresql://postgres:auditdna2026@localhost:5432/auditdna" -f secure_buyers_schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- TABLE: secure_buyers  (PRIMARY master table)
-- Shared with UnifiedCRM via view + FK mirror, Deal Floor via buyer_id FK,
-- EmailMarketing via commodities_preferred tag index.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS secure_buyers (
  id                       SERIAL PRIMARY KEY,
  buyer_code               VARCHAR(32) UNIQUE,              -- BUYER-US-CA-0001 (generated on approval)
  registration_status      VARCHAR(20) DEFAULT 'pending',   -- pending | approved | suspended | banned
  tier                     VARCHAR(2),                      -- A | B | C | D (SI assigned)

  -- Identity
  legal_name               VARCHAR(255) NOT NULL,
  dba                      VARCHAR(255),
  country                  VARCHAR(3) NOT NULL,             -- MX, US, PE, CL, CO, GT, EC, CR, DO
  state_province           VARCHAR(100),
  city                     VARCHAR(100),
  address_line1            VARCHAR(255),
  address_line2            VARCHAR(255),
  postal_code              VARCHAR(20),
  website                  VARCHAR(255),
  year_established         INTEGER,
  business_type            VARCHAR(50),                     -- wholesale | chain_retail | foodservice | terminal_market | repacker | broker | processor | ethnic_market

  -- Regional IDs (nullable, only fills for that country)
  -- USA
  fein                     VARCHAR(20),                     -- Federal Tax ID
  duns_number              VARCHAR(15),                     -- Dun & Bradstreet
  paca_license             VARCHAR(50),
  state_license            VARCHAR(50),
  sales_tax_id             VARCHAR(50),

  -- Mexico
  rfc                      VARCHAR(20),
  agace_caat               VARCHAR(50),
  senasica_permit          VARCHAR(50),
  padron_importadores      VARCHAR(50),
  customs_broker_patente   VARCHAR(50),

  -- Peru
  ruc_peru                 VARCHAR(20),
  senasa_peru_permit       VARCHAR(50),
  adex_member              BOOLEAN DEFAULT FALSE,

  -- Chile
  rut_empresa              VARCHAR(20),
  sag_permit               VARCHAR(50),

  -- Colombia
  nit_colombia             VARCHAR(20),
  ica_import_permit        VARCHAR(50),

  -- Credit & Financial
  credit_tier              VARCHAR(2),                      -- A | B | C | D (same as tier, denormalized for speed)
  credit_limit_usd         NUMERIC(12,2) DEFAULT 0,
  credit_limit_available   NUMERIC(12,2) DEFAULT 0,
  credit_limit_used        NUMERIC(12,2) DEFAULT 0,
  payment_terms_requested  VARCHAR(20),                     -- net7 | net14 | net21 | net30 | net45
  payment_terms_approved   VARCHAR(20),
  paca_trust_eligible      BOOLEAN DEFAULT FALSE,

  -- Performance
  volume_ytd_usd           NUMERIC(14,2) DEFAULT 0,
  deals_completed_count    INTEGER DEFAULT 0,
  deals_disputed_count     INTEGER DEFAULT 0,
  avg_days_to_pay          NUMERIC(5,2),

  -- Preferences (JSONB for flexibility)
  commodities_preferred    JSONB DEFAULT '[]'::jsonb,       -- [{commodity, annual_volume_usd, seasonality}]
  regions_served           JSONB DEFAULT '[]'::jsonb,       -- ['CA','TX','FL','NM']
  cold_chain_capability    JSONB DEFAULT '{}'::jsonb,       -- {temp_controlled, cross_dock, 3pl_partners}

  -- Risk
  risk_flags               JSONB DEFAULT '[]'::jsonb,       -- [{flag, severity, raised_by, raised_at}]
  certification_expirations JSONB DEFAULT '{}'::jsonb,      -- {cert_name: expiry_date}

  -- Ownership / audit
  tenant_assigned_rep      VARCHAR(100),                    -- Pablo | Gibran | Ozzy | Ariel
  created_by_user_id       INTEGER,                         -- FK to auth_users.id (who initiated)
  approved_by_user_id      INTEGER,                         -- FK to auth_users.id (who approved)
  created_at               TIMESTAMP DEFAULT NOW(),
  approved_at              TIMESTAMP,
  suspended_at             TIMESTAMP,
  last_activity_at         TIMESTAMP DEFAULT NOW(),
  updated_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sb_country        ON secure_buyers(country);
CREATE INDEX IF NOT EXISTS idx_sb_status         ON secure_buyers(registration_status);
CREATE INDEX IF NOT EXISTS idx_sb_tier           ON secure_buyers(credit_tier);
CREATE INDEX IF NOT EXISTS idx_sb_buyer_code     ON secure_buyers(buyer_code);
CREATE INDEX IF NOT EXISTS idx_sb_commodities    ON secure_buyers USING GIN (commodities_preferred);
CREATE INDEX IF NOT EXISTS idx_sb_legal_name     ON secure_buyers(legal_name);

-- ──────────────────────────────────────────────────────────────────────────
-- TABLE: buyer_contacts
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_contacts (
  id                SERIAL PRIMARY KEY,
  buyer_id          INTEGER REFERENCES secure_buyers(id) ON DELETE CASCADE,
  role              VARCHAR(30) NOT NULL,                   -- principal | credit | ap | logistics | compliance
  full_name         VARCHAR(150),
  title             VARCHAR(100),
  email             VARCHAR(150),
  phone             VARCHAR(40),
  whatsapp          VARCHAR(40),
  is_signatory      BOOLEAN DEFAULT FALSE,
  preferred_language VARCHAR(2) DEFAULT 'EN',               -- EN | ES | PT
  created_at        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bc_buyer ON buyer_contacts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bc_email ON buyer_contacts(email);

-- ──────────────────────────────────────────────────────────────────────────
-- TABLE: buyer_documents
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_documents (
  id                SERIAL PRIMARY KEY,
  buyer_id          INTEGER REFERENCES secure_buyers(id) ON DELETE CASCADE,
  doc_type          VARCHAR(50) NOT NULL,                   -- w9, paca, coi, rfc, acta_constitutiva, ruc, senasa, fsma204, etc.
  filename          VARCHAR(255),
  file_url          VARCHAR(500),                           -- S3/Railway volume path
  file_size_bytes   BIGINT,
  mime_type         VARCHAR(100),
  file_hash_sha256  VARCHAR(64),                            -- tamper detection
  issue_date        DATE,
  expiration_date   DATE,
  verified          BOOLEAN DEFAULT FALSE,
  verified_by       VARCHAR(100),
  verified_at       TIMESTAMP,
  uploaded_at       TIMESTAMP DEFAULT NOW(),
  notes             TEXT
);
CREATE INDEX IF NOT EXISTS idx_bd_buyer ON buyer_documents(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bd_expir ON buyer_documents(expiration_date) WHERE expiration_date IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- TABLE: buyer_trade_refs
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_trade_refs (
  id                   SERIAL PRIMARY KEY,
  buyer_id             INTEGER REFERENCES secure_buyers(id) ON DELETE CASCADE,
  ref_type             VARCHAR(20),                         -- supplier | bank
  company_name         VARCHAR(200),
  contact_name         VARCHAR(150),
  contact_email        VARCHAR(150),
  contact_phone        VARCHAR(40),
  years_relationship   INTEGER,
  credit_limit_reported NUMERIC(12,2),
  payment_terms_reported VARCHAR(20),
  rating_notes         TEXT,                                -- positive | negative | neutral + notes
  verified             BOOLEAN DEFAULT FALSE,
  verified_at          TIMESTAMP,
  created_at           TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_btr_buyer ON buyer_trade_refs(buyer_id);

-- ──────────────────────────────────────────────────────────────────────────
-- TABLE: buyer_credit_events
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_credit_events (
  id              SERIAL PRIMARY KEY,
  buyer_id        INTEGER REFERENCES secure_buyers(id) ON DELETE CASCADE,
  event_type      VARCHAR(40),                              -- limit_set | limit_change | payment_delay | default | dispute | tier_change
  amount_usd      NUMERIC(12,2),
  previous_value  VARCHAR(100),
  new_value       VARCHAR(100),
  triggered_by    VARCHAR(40),                              -- SI_AUTO | saul | pablo | cron | deal_close
  ai_rationale    TEXT,                                     -- if SI auto-set, what reasoning
  deal_channel_id INTEGER,                                  -- FK to deals channels if related
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bce_buyer ON buyer_credit_events(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bce_when  ON buyer_credit_events(created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- TABLE: buyer_deals  (cross-link to deal-floor channels)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_deals (
  id                  SERIAL PRIMARY KEY,
  buyer_id            INTEGER REFERENCES secure_buyers(id) ON DELETE CASCADE,
  deal_channel_id     INTEGER,                              -- FK to deals table (deal-floor)
  role_in_deal        VARCHAR(20) DEFAULT 'buyer',          -- buyer | co_buyer | observer
  status              VARCHAR(30),                          -- open | won | lost | disputed | settled
  amount_usd          NUMERIC(12,2),
  commodity           VARCHAR(100),
  payment_terms       VARCHAR(20),
  days_to_pay_actual  INTEGER,
  paid_on_time        BOOLEAN,
  created_at          TIMESTAMP DEFAULT NOW(),
  settled_at          TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bd2_buyer ON buyer_deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bd2_deal  ON buyer_deals(deal_channel_id);

-- ──────────────────────────────────────────────────────────────────────────
-- VIEW: v_secure_buyers_public  (anonymous-safe, for non-owner roles)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_secure_buyers_public AS
SELECT
  id,
  buyer_code,
  registration_status,
  credit_tier,
  country,
  state_province,
  business_type,
  commodities_preferred,
  regions_served,
  volume_ytd_usd,
  deals_completed_count,
  credit_limit_usd,
  last_activity_at,
  created_at
FROM secure_buyers
WHERE registration_status = 'approved';

-- ──────────────────────────────────────────────────────────────────────────
-- VIEW: v_crm_buyer_alias  (lets UnifiedCRM see secure buyers as contacts)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_crm_buyer_alias AS
SELECT
  'sb_' || sb.id::text              AS id,
  sb.legal_name                     AS company_name,
  bc.full_name                      AS contact_name,
  bc.title                          AS contact_title,
  bc.email                          AS email,
  bc.phone                          AS phone,
  sb.country                        AS country_code,
  sb.state_province                 AS state,
  sb.city                           AS municipality,
  'distribution'                    AS industry,
  CASE sb.registration_status
    WHEN 'approved'  THEN 'converted'
    WHEN 'pending'   THEN 'warm'
    WHEN 'suspended' THEN 'cold'
    ELSE 'new'
  END                               AS lead_status,
  sb.buyer_code                     AS senasica_id,
  sb.updated_at                     AS updated_at,
  'SECURE_BUYER'                    AS source_type
FROM secure_buyers sb
LEFT JOIN buyer_contacts bc
  ON bc.buyer_id = sb.id AND bc.role = 'principal';

-- ──────────────────────────────────────────────────────────────────────────
-- FUNCTION: generate_buyer_code(country, state)
-- Produces BUYER-XX-YY-NNNN on approval
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_buyer_code(p_country VARCHAR, p_state VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix      VARCHAR := 'BUYER-' || UPPER(COALESCE(p_country,'XX')) || '-' || UPPER(COALESCE(LEFT(p_state,2),'XX')) || '-';
  v_next_num    INTEGER;
  v_existing    INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(buyer_code, '-', 4) AS INTEGER)), 0) + 1
    INTO v_next_num
    FROM secure_buyers
    WHERE buyer_code LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- SEED: example test buyer (delete before production)
-- ──────────────────────────────────────────────────────────────────────────
-- INSERT INTO secure_buyers (legal_name, country, state_province, city, business_type, registration_status)
-- VALUES ('Test Buyer Corp', 'US', 'CA', 'Los Angeles', 'wholesale', 'pending');

COMMIT;

-- Verify
SELECT 'secure_buyers' AS table_name, COUNT(*) AS rows FROM secure_buyers
UNION ALL SELECT 'buyer_contacts', COUNT(*) FROM buyer_contacts
UNION ALL SELECT 'buyer_documents', COUNT(*) FROM buyer_documents
UNION ALL SELECT 'buyer_trade_refs', COUNT(*) FROM buyer_trade_refs
UNION ALL SELECT 'buyer_credit_events', COUNT(*) FROM buyer_credit_events
UNION ALL SELECT 'buyer_deals', COUNT(*) FROM buyer_deals;