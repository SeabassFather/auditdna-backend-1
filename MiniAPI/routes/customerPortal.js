// ================================================================
// CUSTOMER PORTAL ROUTES
// ================================================================
// Created: 2025-11-16 22:56:59 UTC
// Author: SeabassFather
// Purpose: Customer-facing portal endpoints for manifest viewing,
//          ordering, QR code generation, and order tracking
// ================================================================

import express from 'express';
import QRCode from 'qrcode';

const router = express.Router();

// Mock data - in production, import from your main databases
let ordersDB = [];

// ============================================================
// QR CODE GENERATION ENDPOINTS
// ============================================================

// POST /api/customer-portal/qr/manifest - Generate QR for manifest
router.post('/qr/manifest', async (req, res) => {
  try {
    const { manifestId } = req.body;
    
    const qrData = `https://cmproducts.com/customer-portal/manifest/${manifestId}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    console.log('[QR CODE] âœ… Generated for manifest:', manifestId);
    
    res.json({
      success: true,
      qrCode,
      qrData,
      manifestId,
      message: 'Scan to view live inventory',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customer-portal/qr/invoice - Generate QR for invoice
router.post('/qr/invoice', async (req, res) => {
  try {
    const { invoiceNumber } = req.body;
    
    const qrData = `https://cmproducts.com/verify/${invoiceNumber}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    console.log('[QR CODE] âœ… Generated for invoice:', invoiceNumber);
    
    res.json({
      success: true,
      qrCode,
      qrData,
      invoiceNumber,
      message: 'Scan to verify invoice',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customer-portal/qr/order - Generate QR for order tracking
router.post('/qr/order', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    
    const qrData = `https://cmproducts.com/customer-portal/order/${orderNumber}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    console.log('[QR CODE] âœ… Generated for order:', orderNumber);
    
    res.json({
      success: true,
      qrCode,
      qrData,
      orderNumber,
      message: 'Scan to track order',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customer-portal/qr/product - Generate QR for product
router.post('/qr/product', async (req, res) => {
  try {
    const { sku } = req.body;
    
    const qrData = `https://cmproducts.com/customer-portal/product/${sku}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    console.log('[QR CODE] âœ… Generated for product:', sku);
    
    res.json({
      success: true,
      qrCode,
      qrData,
      sku,
      message: 'Scan to view product details',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ORDER TRACKING ENDPOINTS
// ============================================================

// GET /api/customer-portal/order/:orderNumber - Get order details
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    // In production, fetch from database
    const order = ordersDB.find(o => o.orderNumber === orderNumber);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      order,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ORDER TRACKING] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/customer-portal/orders - Get customer's orders
router.get('/orders', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter required'
      });
    }
    
    // Filter orders by customer email
    const customerOrders = ordersDB.filter(o => o.customerEmail === email);
    
    res.json({
      success: true,
      orders: customerOrders,
      count: customerOrders.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ORDERS LIST] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

