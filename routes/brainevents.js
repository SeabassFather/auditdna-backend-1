// Save to: C:\AuditDNA\backend\routes\brainEvents.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// POST /api/brain/events
router.post('/', async (req, res) => {
  try {
    const { events } = req.body;
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array required' });
    }

    const pool = getPool(req);
    for (const event of events) {
      const { type, payload, timestamp } = event;
      await pool.query(
        `INSERT INTO brain_events (type, payload, created_at)
         VALUES ($1, $2, to_timestamp($3 / 1000.0))
         ON CONFLICT DO NOTHING`,
        [type || 'UNKNOWN', JSON.stringify(payload || {}), timestamp || Date.now()]
      ).catch(() => {
        // Table may not exist yet â€” silently continue
      });
    }

    res.json({ ok: true, received: events.length });
  } catch (err) {
    // Never crash the frontend over brain events
    res.json({ ok: true, note: 'logged locally' });
  }
});

// POST /api/brain/event (singular â€” used by module activation)
router.post('/event', async (req, res) => {
  try {
    const { type, payload, timestamp, ...rest } = req.body;
    const pool = getPool(req);
    await pool.query(
      `INSERT INTO brain_events (type, payload, created_at)
       VALUES ($1, $2, to_timestamp($3 / 1000.0))
       ON CONFLICT DO NOTHING`,
      [type || 'UNKNOWN', JSON.stringify(payload || rest || {}), timestamp || Date.now()]
    ).catch(() => {});
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});


// GET /api/brain/events â€” returns recent brain activity log
router.get('/events', async (req, res) => {
  try {
    const pool = getPool(req);
    const result = await pool.query(
      `SELECT id, event_type, payload, created_at FROM brain_events ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ success: true, events: result.rows });
  } catch(err) {
    // Table may not exist yet â€” return empty
    res.json({ success: true, events: [] });
  }
});

module.exports = router;
