// ===================================================================
// GROWER WORKFLOW ROUTES
// ===================================================================

const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ status: 'active', workflows: 12 });
});

router.get('/pending', (req, res) => {
  res.json({ pending: [] });
});

router.post('/start', (req, res) => {
  res.json({ success: true, workflowId: Date.now() });
});

module.exports = router;