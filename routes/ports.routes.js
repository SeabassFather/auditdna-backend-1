const express = require('express');
const router = express.Router();

// GET /api/ports/status
router.get('/status', (req, res) => {
  const ports = [
    { port: 'Laredo, TX', status: 'OPERATIONAL', utilization: 85, avgWaitTime: '45 min' },
    { port: 'Nogales, AZ', status: 'OPERATIONAL', utilization: 78, avgWaitTime: '35 min' },
    { port: 'Otay Mesa, CA', status: 'DELAYED', utilization: 98, avgWaitTime: '120 min' }
  ];
  res.json({ ports, timestamp: new Date().toISOString() });
});

// GET /api/ports/customs
router.get('/customs', (req, res) => {
  const customs = [
    { clearanceId: 'CLR-001', port: 'Laredo, TX', status: 'CLEARED' },
    { clearanceId: 'CLR-002', port: 'Nogales, AZ', status: 'PENDING' }
  ];
  res.json({ customs, total: customs.length });
});

module.exports = router;
