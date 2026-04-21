const express = require('express');
const router = express.Router();

// GET /api/notifications
router.get('/', (req, res) => {
  const notifications = [
    { id: 'NOTIF-001', type: 'ESCROW_ACTIVATED', priority: 'HIGH', title: 'Escrow Activated', read: false },
    { id: 'NOTIF-002', type: 'PAYMENT_DUE', priority: 'MEDIUM', title: 'Payment Due Soon', read: false }
  ];
  res.json({ notifications, total: notifications.length, unread: 2 });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => {
  res.json({ success: true, notificationId: req.params.id });
});

module.exports = router;

