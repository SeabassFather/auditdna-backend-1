-- =============================================================================
-- File: tri_lane_phase2_hotfix.sql
-- Save to: C:\AuditDNA\backend\migrations\tri_lane_phase2_hotfix.sql
-- =============================================================================
-- Sprint D Wave 3A.6 - Tier visibility hotfix
--
-- Bug 1: v_distress_active_buyers does not expose tier or priority_rank columns,
--        so /api/niner/top25 returns rows but PowerShell Group-Object on `tier`
--        gets nothing to group on (column is missing from result set).
--
-- Bug 2: Seeded commodities_accepted arrays were built before the normalizer
--        existed, so 4 of the 25 buyers do not match leafy_greens category.
--        Total tier match = 21, not 25.
--
-- This file ONLY fixes the two real bugs. Idempotent. Safe to re-run.
-- =============================================================================

-- ===== Fix 1: rebuild view with tier columns exposed =====
DROP VIEW IF EXISTS v_distress_active_buyers CASCADE;

CREATE VIEW v_distress_active_buyers AS
SELECT
  id, buyer_name, contact_name, email, phone, whatsapp,
  buyer_type, region, commodities_accepted, min_load_size_lbs,
  notes, added_by, added_at, is_seed,
  closes_count, last_close_at,
  tier, priority_rank,
  is_active, unsubscribed_at
FROM distress_buyers_top25
WHERE is_active = TRUE AND unsubscribed_at IS NULL
ORDER BY tier ASC NULLS LAST, priority_rank ASC NULLS LAST, closes_count DESC;

-- ===== Fix 2: backfill commodities_accepted on seed buyers =====
-- All top-25 should accept leafy_greens at minimum (most common distress category)
-- plus their natural specialty list

UPDATE distress_buyers_top25
SET commodities_accepted = ARRAY[
  'leafy_greens','tomato','peppers','squash','onion','potato',
  'avocado','citrus','melons','berries','herbs'
]
WHERE buyer_name IN (
  'Grocery Outlet Bargain Market',
  'Grocery Outlet - Fresh Pull',
  'Smart & Final Distress Desk',
  '99 Cents Only Stores Produce',
  'Mexausa Internal Salvage',
  'Imperfect Foods Rescue',
  'Misfits Market Sourcing',
  'Flashfood Distress',
  'Sysco Salvage Program',
  'US Foods Distress',
  'Pro*Act Distress Desk',
  'Aldi Sourcing - Produce',
  'Restaurant Depot Spot',
  'FreshPoint Distress',
  'Performance Food Group',
  'Feeding America Network',
  'Second Harvest Heartland',
  'Los Angeles Regional Food Bank'
);

-- Specialty buyers with narrower lists
UPDATE distress_buyers_top25
SET commodities_accepted = ARRAY['leafy_greens','tomato','peppers','onion','citrus','herbs','melons']
WHERE buyer_name IN (
  'Ranch 99 / Tawa Group',
  'La Vaquita Markets',
  'Vallarta Supermarkets',
  'Northgate Gonzalez Markets'
);

UPDATE distress_buyers_top25
SET commodities_accepted = ARRAY['citrus','avocado']
WHERE buyer_name = 'Wonderful Citrus Salvage';

UPDATE distress_buyers_top25
SET commodities_accepted = ARRAY['berries','leafy_greens']
WHERE buyer_name = 'Naturipe Salvage';

UPDATE distress_buyers_top25
SET commodities_accepted = ARRAY['berries']
WHERE buyer_name = 'Driscolls Secondary';

COMMENT ON VIEW v_distress_active_buyers IS
  'Wave 3A.6: now exposes tier + priority_rank for cascade visibility';
