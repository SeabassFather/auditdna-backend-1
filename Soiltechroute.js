// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SOILTECH ROUTES - CONSOLIDATED MASTER FILE
// Mexausa Food Group, Inc. / MexaUSA Food Group, Inc.
// Soil quality testing, OCR analysis, and recommendations
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SAMPLE SOIL TEST DATA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let soilTests = [
  { id: 'ST-2001', grower: 'Rancho Verde', growerId: 'GRW-1001', location: 'Ensenada', nitrogen: 45, phosphorus: 32, potassium: 180, ph: 6.5, organic: 3.2, calcium: 1200, magnesium: 180, sulfur: 25, date: '2026-02-03', status: 'optimal', score: 95, grade: 'A' },
  { id: 'ST-2002', grower: 'Valle Farms', growerId: 'GRW-1002', location: 'Guadalupe Valley', nitrogen: 38, phosphorus: 28, potassium: 150, ph: 6.8, organic: 2.8, calcium: 1100, magnesium: 160, sulfur: 22, date: '2026-02-02', status: 'good', score: 85, grade: 'B' },
  { id: 'ST-2003', grower: 'Desert Gold', growerId: 'GRW-1003', location: 'Mexicali', nitrogen: 22, phosphorus: 15, potassium: 95, ph: 7.8, organic: 1.2, calcium: 800, magnesium: 120, sulfur: 15, date: '2026-02-01', status: 'needs_amendment', score: 55, grade: 'D' },
  { id: 'ST-2004', grower: 'Costa Azul', growerId: 'GRW-1004', location: 'San Quintin', nitrogen: 52, phosphorus: 38, potassium: 210, ph: 6.2, organic: 4.1, calcium: 1400, magnesium: 200, sulfur: 30, date: '2026-01-31', status: 'optimal', score: 98, grade: 'A' },
  { id: 'ST-2005', grower: 'Tierra Rica', growerId: 'GRW-1005', location: 'Tecate', nitrogen: 31, phosphorus: 22, potassium: 130, ph: 7.2, organic: 2.1, calcium: 950, magnesium: 140, sulfur: 18, date: '2026-01-30', status: 'good', score: 78, grade: 'C' }
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/soiltechroute/recent-tests - Recent Soil Tests
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/soiltechroute/stats - Soil Testing Statistics
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/stats', (req, res) => {
  const avgNitrogen = Math.round(soilTests.reduce((sum, t) => sum + t.nitrogen, 0) / soilTests.length);
  const avgPhosphorus = Math.round(soilTests.reduce((sum, t) => sum + t.phosphorus, 0) / soilTests.length);
  const avgPotassium = Math.round(soilTests.reduce((sum, t) => sum + t.potassium, 0) / soilTests.length);
  const avgPH = (soilTests.reduce((sum, t) => sum + t.ph, 0) / soilTests.length).toFixed(1);
  const avgOrganic = (soilTests.reduce((sum, t) => sum + t.organic, 0) / soilTests.length).toFixed(1);
  
  res.json({
    success: true,
    totalTests: soilTests.length,
    avgNitrogen,
    avgPhosphorus,
    avgPotassium,
    avgPH,
    avgOrganic,
    testsThisMonth: soilTests.filter(t => new Date(t.date) > new Date(Date.now() - 30*24*60*60*1000)).length,
    fieldsNeedingAmendment: soilTests.filter(t => t.status === 'needs_amendment').length
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/soiltechroute/recommendations - Soil Amendment Recommendations
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/recommendations', (req, res) => {
  const needsAmendment = soilTests.filter(t => t.status === 'needs_amendment');
  
  const recommendations = needsAmendment.map(test => {
    const recs = [];
    if (test.nitrogen < 25) recs.push({ grower: test.grower, field: test.location, recommendation: 'Add nitrogen-rich fertilizer', priority: 'high', cost: '$200-$500/ha' });
    if (test.organic < 2.0) recs.push({ grower: test.grower, field: test.location, recommendation: 'Add compost for organic matter', priority: 'medium', cost: '$500-$2000/ha' });
    if (test.ph < 6.0 || test.ph > 7.5) recs.push({ grower: test.grower, field: test.location, recommendation: test.ph < 6.0 ? 'Apply lime to raise pH' : 'Apply sulfur to lower pH', priority: 'medium', cost: '$100-$300/ha' });
    return recs;
  }).flat();
  
  res.json({ success: true, count: recommendations.length, recommendations });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/soiltechroute/test-upload - Upload Soil Lab Test PDF/CSV
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/test-upload', upload.single('file'), async (req, res) => {
  try {
    const { growerId, growerName, testType, location } = req.body;
    const newTest = {
      id: `ST-${Date.now()}`,
      growerId,
      growerName,
      testType: testType || 'complete',
      location: location || 'Unknown',
      filePath: req.file ? req.file.path : null,
      uploadedAt: new Date().toISOString(),
      status: 'pending_extraction'
    };
    soilTests.unshift(newTest);
    res.status(201).json({ success: true, test: newTest, message: 'Soil test uploaded - OCR extraction pending' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/soiltechroute/ocr-extract - Extract Data from Uploaded Soil Test
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/ocr-extract', async (req, res) => {
  try {
    const { testId } = req.body;
    
    // Simulated OCR extraction (would integrate with actual OCR service)
    const extractedData = {
      ph: 6.8,
      nitrogen: 45,
      phosphorus: 32,
      potassium: 180,
      calcium: 1200,
      magnesium: 180,
      sulfur: 25,
      organic_matter: 3.2,
      soil_moisture: 18.5,
      iron: 55,
      manganese: 8,
      boron: 0.8,
      zinc: 2.5,
      copper: 1.2,
      ec: 1.2,
      cec: 15
    };
    
    res.json({ success: true, extractedData, testId, message: 'OCR extraction completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/soiltechroute/analyze - Analyze Soil Test Results
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/analyze', async (req, res) => {
  try {
    const { testData, growerId, growerName, location } = req.body;
    
    let score = 100;
    let issues = [];
    let recommendations = [];

    // Organic Matter Check
    if (testData.organic_matter < 2.0) {
      score -= 15;
      issues.push({ parameter: 'Organic Matter', value: testData.organic_matter, threshold: '2%', severity: 'moderate' });
      recommendations.push({ title: 'Increase Organic Matter', action: 'Apply 10-20 tons/ha compost', cost: '$500-$2000/ha', priority: 'high' });
    }

    // Nitrogen Check
    if (testData.nitrogen < 25) {
      score -= 12;
      issues.push({ parameter: 'Nitrogen', value: testData.nitrogen, threshold: '25 ppm', severity: 'moderate' });
      recommendations.push({ title: 'Nitrogen Deficiency', action: 'Apply urea (46-0-0) at 100-150 kg/ha', cost: '$200-$500/ha', priority: 'high' });
    }

    // pH Check
    if (testData.ph < 6.0 || testData.ph > 7.5) {
      score -= 10;
      issues.push({ parameter: 'pH', value: testData.ph, threshold: '6.0-7.5', severity: 'low' });
      recommendations.push({ 
        title: testData.ph < 6.0 ? 'Raise pH' : 'Lower pH', 
        action: testData.ph < 6.0 ? 'Apply lime' : 'Apply sulfur',
        cost: '$100-$300/ha',
        priority: 'medium'
      });
    }

    // Phosphorus Check
    if (testData.phosphorus < 20) {
      score -= 8;
      issues.push({ parameter: 'Phosphorus', value: testData.phosphorus, threshold: '20 ppm', severity: 'moderate' });
      recommendations.push({ title: 'Phosphorus Deficiency', action: 'Apply DAP (18-46-0) at 50-100 kg/ha', cost: '$150-$400/ha', priority: 'medium' });
    }

    const finalScore = Math.max(0, score);
    const grade = finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : 'D';
    const status = finalScore >= 70 ? 'optimal' : finalScore >= 50 ? 'good' : 'needs_amendment';

    const analysis = {
      score: finalScore,
      grade,
      status,
      issues,
      recommendations,
      analyzedAt: new Date().toISOString()
    };

    // Save analyzed test
    const newTest = {
      id: `ST-${Date.now()}`,
      growerId,
      growerName,
      grower: growerName,
      location: location || 'Unknown',
      nitrogen: testData.nitrogen,
      phosphorus: testData.phosphorus,
      potassium: testData.potassium,
      ph: testData.ph,
      organic: testData.organic_matter,
      calcium: testData.calcium || 0,
      magnesium: testData.magnesium || 0,
      sulfur: testData.sulfur || 0,
      date: new Date().toISOString().split('T')[0],
      status,
      score: finalScore,
      grade
    };
    
    soilTests.unshift(newTest);

    res.json({ success: true, analysis, test: newTest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/soiltechroute/submit - Submit New Soil Test
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/submit', (req, res) => {
  const { growerId, growerName, location, nitrogen, phosphorus, potassium, ph, organic, calcium, magnesium, sulfur } = req.body;
  
  // Determine status based on values
  let score = 100;
  if (nitrogen < 25) score -= 12;
  if (phosphorus < 20) score -= 8;
  if (potassium < 100) score -= 10;
  if (organic < 2.0) score -= 15;
  if (ph < 6.0 || ph > 7.5) score -= 10;
  
  const finalScore = Math.max(0, score);
  const grade = finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : 'D';
  let status = 'good';
  if (nitrogen >= 40 && phosphorus >= 30 && potassium >= 150 && organic >= 3) {
    status = 'optimal';
  } else if (nitrogen < 25 || phosphorus < 20 || potassium < 100 || organic < 1.5) {
    status = 'needs_amendment';
  }
  
  const newTest = {
    id: `ST-${Date.now()}`,
    grower: growerName || 'Unknown',
    growerName: growerName || 'Unknown',
    growerId: growerId || 'Unknown',
    location: location || 'Unknown',
    nitrogen: nitrogen || 0,
    phosphorus: phosphorus || 0,
    potassium: potassium || 0,
    ph: ph || 7.0,
    organic: organic || 0,
    calcium: calcium || 0,
    magnesium: magnesium || 0,
    sulfur: sulfur || 0,
    date: new Date().toISOString().split('T')[0],
    status,
    score: finalScore,
    grade
  };
  
  soilTests.unshift(newTest);
  
  res.json({ success: true, test: newTest });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/soiltechroute/history/:growerId - Soil Test History for Grower
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/history/:growerId', async (req, res) => {
  try {
    const { growerId } = req.params;
    const growerTests = soilTests.filter(t => t.growerId === growerId);
    res.json({ success: true, count: growerTests.length, tests: growerTests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/soiltechroute/phi-compliance - Pre-Harvest Interval Compliance Check
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/phi-compliance', async (req, res) => {
  try {
    const { testData, applicationDate, harvestDate } = req.body;
    
    const daysBetween = Math.floor((new Date(harvestDate) - new Date(applicationDate)) / (1000 * 60 * 60 * 24));
    const requiredPHI = 7; // days    
    const compliance = {
      compliant: daysBetween >= requiredPHI,
      daysBetween,
      requiredPHI,
      status: daysBetween >= requiredPHI ? 'PASS' : 'FAIL',
      checkedAt: new Date().toISOString()
    };
    
    res.json({ success: true, compliance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

