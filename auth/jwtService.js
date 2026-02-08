// ═══════════════════════════════════════════════════════════════════════════════════════════
// AUDITDNA - JWT SERVICE
// CM Products International | AuditDNA Platform
// ═══════════════════════════════════════════════════════════════════════════════════════════
// Created: January 15, 2026
// Purpose: JWT token generation, verification, and middleware
// ═══════════════════════════════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import { ROLE_SCOPES, ROLES } from '../security/roles.js';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || 'auditdna-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_ISSUER = 'AuditDNA';
const JWT_AUDIENCE = 'auditdna-api';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATION
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Generate access token
 */
export function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    scope: ROLE_SCOPES[user.role] || [],
    firstName: user.first_name,
    lastName: user.last_name
  };
  
  const options = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  };
  
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    type: 'refresh'
  };
  
  const options = {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  };
  
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Generate token pair
 */
export function generateTokenPair(user) {
  return {
    accessToken: generateToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: JWT_EXPIRES_IN,
    tokenType: 'Bearer'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TOKEN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Verify token
 */
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    
    return {
      valid: true,
      decoded,
      expired: false
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      expired: error.name === 'TokenExpiredError'
    };
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Authentication middleware
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }
  
  const verification = verifyToken(token);
  
  if (!verification.valid) {
    if (verification.expired) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
  
  // Attach user to request
  req.user = verification.decoded;
  next();
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    const verification = verifyToken(token);
    if (verification.valid) {
      req.user = verification.decoded;
    }
  }
  
  next();
}

/**
 * Require specific role middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'ROLE_DENIED',
        requiredRoles: roles,
        currentRole: req.user.role
      });
    }
    
    next();
  };
}

/**
 * Require specific scope middleware
 */
export function requireScope(...scopes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userScopes = req.user.scope || [];
    const hasScope = scopes.some(scope => userScopes.includes(scope));
    
    if (!hasScope) {
      return res.status(403).json({
        error: 'Insufficient scope',
        code: 'SCOPE_DENIED',
        requiredScopes: scopes,
        currentScopes: userScopes
      });
    }
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Extract token from request
 */
export function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check query parameter (for WebSocket)
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  
  return new Date(decoded.exp * 1000);
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(token) {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  const fiveMinutes = 5 * 60 * 1000;
  return (expiration.getTime() - Date.now()) < fiveMinutes;
}

export default {
  generateToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  authenticateToken,
  optionalAuth,
  requireRole,
  requireScope,
  extractToken,
  getTokenExpiration,
  isTokenExpiringSoon
};