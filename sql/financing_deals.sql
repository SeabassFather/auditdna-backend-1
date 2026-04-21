-- ============================================================
-- FINANCING DEALS — INTERNAL DEAL TRACKING
-- Every factoring (or future commodity-advance) deal has a row here.
-- frontend NEVER receives partner_id/identity — only stage + public_label.
-- ============================================================

CREATE TABLE IF NOT EXISTS financing_deals (
  id                    TEXT PRIMARY KEY,        -- e.g. DEAL_20260421_0042
  deal_type             TEXT NOT NULL DEFAULT 'factoring',
  client_id             TEXT,                    -- CRM contact id (grower_xxx / buyer_xxx / shipper_xxx)
  client_type           TEXT,                    -- 'grower' | 'buyer' | 'shipper'
  client_company_name   TEXT,                    -- snapshot at submit time
  client_contact_name   TEXT,
  client_email          TEXT,
  client_phone          TEXT,
  commodity             TEXT,                    -- e.g. 'Avocado', 'Citrus'
  amount_requested      NUMERIC(14,2),           -- USD
  currency              TEXT DEFAULT 'USD',
  advance_percent       NUMERIC(5,2),            -- e.g. 85.00
  term_days             INT,                     -- e.g. 60
  invoice_reference     TEXT,                    -- PO/invoice # attached to the factoring request
  notes                 TEXT,
  current_partner_id    TEXT REFERENCES financing_partner_registry(id),
  stage                 TEXT NOT NULL DEFAULT 'SUBMITTED'
                        CHECK (stage IN (
                          'SUBMITTED',
                          'PRIMARY_REVIEW',
                          'SECONDARY_REVIEW',
                          'LOI_PENDING',
                          'NDA_PENDING',
                          'TERM_SHEET_PENDING',
                          'PARTY_DISCLOSURE',
                          'FUNDED',
                          'NO_FINANCING_AVAILABLE',
                          'CANCELLED'
                        )),
  submitted_by          TEXT,                    -- user id who created the deal
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  last_stage_change_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_stage       ON financing_deals (stage);
CREATE INDEX IF NOT EXISTS idx_deals_partner     ON financing_deals (current_partner_id);
CREATE INDEX IF NOT EXISTS idx_deals_client      ON financing_deals (client_id);
CREATE INDEX IF NOT EXISTS idx_deals_submitted   ON financing_deals (submitted_at DESC);

-- Audit log — every stage change recorded
CREATE TABLE IF NOT EXISTS financing_deal_events (
  id          SERIAL PRIMARY KEY,
  deal_id     TEXT NOT NULL REFERENCES financing_deals(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,                     -- 'stage_change', 'email_sent', 'decision_recorded', 'disclosure_released'
  from_stage  TEXT,
  to_stage    TEXT,
  partner_id  TEXT,
  actor       TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_events_deal ON financing_deal_events (deal_id, created_at DESC);