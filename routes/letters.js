// ════════════════════════════════════════════════════════════════════════════
// LETTERS ROUTE — Stub (prevents startup crash)
// Save to: C:\AuditDNA\backend\routes\letters.js
// ════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, module: 'letters', status: 'stub' });
});

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Letters module initializing' });
});

router.post('/generate', (req, res) => {
  res.json({ success: true, message: 'Letter generation coming soon' });
});

module.exports = router;
