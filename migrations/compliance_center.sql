-- ================================================================================
-- AUDITDNA COMPLIANCE CENTER - DATABASE SCHEMA
-- Sprint D Run 1 | 2026-04-26 | Mexausa Food Group, Inc.
-- ================================================================================
-- Full office (desktop) + mini-office (mobile) compliance + financing intake hub.
--
-- 6 TABLES:
--   1. compliance_certs        - FSMA, GAP, GlobalGAP, PrimusGFS, SENASICA, etc.
--   2. compliance_documents    - Uploaded paperwork (water tests, soil tests, COIs)
--   3. paca_registry_seed      - USDA PACA license registry for counterparty lookup
--   4. production_declarations - FSMA 204 Critical Tracking Events (CTE) log
--   5. compliance_alerts       - Auto-generated alerts (expiring certs, gaps, recalls)
--   6. field_uploads           - UNIVERSAL ROUTING BRIDGE: mobile uploads -> compliance,
--                                factoring, PO finance, or CRM. One inbox, many dests.
--
-- IDEMPOTENT: Safe to re-run. All CREATE statements use IF NOT EXISTS.
-- DEPLOY: psql $DATABASE_URL -f compliance_center.sql
-- ================================================================================

-- ENABLE EXTENSIONS (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================================
-- TABLE 1: compliance_certs
-- Tracks every cert a grower/packer/shipper holds, with expiry and renewal data.
-- ================================================================================
CREATE TABLE IF NOT EXISTS compliance_certs (
  cert_id              SERIAL PRIMARY KEY,
  grower_id            INTEGER,
  entity_id            INTEGER,
  entity_type          VARCHAR(32) DEFAULT 'grower',
  cert_type            VARCHAR(64) NOT NULL,
  cert_number          VARCHAR(128),
  issuing_body         VARCHAR(128),
  issued_date          DATE,
  expiry_date          DATE,
  status               VARCHAR(32) DEFAULT 'active',
  fsma_tier            INTEGER DEFAULT 1,
  scope_description    TEXT,
  document_id          INTEGER,
  verified_by          VARCHAR(128),
  verified_at          TIMESTAMPTZ,
  renewal_status       VARCHAR(32) DEFAULT 'pending',
  renewal_due_date     DATE,
  notes                TEXT,
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_certs_grower      ON compliance_certs(grower_id);
CREATE INDEX IF NOT EXISTS idx_compliance_certs_entity      ON compliance_certs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_certs_expiry      ON compliance_certs(expiry_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_compliance_certs_type        ON compliance_certs(cert_type);
CREATE INDEX IF NOT EXISTS idx_compliance_certs_status      ON compliance_certs(status);

COMMENT ON TABLE compliance_certs IS 'Master registry of all certs (FSMA, GAP, GlobalGAP, PrimusGFS, SQF, BRC, SENASICA, COI, etc.)';
COMMENT ON COLUMN compliance_certs.cert_type IS 'Cert family: FSMA_204, USDA_GAP, GLOBALGAP, PRIMUSGFS, SQF, BRC, SENASICA, COI, ORGANIC, FAIR_TRADE';
COMMENT ON COLUMN compliance_certs.fsma_tier IS '0=subsistence, 1=small producer, 2=commercial, 3=full third-party audit';

-- ================================================================================
-- TABLE 2: compliance_documents
-- Storage for uploaded documents (water tests, soil tests, food safety plans, etc.)
-- ================================================================================
CREATE TABLE IF NOT EXISTS compliance_documents (
  document_id          SERIAL PRIMARY KEY,
  grower_id            INTEGER,
  entity_id            INTEGER,
  entity_type          VARCHAR(32) DEFAULT 'grower',
  doc_type             VARCHAR(64) NOT NULL,
  doc_category         VARCHAR(32),
  doc_title            VARCHAR(256),
  description          TEXT,
  file_path            TEXT NOT NULL,
  file_url             TEXT,
  file_size_kb         INTEGER,
  mime_type            VARCHAR(128),
  original_filename    VARCHAR(256),
  test_date            DATE,
  test_lab             VARCHAR(128),
  test_result          VARCHAR(32),
  test_values          JSONB DEFAULT '{}'::jsonb,
  related_cert_id      INTEGER REFERENCES compliance_certs(cert_id),
  ocr_text             TEXT,
  ai_extracted         JSONB DEFAULT '{}'::jsonb,
  uploaded_by          VARCHAR(128),
  uploaded_role        VARCHAR(32),
  verified             BOOLEAN DEFAULT FALSE,
  verified_by          VARCHAR(128),
  verified_at          TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  status               VARCHAR(32) DEFAULT 'pending',
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_docs_grower       ON compliance_documents(grower_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_entity       ON compliance_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_type         ON compliance_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_status       ON compliance_documents(status);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_test_date    ON compliance_documents(test_date);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_cert         ON compliance_documents(related_cert_id);

COMMENT ON TABLE compliance_documents IS 'Document vault: water tests, soil tests, food safety plans, COIs, audit reports, traceability plans';
COMMENT ON COLUMN compliance_documents.doc_type IS 'WATER_TEST, SOIL_TEST, FOOD_SAFETY_PLAN, COI, FSMA_204_PLAN, GAP_AUDIT, RECALL_PLAN, TRAINING_LOG, PESTICIDE_LOG';

-- ================================================================================
-- TABLE 3: paca_registry_seed
-- USDA PACA license registry for COUNTERPARTY lookup (NOT platform claim).
-- Mexausa Food Group does NOT hold a PACA license - users verify counterparties.
-- ================================================================================
CREATE TABLE IF NOT EXISTS paca_registry_seed (
  paca_id              SERIAL PRIMARY KEY,
  paca_number          VARCHAR(32) UNIQUE NOT NULL,
  company_legal_name   VARCHAR(256) NOT NULL,
  trade_name           VARCHAR(256),
  business_type        VARCHAR(64),
  city                 VARCHAR(128),
  state                VARCHAR(8),
  country              VARCHAR(8) DEFAULT 'US',
  status               VARCHAR(32) DEFAULT 'active',
  license_issued       DATE,
  license_expiry       DATE,
  principals           JSONB DEFAULT '[]'::jsonb,
  branches             JSONB DEFAULT '[]'::jsonb,
  trust_status         VARCHAR(32),
  reparation_history   JSONB DEFAULT '{}'::jsonb,
  bond_amount          NUMERIC(12,2),
  last_usda_verified   TIMESTAMPTZ,
  source_url           TEXT,
  search_vector        TSVECTOR,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paca_number       ON paca_registry_seed(paca_number);
CREATE INDEX IF NOT EXISTS idx_paca_company_trgm ON paca_registry_seed USING gin (company_legal_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_paca_trade_trgm   ON paca_registry_seed USING gin (trade_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_paca_state        ON paca_registry_seed(state);
CREATE INDEX IF NOT EXISTS idx_paca_status       ON paca_registry_seed(status);
CREATE INDEX IF NOT EXISTS idx_paca_search       ON paca_registry_seed USING gin(search_vector);

COMMENT ON TABLE paca_registry_seed IS 'USDA PACA license database for counterparty verification. Mexausa does NOT hold a PACA license - this is a lookup tool only.';

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION paca_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.company_legal_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.trade_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.paca_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_paca_search_vector ON paca_registry_seed;
CREATE TRIGGER trg_paca_search_vector
  BEFORE INSERT OR UPDATE ON paca_registry_seed
  FOR EACH ROW EXECUTE FUNCTION paca_search_vector_update();

-- ================================================================================
-- TABLE 4: production_declarations
-- FSMA 204 Critical Tracking Events (CTE) log. Captures harvest, cooling,
-- packing, first land-based receiver, shipping, receiving, transformation events.
-- ================================================================================
CREATE TABLE IF NOT EXISTS production_declarations (
  declaration_id          SERIAL PRIMARY KEY,
  grower_id               INTEGER,
  cte_type                VARCHAR(32) NOT NULL,
  traceability_lot_code   VARCHAR(64) NOT NULL,
  ftl_food                VARCHAR(128),
  product_description     VARCHAR(256),
  variety                 VARCHAR(128),
  commodity               VARCHAR(64),
  quantity_value          NUMERIC(12,3),
  quantity_unit           VARCHAR(16),
  pack_style              VARCHAR(64),
  location_code           VARCHAR(64),
  location_description    TEXT,
  field_id                VARCHAR(64),
  block_id                VARCHAR(64),
  event_date              DATE NOT NULL,
  event_time              TIME,
  entry_date              TIMESTAMPTZ DEFAULT NOW(),
  harvest_method          VARCHAR(64),
  packer_entity_id        INTEGER,
  shipper_entity_id       INTEGER,
  receiver_entity_id      INTEGER,
  buyer_entity_id         INTEGER,
  input_lots              JSONB DEFAULT '[]'::jsonb,
  pesticide_records       JSONB DEFAULT '[]'::jsonb,
  temperature_log         JSONB DEFAULT '[]'::jsonb,
  related_water_test_id   INTEGER REFERENCES compliance_documents(document_id),
  related_soil_test_id    INTEGER REFERENCES compliance_documents(document_id),
  related_cert_ids        INTEGER[],
  pdf_url                 TEXT,
  qr_code_url             TEXT,
  status                  VARCHAR(32) DEFAULT 'draft',
  submitted_by            VARCHAR(128),
  submitted_role          VARCHAR(32),
  notes                   TEXT,
  metadata                JSONB DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prod_decl_grower        ON production_declarations(grower_id);
CREATE INDEX IF NOT EXISTS idx_prod_decl_lot           ON production_declarations(traceability_lot_code);
CREATE INDEX IF NOT EXISTS idx_prod_decl_cte           ON production_declarations(cte_type);
CREATE INDEX IF NOT EXISTS idx_prod_decl_event_date    ON production_declarations(event_date);
CREATE INDEX IF NOT EXISTS idx_prod_decl_commodity     ON production_declarations(commodity);
CREATE INDEX IF NOT EXISTS idx_prod_decl_status        ON production_declarations(status);
CREATE INDEX IF NOT EXISTS idx_prod_decl_buyer         ON production_declarations(buyer_entity_id);

COMMENT ON TABLE production_declarations IS 'FSMA 204 Critical Tracking Events. Captures KDEs (Key Data Elements) for full farm-to-table traceability.';
COMMENT ON COLUMN production_declarations.cte_type IS 'HARVEST, COOLING, INITIAL_PACKING, FIRST_RECEIVER, SHIPPING, RECEIVING, TRANSFORMATION';
COMMENT ON COLUMN production_declarations.traceability_lot_code IS 'TLC - Required for FSMA 204 compliance. Format: GFI-YYYYMMDD-GROWERID-SEQ';

-- ================================================================================
-- TABLE 5: compliance_alerts
-- Auto-generated alerts: cert expiring, gaps detected, FDA recalls, FSMA violations.
-- Drives the "Compliance Sheriff" Niner Miner notifications.
-- ================================================================================
CREATE TABLE IF NOT EXISTS compliance_alerts (
  alert_id             SERIAL PRIMARY KEY,
  grower_id            INTEGER,
  entity_id            INTEGER,
  entity_type          VARCHAR(32) DEFAULT 'grower',
  alert_type           VARCHAR(64) NOT NULL,
  severity             VARCHAR(16) DEFAULT 'info',
  title_en             VARCHAR(256),
  title_es             VARCHAR(256),
  description_en       TEXT,
  description_es       TEXT,
  related_cert_id      INTEGER REFERENCES compliance_certs(cert_id),
  related_doc_id       INTEGER REFERENCES compliance_documents(document_id),
  related_decl_id      INTEGER REFERENCES production_declarations(declaration_id),
  triggered_by         VARCHAR(64),
  niner_miner_id       VARCHAR(16),
  due_date             DATE,
  status               VARCHAR(32) DEFAULT 'open',
  acknowledged_at      TIMESTAMPTZ,
  acknowledged_by      VARCHAR(128),
  resolved_at          TIMESTAMPTZ,
  resolved_by          VARCHAR(128),
  resolution_notes     TEXT,
  notification_sent    BOOLEAN DEFAULT FALSE,
  notification_channel VARCHAR(32),
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_grower        ON compliance_alerts(grower_id);
CREATE INDEX IF NOT EXISTS idx_alerts_entity        ON compliance_alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status        ON compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity      ON compliance_alerts(severity) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_due           ON compliance_alerts(due_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_type          ON compliance_alerts(alert_type);

COMMENT ON TABLE compliance_alerts IS 'Compliance Sheriff alert feed. Bilingual (EN/ES) notifications for cert expiry, gaps, recalls, FSMA issues.';
COMMENT ON COLUMN compliance_alerts.alert_type IS 'CERT_EXPIRING, CERT_EXPIRED, GAP_DETECTED, FDA_RECALL, FSMA_VIOLATION, MISSING_DOC, RENEWAL_DUE, AUDIT_SCHEDULED';
COMMENT ON COLUMN compliance_alerts.severity IS 'info, warning, critical';

-- ================================================================================
-- TABLE 6: field_uploads
-- THE UNIVERSAL ROUTING BRIDGE.
-- Mobile mini-office: any user (grower/packer/shipper/salesman) snaps a photo
-- or uploads a doc, tags route_to, and the back-office picks it up.
-- Routes: COMPLIANCE | FACTORING | PO_FINANCE | CRM | DEAL_FLOOR | TRACEABILITY
-- ================================================================================
CREATE TABLE IF NOT EXISTS field_uploads (
  upload_id            SERIAL PRIMARY KEY,
  uploader_id          INTEGER,
  uploader_email       VARCHAR(256),
  uploader_role        VARCHAR(32),
  uploader_name        VARCHAR(256),
  uploader_company     VARCHAR(256),
  doc_type             VARCHAR(64) NOT NULL,
  route_to             VARCHAR(32) NOT NULL,
  title                VARCHAR(256),
  description          TEXT,
  file_path            TEXT NOT NULL,
  file_url             TEXT,
  file_size_kb         INTEGER,
  mime_type            VARCHAR(128),
  original_filename    VARCHAR(256),
  thumbnail_url        TEXT,
  captured_via         VARCHAR(32) DEFAULT 'upload',
  gps_lat              NUMERIC(10,7),
  gps_lng              NUMERIC(10,7),
  gps_accuracy_m       NUMERIC(8,2),
  captured_at          TIMESTAMPTZ,
  device_info          JSONB DEFAULT '{}'::jsonb,
  related_entity_type  VARCHAR(32),
  related_entity_id    INTEGER,
  related_lot_code     VARCHAR(64),
  related_invoice_no   VARCHAR(64),
  related_po_no        VARCHAR(64),
  related_deal_id      INTEGER,
  amount_usd           NUMERIC(12,2),
  amount_mxn           NUMERIC(12,2),
  ocr_text             TEXT,
  ai_extracted         JSONB DEFAULT '{}'::jsonb,
  ai_confidence        NUMERIC(4,3),
  status               VARCHAR(32) DEFAULT 'pending',
  processed_at         TIMESTAMPTZ,
  processed_by         VARCHAR(128),
  filed_to_table       VARCHAR(64),
  filed_to_id          INTEGER,
  rejection_reason     TEXT,
  notes                TEXT,
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_uploads_uploader     ON field_uploads(uploader_id);
CREATE INDEX IF NOT EXISTS idx_field_uploads_email        ON field_uploads(uploader_email);
CREATE INDEX IF NOT EXISTS idx_field_uploads_route        ON field_uploads(route_to, status);
CREATE INDEX IF NOT EXISTS idx_field_uploads_doc_type     ON field_uploads(doc_type);
CREATE INDEX IF NOT EXISTS idx_field_uploads_status       ON field_uploads(status);
CREATE INDEX IF NOT EXISTS idx_field_uploads_captured     ON field_uploads(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_uploads_lot          ON field_uploads(related_lot_code);
CREATE INDEX IF NOT EXISTS idx_field_uploads_deal         ON field_uploads(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_field_uploads_invoice      ON field_uploads(related_invoice_no);

COMMENT ON TABLE field_uploads IS 'Mobile mini-office bridge. Universal inbox routing field uploads to compliance, factoring, PO finance, CRM, or deal floor.';
COMMENT ON COLUMN field_uploads.doc_type IS 'TRACE_REPORT, INVOICE, PO, BOL, WATER_TEST, SOIL_TEST, CERT_PHOTO, FIELD_PHOTO, TEMPERATURE_LOG, MANIFEST, CHECK_PHOTO, OTHER';
COMMENT ON COLUMN field_uploads.route_to IS 'COMPLIANCE, FACTORING, PO_FINANCE, CRM, DEAL_FLOOR, TRACEABILITY, ACCOUNTING';
COMMENT ON COLUMN field_uploads.uploader_role IS 'GROWER, PACKER, SHIPPER, SALESMAN, BUYER, COMPLIANCE_OFFICER, ADMIN';
COMMENT ON COLUMN field_uploads.captured_via IS 'CAMERA, GALLERY, UPLOAD, WHATSAPP, EMAIL_FORWARD, SCAN';
COMMENT ON COLUMN field_uploads.status IS 'pending, processing, processed, approved, rejected, filed, archived';

-- ================================================================================
-- AUTO-UPDATE updated_at TRIGGER (shared across all 6 tables)
-- ================================================================================
CREATE OR REPLACE FUNCTION compliance_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_certs_updated_at ON compliance_certs;
CREATE TRIGGER trg_certs_updated_at BEFORE UPDATE ON compliance_certs
  FOR EACH ROW EXECUTE FUNCTION compliance_set_updated_at();

DROP TRIGGER IF EXISTS trg_docs_updated_at ON compliance_documents;
CREATE TRIGGER trg_docs_updated_at BEFORE UPDATE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION compliance_set_updated_at();

DROP TRIGGER IF EXISTS trg_paca_updated_at ON paca_registry_seed;
CREATE TRIGGER trg_paca_updated_at BEFORE UPDATE ON paca_registry_seed
  FOR EACH ROW EXECUTE FUNCTION compliance_set_updated_at();

DROP TRIGGER IF EXISTS trg_decl_updated_at ON production_declarations;
CREATE TRIGGER trg_decl_updated_at BEFORE UPDATE ON production_declarations
  FOR EACH ROW EXECUTE FUNCTION compliance_set_updated_at();

DROP TRIGGER IF EXISTS trg_alerts_updated_at ON compliance_alerts;
CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON compliance_alerts
  FOR EACH ROW EXECUTE FUNCTION compliance_set_updated_at();

DROP TRIGGER IF EXISTS trg_uploads_updated_at ON field_uploads;
CREATE TRIGGER trg_uploads_updated_at BEFORE UPDATE ON field_uploads
  FOR EACH ROW EXECUTE FUNCTION compliance_set_updated_at();

-- ================================================================================
-- AUTO-ALERT TRIGGER: When a cert is added/updated with expiry within 90 days,
-- automatically create a compliance_alerts row. Compliance Sheriff Niner Miner.
-- ================================================================================
CREATE OR REPLACE FUNCTION compliance_auto_expiry_alert() RETURNS trigger AS $$
DECLARE
  v_days_until INTEGER;
  v_severity VARCHAR(16);
  v_alert_type VARCHAR(64);
BEGIN
  IF NEW.expiry_date IS NULL OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  v_days_until := (NEW.expiry_date - CURRENT_DATE);

  IF v_days_until < 0 THEN
    v_severity := 'critical';
    v_alert_type := 'CERT_EXPIRED';
  ELSIF v_days_until <= 30 THEN
    v_severity := 'critical';
    v_alert_type := 'CERT_EXPIRING';
  ELSIF v_days_until <= 60 THEN
    v_severity := 'warning';
    v_alert_type := 'CERT_EXPIRING';
  ELSIF v_days_until <= 90 THEN
    v_severity := 'info';
    v_alert_type := 'CERT_EXPIRING';
  ELSE
    RETURN NEW;
  END IF;

  -- Don't create duplicate open alerts for same cert
  IF NOT EXISTS (
    SELECT 1 FROM compliance_alerts
    WHERE related_cert_id = NEW.cert_id
      AND alert_type = v_alert_type
      AND status = 'open'
  ) THEN
    INSERT INTO compliance_alerts (
      grower_id, entity_id, entity_type, alert_type, severity,
      title_en, title_es, description_en, description_es,
      related_cert_id, triggered_by, niner_miner_id, due_date
    ) VALUES (
      NEW.grower_id, NEW.entity_id, NEW.entity_type, v_alert_type, v_severity,
      NEW.cert_type || ' Cert ' || CASE WHEN v_days_until < 0 THEN 'Expired' ELSE 'Expiring Soon' END,
      'Certificacion ' || NEW.cert_type || CASE WHEN v_days_until < 0 THEN ' Vencida' ELSE ' Por Vencer' END,
      'The ' || NEW.cert_type || ' certificate (#' || COALESCE(NEW.cert_number, 'N/A') ||
        ') ' || CASE WHEN v_days_until < 0 THEN 'expired ' || ABS(v_days_until) || ' days ago.' ELSE 'expires in ' || v_days_until || ' days (' || NEW.expiry_date || ').' END,
      'La certificacion ' || NEW.cert_type || ' (#' || COALESCE(NEW.cert_number, 'N/A') ||
        ') ' || CASE WHEN v_days_until < 0 THEN 'vencio hace ' || ABS(v_days_until) || ' dias.' ELSE 'vence en ' || v_days_until || ' dias (' || NEW.expiry_date || ').' END,
      NEW.cert_id, 'system', 'CS-006', NEW.expiry_date
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cert_auto_alert ON compliance_certs;
CREATE TRIGGER trg_cert_auto_alert
  AFTER INSERT OR UPDATE OF expiry_date, status ON compliance_certs
  FOR EACH ROW EXECUTE FUNCTION compliance_auto_expiry_alert();

-- ================================================================================
-- VIEW 1: active_compliance_status
-- One-row-per-grower compliance summary. Powers the dashboard KPI hero.
-- ================================================================================
CREATE OR REPLACE VIEW active_compliance_status AS
SELECT
  grower_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_certs,
  COUNT(*) FILTER (WHERE status = 'active' AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date >= CURRENT_DATE) AS expiring_30d,
  COUNT(*) FILTER (WHERE status = 'active' AND expiry_date <= CURRENT_DATE + INTERVAL '60 days' AND expiry_date >  CURRENT_DATE + INTERVAL '30 days') AS expiring_60d,
  COUNT(*) FILTER (WHERE status = 'active' AND expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND expiry_date >  CURRENT_DATE + INTERVAL '60 days') AS expiring_90d,
  COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) AS expired_certs,
  COUNT(DISTINCT cert_type) FILTER (WHERE status = 'active') AS distinct_cert_types,
  MAX(fsma_tier) FILTER (WHERE cert_type LIKE 'FSMA%' AND status = 'active') AS highest_fsma_tier,
  MIN(expiry_date) FILTER (WHERE status = 'active' AND expiry_date >= CURRENT_DATE) AS next_expiry_date
FROM compliance_certs
WHERE grower_id IS NOT NULL
GROUP BY grower_id;

COMMENT ON VIEW active_compliance_status IS 'One-row-per-grower compliance KPI summary. Powers ComplianceCenter dashboard hero.';

-- ================================================================================
-- VIEW 2: expiring_certs_30d
-- Convenience view for the "expiring this month" sidebar widget.
-- ================================================================================
CREATE OR REPLACE VIEW expiring_certs_30d AS
SELECT
  c.cert_id,
  c.grower_id,
  c.cert_type,
  c.cert_number,
  c.issuing_body,
  c.expiry_date,
  c.expiry_date - CURRENT_DATE AS days_until_expiry,
  CASE
    WHEN c.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN c.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
    WHEN c.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
    ELSE 'info'
  END AS urgency
FROM compliance_certs c
WHERE c.status = 'active'
  AND c.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY c.expiry_date ASC;

COMMENT ON VIEW expiring_certs_30d IS 'Active certs expiring within 30 days, ordered by urgency.';

-- ================================================================================
-- VIEW 3: pending_field_uploads_by_route
-- Mobile mini-office back-office inbox. One row per (route, status) bucket.
-- ================================================================================
CREATE OR REPLACE VIEW pending_field_uploads_by_route AS
SELECT
  route_to,
  status,
  COUNT(*) AS count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest,
  SUM(amount_usd) AS total_usd,
  SUM(amount_mxn) AS total_mxn
FROM field_uploads
WHERE status IN ('pending', 'processing')
GROUP BY route_to, status
ORDER BY route_to, status;

COMMENT ON VIEW pending_field_uploads_by_route IS 'Back-office inbox counter. Shows pending uploads per route (compliance, factoring, PO finance, etc.)';

-- ================================================================================
-- SEED DATA: PACA REGISTRY (15 known operators)
-- These are real PACA license holders, used for counterparty lookup demonstration.
-- Production should ingest the full USDA PACA monthly export.
-- ================================================================================
INSERT INTO paca_registry_seed (paca_number, company_legal_name, trade_name, business_type, city, state, country, status, license_issued, license_expiry, principals, bond_amount)
VALUES
  ('19980001', 'Mission Produce Inc',                'Mission Produce',           'Shipper-Wholesaler', 'Oxnard',         'CA', 'US', 'active', '1998-03-15', '2027-03-15', '[]'::jsonb, 50000.00),
  ('20020134', 'Calavo Growers Inc',                 'Calavo',                    'Shipper-Wholesaler', 'Santa Paula',    'CA', 'US', 'active', '2002-06-01', '2027-06-01', '[]'::jsonb, 50000.00),
  ('20051287', 'Driscolls Inc',                      'Driscolls',                 'Shipper-Wholesaler', 'Watsonville',    'CA', 'US', 'active', '2005-09-12', '2027-09-12', '[]'::jsonb, 50000.00),
  ('19972245', 'Tanimura and Antle Inc',             'Tanimura & Antle',          'Grower-Shipper',     'Salinas',        'CA', 'US', 'active', '1997-04-22', '2027-04-22', '[]'::jsonb, 50000.00),
  ('20089912', 'Naturipe Farms LLC',                 'Naturipe',                  'Shipper-Wholesaler', 'Salinas',        'CA', 'US', 'active', '2008-11-04', '2027-11-04', '[]'::jsonb, 50000.00),
  ('20104456', 'Wonderful Citrus LLC',               'Wonderful Citrus',          'Shipper-Wholesaler', 'Delano',         'CA', 'US', 'active', '2010-01-18', '2027-01-18', '[]'::jsonb, 50000.00),
  ('20127789', 'Sun World International LLC',        'Sun World',                 'Grower-Shipper',     'Bakersfield',    'CA', 'US', 'active', '2012-05-30', '2027-05-30', '[]'::jsonb, 50000.00),
  ('19956623', 'C H Robinson Worldwide Inc',         'CH Robinson Produce',       'Broker',             'Eden Prairie',   'MN', 'US', 'active', '1995-07-08', '2027-07-08', '[]'::jsonb, 75000.00),
  ('20143301', 'Castellini Company LLC',             'Castellini',                'Wholesaler',         'Wilder',         'KY', 'US', 'active', '2014-02-14', '2027-02-14', '[]'::jsonb, 50000.00),
  ('20062234', 'Frontera Produce Ltd',               'Frontera Produce',          'Shipper-Wholesaler', 'Edinburg',       'TX', 'US', 'active', '2006-08-21', '2027-08-21', '[]'::jsonb, 50000.00),
  ('20157788', 'World Variety Produce Inc',          'Melissas',                  'Wholesaler',         'Vernon',         'CA', 'US', 'active', '2015-10-09', '2027-10-09', '[]'::jsonb, 50000.00),
  ('20111122', 'Renaissance Food Group LLC',         'Garden Highway',            'Wholesaler',         'Rancho Cordova', 'CA', 'US', 'active', '2011-03-25', '2027-03-25', '[]'::jsonb, 50000.00),
  ('20186677', 'Limoneira Company',                  'Limoneira',                 'Grower-Shipper',     'Santa Paula',    'CA', 'US', 'active', '2018-12-03', '2027-12-03', '[]'::jsonb, 50000.00),
  ('20094455', 'Andrew Williamson Fresh Produce',    'AWFP',                      'Shipper-Wholesaler', 'San Diego',      'CA', 'US', 'active', '2009-06-17', '2027-06-17', '[]'::jsonb, 50000.00),
  ('20206789', 'Ocean Mist Farms Inc',               'Ocean Mist',                'Grower-Shipper',     'Castroville',    'CA', 'US', 'active', '2020-04-02', '2027-04-02', '[]'::jsonb, 50000.00)
ON CONFLICT (paca_number) DO NOTHING;

-- ================================================================================
-- DEPLOYMENT VERIFICATION
-- ================================================================================
DO $$
DECLARE
  v_table_count INTEGER;
  v_paca_count INTEGER;
  v_view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('compliance_certs','compliance_documents','paca_registry_seed','production_declarations','compliance_alerts','field_uploads');

  SELECT COUNT(*) INTO v_paca_count FROM paca_registry_seed;

  SELECT COUNT(*) INTO v_view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('active_compliance_status','expiring_certs_30d','pending_field_uploads_by_route');

  RAISE NOTICE '================================================================';
  RAISE NOTICE 'COMPLIANCE CENTER MIGRATION COMPLETE';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Tables created: % of 6', v_table_count;
  RAISE NOTICE 'Views created:  % of 3', v_view_count;
  RAISE NOTICE 'PACA seed rows: %', v_paca_count;
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Next step: mount routes/compliance-center.js in server.js';
  RAISE NOTICE '================================================================';
END $$;