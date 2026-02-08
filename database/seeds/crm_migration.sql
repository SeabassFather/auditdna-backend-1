-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║  AUDITDNA CRM - DATABASE MIGRATION                                            ║
-- ║  Adds CRM fields to growers and buyers tables                                 ║
-- ║  Run: psql -h localhost -p 5433 -U postgres -d auditdna -f crm_migration.sql  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ============================================
-- ADD CRM FIELDS TO GROWERS TABLE
-- ============================================

-- Lead Temperature (Hot/Warm/Cold)
DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN lead_temperature VARCHAR(20) DEFAULT 'COLD';
    RAISE NOTICE '✅ Added lead_temperature to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ lead_temperature already exists in growers';
END $$;

-- Lead Status
DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN lead_status VARCHAR(20) DEFAULT 'NEW';
    RAISE NOTICE '✅ Added lead_status to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ lead_status already exists in growers';
END $$;

-- Opt-out flags
DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN email_opt_out BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added email_opt_out to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ email_opt_out already exists in growers';
END $$;

DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN phone_opt_out BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added phone_opt_out to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ phone_opt_out already exists in growers';
END $$;

DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN do_not_contact BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added do_not_contact to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ do_not_contact already exists in growers';
END $$;

DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN opt_out_date TIMESTAMP;
    RAISE NOTICE '✅ Added opt_out_date to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ opt_out_date already exists in growers';
END $$;

DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN opt_out_reason TEXT;
    RAISE NOTICE '✅ Added opt_out_reason to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ opt_out_reason already exists in growers';
END $$;

-- Follow-up tracking
DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN next_follow_up DATE;
    RAISE NOTICE '✅ Added next_follow_up to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ next_follow_up already exists in growers';
END $$;

DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN last_contacted_at TIMESTAMP;
    RAISE NOTICE '✅ Added last_contacted_at to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ last_contacted_at already exists in growers';
END $$;

DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN assigned_to INTEGER;
    RAISE NOTICE '✅ Added assigned_to to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ assigned_to already exists in growers';
END $$;

DO $$ BEGIN
    ALTER TABLE growers ADD COLUMN lead_score INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added lead_score to growers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ lead_score already exists in growers';
END $$;

-- ============================================
-- ADD CRM FIELDS TO BUYERS TABLE
-- ============================================

-- Lead Temperature (Hot/Warm/Cold)
DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN lead_temperature VARCHAR(20) DEFAULT 'COLD';
    RAISE NOTICE '✅ Added lead_temperature to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ lead_temperature already exists in buyers';
END $$;

-- Lead Status
DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN lead_status VARCHAR(20) DEFAULT 'NEW';
    RAISE NOTICE '✅ Added lead_status to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ lead_status already exists in buyers';
END $$;

-- Opt-out flags
DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN email_opt_out BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added email_opt_out to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ email_opt_out already exists in buyers';
END $$;

DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN phone_opt_out BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added phone_opt_out to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ phone_opt_out already exists in buyers';
END $$;

DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN do_not_contact BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added do_not_contact to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ do_not_contact already exists in buyers';
END $$;

DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN opt_out_date TIMESTAMP;
    RAISE NOTICE '✅ Added opt_out_date to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ opt_out_date already exists in buyers';
END $$;

DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN opt_out_reason TEXT;
    RAISE NOTICE '✅ Added opt_out_reason to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ opt_out_reason already exists in buyers';
END $$;

-- Follow-up tracking
DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN next_follow_up DATE;
    RAISE NOTICE '✅ Added next_follow_up to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ next_follow_up already exists in buyers';
END $$;

DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN last_contacted_at TIMESTAMP;
    RAISE NOTICE '✅ Added last_contacted_at to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ last_contacted_at already exists in buyers';
END $$;

DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN assigned_to INTEGER;
    RAISE NOTICE '✅ Added assigned_to to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ assigned_to already exists in buyers';
END $$;

DO $$ BEGIN
    ALTER TABLE buyers ADD COLUMN lead_score INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added lead_score to buyers';
EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'ℹ️ lead_score already exists in buyers';
END $$;

-- ============================================
-- CREATE INDEXES FOR CRM QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_growers_temperature ON growers(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_growers_status ON growers(lead_status);
CREATE INDEX IF NOT EXISTS idx_growers_follow_up ON growers(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_growers_do_not_contact ON growers(do_not_contact);

CREATE INDEX IF NOT EXISTS idx_buyers_temperature ON buyers(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_buyers_status ON buyers(lead_status);
CREATE INDEX IF NOT EXISTS idx_buyers_follow_up ON buyers(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_buyers_do_not_contact ON buyers(do_not_contact);

-- ============================================
-- SET SOME INITIAL HOT LEADS (for demo)
-- ============================================

-- Set 5% of growers as HOT, 15% as WARM
UPDATE growers SET lead_temperature = 'HOT' WHERE id IN (
    SELECT id FROM growers ORDER BY RANDOM() LIMIT (SELECT COUNT(*) / 20 FROM growers)
);

UPDATE growers SET lead_temperature = 'WARM' WHERE lead_temperature = 'COLD' AND id IN (
    SELECT id FROM growers WHERE lead_temperature = 'COLD' ORDER BY RANDOM() LIMIT (SELECT COUNT(*) / 7 FROM growers)
);

-- Set 5% of buyers as HOT, 15% as WARM
UPDATE buyers SET lead_temperature = 'HOT' WHERE id IN (
    SELECT id FROM buyers ORDER BY RANDOM() LIMIT (SELECT COUNT(*) / 20 FROM buyers)
);

UPDATE buyers SET lead_temperature = 'WARM' WHERE lead_temperature = 'COLD' AND id IN (
    SELECT id FROM buyers WHERE lead_temperature = 'COLD' ORDER BY RANDOM() LIMIT (SELECT COUNT(*) / 7 FROM buyers)
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'GROWERS' as table_name, 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE lead_temperature = 'HOT') as hot,
       COUNT(*) FILTER (WHERE lead_temperature = 'WARM') as warm,
       COUNT(*) FILTER (WHERE lead_temperature = 'COLD') as cold
FROM growers
UNION ALL
SELECT 'BUYERS', 
       COUNT(*),
       COUNT(*) FILTER (WHERE lead_temperature = 'HOT'),
       COUNT(*) FILTER (WHERE lead_temperature = 'WARM'),
       COUNT(*) FILTER (WHERE lead_temperature = 'COLD')
FROM buyers;

SELECT '✅ CRM Migration Complete!' as status;