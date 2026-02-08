-- CRM MIGRATION - Add lead management fields to growers and buyers
-- Run: psql -h localhost -p 5433 -U postgres -d auditdna -f crm_migration_clean.sql

-- GROWERS TABLE - Add CRM fields
ALTER TABLE growers ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(20) DEFAULT 'COLD';
ALTER TABLE growers ADD COLUMN IF NOT EXISTS lead_status VARCHAR(20) DEFAULT 'NEW';
ALTER TABLE growers ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT FALSE;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS phone_opt_out BOOLEAN DEFAULT FALSE;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT FALSE;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS opt_out_date TIMESTAMP;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS opt_out_reason TEXT;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS next_follow_up DATE;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE growers ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;

-- BUYERS TABLE - Add CRM fields
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(20) DEFAULT 'COLD';
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS lead_status VARCHAR(20) DEFAULT 'NEW';
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT FALSE;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS phone_opt_out BOOLEAN DEFAULT FALSE;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT FALSE;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS opt_out_date TIMESTAMP;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS opt_out_reason TEXT;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS next_follow_up DATE;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_growers_temperature ON growers(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_growers_status ON growers(lead_status);
CREATE INDEX IF NOT EXISTS idx_growers_follow_up ON growers(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_growers_do_not_contact ON growers(do_not_contact);

CREATE INDEX IF NOT EXISTS idx_buyers_temperature ON buyers(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_buyers_status ON buyers(lead_status);
CREATE INDEX IF NOT EXISTS idx_buyers_follow_up ON buyers(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_buyers_do_not_contact ON buyers(do_not_contact);

-- Set some HOT leads (5%)
UPDATE growers SET lead_temperature = 'HOT' WHERE id IN (
    SELECT id FROM growers ORDER BY RANDOM() LIMIT 250
);

-- Set some WARM leads (15%)
UPDATE growers SET lead_temperature = 'WARM' WHERE lead_temperature = 'COLD' AND id IN (
    SELECT id FROM growers WHERE lead_temperature = 'COLD' ORDER BY RANDOM() LIMIT 750
);

-- Set some HOT buyers (5%)
UPDATE buyers SET lead_temperature = 'HOT' WHERE id IN (
    SELECT id FROM buyers ORDER BY RANDOM() LIMIT 150
);

-- Set some WARM buyers (15%)
UPDATE buyers SET lead_temperature = 'WARM' WHERE lead_temperature = 'COLD' AND id IN (
    SELECT id FROM buyers WHERE lead_temperature = 'COLD' ORDER BY RANDOM() LIMIT 450
);

-- Show results
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

SELECT 'CRM Migration Complete!' as status;