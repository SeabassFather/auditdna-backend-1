// C:\AuditDNA\backend\routes\factor-matchmaker.js
// Sprint C Phase 3 - REST routes for factor matchmaking + outreach
// Auth pattern matches grower-pipeline.js (inline JWT verify)

const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();
const matchmaker = require('../services/factor-matchmaker-service');

const JWT_SECRET = process.env.JWT_SECRET || 'auditdna-grower-jwt-dev';

// Inline auth middleware (same pattern as grower-pipeline.js)
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function getPool(req) {
  if (req.app && req.app.locals && req.app.locals.pool) return req.app.locals.pool;
  if (global.db) return global.db;
  throw new Error('database pool not available');
}

// POST /api/factor/score/:dealId - score a deal against partner pool
router.post('/score/:dealId', authRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const deal_id = parseInt(req.params.dealId, 10);
    console.log('[FACTOR] Scoring deal=' + deal_id);
    const result = await matchmaker.scoreDeals({ pool, deal_id });
    console.log('[FACTOR] Score complete - primary=' + (result.scoring.primary_recommendation && result.scoring.primary_recommendation.partner_id));
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[FACTOR SCORE]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/factor/draft - draft outreach email for a (deal, partner) pair
router.post('/draft', authRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const { deal_id, partner_id, outreach_type } = req.body || {};
    if (!deal_id) return res.status(400).json({ success: false, error: 'deal_id required' });
    if (!partner_id) return res.status(400).json({ success: false, error: 'partner_id required' });

    const draft = await matchmaker.draftPartnerOutreach({ pool, deal_id, partner_id, outreach_type });
    res.json({ success: true, draft });
  } catch (err) {
    console.error('[FACTOR DRAFT]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/factor/send - execute outreach (send email + write docs row + ntfy)
router.post('/send', authRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const body = req.body || {};
    const deal_id = body.deal_id;
    const partner_id = body.partner_id;
    const dryRun = body.dryRun;
    let draft = body.draft;
    if (!deal_id) return res.status(400).json({ success: false, error: 'deal_id required' });
    if (!partner_id) return res.status(400).json({ success: false, error: 'partner_id required' });

    if (!draft) {
      console.log('[FACTOR] Auto-drafting for deal=' + deal_id + ' partner=' + partner_id);
      draft = await matchmaker.draftPartnerOutreach({ pool, deal_id, partner_id });
    }

    const result = await matchmaker.executeOutreach({ pool, deal_id, partner_id, draft, dryRun: !!dryRun });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[FACTOR SEND]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/factor/agreements - list partner agreement statuses
router.get('/agreements', authRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const result = await pool.query(
      "SELECT fp.partner_id, fp.name, fp.waterfall_order, fp.region, fp.paca_licensed, " +
      "fpa.exempt, fpa.nda_status, fpa.commission_status, " +
      "fpa.commission_rate_year1, fpa.commission_rate_trail " +
      "FROM factoring_partners fp " +
      "LEFT JOIN factor_partner_agreements fpa ON fp.partner_id = fpa.partner_id " +
      "WHERE fp.active = true " +
      "ORDER BY fp.waterfall_order"
    );
    res.json({ success: true, partners: result.rows });
  } catch (err) {
    console.error('[FACTOR AGREEMENTS]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/factor/deal/:dealId/documents - list all docs sent for a deal
router.get('/deal/:dealId/documents', authRequired, async (req, res) => {
  const pool = getPool(req);
  try {
    const dealId = parseInt(req.params.dealId, 10);
    const result = await pool.query(
      "SELECT fdd.*, fp.name AS partner_name " +
      "FROM factor_deal_documents fdd " +
      "LEFT JOIN factoring_partners fp ON fdd.partner_id = fp.partner_id " +
      "WHERE fdd.deal_id = $1 " +
      "ORDER BY fdd.created_at DESC",
      [dealId]
    );
    res.json({ success: true, deal_id: dealId, documents: result.rows });
  } catch (err) {
    console.error('[FACTOR DOCS]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;