'use strict';

// ============================================
// AUTH ROUTES — 3-FIELD OWNER PORTAL
// POST  /api/auth/login       { password, accessCode, pin } → JWT
// POST  /api/auth/verify-pin  Bearer + { pin } → { valid }
// GET   /api/auth/verify      Bearer <token> → { valid, user }
// GET   /api/auth/health      → { ok, db }
// ============================================

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const router = express.Router();

// Resilient pool resolver — works whether db.js exports a function,
// an object with getPool, or pool is set by server.js.
function resolvePool() {
  if (typeof pool !== 'undefined' && pool) return pool;
  try {
    const dbModule = require('../db');
    const getPool = dbModule.getPool || dbModule;
    if (typeof getPool === 'function') return getPool();
    if (dbModule && dbModule.query) return dbModule;
  } catch (_) {}
  return global.db || null;
}

// Handles BOTH bcrypt-hashed ("$2b$...") and plain-text stored values.
// auth_users column naming suggests:
//   password_hash → always bcrypt
//   access_code / pin → likely plain (no _hash suffix) but supports either.
async function verifySecret(plain, stored) {
  if (!plain || !stored) return false;
  if (typeof stored !== 'string') return false;
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    try { return await bcrypt.compare(plain, stored); }
    catch (_) { return false; }
  }
  return plain === stored;
}

// ============================================
// POST /login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { password, accessCode, pin } = req.body || {};

    if (!password || !accessCode || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials (password, accessCode, pin required)'
      });
    }

    const pool = resolvePool();
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database unavailable' });
    }

    // Fetch candidate rows. We do the secret comparison in code (not in SQL)
    // so bcrypt-hashed access_code/pin still work. In practice there are
    // very few rows keyed on role='owner'/'admin' so this is cheap.
    const result = await pool.query(
      `SELECT id, username, password_hash, access_code, pin, role,
              display_name, is_active, tier
         FROM auth_users
        WHERE COALESCE(is_active, true) = true`
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    let matched = null;
    for (const row of result.rows) {
      const accessOk = await verifySecret(accessCode, row.access_code);
      if (!accessOk) continue;
      const pinOk = await verifySecret(pin, row.pin);
      if (!pinOk) continue;
      const pwOk = await verifySecret(password, row.password_hash);
      if (!pwOk) continue;
      matched = row;
      break;
    }

    if (!matched) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update last_login / login_count (non-blocking).
    pool.query(
      `UPDATE auth_users
          SET last_login = NOW(),
              login_count = COALESCE(login_count, 0) + 1
        WHERE id = $1`,
      [matched.id]
    ).catch(err => console.error('[AUTH] last_login update failed:', err.message));

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[AUTH] JWT_SECRET missing at sign time');
      return res.status(500).json({ success: false, error: 'Server auth not configured' });
    }

    const token = jwt.sign(
      {
        userId:      matched.id,
        username:    matched.username,
        role:        matched.role,
        displayName: matched.display_name,
        tier:        matched.tier
      },
      secret,
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id:          matched.id,
        username:    matched.username,
        role:        matched.role,
        displayName: matched.display_name,
        tier:        matched.tier
      }
    });

  } catch (err) {
    console.error('[AUTH/LOGIN]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// POST /verify-pin
// Verifies user-submitted PIN against the pin stored in auth_users for the
// currently-authenticated JWT user. Used by ModuleGate.jsx to lock
// sensitive modules (CRM, Email Marketing, etc.).
// Body: { pin: "0609051974" }
// Header: Authorization: Bearer <jwt>
// Returns: { valid: true } or { valid: false, error: "..." }
// ============================================
router.post('/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body || {};
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ valid: false, error: 'PIN required' });
    }

    // Decode JWT ourselves so this route works regardless of whether the
    // global JWT middleware populates req.user for /api/auth/* paths.
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ valid: false, error: 'No token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ valid: false, error: 'Server auth not configured' });
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    const userId = payload.userId || payload.id || payload.user_id || payload.uid;
    if (!userId) {
      return res.status(401).json({ valid: false, error: 'Token missing user id' });
    }

    const pool = resolvePool();
    if (!pool) {
      return res.status(500).json({ valid: false, error: 'Database unavailable' });
    }

    const q = await pool.query(
      'SELECT pin FROM auth_users WHERE id = $1 AND COALESCE(is_active, true) = true LIMIT 1',
      [userId]
    );
    if (!q.rows.length) {
      return res.status(404).json({ valid: false, error: 'User not found' });
    }

    const stored = q.rows[0].pin;
    if (!stored) {
      return res.status(404).json({ valid: false, error: 'PIN not set for this user' });
    }

    const ok = await verifySecret(pin, stored);
    if (!ok) {
      return res.status(401).json({ valid: false, error: 'Incorrect PIN' });
    }

    return res.json({ valid: true });

  } catch (err) {
    console.error('[AUTH/VERIFY-PIN]', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// ============================================
// GET /verify
// ============================================
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ valid: false, error: 'No token' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ valid: false, error: 'Server auth not configured' });

    const payload = jwt.verify(token, secret);
    // Return both `valid` and `authenticated` so all frontend versions are happy
    return res.json({ valid: true, authenticated: true, user: payload });
  } catch (err) {
    return res.status(401).json({ valid: false, error: err.message });
  }
});

