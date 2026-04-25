-- Track signed NDA + Commission Agreement per partner
CREATE TABLE IF NOT EXISTS factor_partner_agreements (
  id SERIAL PRIMARY KEY,
  partner_id VARCHAR(20) NOT NULL,
  partner_name VARCHAR(100),
  nda_status VARCHAR(20) DEFAULT 'NOT_SENT',
  nda_sent_at TIMESTAMPTZ,
  nda_signed_at TIMESTAMPTZ,
  nda_signed_by VARCHAR(150),
  nda_document_path VARCHAR(500),
  nda_envelope_id VARCHAR(100),
  commission_status VARCHAR(20) DEFAULT 'NOT_SENT',
  commission_sent_at TIMESTAMPTZ,
  commission_signed_at TIMESTAMPTZ,
  commission_signed_by VARCHAR(150),
  commission_document_path VARCHAR(500),
  commission_envelope_id VARCHAR(100),
  commission_rate_year1 NUMERIC(5,2) DEFAULT 15.00,
  commission_rate_trail NUMERIC(5,2) DEFAULT 5.00,
  first_look_hours INTEGER DEFAULT 72,
  lockout_months INTEGER DEFAULT 24,
  governing_law VARCHAR(50) DEFAULT 'California',
  exempt BOOLEAN DEFAULT false,
  exempt_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id)
);

CREATE INDEX IF NOT EXISTS idx_fpa_partner ON factor_partner_agreements(partner_id);
CREATE INDEX IF NOT EXISTS idx_fpa_nda_status ON factor_partner_agreements(nda_status);
CREATE INDEX IF NOT EXISTS idx_fpa_commission_status ON factor_partner_agreements(commission_status);

-- Track per-deal documents (teaser sent, LOI issued, etc.)
CREATE TABLE IF NOT EXISTS factor_deal_documents (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES financing_deals(id),
  partner_id VARCHAR(20) NOT NULL,
  doc_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFTED',
  document_path VARCHAR(500),
  envelope_id VARCHAR(100),
  drafted_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fdd_deal ON factor_deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_fdd_partner ON factor_deal_documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_fdd_status ON factor_deal_documents(status);
CREATE INDEX IF NOT EXISTS idx_fdd_doctype ON factor_deal_documents(doc_type);

-- Seed agreement rows for all 10 partners (LCG exempt - existing relationship)
INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_LCG', 'LCG Capital', true, 'Pre-existing direct relationship with Saul Garcia. No NDA or commission required.', 'Receives unredacted teaser; LOI flow direct.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_LCG');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_AGF', 'Agrifact', false, NULL, 'NDA + Commission required before any deal disclosure.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_AGF');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_QPF', 'Quickpay Funding', false, NULL, 'Florida. PACA-licensed. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_QPF');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_BNK', 'Bankers Factoring', false, NULL, 'Florida. PACA/PASA-licensed. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_BNK');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_1CC', '1st Commercial Credit', false, NULL, 'NY/NJ. PACA-licensed. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_1CC');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_RIV', 'Riviera Finance NJ', false, NULL, 'NJ. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_RIV');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_CCG', 'Capstone Capital Group', false, NULL, 'NYC. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_CCG');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_HCG', 'Hedaya Capital Group', false, NULL, 'NYC. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_HCG');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_PWR', 'Power Funding LTD', false, NULL, 'East Coast. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_PWR');

INSERT INTO factor_partner_agreements (partner_id, partner_name, exempt, exempt_reason, notes)
SELECT 'FP_SCL', 'Scale Funding NJ', false, NULL, 'NJ. NDA + Commission required.'
WHERE NOT EXISTS (SELECT 1 FROM factor_partner_agreements WHERE partner_id='FP_SCL');

SELECT 'factor_partner_agreements + factor_deal_documents seeded' AS status;