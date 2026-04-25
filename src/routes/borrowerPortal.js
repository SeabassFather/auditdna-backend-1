// ============================================================================
// AuditDNA - Borrower Portal Route
// Sprint C P12 / 4.25.2026
// Tokenized read-only public deal status pages
// PUBLIC endpoint (/api/portal/public/:token) requires NO auth - tokens themselves are the auth
// All sensitive data (EIN, SSN, FICO, bank, partner names, rates) STRIPPED from public payload
// ============================================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// ---- Schema ---------------------------------------------------------------
async function ensureSchema() {
  if (!global.db) return;
  try {
    await global.db.query(`
      CREATE TABLE IF NOT EXISTS portal_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(80) NOT NULL UNIQUE,
        deal_id INTEGER NOT NULL,
        lane VARCHAR(50) DEFAULT 'factoring',
        borrower_id INTEGER REFERENCES borrower_entities(id) ON DELETE SET NULL,
        recipient_name VARCHAR(200),
        recipient_email VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(100),
        expires_at TIMESTAMP,
        view_count INTEGER DEFAULT 0,
        last_viewed_at TIMESTAMP,
        last_viewed_ip VARCHAR(50),
        revoked_at TIMESTAMP,
        revoked_by VARCHAR(100),
        notes TEXT
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens(token);`);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_deal ON portal_tokens(deal_id, lane);`);
    console.log('[borrowerPortal] schema OK');
  } catch (e) {
    console.error('[borrowerPortal] schema error:', e.message);
  }
}
setTimeout(ensureSchema, 1500);

function emitBrain(type, payload) {
  try { if (typeof global.brainEmit === 'function') global.brainEmit(type, payload); } catch (e) {}
}

const heavyJson = express.json({ limit: '1mb' });

// Generate URL-safe token (32 chars)
function generateToken() {
  return crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ============================================================================
// POST /api/portal/tokens - create new tokenized link (ADMIN, requires existing app auth)
// Body: { deal_id, lane, borrower_id?, recipient_name?, recipient_email?, expires_in_days?, created_by?, notes? }
// ============================================================================
router.post('/api/portal/tokens', heavyJson, async (req, res) => {
  const b = req.body || {};
  if (!b.deal_id || !b.lane) return res.status(400).json({ error: 'deal_id and lane required' });
  if (!['factoring', 'po', 'commercial'].includes(b.lane)) return res.status(400).json({ error: 'invalid lane' });

  const days = parseInt(b.expires_in_days || '30', 10);
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86400 * 1000) : null;

  try {
    const token = generateToken();
    const r = await global.db.query(
      `INSERT INTO portal_tokens
         (token, deal_id, lane, borrower_id, recipient_name, recipient_email, created_by, expires_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, token, expires_at, created_at`,
      [
        token, parseInt(b.deal_id, 10), b.lane, b.borrower_id || null,
        b.recipient_name || null, b.recipient_email || null,
        b.created_by || 'saul', expiresAt, b.notes || null
      ]
    );

    emitBrain('PORTAL_TOKEN_CREATED', {
      token_id: r.rows[0].id,
      deal_id: parseInt(b.deal_id, 10),
      lane: b.lane,
      recipient_email: b.recipient_email,
      expires_at: r.rows[0].expires_at
    });

    res.json({
      ok: true,
      token_id: r.rows[0].id,
      token: r.rows[0].token,
      expires_at: r.rows[0].expires_at,
      portal_url: `/portal/${r.rows[0].token}`
    });
  } catch (e) {
    console.error('[borrowerPortal] create error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/portal/tokens/:lane/:dealId - list tokens for a deal (admin)
// ============================================================================
router.get('/api/portal/tokens/:lane/:dealId', async (req, res) => {
  const { lane, dealId } = req.params;
  try {
    const r = await global.db.query(
      `SELECT id, token, deal_id, lane, borrower_id, recipient_name, recipient_email,
              created_at, created_by, expires_at, view_count, last_viewed_at, revoked_at, revoked_by, notes
       FROM portal_tokens
       WHERE deal_id = $1 AND lane = $2
       ORDER BY created_at DESC`,
      [parseInt(dealId, 10), lane]
    );
    res.json({ tokens: r.rows, count: r.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/portal/tokens/:tokenId/revoke
// ============================================================================
router.post('/api/portal/tokens/:tokenId/revoke', heavyJson, async (req, res) => {
  const tokenId = parseInt(req.params.tokenId, 10);
  const revokedBy = (req.body && req.body.revoked_by) || 'saul';
  try {
    const r = await global.db.query(
      `UPDATE portal_tokens SET revoked_at = NOW(), revoked_by = $2
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id, token, deal_id, lane`,
      [tokenId, revokedBy]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found or already revoked' });

    emitBrain('PORTAL_TOKEN_REVOKED', {
      token_id: r.rows[0].id,
      deal_id: r.rows[0].deal_id,
      lane: r.rows[0].lane,
      revoked_by: revokedBy
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/portal/admin/all - list all tokens across all deals
// ============================================================================
router.get('/api/portal/admin/all', async (req, res) => {
  const { active_only, lane, limit } = req.query;
  const conditions = [];
  const params = [];
  let pidx = 1;

  if (active_only === 'true') {
    conditions.push(`revoked_at IS NULL`);
    conditions.push(`(expires_at IS NULL OR expires_at > NOW())`);
  }
  if (lane) { conditions.push(`lane = $${pidx++}`); params.push(lane); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '200', 10), 500);

  try {
    const r = await global.db.query(
      `SELECT id, token, deal_id, lane, recipient_name, recipient_email,
              created_at, expires_at, view_count, last_viewed_at, revoked_at
       FROM portal_tokens
       ${where}
       ORDER BY created_at DESC
       LIMIT ${lim}`,
      params
    );
    res.json({ tokens: r.rows, count: r.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/portal/public/:token - PUBLIC, no auth required, sanitized payload
// ============================================================================
router.get('/api/portal/public/:token', async (req, res) => {
  const token = req.params.token;
  if (!token || token.length < 16) return res.status(400).json({ error: 'invalid token' });

  try {
    // Lookup token
    const tq = await global.db.query(
      `SELECT id, deal_id, lane, borrower_id, recipient_name, expires_at, revoked_at, view_count
       FROM portal_tokens
       WHERE token = $1`,
      [token]
    );
    if (tq.rows.length === 0) return res.status(404).json({ error: 'invalid link' });
    const t = tq.rows[0];

    if (t.revoked_at) return res.status(403).json({ error: 'link revoked' });
    if (t.expires_at && new Date(t.expires_at) < new Date()) return res.status(403).json({ error: 'link expired' });

    // Increment view count + record IP
    const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').toString().split(',')[0].trim();
    await global.db.query(
      `UPDATE portal_tokens SET view_count = view_count + 1, last_viewed_at = NOW(), last_viewed_ip = $2 WHERE id = $1`,
      [t.id, ip.substring(0, 50)]
    );

    emitBrain('PORTAL_VIEWED', { token_id: t.id, deal_id: t.deal_id, lane: t.lane, view_count: t.view_count + 1 });

    // Fetch deal (sanitize - strip internal-only fields)
    const dq = await global.db.query(`SELECT * FROM financing_deals WHERE id = $1`, [t.deal_id]);
    if (dq.rows.length === 0) return res.status(404).json({ error: 'deal not found' });
    const deal = dq.rows[0];

    // Fetch borrower (sanitize - only legal name + role)
    let borrowerName = null, borrowerRole = null;
    if (t.borrower_id || deal.borrower_id) {
      const bq = await global.db.query(
        `SELECT legal_name, dba, borrower_role FROM borrower_entities WHERE id = $1`,
        [t.borrower_id || deal.borrower_id]
      );
      if (bq.rows.length > 0) {
        borrowerName = bq.rows[0].dba || bq.rows[0].legal_name;
        borrowerRole = bq.rows[0].borrower_role;
      }
    }

    // Counts (no actual content)
    let docCount = 0, respCount = 0;
    try {
      const dc = await global.db.query(`SELECT COUNT(*)::int as c FROM deal_documents WHERE deal_id = $1 AND lane = $2`, [t.deal_id, t.lane]);
      docCount = dc.rows[0].c;
    } catch (e) {}
    try {
      const rc = await global.db.query(`SELECT COUNT(*)::int as c FROM lender_responses WHERE deal_id = $1 AND lane = $2 AND decision != 'rejected'`, [t.deal_id, t.lane]);
      respCount = rc.rows[0].c;
    } catch (e) {}

    // Stage normalized to 5-position progress
    const STAGES_BY_LANE = {
      factoring:  ['scored', 'drafted', 'sent', 'loi_received', 'funded'],
      po:         ['submitted', 'verified', 'advance_funded', 'invoice_triggered', 'flipped'],
      commercial: ['applied', 'underwriting', 'conditional', 'clear_to_close', 'funded']
    };
    const stagesForLane = STAGES_BY_LANE[t.lane] || STAGES_BY_LANE.factoring;
    const currentStageRaw = (deal.stage || deal.status || '').toLowerCase();
    let currentIdx = stagesForLane.findIndex(s => currentStageRaw.includes(s.split('_')[0]));
    if (currentIdx < 0) currentIdx = 0;

    // Public payload (no EIN, no SSN, no bank, no FICO, no partner names, no rates, no internal IDs)
    const publicPayload = {
      reference: `MFG-${t.lane.toUpperCase()}-${deal.id}`,
      lane: t.lane,
      lane_label: { factoring:'Factoring', po:'PO Finance', commercial:'Commercial Loan' }[t.lane] || t.lane,
      borrower_name: borrowerName || deal.grower_name || 'Borrower',
      borrower_role: borrowerRole || null,
      buyer_name: deal.buyer_name || null,
      commodity: deal.commodity || null,
      amount: deal.invoice_amount || null,
      stage_label: (deal.stage || deal.status || 'submitted').replace(/_/g, ' '),
      stage_index: currentIdx,
      stages: stagesForLane.map(s => s.replace(/_/g, ' ')),
      created_at: deal.created_at,
      updated_at: deal.updated_at,
      document_count: docCount,
      lender_activity_count: respCount,
      recipient_name: t.recipient_name,
      view_count: t.view_count + 1,
      portal_expires_at: t.expires_at
    };

    res.json(publicPayload);
  } catch (e) {
    console.error('[borrowerPortal] public error:', e.message);
    res.status(500).json({ error: 'unable to load' });
  }
});

module.exports = router;
