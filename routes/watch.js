// ============================================================
// watch-routes.js — SmartWatch Event Trigger API
// AuditDNA Backend | C:\AuditDNA\backend\routes\watch-routes.js
// Mount in server.js: app.use('/api/watch', require('./routes/watch-routes'));
// ============================================================

const express = require('express');
const router  = express.Router();
const notify  = require('../services/watch-notify');

// ── GET /api/watch/config ────────────────────────────────────
// Returns ntfy channel so frontend can show subscription QR
router.get('/config', (req, res) => {
  res.json({
    channel:   notify.CHANNEL,
    ntfyBase:  notify.NTFY_BASE,
    subscribe: `${notify.NTFY_BASE}/${notify.CHANNEL}`,
    qrData:    `${notify.NTFY_BASE}/${notify.CHANNEL}`,
  });
});

// ── POST /api/watch/test ─────────────────────────────────────
router.post('/test', async (req, res) => {
  const result = await notify.notifyTest();
  res.json(result);
});

// ── POST /api/watch/grs-tier ─────────────────────────────────
// Body: { growerName, oldTier, newTier, growerId }
router.post('/grs-tier', async (req, res) => {
  const { growerName, oldTier, newTier, growerId } = req.body;
  if (!growerName || oldTier == null || newTier == null || !growerId)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyGRSTierChange({ growerName, oldTier: Number(oldTier), newTier: Number(newTier), growerId });
  res.json(result);
});

// ── POST /api/watch/fsma-deadline ────────────────────────────
// Body: { growerName, lot, daysRemaining, dueDate }
router.post('/fsma-deadline', async (req, res) => {
  const { growerName, lot, daysRemaining, dueDate } = req.body;
  if (!growerName || !lot || daysRemaining == null || !dueDate)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyFSMADeadline({ growerName, lot, daysRemaining: Number(daysRemaining), dueDate });
  res.json(result);
});

// ── POST /api/watch/tracesafe-scan ───────────────────────────
// Body: { growerName, lot, product, location, success }
router.post('/tracesafe-scan', async (req, res) => {
  const { growerName, lot, product, location, success } = req.body;
  if (!growerName || !lot || !product || !location)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyTraceSafeScan({ growerName, lot, product, location, success: !!success });
  res.json(result);
});

// ── POST /api/watch/new-kyc ──────────────────────────────────
// Body: { growerName, growerId, tier, submittedAt }
router.post('/new-kyc', async (req, res) => {
  const { growerName, growerId, tier, submittedAt } = req.body;
  if (!growerName || !growerId || tier == null)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyNewKYC({
    growerName, growerId, tier,
    submittedAt: submittedAt || new Date().toISOString()
  });
  res.json(result);
});

// ── POST /api/watch/tier3-alert ──────────────────────────────
// Body: { growerName, growerId, reason }
router.post('/tier3-alert', async (req, res) => {
  const { growerName, growerId, reason } = req.body;
  if (!growerName || !growerId || !reason)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyTier3Escalation({ growerName, growerId, reason });
  res.json(result);
});

// ── POST /api/watch/loi-pipeline ─────────────────────────────
// Body: { dealName, stage, previousStage, amount }
router.post('/loi-pipeline', async (req, res) => {
  const { dealName, stage, previousStage, amount } = req.body;
  if (!dealName || !stage || !previousStage || amount == null)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyLOIPipeline({ dealName, stage, previousStage, amount });
  res.json(result);
});

// ── POST /api/watch/shipment ──────────────────────────────────
// Body: { shipmentId, product, status, location, delay? }
router.post('/shipment', async (req, res) => {
  const { shipmentId, product, status, location, delay } = req.body;
  if (!shipmentId || !product || !status || !location)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyShipmentStatus({ shipmentId, product, status, location, delay });
  res.json(result);
});

// ── POST /api/watch/market-alert ─────────────────────────────
// Body: { product, currentPrice, threshold, direction, region }
router.post('/market-alert', async (req, res) => {
  const { product, currentPrice, threshold, direction, region } = req.body;
  if (!product || currentPrice == null || threshold == null || !direction || !region)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyMarketAlert({ product, currentPrice, threshold, direction, region });
  res.json(result);
});

// ── POST /api/watch/water-alert ───────────────────────────────
// Body: { field, currentUsage, threshold, unit }
router.post('/water-alert', async (req, res) => {
  const { field, currentUsage, threshold, unit } = req.body;
  if (!field || currentUsage == null || threshold == null || !unit)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyWaterAlert({ field, currentUsage, threshold, unit });
  res.json(result);
});

// ── POST /api/watch/heat-warning ─────────────────────────────
// Body: { region, tempC, uvIndex, advisory }
router.post('/heat-warning', async (req, res) => {
  const { region, tempC, uvIndex, advisory } = req.body;
  if (!region || tempC == null || uvIndex == null || !advisory)
    return res.status(400).json({ error: 'Missing required fields' });
  const result = await notify.notifyHeatWarning({ region, tempC, uvIndex, advisory });
  res.json(result);
});

// ── POST /api/watch/new-lead ──────────────────────────────────
// Body: { name, source, phone?, email?, score, notes? }
router.post('/new-lead', async (req, res) => {
  const { name, source, phone, email, score, notes } = req.body;
  if (!name || !source || score == null)
    return res.status(400).json({ error: 'Missing required fields: name, source, score' });
  const result = await notify.notifyNewLead({ name, source, phone, email, score: Number(score), notes });
  res.json(result);
});

// ── POST /api/watch/buyer-inquiry ────────────────────────────
// Body: { buyerName, products[], quantity?, unit?, urgency, company?, phone?, email?, notes? }
router.post('/buyer-inquiry', async (req, res) => {
  const { buyerName, products, quantity, unit, urgency, company, phone, email, notes } = req.body;
  if (!buyerName || !products || !products.length || !urgency)
    return res.status(400).json({ error: 'Missing required fields: buyerName, products, urgency' });
  const result = await notify.notifyBuyerInquiry({ buyerName, company, products, quantity, unit, urgency, phone, email, notes });
  res.json(result);
});

module.exports = router;
