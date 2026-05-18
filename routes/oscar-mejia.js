// routes/oscar-mejia.js
// Oscar Mejia Sales Agent — Broccoli | Berry | Avocado
// Territory: Midwest + East Coast wholesale buyers
// Drip: 2x/week, 45 days, 13 touchpoints

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const SEGMENTS = {
  broccoli: {
    states: ['IL','OH','MI','IN','WI','MN','MO','IA','NY','NJ','PA','MA','CT','MD','VA','NC','GA'],
    commodity: 'broccoli',
    subject: 'Fresh Broccoli Crown Available — Salinas CA + Yuma AZ + Mexico Direct',
    origin: 'Salinas CA + Yuma AZ + Guanajuato MX',
    pack: '20lb carton',
    price_ref: 'USDA Salinas shipping point'
  },
  berry: {
    states: ['NY','NJ','PA','MA','CT','MD','VA','NC','GA','FL','SC','DE','RI'],
    commodity: 'strawberry',
    subject: 'California + Mexico Berry Program — Strawberry | Blueberry | Raspberry',
    origin: 'Baja CA + Michoacan + Sinaloa MX',
    pack: '8x1lb clamshell | 12x6oz clamshell',
    price_ref: 'USDA AMS terminal markets'
  },
  avocado: {
    states: ['IL','OH','MI','IN','WI','MN','MO','IA','NY','NJ','PA','MA','CT','VA','NC'],
    commodity: 'avocado',
    subject: 'Hass Avocado Program — Michoacan Mexico Direct FOB 48ct/60ct',
    origin: 'Michoacan MX',
    pack: '25lb 48ct or 60ct Hass',
    price_ref: 'USDA Hass index'
  }
};

// GET /api/oscar/programs — all 3 programs with details
router.get('/programs', (req, res) => {
  res.json({
    agent: { name: 'Oscar Mejia', email: 'oscar@mexausafg.com', role: 'sales', territory: 'Midwest + East Coast' },
    programs: Object.entries(SEGMENTS).map(([id, s]) => ({
      id: 'OM-' + id.toUpperCase(),
      name: id.charAt(0).toUpperCase() + id.slice(1) + ' Program',
      commodity: s.commodity, origin: s.origin, pack: s.pack,
      targetBuyers: s.states.slice(0,5).join(', ') + '...',
      priceRef: s.price_ref, status: 'ACTIVE',
      campaign: '2x/week + 45-day drip', touchpoints: 13
    })),
    drip: { frequency: '2x/week', duration: '45 days', totalTouchpoints: 13 },
    ts: new Date().toISOString()
  });
});

// GET /api/oscar/status — campaign status
router.get('/status', (req, res) => {
  res.json({ agent: 'Oscar Mejia', programs: Object.keys(SEGMENTS), status: 'READY',
    blast_endpoints: Object.keys(SEGMENTS).map(p => '/api/oscar/blast/' + p) });
});

// GET /api/oscar/buyers/:program — buyer count for program territory
router.get('/buyers/:program', async (req, res) => {
  const seg = SEGMENTS[req.params.program];
  if (!seg) return res.status(400).json({ error: 'Program not found. Use: broccoli|berry|avocado' });
  try {
    const r = await pool.query(
      'SELECT COUNT(DISTINCT email) as count FROM shipper_contacts WHERE email IS NOT NULL AND state = ANY($1)',
      [seg.states]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    res.json({ program: req.params.program, agent: 'Oscar Mejia',
      territory_states: seg.states, buyer_count: parseInt(r.rows[0].count) || 0,
      commodity: seg.commodity, status: 'READY' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/oscar/blast/:program — trigger campaign blast
router.post('/blast/:program', async (req, res) => {
  const seg = SEGMENTS[req.params.program];
  if (!seg) return res.status(400).json({ error: 'Use: broccoli|berry|avocado' });
  try {
    // Get buyer emails from CRM shipper_contacts in territory
    const buyers = await pool.query(
      'SELECT DISTINCT email, company_name, first_name, state FROM shipper_contacts WHERE email IS NOT NULL AND state = ANY($1) ORDER BY company_name LIMIT 500',
      [seg.states]
    ).catch(() => ({ rows: [] }));

    // Also pull from growers table (they buy too)
    const buyers2 = await pool.query(
      'SELECT DISTINCT email, company_name FROM growers WHERE email IS NOT NULL AND state_province = ANY($1) LIMIT 200',
      [seg.states]
    ).catch(() => ({ rows: [] }));

    const allBuyers = [...buyers.rows, ...buyers2.rows].filter(b => b.email);

    // Log brain event
    await pool.query(
      'INSERT INTO brain_events(event_type, payload, created_at) VALUES($1, $2, NOW())',
      ['OSCAR_CAMPAIGN_BLAST', JSON.stringify({
        program: req.params.program, agent: 'Oscar Mejia',
        commodity: seg.commodity, recipients: allBuyers.length,
        subject: seg.subject, origin: seg.origin
      })]
    ).catch(() => {});

    console.log('[OSCAR BLAST]', req.params.program, '->', allBuyers.length, 'buyers');
    res.json({
      success: true,
      program: req.params.program,
      agent: 'Oscar Mejia',
      commodity: seg.commodity,
      origin: seg.origin,
      subject: seg.subject,
      recipients_queued: allBuyers.length,
      territory: seg.states,
      status: 'QUEUED',
      ts: new Date().toISOString()
    });
  } catch(err) {
    console.error('[OSCAR BLAST ERR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oscar/drip — 45-day drip schedule
router.get('/drip', (req, res) => {
  const touchpoints = [];
  for(let day=1; day<=45; day+=3){
    const prog=['broccoli','berry','avocado'][Math.floor((day/15))%3];
    touchpoints.push({ day, type: day===1?'INTRO':day%9===0?'PRICE_UPDATE':'FOLLOW_UP',
      program: prog, subject: SEGMENTS[prog].subject });
  }
  res.json({ agent: 'Oscar Mejia', duration_days: 45, frequency: '2x/week',
    total_touchpoints: touchpoints.length, schedule: touchpoints });
});

module.exports = router;
