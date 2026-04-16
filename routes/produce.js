// ================================================================
// PRODUCE API ROUTES
// ================================================================
const express = require('express');
const router = express.Router();
const ProduceRecord = require('../models/ProduceRecord');

// GET /api/produce/commodity/:name - Fetch historical records
router.get('/commodity/:name', async (req, res) => {
  try {
    const records = await ProduceRecord.find({ 
      commodity: req.params.name 
    })
    .sort({ date: -1 })
    .limit(100);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produce/compare?items=A,B - Multi-commodity comparison
router.get('/compare', async (req, res) => {
  try {
    const items = req.query.items.split(',');
    const records = await ProduceRecord.find({ 
      commodity: { $in: items } 
    })
    .sort({ date: -1 })
    .limit(500);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produce/regions/:commodity - Regional price map
router.get('/regions/:commodity', async (req, res) => {
  try {
    const records = await ProduceRecord.aggregate([
      { $match: { commodity: req.params.commodity } },
      { $group: { 
        _id: '$region',
        avgPrice: { $avg: '$wholesalePrice' },
        count: { $sum: 1 }
      }}
    ]);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/produce/analyze - Return margin and AI forecast
router.post('/analyze', async (req, res) => {
  try {
    const { commodity, quantity, cost } = req.body;
    const latestRecord = await ProduceRecord.findOne({ commodity })
      .sort({ date: -1 });
    
    if (!latestRecord) {
      return res.status(404).json({ error: 'Commodity not found' });
    }

    const margin = ((latestRecord.wholesalePrice - cost) / latestRecord.wholesalePrice * 100);
    const profit = (latestRecord.wholesalePrice - cost) * quantity;

    res.json({
      commodity,
      currentPrice: latestRecord.wholesalePrice,
      margin: margin.toFixed(2),
      profit: profit.toFixed(2),
      aiForecast: latestRecord.aiForecast || latestRecord.wholesalePrice * 1.05
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produce/top - Top gainers/losers of the week
router.get('/top', async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const gainers = await ProduceRecord.aggregate([
      { $match: { date: { $gte: weekAgo } } },
      { $group: { 
        _id: '$commodity',
        priceChange: { $avg: '$wholesalePrice' }
      }},
      { $sort: { priceChange: -1 } },
      { $limit: 10 }
    ]);

    res.json(gainers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
