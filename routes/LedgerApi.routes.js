const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const ledgerEntries = [];
let entryIdCounter = 1;

function computeHash(entry) {
  const data = JSON.stringify({
    entryId: entry.entryId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    timestamp: entry.timestamp,
    previousHash: entry.previousHash
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

router.post('/', (req, res) => {
  const { entityType, entityId, action, data, userId } = req.body;
  const previousHash = ledgerEntries.length > 0 
    ? ledgerEntries[ledgerEntries.length - 1].hash 
    : '0000000000000000000000000000000000000000000000000000000000000000';
  const entry = {
    entryId: 'LED-' + (entryIdCounter++),
    entityType, entityId, action,
    data: data || {},
    userId: userId || 'system',
    timestamp: new Date().toISOString(),
    previousHash
  };
  entry.hash = computeHash(entry);
  ledgerEntries.push(entry);
  res.status(201).json({ success: true, entry });
});

router.get('/', (req, res) => {
  const { entityType, entityId, action, limit = 100 } = req.query;
  let results = [...ledgerEntries];
  if (entityType) results = results.filter(e => e.entityType === entityType);
  if (entityId) results = results.filter(e => e.entityId === entityId);
  if (action) results = results.filter(e => e.action === action);
  results = results.slice(-limit).reverse();
  res.json({ entries: results, total: ledgerEntries.length });
});

router.get('/verify', (req, res) => {
  let isValid = true;
  let invalidEntry = null;
  for (let i = 0; i < ledgerEntries.length; i++) {
    const entry = ledgerEntries[i];
    const recomputedHash = computeHash(entry);
    if (entry.hash !== recomputedHash) {
      isValid = false;
      invalidEntry = entry.entryId;
      break;
    }
    if (i > 0) {
      const prevHash = ledgerEntries[i - 1].hash;
      if (entry.previousHash !== prevHash) {
        isValid = false;
        invalidEntry = entry.entryId;
        break;
      }
    }
  }
  res.json({ isValid, totalEntries: ledgerEntries.length, invalidEntry });
});

router.get('/trail/:entityType/:entityId', (req, res) => {
  const { entityType, entityId } = req.params;
  const trail = ledgerEntries.filter(e => e.entityType === entityType && e.entityId === entityId);
  res.json({ 
    entityType, entityId, trail, 
    totalEvents: trail.length,
    firstEvent: trail[0] ? trail[0].timestamp : null,
    lastEvent: trail[trail.length - 1] ? trail[trail.length - 1].timestamp : null
  });
});

module.exports = router;