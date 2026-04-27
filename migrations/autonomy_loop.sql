-- =============================================================================
-- File: autonomy_loop.sql
-- Save to: C:\AuditDNA\backend\migrations\autonomy_loop.sql
-- =============================================================================
-- Sprint D Wave 3D - Autonomy Loop Schema
--
-- Closes 3 of the critic's main valid gaps:
--   1. Feedback learning  -> prediction_outcomes table
--   2. Execution layer    -> deal_executions table
--   3. Reply detection    -> buyer_replies table + webhook
--
-- Idempotent. Safe to re-run.
-- =============================================================================

-- =============================================================================
-- 1. PREDICTION_OUTCOMES - close the learning loop
-- =============================================================================
-- For every prediction the platform makes (QPF score, expected_advance_pct,
-- recommended partner), we capture what ACTUALLY happened when the deal closed.
-- This becomes training data: "we predicted 0.88 QPF for Sysco-leafy_greens-Net30,
-- the deal actually closed at 91% advance with QPF FUND in 6hrs vs 4hr predicted."
-- After 50-100 outcomes, we can refine the QPF weights with real data.
-- =============================================================================
CREATE TABLE IF NOT EXISTS prediction_outcomes (
  id SERIAL PRIMARY KEY,
  -- Link to original prediction
  deal_id INTEGER,
  score_history_id INTEGER REFERENCES factor_score_history(id),
  -- What we predicted
  predicted_qpf NUMERIC,
  predicted_advance_pct NUMERIC,
  predicted_advance_usd NUMERIC,
  predicted_partner_code TEXT,
  predicted_partner_speed_hrs NUMERIC,
  predicted_decision_band TEXT,
  -- What actually happened
  actual_advance_pct NUMERIC,
  actual_advance_usd NUMERIC,
  actual_partner_code TEXT,
  actual_funding_speed_hrs NUMERIC,
  actual_close_status TEXT,           -- 'closed_full', 'closed_partial', 'declined', 'expired', 'cancelled'
  actual_pay_days NUMERIC,            -- days for buyer to actually pay (key learning signal)
  actual_close_price NUMERIC,         -- final invoice amount (may differ if disputes)
  -- Variance (auto-calculated)
  qpf_accuracy_score NUMERIC,         -- 1.0 = predicted exactly, 0.0 = wildly off
  partner_match BOOLEAN,              -- did the recommended partner actually fund it?
  speed_variance_hrs NUMERIC,         -- actual_speed - predicted_speed
  -- Metadata
  closed_at TIMESTAMPTZ,
  closed_by_user_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pred_outcomes_deal ON prediction_outcomes(deal_id);
CREATE INDEX IF NOT EXISTS idx_pred_outcomes_status ON prediction_outcomes(actual_close_status);
CREATE INDEX IF NOT EXISTS idx_pred_outcomes_at ON prediction_outcomes(closed_at DESC);

-- =============================================================================
-- 2. DEAL_EXECUTIONS - autonomous downstream actions when deal accepted
-- =============================================================================
-- When a buyer replies "ACCEPT" to an InventoryAlert email, or the admin clicks
-- "Mark Accepted" in InventoryAlertCenter, this row gets created. The execution
-- engine then fires each step in sequence:
--   1. Reserve inventory (decrement available volume)
--   2. Generate invoice (insert into financing_deals as PROPOSAL)
--   3. Open escrow ticket
--   4. Emit brain event
--   5. Notify admins via ntfy + internal-messenger
-- =============================================================================
CREATE TABLE IF NOT EXISTS deal_executions (
  id SERIAL PRIMARY KEY,
  trigger_type TEXT NOT NULL,            -- 'buyer_reply','admin_accept','auto_match','distress_won'
  trigger_source_id INTEGER,             -- id in source table (alert_id, upload_id, etc.)
  -- Deal context
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  grower_name TEXT,
  grower_id INTEGER,
  commodity TEXT,
  volume_lbs NUMERIC,
  unit TEXT,
  price_fob NUMERIC,
  total_value_usd NUMERIC,
  -- Execution steps (each populated as it runs)
  step_reserve_completed BOOLEAN DEFAULT FALSE,
  step_reserve_inventory_id INTEGER,
  step_invoice_completed BOOLEAN DEFAULT FALSE,
  step_invoice_deal_id INTEGER,
  step_escrow_completed BOOLEAN DEFAULT FALSE,
  step_escrow_ticket_id TEXT,
  step_brain_completed BOOLEAN DEFAULT FALSE,
  step_notify_completed BOOLEAN DEFAULT FALSE,
  -- Outcome
  status TEXT DEFAULT 'pending',         -- 'pending','running','complete','failed'
  failed_at_step TEXT,
  error_detail TEXT,
  -- Timing
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_elapsed_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_dealexec_status ON deal_executions(status);
CREATE INDEX IF NOT EXISTS idx_dealexec_buyer ON deal_executions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_dealexec_at ON deal_executions(triggered_at DESC);

-- =============================================================================
-- 3. BUYER_REPLIES - inbound webhook target for email reply detection
-- =============================================================================
-- When SendGrid/Mailgun/Zoho fires a reply webhook, or when a polling worker
-- detects a new reply in the inbox to a previously-sent InventoryAlert,
-- it lands here. The autonomy worker then parses for ACCEPT/DECLINE/COUNTER
-- intent and fires deal_executions if matched.
-- =============================================================================
CREATE TABLE IF NOT EXISTS buyer_replies (
  id SERIAL PRIMARY KEY,
  -- Reply context
  buyer_email TEXT NOT NULL,
  reply_subject TEXT,
  reply_body_text TEXT,
  reply_body_html TEXT,
  reply_received_at TIMESTAMPTZ DEFAULT NOW(),
  -- Linkage to outbound
  in_reply_to_message_id TEXT,           -- email Message-ID header
  matched_template_id INTEGER,           -- pending_templates.id from Niner Bridge
  matched_buyer_id INTEGER,
  -- AI-parsed intent
  parsed_intent TEXT,                    -- 'accept','decline','counter','question','unsubscribe','unknown'
  parsed_confidence NUMERIC,             -- 0.0-1.0
  parsed_volume_offered_lbs NUMERIC,
  parsed_price_offered NUMERIC,
  parsed_notes TEXT,
  parsed_at TIMESTAMPTZ,
  parsed_engine TEXT DEFAULT 'AuditDNA Platform Reasoning',
  -- Action taken
  action TEXT,                           -- 'execution_fired','admin_review','ignored'
  action_target_id INTEGER,              -- deal_executions.id if fired
  action_at TIMESTAMPTZ,
  -- Status
  status TEXT DEFAULT 'unparsed'         -- 'unparsed','parsed','actioned','ignored'
);

CREATE INDEX IF NOT EXISTS idx_replies_status ON buyer_replies(status);
CREATE INDEX IF NOT EXISTS idx_replies_intent ON buyer_replies(parsed_intent);
CREATE INDEX IF NOT EXISTS idx_replies_at ON buyer_replies(reply_received_at DESC);

-- =============================================================================
-- 4. INVENTORY_RESERVATIONS - track reserved stock per execution
-- =============================================================================
-- When step_reserve runs, this row is written. Decrements logical inventory
-- so the same load can't be sold twice. Released if execution fails or expires.
-- =============================================================================
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id SERIAL PRIMARY KEY,
  execution_id INTEGER REFERENCES deal_executions(id),
  inventory_id INTEGER,
  commodity TEXT,
  reserved_volume_lbs NUMERIC,
  reserved_for_buyer TEXT,
  status TEXT DEFAULT 'active',          -- 'active','released','consumed'
  expires_at TIMESTAMPTZ,
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resv_status ON inventory_reservations(status);
CREATE INDEX IF NOT EXISTS idx_resv_inv ON inventory_reservations(inventory_id);

-- =============================================================================
-- 5. ESCROW_TICKETS - lightweight escrow tracking
-- =============================================================================
-- When step_escrow runs, an internal escrow ticket is opened. Real escrow
-- (with a third-party agent) wires later when partners are signed up.
-- For now: ticket ID + status + parties for audit trail.
-- =============================================================================
CREATE TABLE IF NOT EXISTS escrow_tickets (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT UNIQUE,               -- 'ESC-2026-04-0001'
  execution_id INTEGER REFERENCES deal_executions(id),
  deal_id INTEGER,
  buyer_party TEXT,
  buyer_email TEXT,
  seller_party TEXT,
  seller_email TEXT,
  amount_usd NUMERIC,
  commodity TEXT,
  status TEXT DEFAULT 'opened',          -- 'opened','funded','released','disputed','closed'
  agent_assigned TEXT,                   -- third-party escrow agent (Wave 4)
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  funded_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_tickets(status);
CREATE INDEX IF NOT EXISTS idx_escrow_code ON escrow_tickets(ticket_code);

-- =============================================================================
-- VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW v_qpf_calibration AS
SELECT
  buyer_credit_tier AS tier,
  COUNT(*)::int AS sample_size,
  AVG(predicted_qpf)::numeric(5,2) AS avg_predicted_qpf,
  AVG(actual_advance_pct)::numeric(5,2) AS avg_actual_advance_pct,
  AVG(predicted_advance_pct)::numeric(5,2) AS avg_predicted_advance_pct,
  AVG(predicted_advance_pct - actual_advance_pct)::numeric(5,2) AS advance_pct_bias,
  COUNT(*) FILTER (WHERE actual_close_status = 'closed_full')::int AS closed_full,
  COUNT(*) FILTER (WHERE actual_close_status = 'declined')::int AS declined,
  COUNT(*) FILTER (WHERE partner_match = TRUE)::int AS partner_recs_correct
FROM prediction_outcomes po
LEFT JOIN factor_score_history fsh ON po.score_history_id = fsh.id
WHERE actual_close_status IS NOT NULL
GROUP BY buyer_credit_tier;

CREATE OR REPLACE VIEW v_execution_funnel AS
SELECT
  trigger_type,
  status,
  COUNT(*)::int AS deal_count,
  COALESCE(SUM(total_value_usd), 0)::numeric AS total_value_usd,
  AVG(total_elapsed_ms)::int AS avg_elapsed_ms,
  COUNT(*) FILTER (WHERE step_invoice_completed)::int AS invoice_made,
  COUNT(*) FILTER (WHERE step_escrow_completed)::int AS escrow_opened
FROM deal_executions
GROUP BY trigger_type, status
ORDER BY trigger_type, status;

COMMENT ON TABLE prediction_outcomes  IS 'Wave 3D Autonomy: feedback loop - predictions vs actuals for QPF calibration';
COMMENT ON TABLE deal_executions      IS 'Wave 3D Autonomy: 5-step execution chain when buyer accepts (reserve->invoice->escrow->brain->notify)';
COMMENT ON TABLE buyer_replies        IS 'Wave 3D Autonomy: inbound reply landing zone, parsed by AI for intent';
COMMENT ON TABLE inventory_reservations IS 'Wave 3D Autonomy: stock holds during execution chain';
COMMENT ON TABLE escrow_tickets       IS 'Wave 3D Autonomy: lightweight escrow ledger (3rd-party agent in Wave 4)';
