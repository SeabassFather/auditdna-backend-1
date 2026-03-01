-- ============================================================
-- AUDITDNA BACKEND -- COMPLETE TABLE MIGRATION
-- Run once: psql -d auditdna -f migration_complete.sql
-- Safe to re-run (all IF NOT EXISTS)
-- ============================================================

-- 1. AGENT REGISTRATIONS
-- Stores agent/office signups from MexicoRealEstate.jsx RegistrationGate
CREATE TABLE IF NOT EXISTS agent_registrations (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(255),
  apellidos       VARCHAR(255),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  whatsapp        VARCHAR(50),
  empresa         VARCHAR(255),
  licencia        VARCHAR(100),
  ine             VARCHAR(50),
  curp            VARCHAR(18),
  banco           VARCHAR(100),
  clabe           VARCHAR(20),
  referido_por    VARCHAR(255),
  agent_type      VARCHAR(20),                   -- 'inhouse', 'external', 'fsbo'
  agent_code      VARCHAR(50) UNIQUE,            -- 'REagent-XX@eb.com'
  pin             VARCHAR(10),
  commission_rate VARCHAR(10),
  role            VARCHAR(20) DEFAULT 'sales',
  has_ine         BOOLEAN DEFAULT FALSE,
  has_selfie      BOOLEAN DEFAULT FALSE,
  status          VARCHAR(30) DEFAULT 'pending_verification',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_reg_email ON agent_registrations(email);
CREATE INDEX IF NOT EXISTS idx_agent_reg_code  ON agent_registrations(agent_code);
CREATE INDEX IF NOT EXISTS idx_agent_reg_status ON agent_registrations(status);

-- 2. NOTIFICATIONS LOG
-- Stores all platform notifications (agent signup, consumer signup, etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(50) NOT NULL,            -- 'agent_registered', 'consumer_registered'
  recipient     VARCHAR(255) NOT NULL,           -- target email
  subject       VARCHAR(500),
  payload       JSONB DEFAULT '{}',
  sent          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_type    ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 3. CREDENTIAL RECOVERY LOG
-- Tracks who requested credential recovery and whether they were found
CREATE TABLE IF NOT EXISTS credential_recovery_log (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  found         BOOLEAN DEFAULT FALSE,
  requested_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_email ON credential_recovery_log(email);

-- 4. SUPPRESSION LIST
-- Used by complianceCleaner to track unsubscribed/blocked emails
-- Prevents the recurring "relation suppression_list does not exist" error
CREATE TABLE IF NOT EXISTS suppression_list (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  reason        VARCHAR(50) DEFAULT 'unsubscribed',  -- 'unsubscribed', 'bounced', 'complained', 'manual'
  source        VARCHAR(100),                         -- which module added it
  suppressed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppression_email  ON suppression_list(email);
CREATE INDEX IF NOT EXISTS idx_suppression_reason ON suppression_list(reason);

-- 5. MORTGAGE BRAIN LOG (ensure exists for Brain inline routes)
CREATE TABLE IF NOT EXISTS mortgage_brain_log (
  id            SERIAL PRIMARY KEY,
  module        VARCHAR(100),
  event         VARCHAR(255),
  data          JSONB DEFAULT '{}',
  source        VARCHAR(50) DEFAULT 'frontend',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_log_module ON mortgage_brain_log(module);
CREATE INDEX IF NOT EXISTS idx_brain_log_event  ON mortgage_brain_log(event);

-- ============================================================
-- VERIFY
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Tables created/verified:';
  RAISE NOTICE '  - agent_registrations';
  RAISE NOTICE '  - notifications';
  RAISE NOTICE '  - credential_recovery_log';
  RAISE NOTICE '  - suppression_list';
  RAISE NOTICE '  - mortgage_brain_log';
END $$;