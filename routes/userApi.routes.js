// ═══════════════════════════════════════════════════════════════════════════════════════════
// AUDITDNA - USER API ROUTES (CommonJS)
// Mexausa Food Group, Inc. | AuditDNA Platform
// ═══════════════════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ROLES & SCOPES
// ═══════════════════════════════════════════════════════════════════════════════════════════
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CM_ADMIN: 'cm_admin',
  SALES_REP: 'sales_rep',
  GROWER: 'grower',
  BUYER: 'buyer',
  COMPLIANCE_OFFICER: 'compliance_officer',
  INVESTIGATOR: 'investigator',
  OPERATOR: 'operator',
  CLIENT: 'client'
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════════════════════════
const users = new Map();

// Initialize with sample users
users.set('usr_admin_001', {
  id: 'usr_admin_001',
  email: 'admin@auditdna.com',
  first_name: 'System',
  last_name: 'Administrator',
  role: ROLES.SUPER_ADMIN,
  status: 'ACTIVE',
  created_at: '2025-01-01T00:00:00Z'
});

users.set('usr_inv_001', {
  id: 'usr_inv_001',
  email: 'investigator@auditdna.com',
  first_name: 'Jane',
  last_name: 'Investigator',
  role: ROLES.INVESTIGATOR,
  status: 'ACTIVE',
  created_at: '2025-06-15T10:00:00Z'
});

users.set('usr_op_001', {
  id: 'usr_op_001',
  email: 'operator@auditdna.com',
  first_name: 'John',
  last_name: 'Operator',
  role: ROLES.OPERATOR,
  status: 'ACTIVE',
  created_at: '2025-08-20T14:30:00Z'
});

users.set('usr_grower_001', {
  id: 'usr_grower_001',
  email: 'grower@example.com',
  first_name: 'Carlos',
  last_name: 'Mendez',
  role: ROLES.GROWER,
  status: 'ACTIVE',
  created_at: '2025-09-01T08:00:00Z'
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET ALL USERS
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { role, status, search, limit = 100 } = req.query;
    
    let results = Array.from(users.values());
    
    if (role) results = results.filter(u => u.role === role);
    if (status) results = results.filter(u => u.status === status);
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(u => 
        u.email.toLowerCase().includes(s) ||
        u.first_name?.toLowerCase().includes(s) ||
        u.last_name?.toLowerCase().includes(s)
      );
    }
    
    // Don't expose password hashes
    results = results.map(({ password_hash, ...u }) => u);
    results = results.slice(0, Number(limit));
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET SINGLE USER
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CREATE USER
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { email, first_name, last_name, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // Check for duplicate email
    for (const [_, u] of users) {
      if (u.email === email.toLowerCase()) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }
    
    const user = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      first_name: first_name || '',
      last_name: last_name || '',
      role: role || ROLES.CLIENT,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      created_by: req.user?.sub || 'SYSTEM'
    };
    
    users.set(user.id, user);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// UPDATE USER
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { first_name, last_name, role, status } = req.body;
    
    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    
    user.updated_at = new Date().toISOString();
    user.updated_by = req.user?.sub || 'SYSTEM';
    
    users.set(user.id, user);
    
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// DELETE USER (Soft)
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.status = 'INACTIVE';
    user.deleted_at = new Date().toISOString();
    user.deleted_by = req.user?.sub || 'SYSTEM';
    
    users.set(user.id, user);
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CHANGE USER ROLE
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/:id/role', async (req, res) => {
  try {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { role } = req.body;
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role', validRoles: Object.values(ROLES) });
    }
    
    user.role = role;
    user.role_changed_at = new Date().toISOString();
    user.role_changed_by = req.user?.sub || 'SYSTEM';
    
    users.set(user.id, user);
    
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// LOCK/UNLOCK USER
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/:id/lock', async (req, res) => {
  try {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.status = 'LOCKED';
    user.locked_at = new Date().toISOString();
    user.locked_by = req.user?.sub || 'SYSTEM';
    user.lock_reason = req.body.reason || 'Administrative lock';
    
    users.set(user.id, user);
    res.json({ success: true, message: 'User locked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/unlock', async (req, res) => {
  try {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.status = 'ACTIVE';
    user.unlocked_at = new Date().toISOString();
    user.unlocked_by = req.user?.sub || 'SYSTEM';
    
    users.set(user.id, user);
    res.json({ success: true, message: 'User unlocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/stats/summary', async (req, res) => {
  try {
    const all = Array.from(users.values());
    
    const stats = {
      total: all.length,
      active: all.filter(u => u.status === 'ACTIVE').length,
      inactive: all.filter(u => u.status === 'INACTIVE').length,
      locked: all.filter(u => u.status === 'LOCKED').length,
      byRole: {}
    };
    
    all.forEach(u => {
      stats.byRole[u.role] = (stats.byRole[u.role] || 0) + 1;
    });
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/reference/roles', (req, res) => {
  res.json({ success: true, data: Object.values(ROLES) });
});

module.exports = router;