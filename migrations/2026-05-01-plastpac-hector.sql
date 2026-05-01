-- ============================================================================
-- AuditDNA Migration: 2026-05-01 Plastpac / EcoCrate / DEVAN, INC. + Hector Mariscal
-- File: C:\AuditDNA\backend\migrations\2026-05-01-plastpac-hector.sql
-- Run on:  localhost AND Railway
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Hector Mariscal as a platform user
-- ----------------------------------------------------------------------------
-- AuditDNA auth_users schema: username, password_hash (bcrypt), access_code (plain), pin (plain)
-- NO email column on AuditDNA auth_users.
-- bcrypt hash below was generated with: bcrypt.hashSync('Devan2026Hector#', 10)
-- Saul: regenerate this hash if you want a different password before applying.

INSERT INTO auth_users (username, password_hash, access_code, pin, role, status, full_name, created_at)
VALUES (
  'hector',
  '$2b$10$Nxq8JVN36GRBDv6u9T0gHuQJSnE.rBSiNr2AHyy1UaOenYI0lk6sy',  -- bcrypt of 'Devan2026Hector#'
  'Devan2026Hector#',
  '8310374',
  'sales_rep',
  'active',
  'Hector Mariscal',
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  status = 'active',
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- ----------------------------------------------------------------------------
-- 2) Sales rep profile (extended attributes for letterhead, contact, scope)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_reps (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(64) UNIQUE NOT NULL,
  display_name    VARCHAR(128) NOT NULL,
  title           VARCHAR(255),
  company         VARCHAR(128),
  territory       VARCHAR(255),
  phone           VARCHAR(64),
  email           VARCHAR(255),
  product_lines   TEXT[],
  letterhead_html TEXT,
  signature_html  TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sales_reps (
  username, display_name, title, company, territory,
  phone, email, product_lines,
  letterhead_html, signature_html
) VALUES (
  'hector',
  'Hector Mariscal',
  'Account Executive of Sales and Distribution; West Coast and Mexico',
  'DEVAN, INC.',
  'West Coast and Mexico',
  '831-998-0374',
  'h11mariscal@gmail.com',
  ARRAY['plastpac','ecocrate','ecosheets','ecopallets'],
  '<div style="border-left:4px solid #0F7B41;padding:12px 16px;background:#F4F6F4;font-family:Arial,sans-serif">'
    || '<div style="font-size:18px;font-weight:700;color:#0F7B41">DEVAN, INC. &middot; Distribution Partner</div>'
    || '<div style="font-size:13px;color:#2A3138;margin-top:4px">Hector Mariscal &middot; Account Executive of Sales and Distribution &middot; West Coast and Mexico</div>'
    || '<div style="font-size:12px;color:#2A3138;margin-top:2px">831-998-0374 &middot; h11mariscal@gmail.com</div>'
  || '</div>',
  '<div style="font-family:Arial,sans-serif;font-size:13px;color:#2A3138;border-top:2px solid #C9A55C;padding-top:8px;margin-top:16px">'
    || '<div style="font-weight:700;color:#0F7B41">Hector Mariscal</div>'
    || '<div>Account Executive of Sales and Distribution; West Coast and Mexico</div>'
    || '<div style="margin-top:4px">DEVAN, INC. &middot; 831-998-0374 &middot; h11mariscal@gmail.com</div>'
  || '</div>'
)
ON CONFLICT (username) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  title = EXCLUDED.title,
  company = EXCLUDED.company,
  territory = EXCLUDED.territory,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  product_lines = EXCLUDED.product_lines,
  letterhead_html = EXCLUDED.letterhead_html,
  signature_html = EXCLUDED.signature_html,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 3) Product catalog (Plastpac/EcoCrate as the first product card)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_products (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(64) UNIQUE NOT NULL,
  name            VARCHAR(128) NOT NULL,
  brand           VARCHAR(128),
  short_pitch     VARCHAR(255),
  description     TEXT,
  description_es  TEXT,
  features        JSONB,
  benefits        JSONB,
  brochure_url    VARCHAR(255),
  rep_username    VARCHAR(64) REFERENCES sales_reps(username) ON DELETE SET NULL,
  notify_emails   TEXT[],
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  glow            BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INT NOT NULL DEFAULT 100,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_products (
  slug, name, brand, short_pitch,
  description, description_es,
  features, benefits, brochure_url,
  rep_username, notify_emails, glow, display_order
) VALUES (
  'plastpac-ecocrate',
  'EcoCrate',
  'Plastpac',
  'The world''s most durable, sustainable packaging for perishables.',
  'Smart, reusable packaging for agriculture, food, retail, and transport. Durable and heavy-duty construction designed to handle travel and storage. 100% recyclable and made in the USA. Waterproof and custom-sized, with custom printing available. Helps reduce waste, prevent soggy or broken boxes, and improve reliability in shipping and storage.',
  'Empaque inteligente y reutilizable para agricultura, alimentos, retail y transporte. Construccion durable y resistente disenada para viaje y almacenamiento. 100% reciclable, hecho en EE.UU. Impermeable, tamanos personalizados, impresion personalizada disponible. Reduce desperdicio, evita cajas mojadas o rotas, mejora confiabilidad en envio y almacenamiento.',
  '[
    "Smart, reusable packaging for agriculture, food, retail, and transport",
    "Durable and heavy-duty construction designed to handle travel and storage",
    "100% recyclable and made in the USA",
    "Waterproof and custom-sized, with custom printing available",
    "Helps reduce waste, prevent soggy or broken boxes, and improve reliability in shipping and storage"
  ]'::jsonb,
  '[
    "Reduces food waste and rejected produce",
    "Reduces fuel consumption (lighter + stackable = more per truckload)",
    "Eliminates re-icing and re-boxing",
    "Mold resistant; no sawdust or wood fragments",
    "Holds up in cooler; protects from spoilage"
  ]'::jsonb,
  'https://loaf.mexausafg.com/brochures/EcoCrate_Brochure_DEVAN_Hector_Mariscal.pdf',
  'hector',
  ARRAY['h11mariscal@gmail.com','sgarcia1911@gmail.com'],
  TRUE,
  1
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  short_pitch = EXCLUDED.short_pitch,
  description = EXCLUDED.description,
  description_es = EXCLUDED.description_es,
  features = EXCLUDED.features,
  benefits = EXCLUDED.benefits,
  brochure_url = EXCLUDED.brochure_url,
  rep_username = EXCLUDED.rep_username,
  notify_emails = EXCLUDED.notify_emails,
  glow = EXCLUDED.glow,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 4) Inquiries table - captures every contact form submit from LOAF / public landing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plastpac_inquiries (
  id                   SERIAL PRIMARY KEY,
  product_slug         VARCHAR(64) NOT NULL DEFAULT 'plastpac-ecocrate',
  source               VARCHAR(64) NOT NULL DEFAULT 'loaf',
  -- contact
  company              VARCHAR(255),
  contact_name         VARCHAR(255),
  contact_role         VARCHAR(128),
  email                VARCHAR(255),
  phone                VARCHAR(64),
  -- box spec
  current_packaging    VARCHAR(64),
  box_dimensions       VARCHAR(128),
  board_style          VARCHAR(128),
  print_requirements   TEXT,
  weight_limit         VARCHAR(64),
  pallet_pattern       VARCHAR(128),
  shipping_address     TEXT,
  ordering_contact     VARCHAR(255),
  notes                TEXT,
  -- meta
  ip_address           VARCHAR(64),
  user_agent           TEXT,
  utm_source           VARCHAR(128),
  utm_medium           VARCHAR(128),
  utm_campaign         VARCHAR(128),
  status               VARCHAR(32) NOT NULL DEFAULT 'new',
  assigned_to          VARCHAR(64),
  notified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plastpac_inquiries_status   ON plastpac_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_plastpac_inquiries_created  ON plastpac_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plastpac_inquiries_assigned ON plastpac_inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_plastpac_inquiries_email    ON plastpac_inquiries(email);

-- ----------------------------------------------------------------------------
-- 5) Outreach campaign log (so Saul can see effectiveness)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plastpac_outreach (
  id                SERIAL PRIMARY KEY,
  product_slug      VARCHAR(64) NOT NULL DEFAULT 'plastpac-ecocrate',
  rep_username      VARCHAR(64),
  contact_id        INT,
  contact_name      VARCHAR(255),
  contact_email     VARCHAR(255),
  contact_company   VARCHAR(255),
  contact_category  VARCHAR(64),
  channel           VARCHAR(32) NOT NULL DEFAULT 'email',
  message_subject   VARCHAR(255),
  message_body      TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ,
  status            VARCHAR(32) NOT NULL DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_plastpac_outreach_rep      ON plastpac_outreach(rep_username);
CREATE INDEX IF NOT EXISTS idx_plastpac_outreach_status   ON plastpac_outreach(status);
CREATE INDEX IF NOT EXISTS idx_plastpac_outreach_sent     ON plastpac_outreach(sent_at DESC);

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================
-- SELECT username, role, status, full_name FROM auth_users WHERE username='hector';
-- SELECT * FROM sales_reps WHERE username='hector';
-- SELECT slug, name, glow, rep_username FROM platform_products;
-- SELECT COUNT(*) FROM plastpac_inquiries;

