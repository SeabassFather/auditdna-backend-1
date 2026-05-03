// File: C:\AuditDNA\backend\routes\calendar.routes.js
'use strict';
const express = require('express');
const router = express.Router();

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
        COUNT(*) AS cnt,
        MIN(created_at) AS first_at,
        MAX(created_at) AS last_at
      FROM email_activity_log
      WHERE created_at >= $1::date AND created_at <= ($2::date + INTERVAL '1 day')
      GROUP BY DATE(created_at), agent_id, commodity, direction
      ORDER BY day, agent_id
    `, [startDate, endDate]);

    const colorMap = {
      AVOCADO: '#0F7B41', BUYER_OUTREACH: '#C9A55C', GROWER_TENDER: '#1E3A5F',
      LOGISTICS: '#8B4513', FOOD_SAFETY: '#2E7D32', FINANCE: '#9C27B0',
      MARKET_INTEL: '#0277BD', PRODUCTION_REPORT: '#5D4037',
      SOURCING_BLAST: '#D84315', INBOX_SORTER: '#0288D1'
    };

    const events = r.rows.map(row => {
      const agent = row.agent_id || 'OTHER';
      const dirLabel = row.direction === 'inbound' ? 'IN' : 'OUT';
      const commodity = row.commodity ? row.commodity.toUpperCase() : '';
      return {
        id: `${row.day}-${agent}-${commodity}-${row.direction}`,
        title: `${dirLabel} ${agent}${commodity ? ' / '+commodity : ''}: ${row.cnt}`,
        start: row.day,
        allDay: true,
        backgroundColor: row.direction === 'inbound' ? '#0288D1' : (colorMap[agent] || '#666'),
        borderColor: row.direction === 'inbound' ? '#01579B' : (colorMap[agent] || '#444'),
        extendedProps: {
          agent, commodity, direction: row.direction, count: parseInt(row.cnt),
          firstAt: row.first_at, lastAt: row.last_at
        }
      };
    });
    res.json({ ok: true, events });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, events: [] });
  }
});

// GET /api/calendar/summary - last 30 days
router.get('/summary', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const r = await pool.query(`
      SELECT
        agent_id, direction, COUNT(*) AS total,
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

// GET /api/calendar/drill?date=2026-05-03&agent=SOURCING_BLAST&commodity=tomato
router.get('/drill', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { date, agent, commodity, direction } = req.query;
    if (!date) return res.status(400).json({ ok: false, error: 'date required' });

    const conds = ['DATE(created_at) = $1::date'];
    const params = [date];
    if (agent) { params.push(agent); conds.push(`agent_id = $${params.length}`); }
    if (commodity) { params.push(commodity); conds.push(`commodity = $${params.length}`); }
    if (direction) { params.push(direction); conds.push(`direction = $${params.length}`); }

    const r = await pool.query(`
      SELECT contact_email, contact_name, contact_type, commodity, subject, intent, direction, created_at
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

module.exports = router;