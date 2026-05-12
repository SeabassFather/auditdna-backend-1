'use strict';
// gmailBounceHarvester.js
// STUB - 2026-05-07
// Original module was missing. This stub satisfies the require() in server.js
// so it stops emitting [FAIL] gmailBounceHarvester errors at boot.
// All endpoints respond with 501 Not Implemented until full module is restored.

const express = require('express');
const router = express.Router();

router.get('/bounces', (req, res) => {
  res.status(501).json({
    ok: false,
    error: 'gmailBounceHarvester not implemented',
    message: 'Stub module - full implementation pending',
  });
});

router.get('/bounces/health', (req, res) => {
  res.json({
    ok: true,
    stub: true,
    module: 'gmailBounceHarvester',
    status: 'stub-online',
    timestamp: new Date().toISOString(),
  });
});

router.post('/bounces/scan', (req, res) => {
  res.status(501).json({
    ok: false,
    error: 'gmailBounceHarvester scan not implemented',
    message: 'Stub module - returns no results',
    bounces: [],
  });
});

console.log('[gmailBounceHarvester] STUB loaded - returns 501 on all endpoints except /health');

module.exports = router;
