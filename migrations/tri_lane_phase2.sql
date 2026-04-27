-- =============================================================================
-- File: tri_lane_phase2.sql
-- Save to: C:\AuditDNA\backend\migrations\tri_lane_phase2.sql
-- =============================================================================
-- Sprint D Wave 3A.5 - Mexausa First-Right-of-Refusal + 3-Tier Cascade
--
-- Adds:
--   1. mexausa_internal_offers       - 15-minute first-buy window
--   2. distress_buyers_top25.tier   - Tier 1/2/3 column for staged cascade
--   3. distress_uploads cascade cols - track which tiers fired and when
--   4. commodity_aliases             - normalize "Iceberg Lettuce" -> "leafy_greens"
--   5. v_internal_offer_queue        - active offers admin needs to decide
--
-- Idempotent. Safe to re-run.
-- =============================================================================

-- =============================================================================
-- 1. MEXAUSA INTERNAL OFFERS (first-right-of-refusal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS mexausa_internal_offers (
  id              SERIAL PRIMARY KEY,
  upload_id       INTEGER REFERENCES distress_uploads(id) ON DELETE CASCADE,
  -- Inventory snapshot
  commodity       TEXT NOT NULL,
  variety         TEXT,
  volume_lbs      NUMERIC,
  unit            TEXT DEFAULT 'lb',
  price_fob       NUMERIC NOT NULL,
  fob_location    TEXT,
  total_value_usd NUMERIC,
  -- Grower info
  grower_id       INTEGER,
  grower_name     TEXT,
  grower_phone    TEXT,
  grower_email    TEXT,
  -- Decision window
  expires_at      TIMESTAMP NOT NULL,
  window_minutes  INTEGER DEFAULT 15,
  -- Decision
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  decided_by      INTEGER,
  decided_by_name TEXT,
  decided_at      TIMESTAMP,
  decision_notes  TEXT,
  -- If accepted, what next
  internal_truck_id    TEXT,
  internal_route       TEXT,
  internal_target_buyer TEXT,
  -- Audit
  notified_admins  TEXT[],
  notified_at      TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mio_status   ON mexausa_internal_offers(status);
CREATE INDEX IF NOT EXISTS idx_mio_expires  ON mexausa_internal_offers(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_mio_upload   ON mexausa_internal_offers(upload_id);
CREATE INDEX IF NOT EXISTS idx_mio_created  ON mexausa_internal_offers(created_at DESC);

-- =============================================================================
-- 2. TIER COLUMN ON TOP-25 (Tier 1=instant, 2=+5m, 3=+15m)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='distress_buyers_top25' AND column_name='tier') THEN
    ALTER TABLE distress_buyers_top25 ADD COLUMN tier INTEGER DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='distress_buyers_top25' AND column_name='priority_rank') THEN
    ALTER TABLE distress_buyers_top25 ADD COLUMN priority_rank INTEGER DEFAULT 100;
  END IF;
END $$;

-- Assign tiers to seed data
-- TIER 1 (instant) - 5 closest, fastest, most reliable
UPDATE distress_buyers_top25 SET tier=1, priority_rank=1
  WHERE buyer_name='Grocery Outlet Bargain Market';
UPDATE distress_buyers_top25 SET tier=1, priority_rank=2
  WHERE buyer_name='Grocery Outlet - Fresh Pull';
UPDATE distress_buyers_top25 SET tier=1, priority_rank=3
  WHERE buyer_name='Smart & Final Distress Desk';
UPDATE distress_buyers_top25 SET tier=1, priority_rank=4
  WHERE buyer_name='99 Cents Only Stores Produce';
UPDATE distress_buyers_top25 SET tier=1, priority_rank=5
  WHERE buyer_name='Mexausa Internal Salvage';

-- TIER 2 (T+5m) - secondary salvage and large foodservice
UPDATE distress_buyers_top25 SET tier=2, priority_rank=10 WHERE buyer_name='Imperfect Foods Rescue';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=11 WHERE buyer_name='Misfits Market Sourcing';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=12 WHERE buyer_name='Flashfood Distress';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=13 WHERE buyer_name='Sysco Salvage Program';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=14 WHERE buyer_name='US Foods Distress';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=15 WHERE buyer_name='Pro*Act Distress Desk';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=16 WHERE buyer_name='Aldi Sourcing - Produce';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=17 WHERE buyer_name='Restaurant Depot Spot';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=18 WHERE buyer_name='FreshPoint Distress';
UPDATE distress_buyers_top25 SET tier=2, priority_rank=19 WHERE buyer_name='Performance Food Group';

-- TIER 3 (T+15m) - everyone else (food banks, ethnic retail, processors)
UPDATE distress_buyers_top25 SET tier=3, priority_rank=20 WHERE buyer_name='Feeding America Network';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=21 WHERE buyer_name='Second Harvest Heartland';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=22 WHERE buyer_name='Los Angeles Regional Food Bank';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=23 WHERE buyer_name='Ranch 99 / Tawa Group';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=24 WHERE buyer_name='La Vaquita Markets';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=25 WHERE buyer_name='Vallarta Supermarkets';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=26 WHERE buyer_name='Northgate Gonzalez Markets';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=27 WHERE buyer_name='Wonderful Citrus Salvage';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=28 WHERE buyer_name='Naturipe Salvage';
UPDATE distress_buyers_top25 SET tier=3, priority_rank=29 WHERE buyer_name='Driscolls Secondary';

CREATE INDEX IF NOT EXISTS idx_top25_tier ON distress_buyers_top25(tier, priority_rank);

-- =============================================================================
-- 3. DISTRESS UPLOAD CASCADE COLUMNS
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distress_uploads' AND column_name='mexausa_first_offer') THEN
    ALTER TABLE distress_uploads ADD COLUMN mexausa_first_offer BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distress_uploads' AND column_name='mexausa_offer_id') THEN
    ALTER TABLE distress_uploads ADD COLUMN mexausa_offer_id INTEGER REFERENCES mexausa_internal_offers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='distress_uploads' AND column_name='tier1_fired_at') THEN
    ALTER TABLE distress_uploads ADD COLUMN tier1_fired_at TIMESTAMP;
    ALTER TABLE distress_uploads ADD COLUMN tier2_fired_at TIMESTAMP;
    ALTER TABLE distress_uploads ADD COLUMN tier3_fired_at TIMESTAMP;
    ALTER TABLE distress_uploads ADD COLUMN tier1_recipients TEXT[];
    ALTER TABLE distress_uploads ADD COLUMN tier2_recipients TEXT[];
    ALTER TABLE distress_uploads ADD COLUMN tier3_recipients TEXT[];
  END IF;
