// ===========================================================================
// SOILTECH ROUTES
// ===========================================================================
// Soil quality testing and analysis
// ===========================================================================

const express = require('express');
const router = express.Router();

// Sample soil test data
const soilTests = [
  { id: 'ST-2001', grower: 'Rancho Verde', location: 'Ensenada', nitrogen: 45, phosphorus: 32, potassium: 180, ph: 6.5, organic: 3.2, date: '2026-02-03', status: 'optimal' },
  { id: 'ST-2002', grower: 'Valle Farms', location: 'Guadalupe Valley', nitrogen: 38, phosphorus: 28, potassium: 150, ph: 6.8, organic: 2.8, date: '2026-02-02', status: 'good' },
  { id: 'ST-2003', grower: 'Desert Gold', location: 'Mexicali', nitrogen: 22, phosphorus: 15, potassium: 95, ph: 7.8, organic: 1.2, date: '2026-02-01', status: 'needs_amendment' },
  { id: 'ST-2004', grower: 'Costa Azul', location: 'San Quintin', nitrogen: 52, phosphorus: 38, potassium: 210, ph: 6.2, organic: 4.1, date: '2026-01-31', status: 'optimal' },
  { id: 'ST-2005', grower: 'Tierra Rica', location: 'Tecate', nitrogen: 31, phosphorus: 22, potassium: 130, ph: 7.2, organic: 2.1, date: '2026-01-30', status: 'good' }
];

// ===========================================================================
// GET /api/soiltech/recent-tests - Recent soil tests
// ===========================================================================
router.get('/recent-tests', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  res.json({
    success: true,
    count: soilTests.length,
    tests: soilTests.slice(0, limit),
    summary: {
      optimal: soilTests.filter(t => t.status === 'optimal').length,
      good: soilTests.filter(t => t.status === 'good').length,
      needsAmendment: soilTests.filter(t => t.status === 'needs_amendment').length
    }
  });
});

// ===========================================================================
// GET /api/soiltech/stats - Soil testing statistics
// ===========================================================================
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    totalTests: 892,
    avgNitrogen: 38,
    avgPhosphorus: 27,
    avgPotassium: 153,
    avgPH: 6.9,
    avgOrganic: 2.7,
    testsThisMonth: 67,
    fieldsNeedingAmendment: 12
  });
});

// ===========================================================================
// GET /api/soiltech/recommendations - Soil amendment recommendations
// ===========================================================================
router.get('/recommendations', (req, res) => {
  const recommendations = [
    { grower: 'Desert Gold', field: 'North 40', recommendation: 'Add nitrogen-rich fertilizer', priority: 'high' },
    { grower: 'Desert Gold', field: 'South Block', recommendation: 'Add compost for organic matter', priority: 'medium' },
    { grower: 'Tierra Rica', field: 'Main Field', recommendation: 'Consider cover crop rotation', priority: 'low' }
  ];
  
  res.json({ success: true, count: recommendations.length, recommendations });
});

// ===========================================================================
// POST /api/soiltech/submit - Submit new soil test
// ===========================================================================
router.post('/submit', (req, res) => {
  const { growerId, growerName, location, nitrogen, phosphorus, potassium, ph, organic } = req.body;
  
  // Determine status based on values
  let status = 'good';
  if (nitrogen >= 40 && phosphorus >= 30 && potassium >= 150 && organic >= 3) {
    status = 'optimal';
  } else if (nitrogen < 25 || phosphorus < 20 || potassium < 100 || organic < 1.5) {
    status = 'needs_amendment';
  }
  
  const newTest = {
    id: `ST-${Date.now()}`,
    grower: growerName || 'Unknown',
    location: location || 'Unknown',
    nitrogen: nitrogen || 0,
    phosphorus: phosphorus || 0,
    potassium: potassium || 0,
    ph: ph || 7.0,
    organic: organic || 0,
    date: new Date().toISOString().split('T')[0],
    status
  };
  
  soilTests.unshift(newTest);
  
  res.json({ success: true, test: newTest });
});

module.exports = router;

