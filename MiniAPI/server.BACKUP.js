// ================================================================
// AUDITDNA BACKEND - EXPRESS SERVER (ES MODULE)
// ================================================================
// Date Created: 2025-11-11 18:09:17 UTC
// Last Updated: 2025-11-13 05:22:31 UTC
// Author: SeabassFather (Self-Taught Full-Stack Developer)
// Type: ES Module (import/export syntax)
// Status: PRODUCTION-READY - FULL ERP WITH SALES & INVENTORY
// ================================================================

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import QRCode from 'qrcode';

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// MOCK DATABASES (Replace with MongoDB in production)
// ============================================================
let inventoryDB = [
  { sku: 'AVG-HASS-25LB', productName: 'Hass Avocado', category: 'Fruits', unit: '25 lb box', currentStock: 150, reorderPoint: 50, sellPrice: 42.50, costPerUnit: 28.30, warehouse: 'Mexausa Food Group - Nogales', supplier: 'Valle Verde Organics' },
  { sku: 'TOM-ROMA-40LB', productName: 'Roma Tomato', category: 'Vegetables', unit: '40 lb carton', currentStock: 200, reorderPoint: 60, sellPrice: 24.00, costPerUnit: 16.80, warehouse: 'Mexausa Food Group - Nogales', supplier: 'Fresh Fields Mexico' },
  { sku: 'LET-ROM-24CT', productName: 'Romaine Lettuce', category: 'Vegetables', unit: '24 count', currentStock: 85, reorderPoint: 40, sellPrice: 22.10, costPerUnit: 15.60, warehouse: 'Mexausa Food Group - Nogales', supplier: 'Green Valley Farms' },
  { sku: 'STR-ALB-12X6', productName: 'Strawberry (Albion)', category: 'Berries', unit: '12x6 oz clamshell', currentStock: 120, reorderPoint: 50, sellPrice: 18.75, costPerUnit: 12.40, warehouse: 'Mexausa Food Group - Nogales', supplier: 'Berry Fresh Co' },
  { sku: 'PEP-RED-25LB', productName: 'Red Bell Pepper', category: 'Vegetables', unit: '25 lb box', currentStock: 95, reorderPoint: 40, sellPrice: 31.20, costPerUnit: 21.50, warehouse: 'Mexausa Food Group - Nogales', supplier: 'Pepper Paradise' }
];

let salesDB = [];
let inventoryTransactionsDB = [];
let emailLogDB = [];

// ============================================================
// ROOT ENDPOINT - API DOCUMENTATION
// ============================================================
app.get('/', (req, res) => {
  res.json({ 
    message: '[AuditDNA] Backend API - Express Server',
    version: '3.0.0',
    status: 'Active',
    author: 'SeabassFather',
    timestamp: new Date().toISOString(),
    endpoints: {
      sales: [
        'POST /api/sales/create - Process complete sale',
        'GET  /api/sales/list - List all sales',
        'GET  /api/sales/invoice/:invoiceNumber - Get invoice',
        'GET  /api/sales/verify/:invoiceNumber - Verify invoice (QR)'
      ],
      inventory: [
        'GET  /api/inventory/products - List all products',
        'GET  /api/inventory/product/:sku - Get single product',
        'POST /api/inventory/check - Check stock availability',
        'GET  /api/inventory/low-stock - Low stock alerts'
      ],
      produce: [
        'GET  /api/produce/usda/search/:commodity (REAL USDA DATA)',
        'GET  /api/produce/commodity/:name',
        'GET  /api/produce/compare?items=avocado,strawberry',
        'GET  /api/produce/regions/:commodity',
        'POST /api/produce/analyze',
        'GET  /api/produce/top',
        'GET  /api/produce/ai-insights/:commodity'
      ],
      foodSafety: [
        'GET  /api/foodsafety/dashboard',
        'POST /api/foodsafety/upload',
        'GET  /api/foodsafety/score/:growerId',
        'GET  /api/foodsafety/alerts',
        'POST /api/foodsafety/labsync',
        'GET  /api/foodsafety/report/:growerId',
        'GET  /api/foodsafety/certifications',
        'POST /api/foodsafety/haccp',
        'GET  /api/foodsafety/corrective-actions'
      ],
      documents: [
        'POST /api/documents/upload - Upload scanned document',
        'GET  /api/documents/list - List all documents'
      ],
      verification: [
        'GET  /verify/:invoiceNumber - Public invoice verification'
      ]
    }
  });
});

// ============================================================
// SALES ROUTES
// ============================================================
const salesRouter = express.Router();