END $$;

-- =============================================================================
-- 4. COMMODITY ALIASES (Iceberg Lettuce -> leafy_greens)
-- =============================================================================
CREATE TABLE IF NOT EXISTS commodity_aliases (
  id          SERIAL PRIMARY KEY,
  alias       TEXT NOT NULL,
  category    TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alias_unique ON commodity_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_alias_cat ON commodity_aliases(category);

-- Seed common produce aliases
INSERT INTO commodity_aliases (alias, category) VALUES
  ('iceberg lettuce','leafy_greens'),
  ('romaine','leafy_greens'),
  ('romaine lettuce','leafy_greens'),
  ('green leaf','leafy_greens'),
  ('red leaf','leafy_greens'),
  ('butter lettuce','leafy_greens'),
  ('spinach','leafy_greens'),
  ('arugula','leafy_greens'),
  ('kale','leafy_greens'),
  ('collard','leafy_greens'),
  ('chard','leafy_greens'),
  ('cabbage','leafy_greens'),
  ('mixed greens','leafy_greens'),
  ('hass avocado','avocado'),
  ('avocado 48ct','avocado'),
  ('strawberry','berries'),
  ('strawberries','berries'),
  ('blueberry','berries'),
  ('blueberries','berries'),
  ('raspberry','berries'),
  ('raspberries','berries'),
  ('blackberry','berries'),
  ('blackberries','berries'),
  ('roma tomato','tomato'),
  ('roma tomatoes','tomato'),
  ('vine tomato','tomato'),
  ('cherry tomato','tomato'),
  ('grape tomato','tomato'),
  ('orange','citrus'),
  ('oranges','citrus'),
  ('lemon','citrus'),
  ('lemons','citrus'),
  ('lime','citrus'),
  ('limes','citrus'),
  ('grapefruit','citrus'),
  ('mandarin','citrus'),
  ('clementine','citrus'),
  ('cantaloupe','melons'),
  ('honeydew','melons'),
  ('watermelon','melons'),
  ('cilantro','herbs'),
  ('parsley','herbs'),
  ('basil','herbs'),
  ('mint','herbs'),
  ('bell pepper','peppers'),
  ('bell peppers','peppers'),
  ('jalapeno','peppers'),
  ('serrano','peppers'),
  ('poblano','peppers'),
  ('habanero','peppers'),
  ('zucchini','squash'),
  ('yellow squash','squash'),
  ('butternut','squash'),
  ('acorn squash','squash'),
  ('white onion','onion'),
  ('yellow onion','onion'),
  ('red onion','onion'),
  ('russet potato','potato'),
  ('red potato','potato'),
  ('yukon gold','potato'),
  ('broccoli','leafy_greens'),
  ('cauliflower','leafy_greens'),
  ('asparagus','leafy_greens')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW v_internal_offer_queue AS
SELECT
  io.id, io.upload_id,
  io.commodity, io.variety, io.volume_lbs, io.unit,
  io.price_fob, io.total_value_usd, io.fob_location,
  io.grower_name, io.grower_phone, io.grower_email,
  io.expires_at, io.window_minutes,
  io.status, io.created_at,
  EXTRACT(EPOCH FROM (io.expires_at - NOW())) AS seconds_remaining
FROM mexausa_internal_offers io
WHERE io.status = 'pending'
ORDER BY io.expires_at ASC;

CREATE OR REPLACE VIEW v_distress_cascade_status AS
SELECT
  du.id AS upload_id, du.commodity, du.volume_lbs, du.price_fob, du.fob_location,
  du.mexausa_first_offer,
  io.status AS mexausa_offer_status,
  io.expires_at AS mexausa_offer_expires,
  du.tier1_fired_at, du.tier2_fired_at, du.tier3_fired_at,
  ARRAY_LENGTH(du.tier1_recipients, 1) AS tier1_count,
  ARRAY_LENGTH(du.tier2_recipients, 1) AS tier2_count,
  ARRAY_LENGTH(du.tier3_recipients, 1) AS tier3_count,
  du.status, du.created_at, du.closed_at
FROM distress_uploads du
LEFT JOIN mexausa_internal_offers io ON du.mexausa_offer_id = io.id
ORDER BY du.created_at DESC;

COMMENT ON TABLE mexausa_internal_offers IS 'Wave 3A.5: Mexausa Food Group first-right-of-refusal. 15-min default window. Accept = buy direct + cancel cascade. Decline/expire = cascade fires.';
COMMENT ON TABLE commodity_aliases IS 'Wave 3A.5: Normalizes commodity names to category tags used by distress_buyers_top25.commodities_accepted arrays.';
COMMENT ON COLUMN distress_buyers_top25.tier IS 'Wave 3A.5: 1=instant blast, 2=T+5min, 3=T+15min. Within tier sorted by priority_rank.';
