// ═══════════════════════════════════════════════════════════════════════════════
// SEED TESTING ROUTES - CONSOLIDATED MASTER FILE
// Mexausa Food Group, Inc. / MexaUSA Food Group, Inc.
// Seed quality testing, germination analysis, and certification
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// SEED VARIETIES AND OPTIMAL GERMINATION RATES
// ═══════════════════════════════════════════════════════════════════════════════
const VARIETIES = {
    tomato: [
        { variety: 'Roma VF', optimalGerm: 95, vigor: 'High' },
        { variety: 'Beefsteak', optimalGerm: 90, vigor: 'High' },
        { variety: 'Cherry Sweet', optimalGerm: 92, vigor: 'High' }
    ],
    pepper: [
        { variety: 'Bell Boy', optimalGerm: 85, vigor: 'Medium' },
        { variety: 'Jalapeño', optimalGerm: 88, vigor: 'High' },
        { variety: 'Serrano', optimalGerm: 91, vigor: 'High' }
    ],
    strawberry: [
        { variety: 'Albion', optimalGerm: 70, vigor: 'Medium' },
        { variety: 'Chandler', optimalGerm: 65, vigor: 'Medium' },
        { variety: 'San Andreas', optimalGerm: 75, vigor: 'High' }
    ],
    avocado: [
        { variety: 'Hass', optimalGerm: 94, vigor: 'Excellent' },
        { variety: 'Fuerte', optimalGerm: 90, vigor: 'High' }
    ],
    lettuce: [
        { variety: 'Romaine', optimalGerm: 85, vigor: 'Medium' },
        { variety: 'Iceberg', optimalGerm: 80, vigor: 'Medium' }
    ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEED TEST RESULTS
// ═══════════════════════════════════════════════════════════════════════════════
let seedTests = [
    { id: 'SEED-001', testId: 'SEED-001', variety: 'Hass Avocado', supplier: 'Viveros del Valle', lotNumber: 'HAV-2026-001', germination: 94.5, purity: 99.2, moisture: 8.3, vigor: 'High', date: '2026-02-03', status: 'certified', crop: 'avocado' },
    { id: 'SEED-002', testId: 'SEED-002', variety: 'San Andreas Strawberry', supplier: 'Berry Genetics Inc', lotNumber: 'SAS-2026-015', germination: 97.2, purity: 99.8, moisture: 6.1, vigor: 'Excellent', date: '2026-02-02', status: 'certified', crop: 'strawberry' },
    { id: 'SEED-003', testId: 'SEED-003', variety: 'Roma Tomato', supplier: 'Semillas del Sol', lotNumber: 'ROM-2026-008', germination: 88.4, purity: 98.5, moisture: 7.8, vigor: 'Medium', date: '2026-02-01', status: 'conditional', crop: 'tomato' },
    { id: 'SEED-004', testId: 'SEED-004', variety: 'Serrano Pepper', supplier: 'Chile Seeds MX', lotNumber: 'SER-2026-022', germination: 91.7, purity: 99.1, moisture: 7.2, vigor: 'High', date: '2026-01-31', status: 'certified', crop: 'pepper' },
    { id: 'SEED-005', testId: 'SEED-005', variety: 'Romaine Lettuce', supplier: 'Leafy Greens Co', lotNumber: 'ROM-2026-033', germination: 82.3, purity: 97.8, moisture: 9.1, vigor: 'Low', date: '2026-01-30', status: 'rejected', crop: 'lettuce' }
];

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/seedtestingroutes/dashboard - Dashboard Summary
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', (req, res) => {
    const passed = seedTests.filter(t => t.status === 'certified' || t.status === 'passed').length;
    const avgGermination = seedTests.reduce((sum, t) => sum + t.germination, 0) / seedTests.length;
    
    res.json({ 
        success: true,
        totalTests: seedTests.length, 
        passedTests: passed, 
        certifiedTests: seedTests.filter(t => t.status === 'certified').length,
        passRate: seedTests.length > 0 ? ((passed / seedTests.length) * 100).toFixed(1) : 0,
        avgGermination: avgGermination.toFixed(1)
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/seedtestingroutes/varieties - Available Seed Varieties
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/varieties', (req, res) => {
    res.json({ success: true, data: VARIETIES });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/seedtestingroutes/recent-results - Recent Seed Test Results
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/recent-results', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    res.json({
        success: true,
        count: seedTests.length,
        results: seedTests.slice(0, limit),
        summary: {
            certified: seedTests.filter(t => t.status === 'certified').length,
            conditional: seedTests.filter(t => t.status === 'conditional').length,
            rejected: seedTests.filter(t => t.status === 'rejected').length,
            avgGermination: Math.round(seedTests.reduce((a, t) => a + t.germination, 0) / seedTests.length * 10) / 10
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/seedtestingroutes/stats - Seed Testing Statistics
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/stats', (req, res) => {
    const avgGermination = seedTests.reduce((sum, t) => sum + t.germination, 0) / seedTests.length;
    const avgPurity = seedTests.reduce((sum, t) => sum + (t.purity || 0), 0) / seedTests.length;
    
    res.json({
        success: true,
        totalTests: seedTests.length,
        testsThisMonth: seedTests.filter(t => new Date(t.date) > new Date(Date.now() - 30*24*60*60*1000)).length,
        certificationRate: ((seedTests.filter(t => t.status === 'certified').length / seedTests.length) * 100).toFixed(1),
        avgGermination: avgGermination.toFixed(1),
        avgPurity: avgPurity.toFixed(1),
        pendingTests: 0,
        suppliersActive: [...new Set(seedTests.map(t => t.supplier))].length
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/seedtestingroutes/suppliers - Approved Seed Suppliers
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/suppliers', (req, res) => {
    const suppliers = [
        { name: 'Viveros del Valle', rating: 4.8, lotsSupplied: 45, certificationRate: 97, location: 'Mexico' },
        { name: 'Berry Genetics Inc', rating: 4.9, lotsSupplied: 32, certificationRate: 99, location: 'USA' },
        { name: 'Semillas del Sol', rating: 4.5, lotsSupplied: 28, certificationRate: 89, location: 'Mexico' },
        { name: 'Chile Seeds MX', rating: 4.7, lotsSupplied: 19, certificationRate: 94, location: 'Mexico' },
        { name: 'Leafy Greens Co', rating: 4.2, lotsSupplied: 22, certificationRate: 82, location: 'USA' }
    ];
    
    res.json({ success: true, count: suppliers.length, suppliers });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/seedtestingroutes/test - Run Germination Test
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/test', (req, res) => {
    const { growerId, growerName, supplier, seedLot, crop, variety, seedsPlanted, seedsGerminated, purity, moisture } = req.body;
    
    const germinationRate = ((seedsGerminated / seedsPlanted) * 100);
    const varietyInfo = VARIETIES[crop?.toLowerCase()]?.find(v => v.variety === variety);
    const expectedRate = varietyInfo?.optimalGerm || 85;
    
    // Determine status
    let status = 'failed';
    if (germinationRate >= expectedRate * 0.9) {
        status = 'certified';
    } else if (germinationRate >= expectedRate * 0.75) {
        status = 'conditional';
    }
    
    const test = { 
        id: `SEED-${Date.now()}`,
        testId: `GT-${Date.now().toString().slice(-8)}`, 
        growerId, 
        growerName, 
        supplier: supplier || 'Unknown',
        seedLot: seedLot || 'Unknown',
        lotNumber: seedLot || 'Unknown',
        crop, 
        variety, 
        seedsPlanted, 
        seedsGerminated, 
        germination: parseFloat(germinationRate.toFixed(1)),
        germinationRate: germinationRate.toFixed(1), 
        expectedRate,
        purity: purity || 0,
        moisture: moisture || 0,
        vigor: varietyInfo?.vigor || 'Unknown',
        status,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date() 
    };
    
    seedTests.unshift(test);
    
    res.status(201).json({ success: true, data: test });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/seedtestingroutes/submit - Submit Seed for Testing
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/submit', (req, res) => {
    const { variety, supplier, lotNumber, quantity, requestedBy, crop } = req.body;
    
    const submission = {
        id: `SEED-${Date.now()}`,
        variety: variety || 'Unknown',
        supplier: supplier || 'Unknown',
        lotNumber: lotNumber || `LOT-${Date.now()}`,
        quantity: quantity || 0,
        crop: crop || 'Unknown',
        requestedBy: requestedBy || 'System',
        status: 'pending',
        submittedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    res.json({ success: true, submission, message: 'Seed submitted for testing - results in 7 days' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/seedtestingroutes/tests - All Seed Tests
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/tests', (req, res) => {
    res.json({ success: true, count: seedTests.length, data: seedTests });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/seedtestingroutes/:id - Get Specific Test Result
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const test = seedTests.find(t => t.id === id || t.testId === id);
    
    if (!test) {
        return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    res.json({ success: true, test });
});

module.exports = router;