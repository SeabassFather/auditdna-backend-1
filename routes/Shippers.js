const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET all shippers - 15,379 from shipper_contacts
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM shipper_contacts WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (req.query.company) {
      paramCount++;
      query += ` AND company ILIKE $${paramCount}`;
      params.push(`%${req.query.company}%`);
    }
    if (req.query.state) {
      paramCount++;
      query += ` AND state = $${paramCount}`;
      params.push(req.query.state);
    }
    if (req.query.source) {
      paramCount++;
      query += ` AND source = $${paramCount}`;
      params.push(req.query.source);
    }
    if (req.query.temperature) {
      paramCount++;
      query += ` AND lead_temperature = $${paramCount}`;
      params.push(req.query.temperature);
    }

    const limit = parseInt(req.query.limit) || 99999;
    const offset = parseInt(req.query.offset) || 0;
    query += ` ORDER BY company LIMIT ${limit} OFFSET ${offset}`;

    console.log('Fetching shippers from shipper_contacts table');
    const result = await global.db.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Shippers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single shipper
router.get('/:id', async (req, res) => {
  try {
    const result = await global.db.query('SELECT * FROM shipper_contacts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shipper not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create shipper
router.post('/', async (req, res) => {
  try {
    const { company, contact, email, phone } = req.body;
    if (!company) return res.status(400).json({ error: 'company required' });
    const result = await global.db.query(
      `INSERT INTO shipper_contacts (company, contact, email, phone, source) VALUES ($1,$2,$3,$4,'Manual Entry') RETURNING *`,
      [company, contact, email, phone]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update shipper
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['company','contact','email','phone','state','city','lead_temperature','lead_status','notes','source'];
    const setClause = [];
    const values = [];
    let paramNum = 0;
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        paramNum++;
        setClause.push(`${key} = $${paramNum}`);
        values.push(value);
      }
    }
    if (setClause.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    setClause.push(`updated_at = NOW()`);
    paramNum++;
    values.push(id);
    const result = await global.db.query(
      `UPDATE shipper_contacts SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shipper not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

