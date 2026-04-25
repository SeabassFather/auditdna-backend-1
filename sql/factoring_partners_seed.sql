-- Add missing columns
ALTER TABLE factoring_partners ADD COLUMN IF NOT EXISTS partner_id VARCHAR(20);
ALTER TABLE factoring_partners ADD COLUMN IF NOT EXISTS waterfall_order INTEGER;

-- Deactivate seed data partners (not real partners)
UPDATE factoring_partners SET active=false WHERE name IN ('Riviera Finance','TCI Business Capital');

-- Seed Amul (LCG) waterfall_order=1
INSERT INTO factoring_partners (partner_id, name, contact_name, email, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order)
SELECT 'FP_LCG','LCG Capital','Amul Purohit','amul.purohit@gmail.com',80,3.0,10000,500000,ARRAY['Agriculture','Produce','Cross-Border'],'Primary partner. Identity hidden until PARTY_DISCLOSURE.',true,1
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_LCG');

-- Seed Tina (Agrifact) waterfall_order=2
INSERT INTO factoring_partners (partner_id, name, contact_name, email, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order)
SELECT 'FP_AGF','Agrifact','Tina','tina@agrifact.com',75,3.5,5000,250000,ARRAY['Agriculture','Produce'],'Secondary partner. Activates after 48h LCG no-response.',true,2
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_AGF');

SELECT 'factoring_partners seeded' AS status;