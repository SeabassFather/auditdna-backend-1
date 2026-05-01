// C:\AuditDNA\backend\routes\pin-verify.js
// Sprint C P4 - PIN verification endpoint for DealFloor PIN gate
// Mount: app.use('/api/auth', require('./routes/pin-verify'));
//
// POST /api/auth/pin-verify
//   body: { pin, name, role: 'customer'|'partner'|'staff', module: 'dealfloor' }
//   returns: { success, token, user, expires_in }
//
// Path 1: pin matches auth_users.pin -> staff/owner JWT (full scope)
// Path 2: customer/partner -> limited-scope JWT (intake:upload + documents:view_own)
// Every attempt audited to customer_access_log table (auto-created if missing)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'auditdna-grower-jwt-dev';
const PIN_TOKEN_TTL = '12h';

function getPool(req) {
  if (req.app && req.app.locals && req.app.locals.pool) return req.app.locals.pool;
  if (pool) return pool;
  throw new Error('database pool not available');
}

async function ensureAuditTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_access_log (
      id SERIAL PRIMARY KEY,
      access_name TEXT NOT NULL,
      access_role TEXT NOT NULL,
      access_module TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success BOOLEAN DEFAULT TRUE,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customer_access_log_name ON customer_access_log(access_name)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customer_access_log_created ON customer_access_log(created_at DESC)`);
}

router.post('/pin-verify', async (req, res) => {
  let pool;
  try {
    pool = getPool(req);
    await ensureAuditTable(pool);
  } catch (e) {
    console.error('[PIN-VERIFY] db setup:', e.message);
    return res.status(500).json({ success: false, error: 'database unavailable' });
  }

  try {
    const { pin, name, role, module: mod } = req.body || {};
    if (!pin || pin.length < 4) {
      return res.status(400).json({ success: false, error: 'PIN must be at least 4 characters' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'name required' });
    }

    const ip = req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || '';
    const ua = req.headers['user-agent'] || '';
    const cleanName = name.trim();
    const reqRole = (role || 'customer').toLowerCase();
    const moduleId = (mod || 'dealfloor').toLowerCase();

    // Path 1: staff PIN match in auth_users
    let staffUser = null;
    try {
      const r = await pool.query(
        'SELECT id, username, role, pin FROM auth_users WHERE pin = $1 LIMIT 1',
        [pin]
      );
      if (r.rows.length > 0) staffUser = r.rows[0];
    } catch (e) { /* schema may differ - fall through to customer path */ }

    let userPayload, reasonTag;
    if (staffUser) {
      userPayload = {
        userId: staffUser.id,
        username: staffUser.username,
        role: staffUser.role || 'staff',
        name: cleanName,
        module: moduleId,
        scope: ['*']
      };
      reasonTag = 'staff_pin_match';
    } else {
      // Path 2: customer / partner - limited scope
      userPayload = {
        userId: null,
        username: cleanName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        role: reqRole === 'partner' ? 'partner' : 'customer',
        name: cleanName,
        module: moduleId,
        scope: ['intake:upload', 'documents:view_own', 'deals:view_own']
      };
      reasonTag = `${userPayload.role}_pin_logged`;
    }

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: PIN_TOKEN_TTL });

    // Audit (best-effort - never block on log failure)
    try {
      await pool.query(
        `INSERT INTO customer_access_log (access_name, access_role, access_module, ip_address, user_agent, success, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [cleanName, userPayload.role, moduleId, ip, ua, true, reasonTag]
      );
    } catch (e) { console.warn('[PIN-VERIFY] audit log failed:', e.message); }

    console.log(`[PIN-VERIFY] OK ${userPayload.role} ${cleanName} module=${moduleId} reason=${reasonTag}`);
    return res.json({
      success: true,
      token,
      user: { name: userPayload.name, role: userPayload.role, module: userPayload.module, scope: userPayload.scope },
      expires_in: PIN_TOKEN_TTL
    });
  } catch (e) {
    console.error('[PIN-VERIFY] error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/pin-verify/health', (req, res) => res.json({ ok: true, route: 'pin-verify' }));

router.get('/pin-verify/log', async (req, res) => {
  let pool;
  try { pool = getPool(req); } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'auth required' });
  try {
    const tok = auth.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(tok, JWT_SECRET);
    if (!decoded.scope || !decoded.scope.includes('*')) {
      return res.status(403).json({ error: 'staff scope required' });
    }
    const r = await pool.query('SELECT * FROM customer_access_log ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, count: r.rows.length, log: r.rows });
  } catch (e) { res.status(401).json({ error: 'invalid token' }); }
});

module.exports = router;
