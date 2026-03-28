-- ============================================================
-- GROWER PROFILES + DOCUMENTS + HARVESTS + FINANCIALS
-- Matches grower-pipeline.js v2.0 column names
-- Run: $env:PGPASSWORD='YOUR_PASSWORD'
--   psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f "C:\AuditDNA\auditdna-realestate\database\001_grower_profiles.sql"
-- Save to: C:\AuditDNA\auditdna-realestate\database\001_grower_profiles.sql
-- ============================================================
BEGIN;

-- ===================== 1. GROWER PROFILES =====================
CREATE TABLE IF NOT EXISTS grower_profiles (
  id                  SERIAL PRIMARY KEY,
  first_name          VARCHAR(255) NOT NULL,
  last_name           VARCHAR(255) DEFAULT '',
  email               VARCHAR(255) UNIQUE NOT NULL,
  phone               VARCHAR(50) DEFAULT '',
  company_name        VARCHAR(255) DEFAULT '',
  city                VARCHAR(100) DEFAULT '',
  state_region        VARCHAR(100) DEFAULT '',
  country             VARCHAR(100) NOT NULL DEFAULT 'Mexico',
  commodities         TEXT DEFAULT '',
  quantities          TEXT DEFAULT '',
  packaging           TEXT DEFAULT '',
  certifications      TEXT DEFAULT '',
  harvest_start       DATE,
  harvest_end         DATE,
  password_hash       VARCHAR(255),
  pin_hash            VARCHAR(255),
  compliance_status   VARCHAR(20) DEFAULT 'pending',
  grs_score           NUMERIC(5,2) DEFAULT 0,
  risk_tier           VARCHAR(10) DEFAULT 'T3',
  id_verified         BOOLEAN DEFAULT false,
  docs_complete       BOOLEAN DEFAULT false,
  role                VARCHAR(20) DEFAULT 'grower',
  status              VARCHAR(20) DEFAULT 'active',
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gp_email ON grower_profiles(email);
CREATE INDEX IF NOT EXISTS idx_gp_country ON grower_profiles(country);
CREATE INDEX IF NOT EXISTS idx_gp_state ON grower_profiles(state_region);
CREATE INDEX IF NOT EXISTS idx_gp_tier ON grower_profiles(risk_tier);
CREATE INDEX IF NOT EXISTS idx_gp_status ON grower_profiles(status);
CREATE INDEX IF NOT EXISTS idx_gp_compliance ON grower_profiles(compliance_status);
CREATE INDEX IF NOT EXISTS idx_gp_grs ON grower_profiles(grs_score DESC);

-- ===================== 2. GROWER DOCUMENTS =====================
CREATE TABLE IF NOT EXISTS grower_documents (
  id              SERIAL PRIMARY KEY,
  grower_id       INTEGER REFERENCES grower_profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_gdoc_grower ON grower_documents(grower_id);
CREATE INDEX IF NOT EXISTS idx_gdoc_type ON grower_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_gdoc_status ON grower_documents(status);

-- ===================== 3. GROWER HARVESTS =====================
CREATE TABLE IF NOT EXISTS grower_harvests (
  id              SERIAL PRIMARY KEY,
  grower_id       INTEGER REFERENCES grower_profiles(id) ON DELETE CASCADE,
  commodity       VARCHAR(100) NOT NULL,
  acreage_planted NUMERIC(10,2),
  expected_yield  NUMERIC(10,2),
  harvest_start   DATE,
  harvest_end     DATE,
  status          VARCHAR(20) DEFAULT 'planned',
  actual_volume   NUMERIC(12,2),
  loads_shipped   INTEGER DEFAULT 0,
  loads_estimated INTEGER,
  quality_grade   VARCHAR(50),
  notes           TEXT,
  season_year     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gharvest_grower ON grower_harvests(grower_id);
CREATE INDEX IF NOT EXISTS idx_gharvest_commodity ON grower_harvests(commodity);

-- ===================== 4. GROWER FINANCIALS =====================
CREATE TABLE IF NOT EXISTS grower_financials (
  id                SERIAL PRIMARY KEY,
  grower_id         INTEGER REFERENCES grower_profiles(id) ON DELETE CASCADE,
  type              VARCHAR(30) NOT NULL,
  reference_number  VARCHAR(100),
  amount            NUMERIC(12,2) DEFAULT 0,
  currency          VARCHAR(3) DEFAULT 'USD',
  status            VARCHAR(20) DEFAULT 'draft',
  buyer_id          INTEGER,
  commodity         VARCHAR(100),
  quantity          VARCHAR(100),
  unit_price        NUMERIC(10,2),
  terms             VARCHAR(100),
  due_date          DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gfin_grower ON grower_financials(grower_id);
CREATE INDEX IF NOT EXISTS idx_gfin_type ON grower_financials(type);
CREATE INDEX IF NOT EXISTS idx_gfin_status ON grower_financials(status);

-- ===================== 5. BRAIN EVENTS (if not exists) =====================
CREATE TABLE IF NOT EXISTS brain_events (
  id              SERIAL PRIMARY KEY,
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_type ON brain_events(event_type);

-- ===================== 6. SEED DATA =====================
-- 13 growers: 5 from growersDatabase.js + 8 from GrowerMaster.jsx
-- No password_hash/pin_hash — growers register to get credentials

INSERT INTO grower_profiles (first_name, last_name, email, phone, company_name, city, state_region, country, commodities, certifications, grs_score, risk_tier, compliance_status, id_verified, docs_complete, status)
VALUES
('Juan','Garcia Morales','jgarcia@aguacatesfinos.com.mx','+52-443-315-8700','Aguacates Finos de Michoacan S.A. de C.V.','Uruapan','Michoacan','Mexico','Avocado Hass 48s, Avocado Hass 60s','SENASICA, GLOBALG.A.P., Primus GFS, FDA FSVP',92.0,'T0','approved',true,true,'active'),
('Maria Elena','Rodriguez','mrodriguez@pauaguacates.com.mx','+52-452-523-1100','Productores Aguacateros Unidos S.P.R. de R.L.','Periban','Michoacan','Mexico','Avocado Hass 36s XL, Avocado Hass 48s','SENASICA, GLOBALG.A.P., Primus GFS, USDA Organic',95.0,'T0','approved',true,true,'active'),
('Roberto','Hernandez','rhernandez@agrojalisco.com.mx','+52-33-3615-9800','Agroexportadora Jalisco S.A. de C.V.','Zapopan','Jalisco','Mexico','Avocado Hass 60s','SENASICA, GLOBALG.A.P., FDA FSVP',85.0,'T0','approved',true,true,'active'),
('Ana','Sanchez','asanchez@berripac.com.mx','+52-646-175-2200','Berries del Pacifico S.A. de C.V.','San Quintin','Baja California','Mexico','Strawberries 8x1 lb, Spring Mix Leafy Greens','SENASICA, Primus GFS, GLOBALG.A.P., USDA Organic',96.0,'T0','approved',true,true,'active'),
('Carlos','Ramirez','cramirez@hortbajio.com.mx','+52-462-622-8900','Hortalizas del Bajio S.A. de C.V.','Irapuato','Guanajuato','Mexico','Romaine Lettuce, Broccoli Crowns, Iceberg Lettuce','SENASICA, Primus GFS, GLOBALG.A.P., SQF Level 2',88.0,'T0','approved',true,true,'active'),
('Jose','Martinez','rancho@lospinos.mx','+52-452-111-2233','Rancho Los Pinos','Uruapan','Michoacan','Mexico','Avocados','GlobalGAP, SENASICA',87.0,'T0','approved',true,false,'active'),
('Maria','Gonzalez','santa.elena@gmail.com','+52-452-333-4455','Huerta Santa Elena','Tancitaro','Michoacan','Mexico','Avocados','GlobalGAP, Primus GFS',92.0,'T0','approved',true,false,'active'),
('Pedro','Hernandez','elagua@prodigy.net.mx','+52-452-555-6677','Finca El Aguacate','Periban','Michoacan','Mexico','Avocados','SENASICA',78.0,'T1','approved',false,false,'active'),
('Sarah','Johnson','sarah@berryfields.com','+1-831-555-1234','Berry Fields California','Salinas','California','USA','Strawberries, Blueberries','USDA Organic, Primus GFS',95.0,'T0','approved',true,true,'active'),
('Carlos','Ruiz','carlos@ranchodelvalle.mx','+52-646-111-2233','Rancho Del Valle','Ensenada','Baja California','Mexico','Tomatoes, Peppers','GlobalGAP',82.0,'T1','approved',false,false,'active'),
('Roberto','Lopez','citricos.fam@outlook.com','+52-453-777-8899','Citricos Familiares','Apatzingan','Michoacan','Mexico','Limes, Lemons','SENASICA',71.0,'T2','review',false,false,'review'),
('Mike','Chen','sales@pacificgreens.com','+1-928-555-0400','Pacific Greens Co','Yuma','Arizona','USA','Lettuce, Spinach, Kale','LGMA, Primus GFS, USDA Organic',91.0,'T0','approved',true,true,'active'),
('Luis','Mendoza','sanjuan.hort@gmail.com','+52-351-444-5566','Hortalizas San Juan','Jacona','Michoacan','Mexico','Peppers','',59.0,'T3','suspended',false,false,'suspended')
ON CONFLICT (email) DO NOTHING;

-- ===================== 7. TRIGGERS =====================
CREATE OR REPLACE FUNCTION update_grower_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_updated ON grower_profiles;
CREATE TRIGGER trg_gp_updated BEFORE UPDATE ON grower_profiles FOR EACH ROW EXECUTE FUNCTION update_grower_timestamp();

DROP TRIGGER IF EXISTS trg_gfin_updated ON grower_financials;
CREATE TRIGGER trg_gfin_updated BEFORE UPDATE ON grower_financials FOR EACH ROW EXECUTE FUNCTION update_grower_timestamp();

COMMIT;

-- Verify
SELECT 'grower_profiles' AS tbl, COUNT(*) AS rows FROM grower_profiles
UNION ALL SELECT 'grower_documents', COUNT(*) FROM grower_documents
UNION ALL SELECT 'grower_harvests', COUNT(*) FROM grower_harvests
UNION ALL SELECT 'grower_financials', COUNT(*) FROM grower_financials
UNION ALL SELECT 'brain_events', COUNT(*) FROM brain_events;