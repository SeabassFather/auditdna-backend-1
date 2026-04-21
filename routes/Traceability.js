const express = require('express');
const router = express.Router();

const LIMITS = {
    pH: { min: 6.0, max: 8.5, unit: '' },
    tds: { min: 0, max: 1500, unit: 'mg/L' },
    conductivity: { min: 0, max: 2500, unit: 'ÂµS/cm' },
    nitrate: { min: 0, max: 10, unit: 'mg/L' },
    nitrite: { min: 0, max: 1, unit: 'mg/L' },
    ecoli: { min: 0, max: 0, unit: 'CFU/100mL' },
    coliform: { min: 0, max: 0, unit: 'CFU/100mL' },
    arsenic: { min: 0, max: 0.01, unit: 'mg/L' },
    lead: { min: 0, max: 0.015, unit: 'mg/L' },
    chloride: { min: 0, max: 250, unit: 'mg/L' }
};

let waterTests = [];

// GET /api/water/dashboard
router.get('/dashboard', (req, res) => {
    const compliant = waterTests.filter(t => t.compliant).length;
    res.json({
        totalTests: waterTests.length,
        compliantTests: compliant,
        complianceRate: waterTests.length > 0 ? ((compliant / waterTests.length) * 100).toFixed(1) : 100,
        parametersTracked: Object.keys(LIMITS).length,
        recentTests: waterTests.slice(-5)
    });
});

// GET /api/water/limits
router.get('/limits', (req, res) => res.json({ data: LIMITS }));

// POST /api/water/analyze
router.post('/analyze', (req, res) => {
    const { growerId, growerName, source, location, parameters } = req.body;
    const testId = `WT-${Date.now().toString().slice(-8)}`;
    const analysis = {};
    const failed = [];
    const warnings = [];
    
    Object.entries(parameters).forEach(([param, value]) => {
        const limit = LIMITS[param];
        if (limit) {
            const numVal = parseFloat(value);
            const status = numVal >= limit.min && numVal <= limit.max ? 'pass' : 'fail';
            const percentOfLimit = ((numVal / limit.max) * 100).toFixed(1);
            analysis[param] = { value: numVal, unit: limit.unit, min: limit.min, max: limit.max, status, percentOfLimit };
            if (status === 'fail') failed.push(param);
            else if (parseFloat(percentOfLimit) > 80) warnings.push(param);
        }
    });
    
    const test = { testId, growerId, growerName, source, location, parameters: analysis, compliant: failed.length === 0, failedParams: failed, warningParams: warnings, createdAt: new Date() };
    waterTests.push(test);
    
    const recommendations = [];
    if (analysis.pH?.status === 'fail') recommendations.push(analysis.pH.value < 6 ? 'Add lime to raise pH' : 'Add sulfur to lower pH');
    if (analysis.ecoli?.value > 0) recommendations.push('CRITICAL: E. coli detected - implement UV treatment');
    if (analysis.nitrate?.status === 'fail') recommendations.push('High nitrate - reduce nitrogen fertilizer');
    
    res.status(201).json({ data: test, recommendations });
});

// GET /api/water/reports
router.get('/reports', (req, res) => {
    const { growerId, compliant } = req.query;
    let data = waterTests;
    if (growerId) data = data.filter(t => t.growerId === growerId);
    if (compliant !== undefined) data = data.filter(t => t.compliant === (compliant === 'true'));
    res.json({ data, count: data.length });
});

// GET /api/water/reports/:testId
router.get('/reports/:testId', (req, res) => {
    const test = waterTests.find(t => t.testId === req.params.testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json({ data: test });
});

// GET /api/water/compliance/:growerId
router.get('/compliance/:growerId', (req, res) => {
    const tests = waterTests.filter(t => t.growerId === req.params.growerId);
    const compliant = tests.filter(t => t.compliant).length;
    res.json({
        growerId: req.params.growerId,
        totalTests: tests.length,
        compliantTests: compliant,
        complianceRate: tests.length > 0 ? ((compliant / tests.length) * 100).toFixed(1) : 100,
        history: tests.map(t => ({ testId: t.testId, date: t.createdAt, compliant: t.compliant }))
    });
});

module.exports = router;

