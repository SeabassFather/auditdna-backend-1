// routes/notifications.routes.js
'use strict';
const express = require('express');
const router  = express.Router();
let _pool = null;
router.use((req,res,next) => { _pool = req.app.get('pool') || _pool; next(); });

const MOCK_EVENT_TYPES = ['ESCROW_ACTIVATED','PAYMENT_DUE','CERT_EXPIRY','DEAL_MATCHED',
  'PRICE_ALERT','COMPLIANCE_FLAG','LOAF_REGISTRATION','AUDIT_COMPLETE'];

// GET /api/notifications
router.get('/', async (req, res) => {
  if (_pool) {
    const r = await _pool.query(
      `SELECT * FROM platform_notifications ORDER BY created_at DESC LIMIT 50`
    ).catch(()=>({rows:[]}));
    if (r.rows.length) return res.json({ notifications: r.rows, total: r.rows.length });
  }
  res.json({ notifications: [], total: 0, unread: 0 });
});

// GET /api/notifications/stats
router.get('/stats', async (req, res) => {
  if (_pool) {
    const r = await _pool.query(
      `SELECT COUNT(*) total, COUNT(*) FILTER(WHERE NOT read) unread,
              COUNT(*) FILTER(WHERE type='URGENT') urgent
       FROM platform_notifications`
    ).catch(()=>({rows:[{total:0,unread:0,urgent:0}]}));
    return res.json(r.rows[0]);
  }
  res.json({ total: 0, unread: 0, urgent: 0 });
});

// GET /api/notifications/event-types
router.get('/event-types', (req, res) => {
  res.json({ event_types: MOCK_EVENT_TYPES.map(t => ({ id: t, label: t.replace(/_/g,' ') })) });
});

// GET /api/notifications/subscriptions
router.get('/subscriptions', async (req, res) => {
  if (_pool) {
    const r = await _pool.query(
      `SELECT * FROM notification_subscriptions ORDER BY created_at DESC LIMIT 50`
    ).catch(()=>({rows:[]}));
    return res.json({ subscriptions: r.rows });
  }
  res.json({ subscriptions: [] });
});

// POST /api/notifications/subscriptions
router.post('/subscriptions', async (req, res) => {
  const { event_type, channel, recipient } = req.body;
  if (_pool) {
    await _pool.query(`CREATE TABLE IF NOT EXISTS notification_subscriptions (
      id SERIAL PRIMARY KEY, event_type VARCHAR(60), channel VARCHAR(20),
      recipient VARCHAR(200), active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
    )`).catch(()=>{});
    const r = await _pool.query(
      `INSERT INTO notification_subscriptions (event_type,channel,recipient) VALUES ($1,$2,$3) RETURNING *`,
      [event_type, channel, recipient]
    ).catch(()=>({rows:[{id:null}]}));
    return res.status(201).json({ subscription: r.rows[0] });
  }
  res.status(201).json({ subscription: { id: Date.now(), event_type, channel, recipient } });
});

// DELETE /api/notifications/subscriptions/:id
router.delete('/subscriptions/:id', async (req, res) => {
  if (_pool) await _pool.query('DELETE FROM notification_subscriptions WHERE id=$1', [req.params.id]).catch(()=>{});
  res.json({ deleted: true, id: req.params.id });
});

// GET /api/notifications/templates
router.get('/templates', (req, res) => {
  res.json({ templates: [
    { id: 'tpl-001', name: 'Cert Expiry Alert', event: 'CERT_EXPIRY', subject: 'Certification expiring in {{days}} days', body: 'Your {{cert_type}} expires on {{expiry_date}}.' },
    { id: 'tpl-002', name: 'Deal Match',         event: 'DEAL_MATCHED', subject: 'New match: {{commodity}}', body: 'A grower-buyer match was found for {{commodity}}.' },
    { id: 'tpl-003', name: 'Price Alert',        event: 'PRICE_ALERT',  subject: '{{commodity}} price moved {{pct}}%', body: '{{commodity}} at {{market}} changed {{pct}}%.' },
  ]});
});

// POST /api/notifications/templates
router.post('/templates', (req, res) => res.status(201).json({ template: { id: `tpl-${Date.now()}`, ...req.body } }));

// PUT /api/notifications/templates/:id
router.put('/templates/:id', (req, res) => res.json({ template: { id: req.params.id, ...req.body } }));

// DELETE /api/notifications/templates/:id
router.delete('/templates/:id', (req, res) => res.json({ deleted: true }));

// GET /api/notifications/log
router.get('/log', async (req, res) => {
  if (_pool) {
    const r = await _pool.query(
      `SELECT * FROM platform_notifications ORDER BY created_at DESC LIMIT 100`
    ).catch(()=>({rows:[]}));
    return res.json({ log: r.rows });
  }
  res.json({ log: [] });
});

// POST /api/notifications/test
router.post('/test', (req, res) => {
  const { event_type, recipient } = req.body;
  console.log(`[NOTIF TEST] ${event_type} → ${recipient}`);
  res.json({ sent: true, event_type, recipient, ts: new Date().toISOString() });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  if (_pool) await _pool.query(
    'UPDATE platform_notifications SET read=TRUE WHERE id=$1', [req.params.id]
  ).catch(()=>{});
  res.json({ success: true, id: req.params.id });
});

module.exports = router;
