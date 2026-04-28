-- C:\AuditDNA\backend\sql\phase2-schema.sql (v2)
-- Existing production_declarations is FSMA-204 traceability table.
-- Existing rfq_disputes is dispute v1 (different shape).
-- Phase 2 uses _v2 tables to avoid collision.

DROP TABLE IF EXISTS production_declarations_v2 CASCADE;
DROP TABLE IF EXISTS rfq_disputes_v2 CASCADE;

-- ============================================================================
-- 1. Production declarations v2 - inventory marketplace (NOT FSMA traceability)
-- ============================================================================
CREATE TABLE production_declarations_v2 (
  id                  BIGSERIAL PRIMARY KEY,
  grower_id           INTEGER NOT NULL,
  commodity_category  VARCHAR(50) NOT NULL,
  commodity_subcategory VARCHAR(80),
  estimated_volume    NUMERIC(14,2) NOT NULL,
  volume_unit         VARCHAR(20) NOT NULL DEFAULT 'cases',
  available_from      DATE NOT NULL,
  available_to        DATE,
  ask_price           NUMERIC(12,2),
  ask_price_currency  VARCHAR(3) DEFAULT 'USD',
  pack_size           VARCHAR(40),
  quality_grade       VARCHAR(20),
  organic             BOOLEAN DEFAULT FALSE,
  certifications      TEXT[],
  origin_country      VARCHAR(2),
  origin_state        VARCHAR(40),
  origin_region       VARCHAR(80),
  notes               TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'open',
  matched_rfqs        BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ
);
CREATE INDEX ix_prod_decl_v2_commodity ON production_declarations_v2(commodity_category, status, available_from);
CREATE INDEX ix_prod_decl_v2_grower    ON production_declarations_v2(grower_id, status);

-- ============================================================================
-- 2. Photos (rfq_photos already created in prior run)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfq_photos (
  id            BIGSERIAL PRIMARY KEY,
  rfq_id        BIGINT,
  offer_id      BIGINT,
  declaration_id BIGINT,
  uploader_id   INTEGER NOT NULL,
  uploader_role VARCHAR(20) NOT NULL,
  filename      VARCHAR(200) NOT NULL,
  mime_type     VARCHAR(80) NOT NULL DEFAULT 'image/jpeg',
  size_bytes    INTEGER NOT NULL,
  data          BYTEA NOT NULL,
  caption       TEXT,
  is_primary    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_rfq_photos_rfq    ON rfq_photos(rfq_id) WHERE rfq_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_rfq_photos_offer  ON rfq_photos(offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_rfq_photos_decl   ON rfq_photos(declaration_id) WHERE declaration_id IS NOT NULL;

-- ============================================================================
-- 3. Price alerts (already created in prior run)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_alerts (
  id                  BIGSERIAL PRIMARY KEY,
  buyer_id            INTEGER NOT NULL,
  commodity_category  VARCHAR(50) NOT NULL,
  commodity_subcategory VARCHAR(80),
  trigger_price       NUMERIC(12,2) NOT NULL,
  trigger_direction   VARCHAR(10) NOT NULL DEFAULT 'below',
  currency            VARCHAR(3) DEFAULT 'USD',
  origin_country      VARCHAR(2),
  organic_required    BOOLEAN DEFAULT FALSE,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  last_fired_at       TIMESTAMPTZ,
  fire_count          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_price_alerts_active ON price_alerts(commodity_category, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS ix_price_alerts_buyer  ON price_alerts(buyer_id, active);

-- ============================================================================
-- 4. Disputes v2 - new RFQ-driven dispute schema
-- ============================================================================
CREATE TABLE rfq_disputes_v2 (
  id              BIGSERIAL PRIMARY KEY,
  rfq_id          BIGINT NOT NULL,
  offer_id        BIGINT,
  deal_lock_id    BIGINT,
  raised_by_id    INTEGER NOT NULL,
  raised_by_role  VARCHAR(20) NOT NULL,
  against_id      INTEGER,
  against_role    VARCHAR(20),
  category        VARCHAR(40) NOT NULL,
  description     TEXT NOT NULL,
  gmv_amount      NUMERIC(14,2),
  currency        VARCHAR(3) DEFAULT 'USD',
  forum           VARCHAR(20),
  status          VARCHAR(30) NOT NULL DEFAULT 'open',
  resolution      TEXT,
  photo_ids       BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);
CREATE INDEX ix_disputes_v2_rfq    ON rfq_disputes_v2(rfq_id);
CREATE INDEX ix_disputes_v2_status ON rfq_disputes_v2(status, created_at DESC);

-- ============================================================================
-- Verify
-- ============================================================================
SELECT 'production_declarations_v2' AS table_name, COUNT(*) AS rows FROM production_declarations_v2
UNION ALL SELECT 'rfq_photos',                  COUNT(*) FROM rfq_photos
UNION ALL SELECT 'price_alerts',                COUNT(*) FROM price_alerts
UNION ALL SELECT 'rfq_disputes_v2',             COUNT(*) FROM rfq_disputes_v2;
