// =============================================================================
// EMMA ROUTES - OAuth Medic API
// File: C:\AuditDNA\backend\routes\emma.routes.js
// =============================================================================

'use strict';

const express = require('express');
const router  = express.Router();
const emma    = require('../services/emma-oauth-medic');

router.get('/status', (req, res) => {
  res.json(emma.getStatus());
});

router.get('/proposals', async (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  const proposals = await emma.getProposals(limit);
  res.json({ ok: true, count: proposals.length, proposals });
});

router.get('/proposals/:id', async (req, res) => {
  const p = await emma.getProposal(parseInt(req.params.id, 10));
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, proposal: p });
});

router.post('/approve/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const approvedBy = req.body?.approved_by || 'saul';
  const result = await emma.approveProposal(id, approvedBy);
  res.json(result);
});

router.post('/reject/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const rejectedBy = req.body?.rejected_by || 'saul';
  const reason = req.body?.reason || null;
  const result = await emma.rejectProposal(id, rejectedBy, reason);
  res.json(result);
});

router.post('/test-now', async (req, res) => {
  const result = await emma.testNow();
  res.json({ ...emma.getStatus(), test_result: result });
});

router.post('/force-refresh', async (req, res) => {
  const result = await emma.forceRefresh();
  res.json(result);
});

module.exports = router;
