-- ============================================================================
-- migration-2026-05-01-cleanup.sql
-- Save to: C:\AuditDNA\backend\migrations\2026-05-01-cleanup.sql
-- Run as:
--   psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f C:\AuditDNA\backend\migrations\2026-05-01-cleanup.sql
-- ----------------------------------------------------------------------------
-- Handles cleanup items:
--   25) BRAINLOG schema drift - column "deal_id" does not exist
--   26) Missing table rfq_brain_events
-- ============================================================================

\echo ''
\echo '== MIGRATION 2026-05-01 =='
\echo ''

-- ----------------------------------------------------------------------------
-- ITEM 25: brain_events.deal_id  (idempotent)
-- ----------------------------------------------------------------------------
\echo '[25] Adding deal_id to brain_events if missing...'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brain_events' AND column_name = 'deal_id'
  ) THEN
    ALTER TABLE brain_events ADD COLUMN deal_id INTEGER;
    RAISE NOTICE '[25] brain_events.deal_id ADDED';
  ELSE
    RAISE NOTICE '[25] brain_events.deal_id already present';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_brain_events_deal_id
  ON brain_events(deal_id) WHERE deal_id IS NOT NULL;

-- Also add commonly-missing companion columns referenced from autonomy.js logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='brain_events' AND column_name='agent_id') THEN
    ALTER TABLE brain_events ADD COLUMN agent_id VARCHAR(64);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='brain_events' AND column_name='severity') THEN
    ALTER TABLE brain_events ADD COLUMN severity SMALLINT DEFAULT 0;
  END IF;
END$$;


-- ----------------------------------------------------------------------------
-- ITEM 26: rfq_brain_events table  (idempotent)
-- Stores RFQ-scoped brain events separately from general brain_events
-- so RFQ replay/audit doesn't drag in unrelated platform telemetry.
-- ----------------------------------------------------------------------------
\echo '[26] Creating rfq_brain_events table if missing...'

CREATE TABLE IF NOT EXISTS rfq_brain_events (
  id              BIGSERIAL PRIMARY KEY,
  rfq_id          INTEGER NOT NULL,
  deal_id         INTEGER,
  event_type      VARCHAR(64) NOT NULL,
  agent_id        VARCHAR(64),
  payload         JSONB DEFAULT '{}'::jsonb,
  severity        SMALLINT DEFAULT 0,
  source          VARCHAR(32) DEFAULT 'auditdna',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rfq_brain_events_rfq_id
  ON rfq_brain_events(rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_brain_events_deal_id
  ON rfq_brain_events(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rfq_brain_events_event_type
  ON rfq_brain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rfq_brain_events_created_at
  ON rfq_brain_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_brain_events_payload_gin
  ON rfq_brain_events USING gin(payload);

-- ----------------------------------------------------------------------------
-- ITEM 27 prep: NINER MINERS dispatch tracking (companion to swarm Phase 4)
-- Cleans up partial swarm_dispatches schema if it was applied half-way.
-- ----------------------------------------------------------------------------
\echo '[27-prep] swarm_dispatches schema sanity...'

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='swarm_dispatches') THEN
    -- ensure newer columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='swarm_dispatches' AND column_name='miner_id') THEN
      ALTER TABLE swarm_dispatches ADD COLUMN miner_id VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='swarm_dispatches' AND column_name='completed_at') THEN
      ALTER TABLE swarm_dispatches ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- Sanity report
-- ----------------------------------------------------------------------------
\echo ''
\echo '== POST-MIGRATION REPORT =='

SELECT 'brain_events.deal_id' AS check_name,
       EXISTS(SELECT 1 FROM information_schema.columns
              WHERE table_name='brain_events' AND column_name='deal_id') AS present;

SELECT 'rfq_brain_events table' AS check_name,
       EXISTS(SELECT 1 FROM information_schema.tables
              WHERE table_name='rfq_brain_events') AS present;

SELECT 'rfq_brain_events index count' AS check_name,
       (SELECT count(*) FROM pg_indexes WHERE tablename='rfq_brain_events')::text AS idx_count;

\echo ''
\echo '== MIGRATION COMPLETE =='
