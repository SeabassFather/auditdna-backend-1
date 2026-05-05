-- File: C:\AuditDNA\backend\migrations\2026-05-04_match_engine.sql
-- Run on Railway:
--   psql "postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway" -f C:\AuditDNA\backend\migrations\2026-05-04_match_engine.sql

BEGIN;

-- ═══ 1. COMMODITY MASTER ═══
CREATE TABLE IF NOT EXISTS commodity_categories (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(64) UNIQUE NOT NULL,
  name_en       VARCHAR(128) NOT NULL,
  name_es       VARCHAR(128),
  origin_pref   VARCHAR(255) DEFAULT 'MX,US,PE',
  active        BOOLEAN DEFAULT TRUE,
  year_round    BOOLEAN DEFAULT FALSE,
  peak_months   INTEGER[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO commodity_categories (slug, name_en, name_es, origin_pref, year_round, peak_months) VALUES
  ('avocado-hass',     'Hass Avocado',         'Aguacate Hass',           'MX,PE,US', TRUE,  '{}'),
  ('strawberry',       'Strawberry',           'Fresa',                    'US,MX',    FALSE, '{1,2,3,4,5,6}'),
  ('blueberry',        'Blueberry',            'Arandano',                 'PE,MX,US', FALSE, '{4,5,6,7,8}'),
  ('blackberry',       'Blackberry',           'Mora',                     'MX,US',    FALSE, '{5,6,7,8}'),
  ('raspberry',        'Raspberry',            'Frambuesa',                'MX,US',    FALSE, '{5,6,7,8,9}'),
  ('tomato-roma',      'Roma Tomato',          'Jitomate Roma',            'MX,US',    TRUE,  '{}'),
  ('tomato-grape',     'Grape Tomato',         'Tomate Uva',               'MX,US',    TRUE,  '{}'),
  ('bell-pepper',      'Bell Pepper',          'Pimiento Morron',          'MX,US',    TRUE,  '{}'),
  ('cucumber',         'Cucumber',             'Pepino',                   'MX,US',    TRUE,  '{}'),
  ('asparagus',        'Asparagus',            'Esparrago',                'PE,MX,US', FALSE, '{2,3,4,5}'),
  ('lime-persian',     'Persian Lime',         'Limon Persa',              'MX',       TRUE,  '{}'),
  ('mango',            'Mango',                'Mango',                    'MX,PE',    FALSE, '{4,5,6,7,8,9}'),
  ('pineapple',        'Pineapple',            'Pina',                     'MX,CR',    TRUE,  '{}'),
  ('papaya',           'Papaya',               'Papaya',                   'MX,GT',    TRUE,  '{}'),
  ('grape-table',      'Table Grape',          'Uva de Mesa',              'PE,MX,US', FALSE, '{5,6,7,8,9,10,11,12}'),
  ('watermelon',       'Watermelon',           'Sandia',                   'MX,US',    FALSE, '{4,5,6,7,8,9}'),
  ('cantaloupe',       'Cantaloupe',           'Melon',                    'MX,US',    FALSE, '{4,5,6,7,8,9}'),
  ('lettuce-iceberg',  'Iceberg Lettuce',      'Lechuga Iceberg',          'US,MX',    TRUE,  '{}'),
  ('lettuce-romaine',  'Romaine Lettuce',      'Lechuga Romana',           'US,MX',    TRUE,  '{}'),
  ('spinach',          'Spinach',              'Espinaca',                 'US,MX',    TRUE,  '{}'),
  ('broccoli',         'Broccoli',             'Brocoli',                  'US,MX',    TRUE,  '{}'),
  ('cauliflower',      'Cauliflower',          'Coliflor',                 'US,MX',    TRUE,  '{}'),
  ('onion-yellow',     'Yellow Onion',         'Cebolla Amarilla',         'MX,US',    TRUE,  '{}'),
  ('garlic',           'Garlic',               'Ajo',                      'MX,US',    TRUE,  '{}'),
  ('jalapeno',         'Jalapeno Pepper',      'Chile Jalapeno',           'MX',       TRUE,  '{}'),
  ('serrano',          'Serrano Pepper',       'Chile Serrano',            'MX',       TRUE,  '{}')
ON CONFLICT (slug) DO NOTHING;

-- ═══ 2. COMMISSION RATES ═══
CREATE TABLE IF NOT EXISTS commission_schedule (
  id                  SERIAL PRIMARY KEY,
  commodity_slug      VARCHAR(64) REFERENCES commodity_categories(slug) ON DELETE CASCADE,
  buy_side_pct        NUMERIC(5,2) NOT NULL,
  sell_side_pct       NUMERIC(5,2) NOT NULL,
  total_pct           NUMERIC(5,2) NOT NULL,
  min_dollar_per_load NUMERIC(10,2) DEFAULT 250.00,
  market_basis        VARCHAR(255),
  effective_from      DATE DEFAULT CURRENT_DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO commission_schedule (commodity_slug, buy_side_pct, sell_side_pct, total_pct, market_basis, notes) VALUES
  ('avocado-hass',    4.0, 4.0, 8.0,  'USDA Terminal + Mexican export FOB', 'High demand year-round, MX dominant'),
  ('strawberry',      4.0, 4.0, 8.0,  'Salinas/Watsonville FOB',            'Peak Apr-Jun, fragile, fast-turn'),
  ('blueberry',       5.0, 5.0, 10.0, 'PE export + Driscoll spot',          'Premium berry, Peru window May-Aug'),
  ('blackberry',      5.0, 5.0, 10.0, 'MX export FOB',                      'Fragile, premium pricing'),
  ('raspberry',       5.0, 5.0, 10.0, 'MX export FOB',                      'Fragile, premium pricing'),
  ('tomato-roma',     3.0, 3.0, 6.0,  'Mexicali/Sinaloa FOB',               'Volume commodity'),
  ('tomato-grape',    3.5, 3.5, 7.0,  'Mexicali/Sinaloa FOB',               'Specialty premium'),
  ('bell-pepper',     3.5, 3.5, 7.0,  'Sinaloa/Culiacan FOB',               'MX dominant Nov-May'),
  ('cucumber',        3.0, 3.0, 6.0,  'Sonora/Sinaloa FOB',                 'Volume commodity'),
  ('asparagus',       4.5, 4.5, 9.0,  'Caborca + Peru FOB',                 'Premium, short window'),
  ('lime-persian',    3.5, 3.5, 7.0,  'Veracruz/Michoacan FOB',             'MX 100% supply USA'),
  ('mango',           4.0, 4.0, 8.0,  'Sinaloa/Chiapas FOB + Peru',         'Peak Apr-Sep'),
  ('pineapple',       3.0, 3.0, 6.0,  'Veracruz/Costa Rica FOB',            'Year-round'),
  ('papaya',          4.0, 4.0, 8.0,  'Colima/Chiapas FOB',                 'MX dominant'),
  ('grape-table',     4.0, 4.0, 8.0,  'PE export + CA/Sonora',              'Peru window May-Dec'),
  ('watermelon',      2.5, 2.5, 5.0,  'Sonora/Texas FOB',                   'High volume low margin'),
  ('cantaloupe',      3.0, 3.0, 6.0,  'Sonora/Texas FOB',                   'Seasonal'),
  ('lettuce-iceberg', 3.0, 3.0, 6.0,  'Salinas/Yuma FOB',                   'Volume commodity'),
  ('lettuce-romaine', 3.0, 3.0, 6.0,  'Salinas/Yuma FOB',                   'Volume commodity'),
  ('spinach',         3.5, 3.5, 7.0,  'Salinas/Yuma FOB',                   'Specialty leafy'),
  ('broccoli',        3.0, 3.0, 6.0,  'Salinas/Yuma + Guanajuato',          'Volume'),
  ('cauliflower',     3.0, 3.0, 6.0,  'Salinas/Yuma + Guanajuato',          'Volume'),
  ('onion-yellow',    3.0, 3.0, 6.0,  'Chihuahua/Tampico FOB',              'Volume'),
  ('garlic',          4.0, 4.0, 8.0,  'Zacatecas FOB',                      'High value'),
  ('jalapeno',        3.5, 3.5, 7.0,  'Sinaloa/Veracruz FOB',               'MX dominant'),
  ('serrano',         3.5, 3.5, 7.0,  'Sinaloa/Veracruz FOB',               'MX dominant');

-- ═══ 3. BUYER CATEGORY INTEREST MAP ═══
CREATE TABLE IF NOT EXISTS buyer_commodity_interest (
  id              SERIAL PRIMARY KEY,
  buyer_email     VARCHAR(255) NOT NULL,
  commodity_slug  VARCHAR(64) REFERENCES commodity_categories(slug) ON DELETE CASCADE,
  buyer_category  VARCHAR(50),
  priority        SMALLINT DEFAULT 1,
  active          BOOLEAN DEFAULT TRUE,
  last_contacted  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (buyer_email, commodity_slug)
);
CREATE INDEX IF NOT EXISTS idx_buyer_int_email     ON buyer_commodity_interest (buyer_email);
CREATE INDEX IF NOT EXISTS idx_buyer_int_commodity ON buyer_commodity_interest (commodity_slug);

-- ═══ 4. GROWER INVENTORY ═══
CREATE TABLE IF NOT EXISTS grower_inventory (
  id               SERIAL PRIMARY KEY,
  grower_email     VARCHAR(255) NOT NULL,
  grower_name      VARCHAR(255),
  commodity_slug   VARCHAR(64) REFERENCES commodity_categories(slug) ON DELETE CASCADE,
  origin_country   VARCHAR(10),
  origin_state     VARCHAR(64),
  pack_style       VARCHAR(128),
  available_loads  INTEGER DEFAULT 0,
  fob_price        NUMERIC(10,2),
  available_from   DATE,
  available_thru   DATE,
  certifications   TEXT[],
  notes            TEXT,
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grower_inv_commodity ON grower_inventory (commodity_slug);
CREATE INDEX IF NOT EXISTS idx_grower_inv_status    ON grower_inventory (status);

-- ═══ 5. BUYER NEEDS QUEUE ═══
CREATE TABLE IF NOT EXISTS buyer_needs (
  id               SERIAL PRIMARY KEY,
  buyer_email      VARCHAR(255) NOT NULL,
  buyer_name       VARCHAR(255),
  commodity_slug   VARCHAR(64) REFERENCES commodity_categories(slug) ON DELETE CASCADE,
  needed_loads     INTEGER DEFAULT 1,
  target_price     NUMERIC(10,2),
  needed_by        DATE,
  delivery_state   VARCHAR(64),
  notes            TEXT,
  status           VARCHAR(20) DEFAULT 'open',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_buyer_needs_commodity ON buyer_needs (commodity_slug);
CREATE INDEX IF NOT EXISTS idx_buyer_needs_status    ON buyer_needs (status);

-- ═══ 6. BLIND MATCH NOTIFICATIONS LOG ═══
CREATE TABLE IF NOT EXISTS match_notifications (
  id                SERIAL PRIMARY KEY,
  match_type        VARCHAR(32) NOT NULL,
  commodity_slug    VARCHAR(64),
  recipient_email   VARCHAR(255) NOT NULL,
  recipient_role    VARCHAR(20),
  source_id         INTEGER,
  email_subject     TEXT,
  blind_match_id    VARCHAR(32),
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  opened_at         TIMESTAMPTZ,
  responded_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_match_notif_commodity ON match_notifications (commodity_slug);
CREATE INDEX IF NOT EXISTS idx_match_notif_recipient ON match_notifications (recipient_email);
CREATE INDEX IF NOT EXISTS idx_match_notif_sent      ON match_notifications (sent_at DESC);

-- ═══ 7. DAILY BLAST LOG ═══
CREATE TABLE IF NOT EXISTS daily_blast_log (
  id              SERIAL PRIMARY KEY,
  blast_date      DATE NOT NULL,
  blast_type      VARCHAR(64) NOT NULL,
  commodity_focus TEXT[],
  recipients_count INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  failed_count     INTEGER DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'pending',
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ,
  notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_blast_log_date ON daily_blast_log (blast_date DESC);
CREATE INDEX IF NOT EXISTS idx_blast_log_type ON daily_blast_log (blast_type);

-- ═══ 8. SEED BUYER CATEGORIES INTO INTEREST MAP ═══
-- Auto-link existing crm_contacts to default commodity interest by category
INSERT INTO buyer_commodity_interest (buyer_email, commodity_slug, buyer_category, priority)
SELECT DISTINCT c.email, 'avocado-hass', c.category, 1
  FROM crm_contacts c
 WHERE c.is_active = TRUE
   AND c.opt_out = FALSE
   AND c.category IS NOT NULL
ON CONFLICT (buyer_email, commodity_slug) DO NOTHING;

INSERT INTO buyer_commodity_interest (buyer_email, commodity_slug, buyer_category, priority)
SELECT DISTINCT c.email, 'strawberry', c.category, 1
  FROM crm_contacts c
 WHERE c.is_active = TRUE
   AND c.opt_out = FALSE
   AND c.category IS NOT NULL
ON CONFLICT (buyer_email, commodity_slug) DO NOTHING;

COMMIT;

-- ═══ VERIFY ═══
SELECT 'commodity_categories'      AS tbl, COUNT(*) FROM commodity_categories
UNION ALL SELECT 'commission_schedule',     COUNT(*) FROM commission_schedule
UNION ALL SELECT 'buyer_commodity_interest',COUNT(*) FROM buyer_commodity_interest
UNION ALL SELECT 'grower_inventory',        COUNT(*) FROM grower_inventory
UNION ALL SELECT 'buyer_needs',             COUNT(*) FROM buyer_needs
UNION ALL SELECT 'match_notifications',     COUNT(*) FROM match_notifications
UNION ALL SELECT 'daily_blast_log',         COUNT(*) FROM daily_blast_log;
