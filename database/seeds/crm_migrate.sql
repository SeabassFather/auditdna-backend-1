-- CRM MIGRATION - Add lead management fields to growers and buyers

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
CREATE INDEX IF NOT EXISTS idx_buyers_temperature ON buyers(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_buyers_status ON buyers(lead_status);

-- Set some HOT leads
UPDATE growers SET lead_temperature = 'HOT' WHERE id IN (SELECT id FROM growers ORDER BY RANDOM() LIMIT 250);
UPDATE growers SET lead_temperature = 'WARM' WHERE lead_temperature = 'COLD' AND id IN (SELECT id FROM growers WHERE lead_temperature = 'COLD' ORDER BY RANDOM() LIMIT 750);
UPDATE buyers SET lead_temperature = 'HOT' WHERE id IN (SELECT id FROM buyers ORDER BY RANDOM() LIMIT 150);
UPDATE buyers SET lead_temperature = 'WARM' WHERE lead_temperature = 'COLD' AND id IN (SELECT id FROM buyers WHERE lead_temperature = 'COLD' ORDER BY RANDOM() LIMIT 450);

-- Show results
SELECT 'GROWERS' as tbl, COUNT(*) as total, COUNT(*) FILTER (WHERE lead_temperature = 'HOT') as hot, COUNT(*) FILTER (WHERE lead_temperature = 'WARM') as warm FROM growers
UNION ALL
SELECT 'BUYERS', COUNT(*), COUNT(*) FILTER (WHERE lead_temperature = 'HOT'), COUNT(*) FILTER (WHERE lead_temperature = 'WARM') FROM buyers;