'use strict';

// ============================================
// AUTH ROUTES — 3-FIELD OWNER PORTAL
// POST  /api/auth/login    { password, accessCode, pin } → JWT
// GET   /api/auth/verify   Bearer <token> → { valid, user }
// GET   /api/auth/health   → { ok, db }
// ============================================

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

const router = express.Router();

// Resilient pool resolver — works whether db.js exports a function,
// an object with getPool, or global.db is set by server.js.
function resolvePool() {
  if (global.db) return global.db;
  try {
    const dbModule = require('../db');
    const getPool = dbModule.getPool || dbModule;
    if (typeof getPool === 'function') return getPool();
  } catch (_) {}
  return null;
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
    return res.json({ valid: true, user: payload });
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

module.exports = router;