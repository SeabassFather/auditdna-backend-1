-- ============================================================================
-- AuditDNA — Multi-Vertical Email Campaign Engine + Internal Inbox
-- File: C:\AuditDNA\backend\migrations\email_campaigns_pasadena_migration.sql
-- Run: psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f <file>
-- Idempotent: safe to re-run
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EMPLOYEES MASTER (drives signatures + inbox + workspace mailbox map)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mfg_employees (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(100) UNIQUE NOT NULL,
  display_name    VARCHAR(150) NOT NULL,
  title           VARCHAR(150),
  primary_email   VARCHAR(150) UNIQUE NOT NULL,    -- @mfginc.com address
  alt_emails      JSONB DEFAULT '[]'::jsonb,        -- gmail backup, RE alias, etc
  workspace_active BOOLEAN DEFAULT false,           -- true once Google Workspace mailbox is provisioned
  smtp_user       VARCHAR(150),                     -- if individual SMTP config (Workspace), else NULL = uses master
  phone_us        VARCHAR(30),
  phone_mx        VARCHAR(30),
  signature_addr  TEXT DEFAULT '750 E Green St #305, Pasadena, CA 91101, United States',
  vertical_access JSONB DEFAULT '[]'::jsonb,        -- ['RE_BAJA','LOAF_PROMO',...] verticals this user can fire
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

INSERT INTO mfg_employees (username, display_name, title, primary_email, phone_us, phone_mx, vertical_access)
VALUES
  ('saul',           'Saul Garcia',        'Founder & CEO',                'saul@mfginc.com',    '+1-831-251-3116', '+52-646-340-2686', '["RE_BAJA","LOAF_PROMO","COCONUT_WATER","AVOCADO_PROGRAM","SOURCING_SVCS","FACTORING_SVCS","PO_FINANCE","DEVAN_INC"]'::jsonb),
  ('palt@mfginc.com','Pablo Alatorre',     'Admin - Internal Operations',  'palt@mfginc.com',    '+1-831-251-3116', '+52-646-340-2686', '["LOAF_PROMO","COCONUT_WATER","AVOCADO_PROGRAM","SOURCING_SVCS"]'::jsonb),
  ('ogut@mfginc.com','Osvaldo Gutierrez',  'Admin - Sales & Marketing',    'ogut@mfginc.com',    '+1-831-251-3116', '+52-646-340-2686', '["LOAF_PROMO","COCONUT_WATER","AVOCADO_PROGRAM","SOURCING_SVCS","FACTORING_SVCS","PO_FINANCE"]'::jsonb),
  ('jlgz@mfginc.com','Jose Luis Gonzales', 'Admin - Sales',                'jlgz@mfginc.com',    '+1-831-251-3116', '+52-646-340-2686', '["LOAF_PROMO","COCONUT_WATER","AVOCADO_PROGRAM","SOURCING_SVCS"]'::jsonb),
  ('hmar@mfginc.com','Hector Mariscal',    'Admin - Sales',                'hmar@mfginc.com',    '+1-831-251-3116', '+52-646-340-2686', '["LOAF_PROMO","COCONUT_WATER","AVOCADO_PROGRAM","SOURCING_SVCS","DEVAN_INC"]'::jsonb),
  ('ecor@mfginc.com','Eliott Cordova',     'Admin - Sales',                'ecor@mfginc.com',    '+1-831-251-3116', '+52-646-340-2686', '["LOAF_PROMO","COCONUT_WATER","AVOCADO_PROGRAM","SOURCING_SVCS"]'::jsonb),
  ('denisse',        'Denisse',            'Admin - Administrative',       'denisse@mfginc.com', '+1-831-251-3116', '+52-646-340-2686', '["LOAF_PROMO","SOURCING_SVCS"]'::jsonb)
ON CONFLICT (username) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  title = EXCLUDED.title,
  primary_email = EXCLUDED.primary_email,
  vertical_access = EXCLUDED.vertical_access,
  signature_addr = EXCLUDED.signature_addr;

-- ----------------------------------------------------------------------------
-- 2. CAMPAIGN VERTICALS (8 master configs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_verticals (
  id                  VARCHAR(40) PRIMARY KEY,
  name_en             VARCHAR(150) NOT NULL,
  name_es             VARCHAR(150) NOT NULL,
  sender_email        VARCHAR(150),                 -- NULL means dynamic per-user
  sender_name_static  VARCHAR(150),                 -- NULL means dynamic per-user
  sender_title_static VARCHAR(150),                 -- NULL means dynamic per-user
  brand_line          VARCHAR(150) NOT NULL,
  brand_url           VARCHAR(200),
  audience_filter     JSONB NOT NULL DEFAULT '{}'::jsonb,
  send_days           VARCHAR(50) NOT NULL,         -- 'Mon,Wed,Fri'
  send_time_utc       VARCHAR(10) NOT NULL,         -- '14:00'
  frequency_per_week  SMALLINT NOT NULL,
  ai_prompt_template  TEXT NOT NULL,
  asset_folder        VARCHAR(200),
  footer_addr         TEXT NOT NULL DEFAULT '750 E Green St #305, Pasadena, CA 91101, United States',
  enabled             BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW()
);

INSERT INTO campaign_verticals (id, name_en, name_es, sender_email, sender_name_static, sender_title_static, brand_line, brand_url, audience_filter, send_days, send_time_utc, frequency_per_week, ai_prompt_template, asset_folder, enabled)
VALUES
  ('RE_BAJA',
   'Real Estate Baja - Bienes Raices', 'Bienes Raices Baja - Ensenada y Sur',
   'bienesraices@mfginc.com', 'Saul Garcia', 'Bienes Raices - Ventas',
   'MFG Bienes Raices', 'www.enjoybaja.com',
   '{"source":"enjoybaja","interests":["real_estate","property","investor","baja_property"]}'::jsonb,
   'Tue,Fri', '14:00', 2,
   'You are Saul Garcia, Bienes Raices - Ventas at MFG Bienes Raices (a division of Mexausa Food Group, Inc.). Write a warm, professional bilingual email about Baja California real estate (Ensenada and south). NEVER mention agriculture, NMLS, PACA, food, or produce operations. Focus on property highlights, ocean views, investor opportunities, FSBO listings, lots, and homes. Include a call-to-action: WhatsApp +52-646-340-2686 or email bienesraices@mfginc.com or visit www.enjoybaja.com. Sign as: Saul Garcia, Bienes Raices - Ventas, MFG Bienes Raices.',
   '/campaign_assets/RE_BAJA/', true),

  ('LOAF_PROMO',
   'LOAF Marketplace Promotion', 'Promocion LOAF',
   NULL, NULL, NULL,
   'Mexausa Food Group, Inc.', 'https://loaf.mexausafg.com',
   '{"broad":true,"exclude_roles":[]}'::jsonb,
   'Mon,Wed,Fri', '14:00', 3,
   'You are {{user_name}}, {{user_title}} at Mexausa Food Group, Inc. Write a professional bilingual email pitching LOAF (the anonymous post-and-bid platform for growers, retailers, and producers). Key points: MFG Inc is the direct buyer (licensed wholesaler), 10-minute auction windows, private bids (other growers cannot see your offer), works offline, photo proof for disputes, 30-day standard or 24-hour factoring payment options. Audience: growers, chain stores, retailers, food producers. Include CTA to register at loaf.mexausafg.com.',
   '/campaign_assets/LOAF_PROMO/', true),

  ('COCONUT_WATER',
   'Coconut Water Wholesale Program', 'Programa Mayorista de Agua de Coco',
   NULL, NULL, NULL,
   'Mexausa Food Group, Inc.', 'www.mexausafg.com',
   '{"buyer_type":["wholesaler","distributor","retailer"],"country":"USA"}'::jsonb,
   'Tue,Thu', '15:00', 2,
   'You are {{user_name}}, {{user_title}} at Mexausa Food Group, Inc. Write a professional email to USA wholesalers and distributors about our coconut water program. Key points: direct from origin, full FDA compliance, FSMA 204 traceable, container-load programs, white-label and private-label options. Audience: USA wholesale buyers and distributors. Include pricing CTA and call/email contact.',
   '/campaign_assets/COCONUT_WATER/', true),

  ('AVOCADO_PROGRAM',
   'Avocado Program (Fresh + Frozen + Pulp/Guacamole)', 'Programa de Aguacate (Fresco + Congelado + Pulpa)',
   NULL, NULL, NULL,
   'Mexausa Food Group, Inc.', 'www.mexausafg.com',
   '{"commodity_interest":["avocado","guacamole","frozen_avocado"]}'::jsonb,
   'Mon,Wed,Fri', '16:00', 3,
   'You are {{user_name}}, {{user_title}} at Mexausa Food Group, Inc. Write a professional email about our year-round avocado program: Fresh Hass (48ct/60ct/70ct from Michoacan and Jalisco), Frozen Avocado Pulp, and Guacamole programs. Key points: direct from grower, no broker layers, FSMA 204 traceable, SENASICA + USDA certified, weekly volume programs, spot pricing, contract programs. Audience: buyers, retailers, foodservice, processors. Include pricing CTA.',
   '/campaign_assets/AVOCADO_PROGRAM/', true),

  ('SOURCING_SVCS',
   'Product Sourcing Services for Buyers', 'Servicios de Abastecimiento para Compradores',
   NULL, NULL, NULL,
   'Mexausa Food Group, Inc.', 'www.mexausafg.com',
   '{"buyer_type":["buyer","wholesaler","broker","retailer"]}'::jsonb,
   'Tue,Thu', '14:00', 2,
   'You are {{user_name}}, {{user_title}} at Mexausa Food Group, Inc. Write a professional email pitching our product sourcing services to USA buyers, wholesalers, and brokers. Key points: 5,000+ verified Mexican grower network, AI-matched supply for any commodity request, FSMA 204 compliance built-in, blind buyer-grower marketplace, weekly RFQ matching, no upfront fees, commission on closed deals only. Include CTA: send us your sourcing list at sourcing@mfginc.com.',
   '/campaign_assets/SOURCING_SVCS/', true),

  ('FACTORING_SVCS',
   'Factoring Services for Exporters & Growers', 'Servicios de Factoraje para Exportadores y Productores',
   NULL, NULL, NULL,
   'Mexausa Food Group, Inc.', 'www.mexausafg.com',
   '{"role":["exporter","grower"],"has_usa_clients":true}'::jsonb,
   'Tue,Thu', '16:00', 2,
   'You are {{user_name}}, {{user_title}} at Mexausa Food Group, Inc. Write a professional email pitching our factoring services to exporters and growers with USA client base. Key points: 24-hour funding, 85-92% advance rates (4 tiers), no recourse options, USDA PACA-licensed clients only, no minimum volume, blind lender disclosure (LOI->NDA->Term Sheet sequence). Audience: Mexican exporters with USA clients, growers shipping to USA. Include CTA: factoring@mfginc.com.',
   '/campaign_assets/FACTORING_SVCS/', true),

  ('PO_FINANCE',
   'Purchase Order Finance for USA Importers', 'Financiamiento de Ordenes de Compra para Importadores USA',
   NULL, NULL, NULL,
   'Mexausa Food Group, Inc.', 'www.mexausafg.com',
   '{"role":["importer","buyer","wholesaler"],"country":"USA"}'::jsonb,
   'Mon,Thu', '14:00', 2,
   'You are {{user_name}}, {{user_title}} at Mexausa Food Group, Inc. Write a professional email about Purchase Order Finance for USA importers, buyers, and wholesalers. Key points: PO financing up to $5M per order, secured by purchase orders from creditworthy buyers, fund foreign supplier payments, no equity dilution, blind lender disclosure protocol (LOI->NDA->Term Sheet). Audience: USA importers, buyers, wholesalers. Include CTA: pofinance@mfginc.com.',
   '/campaign_assets/PO_FINANCE/', true),

  ('DEVAN_INC',
   'Devan, Inc. Services for Growers', 'Servicios Devan, Inc. para Productores',
   NULL, NULL, NULL,
   'Devan, Inc.', 'www.mexausafg.com/devan',
   '{"role":["grower"],"country":["USA","MX"]}'::jsonb,
   'Wed,Fri', '15:00', 2,
   'You are {{user_name}} representing Devan, Inc. (paid contractor services). Write a professional email about Devan, Inc. services for growers in USA and Mexico. Key points: contracted operations support, paid contractor model, growers connect for services. Audience: growers in USA and Mexico. Include CTA: devan@mfginc.com.',
   '/campaign_assets/DEVAN_INC/', true)

ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_es = EXCLUDED.name_es,
  sender_email = EXCLUDED.sender_email,
  brand_line = EXCLUDED.brand_line,
  brand_url = EXCLUDED.brand_url,
  audience_filter = EXCLUDED.audience_filter,
  send_days = EXCLUDED.send_days,
  send_time_utc = EXCLUDED.send_time_utc,
  frequency_per_week = EXCLUDED.frequency_per_week,
  ai_prompt_template = EXCLUDED.ai_prompt_template,
  asset_folder = EXCLUDED.asset_folder,
  enabled = EXCLUDED.enabled;

-- ----------------------------------------------------------------------------
-- 3. CAMPAIGN RUNS (each scheduled or manual fire)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_runs (
  id                SERIAL PRIMARY KEY,
  vertical_id       VARCHAR(40) NOT NULL REFERENCES campaign_verticals(id),
  fired_by_user     VARCHAR(100),                  -- which employee fired/scheduled
  scheduled_for     TIMESTAMP NOT NULL,
  status            VARCHAR(20) DEFAULT 'queued',  -- queued/sending/sent/failed/cancelled
  segment_snapshot  JSONB,                         -- audience filter at fire time
  recipient_count   INTEGER DEFAULT 0,
  sent_count        INTEGER DEFAULT 0,
  opens             INTEGER DEFAULT 0,
  clicks            INTEGER DEFAULT 0,
  bounces           INTEGER DEFAULT 0,
  unsubscribes      INTEGER DEFAULT 0,
  subject_template  TEXT,
  body_template     TEXT,
  attached_assets   JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMP DEFAULT NOW(),
  completed_at      TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_campaign_runs_status ON campaign_runs(status, scheduled_for);

-- ----------------------------------------------------------------------------
-- 4. CAMPAIGN SENDS (each individual recipient send)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_sends_v2 (
  id              SERIAL PRIMARY KEY,
  run_id          INTEGER NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
  contact_id      INTEGER,
  email           VARCHAR(200) NOT NULL,
  subject         TEXT,
  body_html       TEXT,
  sent_at         TIMESTAMP,
  open_at         TIMESTAMP,
  click_at        TIMESTAMP,
  bounce_type     VARCHAR(20),                     -- hard/soft/null
  bounce_reason   TEXT,
  unsub_at        TIMESTAMP,
  message_id      VARCHAR(200),                    -- SMTP message-id for bounce tracking
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_v2_email ON campaign_sends_v2(email);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_v2_run ON campaign_sends_v2(run_id);

-- ----------------------------------------------------------------------------
-- 5. VERTICAL OPTOUTS (granular - per vertical)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vertical_optouts (
  id            SERIAL PRIMARY KEY,
  contact_id    INTEGER,
  email         VARCHAR(200) NOT NULL,
  vertical_id   VARCHAR(40) NOT NULL REFERENCES campaign_verticals(id),
  opted_out_at  TIMESTAMP DEFAULT NOW(),
  ip_address    VARCHAR(50),
  reason        TEXT,
  UNIQUE(email, vertical_id)
);
CREATE INDEX IF NOT EXISTS idx_vertical_optouts_email ON vertical_optouts(email);

-- ----------------------------------------------------------------------------
-- 6. SUPPRESSION LIST (master kill - removes from ALL verticals)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppression_list (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(200) UNIQUE NOT NULL,
  reason        VARCHAR(50) NOT NULL,              -- hard_bounce/spam_complaint/global_unsub/manual
  added_at      TIMESTAMP DEFAULT NOW(),
  added_by      VARCHAR(100),
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_suppression_email ON suppression_list(email);

-- ----------------------------------------------------------------------------
-- 7. INTERNAL INBOX (Inbox A - in-app messaging between employees)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internal_messages (
  id            SERIAL PRIMARY KEY,
  thread_id     INTEGER,                           -- groups messages into threads
  from_user     VARCHAR(100) NOT NULL,             -- employee username
  to_users      JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of usernames
  cc_users      JSONB DEFAULT '[]'::jsonb,
  subject       TEXT,
  body          TEXT NOT NULL,
  body_html     TEXT,
  attachments   JSONB DEFAULT '[]'::jsonb,
  priority      VARCHAR(20) DEFAULT 'normal',      -- low/normal/high/urgent
  read_by       JSONB DEFAULT '[]'::jsonb,         -- array of usernames who read it
  starred_by    JSONB DEFAULT '[]'::jsonb,
  archived_by   JSONB DEFAULT '[]'::jsonb,
  related_contact_id INTEGER,                      -- optional link to CRM contact
  related_vertical   VARCHAR(40),                  -- optional link to campaign vertical
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_internal_msgs_to ON internal_messages USING GIN (to_users);
CREATE INDEX IF NOT EXISTS idx_internal_msgs_from ON internal_messages(from_user);
CREATE INDEX IF NOT EXISTS idx_internal_msgs_thread ON internal_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_internal_msgs_created ON internal_messages(created_at DESC);

-- ----------------------------------------------------------------------------
-- 8. CAMPAIGN ASSETS (uploaded flyers/brochures per vertical)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_assets (
  id            SERIAL PRIMARY KEY,
  vertical_id   VARCHAR(40) NOT NULL REFERENCES campaign_verticals(id),
  filename      VARCHAR(300) NOT NULL,
  file_url      VARCHAR(500) NOT NULL,
  file_type     VARCHAR(50),                       -- flyer/brochure/photo/video/spec_sheet
  uploaded_by   VARCHAR(100),
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assets_vertical ON campaign_assets(vertical_id, active);

-- ----------------------------------------------------------------------------
-- 9. THROTTLE LOG (per-contact frequency tracker)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_send_log (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(200) NOT NULL,
  vertical_id   VARCHAR(40) NOT NULL,
  sent_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_send_log ON contact_send_log(email, sent_at);

-- ============================================================================
-- DONE. Verify with:
--   SELECT id, name_en, sender_email, frequency_per_week FROM campaign_verticals;
--   SELECT username, primary_email, jsonb_array_length(vertical_access) AS vert_count FROM mfg_employees;
-- ============================================================================
