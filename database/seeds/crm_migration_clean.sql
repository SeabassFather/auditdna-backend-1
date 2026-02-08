// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  AUDITDNA CRM API ROUTES                                                      ║
// ║  Growers + Buyers + Lead Management                                           ║
// ║  "FROM DOWNTOWN... BANG!!!" 🏀                                                ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// ============================================
// GROWERS ROUTES
// ============================================

// GET all growers with pagination and filters
router.get('/growers', async (req, res) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      country, 
      temperature,
      status,
      search 
    } = req.query;

    let query = 'SELECT * FROM growers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (country) {
      paramCount++;
      query += ` AND country = $${paramCount}`;
      params.push(country);
    }

    if (temperature) {
      paramCount++;
      query += ` AND lead_temperature = $${paramCount}`;
      params.push(temperature);
    }

    if (status) {
      paramCount++;
      query += ` AND lead_status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (
        legal_name ILIKE $${paramCount} OR 
        trade_name ILIKE $${paramCount} OR 
        city ILIKE $${paramCount} OR
        primary_contact ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY 
      CASE lead_temperature 
        WHEN 'HOT' THEN 1 
        WHEN 'WARM' THEN 2 
        WHEN 'COLD' THEN 3 
        ELSE 4 
      END,
      legal_name ASC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM growers WHERE 1=1';
    const countParams = [];
    let countParamNum = 0;

    if (country) {
      countParamNum++;
      countQuery += ` AND country = $${countParamNum}`;
      countParams.push(country);
    }
    if (temperature) {
      countParamNum++;
      countQuery += ` AND lead_temperature = $${countParamNum}`;
      countParams.push(temperature);
    }
    if (status) {
      countParamNum++;
      countQuery += ` AND lead_status = $${countParamNum}`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({ 
      success: true, 
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching growers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single grower
router.get('/growers/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM growers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grower not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH grower (update temperature, status, etc.)
router.patch('/growers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'lead_temperature', 'lead_status', 'next_follow_up', 'last_contacted_at',
      'email_opt_out', 'phone_opt_out', 'do_not_contact', 'opt_out_reason',
      'assigned_to', 'lead_score'
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
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    paramNum++;
    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE growers SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grower not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating grower:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BUYERS ROUTES
// ============================================

// GET all buyers with pagination and filters
router.get('/buyers', async (req, res) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      country,
      state_region,
      temperature,
      status,
      buyer_type,
      search 
    } = req.query;

    let query = 'SELECT * FROM buyers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (country) {
      paramCount++;
      query += ` AND country = $${paramCount}`;
      params.push(country);
    }

    if (state_region) {
      paramCount++;
      query += ` AND state_region = $${paramCount}`;
      params.push(state_region);
    }

    if (temperature) {
      paramCount++;
      query += ` AND lead_temperature = $${paramCount}`;
      params.push(temperature);
    }

    if (status) {
      paramCount++;
      query += ` AND lead_status = $${paramCount}`;
      params.push(status);
    }

    if (buyer_type) {
      paramCount++;
      query += ` AND buyer_type = $${paramCount}`;
      params.push(buyer_type);
    }

    if (search) {
      paramCount++;
      query += ` AND (
        legal_name ILIKE $${paramCount} OR 
        trade_name ILIKE $${paramCount} OR 
        city ILIKE $${paramCount} OR
        primary_contact ILIKE $${paramCount} OR
        paca_license ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY 
      CASE lead_temperature 
        WHEN 'HOT' THEN 1 
        WHEN 'WARM' THEN 2 
        WHEN 'COLD' THEN 3 
        ELSE 4 
      END,
      legal_name ASC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(query, params);
    
    // Get total count
    const countResult = await db.query('SELECT COUNT(*) FROM buyers');

    res.json({ 
      success: true, 
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching buyers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single buyer
router.get('/buyers/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM buyers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Buyer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH buyer (update temperature, status, etc.)
router.patch('/buyers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'lead_temperature', 'lead_status', 'next_follow_up', 'last_contacted_at',
      'email_opt_out', 'phone_opt_out', 'do_not_contact', 'opt_out_reason',
      'assigned_to', 'lead_score'
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
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    paramNum++;
    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE buyers SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Buyer not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating buyer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CRM STATISTICS
// ============================================

router.get('/crm/stats', async (req, res) => {
  try {
    // Grower stats
    const growerStats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE lead_temperature = 'HOT') as hot,
        COUNT(*) FILTER (WHERE lead_temperature = 'WARM') as warm,
        COUNT(*) FILTER (WHERE lead_temperature = 'COLD') as cold,
        COUNT(*) FILTER (WHERE do_not_contact = true) as opted_out
      FROM growers
    `);

    // Buyer stats
    const buyerStats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE lead_temperature = 'HOT') as hot,
        COUNT(*) FILTER (WHERE lead_temperature = 'WARM') as warm,
        COUNT(*) FILTER (WHERE lead_temperature = 'COLD') as cold,
        COUNT(*) FILTER (WHERE do_not_contact = true) as opted_out
      FROM buyers
    `);

    // By country
    const byCountry = await db.query(`
      SELECT country, COUNT(*) as count FROM (
        SELECT country FROM growers
        UNION ALL
        SELECT country FROM buyers
      ) combined
      GROUP BY country
      ORDER BY count DESC
    `);

    // By status
    const byStatus = await db.query(`
      SELECT lead_status, COUNT(*) as count FROM (
        SELECT COALESCE(lead_status, 'NEW') as lead_status FROM growers
        UNION ALL
        SELECT COALESCE(lead_status, 'NEW') as lead_status FROM buyers
      ) combined
      GROUP BY lead_status
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        growers: growerStats.rows[0],
        buyers: buyerStats.rows[0],
        byCountry: byCountry.rows,
        byStatus: byStatus.rows,
        total: parseInt(growerStats.rows[0].total) + parseInt(buyerStats.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching CRM stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FOLLOW-UPS DUE TODAY
// ============================================

router.get('/crm/follow-ups', async (req, res) => {
  try {
    const growerFollowUps = await db.query(`
      SELECT *, 'GROWER' as lead_type FROM growers 
      WHERE next_follow_up <= CURRENT_DATE 
        AND do_not_contact = false
      ORDER BY next_follow_up ASC
      LIMIT 50
    `);

    const buyerFollowUps = await db.query(`
      SELECT *, 'BUYER' as lead_type FROM buyers 
      WHERE next_follow_up <= CURRENT_DATE 
        AND do_not_contact = false
      ORDER BY next_follow_up ASC
      LIMIT 50
    `);

    const combined = [...growerFollowUps.rows, ...buyerFollowUps.rows]
      .sort((a, b) => new Date(a.next_follow_up) - new Date(b.next_follow_up));

    res.json({
      success: true,
      count: combined.length,
      data: combined
    });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HOT LEADS
// ============================================

router.get('/crm/hot-leads', async (req, res) => {
  try {
    const growerHot = await db.query(`
      SELECT *, 'GROWER' as lead_type FROM growers 
      WHERE lead_temperature = 'HOT' 
        AND do_not_contact = false
      ORDER BY updated_at DESC
      LIMIT 25
    `);

    const buyerHot = await db.query(`
      SELECT *, 'BUYER' as lead_type FROM buyers 
      WHERE lead_temperature = 'HOT' 
        AND do_not_contact = false
      ORDER BY updated_at DESC
      LIMIT 25
    `);

    const combined = [...growerHot.rows, ...buyerHot.rows]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 50);

    res.json({
      success: true,
      count: combined.length,
      data: combined
    });
  } catch (error) {
    console.error('Error fetching hot leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ACTIVITY LOG (for future use)
// ============================================

router.post('/crm/activity', async (req, res) => {
  try {
    const { lead_type, lead_id, activity_type, subject, description, outcome } = req.body;
    
    // For now, just log it. In production, save to crm_activities table
    console.log('CRM Activity:', { lead_type, lead_id, activity_type, subject, description, outcome });
    
    // Update last_contacted_at on the lead
    const table = lead_type === 'GROWER' ? 'growers' : 'buyers';
    await db.query(
      `UPDATE ${table} SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [lead_id]
    );
    
    res.json({ success: true, message: 'Activity logged' });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;