// ============================================================================
// SEED USERS — routes/seed-users.js
// ONE-TIME: creates Oscar Mejia + Ramiro in auth_users
// POST /api/admin/seed-users  (owner token required)
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
      // Skip if already exists
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
      // Log to user_activity_log
      await pool.query(
        `CREATE TABLE IF NOT EXISTS user_activity_log (
           id SERIAL PRIMARY KEY, username VARCHAR(100), display_name VARCHAR(150),
           role VARCHAR(50), event_type VARCHAR(100), module VARCHAR(100),
           description TEXT, ip_address VARCHAR(50), meta JSONB DEFAULT '{}',
           created_at TIMESTAMPTZ DEFAULT NOW())`
      ).catch(()=>{});
      await pool.query(
        `INSERT INTO user_activity_log (username,display_name,role,event_type,description)
         VALUES ($1,$2,$3,'ACCOUNT_CREATED','Account seeded by admin')`,
        [u.username, u.display_name, u.role]
      ).catch(()=>{});
      results.push({ username: u.username, status: 'created', id: ins.rows[0].id,
                     role: u.role, password: u.password, access_code: u.access_code, pin: u.pin });
    } catch (e) {
      results.push({ username: u.username, status: 'error', error: e.message });
    }
  }
  res.json({ ok: true, results });
});

module.exports = router;
