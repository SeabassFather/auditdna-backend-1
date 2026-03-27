-- ============================================================================
-- GROWER PIPELINE PHASE 2 - Product Market + Finance Terms
-- Save to: C:\AuditDNA\backend\database\grower_market.sql
-- Run:     cd C:\AuditDNA\backend
--          $env:PGHOST='localhost'; $env:PGPORT='5432'; $env:PGPASSWORD='auditdna2026'
--          psql -U postgres -d auditdna -f "C:\AuditDNA\backend\database\grower_market.sql"
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GROWER TERMS ACCEPTANCE - legal agreement for PO/factoring/PACA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grower_terms (
  id                SERIAL PRIMARY KEY,
  grower_id         INTEGER NOT NULL REFERENCES grower_profiles(id) ON DELETE CASCADE,
  terms_version     VARCHAR(20) NOT NULL DEFAULT '1.0',

  -- What they accepted
  po_fee_pct        DECIMAL(5,2) DEFAULT 3.00,       -- purchase order fee %
  factoring_fee_pct DECIMAL(5,2) DEFAULT 3.00,       -- factoring fee %
  advance_pct       DECIMAL(5,2) DEFAULT 83.00,      -- advance % from finance company
  balance_pct       DECIMAL(5,2) DEFAULT 17.00,      -- remaining % after delivery
  billing_basis     VARCHAR(50) DEFAULT 'per_transaction', -- per_transaction | monthly_volume
  currency          VARCHAR(10) DEFAULT 'USD',

  -- PACA acknowledgment
  paca_acknowledged BOOLEAN DEFAULT FALSE,
  buyer_entity      VARCHAR(255) DEFAULT 'CM Products Group, LLC.',
  buyer_paca_license VARCHAR(100),

  -- Quality requirements acknowledged
  water_testing_required   BOOLEAN DEFAULT TRUE,
  soil_testing_required    BOOLEAN DEFAULT TRUE,
  fertilizer_analysis_required BOOLEAN DEFAULT TRUE,
  seed_germination_required    BOOLEAN DEFAULT TRUE,
  food_safety_origin_required  BOOLEAN DEFAULT TRUE,

  -- Acceptance
  accepted          BOOLEAN DEFAULT FALSE,
  accepted_at       TIMESTAMPTZ,
  accepted_ip       VARCHAR(45),
  digital_signature TEXT,              -- base64 signature or typed name

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. PRODUCT SUBMISSIONS - grower submits available product for market
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_submissions (
  id                SERIAL PRIMARY KEY,
  grower_id         INTEGER NOT NULL REFERENCES grower_profiles(id) ON DELETE CASCADE,

  -- Product details
  commodity         VARCHAR(255) NOT NULL,
  variety           VARCHAR(255),
  origin_region     VARCHAR(255),
  origin_country    VARCHAR(100) DEFAULT 'Mexico',

  -- Quantity + packaging
  quantity          VARCHAR(100),                   -- e.g. "500 pallets/week"
  unit              VARCHAR(50),                    -- pallets | cartons | lbs | kg
  packaging         VARCHAR(255),                   -- "25lb carton", "8x1lb flat"
  pack_size         VARCHAR(100),

  -- Season / availability
  available_from    DATE,
  available_to      DATE,
  delivery_frequency VARCHAR(100),                  -- weekly | biweekly | monthly | spot

  -- Pricing
  fob_price         DECIMAL(10,2),
  price_unit        VARCHAR(50) DEFAULT 'per_case', -- per_case | per_lb | per_kg | per_pallet
  price_negotiable  BOOLEAN DEFAULT TRUE,

  -- Quality / food safety
  certifications    TEXT,                           -- comma-separated
  organic           BOOLEAN DEFAULT FALSE,
  globalgap         BOOLEAN DEFAULT FALSE,
  primus_gfs        BOOLEAN DEFAULT FALSE,

  -- Testing IDs (link to grower_documents)
  water_test_doc_id       INTEGER REFERENCES grower_documents(id),
  soil_test_doc_id        INTEGER REFERENCES grower_documents(id),
  fertilizer_test_doc_id  INTEGER REFERENCES grower_documents(id),
  seed_germ_doc_id        INTEGER REFERENCES grower_documents(id),

  -- Status
  status            VARCHAR(30) DEFAULT 'submitted', -- submitted | approved | listed | matched | sold | expired
  approved_by       VARCHAR(100),
  approved_at       TIMESTAMPTZ,
  listed_at         TIMESTAMPTZ,                     -- when it hit the calendar

  -- Match tracking
  buyers_matched    INTEGER DEFAULT 0,
  offers_sent       INTEGER DEFAULT 0,
  last_offered_at   TIMESTAMPTZ,

  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. MARKET OFFERS - generated offers sent to matched buyers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_offers (
  id                SERIAL PRIMARY KEY,
  submission_id     INTEGER NOT NULL REFERENCES product_submissions(id) ON DELETE CASCADE,
  grower_id         INTEGER NOT NULL REFERENCES grower_profiles(id) ON DELETE CASCADE,
  buyer_id          INTEGER,                        -- from buyers table
  buyer_email       VARCHAR(255),
  buyer_name        VARCHAR(255),
  buyer_company     VARCHAR(255),

  -- Offer details
  commodity         VARCHAR(255),
  quantity_offered  VARCHAR(100),
  fob_price         DECIMAL(10,2),
  delivery_window   VARCHAR(255),                   -- "Mar 15 - Apr 30"

  -- Email
  email_subject     TEXT,
  email_body        TEXT,
  email_status      VARCHAR(30) DEFAULT 'draft',    -- draft | queued | sent | opened | replied
  sent_at           TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ,

  -- Response
  buyer_response    VARCHAR(30),                    -- interested | declined | counter | no_response
  counter_price     DECIMAL(10,2),
  counter_quantity  VARCHAR(100),
  response_notes    TEXT,

  -- Finance bridge
  po_id             INTEGER REFERENCES grower_financials(id),
  factoring_id      INTEGER REFERENCES grower_financials(id),

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. GROWER TESTING REQUIREMENTS - per product, per season
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grower_testing (
  id                SERIAL PRIMARY KEY,
  grower_id         INTEGER NOT NULL REFERENCES grower_profiles(id) ON DELETE CASCADE,
  submission_id     INTEGER REFERENCES product_submissions(id),

  test_type         VARCHAR(50) NOT NULL,           -- water | soil | fertilizer | seed_germination | pesticide_residue
  commodity         VARCHAR(255),
  season            VARCHAR(50),                    -- spring2026, fall2026, etc.

  -- Results
  doc_id            INTEGER REFERENCES grower_documents(id),
  lab_name          VARCHAR(255),
  test_date         DATE,
  expiry_date       DATE,
  result_summary    TEXT,
  pass_fail         VARCHAR(10),                    -- pass | fail | conditional

  status            VARCHAR(30) DEFAULT 'pending',  -- pending | uploaded | reviewed | approved | expired
  reviewed_by       VARCHAR(100),
  reviewed_at       TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gt_grower      ON grower_terms(grower_id);
CREATE INDEX IF NOT EXISTS idx_ps_grower      ON product_submissions(grower_id);
CREATE INDEX IF NOT EXISTS idx_ps_commodity   ON product_submissions(commodity);
CREATE INDEX IF NOT EXISTS idx_ps_status      ON product_submissions(status);
CREATE INDEX IF NOT EXISTS idx_ps_available   ON product_submissions(available_from, available_to);
CREATE INDEX IF NOT EXISTS idx_mo_submission  ON market_offers(submission_id);
CREATE INDEX IF NOT EXISTS idx_mo_buyer       ON market_offers(buyer_email);
CREATE INDEX IF NOT EXISTS idx_mo_status      ON market_offers(email_status);
CREATE INDEX IF NOT EXISTS idx_gtst_grower    ON grower_testing(grower_id);
CREATE INDEX IF NOT EXISTS idx_gtst_type      ON grower_testing(test_type);

-- ----------------------------------------------------------------------------
-- 6. AUTO-UPDATE TRIGGERS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_ps_updated ON product_submissions;
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON product_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mo_updated ON market_offers;
CREATE TRIGGER trg_mo_updated BEFORE UPDATE ON market_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- 7. VIEWS - market intelligence
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_products AS
SELECT
  ps.id, ps.grower_id,
  gp.first_name || ' ' || COALESCE(gp.last_name, '') AS grower_name,
  gp.company_name,
  ps.commodity, ps.variety, ps.origin_region, ps.origin_country,
  ps.quantity, ps.packaging, ps.fob_price, ps.price_unit,
  ps.available_from, ps.available_to, ps.delivery_frequency,
  ps.certifications, ps.organic, ps.globalgap,
  ps.status, ps.buyers_matched, ps.offers_sent,
  gp.compliance_status, gp.grs_score, gp.risk_tier
FROM product_submissions ps
JOIN grower_profiles gp ON gp.id = ps.grower_id
WHERE ps.status IN ('approved', 'listed', 'matched')
  AND (ps.available_to IS NULL OR ps.available_to >= CURRENT_DATE);

CREATE OR REPLACE VIEW v_offer_pipeline AS
SELECT
  mo.id AS offer_id,
  mo.commodity,
  mo.buyer_name, mo.buyer_company, mo.buyer_email,
  mo.quantity_offered, mo.fob_price, mo.delivery_window,
  mo.email_status, mo.buyer_response,
  ps.grower_id,
  gp.first_name || ' ' || COALESCE(gp.last_name, '') AS grower_name,
  gp.company_name AS grower_company,
  mo.created_at
FROM market_offers mo
JOIN product_submissions ps ON ps.id = mo.submission_id
JOIN grower_profiles gp ON gp.id = ps.grower_id;

-- ============================================================================
-- DONE - 4 tables, 10 indexes, 2 triggers, 2 views
-- ============================================================================