// routes/brain-stream.js  --  Sprint C P4 Deal Floor SSE event stream
// GET /api/brain/stream    (SSE, auth optional via query token)
// POST /api/brain/emit     (auth, broadcast event)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'auditdna-dev-secret';
const clients = new Set();

function verifyOptional(token) {
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch (e) { return null; }
}

router.get('/stream', (req, res) => {
  const token = req.query.token || (req.headers.authorization || '').replace(/^Bearer /, '');
  const user = verifyOptional(token);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders && res.flushHeaders();

  res.write('event: hello\ndata: ' + JSON.stringify({ ok: true, user_id: user && user.id }) + '\n\n');

  const heartbeat = setInterval(() => {
    try { res.write(': hb ' + Date.now() + '\n\n'); } catch (e) {}
  }, 25000);

  clients.add(res);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

router.post('/emit', (req, res) => {
  const evt = req.body || {};
  const payload = 'event: ' + (evt.type || 'message') + '\ndata: ' + JSON.stringify(evt) + '\n\n';
  let n = 0;
  for (const c of clients) { try { c.write(payload); n++; } catch (e) {} }
  return res.json({ ok: true, delivered: n });
});

router.get('/health', (req, res) => res.json({ ok: true, route: 'brain-stream', clients: clients.size }));

module.exports = router;