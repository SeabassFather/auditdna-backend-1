-- C:\AuditDNA\backend\sql\seed-growers.sql
-- Phase 1 Day 5 - Seed 5 fixture growers for end-to-end RFQ cascade testing.
--
-- After running this:
--   - POST /api/rfq/create with commodity_category='avocados' will cascade to grower #1
--   - commodity_category='berries' → grower #2
--   - commodity_category='citrus' → grower #3
--   - commodity_category='tomatoes' → grower #4
--   - commodity_category='leafy_greens' → grower #5
--
-- Run via psql: cat seed-growers.sql | psql $DATABASE_URL

-- ============================================================================
-- Cleanup (idempotent)
-- ============================================================================
DELETE FROM growers WHERE email IN (
  'avocado-test@mexausafg.com',
  'berry-test@mexausafg.com',
  'citrus-test@mexausafg.com',
  'tomato-test@mexausafg.com',
  'lettuce-test@mexausafg.com'
);

-- ============================================================================
-- Grower 1: AVOCADO (Michoacan, MX)
-- ============================================================================
INSERT INTO growers (
  display_name, email, phone, country, state, region, status,
  commodities_grown, primary_commodity, certifications,
  grs_score, capacity_loads_per_week,
  rfc, paca_license, password_hash,
  created_at, last_active_at
) VALUES (
  'Aguacates del Bajio (TEST)', 'avocado-test@mexausafg.com', '+5246462000001',
  'MX', 'Michoacan', 'Uruapan', 'active',
  '["avocados"]'::jsonb, 'avocados',
  '["GlobalGAP", "FSMA-204", "USDA-Inspected"]'::jsonb,
  87, 12,
  'AGB230101ABC', NULL, '$2a$10$test.hash.placeholder.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 hours'
);

-- ============================================================================
-- Grower 2: BERRIES (Watsonville, CA)
-- ============================================================================
INSERT INTO growers (
  display_name, email, phone, country, state, region, status,
  commodities_grown, primary_commodity, certifications,
  grs_score, capacity_loads_per_week,
  ein, paca_license, password_hash,
  created_at, last_active_at
) VALUES (
  'Pajaro Valley Berry Farms (TEST)', 'berry-test@mexausafg.com', '+18312000002',
  'US', 'CA', 'Watsonville', 'active',
  '["berries"]'::jsonb, 'berries',
  '["PrimusGFS", "FSMA-204", "Organic"]'::jsonb,
  92, 8,
  '93-1000002', '2018-1234', '$2a$10$test.hash.placeholder.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  NOW() - INTERVAL '120 days', NOW() - INTERVAL '15 minutes'
);

-- ============================================================================
-- Grower 3: CITRUS (Sinaloa, MX)
-- ============================================================================
INSERT INTO growers (
  display_name, email, phone, country, state, region, status,
  commodities_grown, primary_commodity, certifications,
  grs_score, capacity_loads_per_week,
  rfc, paca_license, password_hash,
  created_at, last_active_at
) VALUES (
  'Citricos del Pacifico (TEST)', 'citrus-test@mexausafg.com', '+5246462000003',
  'MX', 'Sinaloa', 'Culiacan', 'active',
  '["citrus", "tropical"]'::jsonb, 'citrus',
  '["GlobalGAP", "Senasica"]'::jsonb,
  78, 15,
  'CDP190615XYZ', NULL, '$2a$10$test.hash.placeholder.cccccccccccccccccccccccccccccc',
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '6 hours'
);

-- ============================================================================
-- Grower 4: TOMATOES (Sinaloa, MX)
-- ============================================================================
INSERT INTO growers (
  display_name, email, phone, country, state, region, status,
  commodities_grown, primary_commodity, certifications,
  grs_score, capacity_loads_per_week,
  rfc, paca_license, password_hash,
  created_at, last_active_at
) VALUES (
  'Tomates Premium del Norte (TEST)', 'tomato-test@mexausafg.com', '+5246462000004',
  'MX', 'Sinaloa', 'Los Mochis', 'active',
  '["tomatoes", "peppers"]'::jsonb, 'tomatoes',
  '["GlobalGAP", "FSMA-204", "Senasica"]'::jsonb,
  84, 20,
  'TPN200320ABC', NULL, '$2a$10$test.hash.placeholder.dddddddddddddddddddddddddddddd',
  NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 minutes'
);

-- ============================================================================
-- Grower 5: LEAFY GREENS (Salinas, CA)
-- ============================================================================
INSERT INTO growers (
  display_name, email, phone, country, state, region, status,
  commodities_grown, primary_commodity, certifications,
  grs_score, capacity_loads_per_week,
  ein, paca_license, password_hash,
  created_at, last_active_at
) VALUES (
  'Salinas Fresh Harvest Co (TEST)', 'lettuce-test@mexausafg.com', '+18312000005',
  'US', 'CA', 'Salinas', 'active',
  '["leafy_greens", "lettuce", "cruciferous"]'::jsonb, 'leafy_greens',
  '["PrimusGFS", "FSMA-204", "USDA-Inspected", "California-LGMA"]'::jsonb,
  95, 25,
  '94-1000005', '2015-5678', '$2a$10$test.hash.placeholder.eeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  NOW() - INTERVAL '200 days', NOW() - INTERVAL '5 minutes'
);

-- ============================================================================
-- Verify
-- ============================================================================
SELECT id, display_name, country, primary_commodity, grs_score, status
  FROM growers
 WHERE email LIKE '%-test@mexausafg.com'
 ORDER BY id;
