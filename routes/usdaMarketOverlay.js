const express = require('express');
const router = express.Router();

// Mock market overlay data
const marketData = {
  avocados: { price: 42.00, trend: 'UP', volatility: 'MODERATE', lastUpdate: new Date().toISOString() },
  strawberries: { price: 18.50, trend: 'STABLE', volatility: 'LOW', lastUpdate: new Date().toISOString() },
  tomatoes: { price: 24.00, trend: 'DOWN', volatility: 'HIGH', lastUpdate: new Date().toISOString() },
  lettuce: { price: 16.75, trend: 'UP', volatility: 'MODERATE', lastUpdate: new Date().toISOString() }
};

// GET /api/usdaMarketOverlay - Get all market overlay data
router.get('/', (req, res) => {
  res.json({ markets: marketData, timestamp: new Date().toISOString() });
});

// GET /api/usdaMarketOverlay/:commodity - Get specific commodity
router.get('/:commodity', (req, res) => {
  const commodity = req.params.commodity.toLowerCase();
  const data = marketData[commodity];
  
  if (!data) {
    return res.status(404).json({ error: 'Commodity not found' });
  }
  
  res.json({ commodity, ...data });
});

// GET /api/usdaMarketOverlay/trends/analysis - Market trends
router.get('/trends/analysis', (req, res) => {
  const trends = {
    rising: Object.keys(marketData).filter(k => marketData[k].trend === 'UP'),
    falling: Object.keys(marketData).filter(k => marketData[k].trend === 'DOWN'),
    stable: Object.keys(marketData).filter(k => marketData[k].trend === 'STABLE'),
    highVolatility: Object.keys(marketData).filter(k => marketData[k].volatility === 'HIGH')
  };
  
  res.json({ trends, timestamp: new Date().toISOString() });
});

// POST /api/usdaMarketOverlay/update - Update market data (admin)
router.post('/update', (req, res) => {
  const { commodity, price, trend, volatility } = req.body;
  
  if (!marketData[commodity]) {
    return res.status(404).json({ error: 'Commodity not found' });
  }
  
  marketData[commodity] = {
    price: price || marketData[commodity].price,
    trend: trend || marketData[commodity].trend,
    volatility: volatility || marketData[commodity].volatility,
    lastUpdate: new Date().toISOString()
  };
  
  res.json({ success: true, commodity, data: marketData[commodity] });
});

module.exports = router;
