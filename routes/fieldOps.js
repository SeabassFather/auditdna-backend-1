const express = require('express');
const router = express.Router();

let harvests = [];
let qualityInspections = [];

router.get('/dashboard', (req, res) => {
    res.json({
        harvestsToday: harvests.filter(h => new Date(h.date).toDateString() === new Date().toDateString()).length,
        totalCasesHarvested: harvests.reduce((s,h) => s + h.cases, 0),
        inspectionsToday: qualityInspections.filter(q => new Date(q.date).toDateString() === new Date().toDateString()).length,
        avgQualityScore: qualityInspections.length > 0 ? (qualityInspections.reduce((s,q) => s + q.score, 0) / qualityInspections.length).toFixed(1) : 0
    });
});

router.get('/harvests', (req, res) => res.json({ data: harvests }));

router.post('/harvest', (req, res) => {
    const { growerId, growerName, product, field, cases, crew, notes } = req.body;
    const harvestId = `HRV-${Date.now().toString().slice(-8)}`;
    const dnaHash = `DNA-${product.slice(0,3).toUpperCase()}-${growerId.slice(0,2).toUpperCase()}-${Date.now()}`;
    const harvest = { id: harvests.length + 1, harvestId, dnaHash, growerId, growerName, product, field, cases, crew, notes, date: new Date() };
    harvests.push(harvest);
    res.status(201).json({ data: harvest });
});

router.post('/quality', (req, res) => {
    const { lotId, product, inspector, brix, firmness, color, defects, notes } = req.body;
    const score = Math.round((brix * 10 + firmness * 10 + color * 10 - defects * 5) / 3);
    const inspection = { id: qualityInspections.length + 1, inspectionId: `QI-${Date.now().toString().slice(-8)}`, lotId, product, inspector, brix, firmness, color, defects, score, grade: score >= 90 ? 'A' : score >= 80 ? 'B' : 'C', notes, date: new Date() };
    qualityInspections.push(inspection);
    res.status(201).json({ data: inspection });
});


// ── Crew tracking ────────────────────────────────────────────────────────────
let crewRecords = [];
let pieceRateRecords = [];

router.get('/crew', (req, res) => res.json({ data: crewRecords }));

router.post('/crew', (req, res) => {
    const { name, role, field, status, hours, payRate } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const record = {
        id: crewRecords.length + 1,
        crewId: `CRW-${Date.now().toString().slice(-8)}`,
        name, role: role || 'Picker', field: field || '',
        status: status || 'Active',
        hours: parseFloat(hours || 0),
        payRate: parseFloat(payRate || 15),
        totalPay: parseFloat(hours || 0) * parseFloat(payRate || 15),
        ts: new Date().toISOString()
    };
    crewRecords.unshift(record);
    res.status(201).json({ data: record });
});

// ── Piece-rate tracking ───────────────────────────────────────────────────────
router.get('/piece-rates', (req, res) => res.json({ data: pieceRateRecords }));

router.post('/piece-rate', (req, res) => {
    const { name, commodity, pieces, rate } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const record = {
        id: pieceRateRecords.length + 1,
        name, commodity: commodity || '',
        pieces: parseInt(pieces || 0),
        rate: parseFloat(rate || 0.08),
        totalPay: parseInt(pieces || 0) * parseFloat(rate || 0.08),
        ts: new Date().toISOString()
    };
    pieceRateRecords.unshift(record);
    res.status(201).json({ data: record });
});

module.exports = router;

