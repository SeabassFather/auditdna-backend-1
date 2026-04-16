// ================================================================
// CUSTOMER ROUTES - LOGIN & AUTHENTICATION
// ================================================================
// Created: 2025-11-17 07:28:11 UTC
// Author: SeabassFather
// Purpose: Customer login, authentication, and order submission
// ================================================================

import express from 'express';

const router = express.Router();

// ============================================================
// CUSTOMER DATABASE (Mock - replace with real DB later)
// ============================================================
const customersDB = [
  {
    email: 'buyer@walmart.com',
    password: 'demo123',
    companyName: 'Walmart Inc.',
    contactName: 'John Smith',
    creditLimit: 500000,
    creditAvailable: 450000,
    currentBalance: 50000,
    accountStatus: 'GOOD',
    paymentTerms: 'NET30'
  },
  {
    email: 'buyer@target.com',
    password: 'demo123',
    companyName: 'Target Corporation',
    contactName: 'Sarah Johnson',
    creditLimit: 300000,
    creditAvailable: 100000,
    currentBalance: 200000,
    accountStatus: 'OVERDUE',
    paymentTerms: 'NET30'
  },
  {
    email: 'procurement@wholefoods.com',
    password: 'demo123',
    companyName: 'Whole Foods Market',
    contactName: 'Mike Davis',
    creditLimit: 400000,
    creditAvailable: 380000,
    currentBalance: 20000,
    accountStatus: 'GOOD',
    paymentTerms: 'NET15'
  }
];

let ordersDB = [];

// ============================================================
// POST /api/customers/login - Customer authentication
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[CUSTOMER LOGIN] 🔐 Attempt:', email);

    // Find customer
    const customer = customersDB.find(c => c.email === email);

    if (!customer) {
      console.log('[CUSTOMER LOGIN] ❌ Customer not found:', email);
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check password
    if (customer.password !== password) {
      console.log('[CUSTOMER LOGIN] ❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Check account status
    if (customer.accountStatus === 'OVERDUE') {
      console.log('[CUSTOMER LOGIN] ⚠️ Account overdue:', email);
      return res.status(403).json({
        success: false,
        error: 'Account on hold - payment overdue',
        accountStatus: 'OVERDUE'
      });
    }

    console.log('[CUSTOMER LOGIN] ✅ Success:', customer.companyName);

    // Remove password from response
    const { password: _, ...customerData } = customer;

    res.json({
      success: true,
      customer: customerData,
      message: `Welcome back, ${customer.companyName}!`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CUSTOMER LOGIN] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// GET /api/customers/search - Search customer by email
// ============================================================
router.get('/search', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter required'
      });
    }

    const customer = customersDB.find(c => c.email === email);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Remove password
    const { password: _, ...customerData } = customer;

    res.json({
      success: true,
      customer: customerData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// POST /api/customers/order/submit - Submit new order
// ============================================================
router.post('/order/submit', async (req, res) => {
  try {
    const { customerEmail, items, deliveryMethod } = req.body;

    console.log('[ORDER SUBMIT] 📦 New order from:', customerEmail);

    const orderNumber = `ORD-${Date.now()}`;
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newOrder = {
      orderNumber,
      customerEmail,
      items,
      deliveryMethod: deliveryMethod || 'willcall',
      total,
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString()
    };

    ordersDB.push(newOrder);

    console.log('[ORDER SUBMIT] ✅ Order created:', orderNumber, '- Total: $' + total.toFixed(2));

    res.json({
      success: true,
      orderNumber,
      total,
      status: 'PENDING_APPROVAL',
      message: 'Order submitted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ORDER SUBMIT] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