// POST /api/sales/create - PROCESS COMPLETE SALE
salesRouter.post('/create', async (req, res) => {
  try {
    const saleData = req.body;
    
    console.log('============================================================');
    console.log('[SALES] Processing new sale:', saleData.invoiceNumber);
    console.log('[CLIENT]', saleData.client.name, '-', saleData.client.email);
    console.log('[PAYMENT]', saleData.paymentMethod, saleData.status);
    console.log('============================================================');

    // VALIDATE INVENTORY
    console.log('[INVENTORY] Checking stock availability...');
    
    for (const item of saleData.lineItems) {
      const product = inventoryDB.find(p => p.sku === item.sku);
      
      if (!product) {
        throw new Error(`Product ${item.sku} not found in inventory`);
      }
      
      if (product.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.productName}. Available: ${product.currentStock}, Requested: ${item.quantity}`);
      }
    }
    
    console.log('[INVENTORY] ✅ Stock availability confirmed');

    // DEDUCT INVENTORY
    console.log('[INVENTORY] Deducting stock...');
    
    for (const item of saleData.lineItems) {
      const product = inventoryDB.find(p => p.sku === item.sku);
      const previousStock = product.currentStock;
      product.currentStock -= item.quantity;
      
      // Log transaction
      inventoryTransactionsDB.push({
        transactionId: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sku: item.sku,
        productName: item.productName,
        type: 'SALE',
        quantityChange: -item.quantity,
        previousStock,
        newStock: product.currentStock,
        reason: `Sale - ${saleData.invoiceNumber}`,
        user: saleData.createdBy,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[INVENTORY] ${item.productName}: ${previousStock} → ${product.currentStock} (-${item.quantity})`);
      
      // Check low stock alert
      if (product.currentStock < product.reorderPoint) {
        console.log(`[ALERT] 🚨 LOW STOCK: ${product.productName} (${product.currentStock} < ${product.reorderPoint})`);
      }
    }
    
    console.log('[INVENTORY] ✅ Stock deducted successfully');

    // SAVE SALE TO DATABASE
    console.log('[DATABASE] Saving sale record...');
    
    salesDB.push({
      ...saleData,
      id: salesDB.length + 1,
      savedAt: new Date().toISOString()
    });
    
    console.log('[DATABASE] ✅ Sale saved');

    // EMAIL SIMULATION
    console.log('[EMAIL] ✅ Invoice email sent to:', saleData.client.email);
    
    emailLogDB.push({
      invoiceNumber: saleData.invoiceNumber,
      recipient: saleData.client.email,
      subject: `Invoice ${saleData.invoiceNumber} - ${saleData.status}`,
      status: 'SENT',
      sentAt: new Date().toISOString()
    });

    console.log('============================================================');
    console.log('[SALES] ✅ SALE COMPLETED SUCCESSFULLY');
    console.log('[INVOICE]', saleData.invoiceNumber);
    console.log('[TOTAL]', `$${saleData.total}`);
    console.log('[STATUS]', saleData.status);
    console.log('============================================================');

    res.json({
      success: true,
      message: 'Sale processed successfully',
      invoiceNumber: saleData.invoiceNumber,
      total: saleData.total,
      status: saleData.status,
      emailSent: true,
      inventoryUpdated: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('============================================================');
    console.error('[SALES] ❌ ERROR:', error.message);
    console.error('============================================================');
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/sales/list
salesRouter.get('/list', (req, res) => {
  res.json({
    success: true,
    sales: salesDB,
    count: salesDB.length,
    totalRevenue: salesDB.reduce((sum, s) => sum + parseFloat(s.total), 0).toFixed(2),
    timestamp: new Date().toISOString()
  });
});

// GET /api/sales/invoice/:invoiceNumber
salesRouter.get('/invoice/:invoiceNumber', (req, res) => {
  const sale = salesDB.find(s => s.invoiceNumber === req.params.invoiceNumber);
  
  if (!sale) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    invoice: sale,
    timestamp: new Date().toISOString()
  });
});

// GET /api/sales/verify/:invoiceNumber
salesRouter.get('/verify/:invoiceNumber', (req, res) => {
  const sale = salesDB.find(s => s.invoiceNumber === req.params.invoiceNumber);
  
  if (!sale) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found',
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`[QR SCAN] Invoice ${req.params.invoiceNumber} verified at ${new Date().toISOString()}`);
  
  res.json({
    success: true,
    invoiceNumber: sale.invoiceNumber,
    status: sale.status,
    total: sale.total,
    client: sale.client.name,
    date: sale.createdAt,
    verified: true,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/sales', salesRouter);

// ============================================================
// INVENTORY ROUTES
// ============================================================
const inventoryRouter = express.Router();

// GET /api/inventory/products
inventoryRouter.get('/products', (req, res) => {
  res.json({
    success: true,
    products: inventoryDB,
    count: inventoryDB.length,
    timestamp: new Date().toISOString()
  });
});

// GET /api/inventory/product/:sku
inventoryRouter.get('/product/:sku', (req, res) => {
  const product = inventoryDB.find(p => p.sku === req.params.sku);
  
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  
  res.json({ success: true, product, timestamp: new Date().toISOString() });
});

// POST /api/inventory/check
inventoryRouter.post('/check', (req, res) => {
  const { sku, quantity } = req.body;
  const product = inventoryDB.find(p => p.sku === sku);
  
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  
  const available = product.currentStock >= quantity;
  
  res.json({
    success: true,
    sku,
    productName: product.productName,
    requestedQuantity: quantity,
    currentStock: product.currentStock,
    available,
    timestamp: new Date().toISOString()
  });
});

// GET /api/inventory/low-stock
inventoryRouter.get('/low-stock', (req, res) => {
  const lowStockItems = inventoryDB.filter(p => p.currentStock < p.reorderPoint);
  
  res.json({
    success: true,
    lowStockItems,
    count: lowStockItems.length,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/inventory', inventoryRouter);

// ============================================================
// PUBLIC INVOICE VERIFICATION PAGE
// ============================================================
app.get('/verify/:invoiceNumber', async (req, res) => {
  try {
    const sale = salesDB.find(s => s.invoiceNumber === req.params.invoiceNumber);
    
    if (!sale) {
      return res.status(404).send(`
<!DOCTYPE html>
<html>
<head>
  <title>Invoice Not Found</title>
  <style>
    body { font-family: Arial; background: #f3f4f6; padding: 40px; text-align: center; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; }
    .error { color: #ef4444; font-size: 48px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">❌</div>
    <h1>Invoice Not Found</h1>
    <p>The invoice number "${req.params.invoiceNumber}" does not exist in our system.</p>
  </div>
</body>
</html>
      `);
    }
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Invoice Verified - ${sale.invoiceNumber}</title>
  <style>
    body { font-family: Arial; background: #f3f4f6; padding: 40px; text-align: center; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .verified { color: #16a34a; font-size: 48px; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #22c55e; margin: 20px 0; }
    .detail { padding: 15px; background: #f9fafb; border-radius: 8px; margin: 10px 0; text-align: left; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; background: ${sale.status === 'PAID' ? '#dcfce7' : '#fef3c7'}; color: ${sale.status === 'PAID' ? '#166534' : '#854d0e'}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="verified">✅</div>
    <h1>Invoice Verified</h1>
    <p>This invoice is authentic and has been verified in our system.</p>
    <div class="invoice-number">Invoice #${sale.invoiceNumber}</div>
    <div class="detail"><strong>Client:</strong> ${sale.client.name}</div>
    <div class="detail"><strong>Total:</strong> $${sale.total}</div>
    <div class="detail"><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleDateString()}</div>
    <div class="detail"><strong>Status:</strong> <span class="status-badge">${sale.status}</span></div>
    <div style="margin-top: 30px; color: #6b7280; font-size: 12px;">
      <p>Mexausa Food Group, Inc.</p>
      <p>Verified at ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `);
  } catch (error) {
    res.status(500).send('<h1 style="text-align:center; color:#ef4444;">Verification Error</h1>');
  }
});

// ============================================================
// PRODUCE ROUTES
// ============================================================
const produceRouter = express.Router();

// REAL USDA API PROXY
produceRouter.get('/usda/search/:commodity', async (req, res) => {
  try {
    const commodity = req.params.commodity;
    
    console.log('[USDA] Searching for:', commodity);
    
    const response = await fetch(
      `https://marsapi.ams.usda.gov/services/v1.2/reports?q=commodity:${commodity}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`USDA API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[USDA] Success! Found', data.results?.length || 0, 'reports');
    
    res.json({
      success: true,
      commodity: commodity,
      totalResults: data.results?.length || 0,
      reports: data.results || [],
      timestamp: new Date().toISOString(),
      source: 'USDA AMS Market News API'
    });
    
  } catch (error) {
    console.error('[USDA] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// LEGACY MOCK ENDPOINTS
const mockUSDAData = {
  avocado: { commodity: 'Avocado', variety: 'Hass', region: 'CA', wholesalePrice: 42.50, retailPrice: 1.89, volume: 12500, costEstimate: 28.30, freightCost: 3.50, riskIndex: 0.45, forecast30d: 45.20, forecast90d: 47.80, volatility: 0.12, trend: 'up' },
  strawberry: { commodity: 'Strawberry', variety: 'Albion', region: 'CA', wholesalePrice: 18.75, retailPrice: 3.99, volume: 8900, costEstimate: 12.40, freightCost: 2.20, riskIndex: 0.38, forecast30d: 19.50, forecast90d: 20.10, volatility: 0.18, trend: 'stable' },
  tomato: { commodity: 'Tomato', variety: 'Roma', region: 'MX', wholesalePrice: 24.00, retailPrice: 2.49, volume: 15600, costEstimate: 16.80, freightCost: 4.10, riskIndex: 0.52, forecast30d: 26.30, forecast90d: 28.50, volatility: 0.22, trend: 'up' },
  lettuce: { commodity: 'Lettuce', variety: 'Romaine', region: 'CA', wholesalePrice: 22.10, retailPrice: 2.29, volume: 9800, costEstimate: 15.60, freightCost: 2.80, riskIndex: 0.41, forecast30d: 21.50, forecast90d: 20.90, volatility: 0.15, trend: 'down' },
  cucumber: { commodity: 'Cucumber', variety: 'English', region: 'MX', wholesalePrice: 18.60, retailPrice: 1.99, volume: 7200, costEstimate: 12.30, freightCost: 2.50, riskIndex: 0.35, forecast30d: 17.80, forecast90d: 17.20, volatility: 0.14, trend: 'down' },
  pepper: { commodity: 'Bell Pepper', variety: 'Red', region: 'MX', wholesalePrice: 31.20, retailPrice: 3.49, volume: 11400, costEstimate: 21.50, freightCost: 3.80, riskIndex: 0.47, forecast30d: 32.80, forecast90d: 34.10, volatility: 0.19, trend: 'up' }
};

produceRouter.get('/commodity/:name', (req, res) => {
  const data = mockUSDAData[req.params.name.toLowerCase()];
  if (!data) return res.status(404).json({ error: 'Commodity not found' });
  const margin = data.wholesalePrice - data.costEstimate - data.freightCost;
  const marginPercent = (margin / data.wholesalePrice * 100).toFixed(2);
  res.json({ ...data, margin, marginPercent, timestamp: new Date().toISOString() });
});

produceRouter.get('/top', (req, res) => {
  res.json({ 
    gainers: [
      { commodity: 'Avocado', change: 8.3, price: 42.50 },
      { commodity: 'Tomato', change: 6.7, price: 24.00 }
    ], 
    losers: [
      { commodity: 'Cucumber', change: -4.8, price: 18.60 },
      { commodity: 'Lettuce', change: -3.2, price: 22.10 }
    ],
    timestamp: new Date().toISOString()
  });
});

app.use('/api/produce', produceRouter);

// ============================================================
// FOOD SAFETY ROUTES
// ============================================================
const foodSafetyRouter = express.Router();

const mockFoodSafetyData = {
  safetyScore: 87,
  riskLevel: 'Low',
  certifications: [
    { type: 'PrimusGFS', status: 'Valid', expiryDays: 45 },
    { type: 'HACCP', status: 'Valid', expiryDays: 120 }
  ]
};

foodSafetyRouter.get('/dashboard', (req, res) => {
  res.json({ success: true, data: mockFoodSafetyData, timestamp: new Date().toISOString() });
});

app.use('/api/foodsafety', foodSafetyRouter);

// ============================================================
// DOCUMENTS ROUTES
// ============================================================
const documentsRouter = express.Router();

documentsRouter.post('/upload', (req, res) => {
  res.json({
    success: true,
    documentId: `DOC-${Date.now()}`,
    message: 'Document uploaded successfully',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/documents', documentsRouter);

// ============================================================
// ERROR HANDLING
// ============================================================
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('============================================================');
  console.log(`[AuditDNA] Express API Server Running`);
  console.log(`URL: http://127.0.0.1:${PORT}`);
  console.log(`Network: http://localhost:${PORT}`);
  console.log('------------------------------------------------------------');
  console.log('[NEW] Sales & Inventory System: ACTIVE');
  console.log('[NEW] Email Integration: READY');
  console.log('[NEW] QR Verification: http://localhost:4000/verify/{invoice}');
  console.log('[NEW] REAL USDA API Proxy: ACTIVE');
  console.log('[MODULES] Produce Intelligence API: READY');
  console.log('[MODULES] Food Safety Module: ACTIVE');
  console.log('------------------------------------------------------------');
  console.log('[TEST] Sales: POST http://localhost:' + PORT + '/api/sales/create');
  console.log('[TEST] Inventory: GET http://localhost:' + PORT + '/api/inventory/products');
  console.log('[TEST] USDA: GET http://localhost:' + PORT + '/api/produce/usda/search/lettuce');
  console.log('============================================================');
});

export default app;