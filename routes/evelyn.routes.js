// =============================================================================
// EVELYN ROUTES - Code Janitor API
// File: C:\AuditDNA\backend\routes\evelyn.routes.js
// =============================================================================

'use strict';

const express = require('express');
const router  = express.Router();
const evelyn  = require('../services/evelyn-code-janitor');

router.get('/status', (req, res) => {
  res.json(evelyn.getStatus());
});

router.get('/proposals', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.kind)   filter.kind   = req.query.kind;
  const limit = parseInt(req.query.limit || '100', 10);
  const proposals = await evelyn.getProposals(filter, limit);
  res.json({ ok: true, count: proposals.length, proposals });
});

router.get('/proposals/:id', async (req, res) => {
  const p = await evelyn.getProposal(parseInt(req.params.id, 10));
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, proposal: p });
});

router.post('/approve/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const approvedBy = req.body?.approved_by || 'saul';
  const result = await evelyn.approveProposal(id, approvedBy);
  res.json(result);
});

router.post('/reject/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const rejectedBy = req.body?.rejected_by || 'saul';
  const reason = req.body?.reason || null;
  const result = await evelyn.rejectProposal(id, rejectedBy, reason);
  res.json(result);
});

router.post('/scan-now', async (req, res) => {
  const result = await evelyn.scanNow();
  res.json(result);
});

// Bulk approve all proposed (with optional kind filter)
router.post('/approve-all', async (req, res) => {
  const filter = {};
  if (req.body?.kind) filter.kind = req.body.kind;
  const result = await evelyn.bulkApprove(filter);
  res.json(result);
});

module.exports = router;
