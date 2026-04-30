-- =============================================================================
-- AGENT WIZARDS -- DATABASE SCHEMA
-- Save to: C:\AuditDNA\backend\migrations\agent_sessions_schema.sql
-- =============================================================================
-- Three agents: Enrique (grower onboarding), Eliot (buyer inquiry), Diego (SI compliance).
--
-- Run on local + Railway:
--   psql -h localhost -p 5432 -U postgres -d auditdna -f agent_sessions_schema.sql
--   psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f agent_sessions_schema.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- agent_sessions: one row per agent run (live or completed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_sessions (
  id                  VARCHAR(64)  PRIMARY KEY,
  agent_type          VARCHAR(20)  NOT NULL,             -- enrique | eliot | diego | router
  language            VARCHAR(8)   DEFAULT 'es',         -- es | en
  user_id             VARCHAR(120),                      -- nullable for anonymous public sessions
  user_email          VARCHAR(255),
  user_phone          VARCHAR(40),
  user_name           VARCHAR(255),
  ip_address          INET,
  user_agent          TEXT,
  source              VARCHAR(40)  DEFAULT 'web',        -- web | loaf | sphere | sidebar | public_landing | whatsapp | sms
  state               JSONB        DEFAULT '{}'::jsonb,  -- collected data so far
  current_step        VARCHAR(60),
  total_steps         INT,
  completed_steps     JSONB        DEFAULT '[]'::jsonb,
  status              VARCHAR(20)  DEFAULT 'active',     -- active | completed | abandoned | escalated | flagged | paused
  token_count_input   INT          DEFAULT 0,
  token_count_output  INT          DEFAULT 0,
  token_cap           INT          DEFAULT 50000,        -- ~$0.15 in sonnet input tokens
  cost_cents          INT          DEFAULT 0,
  resume_token        VARCHAR(120) UNIQUE,               -- magic link to resume session
  parent_session_id   VARCHAR(64),                       -- if router handed off, link back
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW(),
  last_active_at      TIMESTAMPTZ  DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- agent_messages: full conversation history (every turn, every tool call)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_messages (
  id                  BIGSERIAL    PRIMARY KEY,
  session_id          VARCHAR(64)  NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  role                VARCHAR(20)  NOT NULL,             -- user | assistant | system | tool_use | tool_result
  content             TEXT,
  metadata            JSONB        DEFAULT '{}'::jsonb,  -- tool_name, args, attachments, form_fragment, next_step
  tokens_input        INT,
  tokens_output       INT,
  cost_cents          INT,
  model               VARCHAR(60),
  latency_ms          INT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- onboarding_sessions: Enrique's deliverable -- pending Diego SI review
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id                  VARCHAR(64)  PRIMARY KEY,
  agent_session_id    VARCHAR(64)  REFERENCES agent_sessions(id),
  onboarding_type     VARCHAR(20)  NOT NULL,             -- grower | buyer | shipper | packer | distributor
  applicant_name      VARCHAR(255),
  applicant_email     VARCHAR(255),
  applicant_phone     VARCHAR(40),
  company_name        VARCHAR(255),
  paca_number         VARCHAR(40),
  rfc                 VARCHAR(40),
  ein                 VARCHAR(40),
  state_region        VARCHAR(120),
  city                VARCHAR(120),
  country             VARCHAR(40),
  collected_data      JSONB        NOT NULL,             -- full structured payload
  documents           JSONB        DEFAULT '[]'::jsonb,  -- [{kind, filename, url, size, uploaded_at}]
  photos              JSONB        DEFAULT '[]'::jsonb,
  certifications      JSONB        DEFAULT '[]'::jsonb,  -- [{type, status, expires_at, document_ref}]
  commodities         JSONB        DEFAULT '[]'::jsonb,  -- [{commodity_id, volume, season, price_floor, ...}]
  status              VARCHAR(20)  DEFAULT 'pending',    -- pending | reviewing | approved | rejected | needs_info | promoted
  diego_score         INT,                               -- compliance score 0-100
  diego_flags         JSONB        DEFAULT '[]'::jsonb,
  diego_checked_at    TIMESTAMPTZ,
  reviewer_id         VARCHAR(120),                      -- saul | pablo | florencio | ozzy | gibran | ariel
  reviewed_at         TIMESTAMPTZ,
  reviewer_notes      TEXT,
  promoted_to_table   VARCHAR(40),                       -- 'growers' | 'buyers' | etc.
  promoted_to_id      VARCHAR(120),
  promoted_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- buyer_inquiries: Eliot's deliverable
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buyer_inquiries (
  id                       VARCHAR(64)  PRIMARY KEY,
  agent_session_id         VARCHAR(64)  REFERENCES agent_sessions(id),
  buyer_name               VARCHAR(255),
  buyer_email              VARCHAR(255),
  buyer_phone              VARCHAR(40),
  buyer_company            VARCHAR(255),
  paca_number              VARCHAR(40),
  business_type            VARCHAR(60),                  -- importer | wholesaler | retailer | broker | foodservice | other
  fob_destination          VARCHAR(255),
  destination_country      VARCHAR(40),
  commodity                VARCHAR(120),
  volume_loads             NUMERIC(10,2),
  unit_size                VARCHAR(40),                  -- 25lb / case / pallet / load
  needed_by                DATE,
  recurring                BOOLEAN      DEFAULT FALSE,
  recurrence_pattern       VARCHAR(40),                  -- weekly | monthly | seasonal
  price_ceiling            NUMERIC(10,2),
  price_currency           VARCHAR(8)   DEFAULT 'USD',
  certifications_required  JSONB        DEFAULT '[]'::jsonb,
  packaging_preference     VARCHAR(120),
  notes                    TEXT,
  matched_growers          JSONB        DEFAULT '[]'::jsonb,  -- [{grower_id, score, distance_km, estimated_price}]
  matches_count            INT          DEFAULT 0,
  wesource_dispatch_id     VARCHAR(64),                  -- if escalated to fan-out
  status                   VARCHAR(20)  DEFAULT 'new',   -- new | matched | dispatched | quoted | accepted | declined | closed
  diego_flags              JSONB        DEFAULT '[]'::jsonb,
  diego_score              INT,
  assigned_to              VARCHAR(120),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  DEFAULT NOW(),
  closed_at                TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- agent_flags: Diego's output stream
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_flags (
  id                  BIGSERIAL    PRIMARY KEY,
  session_id          VARCHAR(64),
  onboarding_id       VARCHAR(64),
  inquiry_id          VARCHAR(64),
  flag_type           VARCHAR(60)  NOT NULL,             -- DUPLICATE_REGISTRATION | INVALID_PACA | EXPIRED_CERT | ID_MISMATCH | etc
  severity            VARCHAR(20)  NOT NULL,             -- info | warning | critical | blocking
  detail              TEXT,
  evidence            JSONB        DEFAULT '{}'::jsonb,
  raised_by           VARCHAR(40)  DEFAULT 'diego',
  raised_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  resolved_by         VARCHAR(120),
  resolution          VARCHAR(20),                       -- false_positive | confirmed | escalated | auto_cleared
  resolution_notes    TEXT
);

-- -----------------------------------------------------------------------------
-- agent_handoffs: when AI hands off to human (Saul/Pablo/Florencio)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_handoffs (
  id                  BIGSERIAL    PRIMARY KEY,
  session_id          VARCHAR(64)  NOT NULL,
  reason              VARCHAR(60)  NOT NULL,             -- TOKEN_CAP | USER_REQUEST | DIEGO_FLAG | AGENT_STUCK | OUT_OF_SCOPE
  context_summary     TEXT,
  full_transcript_ref VARCHAR(120),                      -- pointer for archive lookup
  assigned_to         VARCHAR(120) DEFAULT 'unassigned', -- saul | pablo | florencio | unassigned
  notification_sent   BOOLEAN      DEFAULT FALSE,
  status              VARCHAR(20)  DEFAULT 'pending',    -- pending | claimed | resolved | dropped
  claimed_at          TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user        ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_email       ON agent_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status      ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_resume      ON agent_sessions(resume_token);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active      ON agent_sessions(last_active_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_agent_sessions_type_status ON agent_sessions(agent_type, status);

CREATE INDEX IF NOT EXISTS idx_messages_session           ON agent_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_onboarding_status          ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_email           ON onboarding_sessions(applicant_email);
CREATE INDEX IF NOT EXISTS idx_onboarding_paca            ON onboarding_sessions(paca_number) WHERE paca_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_pending_review  ON onboarding_sessions(diego_checked_at, status) WHERE status IN ('pending','reviewing','needs_info');

CREATE INDEX IF NOT EXISTS idx_inquiries_status           ON buyer_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_email            ON buyer_inquiries(buyer_email);
CREATE INDEX IF NOT EXISTS idx_inquiries_commodity        ON buyer_inquiries(commodity);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned         ON buyer_inquiries(assigned_to) WHERE status NOT IN ('closed','declined');

CREATE INDEX IF NOT EXISTS idx_flags_session              ON agent_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_flags_onboarding           ON agent_flags(onboarding_id) WHERE onboarding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flags_inquiry              ON agent_flags(inquiry_id) WHERE inquiry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flags_unresolved           ON agent_flags(severity, raised_at DESC) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_handoffs_pending           ON agent_handoffs(assigned_to, created_at DESC) WHERE status = 'pending';
