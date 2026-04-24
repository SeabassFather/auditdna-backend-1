// /api/deals/stream - SSE feed
// EventSource cannot send headers, so JWT comes via ?token= querystring
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { registerClient, unregisterClient, broadcast, clientCount } = require('../autonomy/sse-broadcaster');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

router.get('/', (req, res) => {
  const token = req.query.token || (req.headers.authorization || '').replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ success: false, error: 'Missing token' });

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); }
  catch (e) { return res.status(401).json({ success: false, error: 'Invalid token' }); }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  const client = registerClient(res, {
    user_id: decoded.userId || decoded.id,
    role: decoded.role,
    connected_at: new Date().toISOString()
  });

  res.write(`event: welcome\ndata: ${JSON.stringify({
    message: 'connected',
    user: decoded.username || null,
    role: decoded.role || null,
    clients: clientCount()
  })}\n\n`);

  broadcast('stream.client_connected', { user: decoded.username, role: decoded.role, clients: clientCount() });

  req.on('close', () => {
    unregisterClient(client);
    broadcast('stream.client_disconnected', { user: decoded.username, clients: clientCount() });
  });
});

router.get('/status', (req, res) => {
  res.json({ success: true, clients: clientCount() });
});

module.exports = router;
