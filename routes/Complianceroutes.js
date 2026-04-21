const express = require('express');
const router = express.Router();

// GET /api/compliance/dashboard
router.get('/dashboard', (req, res) => {
    res.json({
        overallScore: 94.5,
        auditsCompleted: 12,
        pendingAudits: 3,
        certifications: ['FSMA 204', 'GlobalGAP', 'Primus GFS', 'USDA Organic'],
        lastAudit: '2026-01-10',
        nextAudit: '2026-02-15'
    });
});

// GET /api/compliance/certifications
router.get('/certifications', (req, res) => {
    res.json({
        data: [
            { id: 1, name: 'FSMA 204', status: 'active', expires: '2026-12-31', issuer: 'FDA' },
            { id: 2, name: 'GlobalGAP', status: 'active', expires: '2026-08-15', issuer: 'GlobalGAP' },
            { id: 3, name: 'Primus GFS', status: 'active', expires: '2026-06-30', issuer: 'Primus Labs' },
            { id: 4, name: 'USDA Organic', status: 'active', expires: '2026-11-01', issuer: 'USDA' }
        ]
    });
});

// GET /api/compliance/audits
router.get('/audits', (req, res) => {
    res.json({
        data: [
            { id: 1, type: 'FSMA 204', date: '2026-01-10', auditor: 'FDA Inspector', score: 96, status: 'passed' },
            { id: 2, type: 'GlobalGAP', date: '2025-12-05', auditor: 'Control Union', score: 92, status: 'passed' },
            { id: 3, type: 'Primus GFS', date: '2025-11-20', auditor: 'Primus Labs', score: 94, status: 'passed' }
        ]
    });
});

// POST /api/compliance/audit
router.post('/audit', (req, res) => {
    const audit = { id: Date.now(), ...req.body, createdAt: new Date() };
    res.status(201).json({ data: audit });
});

// GET /api/compliance/fsma204
router.get('/fsma204', (req, res) => {
    res.json({
        compliant: true,
        complianceRate: 98.5,
        requirements: [
            { requirement: 'Traceability Plan', compliant: true, lastVerified: '2026-01-13' },
            { requirement: 'Records Within 24 Hours', compliant: true, lastVerified: '2026-01-13' },
            { requirement: 'Sortable Electronic Records', compliant: true, lastVerified: '2026-01-13' },
            { requirement: 'KDE Capture at CTEs', compliant: true, lastVerified: '2026-01-13' },
            { requirement: 'Supply Chain Coordination', compliant: true, lastVerified: '2026-01-13' },
            { requirement: 'Mock Recall Capability', compliant: true, lastVerified: '2026-01-10' }
        ],
        kdes: ['Traceability Lot Code', 'Entry Date', 'Location ID', 'Reference Record', 'Product Description', 'Quantity/UOM', 'Ship-to Location'],
        ctes: { growing: 127, receiving: 456, transformation: 89, creating: 312, shipping: 445 }
    });
});

module.exports = router;

