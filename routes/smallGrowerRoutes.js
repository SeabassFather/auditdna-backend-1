const express = require('express');
const router = express.Router();

// In-memory data stores
let growers = [];
let labTests = [];
let traceabilityEvents = [];

// The Small Grower Certification API

// Grower Registration
router.post('/growers', (req, res) => {
    const { name, contactInfo } = req.body;
    const newGrower = { id: growers.length + 1, name, contactInfo, registeredAt: '2025-11-23 08:35:34 UTC' };
    growers.push(newGrower);
    res.status(201).json(newGrower);
});

// Get all growers
router.get('/growers', (req, res) => {
    res.json(growers);
});

// Update a grower
router.put('/growers/:id', (req, res) => {
    const { id } = req.params;
    const index = growers.findIndex(g => g.id == id);
    if (index !== -1) {
        growers[index] = { ...growers[index], ...req.body }; 
        res.json(growers[index]);
    } else {
        res.status(404).send('Grower not found');
    }
});

// Delete a grower
router.delete('/growers/:id', (req, res) => {
    const { id } = req.params;
    growers = growers.filter(g => g.id != id);
    res.status(204).send();
});

// Lab Test Uploads
router.post('/growers/:id/lab-tests', (req, res) => {
    const { id } = req.params;
    const { type, result } = req.body;
    const newLabTest = { id: labTests.length + 1, growerId: id, type, result, uploadedAt: '2025-11-23 08:35:34 UTC' };
    labTests.push(newLabTest);
    res.status(201).json(newLabTest);
});

// Calculate GRS
router.get('/growers/:id/grs', (req, res) => {
    const { id } = req.params;
    const growerTests = labTests.filter(test => test.growerId == id);
    // GRS Calculation
    const grs = calculateGRS(growerTests);
    res.json({ growerId: id, grs });
});

function calculateGRS(tests) {
    let labTestScore = tests.length > 0 ? (tests.reduce((acc, test) => acc + test.result, 0) / tests.length) * 0.4 : 0;
    let traceabilityScore = traceabilityEvents.length * 0.25;
   
    // Assume monthly compliance reporting for simplicity
    let reportingScore = 1 * 0.2; // 100% compliance
    let certificationsScore = 0.15; // Dummy certification score

    return labTestScore + traceabilityScore + reportingScore + certificationsScore;
}

// Traceability System
router.post('/traceability', (req, res) => {
    const { event, qrCode, hash } = req.body;
    const newEvent = { id: traceabilityEvents.length + 1, event, qrCode, hash, recordedAt: '2025-11-23 08:35:34 UTC' };
    traceabilityEvents.push(newEvent);
    res.status(201).json(newEvent);
});

// Generate buyer packet
router.get('/buyers/:id/packet', (req, res) => {
    const { id } = req.params;

    // Multilingual buyer packet generation logic here...
    // For simplicity, returning a static response
    res.json({ message: 'Buyer packet generated successfully for grower: ' + id });
});

// Monthly Compliance Reporting
router.get('/compliance/:id', (req, res) => {
    const { id } = req.params;
    // Implement monthly compliance report logic here...
    res.json({ growerId: id, status: 'Compliant', reportGeneratedAt: '2025-11-23 08:35:34 UTC' });
});

module.exports = router;