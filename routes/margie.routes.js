// =============================================================================
// MARGIE ROUTES - Audit Keeper API
// File: C:\AuditDNA\backend\routes\margie.routes.js
// =============================================================================

'use strict';

const express = require('express');
const router  = express.Router();
const margie  = require('../services/margie-audit-keeper');

router.get('/status',   (req, res) => res.json(margie.getStatus()));

router.get('/timeline', async (req, res) => {
  const limit = parseInt(req.query.limit || '200', 10);
  const rows = await margie.getTimeline(limit);
  res.json({ ok: true, count: rows.length, entries: rows });
});

router.get('/agent/:name', async (req, res) => {
  const limit = parseInt(req.query.limit || '100', 10);
  const rows = await margie.getAgentActivity(req.params.name.toUpperCase(), limit);
  res.json({ ok: true, agent: req.params.name.toUpperCase(), count: rows.length, entries: rows });
});

router.get('/today', async (req, res) => {
  const rows = await margie.getToday();
  res.json({ ok: true, count: rows.length, entries: rows });
});

router.get('/stats', async (req, res) => {
  const stats = await margie.getStats();
  res.json(stats);
});

module.exports = router;
