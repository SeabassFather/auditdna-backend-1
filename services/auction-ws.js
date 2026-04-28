/**
 * C:\AuditDNA\backend\services\auction-ws.js
 *
 * Phase 2 - Real-time auction WebSocket.
 *
 * Replaces 30s polling in AuctionWindow.jsx with sub-second updates.
 * Clients connect to: wss://auditdna-backend-1-production.up.railway.app/ws/auction/:rfqId
 *
 * Server broadcasts to all clients in a room when:
 *   - new_bid       offer placed (during open phase only - sealed phase hides bids)
 *   - bid_revised   grower revised existing offer
 *   - phase_change  sealed -> open transition
 *   - rfq_locked    deal closed
 *   - distress      grower flagged distress signal
 *   - tick          countdown update every 5s
 *
 * Client sends:
 *   - subscribe    { rfq_id, role, user_id }
 *   - unsubscribe  { rfq_id }
 *   - ping         keep-alive
 *
 * Mount in server.js:
 *   const auctionWs = require('./services/auction-ws');
 *   auctionWs.attach(server);  // pass http.Server instance
 *   app.use('/api/auction-ws', auctionWs.router);
 *
 * Required dep: ws@8
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

let WebSocketServer = null;
let wss = null;

// roomId -> Set<ws>
const rooms = new Map();
// ws -> { rfqId, role, userId, lastPing }
const clientMeta = new WeakMap();

let tickInterval = null;

// ----------------------------------------------------------------------------
// Attach to express http server
// ----------------------------------------------------------------------------
function attach(httpServer) {
  try {
    ({ WebSocketServer } = require('ws'));
  } catch (e) {
    console.error('[auction-ws] ws module not installed - run: npm i ws --save');
    return false;
  }
  wss = new WebSocketServer({ server: httpServer, path: '/ws/auction' });
  wss.on('connection', handleConnection);
  console.log('[auction-ws] WebSocket server attached at /ws/auction');
  startTickLoop();
  return true;
}

function handleConnection(ws, req) {
  clientMeta.set(ws, { rfqId: null, role: null, userId: null, lastPing: Date.now() });

  ws.on('message', (raw) => {
    let msg = {};
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
    const meta = clientMeta.get(ws);

    if (msg.type === 'subscribe' && msg.rfq_id) {
      const roomId = String(msg.rfq_id);
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(ws);
      meta.rfqId = roomId;
      meta.role = msg.role || 'guest';
      meta.userId = msg.user_id || null;
      ws.send(JSON.stringify({ type: 'subscribed', rfq_id: roomId, room_size: rooms.get(roomId).size }));
    } else if (msg.type === 'unsubscribe') {
      removeFromRoom(ws);
    } else if (msg.type === 'ping') {
      meta.lastPing = Date.now();
      ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
    }
  });

  ws.on('close', () => removeFromRoom(ws));
  ws.on('error', () => removeFromRoom(ws));
}

function removeFromRoom(ws) {
  const meta = clientMeta.get(ws);
  if (!meta || !meta.rfqId) return;
  const room = rooms.get(meta.rfqId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(meta.rfqId);
  }
}

// ----------------------------------------------------------------------------
// Broadcast to a room
// ----------------------------------------------------------------------------
function broadcastToRoom(rfqId, payload) {
  const roomId = String(rfqId);
  const room = rooms.get(roomId);
  if (!room || room.size === 0) return 0;
  const msg = JSON.stringify(payload);
  let sent = 0;
  for (const ws of room) {
    if (ws.readyState === 1) {
      try { ws.send(msg); sent++; } catch (e) {}
    }
  }
  return sent;
}

// Public emit functions for other services
function emitNewBid(rfqId, bidData) {
  return broadcastToRoom(rfqId, { type: 'new_bid', rfq_id: rfqId, bid: bidData, t: Date.now() });
}
function emitBidRevised(rfqId, bidData) {
  return broadcastToRoom(rfqId, { type: 'bid_revised', rfq_id: rfqId, bid: bidData, t: Date.now() });
}
function emitPhaseChange(rfqId, phase) {
  return broadcastToRoom(rfqId, { type: 'phase_change', rfq_id: rfqId, phase, t: Date.now() });
}
function emitRFQLocked(rfqId, lockData) {
  return broadcastToRoom(rfqId, { type: 'rfq_locked', rfq_id: rfqId, lock: lockData, t: Date.now() });
}
function emitDistress(rfqId, reason) {
  return broadcastToRoom(rfqId, { type: 'distress', rfq_id: rfqId, reason, t: Date.now() });
}

// ----------------------------------------------------------------------------
// Tick loop - broadcasts countdown + auto-detects phase transitions
// ----------------------------------------------------------------------------
async function tickAllAuctions() {
  if (rooms.size === 0) return;
  try {
    const ids = Array.from(rooms.keys()).map(Number).filter(Boolean);
    if (ids.length === 0) return;
    const r = await pool.query(`
      SELECT id, rfq_code, status, auction_starts_at, auction_ends_at, is_spot_market
        FROM rfq_needs
       WHERE id = ANY($1::bigint[])
    `, [ids]);
    const now = Date.now();
    for (const rfq of r.rows) {
      if (rfq.is_spot_market) continue;
      const starts = rfq.auction_starts_at ? new Date(rfq.auction_starts_at).getTime() : null;
      const ends = rfq.auction_ends_at ? new Date(rfq.auction_ends_at).getTime() : null;
      let phase = 'pending';
      let secondsLeft = 0;
      if (starts && ends) {
        const total = ends - starts;
        const elapsed = now - starts;
        if (now < starts) phase = 'pending';
        else if (elapsed < total / 2) phase = 'sealed';
        else if (now < ends) phase = 'open';
        else phase = 'closed';
        secondsLeft = Math.max(0, Math.round((ends - now) / 1000));
      }
      broadcastToRoom(rfq.id, {
        type: 'tick', rfq_id: rfq.id, phase, seconds_left: secondsLeft,
        status: rfq.status, t: now,
      });
    }
  } catch (e) {
    console.error('[auction-ws] tick error:', e.message);
  }
}

function startTickLoop() {
  if (tickInterval) return;
  tickInterval = setInterval(tickAllAuctions, 5000);
}

function stopTickLoop() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

// ----------------------------------------------------------------------------
// Routes (HTTP) - health + admin emit
// ----------------------------------------------------------------------------
router.get('/status', (req, res) => {
  res.json({
    attached: !!wss,
    active_rooms: rooms.size,
    total_clients: Array.from(rooms.values()).reduce((sum, s) => sum + s.size, 0),
    rooms: Array.from(rooms.entries()).map(([k, v]) => ({ rfq_id: k, clients: v.size })),
  });
});

router.post('/emit/:rfqId', express.json(), (req, res) => {
  const { rfqId } = req.params;
  const { type, payload } = req.body || {};
  if (!type) return res.status(400).json({ error: 'missing type' });
  const sent = broadcastToRoom(rfqId, { type, ...(payload || {}), t: Date.now() });
  res.json({ ok: true, sent });
});

module.exports = {
  router, attach,
  emitNewBid, emitBidRevised, emitPhaseChange, emitRFQLocked, emitDistress,
  broadcastToRoom,
};
