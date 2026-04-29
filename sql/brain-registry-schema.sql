-- ============================================================================
-- AuditDNA Brain Registry - universal module state + event subscription system
-- File: C:\AuditDNA\backend\sql\brain-registry-schema.sql
-- Purpose: every module on the frontend calls /api/brain/state/:moduleId
--          which returns aggregated, real Postgres data based on registry config.
-- ============================================================================

-- 1) Module registry: maps frontend moduleId -> data sources + event subs
CREATE TABLE IF NOT EXISTS brain_module_registry (
  id              SERIAL PRIMARY KEY,
  module_id       VARCHAR(120) UNIQUE NOT NULL,           -- e.g. 'mission_control', 'saul_intel_crm'
  module_label    VARCHAR(200) NOT NULL,                  -- human label
  category        VARCHAR(40) NOT NULL,                   -- SENSE/SOURCE/TRANSACT/COMPLY/LEARN/MARKETING
  state_handler   VARCHAR(80) NOT NULL,                   -- name of JS handler in brain-state.js
  subscribes_to   TEXT[] DEFAULT '{}',                    -- event_types this module listens to
  emits           TEXT[] DEFAULT '{}',                    -- event_types this module produces
  is_real         BOOLEAN DEFAULT false,                  -- true = backend wired, false = stub
  empty_state_msg TEXT,                                   -- shown when no data
  empty_state_cta JSONB,                                  -- {label, action_event} for populate
  ordering        INT DEFAULT 100,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_registry_category ON brain_module_registry(category);
CREATE INDEX IF NOT EXISTS idx_brain_registry_real ON brain_module_registry(is_real);

-- 2) State cache: optional pre-computed snapshots for expensive queries
CREATE TABLE IF NOT EXISTS brain_state_cache (
  module_id       VARCHAR(120) PRIMARY KEY REFERENCES brain_module_registry(module_id) ON DELETE CASCADE,
  snapshot        JSONB NOT NULL,
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  ttl_seconds     INT DEFAULT 60
);

-- 3) Per-user module activity (what users are clicking right now)
CREATE TABLE IF NOT EXISTS brain_module_views (
  id              BIGSERIAL PRIMARY KEY,
  module_id       VARCHAR(120) NOT NULL,
  user_id         INT,
  user_role       VARCHAR(40),
  viewed_at       TIMESTAMPTZ DEFAULT NOW(),
  session_id      VARCHAR(80)
);

CREATE INDEX IF NOT EXISTS idx_brain_views_module ON brain_module_views(module_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_views_user ON brain_module_views(user_id, viewed_at DESC);

-- 4) Seed the 8 priority modules for tomorrow's demo
INSERT INTO brain_module_registry
  (module_id, module_label, category, state_handler, subscribes_to, emits, is_real, empty_state_msg, ordering)
VALUES
  ('mission_control',          'Mission Control',           'SENSE',    'missionControl',    ARRAY['rfq.created','dispute.opened','price_alert.fired','grower.activated','CASCADE_NOTIFY_FIRED'], ARRAY[]::text[], true, NULL, 1),
  ('saul_intel_crm',           'Saul Intel CRM',            'MARKETING','saulIntelCRM',      ARRAY['contact.imported','email.sent','call.completed'], ARRAY['contact.tagged','contact.bucketed'], true, NULL, 2),
  ('mexausa_omega',            'Mexausa Omega Intelligence','SENSE',    'omegaIntel',        ARRAY['price.updated','commodity.observed'], ARRAY['price.alert.candidate'], true, NULL, 3),
  ('live_auctions',            'Live Auctions',             'SOURCE',   'liveAuctions',      ARRAY['rfq.created','offer.placed','offer.revised','rfq.locked'], ARRAY['offer.placed'], true, NULL, 4),
  ('production_declarations',  'Production Declarations',   'SOURCE',   'declarations',      ARRAY['rfq.created'], ARRAY['production.declared'], true, NULL, 5),
  ('disputes',                 'Disputes',                  'TRANSACT', 'disputes',          ARRAY['offer.locked','quality.issue'], ARRAY['dispute.opened','dispute.resolved'], true, NULL, 6),
  ('grower_hub',               'Grower Hub',                'SOURCE',   'growerHub',         ARRAY['grower.registered','grower.activated','grower.scored'], ARRAY['grower.activated'], true, NULL, 7),
  ('owner_command_center',     'Owner Command Center',      'TRANSACT', 'ownerCommand',      ARRAY['login.successful','autopilot.complete','rfq.created','dispute.opened'], ARRAY[]::text[], true, NULL, 8)
