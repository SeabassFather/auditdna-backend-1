-- =============================================================================
-- File: factor_engine_hotfix.sql
-- Save to: C:\AuditDNA\backend\migrations\factor_engine_hotfix.sql
-- =============================================================================
-- Sprint D Wave 3B Hotfix
--
-- Original factor_engine.sql had 3 INSERT blocks where the column list
-- declared 10 columns but the VALUES tuples only provided 9 (missing
-- the is_seed column). Result: ALL 25 Tier 1 + Tier 2 buyers failed to
-- insert. Only the 6 Tier 3 buyers (last block) succeeded.
--
-- This hotfix re-runs all 3 INSERT blocks with the corrected VALUES
-- (is_seed = TRUE explicitly added to every row).
--
-- Idempotent: ON CONFLICT DO NOTHING means safe to re-run.
-- =============================================================================

-- =============================================================================
-- Tier 1 (premium) - 13 buyers - is_seed = TRUE
-- =============================================================================
INSERT INTO factor_buyers (buyer_name, buyer_aliases, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region, is_seed, notes) VALUES
  ('Sysco',                  ARRAY['Sysco Corp','SYSCO Foods','Sysco USA','SYSCO LLC'],         1, 28, 99.5, 'mega',  'foodservice', 'national',   TRUE, '#1 US foodservice distributor'),
  ('US Foods',               ARRAY['USF','US Foods Inc','USFD','U.S. Foods'],                   1, 28, 99,   'mega',  'foodservice', 'national',   TRUE, '#2 US foodservice'),
  ('Performance Food Group', ARRAY['PFG','Performance Foods'],                                  1, 30, 98,   'mega',  'foodservice', 'national',   TRUE, '#3 US foodservice'),
  ('Walmart',                ARRAY['Walmart Inc','Wal-Mart','Walmart Stores'],                  1, 30, 99.9, 'mega',  'retail',      'national',   TRUE, 'Largest retailer in world'),
  ('Costco',                 ARRAY['Costco Wholesale','Costco LLC'],                            1, 21, 99.5, 'mega',  'retail',      'national',   TRUE, 'Membership warehouse'),
  ('Kroger',                 ARRAY['The Kroger Company','Kroger Co'],                           1, 28, 98,   'mega',  'retail',      'national',   TRUE, '#1 US grocer'),
  ('Albertsons',             ARRAY['Albertsons Companies','Safeway','Albertsons-Safeway'],      1, 30, 97,   'mega',  'retail',      'national',   TRUE, 'Multi-banner grocery'),
  ('Publix',                 ARRAY['Publix Super Markets'],                                     1, 28, 99,   'mega',  'retail',      'southeast',  TRUE, 'Florida-based'),
  ('Whole Foods',            ARRAY['Whole Foods Market','WFM','Amazon Whole Foods'],            1, 30, 99,   'large', 'retail',      'national',   TRUE, 'Amazon-owned premium'),
  ('H-E-B',                  ARRAY['HEB','HEB Grocery','H-E-B LP'],                             1, 28, 99,   'large', 'retail',      'southwest',  TRUE, 'Texas dominant'),
  ('Wegmans',                ARRAY['Wegmans Food Markets'],                                     1, 30, 99,   'large', 'retail',      'northeast',  TRUE, 'Premium Northeast'),
  ('Driscolls',              ARRAY['Driscoll''s','Driscoll Strawberry','Driscolls Inc'],        1, 30, 98,   'large', 'distributor', 'national',   TRUE, 'Berry leader'),
  ('Pro*Act',                ARRAY['ProAct','Pro-Act','ProAct LLC'],                            1, 28, 97,   'large', 'foodservice', 'national',   TRUE, 'Co-op of regional distributors')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Tier 2 (mid) - 12 buyers - is_seed = TRUE
-- =============================================================================
INSERT INTO factor_buyers (buyer_name, buyer_aliases, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region, is_seed, notes) VALUES
  ('FreshPoint',            ARRAY['Fresh Point','FreshPoint Sysco'],            2, 30, 95, 'mid',   'foodservice', 'national',   TRUE, 'Sysco produce subsidiary'),
  ('Trader Joe''s',         ARRAY['Trader Joes','TJ','Traders'],                2, 35, 96, 'large', 'retail',      'national',   TRUE, 'Specialty retailer'),
  ('Sprouts',               ARRAY['Sprouts Farmers Market','Sprouts FM'],       2, 30, 95, 'large', 'retail',      'national',   TRUE, 'Health-focused chain'),
  ('Smart & Final',         ARRAY['Smart Final','SmartFinal'],                  2, 30, 93, 'mid',   'retail',      'west_coast', TRUE, 'Warehouse-style'),
  ('Restaurant Depot',      ARRAY['Rest Depot','RD'],                           2, 21, 95, 'mid',   'foodservice', 'national',   TRUE, 'Cash-and-carry to restaurants'),
  ('Aldi',                  ARRAY['Aldi Inc','Aldi US','Aldi USA'],             2, 30, 96, 'large', 'retail',      'national',   TRUE, 'Discount grocer'),
  ('Vallarta Supermarkets', ARRAY['Vallarta','Vallarta Markets'],               2, 35, 92, 'mid',   'retail',      'west_coast', TRUE, 'Hispanic SoCal'),
  ('Northgate Gonzalez',    ARRAY['Northgate','Northgate Markets'],             2, 35, 92, 'mid',   'retail',      'west_coast', TRUE, 'Hispanic SoCal'),
  ('Ranch 99',              ARRAY['Ranch 99 Market','99 Ranch','Tawa Group'],   2, 35, 91, 'mid',   'retail',      'west_coast', TRUE, 'Asian-American grocer'),
  ('Naturipe',              ARRAY['Naturipe Farms','Naturipe LLC'],             2, 30, 95, 'large', 'distributor', 'national',   TRUE, 'Berry coop'),
  ('Imperfect Foods',       ARRAY['Imperfect Produce','Imperfect Inc'],         2, 21, 94, 'mid',   'retail',      'national',   TRUE, 'Direct-to-consumer salvage'),
  ('Misfits Market',        ARRAY['Misfits','Misfits Inc'],                     2, 21, 93, 'mid',   'retail',      'national',   TRUE, 'D2C salvage')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Verify final counts
-- =============================================================================
SELECT credit_tier, COUNT(*) AS buyer_count
FROM factor_buyers
WHERE is_active = TRUE
GROUP BY credit_tier
ORDER BY credit_tier;
