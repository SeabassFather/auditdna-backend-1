// ═══════════════════════════════════════════════════════════════
// TENANT MANAGEMENT ROUTES
// Admin API for creating and managing tenants
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Assuming you have a database pool configured
// const pool = require('../config/database');

// ═══════════════════════════════════════════════════════════════
// ADMIN ONLY - Get all tenants
// ═══════════════════════════════════════════════════════════════
router.get('/tenants', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT 
        t.*,
        COUNT(DISTINCT tu.id) as user_count,
        COUNT(DISTINCT tm.id) as module_count
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      LEFT JOIN tenant_modules tm ON t.id = tm.tenant_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Error fetching tenants' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ONLY - Create new tenant
// ═══════════════════════════════════════════════════════════════
router.post('/tenants', async (req, res) => {
  const {
    name,
    subdomain,
    company_name,
    industry,
    plan = 'starter',
    monthly_fee,
    admin_email,
    admin_password,
    admin_first_name,
    admin_last_name,
    modules = ['SII-MX']
  } = req.body;

  const client = await req.app.locals.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create tenant
    const { rows: [tenant] } = await client.query(`
      INSERT INTO tenants (name, subdomain, company_name, industry, plan, monthly_fee, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, subdomain, company_name, industry, plan, monthly_fee || 299, 'trial']);

    // 2. Create admin user
    const passwordHash = await bcrypt.hash(admin_password, 10);
    await client.query(`
      INSERT INTO tenant_users (tenant_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tenant.id, admin_email, passwordHash, admin_first_name, admin_last_name, 'admin']);

    // 3. Enable modules
    for (const module of modules) {
      await client.query(`
        INSERT INTO tenant_modules (tenant_id, module_name, enabled)
        VALUES ($1, $2, TRUE)
      `, [tenant.id, module]);
    }

    // 4. Create welcome invoice
    const invoiceNumber = `INV-${Date.now()}`;
    await client.query(`
      INSERT INTO tenant_invoices (
        tenant_id, invoice_number, amount, due_date, 
        period_start, period_end, status
      )
      VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '30 days', 
              CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'pending')
    `, [tenant.id, invoiceNumber, monthly_fee || 299]);

    await client.query('COMMIT');

    res.status(201).json({
      tenant,
      message: 'Tenant created successfully',
      access_url: `https://${subdomain}.auditdna.com`,
      admin_email: admin_email
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tenant:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Subdomain already exists' });
    } else {
      res.status(500).json({ error: 'Error creating tenant' });
    }
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ONLY - Get tenant details
// ═══════════════════════════════════════════════════════════════
router.get('/tenants/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = t.id) as user_count,
        (SELECT COUNT(*) FROM tenant_modules WHERE tenant_id = t.id AND enabled = TRUE) as module_count,
        (SELECT COUNT(*) FROM sii_contratos WHERE tenant_id = t.id AND estatus = 'activo') as active_contracts,
        (SELECT SUM(precio_total) FROM sii_contratos WHERE tenant_id = t.id AND estatus = 'activo') as total_revenue
      FROM tenants t
      WHERE t.id = $1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Error fetching tenant details' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ONLY - Update tenant
// ═══════════════════════════════════════════════════════════════
router.put('/tenants/:id', async (req, res) => {
  const { name, company_name, plan, monthly_fee, status, settings } = req.body;

  try {
    const { rows } = await req.app.locals.pool.query(`
      UPDATE tenants
      SET name = COALESCE($1, name),
          company_name = COALESCE($2, company_name),
          plan = COALESCE($3, plan),
          monthly_fee = COALESCE($4, monthly_fee),
          status = COALESCE($5, status),
          settings = COALESCE($6, settings),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [name, company_name, plan, monthly_fee, status, settings, req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Error updating tenant' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ONLY - Delete tenant (soft delete by setting status)
// ═══════════════════════════════════════════════════════════════
router.delete('/tenants/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query(`
      UPDATE tenants SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    res.json({ message: 'Tenant cancelled successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Error deleting tenant' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TENANT USERS - Get users for a tenant
// ═══════════════════════════════════════════════════════════════
router.get('/tenants/:id/users', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT id, tenant_id, email, first_name, last_name, role, is_active, last_login, created_at
      FROM tenant_users
      WHERE tenant_id = $1
      ORDER BY role, created_at
    `, [req.params.id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TENANT USERS - Create new user
// ═══════════════════════════════════════════════════════════════
router.post('/tenants/:id/users', async (req, res) => {
  const { email, password, first_name, last_name, role = 'user' } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await req.app.locals.pool.query(`
      INSERT INTO tenant_users (tenant_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id, email, first_name, last_name, role, created_at
    `, [req.params.id, email, passwordHash, first_name, last_name, role]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ error: 'Email already exists for this tenant' });
    } else {
      res.status(500).json({ error: 'Error creating user' });
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// TENANT MODULES - Get enabled modules
// ═══════════════════════════════════════════════════════════════
router.get('/tenants/:id/modules', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT * FROM tenant_modules
      WHERE tenant_id = $1
      ORDER BY module_name
    `, [req.params.id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Error fetching modules' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TENANT MODULES - Enable/disable module
// ═══════════════════════════════════════════════════════════════
router.put('/tenants/:id/modules/:moduleName', async (req, res) => {
  const { enabled } = req.body;

  try {
    const { rows } = await req.app.locals.pool.query(`
      INSERT INTO tenant_modules (tenant_id, module_name, enabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id, module_name) 
      DO UPDATE SET enabled = $3
      RETURNING *
    `, [req.params.id, req.params.moduleName, enabled]);

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating module:', error);
    res.status(500).json({ error: 'Error updating module' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TENANT USAGE - Get usage metrics
// ═══════════════════════════════════════════════════════════════
router.get('/tenants/:id/usage', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT metric, SUM(value) as total, DATE_TRUNC('month', month) as month
      FROM tenant_usage
      WHERE tenant_id = $1
      GROUP BY metric, DATE_TRUNC('month', month)
      ORDER BY month DESC, metric
    `, [req.params.id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Error fetching usage' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TENANT INVOICES - Get billing history
// ═══════════════════════════════════════════════════════════════
router.get('/tenants/:id/invoices', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT * FROM tenant_invoices
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
});

module.exports = router;