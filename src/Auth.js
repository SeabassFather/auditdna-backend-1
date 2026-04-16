const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ SAFE IMPORT
const { getPool } = require('../db');

// ❌ REMOVED BROKEN rateLimit (was crashing your backend)

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1d';

router.post('/login', async (req, res) => {
  try {
    const { password, accessCode, pin } = req.body;

    // 🔒 VALIDATION
    if (!password || !accessCode || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Password, access code, and PIN required'
      });
    }

    const pool = getPool(req);

    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database unavailable'
      });
    }

    // 🔍 FIND USER
    const { rows } = await pool.query(
      `SELECT * FROM auth_users
       WHERE access_code = $1
       AND pin = $2
       LIMIT 1`,
      [accessCode, pin]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // 🔐 PASSWORD CHECK
    const passOk = await bcrypt.compare(password, user.password_hash);

    if (!passOk) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // 🔥 FORCE ACTIVE (SAFE FIX)
    if (user.is_active === false) {
      await pool.query(
        `UPDATE auth_users SET is_active = true WHERE id = $1`,
        [user.id]
      );
    }

    // 🧠 UPDATE LOGIN
    await pool.query(
      `UPDATE auth_users
       SET last_login = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // 🧠 SESSION
    if (req.session) {
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
    }

    // 🔑 JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error('AUTH LOGIN ERROR:', err);

    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;