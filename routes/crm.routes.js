// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  AUDITDNA CRM API ROUTES                                                      ║
// ║  Growers + Buyers + Shipper Contacts = 23,380 LEADS                          ║
// ║  "FROM DOWNTOWN... BANG!!!" 🏀                                                ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 NEW: GET ALL CONTACTS (GROWERS + BUYERS + SHIPPERS COMBINED)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/contacts', async (req, res) => {
  try {
    const { limit = 20000, offset = 0, type, temperature, search } = req.query;

    console.log('📡 Loading all contacts...');

    // Query all three tables
    const growers = await db.query(`
      SELECT 
        id,
        legal_name as name,
        trade_name as company,
        primary_contact as contact_name,
        phone_number as phone,
        email,
        country,
        state_region,
        city,
        lead_temperature,
        lead_status,
        lead_score,
        'GROWER' as type,
        created_at,
        updated_at
      FROM growers
      ORDER BY created_at DESC
    `);

    const buyers = await db.query(`
      SELECT 
        id,
        legal_name as name,
        trade_name as company,
        primary_contact as contact_name,
        phone_number as phone,
        email,
        country,
        state_region,
        city,
        lead_temperature,
        lead_status,
        lead_score,
        'BUYER' as type,
        created_at,
        updated_at
      FROM buyers
      ORDER BY created_at DESC
    `);

    const shippers = await db.query(`
      SELECT 
        id,
        name,
        company,
        name as contact_name,
        phone,
        email,
        address_country as country,
        region as state_region,
        address_city as city,
        lead_temperature,
        status as lead_status,
        0 as lead_score,
        'SHIPPER' as type,
        created_at,
        updated_at
      FROM shipper_contacts
      ORDER BY created_at DESC
    `);

    // Combine all contacts
    let allContacts = [
      ...growers.rows,
      ...buyers.rows,
      ...shippers.rows
    ];

    console.log(`✅ Loaded ${allContacts.length} total contacts (Growers: ${growers.rows.length}, Buyers: ${buyers.rows.length}, Shippers: ${shippers.rows.length})`);

    // Apply filters
    if (type) {
      allContacts = allContacts.filter(c => c.type === type.toUpperCase());
    }

    if (temperature) {
      allContacts = allContacts.filter(c => c.lead_temperature === temperature.toUpperCase());
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allContacts = allContacts.filter(c => 
        (c.name && c.name.toLowerCase().includes(searchLower)) ||
        (c.company && c.company.toLowerCase().includes(searchLower)) ||
        (c.email && c.email.toLowerCase().includes(searchLower)) ||
        (c.phone && c.phone.toLowerCase().includes(searchLower))
      );
    }

    // Sort by temperature priority (HOT > WARM > COLD)
    allContacts.sort((a, b) => {
      const tempOrder = { 'HOT': 1, 'WARM': 2, 'COLD': 3 };
      const aTemp = tempOrder[a.lead_temperature] || 4;
      const bTemp = tempOrder[b.lead_temperature] || 4;
      if (aTemp !== bTemp) return aTemp - bTemp;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

    // Apply pagination
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedContacts = allContacts.slice(start, end);

    res.json({
      success: true,
      total: allContacts.length,
      count: paginatedContacts.length,
      data: paginatedContacts,
      breakdown: {
        growers: growers.rows.length,
        buyers: buyers.rows.length,
        shippers: shippers.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GROWERS ROUTES
// ============================================

router.get('/growers', async (req, res) => {
  try {
    const { limit = 20000, offset = 0, country, temperature, status, search } = req.query;

    let query = 'SELECT *, \'GROWER\' as lead_type FROM growers WHERE 1=1';
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
      query += ` AND (legal_name ILIKE $${paramCount} OR trade_name ILIKE $${paramCount} OR city ILIKE $${paramCount} OR primary_contact ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY CASE lead_temperature WHEN 'HOT' THEN 1 WHEN 'WARM' THEN 2 WHEN 'COLD' THEN 3 ELSE 4 END, legal_name ASC`;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM growers');

    res.json({ success: true, count: result.rows.length, total: parseInt(countResult.rows[0].count), data: result.rows });
  } catch (error) {
    console.error('Error fetching growers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/growers/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM growers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Grower not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/growers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedFields = ['lead_temperature', 'lead_status', 'next_follow_up', 'last_contacted_at', 'email_opt_out', 'phone_opt_out', 'do_not_contact', 'opt_out_reason', 'assigned_to', 'lead_score'];

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

    if (setClause.length === 0) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    setClause.push(`updated_at = NOW()`);
    paramNum++;
    values.push(id);

    const query = `UPDATE growers SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Grower not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BUYERS ROUTES
// ============================================

router.get('/buyers', async (req, res) => {
  try {
    const { limit = 20000, offset = 0, country, state_region, temperature, status, buyer_type, search } = req.query;

    let query = 'SELECT *, \'BUYER\' as lead_type FROM buyers WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (country) { paramCount++; query += ` AND country = $${paramCount}`; params.push(country); }
    if (state_region) { paramCount++; query += ` AND state_region = $${paramCount}`; params.push(state_region); }
    if (temperature) { paramCount++; query += ` AND lead_temperature = $${paramCount}`; params.push(temperature); }
    if (status) { paramCount++; query += ` AND lead_status = $${paramCount}`; params.push(status); }
    if (buyer_type) { paramCount++; query += ` AND buyer_type = $${paramCount}`; params.push(buyer_type); }
    if (search) {
      paramCount++;
      query += ` AND (legal_name ILIKE $${paramCount} OR trade_name ILIKE $${paramCount} OR city ILIKE $${paramCount} OR primary_contact ILIKE $${paramCount} OR paca_license ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY CASE lead_temperature WHEN 'HOT' THEN 1 WHEN 'WARM' THEN 2 WHEN 'COLD' THEN 3 ELSE 4 END, legal_name ASC`;
    paramCount++; query += ` LIMIT $${paramCount}`; params.push(parseInt(limit));
    paramCount++; query += ` OFFSET $${paramCount}`; params.push(parseInt(offset));

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM buyers');

    res.json({ success: true, count: result.rows.length, total: parseInt(countResult.rows[0].count), data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/buyers/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM buyers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Buyer not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/buyers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedFields = ['lead_temperature', 'lead_status', 'next_follow_up', 'last_contacted_at', 'email_opt_out', 'phone_opt_out', 'do_not_contact', 'opt_out_reason', 'assigned_to', 'lead_score'];

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

    if (setClause.length === 0) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    setClause.push(`updated_at = NOW()`);
    paramNum++;
    values.push(id);

    const query = `UPDATE buyers SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Buyer not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SHIPPER CONTACTS ROUTES (15,379 contacts)
// ============================================

router.get('/shippers', async (req, res) => {
  try {
    const { limit = 20000, offset = 0, region, temperature, source, search } = req.query;

    let query = 'SELECT *, \'SHIPPER\' as lead_type FROM shipper_contacts WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (region) { paramCount++; query += ` AND region = $${paramCount}`; params.push(region); }
    if (temperature) { paramCount++; query += ` AND lead_temperature = $${paramCount}`; params.push(temperature); }
    if (source) { paramCount++; query += ` AND source = $${paramCount}`; params.push(source); }
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR company ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY CASE lead_temperature WHEN 'HOT' THEN 1 WHEN 'WARM' THEN 2 WHEN 'COLD' THEN 3 ELSE 4 END, company ASC`;
    paramCount++; query += ` LIMIT $${paramCount}`; params.push(parseInt(limit));
    paramCount++; query += ` OFFSET $${paramCount}`; params.push(parseInt(offset));

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM shipper_contacts');

    res.json({ success: true, count: result.rows.length, total: parseInt(countResult.rows[0].count), data: result.rows });
  } catch (error) {
    console.error('Error fetching shippers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/shippers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedFields = ['lead_temperature', 'lead_status', 'status', 'priority'];

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

    if (setClause.length === 0) return res.status(400).json({ success: false, error: 'No valid fields' });

    setClause.push(`updated_at = NOW()`);
    paramNum++;
    values.push(id);

    const query = `UPDATE shipper_contacts SET ${setClause.join(', ')} WHERE id = $${paramNum} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CRM STATISTICS - ALL 23,380 LEADS
// ============================================

router.get('/stats', async (req, res) => {
  try {
    // Grower stats
    const growerStats = await db.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE lead_temperature = 'HOT') as hot,
        COUNT(*) FILTER (WHERE lead_temperature = 'WARM') as warm,
        COUNT(*) FILTER (WHERE lead_temperature = 'COLD') as cold
      FROM growers
    `);

    // Buyer stats
    const buyerStats = await db.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE lead_temperature = 'HOT') as hot,
        COUNT(*) FILTER (WHERE lead_temperature = 'WARM') as warm,
        COUNT(*) FILTER (WHERE lead_temperature = 'COLD') as cold
      FROM buyers
    `);

    // Shipper stats
    const shipperStats = await db.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE lead_temperature = 'HOT') as hot,
        COUNT(*) FILTER (WHERE lead_temperature = 'WARM') as warm,
        COUNT(*) FILTER (WHERE lead_temperature = 'COLD') as cold
      FROM shipper_contacts
    `);

    // By country (growers + buyers)
    const byCountry = await db.query(`
      SELECT country, COUNT(*) as count FROM (
        SELECT country FROM growers
        UNION ALL SELECT country FROM buyers
        UNION ALL SELECT address_country as country FROM shipper_contacts
      ) combined
      GROUP BY country ORDER BY count DESC LIMIT 15
    `);

    // By source (shippers)
    const bySource = await db.query(`
      SELECT source, COUNT(*) as count FROM shipper_contacts
      GROUP BY source ORDER BY count DESC
    `);

    // Calculate totals
    const gTotal = parseInt(growerStats.rows[0].total) || 0;
    const bTotal = parseInt(buyerStats.rows[0].total) || 0;
    const sTotal = parseInt(shipperStats.rows[0].total) || 0;
    const grandTotal = gTotal + bTotal + sTotal;

    const hotTotal = (parseInt(growerStats.rows[0].hot) || 0) + (parseInt(buyerStats.rows[0].hot) || 0) + (parseInt(shipperStats.rows[0].hot) || 0);
    const warmTotal = (parseInt(growerStats.rows[0].warm) || 0) + (parseInt(buyerStats.rows[0].warm) || 0) + (parseInt(shipperStats.rows[0].warm) || 0);
    const coldTotal = (parseInt(growerStats.rows[0].cold) || 0) + (parseInt(buyerStats.rows[0].cold) || 0) + (parseInt(shipperStats.rows[0].cold) || 0);

    res.json({
      success: true,
      data: {
        growers: growerStats.rows[0],
        buyers: buyerStats.rows[0],
        shippers: shipperStats.rows[0],
        byCountry: byCountry.rows,
        bySource: bySource.rows,
        total: grandTotal,
        totalHot: hotTotal,
        totalWarm: warmTotal,
        totalCold: coldTotal,
        breakdown: {
          growers: gTotal,
          buyers: bTotal,
          shippers: sTotal
        }
      }
    });
  } catch (error) {
    console.error('Error fetching CRM stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HOT LEADS - ALL SOURCES
// ============================================

router.get('/hot-leads', async (req, res) => {
  try {
    const growerHot = await db.query(`SELECT *, 'GROWER' as lead_type FROM growers WHERE lead_temperature = 'HOT' AND (do_not_contact IS NULL OR do_not_contact = false) ORDER BY updated_at DESC LIMIT 20`);
    const buyerHot = await db.query(`SELECT *, 'BUYER' as lead_type FROM buyers WHERE lead_temperature = 'HOT' AND (do_not_contact IS NULL OR do_not_contact = false) ORDER BY updated_at DESC LIMIT 20`);
    const shipperHot = await db.query(`SELECT *, 'SHIPPER' as lead_type FROM shipper_contacts WHERE lead_temperature = 'HOT' ORDER BY updated_at DESC LIMIT 20`);

    const combined = [...growerHot.rows, ...buyerHot.rows, ...shipperHot.rows]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 50);

    res.json({ success: true, count: combined.length, data: combined });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ACTIVITY LOG
// ============================================

router.post('/activity', async (req, res) => {
  try {
    const { lead_type, lead_id, activity_type, subject, description, outcome } = req.body;
    console.log('CRM Activity:', { lead_type, lead_id, activity_type, subject, description, outcome });
    
    let table = 'growers';
    if (lead_type === 'BUYER') table = 'buyers';
    if (lead_type === 'SHIPPER') table = 'shipper_contacts';
    
    await db.query(`UPDATE ${table} SET updated_at = NOW() WHERE id = $1`, [lead_id]);
    
    res.json({ success: true, message: 'Activity logged' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;