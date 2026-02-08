-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- AUDITDNA - DATABASE SCHEMA
-- CM Products International | AuditDNA Platform
-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- Created: January 15, 2026
-- Purpose: Immutable, append-only audit ledger with escrow state machine
-- Patent: US2025-059 (Immutable Audit Database Schema)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- RULES:
--   ❌ No UPDATE allowed on audit_ledger
--   ❌ No DELETE allowed on audit_ledger
--   ❌ No CASCADE deletes
--   ✅ INSERT only
--   ✅ Hash chained
--   ✅ ECDSA signed
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 1. AUDIT LEDGER (APPEND-ONLY — NEVER UPDATE/DELETE)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number BIGSERIAL NOT NULL,
  
  -- Entity reference
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_payload JSONB NOT NULL,
  
  -- Actor tracking
  actor_id UUID NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  actor_name VARCHAR(255),
  
  -- Jurisdiction & compliance
  jurisdiction VARCHAR(10),
  regulatory_tag VARCHAR(100),
  compliance_flags TEXT[],
  
  -- Cryptographic chain
  hash CHAR(64) NOT NULL,
  prev_hash CHAR(64),
  signature TEXT NOT NULL,
  algorithm VARCHAR(50) NOT NULL DEFAULT 'ECDSA-secp256k1',
  key_fingerprint VARCHAR(32),
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp (immutable)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_sequence UNIQUE (sequence_number),
  CONSTRAINT valid_hash CHECK (length(hash) = 64),
  CONSTRAINT valid_algorithm CHECK (algorithm IN ('ECDSA-secp256k1', 'SHA256', 'RSA-SHA256'))
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_ledger(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_ledger(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_jurisdiction ON audit_ledger(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_audit_sequence ON audit_ledger(sequence_number);
CREATE INDEX IF NOT EXISTS idx_audit_hash ON audit_ledger(hash);

-- Prevent UPDATE/DELETE via trigger
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LEDGER is IMMUTABLE. UPDATE and DELETE operations are FORBIDDEN.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_ledger_immutable ON audit_ledger;
CREATE TRIGGER audit_ledger_immutable
  BEFORE UPDATE OR DELETE ON audit_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 2. ESCROW STATE MACHINE
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  entity_id UUID NOT NULL,
  invoice_ref VARCHAR(100),
  
  -- Parties
  payer_id UUID NOT NULL,
  payer_name VARCHAR(255),
  recipient_id UUID NOT NULL,
  recipient_name VARCHAR(255),
  
  -- Amount
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Current state
  current_state VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
  
  -- Jurisdiction
  jurisdiction VARCHAR(10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  funded_at TIMESTAMP WITH TIME ZONE,
  locked_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_escrow_state CHECK (current_state IN (
    'INITIATED', 'FUNDED', 'LOCKED', 'DELIVERED', 'DISPUTED', 'RELEASED', 'REFUNDED', 'CANCELLED'
  )),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_escrow_entity ON escrow_accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_escrow_state ON escrow_accounts(current_state);
CREATE INDEX IF NOT EXISTS idx_escrow_payer ON escrow_accounts(payer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_recipient ON escrow_accounts(recipient_id);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 3. ESCROW STATE HISTORY (Append-only transitions)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS escrow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_accounts(id),
  
  -- State transition
  from_state VARCHAR(30),
  to_state VARCHAR(30) NOT NULL,
  allowed_next_states TEXT[] NOT NULL,
  
  -- Actor
  changed_by UUID NOT NULL,
  changed_by_role VARCHAR(50),
  reason TEXT,
  
  -- Audit link
  audit_ledger_id UUID REFERENCES audit_ledger(id),
  
  -- Timestamp
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_states_escrow ON escrow_states(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_states_time ON escrow_states(changed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 4. INVESTIGATOR ACCESS LOG (MANDATORY)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS investigator_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Investigator
  investigator_id UUID NOT NULL,
  investigator_role VARCHAR(50),
  
  -- Access details
  resource VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  query_params JSONB,
  
  -- Network
  ip_address INET,
  user_agent TEXT,
  
  -- Verification
  verified_signature BOOLEAN,
  chain_valid BOOLEAN,
  
  -- Response
  response_status INTEGER,
  records_returned INTEGER,
  
  -- Timestamp
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigator_log_user ON investigator_access_log(investigator_id);
CREATE INDEX IF NOT EXISTS idx_investigator_log_time ON investigator_access_log(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigator_log_resource ON investigator_access_log(resource);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 5. COMPLIANCE HOLDS
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS compliance_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50),
  
  -- Hold details
  hold_type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  
  -- Actor
  held_by UUID NOT NULL,
  held_by_role VARCHAR(50),
  
  -- Resolution
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Audit link
  audit_ledger_id UUID REFERENCES audit_ledger(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT valid_hold_status CHECK (status IN ('ACTIVE', 'RESOLVED', 'ESCALATED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_holds_entity ON compliance_holds(entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_holds_status ON compliance_holds(status);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 6. FRAUD FLAGS
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity
  entity_id UUID NOT NULL,
  
  -- Fraud details
  risk_codes TEXT[] NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  risk_details JSONB,
  
  -- Jurisdiction
  jurisdiction VARCHAR(10),
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'FLAGGED',
  
  -- Actor
  flagged_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  
  -- Resolution
  cleared_by UUID,
  cleared_at TIMESTAMP WITH TIME ZONE,
  clear_reason TEXT,
  
  -- Audit link
  audit_ledger_id UUID REFERENCES audit_ledger(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT valid_fraud_status CHECK (status IN ('FLAGGED', 'UNDER_REVIEW', 'CLEARED', 'BLOCKED'))
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_entity ON fraud_flags(entity_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON fraud_flags(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_level ON fraud_flags(risk_level);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 7. GROWERS (Agricultural entities)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS growers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  grower_code VARCHAR(50) UNIQUE NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  
  -- Location
  country VARCHAR(50) NOT NULL,
  state_region VARCHAR(100),
  city VARCHAR(100),
  
  -- Risk tier (0-3)
  risk_tier INTEGER NOT NULL DEFAULT 2,
  
  -- Certifications (JSON array)
  certifications JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  compliance_status VARCHAR(30) DEFAULT 'PENDING',
  
  -- Contact
  primary_contact VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_risk_tier CHECK (risk_tier >= 0 AND risk_tier <= 3),
  CONSTRAINT valid_grower_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED'))
);

CREATE INDEX IF NOT EXISTS idx_growers_country ON growers(country);
CREATE INDEX IF NOT EXISTS idx_growers_status ON growers(status);
CREATE INDEX IF NOT EXISTS idx_growers_risk ON growers(risk_tier);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 8. USERS & ROLES
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  
  -- Role
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  scopes TEXT[] NOT NULL DEFAULT '{}',
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  
  -- Security
  last_login TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_user_role CHECK (role IN (
    'super_admin', 'cm_admin', 'admin', 'investigator', 'operator', 
    'sales_rep', 'grower', 'buyer', 'compliance_officer', 'client'
  )),
  CONSTRAINT valid_user_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 9. WORKFLOW STATES
-- ═══════════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workflow identity
  workflow_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- State
  current_state VARCHAR(50) NOT NULL,
  previous_state VARCHAR(50),
  
  -- Metadata
  state_data JSONB DEFAULT '{}',
  
  -- Jurisdiction
  jurisdiction VARCHAR(10),
  
  -- Actor
  last_changed_by UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_entity ON workflow_states(entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_type ON workflow_states(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_state ON workflow_states(current_state);

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- 10. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- Function to get last ledger hash
CREATE OR REPLACE FUNCTION get_last_ledger_hash()
RETURNS CHAR(64) AS $$
DECLARE
  last_hash CHAR(64);
BEGIN
  SELECT hash INTO last_hash 
  FROM audit_ledger 
  ORDER BY sequence_number DESC 
  LIMIT 1;
  
  RETURN COALESCE(last_hash, '0000000000000000000000000000000000000000000000000000000000000000');
END;
$$ LANGUAGE plpgsql;

-- Function to verify chain integrity
CREATE OR REPLACE FUNCTION verify_ledger_chain()
RETURNS TABLE(is_valid BOOLEAN, broken_at BIGINT, message TEXT) AS $$
DECLARE
  rec RECORD;
  prev_hash CHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
BEGIN
  FOR rec IN SELECT * FROM audit_ledger ORDER BY sequence_number ASC LOOP
    IF rec.prev_hash IS NOT NULL AND rec.prev_hash != prev_hash THEN
      RETURN QUERY SELECT FALSE, rec.sequence_number, 'Hash chain broken at sequence ' || rec.sequence_number;
      RETURN;
    END IF;
    prev_hash := rec.hash;
  END LOOP;
  
  RETURN QUERY SELECT TRUE, NULL::BIGINT, 'Chain integrity verified';
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- GRANTS (Adjust based on your DB user setup)
-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- GRANT SELECT ON audit_ledger TO investigator_role;
-- GRANT INSERT ON audit_ledger TO admin_role;
-- GRANT SELECT, INSERT, UPDATE ON escrow_accounts TO admin_role;
-- GRANT SELECT ON escrow_accounts TO investigator_role;

-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE audit_ledger IS 'Immutable, append-only audit trail with cryptographic hash chain';
COMMENT ON TABLE escrow_accounts IS 'Escrow accounts with state machine for settlement';
COMMENT ON TABLE escrow_states IS 'State transition history for escrow accounts';
COMMENT ON TABLE investigator_access_log IS 'Mandatory access logging for investigator role';
COMMENT ON TABLE compliance_holds IS 'Compliance-related holds on entities';
COMMENT ON TABLE fraud_flags IS 'Fraud detection flags and risk scores';
COMMENT ON TABLE growers IS 'Agricultural producer entities';
COMMENT ON TABLE users IS 'System users with role-based access';
COMMENT ON TABLE workflow_states IS 'Current state of all workflows';