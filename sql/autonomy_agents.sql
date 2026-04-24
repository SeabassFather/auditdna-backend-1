-- AuditDNA Autonomy Phase 2A
DO $$ BEGIN CREATE TYPE autonomy_confidence AS ENUM ('HIGH','BALANCED','LOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE autonomy_queue_status AS ENUM ('PENDING','EXECUTED','REJECTED','EXPIRED','REVIEWING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS autonomy_agents (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  confidence autonomy_confidence NOT NULL DEFAULT 'BALANCED',
  tick_interval_s INT NOT NULL DEFAULT 300,
  last_tick_at TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ,
  total_ticks BIGINT NOT NULL DEFAULT 0,
  total_actions BIGINT NOT NULL DEFAULT 0,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_autonomy_agents_enabled ON autonomy_agents(enabled);

CREATE TABLE IF NOT EXISTS autonomy_events (
  id BIGSERIAL PRIMARY KEY,
  agent_code VARCHAR(8) NOT NULL REFERENCES autonomy_agents(code) ON DELETE CASCADE,
  event_type VARCHAR(48) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  deal_id INT,
  channel_id VARCHAR(64),
  target_email VARCHAR(256),
  title VARCHAR(256),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_autonomy_events_agent_time ON autonomy_events(agent_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomy_events_type ON autonomy_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS autonomy_queue (
  id BIGSERIAL PRIMARY KEY,
  agent_code VARCHAR(8) NOT NULL REFERENCES autonomy_agents(code) ON DELETE CASCADE,
  action_type VARCHAR(48) NOT NULL,
  target_email VARCHAR(256),
  target_id VARCHAR(64),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status autonomy_queue_status NOT NULL DEFAULT 'PENDING',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_autonomy_queue_status ON autonomy_queue(status, scheduled_for);

INSERT INTO autonomy_agents (code,name,description,tick_interval_s,confidence) VALUES
 ('A1','Match Scout','Finds grower<->buyer matches by commodity+region+volume',300,'BALANCED'),
 ('A2','Price Hawk','Tracks USDA FOB prices, alerts on deals above/below market',600,'BALANCED'),
 ('A3','Deal Closer','Nudges stalled deals (>48h in same stage) toward next stage',900,'BALANCED'),
 ('A4','DD Inspector','Verifies doc types and flags missing required docs',600,'BALANCED'),
 ('A5','Compliance Sentinel','Watches PACA/FSMA/USDA cert expiry + quarantines non-compliant',1800,'HIGH'),
 ('A6','Factor Matchmaker','Routes deals to LCG->Agrifact factoring waterfall by tier',600,'BALANCED'),
 ('A7','Logistics Hunter','Matches shipments to carriers and optimizes routes',900,'BALANCED'),
 ('A8','Dispute Mediator','Detects disputes and opens mediation threads with evidence',1800,'HIGH'),
 ('A9','Profit Optimizer','Scores deal margins and flags under-priced offers',600,'BALANCED'),
 ('A10','Lookalike Launcher','Clones winning deal patterns to similar growers/buyers',1800,'BALANCED'),
 ('A11','Sleep Agent','Routes after-hours traffic to VERIFIED only, queues rest for 6am',300,'HIGH'),
 ('A12','Grower Nurture','Cadenced touches to top-tier growers by GRS score',1800,'BALANCED'),
 ('A13','Buyer Intel','Enriches buyer profiles with spend history and preferences',1800,'BALANCED'),
 ('A14','Cert Expiry Radar','30/60/90-day expiry warnings on PACA/FSMA/USDA certs',3600,'HIGH'),
 ('A15','Cross-Sell Spotter','Suggests cross-commodity offers based on buyer history',1800,'BALANCED')
ON CONFLICT (code) DO NOTHING;