// ============================================
// GET /health
// ============================================
router.get('/health', async (req, res) => {
  const pool = resolvePool();
  let dbOk = false;
  try {
    if (pool) {
      const r = await pool.query('SELECT 1 AS ok');
      dbOk = r.rows[0].ok === 1;
    }
  } catch (_) {}
  res.json({ ok: true, db: dbOk });
});




// GET /api/auth/diag-users — show all auth_users (non-hashed fields only)
router.get('/diag-users', async (req, res) => {
  try {
    const pool = resolvePool();
    const r = await pool.query('SELECT id, username, display_name, role, is_active, access_code, pin, tier FROM auth_users ORDER BY id');
    res.json({ count: r.rows.length, users: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/fix-all-users — upsert all known team members
router.post('/fix-all-users', async (req, res) => {
  if (req.body.key !== 'MFGFixUsers2026') return res.status(403).json({ error: 'forbidden' });
  const pool = resolvePool();
  const bcryptjs = require('bcrypt');
  const TEAM = [
    { username:'saul.garcia',    password:'Dsg060905#321',   access_code:'060905Dsg#321',   pin:'0609051974', display_name:'Saul Garcia',        role:'owner',       tier:'owner',  is_active:true },
    { username:'pablo.alatorre', password:'Pablo2026#MFG',   access_code:'Pablo2026#MFG',   pin:'2026',       display_name:'Pablo Alatorre',     role:'admin',       tier:'admin',  is_active:true },
    { username:'osvaldo.gut',    password:'Osvaldo2026#MFG', access_code:'Osvaldo2026#MFG', pin:'1234',       display_name:'Osvaldo Gutierrez',  role:'admin',       tier:'admin',  is_active:true },
    { username:'denisse.vel',    password:'Velazquez#321',   access_code:'Velazquez#321',   pin:'2908',       display_name:'Denisse Velazquez',  role:'admin',       tier:'admin',  is_active:true },
    { username:'luis.sales',     password:'Luis2026#MFG',    access_code:'Luis2026#MFG',    pin:'5566',       display_name:'Luis',               role:'admin_sales', tier:'sales',  is_active:true },
    { username:'hector.sales',   password:'Hector2026#MFG',  access_code:'Hector2026#MFG',  pin:'7788',       display_name:'Hector',             role:'admin_sales', tier:'sales',  is_active:true },
    { username:'oscar.mejia',    password:'Oscar2026#MFG',   access_code:'Oscar2026#MFG',   pin:'5588',       display_name:'Oscar Mejia',        role:'admin_sales', tier:'sales',  is_active:true },
  ];
  const results = { ok:[], failed:[] };
  for (const u of TEAM) {
    try {
      const ph = await bcryptjs.hash(u.password, 10);
      await pool.query(
        `INSERT INTO auth_users (username, password_hash, access_code, pin, display_name, role, tier, is_active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (username) DO UPDATE SET
            password_hash=EXCLUDED.password_hash,
            access_code=EXCLUDED.access_code,
            pin=EXCLUDED.pin,
            display_name=EXCLUDED.display_name,
            role=EXCLUDED.role,
            tier=EXCLUDED.tier,
            is_active=EXCLUDED.is_active`,
        [u.username, ph, u.access_code, u.pin, u.display_name, u.role, u.tier, u.is_active]
      );
      results.ok.push(u.username);
    } catch(e) { results.failed.push({ username: u.username, err: e.message }); }
  }
  res.json(results);
});

module.exports = router;