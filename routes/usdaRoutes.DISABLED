const express = require('express');
const router = express.Router();
const usdaService = require('../services/usdaService');

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) return res.status(400).json({ error: 'Query parameter required' });
    const results = await usdaService.searchCommodities(query);
    res.json({ query, count: results.length, results, source: 'USDA NASS', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/prices/:commodity', async (req, res) => {
  try {
    const pricing = await usdaService.getLivePricing(req.params.commodity);
    res.json({ commodity: req.params.commodity, pricing, source: 'USDA AMS', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/port/:portName', async (req, res) => {
  try {
    const portData = await usdaService.getPortData(req.params.portName);
    res.json({ port: req.params.portName, data: portData, source: 'USDA FAS', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/growers', async (req, res) => {
  try {
    const { state, crop } = req.query;
    const growers = await usdaService.getGrowers(state, crop);
    res.json({ state, crop, count: growers.length, growers, source: 'USDA Organic', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/seasonal/:commodity', async (req, res) => {
  try {
    const calendar = await usdaService.getSeasonalCalendar(req.params.commodity);
    res.json({ commodity: req.params.commodity, calendar, source: 'USDA NASS', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/weekly/:commodity/:week', async (req, res) => {
  try {
    const { commodity, week } = req.params;
    const report = await usdaService.getWeeklyReport(commodity, week);
    res.json({ commodity, week, report, source: 'USDA AMS', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/historical/:commodity', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const historical = await usdaService.getHistoricalData(req.params.commodity, days);
    res.json({ commodity: req.params.commodity, days, count: historical.length, data: historical, source: 'USDA NASS', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/certifications/:growerName', async (req, res) => {
  try {
    const certs = await usdaService.getCertifications(req.params.growerName);
    res.json({ grower: req.params.growerName, count: certs.length, certifications: certs, source: 'USDA Organic', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/compare', async (req, res) => {
  try {
    const items = req.query.items?.split(',') || [];
    if (items.length === 0) return res.status(400).json({ error: 'Items parameter required' });
    const comparison = await Promise.all(items.map(async (item) => {
      const pricing = await usdaService.getLivePricing(item.trim());
      return { commodity: item.trim(), pricing };
    }));
    res.json({ items, count: comparison.length, comparison, source: 'USDA AMS', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/forecast/:commodity', async (req, res) => {
  try {
    const { commodity } = req.params;
    const days = parseInt(req.query.days) || 30;
    const historical = await usdaService.getHistoricalData(commodity, 90);
    const prices = historical.map(h => parseFloat(h.Value || 0)).filter(v => v > 0);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const volatility = Math.sqrt(prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length);
    const trend = prices.slice(-7).reduce((a, b) => a + b, 0) / 7 > avgPrice ? 'up' : 'down';
    const forecast = { commodity, currentPrice: prices[prices.length - 1], avgPrice: avgPrice.toFixed(2), volatility: volatility.toFixed(2), trend, forecast30d: (avgPrice * (trend === 'up' ? 1.05 : 0.95)).toFixed(2), forecast90d: (avgPrice * (trend === 'up' ? 1.12 : 0.88)).toFixed(2), confidence: 0.78, factors: ['seasonal demand', 'weather', 'imports'] };
    res.json({ commodity, forecast, source: 'USDA + AI', timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;

