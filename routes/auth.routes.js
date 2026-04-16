// ════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES - POSTGRESQL USERS TABLE
// ════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { pool } = require('../db/connection');

// ════════════════════════════════════════════════════════════
// LOGIN - STEP 1: USERNAME
// ════════════════════════════════════════════════════════════
router.post('/login/username', async (req, res) => {
  const { username } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT id, username, email, role FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Username not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Login username error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database error' 
    });
  }
});

// ════════════════════════════════════════════════════════════
// LOGIN - STEP 2: PASSWORD
// ════════════════════════════════════════════════════════════
router.post('/login/password', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, password FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const user = result.rows[0];
    
    // Simple password check (in production, use bcrypt!)
    if (user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid password' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database error' 
    });
  }
});

// ════════════════════════════════════════════════════════════
// LOGIN - STEP 3: PIN
// ════════════════════════════════════════════════════════════
router.post('/login/pin', async (req, res) => {
  const { username, pin } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, pin FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const user = result.rows[0];
    
    if (user.pin !== pin) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid PIN' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login PIN error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database error' 
    });
  }
});

// ════════════════════════════════════════════════════════════
// LOGOUT
// ════════════════════════════════════════════════════════════
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
