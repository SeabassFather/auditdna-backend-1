-- C:\AuditDNA\backend\sql\seed-growers.sql (v2 - matches actual schema)
-- Phase 1 Day 5 - 5 fixture growers using REAL column names.
--
-- Real schema uses: company_name, contact_name, state_province (not state),
-- crops_grown ARRAY (not commodities_grown jsonb), tier_level (not tier).
--
-- Run: Get-Content seed-growers.sql | psql $env:DATABASE_URL

-- ============================================================================
-- Cleanup (idempotent)
-- ============================================================================
DELETE FROM growers WHERE email LIKE '%-test@mexausafg.com';

-- ============================================================================
-- Grower 1: AVOCADOS (Michoacan, MX)
-- ============================================================================
INSERT INTO growers (
  grower_code, company_name, contact_name, email, phone, whatsapp,
  country, state_province, state, city, region, municipality,
  crops_grown, primary_product, primary_products,
  certification_type, certifications, status, verified,
  grs_score, tier_level, compliance_score, fsma_compliant, gfsi_certified, organic,
  language, source, business_name, tax_id,
  created_at, updated_at
) VALUES (
  'GRW-TEST-AVO-001', 'Aguacates del Bajio (TEST)', 'Carlos Mendoza',
  'avocado-test@mexausafg.com', '+5246462000001', '+5246462000001',
  'MX', 'Michoacan', 'Michoacan', 'Uruapan', 'Uruapan', 'Uruapan',
  ARRAY['avocados'], 'avocados', ARRAY['avocados'],
  'GlobalGAP', 'GlobalGAP, FSMA-204, USDA-Inspected', 'active', TRUE,
  87, 1, 87, TRUE, TRUE, FALSE,
  'es', 'seed-day5', 'Aguacates del Bajio S.A. de C.V.', 'AGB230101ABC',
  NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 hours'
);

-- ============================================================================
-- Grower 2: BERRIES (Watsonville, CA)
-- ============================================================================
INSERT INTO growers (
  grower_code, company_name, contact_name, email, phone, whatsapp,
  country, state_province, state, city, region,
  crops_grown, primary_product, primary_products,
  certification_type, certifications, status, verified,
  grs_score, tier_level, compliance_score, fsma_compliant, gfsi_certified, organic,
  language, source, business_name, tax_id, license_number,
  created_at, updated_at
) VALUES (
  'GRW-TEST-BER-002', 'Pajaro Valley Berry Farms (TEST)', 'Maria Hernandez',
  'berry-test@mexausafg.com', '+18312000002', '+18312000002',
  'US', 'CA', 'CA', 'Watsonville', 'Watsonville',
  ARRAY['berries'], 'berries', ARRAY['berries'],
  'PrimusGFS', 'PrimusGFS, FSMA-204, Organic', 'active', TRUE,
  92, 1, 92, TRUE, TRUE, TRUE,
  'en', 'seed-day5', 'Pajaro Valley Berry Farms LLC', '93-1000002', '2018-1234',
  NOW() - INTERVAL '120 days', NOW() - INTERVAL '15 minutes'
);

-- ============================================================================
-- Grower 3: CITRUS (Sinaloa, MX)
-- ============================================================================
INSERT INTO growers (
  grower_code, company_name, contact_name, email, phone, whatsapp,
  country, state_province, state, city, region,
  crops_grown, primary_product, primary_products,
  certification_type, certifications, status, verified,
  grs_score, tier_level, compliance_score, fsma_compliant, organic,
  language, source, business_name, tax_id,
  created_at, updated_at
) VALUES (
  'GRW-TEST-CIT-003', 'Citricos del Pacifico (TEST)', 'Roberto Sanchez',
  'citrus-test@mexausafg.com', '+5246462000003', '+5246462000003',
  'MX', 'Sinaloa', 'Sinaloa', 'Culiacan', 'Culiacan',
  ARRAY['citrus','tropical'], 'citrus', ARRAY['citrus','tropical'],
  'GlobalGAP', 'GlobalGAP, Senasica', 'active', TRUE,
  78, 2, 78, TRUE, FALSE,
  'es', 'seed-day5', 'Citricos del Pacifico S.A.', 'CDP190615XYZ',
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '6 hours'
);

-- ============================================================================
-- Grower 4: TOMATOES (Sinaloa, MX)
-- ============================================================================
INSERT INTO growers (
  grower_code, company_name, contact_name, email, phone, whatsapp,
  country, state_province, state, city, region,
  crops_grown, primary_product, primary_products,
  certification_type, certifications, status, verified,
  grs_score, tier_level, compliance_score, fsma_compliant, gfsi_certified, organic,
  language, source, business_name, tax_id,
  created_at, updated_at
) VALUES (
  'GRW-TEST-TOM-004', 'Tomates Premium del Norte (TEST)', 'Luis Vargas',
  'tomato-test@mexausafg.com', '+5246462000004', '+5246462000004',
  'MX', 'Sinaloa', 'Sinaloa', 'Los Mochis', 'Los Mochis',
  ARRAY['tomatoes','peppers'], 'tomatoes', ARRAY['tomatoes','peppers'],
  'GlobalGAP', 'GlobalGAP, FSMA-204, Senasica', 'active', TRUE,
  84, 1, 84, TRUE, TRUE, FALSE,
  'es', 'seed-day5', 'Tomates Premium del Norte S.A. de C.V.', 'TPN200320ABC',
  NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 minutes'
);

-- ============================================================================
-- Grower 5: LEAFY GREENS (Salinas, CA)
-- ============================================================================
INSERT INTO growers (
  grower_code, company_name, contact_name, email, phone, whatsapp,
  country, state_province, state, city, region,
  crops_grown, primary_product, primary_products,
  certification_type, certifications, status, verified,
  grs_score, tier_level, compliance_score, fsma_compliant, gfsi_certified, organic,
  language, source, business_name, tax_id, license_number,
  created_at, updated_at
) VALUES (
  'GRW-TEST-LET-005', 'Salinas Fresh Harvest Co (TEST)', 'Patricia Romero',
  'lettuce-test@mexausafg.com', '+18312000005', '+18312000005',
  'US', 'CA', 'CA', 'Salinas', 'Salinas',
  ARRAY['leafy_greens','lettuce','cruciferous'], 'leafy_greens', ARRAY['leafy_greens','lettuce','cruciferous'],
  'PrimusGFS', 'PrimusGFS, FSMA-204, USDA-Inspected, California-LGMA', 'active', TRUE,
  95, 1, 95, TRUE, TRUE, FALSE,
  'en', 'seed-day5', 'Salinas Fresh Harvest Co.', '94-1000005', '2015-5678',
  NOW() - INTERVAL '200 days', NOW() - INTERVAL '5 minutes'
);

-- ============================================================================
-- Verify
-- ============================================================================
SELECT id, company_name, country, primary_product, grs_score, status, crops_grown
  FROM growers
 WHERE email LIKE '%-test@mexausafg.com'
 ORDER BY id;
