/**
 * requireRole.js
 *
 * Save to: C:\AuditDNA\backend\middleware\requireRole.js
 *
 * Express RBAC middleware. Mount AFTER your JWT decoder so req.user is populated.
 *
 * Usage:
 *   const { requireRole, requireTier, requireAny } = require('../middleware/requireRole');
 *
 *   // Owner + admin only:
 *   router.get('/api/growers/all', requireRole('owner','admin'), handler);
 *
 *   // Owner + admin + admin_sales (Luis, Hector):
 *   router.post('/api/factor-intake/upload', requireTier('owner','admin','admin_sales'), handler);
 *
 *   // Custom predicate:
 *   router.delete('/api/danger', requireAny(u => u.role === 'owner' && u.tier === 'owner'), handler);
 *
 * Returns:
 *   401 NOT_AUTHENTICATED  if no req.user
 *   403 ROLE_FORBIDDEN     if role check fails
 *   403 TIER_FORBIDDEN     if tier check fails
 *   403 ACCESS_DENIED      if predicate fails
 *
 * No emojis. No external deps.
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'NOT_AUTHENTICATED',
        message: 'Login required'
      });
    }
    const role = req.user.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        ok: false,
        error: 'ROLE_FORBIDDEN',
        message: `Role '${role || 'none'}' not allowed for this resource`,
        required: allowedRoles
      });
    }
    return next();
  };
}

function requireTier(...allowedTiers) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'NOT_AUTHENTICATED',
        message: 'Login required'
      });
    }
    const tier = req.user.tier || req.user.role;
    if (!allowedTiers.includes(tier)) {
      return res.status(403).json({
        ok: false,
        error: 'TIER_FORBIDDEN',
        message: `Tier '${tier || 'none'}' not allowed for this resource`,
        required: allowedTiers
      });
    }
    return next();
  };
}

function requireAny(predicate) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'NOT_AUTHENTICATED',
        message: 'Login required'
      });
    }
    let ok = false;
    try {
      ok = !!predicate(req.user);
    } catch (_) {
      ok = false;
    }
    if (!ok) {
      return res.status(403).json({
        ok: false,
        error: 'ACCESS_DENIED',
        message: 'Insufficient permissions'
      });
    }
    return next();
  };
}

const ALLOW = {
  OWNER_ONLY:        ['owner'],
  ADMIN:             ['owner', 'admin'],
  ADMIN_SALES:       ['owner', 'admin', 'admin_sales'],
  ANY_AUTHENTICATED: ['owner', 'admin', 'admin_sales', 'sales', 'agent', 'grower', 'buyer', 'guest']
};

module.exports = {
  requireRole,
  requireTier,
  requireAny,
  ALLOW
};
