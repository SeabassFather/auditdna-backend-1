// ============================================================================
// AuditDNA - Deal Intelligence
// Sprint C P14 / 4.25.2026
// 1. Audit Trail: records every brain event into deal_audit_trail
// 2. Auto-Suggest: rule-based engine that proposes follow-up actions
// Both hook global.brainEmit non-destructively
// ============================================================================

const express = require('express');
const pool = require('../../db');
const router = express.Router();

// ---- Schema ---------------------------------------------------------------
async function ensureSchema() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deal_audit_trail (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER,
        lane VARCHAR(50),
        actor VARCHAR(100),
        action VARCHAR(80) NOT NULL,
        before_state JSONB,
        after_state JSONB,
        brain_event VARCHAR(80),
        payload JSONB,
        occurred_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_deal ON deal_audit_trail(deal_id, lane, occurred_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON deal_audit_trail(action);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_event ON deal_audit_trail(brain_event);`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS deal_suggestions (
        id SERIAL PRIMARY KEY,
        source_deal_id INTEGER,
        source_lane VARCHAR(50),
        suggested_lane VARCHAR(50),
        suggestion_type VARCHAR(80) NOT NULL,
        title VARCHAR(200),
        rationale TEXT,
        payload JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        priority INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW(),
        acted_at TIMESTAMP,
        acted_by VARCHAR(100),
        dismissed_reason TEXT,
        result_deal_id INTEGER
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_suggestions_status ON deal_suggestions(status, priority DESC, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_suggestions_source ON deal_suggestions(source_deal_id, source_lane);`);

    console.log('[dealIntelligence] schema OK');
  } catch (e) {
    console.error('[dealIntelligence] schema error:', e.message);
  }
}
setTimeout(ensureSchema, 2000);

const heavyJson = express.json({ limit: '1mb' });

