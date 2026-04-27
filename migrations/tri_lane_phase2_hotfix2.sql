-- =============================================================================
-- File: tri_lane_phase2_hotfix2.sql
-- Save to: C:\AuditDNA\backend\migrations\tri_lane_phase2_hotfix2.sql
-- =============================================================================
-- Sprint D Wave 3A.6.1 - Rebuild v_distress_active_buyers (was nuked by hotfix1)
--
-- Bug:  Hotfix1 referenced columns that don't exist in distress_buyers_top25:
--       - last_close_at  (does NOT exist)
--       - phone, whatsapp, min_load_size_lbs, notes, added_by  (DO exist)
--
-- Real schema columns (from Wave 3A original):
--   id, buyer_name, contact_name, email, phone, whatsapp,
--   buyer_type, region, commodities_accepted, min_load_size_lbs,
--   max_response_minutes, closes_count, is_active, is_seed, notes,
--   added_by, added_at, last_blasted_at, last_responded_at, unsubscribed_at
--   PLUS Wave 3A.5 added: tier, priority_rank
--
-- This rebuild uses ONLY columns that actually exist. Idempotent.
-- =============================================================================

CREATE OR REPLACE VIEW v_distress_active_buyers AS
SELECT
  id, buyer_name, contact_name, email, phone, whatsapp,
  buyer_type, region, commodities_accepted, min_load_size_lbs,
  max_response_minutes, closes_count,
  tier, priority_rank,
  notes, added_by, added_at, is_seed,
  last_blasted_at, last_responded_at,
  is_active, unsubscribed_at
FROM distress_buyers_top25
WHERE is_active = TRUE AND unsubscribed_at IS NULL
ORDER BY tier ASC NULLS LAST, priority_rank ASC NULLS LAST, closes_count DESC, is_seed DESC, added_at ASC;

COMMENT ON VIEW v_distress_active_buyers IS
  'Wave 3A.6.1: Rebuilt with correct columns (tier + priority_rank exposed for cascade visibility).';
