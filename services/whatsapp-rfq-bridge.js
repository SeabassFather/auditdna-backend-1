/**
 * C:\AuditDNA\backend\services\whatsapp-rfq-bridge.js (v2)
 *
 * Phase 1 Day 5 - schema-corrected.
 * Real rfq_notifications schema: recipient_id, recipient_role (not grower_id).
 * Real growers schema: company_name, phone (not display_name).
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:9999';
const OPENCLAW_KEY = process.env.OPENCLAW_API_KEY || null;

// ----------------------------------------------------------------------------
// OUT
// ----------------------------------------------------------------------------
async function notifyGrower(growerId, message) {
  try {
    const r = await pool.query(`SELECT phone, whatsapp, company_name FROM growers WHERE id = $1`, [growerId]);
    if (r.rows.length === 0) return { ok: false, error: 'grower_not_found' };
    const phone = r.rows[0].whatsapp || r.rows[0].phone;
    if (!phone) return { ok: false, error: 'no_phone' };
    const headers = { 'Content-Type': 'application/json' };
    if (OPENCLAW_KEY) headers['X-API-Key'] = OPENCLAW_KEY;
    const res = await fetch(`${OPENCLAW_URL}/send`, {
      method: 'POST', headers,
      body: JSON.stringify({ to: phone, message }),
    });
    if (!res.ok) return { ok: false, error: `gateway HTTP ${res.status}` };
    return { ok: true, phone };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ----------------------------------------------------------------------------
// IN parsing helpers
// ----------------------------------------------------------------------------
async function findGrowerByPhone(phone) {
  const norm = String(phone).replace(/\D/g, '');
  let r = await pool.query(`SELECT id, company_name FROM growers WHERE phone = $1 OR whatsapp = $1 LIMIT 1`, [phone]);
  if (r.rows.length === 0 && norm.length >= 10) {
    const last10 = `%${norm.slice(-10)}`;
    r = await pool.query(`SELECT id, company_name FROM growers WHERE phone LIKE $1 OR whatsapp LIKE $1 LIMIT 1`, [last10]);
  }
  return r.rows[0] || null;
}

async function getPendingRFQ(growerId) {
  const r = await pool.query(`
    SELECT rn.id, rn.rfq_code, rn.commodity_category, rn.commodity_subcategory,
           rn.quantity, rn.quantity_unit, rn.target_price, rn.auction_ends_at
      FROM rfq_notifications nf
      JOIN rfq_needs rn ON nf.rfq_id = rn.id
     WHERE nf.recipient_id = $1
       AND nf.recipient_role = 'grower'
       AND rn.status = 'open'
       AND (rn.auction_ends_at IS NULL OR rn.auction_ends_at > NOW())
     ORDER BY nf.created_at DESC
     LIMIT 1
  `, [growerId]);
  return r.rows[0] || null;
}

async function placeBidViaWA(growerId, rfqId, price) {
  const r = await pool.query(`
    INSERT INTO rfq_offers (rfq_id, grower_id, price, currency, status, source, created_at)
    VALUES ($1, $2, $3, 'USD', 'submitted', 'whatsapp', NOW())
    RETURNING id, price
  `, [rfqId, growerId, price]);
  return r.rows[0];
}

async function passRFQ(growerId, rfqId) {
  // No status column on rfq_notifications, just mark delivered
  await pool.query(`
    UPDATE rfq_notifications
       SET delivered = TRUE, delivered_at = NOW()
     WHERE recipient_id = $1 AND rfq_id = $2 AND recipient_role = 'grower'
  `, [growerId, rfqId]);
}

// ----------------------------------------------------------------------------
// IN webhook
// ----------------------------------------------------------------------------
router.post('/inbound', async (req, res) => {
  try {
    const { from, message } = req.body || {};
    if (!from || !message) return res.status(400).json({ error: 'missing from/message' });
    const grower = await findGrowerByPhone(from);
    if (!grower) return res.json({ reply: 'Number not registered. Sign up at mexausafg.com.' });

    const cmd = String(message).trim().toUpperCase();
    const pending = await getPendingRFQ(grower.id);

    if (cmd.startsWith('BID')) {
      if (!pending) return res.json({ reply: 'No pending RFQ. Reply STATUS to check.' });
      const m = cmd.match(/BID\s+([0-9]+(?:\.[0-9]+)?)/);
      if (!m) return res.json({ reply: 'Format: BID 42.50' });
      const price = parseFloat(m[1]);
      if (price <= 0) return res.json({ reply: 'Price must be positive' });
      const bid = await placeBidViaWA(grower.id, pending.id, price);
      return res.json({ reply: `Bid $${bid.price} placed on ${pending.rfq_code}.` });
    }

    if (cmd === 'PASS' || cmd === 'NO' || cmd === 'DECLINE') {
      if (!pending) return res.json({ reply: 'No pending RFQ to pass on.' });
      await passRFQ(grower.id, pending.id);
      return res.json({ reply: `Passed on ${pending.rfq_code}.` });
    }

    if (cmd === 'STATUS' || cmd === 'INBOX') {
      if (!pending) return res.json({ reply: 'No pending RFQs.' });
      const ends = pending.auction_ends_at ? new Date(pending.auction_ends_at) : null;
      const minsLeft = ends ? Math.max(0, Math.round((ends - new Date()) / 60000)) : '?';
      return res.json({
        reply: `${pending.rfq_code}: ${pending.quantity} ${pending.quantity_unit} ${pending.commodity_category} ` +
          `at $${pending.target_price}. ${minsLeft}min left. Reply BID <price> or PASS.`
      });
    }

    if (cmd === 'HELP' || cmd === '?') {
      return res.json({ reply: 'Commands: STATUS, BID 42.50, PASS.' });
    }

    return res.json({ reply: 'Unknown command. Reply HELP for options.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// OUT manual
// ----------------------------------------------------------------------------
router.post('/notify-grower', async (req, res) => {
  try {
    const { grower_id, message } = req.body || {};
    if (!grower_id || !message) return res.status(400).json({ error: 'missing grower_id or message' });
    const result = await notifyGrower(grower_id, message);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/status', async (req, res) => {
  res.json({
    gateway: OPENCLAW_URL,
    key_set: !!OPENCLAW_KEY,
    ready: true,
  });
});

module.exports = { router, notifyGrower };
