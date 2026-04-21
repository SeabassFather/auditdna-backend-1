const express = require('express');
const router = express.Router();
router.post('/calculate', (req, res) => {
    const { grsScore, waterScore, soilScore, marketVolatility, temperatureRisk } = req.body;
    const growerRisk = 100 - (grsScore || 85);
    const waterRisk = 100 - (waterScore || 90);
    const soilRisk = 100 - (soilScore || 88);
    const marketRisk = marketVolatility || 25;
    const tempRisk = temperatureRisk || 15;
    const triangularScore = ((growerRisk + waterRisk + soilRisk + marketRisk + tempRisk) / 5).toFixed(2);
    const rating = triangularScore < 20 ? 'LOW' : triangularScore < 40 ? 'MEDIUM' : triangularScore < 60 ? 'HIGH' : 'CRITICAL';
    res.json({ triangularRiskScore: parseFloat(triangularScore), rating, components: { growerRisk, waterRisk, soilRisk, marketRisk, tempRisk } });
});
module.exports = router;

