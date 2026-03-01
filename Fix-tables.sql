-- ═══════════════════════════════════════════════════════════════
-- FIX FAILED TABLES - UUID foreign keys for growers
-- Run: psql -h localhost -p 5432 -U postgres -d auditdna -f fix_tables.sql
-- ═══════════════════════════════════════════════════════════════

-- Drop if partial creates exist
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS cold_chain_records CASCADE;
DROP TABLE IF EXISTS field_inspections CASCADE;
DROP TABLE IF EXISTS cogs_entries CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS manifest_items CASCADE;
DROP TABLE IF EXISTS manifests CASCADE;

-- 1. MANIFESTS (grower_id = UUID)
CREATE TABLE manifests (
  id SERIAL PRIMARY KEY,
  manifest_number VARCHAR(50) UNIQUE NOT NULL,
  manifest_type VARCHAR(20) DEFAULT 'inbound',
  grower_id UUID REFERENCES growers(id),
  buyer_id INTEGER REFERENCES buyers(id),
  origin_country VARCHAR(100),
  origin_city VARCHAR(255),
  destination_city VARCHAR(255),
  crossing_port VARCHAR(255),
  bol_number VARCHAR(100),
  container_number VARCHAR(100),
  seal_number VARCHAR(100),
  truck_number VARCHAR(100),
  driver_name VARCHAR(255),
  departure_date TIMESTAMP,
  arrival_date TIMESTAMP,
  temperature_set DECIMAL(5,2),
  temperature_actual DECIMAL(5,2),
  total_pallets INTEGER,
  total_cases INTEGER,
  total_weight_lbs DECIMAL(12,2),
  total_value_usd DECIMAL(12,2),
  customs_cleared BOOLEAN DEFAULT false,
  usda_inspected BOOLEAN DEFAULT false,
  inspection_result VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_manifests_status ON manifests(status);
CREATE INDEX idx_manifests_grower ON manifests(grower_id);
CREATE INDEX idx_manifests_buyer ON manifests(buyer_id);

-- 2. MANIFEST ITEMS
CREATE TABLE manifest_items (
  id SERIAL PRIMARY KEY,
  manifest_id INTEGER REFERENCES manifests(id),
  product_id INTEGER,
  sku VARCHAR(20),
  product_name VARCHAR(255),
  variety VARCHAR(255),
  pack_size VARCHAR(100),
  grade VARCHAR(50),
  cases INTEGER,
  weight_lbs DECIMAL(10,2),
  fob_price_per_case DECIMAL(10,2),
  landed_cost_per_case DECIMAL(10,2),
  total_fob DECIMAL(12,2),
  total_landed DECIMAL(12,2),
  lot_number VARCHAR(100),
  plu_code VARCHAR(50),
  organic BOOLEAN DEFAULT false,
  country_of_origin VARCHAR(100) DEFAULT 'Mexico',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_manifest_items_manifest ON manifest_items(manifest_id);
CREATE INDEX idx_manifest_items_sku ON manifest_items(sku);

-- 3. INVENTORY
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  manifest_item_id INTEGER REFERENCES manifest_items(id),
  product_id INTEGER,
  sku VARCHAR(20),
  lot_number VARCHAR(100),
  warehouse VARCHAR(255),
  location_zone VARCHAR(50),
  cases_received INTEGER,
  cases_available INTEGER,
  cases_sold INTEGER DEFAULT 0,
  cases_damaged INTEGER DEFAULT 0,
  cost_per_case DECIMAL(10,2),
  received_date TIMESTAMP,
  expiry_date DATE,
  temperature DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse);
CREATE INDEX idx_inventory_status ON inventory(status);

-- 4. COGS ENTRIES
CREATE TABLE cogs_entries (
  id SERIAL PRIMARY KEY,
  order_id INTEGER,
  manifest_id INTEGER REFERENCES manifests(id),
  sku VARCHAR(20),
  product_name VARCHAR(255),
  cases INTEGER,
  purchase_cost DECIMAL(10,2),
  freight_cost DECIMAL(10,2),
  customs_cost DECIMAL(10,2),
  inspection_cost DECIMAL(10,2),
  cold_storage_cost DECIMAL(10,2),
  other_cost DECIMAL(10,2),
  total_cogs DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  gross_profit DECIMAL(12,2),
  margin_pct DECIMAL(5,2),
  costing_method VARCHAR(20) DEFAULT 'FIFO',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_cogs_sku ON cogs_entries(sku);
CREATE INDEX idx_cogs_manifest ON cogs_entries(manifest_id);

-- 5. FIELD INSPECTIONS (grower_id = UUID)
CREATE TABLE field_inspections (
  id SERIAL PRIMARY KEY,
  grower_id UUID REFERENCES growers(id),
  inspector_name VARCHAR(255),
  inspection_date DATE,
  product VARCHAR(255),
  field_location VARCHAR(500),
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  soil_ph DECIMAL(4,2),
  water_quality VARCHAR(100),
  pest_findings TEXT,
  quality_grade VARCHAR(10),
  pass BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_inspections_grower ON field_inspections(grower_id);
CREATE INDEX idx_inspections_date ON field_inspections(inspection_date);

-- 6. COLD CHAIN RECORDS
CREATE TABLE cold_chain_records (
  id SERIAL PRIMARY KEY,
  manifest_id INTEGER REFERENCES manifests(id),
  checkpoint VARCHAR(255),
  recorded_at TIMESTAMP DEFAULT NOW(),
  temperature_f DECIMAL(5,2),
  humidity_pct DECIMAL(5,2),
  door_open BOOLEAN DEFAULT false,
  gps_lat DECIMAL(10,7),
  gps_lon DECIMAL(10,7),
  alert_triggered BOOLEAN DEFAULT false,
  sensor_id VARCHAR(100),
  notes TEXT
);
CREATE INDEX idx_cold_chain_manifest ON cold_chain_records(manifest_id);
CREATE INDEX idx_cold_chain_alert ON cold_chain_records(alert_triggered);

-- 7. SHIPMENTS
CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER,
  manifest_id INTEGER REFERENCES manifests(id),
  carrier VARCHAR(255),
  tracking_number VARCHAR(255),
  origin VARCHAR(500),
  destination VARCHAR(500),
  crossing_port VARCHAR(255),
  departure_at TIMESTAMP,
  eta TIMESTAMP,
  delivered_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'booked',
  freight_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_manifest ON shipments(manifest_id);

-- VERIFY
SELECT 'TABLES FIXED' as status, COUNT(*) as total_tables 
FROM information_schema.tables WHERE table_schema='public';

SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name IN ('manifests','manifest_items','inventory','cogs_entries','field_inspections','cold_chain_records','shipments')
ORDER BY table_name;