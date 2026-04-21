const express = require('express');
const router = express.Router();

let sales = [];
let customers = [
    { id: 'c1', company: 'Fresh Foods Market', name: 'John Martinez', phone: '323-555-1234', terms: 'Net 15' },
    { id: 'c2', company: 'Valley Produce Co', name: 'Maria Garcia', phone: '619-555-5678', terms: 'Net 30' }
];

router.get('/dashboard', (req, res) => {
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
    res.json({ todaySales: todaySales.length, todayRevenue: todaySales.reduce((s,sale) => s + sale.total, 0), totalCustomers: customers.length });
});

router.get('/history', (req, res) => res.json({ data: sales }));

router.post('/sale', (req, res) => {
    const { customerId, salesmanId, items, paymentMethod } = req.body;
    const customer = customers.find(c => c.id === customerId);
    const subtotal = items.reduce((s,i) => s + (i.price * i.qty), 0);
    const tax = subtotal * 0.0825;
    const sale = { id: sales.length + 1, invoiceNumber: `INV-${Date.now().toString().slice(-8)}`, customer, salesmanId, items, subtotal, tax, total: subtotal + tax, paymentMethod, createdAt: new Date() };
    sales.push(sale);
    res.status(201).json({ data: sale });
});

router.get('/customers', (req, res) => res.json({ data: customers }));

module.exports = router;

