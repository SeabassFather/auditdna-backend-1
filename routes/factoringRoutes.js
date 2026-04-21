const express = require('express');
const router = express.Router();

let factoringDeals = [];

// GET /api/factoring/dashboard
router.get('/dashboard', (req, res) => {
    res.json({
        totalFactored: 2450000,
        activeDeals: 12,
        avgAdvanceRate: 85,
        avgFeePercent: 2.8,
        totalFeesCollected: 68600,
        portfolioHealth: 'Good'
    });
});

// GET /api/factoring/deals
router.get('/deals', (req, res) => {
    res.json({ data: factoringDeals });
});

// POST /api/factoring/deals
router.post('/deals', (req, res) => {
    const { clientId, clientName, invoiceNumber, invoiceAmount, debtor, advanceRate, feePercent, terms } = req.body;
    const advanceAmount = invoiceAmount * (advanceRate / 100);
    const feeAmount = invoiceAmount * (feePercent / 100);
    const effectiveAPR = ((feePercent / terms) * 365 * 100).toFixed(2);
    
    const deal = {
        id: factoringDeals.length + 1,
        dealId: `FCT-${Date.now().toString().slice(-8)}`,
        clientId, clientName, invoiceNumber, invoiceAmount,
        debtor, advanceRate, advanceAmount, feePercent, feeAmount,
        terms, effectiveAPR, status: 'active',
        createdAt: new Date()
    };
    factoringDeals.push(deal);
    res.status(201).json({ data: deal });
});

// GET /api/factoring/calculator
router.get('/calculator', (req, res) => {
    const { invoiceAmount = 10000, advanceRate = 85, feePercent = 3, terms = 30 } = req.query;
    const amt = parseFloat(invoiceAmount);
    const adv = parseFloat(advanceRate);
    const fee = parseFloat(feePercent);
    const t = parseInt(terms);
    
    const advanceAmount = amt * (adv / 100);
    const feeAmount = amt * (fee / 100);
    const effectiveAPR = ((fee / t) * 365 * 100).toFixed(2);
    const netToClient = advanceAmount - feeAmount;
    const reserveAmount = amt - advanceAmount;
    
    res.json({
        invoiceAmount: amt,
        advanceRate: adv,
        advanceAmount: advanceAmount.toFixed(2),
        feePercent: fee,
        feeAmount: feeAmount.toFixed(2),
        terms: t,
        effectiveAPR,
        netToClient: netToClient.toFixed(2),
        reserveAmount: reserveAmount.toFixed(2),
        warning: effectiveAPR > 30 ? 'EFFECTIVE APR EXCEEDS 30%!' : null
    });
});

// PUT /api/factoring/deals/:id
router.put('/deals/:id', (req, res) => {
    const idx = factoringDeals.findIndex(d => d.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Deal not found' });
    factoringDeals[idx] = { ...factoringDeals[idx], ...req.body, updatedAt: new Date() };
    res.json({ data: factoringDeals[idx] });
});

module.exports = router;

