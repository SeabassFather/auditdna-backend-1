-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Add lead_temperature column to all 3 CRM source tables
-- Reason: routes/crm.routes.js references lead_temperature on lines 85, 106,
--         127, 152, 168, 169, 219, 233, 265, 309, 318, 345, 388, 396, 414,
--         453-455, 462-464, 471-473, 534-536 — column was never created.
-- Effect: Adds VARCHAR(10) DEFAULT 'COLD' to growers, buyers, shipper_contacts.
-- Safe:   IF NOT EXISTS guards — idempotent, can be rerun.
-- Save to: C:\AuditDNA\backend\sql\add_lead_temperature.sql
-- Run with: psql "postgresql://postgres:auditdna2026@localhost:5432/auditdna" -f add_lead_temperature.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- GROWERS
ALTER TABLE growers
  ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(10) DEFAULT 'COLD';

UPDATE growers
   SET lead_temperature = 'COLD'
 WHERE lead_temperature IS NULL;

-- Validation constraint (HOT / WARM / COLD only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_grower_lead_temperature'
  ) THEN
    ALTER TABLE growers ADD CONSTRAINT valid_grower_lead_temperature
      CHECK (lead_temperature IN ('HOT','WARM','COLD'));
  END IF;
END $$;

-- BUYERS
ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(10) DEFAULT 'COLD';

UPDATE buyers
   SET lead_temperature = 'COLD'
 WHERE lead_temperature IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_buyer_lead_temperature'
  ) THEN
    ALTER TABLE buyers ADD CONSTRAINT valid_buyer_lead_temperature
      CHECK (lead_temperature IN ('HOT','WARM','COLD'));
  END IF;
END $$;

-- SHIPPER_CONTACTS
ALTER TABLE shipper_contacts
  ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(10) DEFAULT 'COLD';

UPDATE shipper_contacts
   SET lead_temperature = 'COLD'
 WHERE lead_temperature IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_shipper_lead_temperature'
  ) THEN
    ALTER TABLE shipper_contacts ADD CONSTRAINT valid_shipper_lead_temperature
      CHECK (lead_temperature IN ('HOT','WARM','COLD'));
  END IF;
END $$;

-- Indexes so the route's WHERE lead_temperature = 'HOT' is fast
CREATE INDEX IF NOT EXISTS idx_growers_lead_temp          ON growers(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_buyers_lead_temp           ON buyers(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_shipper_contacts_lead_temp ON shipper_contacts(lead_temperature);

COMMIT;

-- Verify — should show 3 rows, one per table
SELECT 'growers' AS tbl,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE lead_temperature = 'HOT')  AS hot,
       COUNT(*) FILTER (WHERE lead_temperature = 'WARM') AS warm,
       COUNT(*) FILTER (WHERE lead_temperature = 'COLD') AS cold
  FROM growers
UNION ALL
SELECT 'buyers',
       COUNT(*),
       COUNT(*) FILTER (WHERE lead_temperature = 'HOT'),
       COUNT(*) FILTER (WHERE lead_temperature = 'WARM'),
       COUNT(*) FILTER (WHERE lead_temperature = 'COLD')
  FROM buyers
UNION ALL
SELECT 'shipper_contacts',
       COUNT(*),
       COUNT(*) FILTER (WHERE lead_temperature = 'HOT'),
       COUNT(*) FILTER (WHERE lead_temperature = 'WARM'),
       COUNT(*) FILTER (WHERE lead_temperature = 'COLD')
  FROM shipper_contacts;