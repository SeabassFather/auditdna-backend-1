// ═══════════════════════════════════════════════════════════════
// AUTH ROUTE — JWT + bcrypt Authentication
// ═══════════════════════════════════════════════════════════════
// POST /api/auth/login      — Authenticate & return JWT
// POST /api/auth/logout     — Invalidate session
// GET  /api/auth/verify     — Verify JWT token is valid
// POST /api/auth/change-pw  — Change password (authenticated)
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Config ───────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'AuditDNA_JWT_Secret_2026_MFG_Saul_CHANGE_THIS';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── In-memory rate limiter (per IP) ─────────────────────────
const attempts = {};

function checkRateLimit(ip) {
  const record = attempts[ip];
  if (!record) return { allowed: true, remaining: MAX_ATTEMPTS };
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.lockedUntil - Date.now()) / 1000) };
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    delete attempts[ip];
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

function recordFailure(ip) {
  if (!attempts[ip]) attempts[ip] = { count: 0 };
  attempts[ip].count++;
  if (attempts[ip].count >= MAX_ATTEMPTS) {
    attempts[ip].lockedUntil = Date.now() + LOCKOUT_MS;
  }
}

function clearAttempts(ip) {
  delete attempts[ip];
}

// ── GET DB POOL ──────────────────────────────────────────────
function getPool() {
  try { return require('../db').pool; } catch { return null; }
}

// ── ENSURE auth_users TABLE EXISTS ───────────────────────────
async function ensureAuthTable() {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        access_code VARCHAR(20) NOT NULL,
        pin VARCHAR(20) NOT NULL DEFAULT '',
        display_name VARCHAR(200),
        role VARCHAR(50) DEFAULT 'owner',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        login_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed default user if table is empty
    const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM auth_users');
    if (parseInt(rows[0].cnt) === 0) {
      const hash = await bcrypt.hash('Dsg060905#321', 12);
      await pool.query(
        `INSERT INTO auth_users (username, password_hash, access_code, pin, display_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['saul', hash, '060905Dsg#321', '0609051974', 'Saul Garcia', 'owner']
      );
      console.log('AUTH: Default user "saul" created');
    }
  } catch (err) {
    console.error('AUTH: Table init error:', err.message);
  }
}

// Init table on load
ensureAuthTable();

// ═════════════════════════════════════════════════════════════
// POST /login
// ═════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many failed attempts. Try again in ${limit.retryAfter}s`,
      retryAfter: limit.retryAfter
    });
  }

  const { password, accessCode, pin } = req.body;

  if (!password || !accessCode || !pin) {
    return res.status(400).json({ success: false, error: 'Password, access code, and PIN required' });
  }

  const pool = getPool();
  if (!pool) {
    // Fallback: env-based auth if DB is down
    const envPass = process.env.AUTH_PASSWORD || 'Dsg060905#321';
    const envCode = process.env.AUTH_CODE || '060905Dsg#321';
    if (password === envPass && accessCode === envCode && pin === (process.env.AUTH_PIN || '0609051974')) {
      clearAttempts(ip);
      const token = jwt.sign(
        { userId: 0, username: 'saul', role: 'owner', displayName: 'Saul Garcia' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      return res.json({ success: true, token, user: { username: 'saul', displayName: 'Saul Garcia', role: 'owner' } });
    }
    recordFailure(ip);
    return res.status(401).json({ success: false, error: 'Invalid credentials', remaining: MAX_ATTEMPTS - (attempts[ip]?.count || 0) });
  }

  try {
    // DB auth
    const { rows } = await pool.query(
      'SELECT * FROM auth_users WHERE is_active = true ORDER BY id'
    );

    let matched = null;
    for (const user of rows) {
      const passOk = await bcrypt.compare(password, user.password_hash);
      const codeOk = accessCode === user.access_code;
      const pinOk = pin === user.pin;
      if (passOk && codeOk && pinOk) { matched = user; break; }
    }

    if (!matched) {
      recordFailure(ip);
      const remaining = MAX_ATTEMPTS - (attempts[ip]?.count || 0);
      return res.status(401).json({
        success: false,
        error: remaining > 0 ? `Invalid credentials. ${remaining} attempts remaining.` : 'Account locked. Try again in 5 minutes.',
        remaining
      });
    }

    // Success
    clearAttempts(ip);

    // Update login stats
    await pool.query(
      'UPDATE auth_users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1',
      [matched.id]
    );

    // Store in session
    req.session.userId = matched.id;
    req.session.username = matched.username;
    req.session.role = matched.role;

    // Generate JWT
    const token = jwt.sign(
      { userId: matched.id, username: matched.username, role: matched.role, displayName: matched.display_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      token,
      user: {
        username: matched.username,
        displayName: matched.display_name,
        role: matched.role,
        lastLogin: matched.last_login,
        loginCount: matched.login_count + 1
      }
    });

  } catch (err) {
    console.error('AUTH LOGIN ERROR:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ═════════════════════════════════════════════════════════════
// POST /logout
// ═════════════════════════════════════════════════════════════
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout session destroy error:', err);
    res.clearCookie('auditdna.sid');
    res.json({ success: true });
  });
});

// ═════════════════════════════════════════════════════════════
// GET /verify — check if JWT is still valid
// ═════════════════════════════════════════════════════════════
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({ authenticated: true, user: { username: decoded.username, displayName: decoded.displayName, role: decoded.role } });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

// ═════════════════════════════════════════════════════════════
// POST /change-pw — change password (must be authenticated)
// ═════════════════════════════════════════════════════════════
router.post('/change-pw', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET); }
  catch { return res.status(401).json({ success: false, error: 'Invalid token' }); }

  const { currentPassword, newPassword, newCode } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current and new password required' });
  }

  const pool = getPool();
  if (!pool) return res.status(500).json({ success: false, error: 'Database unavailable' });

  try {
    const { rows } = await pool.query('SELECT * FROM auth_users WHERE id = $1', [decoded.userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Current password incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE auth_users SET password_hash = $1, access_code = COALESCE($2, access_code), updated_at = NOW() WHERE id = $3',
      [newHash, newCode || null, decoded.userId]
    );

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('AUTH CHANGE-PW ERROR:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
