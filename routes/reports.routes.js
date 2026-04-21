const express = require('express');
const router = express.Router();

// GET /api/reports
router.get('/', (req, res) => {
  const reports = [
    { id: 'RPT-001', title: 'Weekly Market Summary', status: 'COMPLETED', format: 'PDF' },
    { id: 'RPT-002', title: 'Grower Performance Report', status: 'COMPLETED', format: 'XLSX' }
  ];
  res.json({ reports, total: reports.length });
});

// POST /api/reports/generate
router.post('/generate', (req, res) => {
  const report = {
    id: 'RPT-' + Date.now(),
    status: 'PROCESSING',
    progress: 0
  };
  res.status(201).json({ success: true, report });
});

module.exports = router;

