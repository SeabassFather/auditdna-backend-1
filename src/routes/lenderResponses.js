// ============================================================================
// AuditDNA - Lender Responses Route
// Sprint C P7 / 4.25.2026
// Inbox + per-deal intake for partner responses to LOIs
// Brain emits: LENDER_RESPONSE_RECEIVED, LENDER_RESPONSE_ACCEPTED, LENDER_RESPONSE_REJECTED
// ============================================================================

const express = require('express');
const pool = require('../../db');
const router = express.Router();

// ---- Self-migrating schema ------------------------------------------------
async function ensureSchema() {
  if (!pool) {
    console.warn('[lenderResponses] pool not available at startup, skipping migration');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lender_responses (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL,
        lane VARCHAR(50) DEFAULT 'factoring',
        partner_id VARCHAR(100),
        partner_name VARCHAR(200),
        response_type VARCHAR(50) DEFAULT 'offer',
        decision VARCHAR(50) DEFAULT 'pending',
        advance_rate NUMERIC(5,2),
        factor_rate NUMERIC(5,2),
        reserve_rate NUMERIC(5,2),
        interest_rate NUMERIC(5,3),
        term_months INTEGER,
        loan_amount NUMERIC(15,2),
        fees TEXT,
        conditions TEXT,
        expires_at TIMESTAMP,
        raw_text TEXT,
        attachments JSONB,
        received_at TIMESTAMP DEFAULT NOW(),
        received_by VARCHAR(100),
        decided_at TIMESTAMP,
        decided_by VARCHAR(100),
        notes TEXT
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lender_responses_deal ON lender_responses(deal_id, lane);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lender_responses_decision ON lender_responses(decision);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lender_responses_received ON lender_responses(received_at DESC);`);
    console.log('[lenderResponses] schema OK');
  } catch (e) {
    console.error('[lenderResponses] schema error:', e.message);
  }
}
setTimeout(ensureSchema, 1500);

// ---- Brain emit -----------------------------------------------------------
function emitBrain(type, payload) {
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit(type, payload);
    }
  } catch (e) { /* swallow */ }
}

const heavyJson = express.json({ limit: '5mb' });

// ============================================================================
// POST /api/deals/:lane/:dealId/lender-responses
// Body: { partner_id, partner_name, response_type, advance_rate, factor_rate,
//         reserve_rate, interest_rate, term_months, loan_amount, fees,
//         conditions, expires_at, raw_text, attachments, received_by, notes }
// ============================================================================
router.post('/api/deals/:lane/:dealId/lender-responses', heavyJson, async (req, res) => {
  const { lane, dealId } = req.params;
  const b = req.body || {};

  if (!['factoring', 'po', 'commercial'].includes(lane)) {
    return res.status(400).json({ error: 'invalid lane' });
  }
  if (!b.partner_name && !b.partner_id) {
    return res.status(400).json({ error: 'partner_name or partner_id required' });
  }

  try {
    const r = await pool.query(
      `INSERT INTO lender_responses
         (deal_id, lane, partner_id, partner_name, response_type, decision,
          advance_rate, factor_rate, reserve_rate,
          interest_rate, term_months, loan_amount,
          fees, conditions, expires_at, raw_text, attachments, received_by, notes)
       VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id, received_at`,
      [
        parseInt(dealId, 10),
        lane,
        b.partner_id || null,
        b.partner_name || null,
        b.response_type || 'offer',
        b.advance_rate || null,
        b.factor_rate || null,
        b.reserve_rate || null,
        b.interest_rate || null,
        b.term_months || null,
        b.loan_amount || null,
        b.fees || null,
        b.conditions || null,
        b.expires_at || null,
        b.raw_text || null,
        b.attachments ? JSON.stringify(b.attachments) : null,
        b.received_by || 'saul',
        b.notes || null
      ]
    );

    emitBrain('LENDER_RESPONSE_RECEIVED', {
      deal_id: parseInt(dealId, 10),
      lane,
      response_id: r.rows[0].id,
      partner_name: b.partner_name,
      response_type: b.response_type || 'offer',
      advance_rate: b.advance_rate,
      factor_rate: b.factor_rate,
      interest_rate: b.interest_rate,
      loan_amount: b.loan_amount
    });

    res.json({
      ok: true,
      response_id: r.rows[0].id,
      received_at: r.rows[0].received_at
    });
  } catch (e) {
    console.error('[lenderResponses] create error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/deals/:lane/:dealId/lender-responses
// Per-deal list, all decisions
// ============================================================================
router.get('/api/deals/:lane/:dealId/lender-responses', async (req, res) => {
  const { lane, dealId } = req.params;
  try {
    const r = await pool.query(
      `SELECT * FROM lender_responses
       WHERE deal_id = $1 AND lane = $2
       ORDER BY received_at DESC`,
      [parseInt(dealId, 10), lane]
    );
    res.json({ responses: r.rows, count: r.rows.length });
  } catch (e) {
    console.error('[lenderResponses] list error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/lender-responses/inbox
// Cross-deal triage feed - pending decisions first, then recent
// ============================================================================
router.get('/api/lender-responses/inbox', async (req, res) => {
  const { decision, lane, limit } = req.query;
  const conditions = [];
  const params = [];
  let pidx = 1;

  if (decision) { conditions.push(`decision = $${pidx++}`); params.push(decision); }
  if (lane) { conditions.push(`lane = $${pidx++}`); params.push(lane); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '100', 10), 500);

  try {
    const r = await pool.query(
      `SELECT id, deal_id, lane, partner_id, partner_name, response_type, decision,
              advance_rate, factor_rate, reserve_rate,
              interest_rate, term_months, loan_amount,
              fees, conditions, expires_at, received_at, received_by, decided_at, decided_by, notes
       FROM lender_responses
       ${where}
       ORDER BY (decision = 'pending') DESC, received_at DESC
       LIMIT ${lim}`,
      params
    );
    res.json({ responses: r.rows, count: r.rows.length });
  } catch (e) {
    console.error('[lenderResponses] inbox error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/deals/:lane/:dealId/lender-responses/:respId/accept
// Body: { decided_by? }
// ============================================================================
router.post('/api/deals/:lane/:dealId/lender-responses/:respId/accept', heavyJson, async (req, res) => {
  const { lane, dealId, respId } = req.params;
  const decidedBy = (req.body && req.body.decided_by) || 'saul';

  try {
    const r = await pool.query(
      `UPDATE lender_responses
       SET decision = 'accepted', decided_at = NOW(), decided_by = $4
       WHERE id = $1 AND deal_id = $2 AND lane = $3 AND decision = 'pending'
       RETURNING id, partner_name, partner_id, advance_rate, factor_rate, interest_rate, loan_amount`,
      [parseInt(respId, 10), parseInt(dealId, 10), lane, decidedBy]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'not found or already decided' });
    }

    // Mark sibling pending responses as superseded (not rejected, just marked)
    await pool.query(
      `UPDATE lender_responses
       SET decision = 'superseded', decided_at = NOW(), decided_by = $3
       WHERE deal_id = $1 AND lane = $2 AND id != $4 AND decision = 'pending'`,
      [parseInt(dealId, 10), lane, decidedBy, parseInt(respId, 10)]
    );

    const accepted = r.rows[0];
    emitBrain('LENDER_RESPONSE_ACCEPTED', {
      deal_id: parseInt(dealId, 10),
      lane,
      response_id: accepted.id,
      partner_name: accepted.partner_name,
      partner_id: accepted.partner_id,
      advance_rate: accepted.advance_rate,
      factor_rate: accepted.factor_rate,
      interest_rate: accepted.interest_rate,
      loan_amount: accepted.loan_amount,
      decided_by: decidedBy
    });

    res.json({ ok: true, accepted: r.rows[0] });
  } catch (e) {
    console.error('[lenderResponses] accept error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/deals/:lane/:dealId/lender-responses/:respId/reject
// ============================================================================
router.post('/api/deals/:lane/:dealId/lender-responses/:respId/reject', heavyJson, async (req, res) => {
  const { lane, dealId, respId } = req.params;
  const decidedBy = (req.body && req.body.decided_by) || 'saul';
  const reason = (req.body && req.body.reason) || null;

  try {
    const r = await pool.query(
      `UPDATE lender_responses
       SET decision = 'rejected', decided_at = NOW(), decided_by = $4,
           notes = COALESCE(notes, '') || CASE WHEN $5::text IS NULL THEN '' ELSE E'\nReject reason: ' || $5::text END
       WHERE id = $1 AND deal_id = $2 AND lane = $3
       RETURNING id, partner_name`,
      [parseInt(respId, 10), parseInt(dealId, 10), lane, decidedBy, reason]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });

    emitBrain('LENDER_RESPONSE_REJECTED', {
      deal_id: parseInt(dealId, 10),
      lane,
      response_id: r.rows[0].id,
      partner_name: r.rows[0].partner_name,
      reason,
      decided_by: decidedBy
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[lenderResponses] reject error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// DELETE /api/deals/:lane/:dealId/lender-responses/:respId
// ============================================================================
router.delete('/api/deals/:lane/:dealId/lender-responses/:respId', async (req, res) => {
  const { lane, dealId, respId } = req.params;
  try {
    const r = await pool.query(
      `DELETE FROM lender_responses WHERE id = $1 AND deal_id = $2 AND lane = $3 RETURNING id`,
      [parseInt(respId, 10), parseInt(dealId, 10), lane]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[lenderResponses] delete error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/lender-responses/stats
// ============================================================================
router.get('/api/lender-responses/stats', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         decision, lane, COUNT(*) as count,
         AVG(advance_rate) as avg_advance,
         AVG(factor_rate) as avg_factor,
         AVG(interest_rate) as avg_interest
       FROM lender_responses
       GROUP BY decision, lane
       ORDER BY decision, lane`
    );
    res.json({ rows: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
