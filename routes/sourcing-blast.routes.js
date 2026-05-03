// File: C:\AuditDNA\backend\routes\sourcing-blast.routes.js
'use strict';
const express = require('express');
const router = express.Router();
const { sendSourcingBlast } = require('../services/sourcing-blast');

// POST /api/sourcing/blast { commodity: "tomato", regions: ["California","Mexico"] }
router.post('/blast', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { commodity, regions } = req.body || {};
    if (!commodity) return res.status(400).json({ ok: false, error: 'commodity required' });
    const regionList = Array.isArray(regions) ? regions : (regions ? [regions] : ['Any region']);
    // Fire-and-forget so HTTP returns immediately
    sendSourcingBlast(pool, commodity.toLowerCase(), regionList)
      .then(r => console.log('[SOURCING-BLAST] complete:', JSON.stringify(r)))
      .catch(e => console.error('[SOURCING-BLAST] error:', e.message));
    res.json({ ok: true, queued: true, commodity, regions: regionList, message: 'Blast queued. Check email_activity_log for delivery status.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/sourcing/recent - last 50 sourcing blasts grouped by commodity
router.get('/recent', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const r = await pool.query(`
      SELECT commodity, COUNT(*) AS sent, MAX(created_at) AS last_sent
      FROM email_activity_log
      WHERE agent_id = 'SOURCING_BLAST'
      GROUP BY commodity
      ORDER BY last_sent DESC
      LIMIT 50
    `);
    res.json({ ok: true, rows: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;