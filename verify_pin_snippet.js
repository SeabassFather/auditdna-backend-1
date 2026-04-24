// ============================================================================
// ADD TO: C:\AuditDNA\backend\routes\auth.js
// Do NOT rename this file to auth.routes.js (standing rule).
// Paste the block below immediately before `module.exports = router;` (end of file).
// Verifies user-submitted PIN against bcryptjs pin_hash in auth_users.
// Requires: JWT middleware populates req.user.id (already active platform-wide).
// ============================================================================

const bcryptjs = require('bcryptjs');

// POST /api/auth/verify-pin
// Body: { pin: "0609051974" }
// Header: Authorization: Bearer <jwt>
// Returns: { valid: true } or { valid: false, error: "..." }
router.post('/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body || {};
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ valid: false, error: 'PIN required' });
    }
    // req.user is populated by the JWT middleware mounted on /api/*
    const userId = req.user && (req.user.id || req.user.user_id || req.user.uid);
    if (!userId) {
      return res.status(401).json({ valid: false, error: 'Not authenticated' });
    }

    const pool = req.app.locals.pool || req.app.locals.db;
    if (!pool) {
      return res.status(500).json({ valid: false, error: 'DB pool unavailable' });
    }

    const q = await pool.query(
      'SELECT pin_hash FROM auth_users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (!q.rows.length || !q.rows[0].pin_hash) {
      return res.status(404).json({ valid: false, error: 'PIN not set for this user' });
    }

    const ok = await bcryptjs.compare(pin, q.rows[0].pin_hash);
    if (!ok) {
      return res.status(401).json({ valid: false, error: 'Incorrect PIN' });
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error('[verify-pin]', err.message);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// ============================================================================
// END OF BLOCK — make sure module.exports = router; stays as the LAST line
// ============================================================================