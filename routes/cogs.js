const express = require('express');
const router = express.Router();

let inventory = [];

router.get('/dashboard', (req, res) => {
    res.json({
        totalInventoryValue: inventory.reduce((s,i) => s + (i.cases * i.costPerCase), 0),
        avgCostPerCase: inventory.length > 0 ? (inventory.reduce((s,i) => s + i.costPerCase, 0) / inventory.length).toFixed(2) : 0,
        avgMargin: 24.5
    });
});

router.post('/calculate', (req, res) => {
    const { product, fobPrice, freight, customs, handling, insurance, storage, packaging, labor, overhead, shrinkage, cases } = req.body;
    const totalLandedCost = fobPrice + freight + customs + handling + insurance + storage + packaging + labor + overhead + shrinkage;
    const costPerCase = totalLandedCost / cases;
    res.json({ product, totalLandedCost: totalLandedCost.toFixed(2), costPerCase: costPerCase.toFixed(2), cases });
});

router.get('/inventory', (req, res) => res.json({ data: inventory }));

router.post('/inventory', (req, res) => {
    const item = { id: inventory.length + 1, ...req.body, createdAt: new Date() };
    inventory.push(item);
    res.status(201).json({ data: item });
});

module.exports = router;

