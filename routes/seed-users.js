// ============================================================================
// SEED USERS — routes/seed-users.js
// POST /api/admin/seed-users       — seed Oscar + Ramiro
// POST /api/admin/reset-pablo      — upsert Pablo Alatorre credentials
// ============================================================================
const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();

const USERS = [
  {
    username:     'oscar.mejia',
    display_name: 'Oscar Mejia',
    password:     'Oscar2026#MFG',
    access_code:  'Oscar2026#MFG',
    pin:          '5588',
    role:         'admin_sales',
    tier:         'sales',
    is_active:    true
  },
  {
    username:     'ramiro.buyer',
    display_name: 'Ramiro — Produce Broker',
    password:     'Ramiro2026#Pro',
    access_code:  'MFG2026RX',
    pin:          '7749',
    role:         'buyer',
    tier:         'client',
    is_active:    true
  }
];

router.post('/seed-users', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  const results = [];
  for (const u of USERS) {
    try {
      const exists = await pool.query(
        'SELECT id FROM auth_users WHERE username = $1 LIMIT 1', [u.username]
      );
      if (exists.rows.length > 0) {
        results.push({ username: u.username, status: 'already_exists', id: exists.rows[0].id });
        continue;
      }
      const pw_hash = await bcrypt.hash(u.password, 10);
      const ins = await pool.query(
        `INSERT INTO auth_users
           (username, password_hash, access_code, pin, display_name, role, is_active, tier)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [u.username, pw_hash, u.access_code, u.pin, u.display_name, u.role, u.is_active, u.tier]
      );
      results.push({ username: u.username, status: 'created', id: ins.rows[0].id });
    } catch (e) {
      results.push({ username: u.username, status: 'error', error: e.message });
    }
  }
  res.json({ ok: true, results });
});

// Reset Pablo Alatorre — upsert with fresh credentials
router.post('/reset-pablo', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  try {
    const pw_hash = await bcrypt.hash('Pablo2026#MFG', 10);
    const result = await pool.query(
      `INSERT INTO auth_users
         (username, password_hash, access_code, pin, display_name, role, is_active, tier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         access_code   = EXCLUDED.access_code,
         pin           = EXCLUDED.pin,
         is_active     = true,
         role          = EXCLUDED.role
       RETURNING id, username, role, is_active`,
      ['pablo.alatorre', pw_hash, 'Pablo2026#MFG', '2026',
       'Pablo Alatorre', 'admin', true, 'admin']
    );
    res.json({
      ok: true,
      user: result.rows[0],
      credentials: {
        username:   'pablo.alatorre',
        password:   'Pablo2026#MFG',
        accessCode: 'Pablo2026#MFG',
        pin:        '2026'
      }
    });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
