// ═══════════════════════════════════════════════════════════════
// AUDITDNA SESSION TRACKING ROUTES v2.1
// Real user session management with PostgreSQL integration
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// Database Connection (FIXED - Direct import)
// ═══════════════════════════════════════════════════════════════

const { pool } = require('../db');

// ═══════════════════════════════════════════════════════════════
// In-memory session store (fallback & performance cache)
// ═══════════════════════════════════════════════════════════════

const activeSessions = new Map();
const sessionLogs = [];

// ═══════════════════════════════════════════════════════════════
// HELPER: Safe database query
// ═══════════════════════════════════════════════════════════════

const safeQuery = async (query, params = []) => {
  if (!pool) return null;
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error('[Sessions] DB Query error:', error.message);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// INIT: Create table if not exists
// ═══════════════════════════════════════════════════════════════

const initSessionTable = async () => {
  if (!pool) return;
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      username VARCHAR(255),
      name VARCHAR(255),
      email VARCHAR(255),
      role VARCHAR(50),
      action VARCHAR(20),
      ip_address VARCHAR(45),
      user_agent TEXT,
      session_token VARCHAR(255),
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      logout_time TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
  `;
  
  try {
    await pool.query(createTableSQL);
    console.log('✅ [Sessions] PostgreSQL table initialized');
  } catch (error) {
    console.warn('⚠️  [Sessions] Table init skipped:', error.message);
  }
};

// Initialize on load
initSessionTable();

// ═══════════════════════════════════════════════════════════════
// GET /api/sessionRoutes/active - Get all active users
// ═══════════════════════════════════════════════════════════════

router.get('/active', async (req, res) => {
  try {
    let dbUsers = [];
    
    // Try database first
    const result = await safeQuery(`
      SELECT DISTINCT ON (user_id) 
        id, user_id, username, name, email, role, 
        login_time, ip_address, is_active
      FROM user_sessions 
      WHERE is_active = true 
        AND login_time > NOW() - INTERVAL '24 hours'
      ORDER BY user_id, login_time DESC
      LIMIT 100
    `);
    
    if (result && result.rows) {
      dbUsers = result.rows;
    }
    
    // Merge with in-memory sessions
    const memoryUsers = Array.from(activeSessions.values());
    const allUsers = [...dbUsers];
    
    memoryUsers.forEach(mu => {
      if (!allUsers.find(u => u.user_id === mu.user_id || u.username === mu.username)) {
        allUsers.push(mu);
      }
    });
    
    // Get current user from token if available
    let currentUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'auditdna-secret-key';
        currentUser = jwt.verify(token, secret);
      } catch (e) {
        // Token invalid, that's okay
      }
    }
    
    res.json({
      success: true,
      users: allUsers.map(u => ({
        id: u.user_id || u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        loginTime: u.login_time || u.loginTime,
        status: 'online',
        ipAddress: u.ip_address || u.ipAddress
      })),
      currentUser,
      count: allUsers.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Sessions] Error:', error);
    
    // Fallback to memory only
    const memoryUsers = Array.from(activeSessions.values());
    res.json({
      success: true,
      users: memoryUsers,
      count: memoryUsers.length,
      timestamp: new Date().toISOString()
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sessionRoutes/logs - Get session activity logs
// ═══════════════════════════════════════════════════════════════

router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    let logs = [];
    
    // Try database first
    const result = await safeQuery(`
      SELECT 
        id, user_id, username, name, email, role, 
        action, ip_address, login_time, logout_time,
        created_at as timestamp
      FROM user_sessions 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    if (result && result.rows && result.rows.length > 0) {
      logs = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        action: row.action || 'login',
        ipAddress: row.ip_address,
        timestamp: row.action === 'logout' ? row.logout_time : row.login_time,
        createdAt: row.timestamp
      }));
    } else {
      // Fallback to in-memory logs
      logs = sessionLogs.slice(offset, offset + limit);
    }
    
    res.json({
      success: true,
      logs,
      total: logs.length,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('[Sessions] Logs error:', error);
    res.json({
      success: true,
      logs: sessionLogs.slice(0, 50),
      total: sessionLogs.length
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/sessionRoutes/login - Record user login
// ═══════════════════════════════════════════════════════════════

router.post('/login', async (req, res) => {
  try {
    const { userId, username, name, email, role, sessionToken } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const loginTime = new Date().toISOString();
    
    // Create session object
    const session = {
      id: Date.now(),
      user_id: userId,
      username,
      name,
      email,
      role: role || 'user',
      action: 'login',
      loginTime,
      ipAddress,
      status: 'online'
    };
    
    // Add to in-memory store
    activeSessions.set(userId || username, session);
    sessionLogs.unshift({
      ...session,
      timestamp: loginTime
    });
    
    // Keep logs limited
    if (sessionLogs.length > 1000) {
      sessionLogs.pop();
    }
    
    // Try to save to database
    await safeQuery(`
      INSERT INTO user_sessions 
        (user_id, username, name, email, role, action, ip_address, user_agent, session_token, is_active, login_time)
      VALUES ($1, $2, $3, $4, $5, 'login', $6, $7, $8, true, NOW())
    `, [userId, username, name, email, role || 'user', ipAddress, userAgent, sessionToken]);
    
    console.log(`✅ [Sessions] LOGIN: ${username || name} (${role}) from ${ipAddress}`);
    
    res.json({
      success: true,
      message: 'Login recorded',
      session
    });
    
  } catch (error) {
    console.error('[Sessions] Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/sessionRoutes/logout - Record user logout
// ═══════════════════════════════════════════════════════════════

router.post('/logout', async (req, res) => {
  try {
    const { userId, username } = req.body;
    const key = userId || username;
    const logoutTime = new Date().toISOString();
    
    // Get session info before removing
    const session = activeSessions.get(key);
    
    // Remove from active sessions
    activeSessions.delete(key);
    
    // Add logout log
    if (session) {
      sessionLogs.unshift({
        ...session,
        action: 'logout',
        timestamp: logoutTime
      });
    }
    
    // Update database
    if (userId) {
      await safeQuery(`
        UPDATE user_sessions 
        SET is_active = false, logout_time = NOW()
        WHERE user_id = $1 AND is_active = true
      `, [userId]);
      
      // Insert logout record
      await safeQuery(`
        INSERT INTO user_sessions 
          (user_id, username, name, email, role, action, is_active)
        VALUES ($1, $2, $3, $4, $5, 'logout', false)
      `, [userId, session?.username, session?.name, session?.email, session?.role]);
    }
    
    console.log(`✅ [Sessions] LOGOUT: ${username || userId}`);
    
    res.json({
      success: true,
      message: 'Logout recorded'
    });
    
  } catch (error) {
    console.error('[Sessions] Logout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sessionRoutes/stats - Get session statistics by role
// ═══════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const stats = {
      admin: 0,
      salesman: 0,
      seller: 0,
      buyer: 0,
      supplier: 0,
      client: 0,
      grower: 0,
      shipper: 0,
      total: 0
    };
    
    // Try database
    const result = await safeQuery(`
      SELECT role, COUNT(DISTINCT COALESCE(user_id, id)) as count
      FROM user_sessions 
      WHERE is_active = true 
        AND login_time > NOW() - INTERVAL '24 hours'
      GROUP BY role
    `);
    
    if (result && result.rows) {
      result.rows.forEach(row => {
        const role = (row.role || 'user').toLowerCase();
        if (stats.hasOwnProperty(role)) {
          stats[role] = parseInt(row.count);
        }
        stats.total += parseInt(row.count);
      });
    } else {
      // Fallback to in-memory
      activeSessions.forEach(session => {
        const role = (session.role || 'user').toLowerCase();
        if (stats.hasOwnProperty(role)) {
          stats[role]++;
        }
        stats.total++;
      });
    }
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Sessions] Stats error:', error);
    res.json({ success: true, stats: { total: activeSessions.size } });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/sessionRoutes/heartbeat - Keep session alive
// ═══════════════════════════════════════════════════════════════

router.post('/heartbeat', (req, res) => {
  const { userId, username } = req.body;
  const key = userId || username;
  
  if (activeSessions.has(key)) {
    const session = activeSessions.get(key);
    session.lastHeartbeat = new Date().toISOString();
    activeSessions.set(key, session);
  }
  
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/sessionRoutes/cleanup - Clean up stale sessions
// ═══════════════════════════════════════════════════════════════

router.delete('/cleanup', async (req, res) => {
  try {
    const hoursOld = parseInt(req.query.hours) || 24;
    
    // Clean in-memory
    const now = Date.now();
    let cleaned = 0;
    activeSessions.forEach((session, key) => {
      const loginTime = new Date(session.loginTime || session.login_time).getTime();
      if (now - loginTime > hoursOld * 60 * 60 * 1000) {
        activeSessions.delete(key);
        cleaned++;
      }
    });
    
    // Clean database
    const result = await safeQuery(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE is_active = true 
        AND login_time < NOW() - INTERVAL '${hoursOld} hours'
      RETURNING id
    `);
    
    const dbCleaned = result?.rowCount || 0;
    
    res.json({
      success: true,
      message: `Cleaned ${cleaned + dbCleaned} stale sessions`,
      memoryCleaned: cleaned,
      dbCleaned
    });
    
  } catch (error) {
    console.error('[Sessions] Cleanup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = router;