// =============================================================================
// GG ROUTES
// File: C:\AuditDNA\backend\routes\gg.routes.js
//
// GET  /api/gg/status              - current SMTP health + last error
// GET  /api/gg/proposals           - list last 20 proposals
// GET  /api/gg/proposals/:id       - full proposal detail incl. Claude JSON
// POST /api/gg/approve/:id         - mark proposal approved (does NOT mutate .env)
// POST /api/gg/reject/:id          - reject proposal
// POST /api/gg/test-now            - trigger immediate verify() check
// =============================================================================

const express = require('express');
const router = express.Router();

let gg = null;
function getGG() {
  if (!gg) {
    try { gg = require('../services/gg-smtp-medic'); }
    catch (e) { console.warn('[gg.routes] gg-smtp-medic not loaded:', e.message); }
  }
  return gg;
}

router.get('/status', async (req, res) => {
  const g = getGG();
  if (!g) return res.status(503).json({ ok: false, error: 'GG service unavailable' });
  try {
    const status = await g.getStatus();
    res.json({ ok: true, ...status, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/proposals', async (req, res) => {
  const g = getGG();
  if (!g) return res.status(503).json({ ok: false, error: 'GG service unavailable' });
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const proposals = await g.listProposals(limit);
    res.json({ ok: true, proposals, count: proposals.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/proposals/:id', async (req, res) => {
  const g = getGG();
  if (!g) return res.status(503).json({ ok: false, error: 'GG service unavailable' });
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid id' });
    const proposal = await g.getProposal(id);
    if (!proposal) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, proposal });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/approve/:id', async (req, res) => {
  const g = getGG();
  if (!g) return res.status(503).json({ ok: false, error: 'GG service unavailable' });
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid id' });
    const approver = (req.body && req.body.approver) || req.headers['x-user'] || 'saul';
    const result = await g.approveProposal(id, approver);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/reject/:id', async (req, res) => {
  const g = getGG();
  if (!g) return res.status(503).json({ ok: false, error: 'GG service unavailable' });
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'invalid id' });
    const reason = (req.body && req.body.reason) || 'no_reason_given';
    const result = await g.rejectProposal(id, reason);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/test-now', async (req, res) => {
  const g = getGG();
  if (!g) return res.status(503).json({ ok: false, error: 'GG service unavailable' });
  try {
    const status = await g.testNow();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/health', (req, res) => res.json({ ok: true, agent: 'GG', service: 'smtp-medic' }));

module.exports = router;
