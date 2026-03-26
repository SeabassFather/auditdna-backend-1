-- ════════════════════════════════════════════════════════════════════════════
-- GROWER PIPELINE — PostgreSQL Migration v1.0
-- Save to: C:\AuditDNA\backend\database\grower_profiles.sql
-- Run:     $env:PGPASSWORD='<pw>'; psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f "C:\AuditDNA\backend\database\grower_profiles.sql"
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. GROWER PROFILES — core registration + credentials + compliance
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grower_profiles (
  id                SERIAL PRIMARY KEY,

  -- Identity
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100),
  email             VARCHAR(255) UNIQUE NOT NULL,
  phone             VARCHAR(50),
  company_name      VARCHAR(255),

  -- Credentials (bcrypt12)
  password_hash     VARCHAR(255) NOT NULL,
  pin_hash          VARCHAR(255),

  -- Farm details
  city              VARCHAR(100),
  state_region      VARCHAR(100),
  country           VARCHAR(100) DEFAULT 'Mexico',
  commodities       TEXT,                          -- comma-separated
  quantities        VARCHAR(255),
  packaging         VARCHAR(255),
  certifications    TEXT,                          -- comma-separated cert names
  harvest_start     DATE,
  harvest_end       DATE,

  -- Compliance / vetting
  compliance_status VARCHAR(50) DEFAULT 'pending', -- pending | submitted | under_review | approved | rejected
  grs_score         INTEGER DEFAULT 0,             -- Grower Reliability Score 0-100
  risk_tier         VARCHAR(10) DEFAULT 'T3',      -- T0 (vetted) .. T3 (unvetted)

  -- Document flags
  id_verified       BOOLEAN DEFAULT FALSE,
  docs_complete     BOOLEAN DEFAULT FALSE,

  -- Role / access
  role              VARCHAR(50) DEFAULT 'grower',
  status            VARCHAR(20) DEFAULT 'active',  -- active | suspended | deactivated

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  last_login        TIMESTAMPTZ,

  -- Link to legacy growers table (if migrated)
  legacy_grower_id  INTEGER
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. GROWER DOCUMENTS — uploaded files for vetting pipeline
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grower_documents (
  id                SERIAL PRIMARY KEY,
  grower_id         INTEGER NOT NULL REFERENCES grower_profiles(id) ON DELETE CASCADE,

  doc_type          VARCHAR(50) NOT NULL,
  -- Valid doc_types:
  --   id_photo           — government-issued ID / passport
  --   corporate_id       — RFC / tax ID / business registration
  --   phytosanitary      — phytosanitary certificate
  --   organic_cert       — USDA Organic / equivalent
  --   globalgap          — GlobalGAP certificate
  --   gmp_cert           — GMP / HACCP
  --   fsma_attestation   — FSMA 204 food safety attestation
  --   export_license     — export permit / SRE
  --   lab_results        — lab analysis / residue testing
  --   other              — miscellaneous

  file_name         VARCHAR(255) NOT NULL,
  file_path         VARCHAR(500) NOT NULL,
  file_size         INTEGER,
  mime_type         VARCHAR(100),

  status            VARCHAR(30) DEFAULT 'uploaded', -- uploaded | under_review | approved | rejected
  reviewed_by       VARCHAR(100),
  reviewed_at       TIMESTAMPTZ,
  notes             TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. GROWER FINANCIALS — PO / invoice / factoring bridge
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grower_financials (
  id                SERIAL PRIMARY KEY,
  grower_id         INTEGER NOT NULL REFERENCES grower_profiles(id) ON DELETE CASCADE,

  type              VARCHAR(50) NOT NULL,
  -- Valid types:
  --   purchase_order      — PO issued to grower
  --   invoice             — grower invoice to CM Products
  --   factoring_agreement — factoring / financing agreement
  --   payment             — payment record
  --   credit_note         — credit / debit adjustment

  reference_number  VARCHAR(100),
  amount            DECIMAL(12,2),
  currency          VARCHAR(10) DEFAULT 'USD',
  status            VARCHAR(30) DEFAULT 'draft',   -- draft | issued | pending | approved | paid | overdue | cancelled
  buyer_id          INTEGER,                       -- links to buyers table
  commodity         VARCHAR(255),
  quantity          VARCHAR(100),
  unit_price        DECIMAL(10,2),
  terms             VARCHAR(255),                  -- NET30, COD, CIA, etc.
  due_date          DATE,
  paid_date         DATE,
  notes             TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. INDEXES
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gp_email       ON grower_profiles(email);
CREATE INDEX IF NOT EXISTS idx_gp_compliance  ON grower_profiles(compliance_status);
CREATE INDEX IF NOT EXISTS idx_gp_country     ON grower_profiles(country);
CREATE INDEX IF NOT EXISTS idx_gp_risk_tier   ON grower_profiles(risk_tier);
CREATE INDEX IF NOT EXISTS idx_gd_grower      ON grower_documents(grower_id);
CREATE INDEX IF NOT EXISTS idx_gd_type        ON grower_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_gf_grower      ON grower_financials(grower_id);
CREATE INDEX IF NOT EXISTS idx_gf_type        ON grower_financials(type);
CREATE INDEX IF NOT EXISTS idx_gf_status      ON grower_financials(status);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. UPDATED_AT TRIGGER — auto-touch on UPDATE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_updated ON grower_profiles;
CREATE TRIGGER trg_gp_updated BEFORE UPDATE ON grower_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_gf_updated ON grower_financials;
CREATE TRIGGER trg_gf_updated BEFORE UPDATE ON grower_financials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. COMPLIANCE VIEW — quick dashboard query
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_grower_compliance AS
SELECT
  gp.id,
  gp.first_name || ' ' || COALESCE(gp.last_name, '') AS full_name,
  gp.email,
  gp.company_name,
  gp.commodities,
  gp.compliance_status,
  gp.grs_score,
  gp.risk_tier,
  gp.id_verified,
  gp.docs_complete,
  gp.created_at,
  COUNT(gd.id) FILTER (WHERE gd.status = 'approved')  AS docs_approved,
  COUNT(gd.id) FILTER (WHERE gd.status = 'uploaded')   AS docs_pending,
  COUNT(gd.id) FILTER (WHERE gd.status = 'rejected')   AS docs_rejected,
  COUNT(gd.id)                                          AS docs_total
FROM grower_profiles gp
LEFT JOIN grower_documents gd ON gd.grower_id = gp.id
GROUP BY gp.id;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. FINANCIAL SUMMARY VIEW
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_grower_financial_summary AS
SELECT
  gp.id AS grower_id,
  gp.first_name || ' ' || COALESCE(gp.last_name, '') AS full_name,
  gp.company_name,
  COUNT(gf.id) FILTER (WHERE gf.type = 'purchase_order')       AS total_pos,
  COUNT(gf.id) FILTER (WHERE gf.type = 'invoice')              AS total_invoices,
  COUNT(gf.id) FILTER (WHERE gf.type = 'payment')              AS total_payments,
  COALESCE(SUM(gf.amount) FILTER (WHERE gf.type = 'purchase_order'), 0) AS po_value,
  COALESCE(SUM(gf.amount) FILTER (WHERE gf.type = 'invoice'), 0)       AS invoice_value,
  COALESCE(SUM(gf.amount) FILTER (WHERE gf.type = 'payment'), 0)       AS paid_value,
  COALESCE(SUM(gf.amount) FILTER (WHERE gf.status = 'overdue'), 0)     AS overdue_value
FROM grower_profiles gp
LEFT JOIN grower_financials gf ON gf.grower_id = gp.id
GROUP BY gp.id, gp.first_name, gp.last_name, gp.company_name;

-- ════════════════════════════════════════════════════════════════════════════
-- DONE — 3 tables, 9 indexes, 2 triggers, 2 views
-- ════════════════════════════════════════════════════════════════════════════