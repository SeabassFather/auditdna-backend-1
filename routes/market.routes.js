const express = require('express');
const router = express.Router();

// GET /api/market/prices
router.get('/prices', (req, res) => {
  const { commodity, region } = req.query;
  const prices = [
    { commodity: 'Avocados', region: 'California', price: 2.45, change: '+5%', volume: 125000 },
    { commodity: 'Avocados', region: 'Mexico', price: 2.12, change: '+3%', volume: 450000 },
    { commodity: 'Strawberries', region: 'California', price: 3.85, change: '-2%', volume: 95000 }
  ];
  let filtered = prices;
  if (commodity) filtered = filtered.filter(p => p.commodity.toLowerCase().includes(commodity.toLowerCase()));
  if (region) filtered = filtered.filter(p => p.region.toLowerCase().includes(region.toLowerCase()));
  res.json({ prices: filtered, timestamp: new Date().toISOString() });
});

// GET /api/market/trends
router.get('/trends', (req, res) => {
  const trends = [
    { commodity: 'Avocados', trend: 'UP', percentChange: 5.2, avgPrice: 2.28 },
    { commodity: 'Strawberries', trend: 'DOWN', percentChange: -2.3, avgPrice: 3.92 }
  ];
  res.json({ trends, timestamp: new Date().toISOString() });
});

// GET /api/market/forecasts
router.get('/forecasts', (req, res) => {
  const forecasts = [
    { commodity: 'Avocados', currentPrice: 2.45, forecast30d: 2.68, confidence: 'HIGH' }
  ];
  res.json({ forecasts, timestamp: new Date().toISOString() });
});

module.exports = router;
