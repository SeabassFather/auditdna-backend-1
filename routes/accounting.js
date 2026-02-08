const express = require('express');
const router = express.Router();

let companies = [
    { id: 1, name: 'CM Products International', accountNumber: 'CMP-001', state: 'CA', industry: 'Produce Trading', status: 'active' },
    { id: 2, name: 'Fresh Valley Farms', accountNumber: 'FVF-002', state: 'CA', industry: 'Agriculture', status: 'active' }
];
let journalEntries = [];
let invoices = [];
let bills = [];
let financeFees = [];

router.get('/dashboard', (req, res) => {
    res.json({
        activeCompanies: companies.filter(c => c.status === 'active').length,
        totalAR: invoices.reduce((sum, i) => sum + i.balance, 0),
        totalAP: bills.reduce((sum, b) => sum + b.balance, 0),
        financeFeesMTD: financeFees.reduce((sum, f) => sum + f.amount, 0)
    });
});

router.get('/companies', (req, res) => res.json({ data: companies }));
router.post('/companies', (req, res) => {
    const company = { id: companies.length + 1, ...req.body, status: 'active' };
    companies.push(company);
    res.status(201).json({ data: company });
});

router.get('/gl/:companyId', (req, res) => {
    const entries = journalEntries.filter(e => e.companyId === parseInt(req.params.companyId));
    res.json({ data: entries });
});

router.post('/journal', (req, res) => {
    const { companyId, entries, memo } = req.body;
    const journalNumber = `JE-${Date.now().toString().slice(-8)}`;
    entries.forEach(e => journalEntries.push({ companyId, journalNumber, ...e, memo, date: new Date() }));
    res.status(201).json({ journalNumber });
});

router.get('/ar/:companyId', (req, res) => {
    const ar = invoices.filter(i => i.companyId === parseInt(req.params.companyId));
    res.json({ data: ar, total: ar.reduce((s,i) => s + i.balance, 0) });
});

router.get('/ap/:companyId', (req, res) => {
    const ap = bills.filter(b => b.companyId === parseInt(req.params.companyId));
    res.json({ data: ap, total: ap.reduce((s,b) => s + b.balance, 0) });
});

router.get('/fees/:companyId', (req, res) => {
    const fees = financeFees.filter(f => f.companyId === parseInt(req.params.companyId));
    res.json({ data: fees, total: fees.reduce((s,f) => s + f.amount, 0) });
});

router.post('/fees', (req, res) => {
    const { companyId, type, invoiceAmount, feePercent, days } = req.body;
    const amount = invoiceAmount * (feePercent / 100);
    const effectiveAPR = ((feePercent / days) * 365 * 100).toFixed(2);
    const fee = { id: financeFees.length + 1, companyId, type, invoiceAmount, feePercent, amount, days, effectiveAPR, date: new Date() };
    financeFees.push(fee);
    res.status(201).json({ data: fee });
});

router.get('/calculator/factoring', (req, res) => {
    const { invoiceAmount = 10000, feePercent = 3, days = 30 } = req.query;
    const fee = invoiceAmount * (feePercent / 100);
    const apr = ((feePercent / days) * 365 * 100).toFixed(2);
    res.json({ invoiceAmount, feePercent, days, feeAmount: fee.toFixed(2), effectiveAPR: apr });
});

module.exports = router;