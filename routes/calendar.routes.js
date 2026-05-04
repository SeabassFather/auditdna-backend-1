// ============================================================================
// CALENDAR ROUTES (UPDATED COLOR MAP - INTAKE + SYSTEM EVENTS VISIBLE)
// File: C:\AuditDNA\backend\routes\calendar.routes.js
// Mount: app.use('/api/calendar', require('./routes/calendar.routes'));
// ============================================================================
'use strict';
const express = require('express');
const router = express.Router();

// Color map - keep in sync with frontend EmailCalendar.jsx legend
const COLOR_MAP = {
  // commodity / outreach agents (existing)
  AVOCADO:         '#0F7B41',
  BUYER_OUTREACH:  '#C9A55C',
  GROWER_TENDER:   '#1E3A5F',
  LOGISTICS:       '#8B4513',
  FOOD_SAFETY:     '#2E7D32',
  FINANCE:         '#9C27B0',
  MARKET_INTEL:    '#0277BD',
  PRODUCTION_REPORT: '#5D4037',
  SOURCING_BLAST:  '#D84315',
  INBOX_SORTER:    '#0288D1',

  // intake events (Patent US2025-059)
  INTAKE_OPEN:     '#64748B',  // slate - case opened
  INTAKE_FILE:     '#0EA5E9',  // sky - file uploaded
  INTAKE_ID:       '#A855F7',  // purple - ID verified
  INTAKE_CONSENT:  '#EAB308',  // yellow - consent signed
  INTAKE_SUBMIT:   '#10B981',  // green - SUBMITTED (the moneyshot)
  INTAKE_OTHER:    '#475569',

  // system events
  DEPLOY:          '#22C55E',  // green - deploy success
  HEALTH_CHECK:    '#06B6D4',  // cyan - health pulse
  EVELYN:          '#EC4899',  // pink - cleanup agent
  ENRIQUE:         '#F97316',  // orange - alert agent
  AUTONOMOUS:      '#6366F1',  // indigo - autonomous blast
  SYSTEM:          '#94A3B8',
};

// GET /api/calendar/events?start=2026-05-01&end=2026-05-31
router.get('/events', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { start, end } = req.query;
    const startDate = start || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10);
    const endDate = end || new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10);

    const r = await pool.query(`
      SELECT
        DATE(created_at) AS day,
        agent_id,
        commodity,
        direction,
        intent,
        COUNT(*) AS cnt,
        MIN(created_at) AS first_at,
        MAX(created_at) AS last_at
      FROM email_activity_log
      WHERE created_at >= $1::date AND created_at <= ($2::date + INTERVAL '1 day')
      GROUP BY DATE(created_at), agent_id, commodity, direction, intent
      ORDER BY day, agent_id
    `, [startDate, endDate]);

    const events = r.rows.map(row => {
      const agent = row.agent_id || 'OTHER';
      const dirLabel = row.direction === 'inbound' ? 'IN' : (row.direction === 'system' ? 'SYS' : 'OUT');
      const commodity = row.commodity ? row.commodity.toUpperCase() : '';
      const isIntake = String(agent).startsWith('INTAKE_');
      const baseColor = COLOR_MAP[agent] || (row.direction === 'inbound' ? '#0288D1' : '#666');

      // For intake events, show count + agent. For others, show direction + agent + commodity.
      const title = isIntake
        ? `${agent.replace('INTAKE_', '')}: ${row.cnt}`
        : `${dirLabel} ${agent}${commodity ? ' / '+commodity : ''}: ${row.cnt}`;

      return {
        id: `${row.day}-${agent}-${commodity}-${row.direction}`,
        title,
        start: row.day,
        allDay: true,
        backgroundColor: baseColor,
        borderColor: baseColor,
        extendedProps: {
          agent,
          commodity,
          direction: row.direction,
          intent: row.intent,
          count: parseInt(row.cnt),
          firstAt: row.first_at,
          lastAt: row.last_at,
        }
      };
    });
    res.json({ ok: true, events });
  } catch (e) {
    console.error('[calendar/events]', e);
    res.status(500).json({ ok: false, error: e.message, events: [] });
  }
});

// GET /api/calendar/summary - last 30 days agent rollup
router.get('/summary', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const r = await pool.query(`
      SELECT
        agent_id,
        direction,
        COUNT(*) AS total,
        COUNT(DISTINCT contact_email) AS unique_contacts,
        COUNT(DISTINCT commodity) AS commodities,
        MAX(created_at) AS last_activity
      FROM email_activity_log
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY agent_id, direction
      ORDER BY total DESC
    `);
    res.json({ ok: true, summary: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/calendar/today - today only summary (for dashboard tile)
router.get('/today', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const r = await pool.query(`
      SELECT agent_id, direction, COUNT(*) AS cnt
      FROM email_activity_log
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY agent_id, direction
      ORDER BY cnt DESC
    `);
    res.json({ ok: true, today: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/calendar/drill?date=2026-05-04&agent=INTAKE_SUBMIT
router.get('/drill', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { date, agent, commodity, direction } = req.query;
    if (!date) return res.status(400).json({ ok: false, error: 'date required' });

    const conds = ['DATE(created_at) = $1::date'];
    const params = [date];
    if (agent)     { params.push(agent);     conds.push(`agent_id = $${params.length}`); }
    if (commodity) { params.push(commodity); conds.push(`commodity = $${params.length}`); }
    if (direction) { params.push(direction); conds.push(`direction = $${params.length}`); }

    const r = await pool.query(`
      SELECT contact_email, contact_name, contact_type, commodity,
             subject, intent, direction, agent_id, created_at
      FROM email_activity_log
      WHERE ${conds.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 500
    `, params);
    res.json({ ok: true, rows: r.rows, count: r.rows.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/calendar/colors - for frontend legend
router.get('/colors', (req, res) => {
  res.json({ ok: true, colors: COLOR_MAP });
});

module.exports = router;
