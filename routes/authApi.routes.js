// ═══════════════════════════════════════════════════════════════════════════════════════════
// AUDITDNA - AUTHENTICATION API ROUTES
// CM Products International | AuditDNA Platform
// ═══════════════════════════════════════════════════════════════════════════════════════════
// Created: January 15, 2026
// Purpose: User authentication endpoints (login, register, refresh)
// ═══════════════════════════════════════════════════════════════════════════════════════════

const express = require('express');
const bcrypt = require('bcrypt');
const { generateTokenPair, verifyToken, authenticateToken } = require('../auth/jwtService');
const { query, queryOne } = require('../db/connection');
const { ROLES, ROLE_SCOPES } = require('../security/roles');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// In-memory user store (replace with DB queries in production)
const users = new Map();
const loginAttempts = new Map();

// Initialize with default admin
users.set('admin@auditdna.com', {
  id: 'usr_admin_001',
  email: 'admin@auditdna.com',
  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.SxgqKR.VqYrOWe', // admin123
  first_name: 'System',
  last_name: 'Administrator',
  role: ROLES.SUPER_ADMIN,
  status: 'ACTIVE',
  created_at: new Date().toISOString()
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    // Check lockout
    const attempts = loginAttempts.get(email);
    if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const timeSinceLock = Date.now() - attempts.lastAttempt;
      if (timeSinceLock < LOCKOUT_DURATION) {
        const remainingMinutes = Math.ceil((LOCKOUT_DURATION - timeSinceLock) / 60000);
        return res.status(429).json({
          error: 'Account temporarily locked',
          code: 'ACCOUNT_LOCKED',
          retryAfter: `${remainingMinutes} minutes`
        });
      }
      // Reset after lockout period
      loginAttempts.delete(email);
    }
    
    // Find user (in production: query database)
    const user = users.get(email.toLowerCase());
    
    if (!user) {
      recordFailedAttempt(email);
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Check account status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
        status: user.status
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      recordFailedAttempt(email);
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Clear login attempts on success
    loginAttempts.delete(email);
    
    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Update last login (in production: update database)
    user.last_login = new Date().toISOString();
    
    console.log(`[AUTH] User logged in: ${email} (${user.role})`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        scopes: ROLE_SCOPES[user.role] || []
      },
      ...tokens
    });
    
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Authentication failed', code: 'AUTH_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = ROLES.CLIENT } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Check if user exists
    if (users.has(email.toLowerCase())) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }
    
    // Validate role (only allow client/grower/buyer for self-registration)
    const allowedRoles = [ROLES.CLIENT, ROLES.GROWER, ROLES.BUYER];
    const assignedRole = allowedRoles.includes(role) ? role : ROLES.CLIENT;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const user = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName || '',
      last_name: lastName || '',
      role: assignedRole,
      scopes: ROLE_SCOPES[assignedRole] || [],
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    
    // Save user (in production: insert into database)
    users.set(user.email, user);
    
    // Generate tokens
    const tokens = generateTokenPair(user);
    
    console.log(`[AUTH] User registered: ${email} (${assignedRole})`);
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        scopes: ROLE_SCOPES[user.role] || []
      },
      ...tokens
    });
    
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Registration failed', code: 'REGISTER_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Verify refresh token
    const verification = verifyToken(refreshToken);
    
    if (!verification.valid) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Check token type
    if (verification.decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'WRONG_TOKEN_TYPE'
      });
    }
    
    // Find user
    const userId = verification.decoded.sub;
    let user = null;
    
    for (const [_, u] of users) {
      if (u.id === userId) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Generate new tokens
    const tokens = generateTokenPair(user);
    
    console.log(`[AUTH] Token refreshed for: ${user.email}`);
    
    res.json({
      success: true,
      ...tokens
    });
    
  } catch (error) {
    console.error('[AUTH] Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed', code: 'REFRESH_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/logout
 * Logout user (invalidate token - in production, add to blacklist)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In production: add token to blacklist
    console.log(`[AUTH] User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({ error: 'Logout failed', code: 'LOGOUT_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CURRENT USER
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user.sub,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        scopes: user.scope
      }
    });
    
  } catch (error) {
    console.error('[AUTH] Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile', code: 'PROFILE_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current and new password required',
        code: 'MISSING_PASSWORDS'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Find user
    const user = users.get(req.user.email);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'WRONG_PASSWORD'
      });
    }
    
    // Hash new password
    user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.updated_at = new Date().toISOString();
    
    console.log(`[AUTH] Password changed for: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('[AUTH] Change password error:', error);
    res.status(500).json({ error: 'Failed to change password', code: 'PASSWORD_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════

function recordFailedAttempt(email) {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
}

module.exports = router;