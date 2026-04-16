const express = require('express');
const router = express.Router();

const traceRecords = new Map();
let traceIdCounter = 2000;

router.post('/', (req, res) => {
  const { product, lot, origin, destination, ctePairs = [] } = req.body;
  const traceId = 'TRC-' + (traceIdCounter++);
  const record = {
    traceId, product, lot, origin, destination,
    ctePairs,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [{ event: 'CREATED', timestamp: new Date().toISOString(), location: origin }]
  };
  traceRecords.set(traceId, record);
  res.status(201).json({ success: true, record });
});

router.get('/', (req, res) => {
  const { product, lot, status } = req.query;
  let results = Array.from(traceRecords.values());
  if (product) results = results.filter(r => r.product.includes(product));
  if (lot) results = results.filter(r => r.lot === lot);
  if (status) results = results.filter(r => r.status === status);
  res.json({ records: results, total: results.length });
});

router.get('/:id', (req, res) => {
  const record = traceRecords.get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Trace record not found' });
  res.json({ record });
});

router.post('/:id/event', (req, res) => {
  const record = traceRecords.get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Trace record not found' });
  const { event, location, temperature, notes } = req.body;
  const newEvent = { event, location, temperature, notes, timestamp: new Date().toISOString() };
  record.events.push(newEvent);
  record.updatedAt = new Date().toISOString();
  res.json({ success: true, record });
});

router.get('/lot/:lotNumber', (req, res) => {
  const results = Array.from(traceRecords.values()).filter(r => r.lot === req.params.lotNumber);
  res.json({ lot: req.params.lotNumber, records: results });
});

router.get('/stats/summary', (req, res) => {
  const all = Array.from(traceRecords.values());
  res.json({
    total: all.length,
    byStatus: {
      ACTIVE: all.filter(r => r.status === 'ACTIVE').length,
      COMPLETED: all.filter(r => r.status === 'COMPLETED').length,
      RECALLED: all.filter(r => r.status === 'RECALLED').length
    },
    totalEvents: all.reduce((sum, r) => sum + r.events.length, 0)
  });
});

module.exports = router;
