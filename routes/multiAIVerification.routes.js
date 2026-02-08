const express = require('express');
const router = express.Router();

router.post('/verify', async (req, res) => {
  res.json({
    verification: 'multi-ai',
    engines: ['openai', 'anthropic'],
    verdict: 'analysis_pending',
    input: req.body || {}
  });
});

module.exports = router;
