CREATE TABLE IF NOT EXISTS factoring_partner_decisions (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES financing_deals(id),
  partner_id VARCHAR(20) NOT NULL,
  partner_name VARCHAR(100),
  partner_email VARCHAR(150),
  waterfall_order INTEGER NOT NULL,
  decision VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  claude_score NUMERIC(3,2),
  claude_reasoning TEXT,
  advance_rate NUMERIC(3,2),
  factor_rate NUMERIC(4,3),
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notified_via VARCHAR(50),
  ntfy_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fpd_deal ON factoring_partner_decisions(deal_id);
CREATE INDEX IF NOT EXISTS idx_fpd_partner ON factoring_partner_decisions(partner_id);
CREATE INDEX IF NOT EXISTS idx_fpd_decision ON factoring_partner_decisions(decision);
SELECT 'factoring_partner_decisions ready' AS status;