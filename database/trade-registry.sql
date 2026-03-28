-- ============================================================
-- TRADE REGISTRY — Universal Entity Database
-- Growers, Packers, Shippers, Buyers, Brokers, Importers, Exporters
-- Agriculture, Beverages, Alcohol, Seafood, Poultry, Dairy
-- Run: $env:PGPASSWORD='auditdna2026'
--   psql -h localhost -p 5432 -U postgres -d auditdna -f "C:/AuditDNA/backend/database/002_trade_registry.sql"
-- Save to: C:\AuditDNA\backend\database\002_trade_registry.sql
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS trade_registry (
  id                  SERIAL PRIMARY KEY,
  entity_id           VARCHAR(50) UNIQUE NOT NULL,
  entity_type         VARCHAR(30) NOT NULL DEFAULT 'grower',
  trade_category      VARCHAR(50) DEFAULT 'agriculture',
  first_name          VARCHAR(255) NOT NULL,
  last_name           VARCHAR(255) DEFAULT '',
  email               VARCHAR(255) UNIQUE NOT NULL,
  phone               VARCHAR(50) DEFAULT '',
  company_name        VARCHAR(255) DEFAULT '',
  city                VARCHAR(100) DEFAULT '',
  state_region        VARCHAR(100) DEFAULT '',
  country             VARCHAR(100) NOT NULL DEFAULT 'Mexico',
  address             VARCHAR(500),
  gps_lat             NUMERIC(10,7),
  gps_lng             NUMERIC(10,7),
  commodities         TEXT DEFAULT '',
  quantities          TEXT DEFAULT '',
  packaging           TEXT DEFAULT '',
  certifications      TEXT DEFAULT '',
  preferred_poes      TEXT[],
  shipping_methods    TEXT[],
  transport_partners  TEXT[],
  license_number      VARCHAR(100),
  tax_id              VARCHAR(100),
  website             VARCHAR(255),
  password_hash       VARCHAR(255),
  pin_hash            VARCHAR(255),
  compliance_status   VARCHAR(20) DEFAULT 'pending',
  grs_score           NUMERIC(5,2) DEFAULT 0,
  risk_tier           VARCHAR(10) DEFAULT 'T3',
  id_verified         BOOLEAN DEFAULT false,
  docs_complete       BOOLEAN DEFAULT false,
  role                VARCHAR(20) DEFAULT 'entity',
  status              VARCHAR(20) DEFAULT 'active',
  source              VARCHAR(50) DEFAULT 'manual',
  notes               TEXT,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tr_email ON trade_registry(email);
CREATE INDEX IF NOT EXISTS idx_tr_entity_id ON trade_registry(entity_id);
CREATE INDEX IF NOT EXISTS idx_tr_type ON trade_registry(entity_type);
CREATE INDEX IF NOT EXISTS idx_tr_category ON trade_registry(trade_category);
CREATE INDEX IF NOT EXISTS idx_tr_country ON trade_registry(country);
CREATE INDEX IF NOT EXISTS idx_tr_state ON trade_registry(state_region);
CREATE INDEX IF NOT EXISTS idx_tr_status ON trade_registry(status);
CREATE INDEX IF NOT EXISTS idx_tr_commodity ON trade_registry USING gin(to_tsvector('english', commodities));

-- Trade documents (shared with grower_documents pattern)
CREATE TABLE IF NOT EXISTS trade_documents (
  id              SERIAL PRIMARY KEY,
  entity_id       INTEGER REFERENCES trade_registry(id) ON DELETE CASCADE,
  doc_type        VARCHAR(50) NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  file_path       VARCHAR(500) NOT NULL,
  file_size       INTEGER,
  mime_type       VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'uploaded',
  reviewed_by     VARCHAR(100),
  reviewed_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tdoc_entity ON trade_documents(entity_id);

-- Trade financials (shared pattern)
CREATE TABLE IF NOT EXISTS trade_financials (
  id                SERIAL PRIMARY KEY,
  entity_id         INTEGER REFERENCES trade_registry(id) ON DELETE CASCADE,
  counterpart_id    INTEGER REFERENCES trade_registry(id),
  type              VARCHAR(30) NOT NULL,
  reference_number  VARCHAR(100),
  amount            NUMERIC(12,2) DEFAULT 0,
  currency          VARCHAR(3) DEFAULT 'USD',
  status            VARCHAR(20) DEFAULT 'draft',
  commodity         VARCHAR(100),
  quantity          VARCHAR(100),
  unit_price        NUMERIC(10,2),
  terms             VARCHAR(100),
  due_date          DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tfin_entity ON trade_financials(entity_id);
CREATE INDEX IF NOT EXISTS idx_tfin_type ON trade_financials(type);

-- Trigger
CREATE OR REPLACE FUNCTION update_trade_timestamp()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tr_updated ON trade_registry;
CREATE TRIGGER trg_tr_updated BEFORE UPDATE ON trade_registry FOR EACH ROW EXECUTE FUNCTION update_trade_timestamp();
DROP TRIGGER IF EXISTS trg_tfin_updated ON trade_financials;
CREATE TRIGGER trg_tfin_updated BEFORE UPDATE ON trade_financials FOR EACH ROW EXECUTE FUNCTION update_trade_timestamp();

-- ============================================================
-- SEED FROM EXISTING TABLES
-- Pull growers, buyers, shippers into trade_registry
-- ============================================================

-- Seed from grower_profiles (14 records)
INSERT INTO trade_registry (entity_id, entity_type, trade_category, first_name, last_name, email, phone, company_name, city, state_region, country, commodities, certifications, compliance_status, grs_score, risk_tier, id_verified, docs_complete, password_hash, pin_hash, status, source)
SELECT
  'TR-GRW-' || id, 'grower', 'agriculture',
  first_name, last_name, email, phone, company_name, city, state_region, country,
  commodities, certifications, compliance_status, grs_score, risk_tier, id_verified, docs_complete,
  password_hash, pin_hash, status, 'grower_profiles'
FROM grower_profiles
ON CONFLICT (email) DO NOTHING;

-- Seed from growers table (CRM contacts)
INSERT INTO trade_registry (entity_id, entity_type, trade_category, first_name, last_name, email, phone, company_name, city, state_region, country, commodities, certifications, status, source)
SELECT
  'TR-CG-' || id, 'grower', 'agriculture',
  COALESCE(first_name, split_part(COALESCE(name, company_name, ''), ' ', 1), ''),
  COALESCE(last_name, ''),
  COALESCE(email, email_address, 'no-email-' || id || '@placeholder.com'),
  COALESCE(phone, mobile, telephone, ''),
  COALESCE(company_name, company, name, ''),
  COALESCE(city, ''),
  COALESCE(state_region, state, municipio, ''),
  COALESCE(country, 'Mexico'),
  COALESCE(product_specialties, commodities, ''),
  COALESCE(certifications, ''),
  'active', 'crm_growers'
FROM growers
WHERE email IS NOT NULL AND email != ''
ON CONFLICT (email) DO NOTHING;

-- Seed from buyers table
INSERT INTO trade_registry (entity_id, entity_type, trade_category, first_name, last_name, email, phone, company_name, city, state_region, country, commodities, status, source)
SELECT
  'TR-BUY-' || id, 'buyer', 'agriculture',
  COALESCE(first_name, split_part(COALESCE(name, company_name, ''), ' ', 1), ''),
  COALESCE(last_name, ''),
  COALESCE(email, email_address, 'no-email-b' || id || '@placeholder.com'),
  COALESCE(phone, mobile, telephone, ''),
  COALESCE(company_name, company, name, ''),
  COALESCE(city, ''),
  COALESCE(state_region, state, ''),
  COALESCE(country, 'USA'),
  COALESCE(product_specialties, commodities_purchased, ''),
  'active', 'crm_buyers'
FROM buyers
WHERE email IS NOT NULL AND email != ''
ON CONFLICT (email) DO NOTHING;

-- Seed from shipper_contacts table
INSERT INTO trade_registry (entity_id, entity_type, trade_category, first_name, last_name, email, phone, company_name, city, state_region, country, status, source)
SELECT
  'TR-SHP-' || id, 'shipper', 'logistics',
  COALESCE(first_name, split_part(COALESCE(name, company_name, ''), ' ', 1), ''),
  COALESCE(last_name, ''),
  COALESCE(email, email_address, 'no-email-s' || id || '@placeholder.com'),
  COALESCE(phone, mobile, telephone, ''),
  COALESCE(company_name, company, name, ''),
  COALESCE(city, ''),
  COALESCE(state_region, state, ''),
  COALESCE(country, 'Mexico'),
  'active', 'crm_shippers'
FROM shipper_contacts
WHERE email IS NOT NULL AND email != ''
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_trade_directory AS
SELECT id, entity_id, entity_type, trade_category, first_name, last_name, email, phone, company_name, city, state_region, country, commodities, certifications, compliance_status, grs_score, risk_tier, status, source, created_at
FROM trade_registry WHERE status != 'deleted'
ORDER BY entity_type, grs_score DESC;

CREATE OR REPLACE VIEW v_trade_by_type AS
SELECT entity_type, trade_category, COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active') AS active,
  COUNT(*) FILTER (WHERE compliance_status = 'approved') AS compliant
FROM trade_registry WHERE status != 'deleted'
GROUP BY entity_type, trade_category
ORDER BY total DESC;

COMMIT;

-- Verify
SELECT entity_type, trade_category, COUNT(*) AS count FROM trade_registry GROUP BY entity_type, trade_category ORDER BY count DESC;
SELECT 'trade_registry' AS tbl, COUNT(*) AS rows FROM trade_registry
UNION ALL SELECT 'trade_documents', COUNT(*) FROM trade_documents
UNION ALL SELECT 'trade_financials', COUNT(*) FROM trade_financials;