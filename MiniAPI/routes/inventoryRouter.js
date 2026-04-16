// ================================================================
// INVENTORY ROUTER
// ================================================================
import express from 'express';

const inventoryRouter = express.Router();

let inventoryDB = [
  { sku: 'AVG-HASS-25LB', productName: 'Hass Avocado', category: 'Fruits', unit: '25 lb box', currentStock: 150, reorderPoint: 50, sellPrice: 42.50, costPerUnit: 28.30 },
  { sku: 'TOM-ROMA-40LB', productName: 'Roma Tomato', category: 'Vegetables', unit: '40 lb carton', currentStock: 200, reorderPoint: 60, sellPrice: 24.00, costPerUnit: 16.80 },
  { sku: 'LET-ROM-24CT', productName: 'Romaine Lettuce', category: 'Vegetables', unit: '24 count', currentStock: 85, reorderPoint: 40, sellPrice: 22.10, costPerUnit: 15.60 },
  { sku: 'STR-ALB-12X6', productName: 'Strawberry (Albion)', category: 'Berries', unit: '12x6 oz clamshell', currentStock: 120, reorderPoint: 50, sellPrice: 18.75, costPerUnit: 12.40 },
  { sku: 'PEP-RED-25LB', productName: 'Red Bell Pepper', category: 'Vegetables', unit: '25 lb box', currentStock: 95, reorderPoint: 40, sellPrice: 31.20, costPerUnit: 21.50 }
];

// GET /api/inventory/products
inventoryRouter.get('/products', (req, res) => {
  res.json({
    success: true,
    products: inventoryDB,
    count: inventoryDB.length
  });
});

// GET /api/inventory/product/:sku
inventoryRouter.get('/product/:sku', (req, res) => {
  const product = inventoryDB.find(p => p.sku === req.params.sku);
  
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  
  res.json({ success: true, product });
});

export default inventoryRouter;
