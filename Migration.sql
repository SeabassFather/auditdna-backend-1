-- ═══════════════════════════════════════════════════════════════
-- AUDITDNA MASTER MIGRATION v1.0
-- Run this ONCE in pgAdmin or psql against 'auditdna' database
-- Creates all missing tables that modules need
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. ZADARMA CONTACTS (stops CRM crash loop) ───
CREATE TABLE IF NOT EXISTS zadarma_contacts (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(100),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company VARCHAR(500),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  email VARCHAR(255),
  position VARCHAR(255),
  department VARCHAR(255),
  category VARCHAR(100) DEFAULT 'general',
  tags TEXT[],
  notes TEXT,
  source VARCHAR(100) DEFAULT 'manual',
  status VARCHAR(50) DEFAULT 'active',
  last_call_at TIMESTAMP,
  total_calls INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zadarma_contacts_phone ON zadarma_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_zadarma_contacts_email ON zadarma_contacts(email);
CREATE INDEX IF NOT EXISTS idx_zadarma_contacts_company ON zadarma_contacts(company);
CREATE INDEX IF NOT EXISTS idx_zadarma_contacts_status ON zadarma_contacts(status);

-- ─── 2. PRODUCT CATALOG (CM Products real inventory) ───
CREATE TABLE IF NOT EXISTS product_catalog (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(20) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_name_es VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  varieties TEXT,
  varieties_es TEXT,
  origin_country VARCHAR(100) DEFAULT 'Mexico',
  origin_regions TEXT,
  seasonality VARCHAR(100),
  seasonality_es VARCHAR(100),
  unit_type VARCHAR(50),
  pack_sizes TEXT,
  organic_available BOOLEAN DEFAULT false,
  conventional_available BOOLEAN DEFAULT true,
  current_price_usd DECIMAL(10,2),
  price_unit VARCHAR(50),
  usda_commodity_name VARCHAR(255),
  certifications TEXT,
  cold_chain_required BOOLEAN DEFAULT true,
  shelf_life_days INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── SEED PRODUCT CATALOG WITH CM PRODUCTS REAL DATA ───
INSERT INTO product_catalog (sku, product_name, product_name_es, category, varieties, varieties_es, origin_country, origin_regions, seasonality, seasonality_es, unit_type, pack_sizes, organic_available, conventional_available, usda_commodity_name, cold_chain_required, shelf_life_days) VALUES
('AVO-001', 'Avocado', 'Aguacate', 'Fruit', 'Hass', 'Hass', 'Mexico', 'Michoacan, Jalisco, Mexico State', 'Year-round', 'Todo el ano', 'case', '48ct, 60ct, 70ct, 84ct', true, true, 'Avocados', true, 21),
('STR-001', 'Strawberry', 'Fresa', 'Berry', 'Conventional, Organic', 'Convencional, Organica', 'Mexico', 'Baja California, Guanajuato, Jalisco', 'October-June', 'Octubre-Junio', 'flat', '8x1lb, 4x2lb', true, true, 'Strawberries', true, 7),
('BLU-001', 'Blueberry', 'Arandano', 'Berry', 'Conventional, Organic', 'Convencional, Organica', 'Mexico', 'Baja California, Jalisco, Sinaloa', 'October-May', 'Octubre-Mayo', 'flat', '12x6oz, 12x1pt', true, true, 'Blueberries', true, 14),
('RSP-001', 'Raspberry', 'Frambuesa', 'Berry', 'Conventional, Organic', 'Convencional, Organica', 'Mexico', 'Baja California, Jalisco', 'October-June', 'Octubre-Junio', 'flat', '12x6oz', true, true, 'Raspberries', true, 5),
('TOM-001', 'Tomato Roma', 'Tomate Roma', 'Vegetable', 'Roma, Saladette', 'Roma, Saladette', 'Mexico', 'Sinaloa, Sonora, Baja California', 'Year-round', 'Todo el ano', 'case', '25lb', true, true, 'Tomatoes', true, 14),
('TOM-002', 'Tomato Round', 'Tomate Bola', 'Vegetable', 'Round, Vine-ripe, Cluster', 'Bola, Racimo', 'Mexico', 'Sinaloa, Sonora, Jalisco', 'Year-round', 'Todo el ano', 'case', '25lb', true, true, 'Tomatoes', true, 14),
('PEP-001', 'Bell Pepper', 'Pimiento Morron', 'Vegetable', 'Green, Red, Yellow, Orange', 'Verde, Rojo, Amarillo, Naranja', 'Mexico', 'Sinaloa, Sonora, Baja California', 'Year-round', 'Todo el ano', 'case', '11lb, 25lb', true, true, 'Peppers', true, 14),
('PEP-002', 'Chile Pepper', 'Chile', 'Vegetable', 'Jalapeno, Serrano, Habanero, Poblano, Anaheim', 'Jalapeno, Serrano, Habanero, Poblano, Anaheim', 'Mexico', 'Sinaloa, Chihuahua, Tamaulipas', 'Year-round', 'Todo el ano', 'case', '10lb, 25lb, 30lb', false, true, 'Peppers', true, 14),
('CUC-001', 'Cucumber', 'Pepino', 'Vegetable', 'Slicer, Persian, English', 'Americano, Persa, Ingles', 'Mexico', 'Sinaloa, Sonora, Baja California', 'Year-round', 'Todo el ano', 'case', '24ct, 36ct, bushel', false, true, 'Cucumbers', true, 10),
('SQU-001', 'Squash', 'Calabaza', 'Vegetable', 'Zucchini, Yellow, Grey', 'Italiana, Amarilla, Gris', 'Mexico', 'Sinaloa, Sonora, Guanajuato', 'Year-round', 'Todo el ano', 'case', '20lb, 22lb', false, true, 'Squash', true, 10),
('LIM-001', 'Persian Lime', 'Limon Persa', 'Citrus', 'Persian', 'Persa', 'Mexico', 'Veracruz, Oaxaca, Michoacan', 'Year-round', 'Todo el ano', 'case', '40lb, 200ct, 230ct', false, true, 'Limes', true, 21),
('LEM-001', 'Lemon', 'Limon Amarillo', 'Citrus', 'Eureka, Lisbon', 'Eureka, Lisbon', 'Mexico', 'Michoacan, Tamaulipas', 'Year-round', 'Todo el ano', 'case', '75ct, 95ct, 115ct, 140ct, 165ct, 200ct', false, true, 'Lemons', true, 28),
('MNG-001', 'Mango', 'Mango', 'Tropical', 'Kent, Keitt, Ataulfo, Tommy', 'Kent, Keitt, Ataulfo, Tommy', 'Mexico', 'Sinaloa, Nayarit, Chiapas, Oaxaca, Guerrero', 'April-August', 'Abril-Agosto', 'case', '8ct, 9ct, 10ct, 12ct, 14ct', false, true, 'Mangoes', true, 14),
('PAP-001', 'Papaya', 'Papaya', 'Tropical', 'Maradol, Vegas, Tainung', 'Maradol, Vegas, Tainung', 'Mexico', 'Chiapas, Veracruz, Oaxaca, Colima', 'Year-round', 'Todo el ano', 'case', '30lb, 35lb', false, true, 'Papayas', true, 10),
('ONI-001', 'Onion', 'Cebolla', 'Vegetable', 'Yellow, White, Red, Organic', 'Amarilla, Blanca, Morada, Organica', 'Mexico', 'Chihuahua, Tamaulipas, Baja California', 'May-August', 'Mayo-Agosto', 'sack', '25lb, 40lb, 50lb', true, true, 'Onions', true, 30),
('BRS-001', 'Brussels Sprout', 'Col de Bruselas', 'Vegetable', 'Conventional, Organic', 'Convencional, Organica', 'Mexico', 'Guanajuato, Baja California', 'Year-round', 'Todo el ano', 'case', '25lb', true, true, 'Brussels Sprouts', true, 14),
('COC-001', 'Coconut', 'Coco', 'Tropical', 'Peludo', 'Peludo', 'Mexico', 'Colima, Guerrero, Tabasco', 'Year-round', 'Todo el ano', 'sack', '20ct, 25ct', false, true, 'Coconuts', false, 30),
('JFR-001', 'Jackfruit', 'Jack Fruit', 'Tropical', 'Conventional', 'Convencional', 'Mexico', 'Nayarit, Jalisco', 'April-September', 'Abril-Septiembre', 'piece', 'each', false, true, 'Jackfruit', true, 7),
('BAN-001', 'Banana', 'Platano', 'Tropical', 'Thai', 'Thai', 'Mexico', 'Chiapas, Tabasco', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Bananas', true, 10),
('GRP-001', 'Grape', 'Uva', 'Fruit', 'Table Grape, Red, Green, Black', 'Uva de Mesa, Roja, Verde, Negra', 'Mexico', 'Sonora, Baja California', 'May-August', 'Mayo-Agosto', 'case', '18lb, 19lb', false, true, 'Grapes', true, 14),
('LET-001', 'Romaine Lettuce', 'Lechuga Romana', 'Leafy Green', 'Romaine Hearts, Whole Head', 'Corazones, Cabeza', 'Mexico', 'Guanajuato, Baja California, Queretaro', 'November-April', 'Noviembre-Abril', 'case', '24ct hearts, 24ct whole', false, true, 'Lettuce', true, 10),
('LET-002', 'Iceberg Lettuce', 'Lechuga Iceberg', 'Leafy Green', 'Iceberg', 'Iceberg', 'Mexico', 'Guanajuato, Baja California', 'November-April', 'Noviembre-Abril', 'case', '24ct', false, true, 'Lettuce', true, 14),
('ASP-001', 'Asparagus', 'Esparrago', 'Vegetable', 'Green, White', 'Verde, Blanco', 'Mexico', 'Sonora, Baja California, Guanajuato', 'January-May', 'Enero-Mayo', 'case', '11lb, 28lb', true, true, 'Asparagus', true, 7),
('BRC-001', 'Broccoli', 'Brocoli', 'Vegetable', 'Crown, Floret', 'Corona, Florete', 'Mexico', 'Guanajuato, Baja California', 'November-April', 'Noviembre-Abril', 'case', '14ct, 18ct, crowns', true, true, 'Broccoli', true, 10),
('CAU-001', 'Cauliflower', 'Coliflor', 'Vegetable', 'White, Green', 'Blanca, Verde', 'Mexico', 'Guanajuato, Baja California', 'November-April', 'Noviembre-Abril', 'case', '12ct', true, true, 'Cauliflower', true, 10),
('EGG-001', 'Eggplant', 'Berenjena', 'Vegetable', 'Italian, Globe', 'Italiana, Globo', 'Mexico', 'Sinaloa, Sonora', 'November-May', 'Noviembre-Mayo', 'case', '25lb, 33lb', false, true, 'Eggplant', true, 10),
('CHY-001', 'Chayote', 'Chayote', 'Vegetable', 'Green, White', 'Verde, Blanco', 'Mexico', 'Veracruz, Michoacan', 'Year-round', 'Todo el ano', 'case', '20lb', false, true, 'Chayote', false, 14),
('WAT-001', 'Watermelon', 'Sandia', 'Melon', 'Seedless, Mini', 'Sin semilla, Mini', 'Mexico', 'Sonora, Jalisco, Chihuahua', 'April-October', 'Abril-Octubre', 'bin', 'each, 3ct, 4ct, 5ct', false, true, 'Watermelons', true, 14),
('HON-001', 'Honeydew', 'Melon Chino', 'Melon', 'Green Flesh', 'Verde', 'Mexico', 'Sonora, Durango, Coahuila', 'May-October', 'Mayo-Octubre', 'case', '5ct, 6ct, 8ct', false, true, 'Honeydew', true, 14),
('CAN-001', 'Cantaloupe', 'Melon Cantaloupe', 'Melon', 'Western, Eastern', 'Occidental, Oriental', 'Mexico', 'Sonora, Durango, Coahuila', 'April-October', 'Abril-Octubre', 'case', '9ct, 12ct, 15ct, 18ct', false, true, 'Cantaloupes', true, 10),
('CIL-001', 'Cilantro', 'Cilantro', 'Herb', 'Conventional, Organic', 'Convencional, Organico', 'Mexico', 'Baja California, Puebla, Guanajuato', 'Year-round', 'Todo el ano', 'bunch', '30ct, 60ct bunches', true, true, 'Cilantro', true, 7),
('GRB-001', 'Green Bean', 'Ejote', 'Vegetable', 'Round, French', 'Redondo, Frances', 'Mexico', 'Sinaloa, Sonora, Guanajuato', 'November-May', 'Noviembre-Mayo', 'case', '25lb, 30lb', false, true, 'Green Beans', true, 7),
('GAR-001', 'Garlic', 'Ajo', 'Vegetable', 'White, Purple', 'Blanco, Morado', 'Mexico', 'Guanajuato, Zacatecas, Aguascalientes', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Garlic', false, 60),
('GIN-001', 'Ginger', 'Jengibre', 'Root', 'Conventional', 'Convencional', 'Mexico', 'Veracruz, Oaxaca', 'Year-round', 'Todo el ano', 'case', '30lb', false, true, 'Ginger', false, 30),
('NOP-001', 'Nopales', 'Nopales', 'Specialty', 'Fresh Paddles', 'Pencas Frescas', 'Mexico', 'Milpa Alta, Tlalnepantla, Puebla', 'Year-round', 'Todo el ano', 'case', '10lb, 20lb', false, true, 'Cactus Pads', true, 10),
('JIC-001', 'Jicama', 'Jicama', 'Root', 'Conventional', 'Convencional', 'Mexico', 'Nayarit, Guanajuato', 'Year-round', 'Todo el ano', 'case', '40lb', false, true, 'Jicama', false, 30),
('TAM-001', 'Tamarind', 'Tamarindo', 'Specialty', 'Fresh Pod', 'Vaina Fresca', 'Mexico', 'Guerrero, Chiapas', 'February-June', 'Febrero-Junio', 'case', '25lb', false, true, 'Tamarind', false, 30),
('TUN-001', 'Prickly Pear', 'Tuna', 'Specialty', 'Red, Green, White', 'Roja, Verde, Blanca', 'Mexico', 'Zacatecas, Puebla, Hidalgo', 'July-October', 'Julio-Octubre', 'case', '20lb', false, true, 'Prickly Pear', true, 10),
('GUA-001', 'Guava', 'Guayaba', 'Tropical', 'Pink, White', 'Rosa, Blanca', 'Mexico', 'Aguascalientes, Michoacan, Zacatecas', 'October-March', 'Octubre-Marzo', 'case', '10lb', false, true, 'Guavas', true, 7)
ON CONFLICT (sku) DO NOTHING;


-- ─── 3. PRODUCT PRICING (live market prices per product) ───
CREATE TABLE IF NOT EXISTS product_pricing (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES product_catalog(id),
  sku VARCHAR(20) REFERENCES product_catalog(sku),
  fob_price DECIMAL(10,2),
  delivered_price DECIMAL(10,2),
  terminal_market_price DECIMAL(10,2),
  price_unit VARCHAR(50),
  market_city VARCHAR(100),
  volume_available INTEGER,
  volume_unit VARCHAR(50),
  source VARCHAR(100) DEFAULT 'manual',
  usda_report_date DATE,
  effective_date DATE DEFAULT CURRENT_DATE,
  expires_at DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pricing_sku ON product_pricing(sku);
CREATE INDEX IF NOT EXISTS idx_pricing_date ON product_pricing(effective_date);

-- ─── 4. MANIFESTS (inbound/outbound shipments) ───
CREATE TABLE IF NOT EXISTS manifests (
  id SERIAL PRIMARY KEY,
  manifest_number VARCHAR(50) UNIQUE NOT NULL,
  manifest_type VARCHAR(20) DEFAULT 'inbound',
  grower_id INTEGER REFERENCES growers(id),
  buyer_id INTEGER REFERENCES buyers(id),
  shipper_id INTEGER,
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
CREATE INDEX IF NOT EXISTS idx_manifests_number ON manifests(manifest_number);
CREATE INDEX IF NOT EXISTS idx_manifests_status ON manifests(status);
CREATE INDEX IF NOT EXISTS idx_manifests_grower ON manifests(grower_id);

-- ─── 5. MANIFEST ITEMS (line items per manifest) ───
CREATE TABLE IF NOT EXISTS manifest_items (
  id SERIAL PRIMARY KEY,
  manifest_id INTEGER REFERENCES manifests(id),
  product_id INTEGER REFERENCES product_catalog(id),
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
CREATE INDEX IF NOT EXISTS idx_manifest_items_manifest ON manifest_items(manifest_id);
CREATE INDEX IF NOT EXISTS idx_manifest_items_sku ON manifest_items(sku);

-- ─── 6. INVENTORY (real-time stock tracking) ───
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  manifest_item_id INTEGER REFERENCES manifest_items(id),
  product_id INTEGER REFERENCES product_catalog(id),
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
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse);

-- ─── 7. ORDERS (sales orders) ───
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id INTEGER REFERENCES buyers(id),
  order_date TIMESTAMP DEFAULT NOW(),
  delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  payment_terms VARCHAR(100),
  total_cases INTEGER,
  total_amount DECIMAL(12,2),
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ─── 8. ORDER ITEMS ───
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES product_catalog(id),
  sku VARCHAR(20),
  product_name VARCHAR(255),
  cases INTEGER,
  price_per_case DECIMAL(10,2),
  total_price DECIMAL(12,2),
  inventory_lot_id INTEGER REFERENCES inventory(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── 9. COGS TRACKING ───
CREATE TABLE IF NOT EXISTS cogs_entries (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
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
CREATE INDEX IF NOT EXISTS idx_cogs_order ON cogs_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_cogs_sku ON cogs_entries(sku);

-- ─── 10. PRICE ALERTS ───
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(20),
  product_name VARCHAR(255),
  alert_type VARCHAR(50),
  condition_operator VARCHAR(10),
  threshold_price DECIMAL(10,2),
  current_price DECIMAL(10,2),
  market_city VARCHAR(100),
  triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP,
  notify_email VARCHAR(255),
  notify_sms VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── 11. FIELD INSPECTIONS ───
CREATE TABLE IF NOT EXISTS field_inspections (
  id SERIAL PRIMARY KEY,
  grower_id INTEGER REFERENCES growers(id),
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
  photos TEXT[],
  pass BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── 12. COLD CHAIN RECORDS ───
CREATE TABLE IF NOT EXISTS cold_chain_records (
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
CREATE INDEX IF NOT EXISTS idx_cold_chain_manifest ON cold_chain_records(manifest_id);

-- ─── 13. LOGISTICS / SHIPPING ───
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
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

-- ─── 14. BRAIN TASK LOG (wires to Brain.js) ───
CREATE TABLE IF NOT EXISTS brain_tasks (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(100),
  task_type VARCHAR(100),
  assigned_team VARCHAR(100),
  assigned_miner VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  payload JSONB,
  result JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brain_tasks_status ON brain_tasks(status);
CREATE INDEX IF NOT EXISTS idx_brain_tasks_team ON brain_tasks(assigned_team);
CREATE INDEX IF NOT EXISTS idx_brain_tasks_type ON brain_tasks(task_type);

-- ─── 15. ANALYTICS SNAPSHOTS ───
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  metric_name VARCHAR(255),
  metric_value DECIMAL(15,2),
  metric_unit VARCHAR(50),
  category VARCHAR(100),
  comparison_value DECIMAL(15,2),
  change_pct DECIMAL(8,2),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_category ON analytics_snapshots(category);

-- ─── 16. DOCUMENT VAULT ───
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(100),
  title VARCHAR(500),
  filename VARCHAR(500),
  file_path TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  related_entity VARCHAR(100),
  related_id INTEGER,
  tags TEXT[],
  uploaded_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  expires_at DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(related_entity, related_id);

-- ═══════════════════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════════════════
SELECT 'MIGRATION COMPLETE' AS status, COUNT(*) AS total_tables
FROM information_schema.tables WHERE table_schema = 'public';

SELECT COUNT(*) AS products_loaded FROM product_catalog;