// ============================================================================
// AUDIT TRAIL - record every brain event
// ============================================================================
async function recordAudit(brainEvent, payload) {
  if (!pool || !brainEvent) return;
  try {
    await pool.query(
      `INSERT INTO deal_audit_trail (deal_id, lane, actor, action, brain_event, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        payload?.deal_id || null,
        payload?.lane || null,
        payload?.actor || payload?.decided_by || payload?.uploaded_by || payload?.approved_by || payload?.created_by || 'system',
        brainEvent,
        brainEvent,
        JSON.stringify(payload || {})
      ]
    );
  } catch (e) {
    console.error('[dealIntelligence] audit error:', e.message);
  }
}

// ============================================================================
// AUTO-SUGGEST RULES
// ============================================================================
const SUGGESTION_RULES = [
  // Rule 1: PO funded -> suggest factoring on resulting invoice
  {
    id: 'PO_TO_FACTORING',
    matches: (event, payload) =>
      (event === 'PO_INVOICE_TRIGGERED' || event === 'FUNDED' || event === 'DOCUMENT_UPLOADED') &&
      payload?.lane === 'po' &&
      (event !== 'DOCUMENT_UPLOADED' || payload?.doc_type === 'invoice'),
    build: async (event, payload) => {
      // Only suggest once per source deal
      const exists = await pool.query(
        `SELECT id FROM deal_suggestions WHERE source_deal_id = $1 AND source_lane = 'po' AND suggestion_type = 'PO_TO_FACTORING' AND status IN ('pending','accepted')`,
        [payload.deal_id]
      );
      if (exists.rows.length > 0) return null;

      // Pull PO deal details
      const dq = await pool.query(`SELECT * FROM financing_deals WHERE id = $1`, [payload.deal_id]);
      if (dq.rows.length === 0) return null;
      const d = dq.rows[0];

      return {
        source_deal_id: payload.deal_id,
        source_lane: 'po',
        suggested_lane: 'factoring',
        suggestion_type: 'PO_TO_FACTORING',
        title: `Auto-flip PO #${payload.deal_id} to Factoring`,
        rationale: `PO Finance deal #${payload.deal_id} now has an invoice. The receivable can be factored to recoup the advance and capture additional spread. Carrying buyer "${d.buyer_name || 'unknown'}", commodity "${d.commodity || '-'}", amount ${d.invoice_amount || '-'}.`,
        priority: 90,
        payload: {
          new_lane: 'factoring',
          inherit_from_deal: payload.deal_id,
          buyer_name: d.buyer_name,
          commodity: d.commodity,
          invoice_amount: d.invoice_amount,
          grower_name: d.grower_name,
          borrower_id: d.borrower_id
        }
      };
    }
  },

  // Rule 2: Borrower approved with multiple funded factoring deals -> suggest commercial line
  {
    id: 'FACTORING_TO_COMMERCIAL',
    matches: (event, payload) => event === 'BORROWER_APPROVED' || event === 'LENDER_RESPONSE_ACCEPTED',
    build: async (event, payload) => {
      const borrowerId = payload?.borrower_id;
      if (!borrowerId) return null;

      // Count funded factoring deals for this borrower
      const c = await pool.query(
        `SELECT COUNT(*)::int as funded_count, SUM(invoice_amount) as total_volume
         FROM financing_deals
         WHERE borrower_id = $1 AND lane = 'factoring' AND (stage = 'funded' OR status = 'funded')`,
        [borrowerId]
      );
      if (!c.rows[0] || c.rows[0].funded_count < 3) return null;

      // Suggest only once per borrower
      const exists = await pool.query(
        `SELECT id FROM deal_suggestions
         WHERE suggestion_type = 'FACTORING_TO_COMMERCIAL'
           AND payload->>'borrower_id' = $1::text
           AND status IN ('pending','accepted')`,
        [String(borrowerId)]
      );
      if (exists.rows.length > 0) return null;

      const bq = await pool.query(`SELECT legal_name, annual_revenue FROM borrower_entities WHERE id = $1`, [borrowerId]);
      const b = bq.rows[0] || {};
      const fundedCount = c.rows[0].funded_count;
      const totalVolume = Number(c.rows[0].total_volume || 0);
      const suggestedLine = Math.round(totalVolume * 0.3 / 1000) * 1000;  // 30% of trailing volume

      return {
        source_deal_id: null,
        source_lane: null,
        suggested_lane: 'commercial',
        suggestion_type: 'FACTORING_TO_COMMERCIAL',
        title: `${b.legal_name || 'Borrower'} qualifies for commercial line`,
        rationale: `${b.legal_name || 'This borrower'} has ${fundedCount} funded factoring deals totaling $${totalVolume.toLocaleString()}. Track record supports a commercial working-capital line of approximately $${suggestedLine.toLocaleString()} (30% of trailing volume). Strong fit for Rabobank or Compeer.`,
        priority: 70,
        payload: {
          borrower_id: borrowerId,
          legal_name: b.legal_name,
          funded_count: fundedCount,
          total_volume: totalVolume,
          suggested_amount: suggestedLine,
          recommended_partners: ['RABOBANK', 'COMPEER']
        }
      };
    }
  },

  // Rule 3: Multiple LOIs sent, no accepts -> suggest repricing
  {
    id: 'STALLED_LOI_REPRICE',
    matches: (event, payload) => event === 'DEAL_SENT' || event === 'LOI_SENT',
    build: async (event, payload) => {
      if (!payload?.deal_id) return null;

      const sent = await pool.query(
        `SELECT COUNT(*)::int as c FROM lender_responses
         WHERE deal_id = $1 AND lane = $2`,
        [payload.deal_id, payload.lane]
      );
      if (!sent.rows[0] || sent.rows[0].c < 5) return null;

      const accepted = await pool.query(
        `SELECT COUNT(*)::int as c FROM lender_responses
         WHERE deal_id = $1 AND lane = $2 AND decision = 'accepted'`,
        [payload.deal_id, payload.lane]
      );
      if (accepted.rows[0]?.c > 0) return null;

      const exists = await pool.query(
        `SELECT id FROM deal_suggestions
         WHERE source_deal_id = $1 AND source_lane = $2 AND suggestion_type = 'STALLED_LOI_REPRICE' AND status IN ('pending','accepted')`,
        [payload.deal_id, payload.lane]
      );
      if (exists.rows.length > 0) return null;

      return {
        source_deal_id: payload.deal_id,
        source_lane: payload.lane,
        suggested_lane: payload.lane,
        suggestion_type: 'STALLED_LOI_REPRICE',
        title: `Deal #${payload.deal_id} stalled - reprice or escalate`,
        rationale: `${sent.rows[0].c} LOIs sent on this deal but zero accepted offers. Possible causes: pricing too aggressive, buyer credit concern, or commodity-specific friction. Consider widening reserve, adding personal guarantee, or escalating to in-house counsel for warm intro.`,
        priority: 80,
        payload: {
          deal_id: payload.deal_id,
          lane: payload.lane,
          lois_sent: sent.rows[0].c,
          accepts: 0
        }
      };
    }
  },

  // Rule 4: Borrower KYC approved but no deals yet -> suggest pipeline starter
  {
    id: 'NEW_BORROWER_PIPELINE',
    matches: (event, payload) => event === 'BORROWER_APPROVED',
    build: async (event, payload) => {
      const borrowerId = payload?.borrower_id;
      if (!borrowerId) return null;

      const dealCount = await pool.query(
        `SELECT COUNT(*)::int as c FROM financing_deals WHERE borrower_id = $1`,
        [borrowerId]
      );
      if (dealCount.rows[0]?.c > 0) return null;

      const exists = await pool.query(
        `SELECT id FROM deal_suggestions
         WHERE suggestion_type = 'NEW_BORROWER_PIPELINE' AND payload->>'borrower_id' = $1::text AND status IN ('pending','accepted')`,
        [String(borrowerId)]
      );
      if (exists.rows.length > 0) return null;

      const bq = await pool.query(`SELECT legal_name, borrower_role FROM borrower_entities WHERE id = $1`, [borrowerId]);
      const b = bq.rows[0] || {};

      return {
        source_deal_id: null,
        source_lane: null,
        suggested_lane: 'factoring',
        suggestion_type: 'NEW_BORROWER_PIPELINE',
        title: `${b.legal_name || 'New borrower'} cleared - start a deal`,
        rationale: `${b.legal_name || 'This borrower'} (${b.borrower_role || 'role unknown'}) has KYC approved but no deals yet. Reach out to qualify a first transaction - factoring is the easiest entry point.`,
        priority: 60,
        payload: {
          borrower_id: borrowerId,
          legal_name: b.legal_name,
          borrower_role: b.borrower_role
        }
      };
    }
  }
];

