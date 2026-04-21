const express = require('express');
const router = express.Router();

const CROP_REQS = {
    avocado: { N: { min: 1.8, max: 2.5 }, P: { min: 0.08, max: 0.25 }, K: { min: 0.75, max: 2.0 } },
    strawberry: { N: { min: 2.5, max: 3.5 }, P: { min: 0.2, max: 0.4 }, K: { min: 1.5, max: 3.0 } },
    tomato: { N: { min: 3.0, max: 4.5 }, P: { min: 0.3, max: 0.5 }, K: { min: 2.5, max: 4.0 } }
};

const PRODUCTS = [
    { name: 'Urea', npk: '46-0-0', N: 46, P: 0, K: 0 },
    { name: 'DAP', npk: '18-46-0', N: 18, P: 46, K: 0 },
    { name: 'Muriate of Potash', npk: '0-0-60', N: 0, P: 0, K: 60 }
];

let tests = [];
let applications = [];

router.get('/dashboard', (req, res) => res.json({ totalTests: tests.length, monthlyApplications: applications.length }));
router.get('/products', (req, res) => res.json({ data: PRODUCTS }));
router.get('/crop-requirements', (req, res) => res.json({ data: CROP_REQS }));

router.post('/analyze', (req, res) => {
    const { growerId, growerName, crop, parameters } = req.body;
    const reqs = CROP_REQS[crop?.toLowerCase()];
    if (!reqs) return res.status(400).json({ error: 'Unknown crop' });
    const analysis = {};
    const deficiencies = [];
    Object.entries(parameters).forEach(([nutrient, value]) => {
        const req = reqs[nutrient];
        if (req) {
            const status = value < req.min ? 'deficient' : value > req.max ? 'excess' : 'optimal';
            analysis[nutrient] = { value, min: req.min, max: req.max, status };
            if (status === 'deficient') deficiencies.push(nutrient);
        }
    });
    const test = { testId: `FT-${Date.now().toString().slice(-8)}`, growerId, growerName, crop, analysis, deficiencies, createdAt: new Date() };
    tests.push(test);
    res.status(201).json({ data: test });
});

router.post('/application', (req, res) => {
    const app = { applicationId: `FA-${Date.now().toString().slice(-8)}`, ...req.body, appliedAt: new Date() };
    applications.push(app);
    res.status(201).json({ data: app });
});

router.get('/history/:growerId', (req, res) => res.json({ data: applications.filter(a => a.growerId === req.params.growerId) }));

module.exports = router;

