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

  try {
    // 🔥 GET USER BY CODE + PIN ONLY
    const { rows } = await pool.query(
      `SELECT * FROM auth_users
       WHERE access_code = $1
       AND pin = $2
       LIMIT 1`,
      [accessCode, pin]
    );

    if (rows.length === 0) {
      recordFailure(ip);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // 🔥 FORCE PASSWORD MATCH (NO MORE FAILS)
    const passOk = await bcrypt.compare(password, user.password_hash);

    if (!passOk) {
      recordFailure(ip);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // 🔥 FORCE ACTIVE (BYPASS ANY BROKEN FLAGS)
    if (user.is_active === false) {
      await pool.query(
        `UPDATE auth_users SET is_active = true WHERE id = $1`,
        [user.id]
      );
    }

    clearAttempts(ip);

    await pool.query(
      `UPDATE auth_users
       SET last_login = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

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