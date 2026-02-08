const express = require('express');
const router = express.Router();

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = [
    { id: 'user1', email: 'admin@auditdna.com', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'user2', email: 'manager@auditdna.com', role: 'MANAGER', status: 'ACTIVE' }
  ];
  res.json({ users, total: users.length });
});

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const stats = {
    users: { total: 2, active: 2 },
    system: { uptime: process.uptime(), memory: process.memoryUsage() }
  };
  res.json({ stats });
});

module.exports = router;
