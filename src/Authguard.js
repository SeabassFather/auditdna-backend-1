// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTH MIDDLEWARE â€” JWT Route Protection
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Usage: const { requireAuth } = require('./middleware/authGuard');
//        router.get('/protected', requireAuth, handler);
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'AuditDNA_JWT_Secret_2026_MFG_Saul_CHANGE_THIS';

// Require valid JWT token
function requireAuth(req, res, next) {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      // Token expired or invalid â€” fall through to session check
    }
  }

  // Fallback: check session
  if (req.session && req.session.userId) {
    req.user = { userId: req.session.userId, username: req.session.username, role: req.session.role };
    return next();
  }

  return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
}

// Require owner role
function requireOwner(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access required', code: 'FORBIDDEN' });
    }
    next();
  });
}

module.exports = { requireAuth, requireOwner };

