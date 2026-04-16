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
    // 🔥 EXACT USER MATCH (NO GUESSING)
    const { rows } = await pool.query(
      `SELECT * FROM auth_users
       WHERE access_code = $1
       AND pin = $2
       AND is_active = true
       LIMIT 1`,
      [accessCode, pin]
    );

    if (rows.length === 0) {
      recordFailure(ip);
      const remaining = MAX_ATTEMPTS - (attempts[ip]?.count || 0);

      return res.status(401).json({
        success: false,
        error: `Invalid credentials. ${remaining} attempts remaining.`,
        remaining
      });
    }

    const user = rows[0];

    // 🔥 PASSWORD CHECK
    const passOk = await bcrypt.compare(password, user.password_hash);

    // 🔥 DEBUG (DO NOT REMOVE YET)
    console.log('LOGIN DEBUG >>>');
    console.log('INPUT:', { password, accessCode, pin });
    console.log('DB:', {
      hash: user.password_hash,
      access_code: user.access_code,
      pin: user.pin
    });
    console.log('RESULT:', {
      passOk,
      codeOk: accessCode === user.access_code,
      pinOk: pin === user.pin
    });
    console.log('-------------------------');

    if (!passOk) {
      recordFailure(ip);
      const remaining = MAX_ATTEMPTS - (attempts[ip]?.count || 0);

      return res.status(401).json({
        success: false,
        error: `Invalid credentials. ${remaining} attempts remaining.`,
        remaining
      });
    }

    // 🔥 SUCCESS
    clearAttempts(ip);

    await pool.query(
      `UPDATE auth_users
       SET last_login = NOW(),
           updated_at = NOW(),
           login_count = COALESCE(login_count, 0) + 1
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
        role: user.role,
        displayName: user.display_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      success: true,
      token,
      user: {
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        lastLogin: user.last_login
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