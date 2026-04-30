-- =============================================================================
-- WE SOURCE -- DATABASE SCHEMA
-- Save to: C:\AuditDNA\backend\migrations\wesource_schema.sql
-- =============================================================================
-- Run on Railway PostgreSQL:
--   psql $DATABASE_URL -f wesource_schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS wesource_requests (
  id                   VARCHAR(64) PRIMARY KEY,

  -- Consumer (PRIVATE -- never sent to retailers)
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  email                VARCHAR(255) NOT NULL,
  phone                VARCHAR(40)  NOT NULL,
  zip                  VARCHAR(20)  NOT NULL,
  city                 VARCHAR(120),
  state                VARCHAR(80),
  country              VARCHAR(40)  DEFAULT 'USA',
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION,

  -- Product
  product_name         VARCHAR(255) NOT NULL,
  product_brand        VARCHAR(255),
  product_category     VARCHAR(120),
  product_size         VARCHAR(120),
  product_notes        TEXT,

  -- Retailer target
  retailer_target      VARCHAR(120),
  retailer_specific    TEXT,

  -- Verification answers (JSONB)
  answers              JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  language             VARCHAR(8) DEFAULT 'en',
  ip_address           VARCHAR(64),
  user_agent           TEXT,
  consent_anonymized   BOOLEAN NOT NULL DEFAULT FALSE,
  consent_contact      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Workflow
  status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | VERIFIED | REJECTED | DISPATCHED | CLOSED
  status_note          TEXT,
  agent_assigned_id    VARCHAR(64),

  -- Timestamps
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at          TIMESTAMPTZ,
  dispatched_at        TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wesource_status      ON wesource_requests(status);
CREATE INDEX IF NOT EXISTS idx_wesource_zip         ON wesource_requests(zip);
CREATE INDEX IF NOT EXISTS idx_wesource_state       ON wesource_requests(state);
CREATE INDEX IF NOT EXISTS idx_wesource_submitted   ON wesource_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_wesource_email       ON wesource_requests(email);
CREATE INDEX IF NOT EXISTS idx_wesource_product     ON wesource_requests(product_name);

-- Optional: track each retailer outreach per request
CREATE TABLE IF NOT EXISTS wesource_outreach (
  id                   SERIAL PRIMARY KEY,
  request_id           VARCHAR(64) NOT NULL REFERENCES wesource_requests(id) ON DELETE CASCADE,
  retailer_email       VARCHAR(255) NOT NULL,
  retailer_company     VARCHAR(255),
  retailer_type        VARCHAR(80),
  sent_at              TIMESTAMPTZ DEFAULT NOW(),
  delivered            BOOLEAN DEFAULT FALSE,
  opened_at            TIMESTAMPTZ,
  clicked_at           TIMESTAMPTZ,
  replied_at           TIMESTAMPTZ,
  reply_text           TEXT
);

CREATE INDEX IF NOT EXISTS idx_wesource_outreach_request ON wesource_outreach(request_id);
CREATE INDEX IF NOT EXISTS idx_wesource_outreach_email   ON wesource_outreach(retailer_email);
