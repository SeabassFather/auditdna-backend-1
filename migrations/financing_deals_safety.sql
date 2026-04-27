-- =============================================================================
-- File: financing_deals_safety.sql
-- Save to: C:\AuditDNA\backend\migrations\financing_deals_safety.sql
-- =============================================================================
-- Wave 3B Safety Net
--
-- The Wave 3B factor-intake.js writes to financing_deals with 18 columns.
-- This script ensures all 18 columns exist before the route runs.
-- Idempotent. Safe on every run.
-- =============================================================================

DO $$
DECLARE
  required_cols TEXT[] := ARRAY[
    'invoice_number', 'po_number', 'grower_name', 'buyer_name', 'commodity',
    'quantity', 'unit', 'unit_price', 'invoice_amount', 'invoice_date',
    'due_date', 'payment_terms', 'notes', 'source_type', 'source_lang',
    'status', 'created_by', 'created_at'
  ];
  col_definitions TEXT[] := ARRAY[
    'VARCHAR(64)', 'VARCHAR(64)', 'VARCHAR(200)', 'VARCHAR(200)', 'VARCHAR(120)',
    'NUMERIC', 'VARCHAR(32)', 'NUMERIC', 'NUMERIC', 'DATE',
    'DATE', 'VARCHAR(32)', 'TEXT', 'VARCHAR(32) DEFAULT ''manual''', 'VARCHAR(8) DEFAULT ''en''',
    'VARCHAR(32) DEFAULT ''PROPOSAL''', 'INTEGER', 'TIMESTAMPTZ DEFAULT NOW()'
  ];
  i INT;
  col_exists BOOLEAN;
BEGIN
  -- Verify table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'financing_deals'
  ) INTO col_exists;
  IF NOT col_exists THEN
    RAISE NOTICE 'financing_deals table does not exist - creating minimal stub';
    CREATE TABLE financing_deals (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;

  -- Ensure each required column exists
  FOR i IN 1..array_length(required_cols, 1) LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'financing_deals' AND column_name = required_cols[i]
    ) INTO col_exists;
    IF NOT col_exists THEN
      EXECUTE format('ALTER TABLE financing_deals ADD COLUMN %I %s',
                     required_cols[i], col_definitions[i]);
      RAISE NOTICE 'Added column: % %', required_cols[i], col_definitions[i];
    END IF;
  END LOOP;

  RAISE NOTICE 'financing_deals schema verified';
END$$;

-- Show final state
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'financing_deals'
ORDER BY ordinal_position;
