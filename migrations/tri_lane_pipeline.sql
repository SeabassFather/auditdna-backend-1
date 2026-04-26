-- =============================================================================
-- File: tri_lane_pipeline.sql
-- Save to: C:\AuditDNA\backend\migrations\tri_lane_pipeline.sql
-- =============================================================================
-- Sprint D Wave 3A - Tri-Lane Pipeline
-- Lane 1: Grower push (already shipped Wave 2)
-- Lane 2: Buyer pull (NEW - buyer registers want, blasts matched growers)
-- Lane 3: Distress / Open Market (NEW - autonomous fast-lane <60s)
--
-- Idempotent. Safe to re-run.
-- =============================================================================

-- =============================================================================
-- LANE 2: BUYER WANTS REGISTRY
-- =============================================================================
CREATE TABLE IF NOT EXISTS buyer_wants (
  id              SERIAL PRIMARY KEY,
  buyer_id        INTEGER,
  buyer_name      TEXT,
  buyer_email     TEXT,
  buyer_company   TEXT,
  buyer_type      TEXT, -- 'wholesaler','retailer','chain_store','distributor','foodservice','importer'
  -- What they want
  commodity       TEXT NOT NULL,
  variety         TEXT,
  pack_spec       TEXT, -- '24ct cartons','40lb cases','bulk bins'
  grade           TEXT, -- 'US #1','US Fancy','Choice','Standard'
  volume_lbs      NUMERIC,
  volume_unit     TEXT DEFAULT 'lb',
  price_target    NUMERIC, -- max FOB they want to pay
  origin_pref     TEXT[], -- preferred origins (CA, MX, AZ etc)
  -- When they need it
  needed_by       DATE,
  needed_for      TEXT, -- 'cinco-de-mayo','easter','memorial-day','weekly-program','spot'
  recurring       BOOLEAN DEFAULT FALSE,
  recurrence_cadence TEXT, -- 'weekly','biweekly','monthly'
  -- Privacy / brokerage
  identity_visible BOOLEAN DEFAULT FALSE, -- false = "Mexausa Food Group sourcing partner" until LOI
  legal_consent_at TIMESTAMP, -- timestamp when buyer accepted brokerage ToS
  legal_consent_ip TEXT,
  -- AI-generated outreach letter (to growers)
  subject_line    TEXT,
  body_html       TEXT,
  body_text       TEXT,
  language        TEXT DEFAULT 'EN',
  reasoning_engine TEXT DEFAULT 'AuditDNA Platform Reasoning',
  ai_model        TEXT,
  -- Matching
  matched_grower_count INTEGER DEFAULT 0,
  matched_grower_ids   INTEGER[],
  matched_grower_emails TEXT[],
  -- Lifecycle
  status          TEXT NOT NULL DEFAULT 'pending_admin'
                  CHECK (status IN ('pending_admin','admin_reviewing','approved','scheduled','sent','expired','cancelled','closed')),
  admin_id        INTEGER,
  admin_name      TEXT,
  approved_at     TIMESTAMP,
  scheduled_for   TIMESTAMP,
  sent_at         TIMESTAMP,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_wants_status     ON buyer_wants(status);
CREATE INDEX IF NOT EXISTS idx_buyer_wants_commodity  ON buyer_wants(commodity);
CREATE INDEX IF NOT EXISTS idx_buyer_wants_buyer      ON buyer_wants(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_wants_needed_by  ON buyer_wants(needed_by);
CREATE INDEX IF NOT EXISTS idx_buyer_wants_created    ON buyer_wants(created_at DESC);

-- =============================================================================
-- LANE 3: DISTRESS / OPEN MARKET REGISTRY
-- =============================================================================

-- Top-25 distress buyers - pre-curated, can be auto-promoted
CREATE TABLE IF NOT EXISTS distress_buyers_top25 (
  id              SERIAL PRIMARY KEY,
  buyer_name      TEXT NOT NULL,
  contact_name    TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  whatsapp        TEXT,
  buyer_type      TEXT, -- 'salvage','grocery_outlet','food_bank','secondary_market','foodservice','export'
  region          TEXT, -- 'west_coast','southwest','midwest','northeast','southeast','mexico','national'
  commodities_accepted TEXT[], -- categories they buy in distress: ['avocado','berries','leafy_greens',...]
  min_load_size_lbs NUMERIC, -- minimum load they'll accept
  max_response_minutes INTEGER DEFAULT 30, -- typical SLA
  closes_count    INTEGER DEFAULT 0, -- auto-promotion counter
  is_active       BOOLEAN DEFAULT TRUE,
  is_seed         BOOLEAN DEFAULT FALSE, -- TRUE for the initial 25; FALSE for auto-promoted
  notes           TEXT,
  added_by        INTEGER, -- admin user id
  added_at        TIMESTAMP DEFAULT NOW(),
  last_blasted_at TIMESTAMP,
  last_responded_at TIMESTAMP,
  unsubscribed_at TIMESTAMP -- never blast after this
);

CREATE INDEX IF NOT EXISTS idx_distress_buyers_active     ON distress_buyers_top25(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_distress_buyers_region     ON distress_buyers_top25(region);
CREATE INDEX IF NOT EXISTS idx_distress_buyers_email      ON distress_buyers_top25(email);

-- Distress uploads (grower mobile MOVE NOW screen)
CREATE TABLE IF NOT EXISTS distress_uploads (
  id              SERIAL PRIMARY KEY,
  grower_id       INTEGER,
  grower_name     TEXT,
  grower_email    TEXT,
  grower_phone    TEXT,
  -- The product
  commodity       TEXT NOT NULL,
  variety         TEXT,
  volume_lbs      NUMERIC,
  unit            TEXT DEFAULT 'lb',
  price_fob       NUMERIC NOT NULL, -- FINAL PRICE - non-negotiable
  fob_location    TEXT NOT NULL,
  -- Field intel (mandatory)
  photo_urls      TEXT[],
  gps_lat         NUMERIC,
  gps_lng         NUMERIC,
  gps_accuracy_m  NUMERIC,
  -- 5-point quality / consumption checklist (ALL must be TRUE to fire)
  q_temp_ok       BOOLEAN DEFAULT FALSE, -- still in cold chain
  q_pack_ok       BOOLEAN DEFAULT FALSE, -- meets minimum shipping pack
  q_consumable    BOOLEAN DEFAULT FALSE, -- safe for human consumption
  q_no_recall     BOOLEAN DEFAULT FALSE, -- not under FDA/USDA recall
  q_chain_ready   BOOLEAN DEFAULT FALSE, -- ready to load on truck
  -- Window
  available_from  TIMESTAMP DEFAULT NOW(),
  available_until TIMESTAMP, -- spoilage deadline
  -- Routing
  matched_buyer_count INTEGER DEFAULT 0,
  matched_buyer_ids   INTEGER[],
  blast_fired_at  TIMESTAMP,
  blast_fired_to  TEXT[], -- emails actually pushed
  -- Status
  status          TEXT NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received','quality_failed','ready_to_blast','blasted','partial_response','sold','expired')),
  fail_reason     TEXT,
  language        TEXT DEFAULT 'EN',
  ai_model        TEXT,
  reasoning_engine TEXT DEFAULT 'AuditDNA Platform Reasoning',
  subject_line    TEXT,
  body_html       TEXT,
  body_text       TEXT,
  -- Outcome
  responded_count INTEGER DEFAULT 0,
  closed_at       TIMESTAMP,
  closed_buyer_id INTEGER,
  closed_volume_lbs NUMERIC,
  closed_price_fob NUMERIC,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distress_uploads_status   ON distress_uploads(status);
CREATE INDEX IF NOT EXISTS idx_distress_uploads_commodity ON distress_uploads(commodity);
CREATE INDEX IF NOT EXISTS idx_distress_uploads_grower   ON distress_uploads(grower_id);
CREATE INDEX IF NOT EXISTS idx_distress_uploads_created  ON distress_uploads(created_at DESC);

-- =============================================================================
-- MATCH HISTORY (cross-lane analytics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS match_history (
  id              SERIAL PRIMARY KEY,
  lane            TEXT NOT NULL CHECK (lane IN ('grower_push','buyer_pull','distress')),
  source_id       INTEGER NOT NULL, -- pending_templates.id, buyer_wants.id, or distress_uploads.id
  matched_count   INTEGER DEFAULT 0,
  matched_ids     INTEGER[],
  matched_emails  TEXT[],
  blast_at        TIMESTAMP,
  responded_count INTEGER DEFAULT 0,
  closed_count    INTEGER DEFAULT 0,
  total_lbs_moved NUMERIC,
  total_value_usd NUMERIC,
  meta            JSONB,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_history_lane    ON match_history(lane);
CREATE INDEX IF NOT EXISTS idx_match_history_source  ON match_history(lane, source_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history(created_at DESC);

-- =============================================================================
-- TOP-25 DISTRESS BUYERS - SEED DATA
-- =============================================================================
-- Curated list of major secondary / salvage / discount buyers.
-- Real contact emails are placeholders - replace with verified addresses
-- in production. is_seed=TRUE marks original 25; auto-promoted buyers join with FALSE.
INSERT INTO distress_buyers_top25 (buyer_name, contact_name, email, buyer_type, region, commodities_accepted, min_load_size_lbs, is_seed, notes)
VALUES
  ('Grocery Outlet Bargain Market', 'Carol Yu',         'carol.yu@groceryoutlet.com',     'grocery_outlet', 'west_coast', ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','herbs','peppers','squash','onion'], 1000, TRUE, 'Saul direct contact'),
  ('Grocery Outlet - Fresh Pull',   'Daniel Markham',   'daniel.markham@groceryoutlet.com','grocery_outlet', 'west_coast', ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','peppers','squash'], 1500, TRUE, 'Saul direct contact'),
  ('Smart & Final Distress Desk',   'Sourcing',         'distress@smartandfinal.com',     'discount_chain', 'west_coast', ARRAY['avocado','tomato','citrus','onion','potato','squash','peppers','melons','leafy_greens'], 2000, TRUE, NULL),
  ('99 Cents Only Stores Produce',  'Sourcing',         'produce-buy@99only.com',         'discount_chain', 'west_coast', ARRAY['avocado','citrus','tomato','onion','potato','melons','peppers','squash'], 1500, TRUE, NULL),
  ('Imperfect Foods Rescue',        'Sourcing',         'sourcing@imperfectfoods.com',    'salvage',        'national',   ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','herbs','peppers','squash','onion','potato'], 800, TRUE, 'Imperfect produce program'),
  ('Misfits Market Sourcing',       'Sourcing',         'sourcing@misfitsmarket.com',     'salvage',        'national',   ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','herbs','peppers','squash','onion','potato'], 800, TRUE, 'Misfits produce program'),
  ('Flashfood Distress',            'Sourcing',         'partners@flashfood.com',         'salvage',        'national',   ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','herbs','peppers'], 500, TRUE, 'Last-chance grocery'),
  ('Feeding America Network',       'Procurement',      'produce@feedingamerica.org',     'food_bank',      'national',   ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','herbs','peppers','squash','onion','potato'], 1000, TRUE, 'National food bank'),
  ('Second Harvest Heartland',      'Sourcing',         'donate@2harvest.org',            'food_bank',      'midwest',    ARRAY['avocado','tomato','citrus','onion','potato','squash','peppers','melons','leafy_greens'], 1000, TRUE, NULL),
  ('Los Angeles Regional Food Bank','Sourcing',         'produce@lafoodbank.org',         'food_bank',      'west_coast', ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','herbs','peppers','squash','onion','potato'], 1000, TRUE, NULL),
  ('Pro*Act Distress Desk',         'Sourcing',         'sourcing@proactusa.com',         'foodservice',    'national',   ARRAY['avocado','leafy_greens','tomato','citrus','peppers','melons','herbs','squash','onion'], 2500, TRUE, 'Foodservice distributor'),
  ('Sysco Salvage Program',         'Spot Buyer',       'spot-produce@sysco.com',         'foodservice',    'national',   ARRAY['avocado','leafy_greens','tomato','citrus','peppers','melons','herbs','squash','onion'], 5000, TRUE, NULL),
  ('US Foods Distress',             'Spot Buyer',       'spot@usfoods.com',               'foodservice',    'national',   ARRAY['avocado','leafy_greens','tomato','citrus','peppers','melons','herbs','squash','onion'], 5000, TRUE, NULL),
  ('Restaurant Depot Spot',         'Sourcing',         'spot@restaurantdepot.com',       'foodservice',    'national',   ARRAY['avocado','leafy_greens','tomato','citrus','peppers','melons','onion','squash'], 1500, TRUE, NULL),
  ('Aldi Sourcing - Produce',       'Sourcing',         'produce-spot@aldi.us',           'discount_chain', 'national',   ARRAY['avocado','tomato','citrus','onion','potato','melons','peppers','squash','leafy_greens','berries'], 3000, TRUE, NULL),
  ('Ranch 99 / Tawa Group',         'Sourcing',         'produce@99ranch.com',            'ethnic_retail',  'west_coast', ARRAY['avocado','tomato','citrus','peppers','melons','herbs','squash','onion','leafy_greens'], 1500, TRUE, 'Asian retail chain'),
  ('La Vaquita Markets',            'Sourcing',         'compras@lavaquitamarket.com',    'ethnic_retail',  'southwest',  ARRAY['avocado','tomato','citrus','peppers','melons','herbs','squash','onion','leafy_greens'], 1000, TRUE, 'Hispanic retail'),
  ('Vallarta Supermarkets',         'Sourcing',         'produce@vallartasupermarkets.com','ethnic_retail', 'west_coast', ARRAY['avocado','tomato','citrus','peppers','melons','herbs','squash','onion','leafy_greens'], 1500, TRUE, 'Hispanic retail'),
  ('Northgate Gonzalez Markets',    'Sourcing',         'produce@northgatemarkets.com',   'ethnic_retail',  'west_coast', ARRAY['avocado','tomato','citrus','peppers','melons','herbs','squash','onion','leafy_greens'], 1500, TRUE, 'Hispanic retail'),
  ('FreshPoint Distress',           'Spot Buyer',       'spot@freshpoint.com',            'foodservice',    'national',   ARRAY['avocado','leafy_greens','tomato','citrus','peppers','melons','herbs','squash','onion'], 2500, TRUE, NULL),
  ('Performance Food Group',        'Spot Buyer',       'spot@pfgc.com',                  'foodservice',    'national',   ARRAY['avocado','leafy_greens','tomato','citrus','peppers','melons','squash','onion'], 3000, TRUE, NULL),
  ('Wonderful Citrus Salvage',      'Sourcing',         'sourcing@wonderful.com',         'processor',      'west_coast', ARRAY['citrus'], 5000, TRUE, 'Citrus only - juice grade'),
  ('Naturipe Salvage',              'Sourcing',         'sourcing@naturipefarms.com',     'processor',      'national',   ARRAY['berries'], 2000, TRUE, 'Berries - frozen pack'),
  ('Driscolls Secondary',           'Sourcing',         'salvage@driscolls.com',          'processor',      'national',   ARRAY['berries'], 2000, TRUE, 'Berries - secondary market'),
  ('Mexausa Internal Salvage',      'Saul Garcia',      'saul@mexausafg.com',             'broker',         'national',   ARRAY['avocado','berries','leafy_greens','tomato','citrus','melons','herbs','peppers','squash','onion','potato'], 500, TRUE, 'Internal fallback')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW v_lane_summary AS
SELECT 'grower_push' AS lane, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pending_admin') AS pending,
       COUNT(*) FILTER (WHERE status = 'sent') AS sent
FROM pending_templates
UNION ALL
SELECT 'buyer_pull', COUNT(*),
       COUNT(*) FILTER (WHERE status = 'pending_admin'),
       COUNT(*) FILTER (WHERE status = 'sent')
FROM buyer_wants
UNION ALL
SELECT 'distress', COUNT(*),
       COUNT(*) FILTER (WHERE status = 'received'),
       COUNT(*) FILTER (WHERE status = 'blasted' OR status = 'sold')
FROM distress_uploads;

CREATE OR REPLACE VIEW v_distress_active_buyers AS
SELECT id, buyer_name, contact_name, email, region, commodities_accepted, closes_count, is_seed
FROM distress_buyers_top25
WHERE is_active = TRUE AND unsubscribed_at IS NULL
ORDER BY closes_count DESC, is_seed DESC, added_at ASC;

COMMENT ON TABLE buyer_wants IS 'Lane 2: Buyer-side want registry. Triggers grower outreach blast after admin approval.';
COMMENT ON TABLE distress_buyers_top25 IS 'Lane 3: Curated registry of fast-move buyers. Auto-promote on 3 closes (closes_count >= 3 + is_seed=FALSE).';
COMMENT ON TABLE distress_uploads IS 'Lane 3: Grower mobile MOVE NOW uploads. Bypasses admin queue. Quality-gated by 5 booleans.';
COMMENT ON TABLE match_history IS 'Cross-lane analytics: every match attempted, replayable, sellable metric.';
