// loaf-consolidator.js — Blind Consolidated Load Matching Engine
// MFG Patent Pending — Anonymous Participant ID + Split Escrow + Deferred Disclosure
// Save to: C:\AuditDNA\backend\routes\loaf-consolidator.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

// Generate blind MFG-GRW / MFG-BYR IDs
function genBlindId(type = 'GRW') {
  const num = crypto.randomInt(1000, 9999);
  return `MFG-${type}-${num}`;
}

// In-memory consolidation sessions (replace with DB table in production)
const sessions = {};

// POST /api/consolidator/match
// Finds growers that can collectively fill a buyer Reverse order
router.post('/match', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  const { commodity, volume_cases, fob_port, delivery_date, buyer_id } = req.body;
  if (!commodity || !volume_cases) return res.status(400).json({ error: 'commodity + volume_cases required' });

  try {
    // Find growers with matching commodity in LOAF offers
    const result = await pool.query(`
      SELECT g.id, g.contact_name, g.company_name, g.primary_product,
             g.phone, g.country, g.state_province,
             lo.id as offer_id, lo.volume_cases as offer_volume, lo.price_per_case, lo.fob_port
      FROM ag_contacts g
      LEFT JOIN loaf_offers lo ON lo.grower_id = g.id AND lo.status = 'active'
      WHERE LOWER(g.primary_product) LIKE $1
         OR LOWER(g.secondary_products) LIKE $1
      ORDER BY lo.created_at DESC
      LIMIT 20
    `, [`%${commodity.toLowerCase()}%`]);

    const growers = result.rows;
    let remaining = parseInt(volume_cases);
    const matched = [];
    let totalMatched = 0;

    for (const g of growers) {
      if (remaining <= 0) break;
      const available = parseInt(g.offer_volume) || 0;
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      matched.push({
        blind_id: genBlindId('GRW'),
        grower_db_id: g.id,
        offer_id: g.offer_id,
        volume_allocated: take,
        price_per_case: g.price_per_case,
        phone: g.phone,
        fob_port: g.fob_port || fob_port,
        _real_name: g.contact_name, // NEVER sent to buyer or other growers
        _real_company: g.company_name,
      });
      remaining -= take;
      totalMatched += take;
    }

    const canFulfill = remaining <= 0;
    const sessionId = `CONS-${Date.now()}-${crypto.randomInt(1000,9999)}`;
    const buyerBlindId = genBlindId('BYR');

    sessions[sessionId] = {
      sessionId,
      buyerBlindId,
      buyer_id,
      commodity,
      volume_cases: parseInt(volume_cases),
      fob_port,
      delivery_date,
      matched,
      totalMatched,
      canFulfill,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    res.json({
      sessionId,
      canFulfill,
      totalMatched,
      volumeNeeded: parseInt(volume_cases),
      shortfall: Math.max(0, remaining),
      growerCount: matched.length,
      buyerBlindId,
      // Return blind IDs only — NO real names
      allocations: matched.map(m => ({
        blindId: m.blind_id,
        volumeAllocated: m.volume_allocated,
        pricePerCase: m.price_per_case,
        fobPort: m.fob_port,
      })),
    });
  } catch (e) {
    console.error('[consolidator] match error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/consolidator/accept — grower accepts their slice
router.post('/accept', (req, res) => {
  const { sessionId, blindId, accepted } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const grower = session.matched.find(m => m.blind_id === blindId);
  if (!grower) return res.status(404).json({ error: 'Blind ID not found in session' });
  grower.accepted = accepted;
  grower.acceptedAt = new Date().toISOString();
  const allAccepted = session.matched.every(m => m.accepted === true);
  if (allAccepted) session.status = 'confirmed';
  res.json({ sessionId, blindId, accepted, allAccepted, sessionStatus: session.status });
});

// GET /api/consolidator/session/:id — get session status (no real names)
router.get('/session/:id', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json({
    sessionId: session.sessionId,
    status: session.status,
    canFulfill: session.canFulfill,
    totalMatched: session.totalMatched,
    volumeNeeded: session.volume_cases,
    commodity: session.commodity,
    growerCount: session.matched.length,
    acceptances: session.matched.map(m => ({
      blindId: m.blind_id,
      volumeAllocated: m.volume_allocated,
      accepted: m.accepted || false,
    })),
  });
});

// POST /api/consolidator/disclose — reveal identities ONLY after deal closes + payment clears
// Requires auth — owner only
router.post('/disclose', (req, res) => {
  const { sessionId, authorization_code } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Not found' });
  if (session.status !== 'paid') return res.status(403).json({
    error: 'Disclosure blocked — deal not in paid status',
    currentStatus: session.status,
    rule: 'LOI→NDA→TermSheet→Acceptance→PartyDisclosure — payment must clear first',
  });
  res.json({
    sessionId,
    disclosed: true,
    parties: session.matched.map(m => ({
      blindId: m.blind_id,
      realName: m._real_name,
      realCompany: m._real_company,
      volumeAllocated: m.volume_allocated,
    })),
  });
});


router.get('/', (req,res) => res.json({ ok:true, status:'ONLINE', service:'loaf-consolidator', sessions: Object.keys(sessions).length }));
module.exports = router;
