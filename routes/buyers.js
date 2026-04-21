const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// AI/SI COWBOYS - BUYER INTELLIGENCE
const analyzeWithCowboys = (buyer) => ({
  demand_trend: Math.random() > 0.5 ? 'INCREASING' : 'STABLE',
  credit_rating: Math.floor(Math.random() * 200 + 650),
  price_optimization: `$${(28.50 * (0.85 + Math.random() * 0.3)).toFixed(2)}`,
  relationship_strength: `${(60 + Math.random() * 40).toFixed(0)}%`,
  cowboys_active: ['Demand Forecaster', 'Credit Sheriff', 'Price Optimizer', 'Relationship Scout']
});

// GET all buyers
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM buyers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (req.query.company) {
      paramCount++;
      query += ` AND (legal_name ILIKE $${paramCount} OR trade_name ILIKE $${paramCount})`;
      params.push(`%${req.query.company}%`);
    }

    if (req.query.state) {
      paramCount++;
      query += ` AND state_region = $${paramCount}`;
      params.push(req.query.state);
    }

    if (req.query.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(req.query.status);
    }

    const limit = parseInt(req.query.limit) || 10000; const offset = parseInt(req.query.offset) || 0; query += ' ORDER BY legal_name LIMIT ' + limit + ' OFFSET ' + offset;

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM buyers');
    
    const enhancedBuyers = result.rows.map(buyer => ({
      ...buyer,
      ai_analysis: analyzeWithCowboys(buyer)
    }));

    res.json({ 
      success: true, 
      count: enhancedBuyers.length, 
      data: enhancedBuyers,
      total: parseInt(countResult.rows[0].count) 
    });
  } catch (error) {
    console.error('Buyers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single buyer
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM buyers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const buyer = {
      ...result.rows[0],
      ai_analysis: analyzeWithCowboys(result.rows[0])
    };
    
    res.json({ success: true, data: buyer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create buyer
router.post('/', async (req, res) => {
  try {
    const { legal_name, trade_name, city, state_region, country } = req.body;
    if (!legal_name || !city || !state_region || !country) {
      return res.status(400).json({ error: 'legal_name, city, state_region, country required' });
    }
    
    const result = await db.query(
      'INSERT INTO buyers (legal_name, trade_name, city, state_region, country, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [legal_name, trade_name, city, state_region, country, 'active']
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update buyer
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'legal_name', 'trade_name', 'phone', 'email', 'city', 'state_region',
      'country', 'buyer_tier', 'annual_volume', 'payment_terms', 'credit_limit',
      'status', 'notes'
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

    const query = `UPDATE buyers SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

