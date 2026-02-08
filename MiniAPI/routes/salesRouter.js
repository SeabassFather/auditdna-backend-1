// ================================================================
// SALES ROUTER - COMPLETE INTEGRATED SYSTEM
// ================================================================
import express from 'express';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

const salesRouter = express.Router();

// MOCK INVENTORY DATABASE
let inventoryDB = [
  { sku: 'AVG-HASS-25LB', productName: 'Hass Avocado', currentStock: 150, sellPrice: 42.50, costPerUnit: 28.30, reorderPoint: 50 },
  { sku: 'TOM-ROMA-40LB', productName: 'Roma Tomato', currentStock: 200, sellPrice: 24.00, costPerUnit: 16.80, reorderPoint: 60 },
  { sku: 'LET-ROM-24CT', productName: 'Romaine Lettuce', currentStock: 85, sellPrice: 22.10, costPerUnit: 15.60, reorderPoint: 40 },
  { sku: 'STR-ALB-12X6', productName: 'Strawberry (Albion)', currentStock: 120, sellPrice: 18.75, costPerUnit: 12.40, reorderPoint: 50 },
  { sku: 'PEP-RED-25LB', productName: 'Red Bell Pepper', currentStock: 95, sellPrice: 31.20, costPerUnit: 21.50, reorderPoint: 40 }
];

let salesDB = [];
let inventoryTransactionsDB = [];

// POST /api/sales/create
salesRouter.post('/create', async (req, res) => {
  try {
    const saleData = req.body;
    
    console.log('[SALES] Processing:', saleData.invoiceNumber);
    
    // Validate & deduct inventory
    for (const item of saleData.lineItems) {
      const product = inventoryDB.find(p => p.sku === item.sku);
      if (!product || product.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.sku}`);
      }
      product.currentStock -= item.quantity;
      
      inventoryTransactionsDB.push({
        sku: item.sku,
        type: 'SALE',
        quantityChange: -item.quantity,
        invoiceNumber: saleData.invoiceNumber,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[INVENTORY] ${item.productName}: -${item.quantity} (${product.currentStock} remaining)`);
    }
    
    salesDB.push({ ...saleData, id: salesDB.length + 1 });
    
    console.log('[SALES] ✅ COMPLETED:', saleData.invoiceNumber);
    
    res.json({
      success: true,
      invoiceNumber: saleData.invoiceNumber,
      message: 'Sale completed successfully'
    });
    
  } catch (error) {
    console.error('[SALES] ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sales/list
salesRouter.get('/list', (req, res) => {
  res.json({
    success: true,
    sales: salesDB,
    count: salesDB.length,
    totalRevenue: salesDB.reduce((sum, s) => sum + parseFloat(s.total), 0).toFixed(2)
  });
});

// GET /api/sales/verify/:invoiceNumber
salesRouter.get('/verify/:invoiceNumber', (req, res) => {
  const sale = salesDB.find(s => s.invoiceNumber === req.params.invoiceNumber);
  
  if (!sale) {
    return res.status(404).json({ success: false, error: 'Invoice not found' });
  }
  
  res.json({
    success: true,
    invoiceNumber: sale.invoiceNumber,
    status: sale.status,
    total: sale.total,
    client: sale.client.name,
    date: sale.createdAt
  });
});

export default salesRouter;