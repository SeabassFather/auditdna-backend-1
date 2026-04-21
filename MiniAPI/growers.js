const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET all growers
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM growers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (req.query.country) {
      paramCount++;
      query += ` AND country = $${paramCount}`;
      params.push(req.query.country);
    }

    if (req.query.commodity) {
      paramCount++;
      query += ` AND certifications::text ILIKE $${paramCount}`;
      params.push(`%${req.query.commodity}%`);
    }

    if (req.query.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(req.query.status);
    }

    query += ' ORDER BY legal_name LIMIT 10000';

    const result = await db.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Growers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single grower
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM growers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create grower
router.post('/', async (req, res) => {
  try {
    const { grower_code, legal_name, country } = req.body;
    if (!grower_code || !legal_name || !country) {
      return res.status(400).json({ error: 'grower_code, legal_name, country required' });
    }
    const result = await db.query(
      `INSERT INTO growers (grower_code, legal_name, country) VALUES ($1, $2, $3) RETURNING *`,
      [grower_code, legal_name, country]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update grower
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'lead_temperature', 'lead_status', 'next_follow_up', 'last_contacted_at',
      'email_opt_out', 'phone_opt_out', 'do_not_contact', 'opt_out_reason',
      'assigned_to', 'lead_score', 'status', 'compliance_status'
    ];

    const setClause = [];
    const values = [];
    let paramNum = 0;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        paramNum++;
        setClause.push(`${key} = $${paramNum}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClause.push(`updated_at = NOW()`);
    paramNum++;
    values.push(id);

    const query = `UPDATE growers SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grower not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

