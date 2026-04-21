// =============================================================================
// CRM CONTACTS ROUTE - ZADARMA CRM MODULE
// =============================================================================
// Fetches 27K+ contacts from PostgreSQL
// Endpoint: /api/crm/contacts
// =============================================================================

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// POSTGRESQL CONNECTION
const pool = new Pool({
  host: 'process.env.DB_HOST',
  port: 5432,
  database: 'auditdna',
  user: 'postgres',
  password: 'postgres'
});

console.log('âœ… [CRM] PostgreSQL pool ready');

// GET ALL CONTACTS
router.get('/contacts', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, external_id, first_name, last_name,
        COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email) AS name,
        company, phone, mobile, email, 
        position, department, category, tags, notes,
        source, status, 
        last_call_at, total_calls, total_duration_seconds,
        created_at, updated_at
      FROM zadarma_contacts
    `;

    const params = [];

    // SEARCH FILTER
    if (search) {
      query += ` WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR company ILIKE $1 OR mobile ILIKE $1`;
      params.push(`%${search}%`);
    }

    // ORDER AND PAGINATION
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await global.db.query(query, params);

    // GET TOTAL COUNT
    let countQuery = 'SELECT COUNT(*) FROM zadarma_contacts';
    if (search) {
      countQuery += ` WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR company ILIKE $1 OR mobile ILIKE $1`;
    }
    const countResult = await global.db.query(countQuery, search ? [`%${search}%`] : []);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      contacts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('[CRM] Error fetching contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET CONTACT BY ID
router.get('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await global.db.query('SELECT * FROM zadarma_contacts WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[CRM] Error fetching contact:', err);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// CREATE CONTACT
router.post('/contacts', async (req, res) => {
  try {
    const { first_name, last_name, company, phone, mobile, email, position, department, category, tags, notes, source, status } = req.body;

    const result = await global.db.query(
      `INSERT INTO zadarma_contacts 
       (first_name, last_name, company, phone, mobile, email, position, department, category, tags, notes, source, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING *, COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email) AS name`,
      [first_name, last_name, company, phone, mobile, email, position, department, category, tags, notes, source, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[CRM] Error creating contact:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// UPDATE CONTACT
router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, company, phone, mobile, email, position, department, category, tags, notes, source, status } = req.body;

    const result = await global.db.query(
      `UPDATE zadarma_contacts 
       SET first_name = $1, last_name = $2, company = $3, phone = $4, 
           mobile = $5, email = $6, position = $7, department = $8, 
           category = $9, tags = $10, notes = $11, source = $12, status = $13, updated_at = NOW()
       WHERE id = $14
       RETURNING *, COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email) AS name`,
      [first_name, last_name, company, phone, mobile, email, position, department, category, tags, notes, source, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[CRM] Error updating contact:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE CONTACT
router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await global.db.query('DELETE FROM zadarma_contacts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    console.error('[CRM] Error deleting contact:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

module.exports = router;

