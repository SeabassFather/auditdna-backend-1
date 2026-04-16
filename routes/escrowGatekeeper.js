const express = require('express');
const router = express.Router();

// Placeholder for escrow data
let escrowData = {};

// Endpoint to create an escrow
router.post('/api/escrow/create', (req, res) => {
    const { id, conditions } = req.body;
    if (escrowData[id]) {
        return res.status(400).json({ message: 'Escrow already exists' });
    }
    escrowData[id] = { conditions, status: 'created' };
    res.status(201).json({ message: 'Escrow created', id });
});

// Endpoint to get escrow status
router.get('/api/escrow/:id/status', (req, res) => {
    const { id } = req.params;
    const escrow = escrowData[id];
    if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
    }
    res.json({ status: escrow.status });
});

// Endpoint to verify conditions
router.post('/api/escrow/:id/verify-conditions', (req, res) => {
    const { id } = req.params;
    const { complianceVerified, labTestsPassed, temperatureLogsFine, traceable, buyerAccepted } = req.body;

    const escrow = escrowData[id];
    if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
    }

    if (complianceVerified && labTestsPassed && temperatureLogsFine && traceable && buyerAccepted) {
        escrow.status = 'verified';
        return res.json({ message: 'Conditions verified' });
    }
    res.status(400).json({ message: 'Conditions not met' });
});

// Endpoint to release escrow
router.post('/api/escrow/:id/release', (req, res) => {
    const { id } = req.params;
    const escrow = escrowData[id];
    if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
    }
    if (escrow.status !== 'verified') {
        return res.status(400).json({ message: 'Escrow not verified' });
    }
    escrow.status = 'released';
    res.json({ message: 'Escrow released' });
});

// Endpoint to hold escrow
router.post('/api/escrow/:id/hold', (req, res) => {
    const { id } = req.params;
    const escrow = escrowData[id];
    if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
    }
    escrow.status = 'held';
    res.json({ message: 'Escrow held' });
});

// Endpoint to get release conditions
router.get('/api/escrow/:id/release-conditions', (req, res) => {
    const { id } = req.params;
    const escrow = escrowData[id];
    if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
    }
    res.json({ releaseConditions: escrow.conditions });
});

// Endpoint to dispute escrow
router.post('/api/escrow/:id/dispute', (req, res) => {
    const { id } = req.params;
    const escrow = escrowData[id];
    if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
    }
    escrow.status = 'disputed';
    res.json({ message: 'Escrow disputed' });
});

module.exports = router;
