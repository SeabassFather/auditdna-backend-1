// =============================================================================
// File: emailScraper.js
// Save to: C:\AuditDNA\backend\routes\emailScraper.js
// =============================================================================
// Sprint D Wave 3C - Email scraper placeholder
// Stops [WARN] emailScraper not found.
// Real scraping (Gmail thread mining, etc.) lives in gmail-related routes already.
// This is a lightweight router to satisfy the require() chain.
// =============================================================================

const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true, service: 'emailScraper', version: '3C',
    note: 'placeholder - real Gmail scraping handled by /api/gmail routes'
  });
});

router.get('/status', (req, res) => {
  res.json({ ok: true, scraper_active: false, queue_depth: 0 });
});

module.exports = router;
