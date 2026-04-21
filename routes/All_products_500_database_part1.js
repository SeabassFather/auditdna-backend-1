// ================================================================
// CM PRODUCTS - COMPLETE 500+ PRODUCT DATABASE (PART 1)
// Express Route Wrapper
// ================================================================

const express = require('express');
const router = express.Router();

/*
|--------------------------------------------------------------------------
| PRODUCT DATABASE
|--------------------------------------------------------------------------
| NOTE:
| - This file exports an Express router (NOT raw data)
| - This fixes: "Router.use() requires a middleware function"
| - Data is accessed via API endpoints
*/

const ALL_PRODUCTS_DATABASE = [
  // ================================================================
  // AVOCADOS (40 SKUs)
  // ================================================================
  { id: 1, sku: 'AVO-HS-32', name: 'Hass Avocado 32ct', category: 'Avocados', origin: 'MichoacÃ¡n, MX', baseCost: 52.00, fob: 56.00, wholesale: 62.00, retail: 2.49, unit: 'case', usdaCode: 'AV', grower: 'Green Valley Farms', cert: 'GlobalGAP', weight: 25 },
  { id: 2, sku: 'AVO-HS-36', name: 'Hass Avocado 36ct', category: 'Avocados', origin: 'MichoacÃ¡n, MX', baseCost: 48.50, fob: 52.50, wholesale: 58.00, retail: 2.29, unit: 'case', usdaCode: 'AV', grower: 'Green Valley Farms', cert: 'GlobalGAP', weight: 25 },
  { id: 3, sku: 'AVO-HS-40', name: 'Hass Avocado 40ct', category: 'Avocados', origin: 'MichoacÃ¡n, MX', baseCost: 45.00, fob: 49.00, wholesale: 54.00, retail: 1.99, unit: 'case', usdaCode: 'AV', grower: 'Green Valley Farms', cert: 'GlobalGAP', weight: 25 },
  { id: 4, sku: 'AVO-HS-48', name: 'Hass Avocado 48ct', category: 'Avocados', origin: 'MichoacÃ¡n, MX', baseCost: 42.50, fob: 46.50, wholesale: 51.00, retail: 1.79, unit: 'case', usdaCode: 'AV', grower: 'Green Valley Farms', cert: 'GlobalGAP', weight: 25 },

  // â€¦ KEEP ALL YOUR DATA EXACTLY AS YOU HAVE IT â€¦
];

/*
|--------------------------------------------------------------------------
| METADATA
|--------------------------------------------------------------------------
*/
const PRODUCT_COUNTS = {
  Avocados: 40,
  Berries: 90,
  Tomatoes: 70,
  Peppers: 70,
  Cucumbers: 25,
  Squash: 30,
  'Leafy Greens': 35,
  Herbs: 15,
  Citrus: 20,
  Tropical: 25,
  Grapes: 15,
  Melons: 20,
  'Root Vegetables': 20,
  Other: 25
};

const TOTAL_PRODUCTS = Object.values(PRODUCT_COUNTS)
  .reduce((sum, count) => sum + count, 0);

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

// GET all products
router.get('/', (req, res) => {
  res.json({
    success: true,
    total: ALL_PRODUCTS_DATABASE.length,
    products: ALL_PRODUCTS_DATABASE
  });
});

// GET by category
router.get('/category/:category', (req, res) => {
  const category = req.params.category;
  const filtered = ALL_PRODUCTS_DATABASE.filter(
    p => p.category.toLowerCase() === category.toLowerCase()
  );

  res.json({
    success: true,
    category,
    count: filtered.length,
    products: filtered
  });
});

// GET metadata
router.get('/meta', (req, res) => {
  res.json({
    success: true,
    productCounts: PRODUCT_COUNTS,
    totalProducts: TOTAL_PRODUCTS
  });
});

// GET by SKU
router.get('/sku/:sku', (req, res) => {
  const product = ALL_PRODUCTS_DATABASE.find(
    p => p.sku === req.params.sku
  );

  if (!product) {
    return res.status(404).json({ success: false, message: 'SKU not found' });
  }

  res.json({ success: true, product });
});

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/
module.exports = router;

