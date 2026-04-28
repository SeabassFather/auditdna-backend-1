/**
 * C:\AuditDNA\backend\services\disputes.js
 *
 * Phase 2 - Dispute resolution intake.
 *
 * Routing rules:
 *   gmv_amount >= $5000  -> forum = 'aaa'      (American Arbitration Association)
 *   gmv_amount <  $5000  -> forum = 'internal' (Mexausa Food Group mediator)
 *   PACA-related quality -> forum = 'paca_aco' (USDA PACA arbitration)
 *
 * Categories: quality, quantity, delivery_late, payment, contract, fraud, other
 *
 * Routes:
 *   POST   /api/disputes              raise dispute (with photo_ids array)
 *   GET    /api/disputes/rfq/:rfqId   list by RFQ
 *   GET    /api/disputes/user/:id?role=buyer|grower
 *   GET    /api/disputes/:id          single with photos
 *   PATCH  /api/disputes/:id/status   admin update
 *   POST   /api/disputes/:id/resolve  admin resolution
 *   GET    /api/disputes/admin/queue  open disputes for admin
 *
 * Mount: app.use('/api/disputes', require('./services/disputes').router);
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

const AAA_THRESHOLD = 5000;

let brainEvents = null;
let pushHelper = null;
function getBrainEvents() {
  if (!brainEvents) { try { brainEvents = require('./brain-events'); } catch (e) {} }
  return brainEvents;
}
function getPushHelper() {
  if (!pushHelper) { try { pushHelper = require('./webpush-server'); } catch (e) {} }
  return pushHelper;
}

// ----------------------------------------------------------------------------
// Forum routing
// ----------------------------------------------------------------------------
function determineForum(gmv, category) {
  if (category === 'quality' && Number(gmv) >= 1000) return 'paca_aco';
  if (Number(gmv) >= AAA_THRESHOLD) return 'aaa';
  return 'internal';
}

// ----------------------------------------------------------------------------
// POST /  raise dispute
// ----------------------------------------------------------------------------
router.post('/', express.json(), async (req, res) => {
  try {
    const {
      rfq_id, offer_id, deal_lock_id,
      raised_by_id, raised_by_role,
      against_id, against_role,
      category, description, gmv_amount, currency,
      photo_ids,
    } = req.body || {};
    if (!rfq_id || !raised_by_id || !raised_by_role || !category || !description) {
      return res.status(400).json({ error: 'rfq_id, raised_by_id, raised_by_role, category, description required' });
    }

    const forum = determineForum(gmv_amount || 0, category);

    const r = await pool.query(`
      INSERT INTO rfq_disputes_v2 (
        rfq_id, offer_id, deal_lock_id,
        raised_by_id, raised_by_role, against_id, against_role,
        category, description, gmv_amount, currency, forum, photo_ids
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,'USD'),$12,COALESCE($13,ARRAY[]::BIGINT[])
      )
      RETURNING *
    `, [
      rfq_id, offer_id || null, deal_lock_id || null,
      parseInt(raised_by_id, 10), raised_by_role,
      against_id ? parseInt(against_id, 10) : null, against_role || null,
      category, description, gmv_amount || null, currency, forum,
      Array.isArray(photo_ids) ? photo_ids : null,
    ]);
    const dispute = r.rows[0];

    const be = getBrainEvents();
    if (be) {
      await be.emitEvent('dispute.opened', rfq_id, {
        dispute_id: dispute.id, category, forum, gmv: gmv_amount,
        raised_by: { id: raised_by_id, role: raised_by_role },
        against: against_id ? { id: against_id, role: against_role } : null,
      }, raised_by_id, raised_by_role);
    }

    // Notify the counterparty if known
    const ph = getPushHelper();
    if (ph && against_id && against_role) {
      try {
        await ph.sendPushToUser(parseInt(against_id, 10), against_role, {
          title: `Dispute opened on RFQ #${rfq_id}`,
          body: `Category: ${category}. Forum: ${forum.toUpperCase()}. Tap to respond.`,
          url: `/disputes/${dispute.id}`,
          tag: `dispute-${dispute.id}`,
          requireInteraction: true,
        });
      } catch (e) {}
    }

    res.json({ ok: true, dispute, routing: { forum, threshold: AAA_THRESHOLD } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// Lists
// ----------------------------------------------------------------------------
router.get('/rfq/:rfqId', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT * FROM rfq_disputes_v2 WHERE rfq_id = $1 ORDER BY created_at DESC
    `, [req.params.rfqId]);
    res.json({ disputes: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    const role = req.query.role || 'buyer';
    const r = await pool.query(`
      SELECT * FROM rfq_disputes
       WHERE (raised_by_id = $1 AND raised_by_role = $2)
          OR (against_id = $1 AND against_role = $2)
       ORDER BY created_at DESC LIMIT 100
    `, [parseInt(req.params.id, 10), role]);
    res.json({ disputes: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/queue', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT d.*, rn.rfq_code, rn.commodity_category
        FROM rfq_disputes_v2 d
        JOIN rfq_needs rn ON rn.id = d.rfq_id
       WHERE d.status IN ('open','investigating')
       ORDER BY
         CASE WHEN d.forum = 'aaa' THEN 1 WHEN d.forum = 'paca_aco' THEN 2 ELSE 3 END,
         d.created_at ASC
       LIMIT 100
    `);
    res.json({ disputes: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM rfq_disputes_v2 WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    const dispute = r.rows[0];
    let photos = [];
    if (Array.isArray(dispute.photo_ids) && dispute.photo_ids.length > 0) {
      const p = await pool.query(`
        SELECT id, filename, mime_type, caption, created_at
          FROM rfq_photos WHERE id = ANY($1::bigint[]) ORDER BY created_at
      `, [dispute.photo_ids]);
      photos = p.rows.map(x => ({ ...x, url: `/api/photos/${x.id}`, thumb_url: `/api/photos/${x.id}/thumb` }));
    }
    res.json({ dispute, photos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// Status + resolve
// ----------------------------------------------------------------------------
router.patch('/:id/status', express.json(), async (req, res) => {
  try {
    const { status, admin_id } = req.body || {};
    if (!status) return res.status(400).json({ error: 'status required' });
    const allowed = ['open', 'investigating', 'awaiting_response', 'mediation', 'arbitration', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
    const r = await pool.query(`
      UPDATE rfq_disputes_v2 SET status = $1
       WHERE id = $2 RETURNING *
    `, [status, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });

    const be = getBrainEvents();
    if (be) {
      await be.emitEvent('dispute.status_changed', r.rows[0].rfq_id, {
        dispute_id: r.rows[0].id, status, admin_id,
      }, admin_id || null, 'admin');
    }
    res.json({ ok: true, dispute: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/resolve', express.json(), async (req, res) => {
  try {
    const { resolution, admin_id } = req.body || {};
    if (!resolution) return res.status(400).json({ error: 'resolution required' });
    const r = await pool.query(`
      UPDATE rfq_disputes_v2 SET status = 'closed', resolution = $1, resolved_at = NOW()
       WHERE id = $2 RETURNING *
    `, [resolution, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });

    const be = getBrainEvents();
    if (be) {
      await be.emitEvent('dispute.resolved', r.rows[0].rfq_id, {
        dispute_id: r.rows[0].id, resolution, admin_id,
        forum: r.rows[0].forum,
      }, admin_id || null, 'admin');
    }
    res.json({ ok: true, dispute: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, determineForum, AAA_THRESHOLD };
