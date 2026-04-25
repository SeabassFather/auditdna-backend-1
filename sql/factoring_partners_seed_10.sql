-- Add missing columns for Sprint C waterfall logic
ALTER TABLE factoring_partners ADD COLUMN IF NOT EXISTS partner_id VARCHAR(20);
ALTER TABLE factoring_partners ADD COLUMN IF NOT EXISTS waterfall_order INTEGER;
ALTER TABLE factoring_partners ADD COLUMN IF NOT EXISTS region VARCHAR(50);
ALTER TABLE factoring_partners ADD COLUMN IF NOT EXISTS paca_licensed BOOLEAN DEFAULT false;

-- Deactivate dummy seeds
UPDATE factoring_partners SET active=false WHERE name IN ('Riviera Finance','TCI Business Capital');

-- Seed all 10 (use ON CONFLICT-style insert - skip if partner_id exists)
INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_LCG','LCG Capital','Amul Purohit','amul.purohit@gmail.com',NULL,80,3.0,10000,500000,ARRAY['Agriculture','Produce','Cross-Border'],'PRIMARY partner. Identity hidden until PARTY_DISCLOSURE.',true,1,'NY/Cross-Border',true
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_LCG');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_AGF','Agrifact','Tina','tina@agrifact.com',NULL,75,3.5,5000,250000,ARRAY['Agriculture','Produce'],'SECONDARY partner. Locked relationship.',true,2,'NY/Cross-Border',true
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_AGF');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_QPF','Quickpay Funding','Veronica Beach','contact@quickpayfunding.com',NULL,90,1.59,1000,500000,ARRAY['Produce','Agriculture','LATAM'],'Same-day funding 24/7. PACA-licensed. Deep produce expertise. Funded  produce Mar 2026.',true,3,'Florida',true
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_QPF');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_BNK','Bankers Factoring','Sales','info@bankersfactoring.com',NULL,90,2.5,75000,3000000,ARRAY['Agriculture','Produce','Importers'],'PACA/PASA-licensed. - monthly. Fruit/produce import focus.',true,4,'Florida',true
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_BNK');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_1CC','1st Commercial Credit','Sales','info@1stcommercialcredit.com',NULL,90,1.59,1000,1500000,ARRAY['Produce','Agriculture','PACA'],'PACA-licensed. 24hr funding. No min/max. Recent .2M PACA food distributor.',true,5,'NY/NJ',true
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_1CC');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_RIV','Riviera Finance NJ','Mercerville Office','newjersey@rivierafinance.com',NULL,85,2.5,5000,1000000,ARRAY['Agriculture','Wholesale','Multi-Industry'],'Est 1969. 1400+ clients. Non-recourse. Covers NY/PA/DE/MD/DC/New England.',true,6,'New Jersey',false
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_RIV');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_CCG','Capstone Capital Group','Sales','info@capstonetrade.com',NULL,85,2.5,50000,5000000,ARRAY['Wholesale','Trade','International'],'NYC HQ. Domestic + International trade financing. Wholesaler-focused.',true,7,'NYC',false
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_CCG');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_HCG','Hedaya Capital Group','Sales','info@hedayacapital.com',NULL,85,2.75,25000,2000000,ARRAY['Wholesale','Mid-Market','Asset-Based'],'NYC family-run. Asset-based + factoring. Mid-market focus.',true,8,'NYC',false
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_HCG');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_PWR','Power Funding LTD','Sales','info@powerfundingltd.com',NULL,85,3.0,10000,1000000,ARRAY['Agriculture','Produce'],'Agriculture invoice factoring specialist. East Coast presence.',true,9,'East Coast',false
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_PWR');

INSERT INTO factoring_partners (partner_id, name, contact_name, email, phone, advance_rate, fee_rate, min_invoice, max_invoice, industries, notes, active, waterfall_order, region, paca_licensed)
SELECT 'FP_SCL','Scale Funding NJ','NJ Office','info@getscalefunding.com',NULL,85,2.75,25000,900000,ARRAY['Agriculture','Garden State','Multi-Industry'],'25+ yrs Garden State. Fast funding. NJ ag specialty.',true,10,'New Jersey',false
WHERE NOT EXISTS (SELECT 1 FROM factoring_partners WHERE partner_id='FP_SCL');

SELECT 'factoring_partners seeded - 10 partners' AS status;