const express = require('express');
const router = express.Router();

let mortgageApplications = [];

// GET /api/mortgage/dashboard
router.get('/dashboard', (req, res) => {
    res.json({
        totalApplications: mortgageApplications.length,
        pendingReview: mortgageApplications.filter(a => a.status === 'pending').length,
        approved: mortgageApplications.filter(a => a.status === 'approved').length,
        funded: mortgageApplications.filter(a => a.status === 'funded').length,
        totalVolume: mortgageApplications.reduce((s, a) => s + a.loanAmount, 0)
    });
});

// GET /api/mortgage/applications
router.get('/applications', (req, res) => {
    res.json({ data: mortgageApplications });
});

// POST /api/mortgage/applications
router.post('/applications', (req, res) => {
    const app = {
        id: mortgageApplications.length + 1,
        applicationId: `MTG-${Date.now().toString().slice(-8)}`,
        ...req.body,
        status: 'pending',
        createdAt: new Date()
    };
    mortgageApplications.push(app);
    res.status(201).json({ data: app });
});

// GET /api/mortgage/calculator
router.get('/calculator', (req, res) => {
    const { loanAmount = 300000, interestRate = 6.5, termYears = 30, downPayment = 60000 } = req.query;
    const principal = parseFloat(loanAmount) - parseFloat(downPayment);
    const monthlyRate = parseFloat(interestRate) / 100 / 12;
    const numPayments = parseInt(termYears) * 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const totalPayments = monthlyPayment * numPayments;
    const totalInterest = totalPayments - principal;
    
    res.json({
        loanAmount: parseFloat(loanAmount),
        downPayment: parseFloat(downPayment),
        principal: principal.toFixed(2),
        interestRate: parseFloat(interestRate),
        termYears: parseInt(termYears),
        monthlyPayment: monthlyPayment.toFixed(2),
        totalPayments: totalPayments.toFixed(2),
        totalInterest: totalInterest.toFixed(2),
        ltv: ((principal / parseFloat(loanAmount)) * 100).toFixed(1)
    });
});

// GET /api/mortgage/rates
router.get('/rates', (req, res) => {
    res.json({
        data: [
            { product: '30-Year Fixed', rate: 6.625, apr: 6.75, points: 0 },
            { product: '15-Year Fixed', rate: 5.875, apr: 6.0, points: 0 },
            { product: '5/1 ARM', rate: 5.5, apr: 6.25, points: 0 },
            { product: 'FHA 30-Year', rate: 6.25, apr: 7.1, points: 0 },
            { product: 'VA 30-Year', rate: 6.0, apr: 6.25, points: 0 },
            { product: 'USDA 502', rate: 6.125, apr: 6.35, points: 0 }
        ],
        lastUpdated: new Date().toISOString()
    });
});

// PUT /api/mortgage/applications/:id
router.put('/applications/:id', (req, res) => {
    const idx = mortgageApplications.findIndex(a => a.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Application not found' });
    mortgageApplications[idx] = { ...mortgageApplications[idx], ...req.body, updatedAt: new Date() };
    res.json({ data: mortgageApplications[idx] });
});

module.exports = router;
