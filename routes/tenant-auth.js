// ----------------------------------------------------------------------------
// TENANT AUTH ROUTE — C:\AuditDNA\backend\routes\tenant-auth.js
// ----------------------------------------------------------------------------
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');

// POST /api/auth/tenant-login
router.post('/tenant-login', async (req, res) => {
  try {
    const { email, password, tenant_id } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT * FROM auth_users WHERE email = $1 AND status = $2 LIMIT 1',
      [email.toLowerCase().trim(), 'active']
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const bcrypt = require('bcryptjs');
    const valid  = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenant_id: tenant_id || null },
      process.env.JWT_SECRET || 'auditdna-secret',
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (e) {
    console.error('[TENANT-AUTH] Login error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/tenant-verify
router.post('/tenant-verify', (req, res) => {
  try {
    const auth  = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return res.status(401).json({ valid: false });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'auditdna-secret');
    res.json({ valid: true, user: decoded });
  } catch (e) {
    res.status(401).json({ valid: false, error: e.message });
  }
});

module.exports = router;
