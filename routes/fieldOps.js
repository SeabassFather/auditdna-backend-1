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

module.exports = router;