async function runSuggestionRules(event, payload) {
  if (!pool) return;
  for (const rule of SUGGESTION_RULES) {
    try {
      if (!rule.matches(event, payload)) continue;
      const suggestion = await rule.build(event, payload);
      if (!suggestion) continue;
      await pool.query(
        `INSERT INTO deal_suggestions
           (source_deal_id, source_lane, suggested_lane, suggestion_type, title, rationale, payload, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          suggestion.source_deal_id, suggestion.source_lane,
          suggestion.suggested_lane, suggestion.suggestion_type,
          suggestion.title, suggestion.rationale,
          JSON.stringify(suggestion.payload || {}), suggestion.priority || 50
        ]
      );
    } catch (e) {
      console.error('[dealIntelligence] rule error:', rule.id, e.message);
    }
  }
}

// ============================================================================
// Hook brainEmit for both audit + suggestions
// ============================================================================
function installBrainHook() {
  const original = global.brainEmit;
  global.brainEmit = function(eventType, payload) {
    try { if (typeof original === 'function') original(eventType, payload); } catch (e) {}
    setImmediate(async () => {
      try {
        await recordAudit(eventType, payload || {});
        await runSuggestionRules(eventType, payload || {});
      } catch (e) {
        console.error('[dealIntelligence] hook error:', e.message);
      }
    });
  };
  console.log('[dealIntelligence] installed brainEmit hook (audit + suggest)');
}
setTimeout(installBrainHook, 3500);

// ============================================================================
// REST routes
// ============================================================================

// Suggestions list
router.get('/api/intelligence/suggestions', async (req, res) => {
  const { status, lane, limit } = req.query;
  const conditions = []; const params = []; let pidx = 1;
  if (status) { conditions.push(`status = $${pidx++}`); params.push(status); }
  if (lane) { conditions.push(`(source_lane = $${pidx} OR suggested_lane = $${pidx})`); params.push(lane); pidx++; }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : "WHERE status = 'pending'";
  const lim = Math.min(parseInt(limit || '100', 10), 500);
  try {
    const r = await pool.query(
      `SELECT * FROM deal_suggestions ${where}
       ORDER BY (status = 'pending') DESC, priority DESC, created_at DESC
       LIMIT ${lim}`,
      params
    );
    res.json({ suggestions: r.rows, count: r.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Per-deal suggestions
router.get('/api/intelligence/suggestions/:lane/:dealId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM deal_suggestions
       WHERE source_deal_id = $1 AND source_lane = $2
       ORDER BY priority DESC, created_at DESC`,
      [parseInt(req.params.dealId, 10), req.params.lane]
    );
    res.json({ suggestions: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Accept suggestion (creates the new deal/action)
router.post('/api/intelligence/suggestions/:id/accept', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const actedBy = (req.body && req.body.acted_by) || 'saul';

  try {
    const sq = await pool.query(`SELECT * FROM deal_suggestions WHERE id = $1`, [id]);
    if (sq.rows.length === 0) return res.status(404).json({ error: 'not found' });
    const s = sq.rows[0];
    if (s.status !== 'pending') return res.status(400).json({ error: 'not pending' });

    let resultDealId = null;

    // Action depends on suggestion_type
    if (s.suggestion_type === 'PO_TO_FACTORING') {
      // Create draft factoring deal inheriting from the source PO deal
      const p = s.payload || {};
      const ins = await pool.query(
        `INSERT INTO financing_deals
           (lane, source_type, status, stage, buyer_name, commodity, invoice_amount, grower_name, borrower_id, notes, created_by)
         VALUES ('factoring', 'auto_suggest', 'draft', 'submitted', $1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [p.buyer_name, p.commodity, p.invoice_amount, p.grower_name, p.borrower_id || null, `Auto-flipped from PO deal #${s.source_deal_id}`, actedBy]
      );
      resultDealId = ins.rows[0].id;
    }
    // Other suggestion types just record acceptance - admin acts manually

    await pool.query(
      `UPDATE deal_suggestions
       SET status = 'accepted', acted_at = NOW(), acted_by = $2, result_deal_id = $3
       WHERE id = $1`,
      [id, actedBy, resultDealId]
    );

    if (typeof global.brainEmit === 'function') {
      global.brainEmit('SUGGESTION_ACCEPTED', {
        suggestion_id: id, type: s.suggestion_type, source_deal_id: s.source_deal_id,
        result_deal_id: resultDealId, acted_by: actedBy
      });
    }

    res.json({ ok: true, result_deal_id: resultDealId });
  } catch (e) {
    console.error('[dealIntelligence] accept error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Dismiss suggestion
router.post('/api/intelligence/suggestions/:id/dismiss', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reason = (req.body && req.body.reason) || null;
  const actedBy = (req.body && req.body.acted_by) || 'saul';
  try {
    const r = await pool.query(
      `UPDATE deal_suggestions
       SET status = 'dismissed', acted_at = NOW(), acted_by = $2, dismissed_reason = $3
       WHERE id = $1 AND status = 'pending' RETURNING id`,
      [id, actedBy, reason]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found or already actioned' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Audit timeline per deal
router.get('/api/intelligence/audit/:lane/:dealId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM deal_audit_trail
       WHERE deal_id = $1 AND lane = $2
       ORDER BY occurred_at DESC LIMIT 500`,
      [parseInt(req.params.dealId, 10), req.params.lane]
    );
    res.json({ events: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cross-deal recent audit
router.get('/api/intelligence/audit', async (req, res) => {
  const { event, lane, actor, limit } = req.query;
  const conditions = []; const params = []; let pidx = 1;
  if (event) { conditions.push(`brain_event = $${pidx++}`); params.push(event); }
  if (lane) { conditions.push(`lane = $${pidx++}`); params.push(lane); }
  if (actor) { conditions.push(`actor = $${pidx++}`); params.push(actor); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '300', 10), 1000);
  try {
    const r = await pool.query(
      `SELECT id, deal_id, lane, actor, action, brain_event, payload, occurred_at
       FROM deal_audit_trail ${where}
       ORDER BY occurred_at DESC LIMIT ${lim}`,
      params
    );
    res.json({ events: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get('/api/intelligence/stats', async (req, res) => {
  try {
    const sg = await pool.query(`
      SELECT
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END)::int as pending,
        SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END)::int as accepted,
        SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END)::int as dismissed,
        COUNT(*)::int as total
      FROM deal_suggestions
    `);
    const audit = await pool.query(`
      SELECT COUNT(*)::int as total_events, COUNT(DISTINCT brain_event)::int as event_types
      FROM deal_audit_trail
      WHERE occurred_at > NOW() - INTERVAL '30 days'
    `);
    res.json({ suggestions: sg.rows[0], audit: audit.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
