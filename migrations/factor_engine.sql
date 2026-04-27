-- =============================================================================
-- File: factor_engine.sql
-- Save to: C:\AuditDNA\backend\migrations\factor_engine.sql
-- =============================================================================
-- Sprint D Wave 3B - Factor Engine schema
--
-- Builds:
--   1. factor_buyers           - credit tier registry for QPF scoring
--   2. factor_partners         - 10 factoring partners + tier gating
--   3. factor_invoice_photos   - base64 photos stored as TEXT (server-side)
--   4. factor_score_history    - audit log: every QPF calc, replayable
--   5. v_factor_partner_active - active partners ordered by tier match
--   6. v_factor_buyer_lookup   - buyer name -> tier with fuzzy fallback
--
-- Idempotent. Safe to re-run. NO modifications to existing financing_deals.
-- =============================================================================

-- =============================================================================
-- 1. FACTOR_BUYERS - credit tier registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS factor_buyers (
  id              SERIAL PRIMARY KEY,
  buyer_name      TEXT NOT NULL,
  buyer_aliases   TEXT[],                -- ['SYSCO Foods','SYSCO LLC','Sysco Corp']
  -- Credit tier: 1=premium (Sysco, USF), 2=mid (regional chains), 3=watch (small/new)
  credit_tier     INTEGER NOT NULL DEFAULT 2 CHECK (credit_tier IN (1, 2, 3)),
  -- Net days they typically pay - faster = better factor terms
  typical_paydays NUMERIC,               -- 28.5 = average days to pay
  -- Pay reliability % (0-100)
  pay_reliability NUMERIC DEFAULT 95,
  -- Annual revenue tier ('mega','large','mid','small','micro')
  size_tier       TEXT,
  -- Industry segment
  segment         TEXT,                  -- 'foodservice','retail','distributor','export','salvage'
  -- Geography
  region          TEXT,                  -- 'national','west_coast','southwest','northeast' etc
  -- Active flag
  is_active       BOOLEAN DEFAULT TRUE,
  is_seed         BOOLEAN DEFAULT FALSE,
  -- Metadata
  notes           TEXT,
  added_by        INTEGER,
  added_at        TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_factor_buyer_name_lc ON factor_buyers(LOWER(buyer_name));
CREATE INDEX IF NOT EXISTS idx_factor_buyer_tier   ON factor_buyers(credit_tier);
CREATE INDEX IF NOT EXISTS idx_factor_buyer_active ON factor_buyers(is_active) WHERE is_active = TRUE;

-- Seed premium tier (Tier 1) - the buyers Sysco/USF/big retail
INSERT INTO factor_buyers (buyer_name, buyer_aliases, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region, is_seed, notes) VALUES
  ('Sysco',                  ARRAY['Sysco Corp','SYSCO Foods','Sysco USA','SYSCO LLC'],         1, 28, 99.5, 'mega',  'foodservice','national','#1 US foodservice distributor'),
  ('US Foods',               ARRAY['USF','US Foods Inc','USFD','U.S. Foods'],                   1, 28, 99,   'mega',  'foodservice','national','#2 US foodservice'),
  ('Performance Food Group', ARRAY['PFG','Performance Foods'],                                  1, 30, 98,   'mega',  'foodservice','national','#3 US foodservice'),
  ('Walmart',                ARRAY['Walmart Inc','Wal-Mart','Walmart Stores'],                  1, 30, 99.9, 'mega',  'retail',     'national','Largest retailer in world'),
  ('Costco',                 ARRAY['Costco Wholesale','Costco LLC'],                            1, 21, 99.5, 'mega',  'retail',     'national','Membership warehouse'),
  ('Kroger',                 ARRAY['The Kroger Company','Kroger Co'],                           1, 28, 98,   'mega',  'retail',     'national','#1 US grocer'),
  ('Albertsons',             ARRAY['Albertsons Companies','Safeway','Albertsons-Safeway'],      1, 30, 97,   'mega',  'retail',     'national','Multi-banner grocery'),
  ('Publix',                 ARRAY['Publix Super Markets'],                                     1, 28, 99,   'mega',  'retail',     'southeast','Florida-based'),
  ('Whole Foods',            ARRAY['Whole Foods Market','WFM','Amazon Whole Foods'],            1, 30, 99,   'large', 'retail',     'national','Amazon-owned premium'),
  ('H-E-B',                  ARRAY['HEB','HEB Grocery','H-E-B LP'],                             1, 28, 99,   'large', 'retail',     'southwest','Texas dominant'),
  ('Wegmans',                ARRAY['Wegmans Food Markets'],                                     1, 30, 99,   'large', 'retail',     'northeast','Premium Northeast'),
  ('Driscolls',              ARRAY['Driscoll''s','Driscoll Strawberry','Driscolls Inc'],        1, 30, 98,   'large', 'distributor','national','Berry leader'),
  ('Pro*Act',                ARRAY['ProAct','Pro-Act','ProAct LLC'],                            1, 28, 97,   'large', 'foodservice','national','Co-op of regional distributors')
ON CONFLICT DO NOTHING;

-- Seed mid tier (Tier 2) - regional chains and salvage
INSERT INTO factor_buyers (buyer_name, buyer_aliases, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region, is_seed, notes) VALUES
  ('FreshPoint',                ARRAY['Fresh Point','FreshPoint Sysco'],                      2, 30, 95, 'mid',   'foodservice','national','Sysco produce subsidiary'),
  ('Trader Joe''s',             ARRAY['Trader Joes','TJ','Traders'],                          2, 35, 96, 'large', 'retail',     'national','Specialty retailer'),
  ('Sprouts',                   ARRAY['Sprouts Farmers Market','Sprouts FM'],                 2, 30, 95, 'large', 'retail',     'national','Health-focused chain'),
  ('Smart & Final',             ARRAY['Smart Final','SmartFinal'],                            2, 30, 93, 'mid',   'retail',     'west_coast','Warehouse-style'),
  ('Restaurant Depot',          ARRAY['Rest Depot','RD'],                                     2, 21, 95, 'mid',   'foodservice','national','Cash-and-carry to restaurants'),
  ('Aldi',                      ARRAY['Aldi Inc','Aldi US','Aldi USA'],                       2, 30, 96, 'large', 'retail',     'national','Discount grocer'),
  ('Vallarta Supermarkets',     ARRAY['Vallarta','Vallarta Markets'],                         2, 35, 92, 'mid',   'retail',     'west_coast','Hispanic SoCal'),
  ('Northgate Gonzalez',        ARRAY['Northgate','Northgate Markets'],                       2, 35, 92, 'mid',   'retail',     'west_coast','Hispanic SoCal'),
  ('Ranch 99',                  ARRAY['Ranch 99 Market','99 Ranch','Tawa Group'],             2, 35, 91, 'mid',   'retail',     'west_coast','Asian-American grocer'),
  ('Naturipe',                  ARRAY['Naturipe Farms','Naturipe LLC'],                       2, 30, 95, 'large', 'distributor','national','Berry coop'),
  ('Imperfect Foods',           ARRAY['Imperfect Produce','Imperfect Inc'],                   2, 21, 94, 'mid',   'retail',     'national','Direct-to-consumer salvage'),
  ('Misfits Market',            ARRAY['Misfits','Misfits Inc'],                               2, 21, 93, 'mid',   'retail',     'national','D2C salvage')
ON CONFLICT DO NOTHING;

-- Seed watch tier (Tier 3) - small/new buyers, food banks, specialty
INSERT INTO factor_buyers (buyer_name, buyer_aliases, credit_tier, typical_paydays, pay_reliability, size_tier, segment, region, is_seed, notes) VALUES
  ('Grocery Outlet',           ARRAY['Grocery Outlet Bargain Market','GO Bargain'],         3, 35, 90, 'mid',   'retail','west_coast','Discount/salvage retail'),
  ('99 Cents Only',            ARRAY['99 Cents Only Stores','99 Cents'],                    3, 35, 88, 'mid',   'retail','west_coast','Dollar-store grade'),
  ('Flashfood',                ARRAY['Flashfood Inc'],                                      3, 21, 85, 'small', 'retail','national','App-based salvage'),
  ('Feeding America',          ARRAY['Feeding America Network','FA Network'],              3, 45, 95, 'large', 'foodservice','national','Food bank network - charity'),
  ('Second Harvest Heartland', ARRAY['SHH','Second Harvest'],                              3, 45, 95, 'mid',   'foodservice','midwest','Regional food bank'),
  ('Los Angeles Food Bank',    ARRAY['LA Regional Food Bank','LARFB'],                     3, 45, 95, 'mid',   'foodservice','west_coast','Regional food bank')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. FACTOR_PARTNERS - 10-partner waterfall (the funders)
-- =============================================================================
CREATE TABLE IF NOT EXISTS factor_partners (
  id                  SERIAL PRIMARY KEY,
  partner_code        TEXT UNIQUE NOT NULL, -- 'QPF','BLV','TRI','SLP','RAM','GIB','BRZ','TRD','EAS','MEX'
  partner_name        TEXT NOT NULL,
  contact_name        TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  -- Tier eligibility (which buyer credit tiers they will fund)
  min_credit_tier     INTEGER DEFAULT 1,    -- they fund tier <= this number (1 = premium only)
  max_credit_tier     INTEGER DEFAULT 3,    -- 3 = will go down to watch tier
  -- Advance % range
  min_advance_pct     NUMERIC DEFAULT 70,
  max_advance_pct     NUMERIC DEFAULT 95,
  -- Rates
  base_rate_pct       NUMERIC,              -- daily/monthly fee
  rate_unit           TEXT DEFAULT 'monthly', -- 'daily','weekly','monthly','flat'
  -- Limits
  min_invoice_usd     NUMERIC DEFAULT 1000,
  max_invoice_usd     NUMERIC DEFAULT 1000000,
  -- Speed (hours from submit to fund)
  funding_speed_hrs   NUMERIC,
  -- Specialty
  produce_specialist  BOOLEAN DEFAULT FALSE,
  spanish_capable     BOOLEAN DEFAULT FALSE,
  -- Priority within tier (lower = preferred)
  priority_rank       INTEGER DEFAULT 100,
  is_active           BOOLEAN DEFAULT TRUE,
  notes               TEXT,
  added_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factor_partner_active   ON factor_partners(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_factor_partner_priority ON factor_partners(priority_rank);
CREATE INDEX IF NOT EXISTS idx_factor_partner_tier    ON factor_partners(min_credit_tier, max_credit_tier);

-- Seed 10-partner waterfall (Sprint C P3 lineup, refined)
INSERT INTO factor_partners (partner_code, partner_name, contact_name, contact_email, min_credit_tier, max_credit_tier, min_advance_pct, max_advance_pct, base_rate_pct, rate_unit, min_invoice_usd, max_invoice_usd, funding_speed_hrs, produce_specialist, spanish_capable, priority_rank, notes) VALUES
  ('QPF', 'Quickpay Funding',         'Veronica Beach',      'veronica@quickpayfunding.com',     1, 2, 90, 95, 1.5, 'monthly', 5000,   2000000, 4,   TRUE,  TRUE,  10, 'Premier produce factor - QPF is gold-standard for Mexausa'),
  ('BLV', 'BlueVine Capital',         'BlueVine Underwriting','underwriting@bluevine.com',       1, 2, 85, 90, 1.7, 'monthly', 1000,   5000000, 24,  FALSE, FALSE, 20, 'Tech-driven invoice factoring'),
  ('TRI', 'Triumph Business Capital', 'Triumph Intake',      'intake@triumphbcap.com',           1, 2, 80, 92, 1.8, 'monthly', 5000,   3000000, 24,  TRUE,  FALSE, 30, 'Trucking + produce specialist'),
  ('SLP', 'Sallyport Commercial',     'Sallyport Sales',     'sales@sallyport.com',              1, 3, 80, 90, 2.0, 'monthly', 10000,  5000000, 48,  TRUE,  FALSE, 40, 'Old-line factor, all tiers'),
  ('RAM', 'RAM Funding',              'RAM Intake',          'intake@ramfunding.com',            2, 3, 75, 88, 2.5, 'monthly', 1000,   500000,  24,  TRUE,  TRUE,  50, 'Mid-tier, Spanish-capable'),
  ('GIB', 'Gibraltar Business Cap',   'Gibraltar',           'apply@gibraltarbiz.com',           2, 3, 75, 85, 2.5, 'monthly', 5000,   1000000, 48,  FALSE, FALSE, 60, 'Asset-based lender'),
  ('BRZ', 'Breakout Capital',         'Breakout',            'apply@breakoutcap.com',            2, 3, 70, 85, 2.8, 'monthly', 1000,   500000,  72,  FALSE, FALSE, 70, 'Higher-risk willing'),
  ('TRD', 'TradeRiver USA',           'TradeRiver',          'origination@traderiverusa.com',    1, 2, 80, 90, 2.0, 'monthly', 25000,  3000000, 48,  TRUE,  FALSE, 80, 'International trade focus'),
  ('EAS', 'eCapital Freight Factor',  'eCapital',            'newaccts@ecapital.com',            2, 3, 75, 88, 2.5, 'monthly', 1000,   2000000, 24,  FALSE, FALSE, 90, 'Trucking + produce'),
  ('MEX', 'Mexausa Capital',          'Saul Garcia',         'saul@mexausafg.com',               1, 3, 85, 95, 1.8, 'monthly', 1000,   1000000, 2,   TRUE,  TRUE,  5,  'INTERNAL - Mexausa Food Group capital arm. Always offered first when available.')
ON CONFLICT (partner_code) DO NOTHING;

-- =============================================================================
-- 3. FACTOR_INVOICE_PHOTOS - server-side photo storage (separate from notes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS factor_invoice_photos (
  id              SERIAL PRIMARY KEY,
  deal_id         INTEGER,
  photo_data      TEXT,                    -- base64 data URL
  photo_size_kb   NUMERIC,
  mime_type       TEXT,
  uploaded_by     INTEGER,
  uploaded_at     TIMESTAMP DEFAULT NOW(),
  -- For Wave 3B+: file system migration
  file_path       TEXT,
  file_url        TEXT
);

CREATE INDEX IF NOT EXISTS idx_factor_photo_deal ON factor_invoice_photos(deal_id);

-- =============================================================================
-- 4. FACTOR_SCORE_HISTORY - audit log for every QPF calculation
-- =============================================================================
CREATE TABLE IF NOT EXISTS factor_score_history (
  id              SERIAL PRIMARY KEY,
  deal_id         INTEGER,
  -- Inputs
  buyer_name      TEXT,
  buyer_id        INTEGER REFERENCES factor_buyers(id),
  buyer_credit_tier INTEGER,
  invoice_amount  NUMERIC,
  invoice_age_days INTEGER,
  payment_terms   TEXT,
  commodity       TEXT,
  -- Outputs
  qpf_score       NUMERIC,
  qpf_factors     JSONB,                   -- itemized factor breakdown
  expected_advance_pct NUMERIC,
  expected_advance_usd NUMERIC,
  recommended_partner_id INTEGER REFERENCES factor_partners(id),
  recommended_partner_code TEXT,
  fallback_partner_codes TEXT[],
  -- Metadata
  reasoning_engine TEXT DEFAULT 'AuditDNA Platform Reasoning',
  source_type     TEXT,                    -- 'mobile_factor_card','desktop','api'
  source_lang     TEXT,
  scored_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_hist_deal    ON factor_score_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_score_hist_partner ON factor_score_history(recommended_partner_id);
CREATE INDEX IF NOT EXISTS idx_score_hist_at      ON factor_score_history(scored_at DESC);

-- =============================================================================
-- 5. VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW v_factor_partner_active AS
SELECT id, partner_code, partner_name, contact_name, contact_email,
  min_credit_tier, max_credit_tier, min_advance_pct, max_advance_pct,
  base_rate_pct, rate_unit, min_invoice_usd, max_invoice_usd, funding_speed_hrs,
  produce_specialist, spanish_capable, priority_rank, notes
FROM factor_partners
WHERE is_active = TRUE
ORDER BY priority_rank ASC;

CREATE OR REPLACE VIEW v_factor_buyer_lookup AS
SELECT id, buyer_name, buyer_aliases, credit_tier, typical_paydays, pay_reliability,
  size_tier, segment, region, is_seed
FROM factor_buyers
WHERE is_active = TRUE;

COMMENT ON TABLE factor_buyers          IS 'Wave 3B Factor Engine: buyer credit tier registry for QPF scoring';
COMMENT ON TABLE factor_partners        IS 'Wave 3B Factor Engine: 10-partner waterfall, tier-gated. Mexausa Capital priority_rank=5 (always offered first).';
COMMENT ON TABLE factor_invoice_photos  IS 'Wave 3B Factor Engine: server-side base64 photo storage. Wave 3C will migrate to S3/CDN.';
COMMENT ON TABLE factor_score_history   IS 'Wave 3B Factor Engine: audit log of every QPF score - replayable, sellable metric';
