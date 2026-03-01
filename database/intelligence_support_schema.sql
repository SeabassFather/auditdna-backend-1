-- ============================================================
-- AUDITDNA — OWNER INTELLIGENCE CENTER SUPPORT SCHEMA
-- File: C:\AuditDNA\backend\database\intelligence_support_schema.sql
-- Run against: auditdna_mortgage database
--
-- This file creates the access log and live_events_view
-- needed by the Owner Intelligence Center backend routes.
-- ============================================================

-- ── AUDIT ACCESS LOG ──────────────────────────────────────────
-- Every request to /api/admin/*, /api/security/* is logged here.
-- DENIED attempts are tracked for security alerting.
CREATE TABLE IF NOT EXISTS audit_access_log (
  id           BIGSERIAL    PRIMARY KEY,
  user_email   VARCHAR(200),
  role         VARCHAR(50),
  endpoint     VARCHAR(200),
  outcome      VARCHAR(10)  NOT NULL DEFAULT 'GRANTED',
  -- 'GRANTED' | 'DENIED'
  ip_address   INET,
  user_agent   TEXT,
  attempted_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aal_endpoint   ON audit_access_log(endpoint, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_denied     ON audit_access_log(outcome)  WHERE outcome = 'DENIED';
CREATE INDEX IF NOT EXISTS idx_aal_recent     ON audit_access_log(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_email      ON audit_access_log(user_email);

-- ── MORTGAGE EVENTS TABLE (if not already exists) ──────────────
-- Stores event log entries from the mortgage/URLA module.
-- No PII — loan_id token only.
CREATE TABLE IF NOT EXISTS mortgage_events (
  id                BIGSERIAL   PRIMARY KEY,
  loan_id_token     VARCHAR(64),  -- SHA-256 token — no real loan ID
  event_type        VARCHAR(100) NOT NULL,
  event_description TEXT,
  loan_amount       NUMERIC(15,2),
  status            VARCHAR(30),
  actor             VARCHAR(100),
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_me_created ON mortgage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_me_type    ON mortgage_events(event_type);

-- ── VERIFY ────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('audit_access_log','mortgage_events')
ORDER BY table_name;


-- ============================================================
-- APP.JS — ADD THESE 3 LINES
-- ============================================================
/*
  1. Import (after CPAPartnerManager import, line ~41):
     import OwnerIntelligenceCenter from './pages/OwnerIntelligenceCenter';

  2. Route (inside admin routes block, after cpa-network route):
     <Route path="/admin/intelligence"
       element={<AdminRoute><OwnerIntelligenceCenter /></AdminRoute>} />

  3. Nav item (in AdminFloatingNav menuItems, first position):
     { label: 'Intel Center', path: '/admin/intelligence' }
*/


-- ============================================================
-- SERVER.JS — ADD THIS LINE
-- ============================================================
/*
  // Owner Intelligence Center routes
  const intelligenceRoutes = require('./routes/intelligence');
  app.use('/api', intelligenceRoutes);

  Add AFTER your existing route registrations.
*/


-- ============================================================
-- .ENV — ADD THESE FOR FULL VAULT STATUS GREEN
-- ============================================================
/*
  VAULT_KEY=<32-char-random-string>
  TOKENIZER_SALT=<32-char-random-string>
  HASH_SALT=<32-char-random-string>
  DB_SSL=true
  RATE_LIMIT_ENABLED=true

  These trigger the green indicators in the VaultStatusBar.
  If JWT_SECRET is still the default 'auditdna_secret_change_me'
  the jwtEnforced check will show RED — update it.
*/