// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUDITDNA â€” AUTH MIDDLEWARE (Shared)
//  File: C:\AuditDNA\backend\middleware\auth-middleware.js
//
//  REPLACES: per-file x-access-level / x-user-email header trust
//  NOW:      JWT Bearer token verification â€” unforgeable
//
//  Usage in any route file:
//    const { requireOwner, requireAdmin, requireAuth, attachUser } = require('../middleware/auth-middleware');
//    router.get('/secret', requireOwner, handler);
//    router.get('/data',   requireAuth,  handler);
//    router.get('/public', attachUser,   handler);  // optional auth
//
//  After middleware runs, req.user is available:
//    { email, role, name, iat, exp }
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Safety check â€” refuse to start with default/missing secret
if (!JWT_SECRET || JWT_SECRET === 'auditdna_secret_change_me') {
  console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.error('  FATAL: JWT_SECRET is missing or still set to default');
  console.error('  Set a strong JWT_SECRET in your .env file:');
  console.error('  JWT_SECRET=<random 64+ character string>');
  console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// â”€â”€ Role hierarchy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROLE_LEVELS = {
  owner:    100,
  admin:     80,
  sales:     60,
  agent:     40,
  consumer:  20,
  demo:      10,
  public:     0,
};

const OWNER_EMAILS = new Set(['sg01@eb.com']);
const ADMIN_EMAILS = new Set(['sg01@eb.com', 'gl@eb.com']);

// â”€â”€ Extract and verify JWT from Authorization header â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Cross-check role against known owner/admin lists
    // This prevents a stolen sales token from being "upgraded"
    // via a DB role change while the old token is still valid
    let verifiedRole = decoded.role;
    if (verifiedRole === 'owner' && !OWNER_EMAILS.has(decoded.email)) {
      verifiedRole = 'sales'; // downgrade
    }
    if (verifiedRole === 'admin' && !ADMIN_EMAILS.has(decoded.email) && !OWNER_EMAILS.has(decoded.email)) {
      // Dynamic admins from DB are OK â€” but we cap at admin, not owner
      // No downgrade needed for DB-registered admins
    }

    return {
      email: decoded.email,
      role:  verifiedRole,
      name:  decoded.name,
      level: ROLE_LEVELS[verifiedRole] || 0,
      iat:   decoded.iat,
      exp:   decoded.exp,
    };
  } catch {
    return null; // expired or invalid
  }
}

// â”€â”€ Middleware: attach user if token present (no rejection) â”€â”€â”€
function attachUser(req, res, next) {
  req.user = extractUser(req) || { email: '', role: 'public', name: '', level: 0 };
  next();
}

// â”€â”€ Middleware: require any authenticated user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function requireAuth(req, res, next) {
  req.user = extractUser(req);
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

// â”€â”€ Middleware: require minimum role level â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function requireRole(minRole) {
  const minLevel = ROLE_LEVELS[minRole] || 0;
  return (req, res, next) => {
    req.user = extractUser(req);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.level < minLevel) {
      return res.status(403).json({ error: `${minRole} access required. Your role: ${req.user.role}` });
    }
    next();
  };
}

// â”€â”€ Convenience: require owner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function requireOwner(req, res, next) {
  req.user = extractUser(req);
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required.' });
  }
  next();
}

// â”€â”€ Convenience: require admin (owner also passes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function requireAdmin(req, res, next) {
  req.user = extractUser(req);
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.level < ROLE_LEVELS.admin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

// â”€â”€ Convenience: require sales+ (owner, admin, sales pass) â”€â”€â”€
function requireSales(req, res, next) {
  req.user = extractUser(req);
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.level < ROLE_LEVELS.sales) {
    return res.status(403).json({ error: 'Sales access required.' });
  }
  next();
}

module.exports = {
  extractUser,
  attachUser,
  requireAuth,
  requireRole,
  requireOwner,
  requireAdmin,
  requireSales,
  ROLE_LEVELS,
  OWNER_EMAILS,
  ADMIN_EMAILS,
  JWT_SECRET,
};

