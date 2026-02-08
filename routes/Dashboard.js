// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD ROUTES - CM Products International / MexaUSA Food Group, Inc.
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/stats - Dashboard Statistics
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/stats', (req, res) => {
  res.json({
    totalGrowers: 5000,
    activeBuyers: 3000,
    activeContracts: 234,
    monthlyRevenue: 12500000,
    pendingInvoices: 67,
    avgMargin: 18.5,
    alerts: 12,
    openLoads: 45,
    completedLoads: 892,
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/recent-activity - Recent Activity Feed
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/recent-activity', (req, res) => {
  res.json({
    activities: [
      { id: 1, type: 'SHIPMENT', message: 'Load #8921 delivered to Walmart DC', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 2, type: 'INVOICE', message: 'Invoice #INV-4521 paid by Costco', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: 3, type: 'ALERT', message: 'Quality issue detected in Load #8920', timestamp: new Date(Date.now() - 10800000).toISOString() },
      { id: 4, type: 'CONTRACT', message: 'New contract signed with Garcia Farms', timestamp: new Date(Date.now() - 14400000).toISOString() }
    ]
  });
});

module.exports = router;