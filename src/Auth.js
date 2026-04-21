const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { getPool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1d';

router.post('/login', async (req, res) => {
  try {
    const { password, accessCode, pin } = req.body;

    if (!password || !accessCode || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials'
      });
    }

    const pool = getPool();

    const result = await global.db.query(
      `
      SELECT id, username, role, password_hash, is_active
      FROM auth_users
      WHERE access_code = $1
        AND pin = $2
      LIMIT 1
      `,
      [accessCode, pin]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    if (!user.is_active) {
      await global.db.query(
        `UPDATE auth_users SET is_active = true WHERE id = $1`,
        [user.id]
      );
    }

    await global.db.query(
      `
      UPDATE auth_users
      SET last_login = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [user.id]
    );

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
    console.error('AUTH LOGIN ERROR:', err.message);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
