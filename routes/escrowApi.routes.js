const express = require('express');
const router = express.Router();

const escrows = new Map();
let escrowIdCounter = 1000;

router.get('/', (req, res) => {
  const { status, buyer, seller } = req.query;
  let results = Array.from(escrows.values());
  if (status) results = results.filter(e => e.status === status);
  if (buyer) results = results.filter(e => e.buyer.includes(buyer));
  if (seller) results = results.filter(e => e.seller.includes(seller));
  res.json({ escrows: results, total: results.length });
});

router.post('/', (req, res) => {
  const { amount, buyer, seller, terms, deliverables } = req.body;
  const escrowId = 'ESC-' + (escrowIdCounter++);
  const escrow = {
    escrowId, amount, buyer, seller, terms,
    deliverables: deliverables || [],
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    auditTrail: [{ action: 'CREATED', timestamp: new Date().toISOString(), user: 'system' }]
  };
  escrows.set(escrowId, escrow);
  res.status(201).json({ success: true, escrow });
});

router.get('/:id', (req, res) => {
  const escrow = escrows.get(req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
  res.json({ escrow });
});

router.patch('/:id/activate', (req, res) => {
  const escrow = escrows.get(req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
  if (escrow.status !== 'PENDING') return res.status(400).json({ error: 'Can only activate PENDING escrows' });
  escrow.status = 'ACTIVE';
  escrow.activatedAt = new Date().toISOString();
  escrow.updatedAt = new Date().toISOString();
  escrow.auditTrail.push({ action: 'ACTIVATED', timestamp: new Date().toISOString(), user: 'system' });
  res.json({ success: true, escrow });
});

router.patch('/:id/release', (req, res) => {
  const escrow = escrows.get(req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
  if (escrow.status !== 'ACTIVE') return res.status(400).json({ error: 'Can only release ACTIVE escrows' });
  escrow.status = 'RELEASED';
  escrow.releasedAt = new Date().toISOString();
  escrow.updatedAt = new Date().toISOString();
  escrow.auditTrail.push({ action: 'RELEASED', timestamp: new Date().toISOString(), user: 'system', notes: req.body.notes });
  res.json({ success: true, escrow });
});

router.get('/stats/summary', (req, res) => {
  const all = Array.from(escrows.values());
  res.json({
    total: all.length,
    byStatus: {
      PENDING: all.filter(e => e.status === 'PENDING').length,
      ACTIVE: all.filter(e => e.status === 'ACTIVE').length,
      RELEASED: all.filter(e => e.status === 'RELEASED').length
    },
    totalValue: all.reduce((sum, e) => sum + (e.amount || 0), 0)
  });
});

module.exports = router;

