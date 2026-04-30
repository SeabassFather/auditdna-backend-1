-- =============================================================================
-- CAMPAIGN RECIPES -- DATABASE SCHEMA
-- Save to: C:\AuditDNA\backend\migrations\campaign_recipes_schema.sql
-- =============================================================================
-- Run on local + Railway:
--   psql -h localhost -p 5432 -U postgres -d auditdna -f campaign_recipes_schema.sql
--   psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f campaign_recipes_schema.sql
--
-- PURPOSE: Save complete campaign configurations -- subject + body + AI prompt +
-- product selections + audience filter + sender + vertical. Reuse with one click
-- instead of rebuilding from scratch every send.
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaign_recipes (
  id                   VARCHAR(64)  PRIMARY KEY,

  -- Identity
  name                 VARCHAR(200) NOT NULL,
  description          TEXT,
  category             VARCHAR(40)  DEFAULT 'custom',  -- produce | services | real_estate | mortgage | acquisition | wesource | custom

  -- Email content
  subject              VARCHAR(500) NOT NULL,
  body_html            TEXT NOT NULL,
  ai_prompt            TEXT,                            -- the AI/SI command prompt that produced the body, so user can re-run AI with same instructions

  -- Selections (JSONB for flexibility)
  products             JSONB DEFAULT '[]'::jsonb,       -- array of product names/ids selected in Letter Composer
  audience_filter      JSONB DEFAULT '{}'::jsonb,       -- {bucket:'all_buyers', states:['CA','TX'], country:'USA', custom_list:[]}
  attachments          JSONB DEFAULT '[]'::jsonb,       -- array of brochure ids or attachment refs

  -- Routing
  sender_employee_id   VARCHAR(40),                     -- saul | florencio | pablo | gibran | ozzy | ariel
  vertical_id          VARCHAR(64),                     -- avocado | berry | citrus | re_baja | etc (matches CampaignsTab DEFAULT_VERTICALS)
  language             VARCHAR(8) DEFAULT 'en',

  -- Ownership + sharing
  created_by           VARCHAR(120),                    -- email or user id
  shared_with_team     BOOLEAN DEFAULT TRUE,            -- if false, only created_by sees it
  favorite             BOOLEAN DEFAULT FALSE,           -- pin to top

  -- Lifecycle metrics
  use_count            INT DEFAULT 0,
  last_used_at         TIMESTAMPTZ,
  last_used_by         VARCHAR(120),

  -- Timestamps
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_category    ON campaign_recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_vertical    ON campaign_recipes(vertical_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by  ON campaign_recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite    ON campaign_recipes(favorite) WHERE favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_recipes_last_used   ON campaign_recipes(last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_recipes_name_search ON campaign_recipes USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
