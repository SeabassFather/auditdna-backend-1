-- ============================================================
-- FINANCING PARTNER REGISTRY — INTERNAL ONLY
-- Never expose legal_name or contact_email to frontend/public APIs
-- Factoring waterfall: LCG (primary) -> Agrifact (secondary)
-- Ran against Railway postgres on 2026-04-21
-- ============================================================

CREATE TABLE IF NOT EXISTS financing_partner_registry (
  id              TEXT PRIMARY KEY,
  legal_name      TEXT NOT NULL,
  contact_name    TEXT,
  contact_email   TEXT NOT NULL,
  contact_email_secondary TEXT,
  role            TEXT NOT NULL CHECK (role IN ('primary','secondary','tertiary')),
  deal_type       TEXT NOT NULL,
  waterfall_order INT  NOT NULL,
  active          BOOLEAN DEFAULT TRUE,
  public_label    TEXT DEFAULT 'Mexausa Food Group financing partner',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financing_partner_decisions (
  id           SERIAL PRIMARY KEY,
  deal_id      TEXT NOT NULL,
  partner_id   TEXT NOT NULL REFERENCES financing_partner_registry(id),
  decision     TEXT NOT NULL CHECK (decision IN ('pending','accepted','passed','expired')),
  decided_at   TIMESTAMPTZ DEFAULT NOW(),
  decided_by   TEXT,
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_fpr_waterfall
  ON financing_partner_registry (deal_type, waterfall_order)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_fpd_deal
  ON financing_partner_decisions (deal_id, decided_at DESC);

INSERT INTO financing_partner_registry
  (id, legal_name, contact_name, contact_email, role, deal_type, waterfall_order, notes)
VALUES
  ('FP_LCG', 'Liquid Capital Group', 'Amul Purohit',
   'amul.purohit@gmail.com', 'primary', 'factoring', 1,
   'Primary factoring partner. Sees every factoring deal first.'),
  ('FP_AGF', 'Agrifact', 'Tina',
   'tina@agrifact.com', 'secondary', 'factoring', 2,
   'Secondary factoring partner. Receives deal only if LCG passes.')
ON CONFLICT (id) DO UPDATE SET
  legal_name    = EXCLUDED.legal_name,
  contact_name  = EXCLUDED.contact_name,
  contact_email = EXCLUDED.contact_email,
  role          = EXCLUDED.role,
  waterfall_order = EXCLUDED.waterfall_order,
  notes         = EXCLUDED.notes,
  updated_at    = NOW();
