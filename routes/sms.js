// ============================================================
// AuditDNA SMS Route — Zadarma API
// Backend: C:\AuditDNA\backend\routes\sms.js
// Register in server.js: app.use('/api/sms', require('./routes/sms'));
// ============================================================
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const axios   = require('axios');

const ZD_KEY    = process.env.ZADARMA_KEY    || '';
const ZD_SECRET = process.env.ZADARMA_SECRET || '';
const ZD_BASE   = 'https://api.zadarma.com';

// ── ZADARMA SIGNATURE ──────────────────────────────────────
function zdSign(endpoint, params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const hash   = crypto.createHash('md5').update(sorted).digest('hex');
  const data   = endpoint + sorted + hash;
  return crypto.createHmac('sha1', ZD_SECRET).update(data).digest('base64');
}

function zdHeaders(endpoint, params) {
  return {
    Authorization: `${ZD_KEY}:${zdSign(endpoint, params)}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

// ── POST /api/sms/send ─────────────────────────────────────
// Body: { to, message, from? }
router.post('/send', async (req, res) => {
  const { to, message, from } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Missing: to, message' });
  if (!ZD_KEY || !ZD_SECRET) return res.status(500).json({ error: 'Zadarma keys not configured in .env' });

  const endpoint = '/v1/sms/send/';
  const params   = { number: to.replace(/\D/g, ''), message };
  if (from) params.caller_id = from;

  try {
    const response = await axios.post(
      `${ZD_BASE}${endpoint}`,
      new URLSearchParams(params).toString(),
      { headers: zdHeaders(endpoint, params) }
    );
    const d = response.data;
    if (d.status === 'success') {
      console.log(`[SMS] Sent to ${to}: "${message.slice(0,40)}..."`);
      res.json({ success: true, status: d.status, cost: d.cost || null });
    } else {
      res.status(400).json({ error: d.message || 'Zadarma rejected SMS', raw: d });
    }
  } catch (err) {
    console.error('[SMS] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sms/bulk ─────────────────────────────────────
// Body: { recipients: [{number, name}], message, delayMs? }
router.post('/bulk', async (req, res) => {
  const { recipients, message, delayMs = 1500 } = req.body;
  if (!recipients?.length || !message) return res.status(400).json({ error: 'Missing: recipients, message' });
  if (!ZD_KEY || !ZD_SECRET) return res.status(500).json({ error: 'Zadarma keys not configured' });

  const results = [];
  for (const r of recipients) {
    const number = (r.number || r.phone || '').replace(/\D/g, '');
    if (!number) { results.push({ number: r.number, success: false, error: 'Invalid number' }); continue; }

    const personalizedMsg = message
      .replace(/\{\{name\}\}/g, r.name || '')
      .replace(/\{\{first_name\}\}/g, (r.name || '').split(' ')[0] || '');

    const endpoint = '/v1/sms/send/';
    const params   = { number, message: personalizedMsg };

    try {
      const response = await axios.post(
        `${ZD_BASE}${endpoint}`,
        new URLSearchParams(params).toString(),
        { headers: zdHeaders(endpoint, params) }
      );
      const d = response.data;
      results.push({ number, name: r.name, success: d.status === 'success', cost: d.cost });
      if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (err) {
      results.push({ number, name: r.name, success: false, error: err.message });
    }
  }

  const sent   = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`[SMS] Bulk: ${sent} sent, ${failed} failed`);
  res.json({ success: true, total: recipients.length, sent, failed, results });
});

// ── GET /api/sms/status ────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    configured: !!(ZD_KEY && ZD_SECRET),
    provider: 'Zadarma',
    keys: ZD_KEY ? 'SET' : 'MISSING',
  });
});

module.exports = router;