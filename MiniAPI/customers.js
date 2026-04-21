// ================================================================
// CUSTOMER PORTAL ROUTES - QR CODE & ORDER MANAGEMENT
// ================================================================
// Created: 2025-11-16 22:56:59 UTC
// Updated: 2025-11-16 23:17:58 UTC
// Author: SeabassFather (Self-Taught Full-Stack Developer)
// Purpose: Customer-facing portal endpoints for:
//          â€¢ Manifest viewing with QR access
//          â€¢ Direct ordering from manifest
//          â€¢ QR code generation (5 types)
//          â€¢ Order tracking & history
// ================================================================
// QR CODE TYPES SUPPORTED:
//   1. Manifest QR - View live inventory
//   2. Invoice QR - Verify invoice authenticity
//   3. Order QR - Track order status
//   4. Product QR - View product details
//   5. Purchase Order QR - PO verification
// ================================================================

import express from 'express';
import QRCode from 'qrcode';

const router = express.Router();

// ============================================================
// IN-MEMORY DATABASES
// ============================================================
// In production: Replace with MongoDB/PostgreSQL
let ordersDB = [];
let qrCodesDB = [];

// ============================================================
// QR CODE GENERATION ENDPOINTS
// ============================================================

// POST /api/customer-portal/qr/manifest
// Generate QR code for manifest access
// Customer scans â†’ views live inventory â†’ can order directly
router.post('/qr/manifest', async (req, res) => {
  try {
    const { manifestId, warehouse, date } = req.body;
    
    if (!manifestId) {
      return res.status(400).json({
        success: false,
        error: 'manifestId is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate QR data URL
    const qrData = `https://cmproducts.com/customer-portal/manifest/${manifestId}`;
    
    // Generate QR code image (base64 data URL)
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 512
    });
    
    // Log QR generation
    const qrRecord = {
      qrId: `QR-MAN-${Date.now()}`,
      type: 'MANIFEST',
      manifestId,
      warehouse: warehouse || 'Unknown',
      date: date || new Date().toISOString().split('T')[0],
      qrData,
      qrCode,
      generatedAt: new Date().toISOString(),
      scans: 0
    };
    
    qrCodesDB.push(qrRecord);
    
    console.log('[QR CODE] âœ… Generated for manifest:', manifestId);
    console.log('[QR CODE]    Warehouse:', warehouse || 'Unknown');
    console.log('[QR CODE]    URL:', qrData);
    
    res.json({
      success: true,
      qrCode,
      qrData,
      qrId: qrRecord.qrId,
      manifestId,
      warehouse: warehouse || 'Unknown',
      message: 'Scan to view live inventory and place orders',
      instructions: 'Point phone camera at QR code to access manifest',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error generating manifest QR:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/customer-portal/qr/invoice
// Generate QR code for invoice verification
// Customer scans â†’ verifies invoice authenticity â†’ sees payment status
router.post('/qr/invoice', async (req, res) => {
  try {
    const { invoiceNumber, total, customerName } = req.body;
    
    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        error: 'invoiceNumber is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate QR data URL (links to public verification page)
    const qrData = `https://cmproducts.com/verify/${invoiceNumber}`;
    
    // Generate high-quality QR code
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      margin: 2,
      width: 512
    });
    
    // Log QR generation
    const qrRecord = {
      qrId: `QR-INV-${Date.now()}`,
      type: 'INVOICE',
      invoiceNumber,
      total: total || 0,
      customerName: customerName || 'Unknown',
      qrData,
      qrCode,
      generatedAt: new Date().toISOString(),
      scans: 0
    };
    
    qrCodesDB.push(qrRecord);
    
    console.log('[QR CODE] âœ… Generated for invoice:', invoiceNumber);
    console.log('[QR CODE]    Total: $' + (total || 0));
    console.log('[QR CODE]    Customer:', customerName || 'Unknown');
    
    res.json({
      success: true,
      qrCode,
      qrData,
      qrId: qrRecord.qrId,
      invoiceNumber,
      message: 'Scan to verify invoice authenticity',
      instructions: 'Scan with phone camera to verify this invoice',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error generating invoice QR:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/customer-portal/qr/order
// Generate QR code for order tracking
// Customer scans â†’ tracks order status â†’ sees delivery updates
router.post('/qr/order', async (req, res) => {
  try {
    const { orderNumber, customerEmail, total } = req.body;
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'orderNumber is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate QR data URL
    const qrData = `https://cmproducts.com/customer-portal/order/${orderNumber}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      margin: 2,
      width: 512
    });
    
    // Log QR generation
    const qrRecord = {
      qrId: `QR-ORD-${Date.now()}`,
      type: 'ORDER',
      orderNumber,
      customerEmail: customerEmail || 'Unknown',
      total: total || 0,
      qrData,
      qrCode,
      generatedAt: new Date().toISOString(),
      scans: 0
    };
    
    qrCodesDB.push(qrRecord);
    
    console.log('[QR CODE] âœ… Generated for order:', orderNumber);
    console.log('[QR CODE]    Customer:', customerEmail || 'Unknown');
    console.log('[QR CODE]    Total: $' + (total || 0));
    
    res.json({
      success: true,
      qrCode,
      qrData,
      qrId: qrRecord.qrId,
      orderNumber,
      message: 'Scan to track order status',
      instructions: 'Scan to view order details and delivery status',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error generating order QR:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/customer-portal/qr/product
// Generate QR code for product details
// Customer scans â†’ sees product info â†’ can add to cart directly
router.post('/qr/product', async (req, res) => {
  try {
    const { sku, productName, price } = req.body;
    
    if (!sku) {
      return res.status(400).json({
        success: false,
        error: 'sku is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate QR data URL
    const qrData = `https://cmproducts.com/customer-portal/product/${sku}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      margin: 2,
      width: 512
    });
    
    // Log QR generation
    const qrRecord = {
      qrId: `QR-PRD-${Date.now()}`,
      type: 'PRODUCT',
      sku,
      productName: productName || 'Unknown Product',
      price: price || 0,
      qrData,
      qrCode,
      generatedAt: new Date().toISOString(),
      scans: 0
    };
    
    qrCodesDB.push(qrRecord);
    
    console.log('[QR CODE] âœ… Generated for product:', sku);
    console.log('[QR CODE]    Product:', productName || 'Unknown');
    console.log('[QR CODE]    Price: $' + (price || 0));
    
    res.json({
      success: true,
      qrCode,
      qrData,
      qrId: qrRecord.qrId,
      sku,
      message: 'Scan to view product details',
      instructions: 'Scan to see availability and add to cart',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error generating product QR:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/customer-portal/qr/po
// Generate QR code for purchase order
// Supplier scans â†’ sees PO details â†’ can update fulfillment status
router.post('/qr/po', async (req, res) => {
  try {
    const { poNumber, supplier, total } = req.body;
    
    if (!poNumber) {
      return res.status(400).json({
        success: false,
        error: 'poNumber is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate QR data URL
    const qrData = `https://cmproducts.com/customer-portal/po/${poNumber}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      margin: 2,
      width: 512
    });
    
    // Log QR generation
    const qrRecord = {
      qrId: `QR-PO-${Date.now()}`,
      type: 'PURCHASE_ORDER',
      poNumber,
      supplier: supplier || 'Unknown',
      total: total || 0,
      qrData,
      qrCode,
      generatedAt: new Date().toISOString(),
      scans: 0
    };
    
    qrCodesDB.push(qrRecord);
    
    console.log('[QR CODE] âœ… Generated for PO:', poNumber);
    console.log('[QR CODE]    Supplier:', supplier || 'Unknown');
    console.log('[QR CODE]    Total: $' + (total || 0));
    
    res.json({
      success: true,
      qrCode,
      qrData,
      qrId: qrRecord.qrId,
      poNumber,
      message: 'Scan to view purchase order',
      instructions: 'Scan to see PO details and update status',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR CODE] âŒ Error generating PO QR:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// QR CODE ANALYTICS & MANAGEMENT
// ============================================================

// GET /api/customer-portal/qr/stats
// Get QR code generation statistics
router.get('/qr/stats', async (req, res) => {
  try {
    const totalQRs = qrCodesDB.length;
    const totalScans = qrCodesDB.reduce((sum, qr) => sum + qr.scans, 0);
    
    const byType = {
      MANIFEST: qrCodesDB.filter(q => q.type === 'MANIFEST').length,
      INVOICE: qrCodesDB.filter(q => q.type === 'INVOICE').length,
      ORDER: qrCodesDB.filter(q => q.type === 'ORDER').length,
      PRODUCT: qrCodesDB.filter(q => q.type === 'PRODUCT').length,
      PURCHASE_ORDER: qrCodesDB.filter(q => q.type === 'PURCHASE_ORDER').length
    };
    
    res.json({
      success: true,
      stats: {
        totalQRsGenerated: totalQRs,
        totalScans: totalScans,
        byType: byType,
        averageScansPerQR: totalQRs > 0 ? (totalScans / totalQRs).toFixed(2) : 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR STATS] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customer-portal/qr/scan
// Record QR code scan (analytics)
router.post('/qr/scan', async (req, res) => {
  try {
    const { qrId } = req.body;
    
    const qr = qrCodesDB.find(q => q.qrId === qrId);
    
    if (qr) {
      qr.scans += 1;
      qr.lastScanned = new Date().toISOString();
      
      console.log('[QR SCAN] ðŸ“±', qr.type, '-', qr.qrId, '- Total scans:', qr.scans);
    }
    
    res.json({
      success: true,
      scans: qr ? qr.scans : 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[QR SCAN] âŒ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ORDER MANAGEMENT ENDPOINTS
// ============================================================

// GET /api/customer-portal/order/:orderNumber
// Get order details (accessed via QR code scan)
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    console.log('[ORDER TRACKING] ðŸ“¦ Request for:', orderNumber);
    
    // Find order in database
    const order = ordersDB.find(o => o.orderNumber === orderNumber);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        orderNumber,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[ORDER TRACKING] âœ… Found order:', orderNumber, '- Status:', order.status);
    
    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        customerEmail: order.customerEmail,
        items: order.items,
        total: order.total,
        deliveryMethod: order.deliveryMethod,
        submittedAt: order.submittedAt,
        estimatedDelivery: order.estimatedDelivery || 'TBD',
        trackingNumber: order.trackingNumber || null,
        notes: order.notes || ''
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ORDER TRACKING] âŒ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/customer-portal/orders
// Get all orders for a customer (email-based)
router.get('/orders', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[ORDERS LIST] ðŸ“‹ Request from:', email);
    
    // Filter orders by customer email
    const customerOrders = ordersDB.filter(o => 
      o.customerEmail.toLowerCase() === email.toLowerCase()
    );
    
    console.log('[ORDERS LIST] âœ… Found', customerOrders.length, 'orders for', email);
    
    res.json({
      success: true,
      orders: customerOrders,
      count: customerOrders.length,
      email: email,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ORDERS LIST] âŒ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/customer-portal/order/create
// Create new order (used internally when customer submits via manifest)
router.post('/order/create', async (req, res) => {
  try {
    const { customerEmail, items, deliveryMethod, poNumber, notes } = req.body;
    
    if (!customerEmail || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'customerEmail and items are required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;
    
    // Calculate total
    const total = items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    // Create order
    const order = {
      orderNumber,
      customerEmail,
      items,
      total,
      deliveryMethod: deliveryMethod || 'willcall',
      poNumber: poNumber || null,
      notes: notes || '',
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
      estimatedDelivery: deliveryMethod === 'willcall' ? 'Same Day' : '1-2 Business Days'
    };
    
    ordersDB.push(order);
    
    console.log('[ORDER CREATE] âœ… New order:', orderNumber);
    console.log('[ORDER CREATE]    Customer:', customerEmail);
    console.log('[ORDER CREATE]    Items:', items.length);
    console.log('[ORDER CREATE]    Total: $' + total);
    
    // Generate QR code for order tracking
    const qrResponse = await fetch('http://process.env.DB_HOST:4000/api/customer-portal/qr/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        customerEmail,
        total
      })
    });
    
    const qrData = await qrResponse.json();
    
    res.json({
      success: true,
      order,
      qrCode: qrData.qrCode,
      qrData: qrData.qrData,
      message: 'Order created successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ORDER CREATE] âŒ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// EXPORT ROUTER
// ============================================================
export default router;

