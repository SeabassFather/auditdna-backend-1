-- =============================================================================
-- GROWERS TABLE — SCHEMA FIX
-- Adds missing columns that seed_all_growers_5000.sql requires
-- Run ONCE against Railway before running the grower seed files
-- =============================================================================

ALTER TABLE growers ADD COLUMN IF NOT EXISTS legal_name        VARCHAR(255);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS trade_name        VARCHAR(255);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS state_region      VARCHAR(100);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS region            VARCHAR(100);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS website           VARCHAR(255);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS language          VARCHAR(20)  DEFAULT 'Spanish';
ALTER TABLE growers ADD COLUMN IF NOT EXISTS source            VARCHAR(100);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS grs_score         NUMERIC(5,2);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS tier              INTEGER      DEFAULT 2;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS buyer_type        VARCHAR(100);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS sector            VARCHAR(100);
ALTER TABLE growers ADD COLUMN IF NOT EXISTS sub_sector        VARCHAR(100);

-- Indexes for fast CRM queries by sector / country / state
CREATE INDEX IF NOT EXISTS idx_growers_country    ON growers(country);
CREATE INDEX IF NOT EXISTS idx_growers_state      ON growers(state_province);
CREATE INDEX IF NOT EXISTS idx_growers_state_reg  ON growers(state_region);
CREATE INDEX IF NOT EXISTS idx_growers_sector     ON growers(sector);
CREATE INDEX IF NOT EXISTS idx_growers_status     ON growers(status);
CREATE INDEX IF NOT EXISTS idx_growers_tier       ON growers(tier_level);

SELECT 'Growers schema fix complete — columns added' AS result;
SELECT column_name FROM information_schema.columns WHERE table_name='growers' ORDER BY ordinal_position;