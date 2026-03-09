// ════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES - POSTGRESQL USERS TABLE
// ════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { pool } = require('../db/connection');

// ════════════════════════════════════════════════════════════
// SIMPLE LOGIN - ALL IN ONE (REQUIRED FOR FRONTEND!)
// ════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  const { username, password, pin } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Username not found' });
    }
    
    const user = result.rows[0];
    
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
    if (pin && user.pin !== pin) {
      return res.status(401).json({ success: false, error: 'Invalid PIN' });
    }
    
    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

module.exports = router;