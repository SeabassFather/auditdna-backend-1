const express = require('express');
const router = express.Router();

router.post('/weather-regions', async (req, res) => {
  try {
    const { regions } = req.body;
    const weatherData = regions.map(region => ({
      name: region.name,
      products: region.products || 'Multiple crops',
      temp: Math.floor(Math.random() * 30) + 60,
      humidity: Math.floor(Math.random() * 40) + 40,
      windSpeed: Math.floor(Math.random() * 15) + 5,
      soilTemp: Math.floor(Math.random() * 20) + 55,
      soilMoisture: Math.floor(Math.random() * 40) + 30,
      status: 'LIVE'
    }));
    res.json({ regions: weatherData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

module.exports = router;
