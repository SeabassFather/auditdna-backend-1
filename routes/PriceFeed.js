const express = require('express');
const router = express.Router();
const PriceFeed = require('../models/PriceFeed');

router.get('/live', async (req, res) => {
  const feed = await PriceFeed.find().sort({ timestamp: -1 }).limit(50);
  res.json(feed);
});

module.exports = router;