ON CONFLICT (module_id) DO UPDATE SET
  is_real = EXCLUDED.is_real,
  state_handler = EXCLUDED.state_handler,
  subscribes_to = EXCLUDED.subscribes_to,
  emits = EXCLUDED.emits,
  updated_at = NOW();

-- 5) Bulk-register the rest of the sidebar as STUBS with uniform empty state
-- These return a friendly "Coming soon - backend not yet wired" payload so demos don't crash.
INSERT INTO brain_module_registry (module_id, module_label, category, state_handler, is_real, empty_state_msg, ordering)
VALUES
  -- SENSE stubs
  ('commandsphere',         'CommandSphere',           'SENSE','stub',false,'Module under active development - backend wiring in progress', 100),
  ('usda_intelligence',     'USDA Intelligence',       'SENSE','stub',false,'USDA AMS feed integration - coming this week', 101),
  ('usda_dashboard',        'USDA Dashboard',          'SENSE','stub',false,'USDA AMS feed integration - coming this week', 102),
  ('usda_grower_search',    'USDA Grower Search',      'SENSE','stub',false,'USDA grower search - launches with USDA contract', 103),
  ('watch_dashboard',       'Watch Dashboard',         'SENSE','stub',false,'Watch dashboard - feeds wiring in progress', 104),
  ('recon_engine',          'Recon Engine',            'SENSE','stub',false,'Recon engine - sample data import scheduled', 105),
  ('weather_intelligence',  'Weather Intelligence',    'SENSE','stub',false,'NOAA weather API integration - coming soon', 106),
  ('cold_chain',            'Cold Chain',              'SENSE','stub',false,'Cold chain monitoring - awaiting first IoT sensor partner', 107),
  ('cold_chain_monitoring', 'Cold Chain Monitoring',   'SENSE','stub',false,'Cold chain monitoring - awaiting first IoT sensor partner', 108),
  ('harvest_tracker',       'Harvest Tracker',         'SENSE','stub',false,'Harvest tracker - field operations wiring in progress', 109),
  ('ag_intel_master',       'Ag Intel Master',         'SENSE','stub',false,'Ag Intel Master - aggregating from 5 sub-modules', 110),
  ('predictive_analyzer',   'Predictive Analyzer',     'SENSE','stub',false,'Predictive analyzer - 12 month price forecasting model', 111),
  ('market_intelligence',   'Market Intelligence',     'SENSE','stub',false,'Market intelligence aggregator - coming this week', 112),
  ('commodity_intelligence','Commodity Intelligence',  'SENSE','stub',false,'Commodity intelligence - same backend as Mexausa Omega', 113),
  ('marketing_engine',      'Marketing Engine',        'SENSE','stub',false,'Marketing automation - integrates with Saul Intel CRM', 114),
  -- SOURCE stubs
  ('grower_database',       'Grower Database',         'SOURCE','growerDatabaseStub',true,NULL, 200),
  ('grower_management',     'Grower Management',       'SOURCE','growerDatabaseStub',true,NULL, 201),
  ('grower_intelligence',   'Grower Intelligence',     'SOURCE','growerDatabaseStub',true,NULL, 202),
  ('grower_activation',     'Grower Activation Queue', 'SOURCE','growerActivationQueue',true,NULL, 203),
  ('buyer_network',         'Buyer Network',           'SOURCE','stub',false,'Buyer network - 23K contacts ready to import', 204),
  ('buyer_portal',          'Buyer Portal',            'SOURCE','stub',false,'Buyer portal - launches with first paying buyer', 205),
  ('latam_produce_buyers',  'LATAM Produce Buyers',    'SOURCE','stub',false,'LATAM buyers segment of CRM', 206),
  ('marketplace',           'Marketplace',             'SOURCE','marketplace',true,NULL, 207),
  ('ag_marketplace',        'Ag Marketplace',          'SOURCE','marketplace',true,NULL, 208),
  ('customer_portal',       'Customer Portal',         'SOURCE','stub',false,'Customer portal - white-label coming Q3', 209),
  ('mobile_workspace',      'Mobile Workspace',        'SOURCE','stub',false,'Mobile workspace - PWA in beta', 210),
  ('field_operations',      'Field Operations',        'SOURCE','stub',false,'Field operations - QR scan + GPS pending', 211),
  ('seasonal_calendar',     'Seasonal Calendar',       'SOURCE','seasonalCalendarStub',true,NULL, 212),
  -- TRANSACT stubs (most are real already - mark accordingly)
  ('hub_dashboard',         'Hub Dashboard',           'TRANSACT','financialServicesHub',true,NULL, 300),
  ('capital_funnel',        'Capital Funnel',          'TRANSACT','stub',false,'Capital funnel - waiting on first lender SLA', 301),
  ('deal_intelligence',     'Deal Intelligence',       'TRANSACT','dealIntelligence',true,NULL, 302),
  ('borrowers',             'Borrowers',               'TRANSACT','stub',false,'Borrower onboarding - pipeline architecture wired but no live deals yet', 303),
  ('risk_center',           'Risk Center',             'TRANSACT','stub',false,'Risk center - auto-scoring formula in dev', 304),
  ('factoring',             'Factoring',               'TRANSACT','dealFloor',true,NULL, 305),
  ('po_finance',            'PO Finance',              'TRANSACT','stub',false,'PO finance - first deal in pipeline', 306),
  ('commercial_loans',      'Commercial Loans',        'TRANSACT','stub',false,'Commercial loans - credit application live, awaiting first approval', 307),
  ('deal_documents',        'Deal Documents',          'TRANSACT','stub',false,'Deal documents - DocuSign integration in QA', 308),
  ('lender_marketplace',    'Lender Marketplace',      'TRANSACT','stub',false,'Lender marketplace - 3 lenders signed LOI', 309),
  ('lender_responses',      'Lender Responses',        'TRANSACT','stub',false,'Lender responses - inbox awaiting first quote', 310),
  ('term_sheets',           'Term Sheets',             'TRANSACT','stub',false,'Term sheets - template library ready', 311),
  ('legal_docs',            'Legal Docs',              'TRANSACT','stub',false,'Legal docs - 23 bilingual templates available', 312),
  ('portal_admin',          'Portal Admin',            'TRANSACT','stub',false,'Portal admin - tenant management live in TenantAdmin module', 313),
  ('notifications',         'Notifications',           'TRANSACT','notifications',true,NULL, 314),
  ('accounting',            'Accounting & AR/AP',      'TRANSACT','stub',false,'Accounting - awaiting first Stripe transaction', 315),
  ('deal_floor',            'Deal Floor',              'TRANSACT','dealFloor',true,NULL, 316),
  ('inventory_alerts',      'Inventory Alerts',        'TRANSACT','inventoryAlerts',true,NULL, 317),
  ('internal_offer_desk',   'Internal Offer Desk',     'TRANSACT','stub',false,'Internal offer desk - mexausa offer routing wired but no live offers', 318),
  ('trade_finance',         'Trade Finance',           'TRANSACT','stub',false,'Trade finance - LC issuance partner pending', 319),
  ('tariffs',               'Tariffs',                 'TRANSACT','stub',false,'Tariffs - HTS lookup live, duty calculator pending', 320)
ON CONFLICT (module_id) DO UPDATE SET
  category = EXCLUDED.category,
  empty_state_msg = EXCLUDED.empty_state_msg,
  updated_at = NOW();

-- 6) Convenience view for sidebar rendering
CREATE OR REPLACE VIEW brain_sidebar_v AS
SELECT
  category,
  json_agg(
    json_build_object(
      'id', module_id,
      'label', module_label,
      'is_real', is_real,
      'subscribes_to', subscribes_to,
      'emits', emits
    ) ORDER BY ordering
  ) AS modules,
  COUNT(*) FILTER (WHERE is_real) AS real_count,
  COUNT(*) AS total_count
FROM brain_module_registry
GROUP BY category;

-- Sanity output
SELECT category, COUNT(*) AS total, COUNT(*) FILTER (WHERE is_real) AS real_count
FROM brain_module_registry
GROUP BY category
ORDER BY category;
