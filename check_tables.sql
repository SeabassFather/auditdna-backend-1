-- ═══════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Check if growers/buyers tables have correct data
-- ═══════════════════════════════════════════════════════════════

-- Check table counts
SELECT 'GROWERS TABLE' as table_name, COUNT(*) as count FROM growers;
SELECT 'BUYERS TABLE' as table_name, COUNT(*) as count FROM buyers;
SELECT 'SHIPPERS TABLE' as table_name, COUNT(*) as count FROM shipper_contacts;

-- Check if growers table has buyer data (look for PACA numbers)
SELECT 'GROWERS with PACA (WRONG!)' as issue, COUNT(*) as count 
FROM growers 
WHERE buyer_code IS NOT NULL OR paca_number IS NOT NULL;

-- Check if buyers table has grower data (look for grower codes)
SELECT 'BUYERS with Grower Code (WRONG!)' as issue, COUNT(*) as count 
FROM buyers 
WHERE grower_code IS NOT NULL OR certification_type IS NOT NULL;

-- Sample growers data
SELECT 'GROWERS SAMPLE' as type, company_name, grower_code, country FROM growers LIMIT 5;

-- Sample buyers data  
SELECT 'BUYERS SAMPLE' as type, company_name, buyer_code, paca_number FROM buyers LIMIT 5;

-- Check for duplicate company names across tables
SELECT 'DUPLICATES ACROSS TABLES' as issue, g.company_name, COUNT(*) as tables_found
FROM growers g
INNER JOIN buyers b ON g.company_name = b.company_name
GROUP BY g.company_name
LIMIT 10;
