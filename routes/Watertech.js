// ═══════════════════════════════════════════════════════════════════════════════
// WATERTECH ROUTES - CONSOLIDATED MASTER FILE
// CM Products International / MexaUSA Food Group, Inc.
// Water quality testing, irrigation monitoring, and compliance
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// WATER QUALITY LIMITS (EPA/USDA Standards)
// ═══════════════════════════════════════════════════════════════════════════════
const LIMITS = {
    pH: { min: 6.0, max: 8.5 },
    tds: { min: 0, max: 1500 },
    nitrate: { min: 0, max: 10 },
    ecoli: { min: 0, max: 0 },
    arsenic: { min: 0, max: 0.01 },
    lead: { min: 0, max: 0.015 }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE WATER TEST DATA
// ═══════════════════════════════════════════════════════════════════════════════
let waterTests = [
    { id: 'WT-1001', testId: 'WT-1001', grower: 'Rancho Verde', growerId: 'GRW-1001', growerName: 'Rancho Verde', location: 'Ensenada', source: 'Well #1', ph: 7.2, tds: 320, nitrate: 5.2, ecoli: 0, arsenic: 0.005, lead: 0.008, date: '2026-02-03', status: 'passed', compliant: true, failedParams: [], createdAt: new Date('2026-02-03') },
    { id: 'WT-1002', testId: 'WT-1002', grower: 'Campos del Sol', growerId: 'GRW-1002', growerName: 'Campos del Sol', location: 'San Quintin', source: 'Irrigation Canal', ph: 6.8, tds: 410, nitrate: 6.8, ecoli: 0, arsenic: 0.003, lead: 0.010, date: '2026-02-02', status: 'passed', compliant: true, failedParams: [], createdAt: new Date('2026-02-02') },
    { id: 'WT-1003', testId: 'WT-1003', grower: 'Agua Dulce Farms', growerId: 'GRW-1003', growerName: 'Agua Dulce Farms', location: 'Mexicali', source: 'Well #3', ph: 7.8, tds: 580, nitrate: 8.5, ecoli: 0, arsenic: 0.007, lead: 0.012, date: '2026-02-01', status: 'warning', compliant: true, failedParams: [], createdAt: new Date('2026-02-01') },
    { id: 'WT-1004', testId: 'WT-1004', grower: 'Sierra Madre Ranch', growerId: 'GRW-1004', growerName: 'Sierra Madre Ranch', location: 'Tecate', source: 'Spring', ph: 7.1, tds: 290, nitrate: 4.2, ecoli: 0, arsenic: 0.002, lead: 0.006, date: '2026-01-31', status: 'passed', compliant: true, failedParams: [], createdAt: new Date('2026-01-31') },
    { id: 'WT-1005', testId: 'WT-1005', grower: 'Baja Fresh Produce', growerId: 'GRW-1005', growerName: 'Baja Fresh Produce', location: 'Rosarito', source: 'Well #2', ph: 8.2, tds: 720, nitrate: 12.5, ecoli: 2, arsenic: 0.015, lead: 0.020, date: '2026-01-30', status: 'failed', compliant: false, failedParams: ['ecoli', 'nitrate', 'arsenic', 'lead'], createdAt: new Date('2026-01-30') }
];

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/dashboard - Dashboard Summary
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', (req, res) => {
    const compliant = waterTests.filter(t => t.compliant).length;
    res.json({
        totalTests: waterTests.length,
        compliantTests: compliant,
        complianceRate: waterTests.length > 0 ? ((compliant / waterTests.length) * 100).toFixed(1) : 100,
        parametersTracked: Object.keys(LIMITS).length,
        testsThisMonth: waterTests.filter(t => new Date(t.date) > new Date(Date.now() - 30*24*60*60*1000)).length
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/stats - Water Quality Statistics
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/stats', (req, res) => {
    const avgPH = waterTests.reduce((sum, t) => sum + (t.ph || 0), 0) / waterTests.length;
    const avgTDS = waterTests.reduce((sum, t) => sum + (t.tds || 0), 0) / waterTests.length;
    
    res.json({
        success: true,
        totalTests: waterTests.length,
        passRate: waterTests.length > 0 ? ((waterTests.filter(t => t.compliant).length / waterTests.length) * 100).toFixed(1) : 100,
        avgPH: avgPH.toFixed(1),
        avgTDS: Math.round(avgTDS),
        testsThisMonth: waterTests.filter(t => new Date(t.date) > new Date(Date.now() - 30*24*60*60*1000)).length,
        criticalAlerts: waterTests.filter(t => !t.compliant).length
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/recent-tests - Recent Water Tests
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/recent-tests', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    res.json({
        success: true,
        count: waterTests.length,
        tests: waterTests.slice(0, limit),
        summary: {
            passed: waterTests.filter(t => t.status === 'passed').length,
            warning: waterTests.filter(t => t.status === 'warning').length,
            failed: waterTests.filter(t => t.status === 'failed').length
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/alerts - Water Quality Alerts
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/alerts', (req, res) => {
    const failedTests = waterTests.filter(t => !t.compliant);
    const alerts = failedTests.map(t => ({
        id: t.id,
        severity: t.failedParams.includes('ecoli') ? 'critical' : 'high',
        grower: t.grower,
        location: t.location,
        issue: `Failed parameters: ${t.failedParams.join(', ')}`,
        action: t.failedParams.includes('ecoli') ? 'Immediate retest and treatment required' : 'Retest within 7 days',
        date: t.date
    }));
    
    res.json({ success: true, count: alerts.length, alerts });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/limits - Water Quality Limits
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/limits', (req, res) => {
    res.json({ success: true, data: LIMITS });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/watertech/analyze - Analyze Water Sample
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/analyze', (req, res) => {
    const { growerId, growerName, location, source, parameters } = req.body;
    const testId = `WT-${Date.now().toString().slice(-8)}`;
    const analysis = {};
    const failed = [];
    
    Object.entries(parameters || {}).forEach(([param, value]) => {
        const limit = LIMITS[param];
        if (limit) {
            const status = value >= limit.min && value <= limit.max ? 'pass' : 'fail';
            analysis[param] = { value, min: limit.min, max: limit.max, status };
            if (status === 'fail') failed.push(param);
        }
    });
    
    const test = {
        id: testId,
        testId,
        growerId,
        growerName,
        grower: growerName,
        location: location || 'Unknown',
        source: source || 'Unknown',
        parameters: analysis,
        compliant: failed.length === 0,
        failedParams: failed,
        status: failed.length === 0 ? 'passed' : (failed.includes('ecoli') ? 'failed' : 'warning'),
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date()
    };
    
    waterTests.unshift(test);
    
    const recommendations = failed.length > 0 
        ? [`Address failed parameters: ${failed.join(', ')}`, 'Do not use for irrigation until retested']
        : ['Water quality meets all standards', 'Safe for agricultural use'];
    
    res.status(201).json({ 
        success: true,
        data: test, 
        recommendations 
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/watertech/submit - Submit New Water Test
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/submit', (req, res) => {
    const { growerId, growerName, location, ph, tds, nitrate, ecoli, arsenic, lead } = req.body;
    
    const parameters = { ph, tds, nitrate, ecoli, arsenic, lead };
    const failed = [];
    
    Object.entries(parameters).forEach(([param, value]) => {
        const limit = LIMITS[param];
        if (limit && value !== undefined && (value < limit.min || value > limit.max)) {
            failed.push(param);
        }
    });
    
    const newTest = {
        id: `WT-${Date.now()}`,
        testId: `WT-${Date.now()}`,
        grower: growerName || 'Unknown',
        growerName: growerName || 'Unknown',
        growerId: growerId || 'Unknown',
        location: location || 'Unknown',
        source: req.body.source || 'Unknown',
        ph: ph || 0,
        tds: tds || 0,
        nitrate: nitrate || 0,
        ecoli: ecoli || 0,
        arsenic: arsenic || 0,
        lead: lead || 0,
        date: new Date().toISOString().split('T')[0],
        status: failed.includes('ecoli') ? 'failed' : (failed.length > 0 ? 'warning' : 'passed'),
        compliant: failed.length === 0,
        failedParams: failed,
        createdAt: new Date()
    };
    
    waterTests.unshift(newTest);
    
    res.json({ success: true, test: newTest });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/reports - All Water Test Reports
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/reports', (req, res) => {
    res.json({ success: true, data: waterTests });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/reports/:testId - Specific Water Test Report
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/reports/:testId', (req, res) => {
    const test = waterTests.find(t => t.testId === req.params.testId || t.id === req.params.testId);
    if (!test) return res.status(404).json({ success: false, error: 'Test not found' });
    res.json({ success: true, data: test });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/watertech/compliance/:growerId - Grower Compliance Report
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/compliance/:growerId', (req, res) => {
    const tests = waterTests.filter(t => t.growerId === req.params.growerId);
    const compliant = tests.filter(t => t.compliant).length;
    
    res.json({
        success: true,
        growerId: req.params.growerId,
        totalTests: tests.length,
        compliantTests: compliant,
        complianceRate: tests.length > 0 ? ((compliant / tests.length) * 100).toFixed(1) : 100,
        recentTests: tests.slice(0, 5)
    });
});

module.exports = router;