// ===========================================================================
// GROWER RECOMMENDATIONS ROUTES
// ===========================================================================
// AI-powered recommendations for growers
// ===========================================================================

const express = require('express');
const router = express.Router();

// Active recommendations
const recommendations = [
  {
    id: 'REC-001',
    grower: 'Rancho Verde',
    growerId: 'GRW-1001',
    category: 'irrigation',
    priority: 'high',
    title: 'Reduce Irrigation Frequency',
    recommendation: 'Based on soil moisture data, reduce irrigation by 20% to prevent root rot',
    expectedBenefit: 'Water savings of $2,400/month, improved plant health',
    confidence: 94.5,
    source: 'AI Cowboy: Water Wrangler',
    createdAt: '2026-02-03T08:00:00Z',
    status: 'active'
  },
  {
    id: 'REC-002',
    grower: 'Valle Farms',
    growerId: 'GRW-1002',
    category: 'pest_management',
    priority: 'medium',
    title: 'Preventive Pest Treatment',
    recommendation: 'Apply preventive treatment for aphids - early season indicators detected',
    expectedBenefit: 'Prevent estimated $15,000 crop loss',
    confidence: 87.2,
    source: 'AI Cowboy: Pest Patrol',
    createdAt: '2026-02-02T14:30:00Z',
    status: 'active'
  },
  {
    id: 'REC-003',
    grower: 'Costa Azul',
    growerId: 'GRW-1003',
    category: 'market_timing',
    priority: 'high',
    title: 'Delay Harvest by 5 Days',
    recommendation: 'Market prices expected to increase 12% next week - delay harvest for better ROI',
    expectedBenefit: 'Additional revenue of $8,500',
    confidence: 91.8,
    source: 'AI Cowboy: Market Scout',
    createdAt: '2026-02-01T10:15:00Z',
    status: 'active'
  },
  {
    id: 'REC-004',
    grower: 'Desert Gold',
    growerId: 'GRW-1004',
    category: 'fertilizer',
    priority: 'medium',
    title: 'Switch to Slow-Release Fertilizer',
    recommendation: 'Switch from quick-release to slow-release nitrogen for better uptake',
    expectedBenefit: 'Improved yield quality, 15% fertilizer cost reduction',
    confidence: 88.9,
    source: 'AI Cowboy: Soil Specialist',
    createdAt: '2026-01-31T16:45:00Z',
    status: 'active'
  },
  {
    id: 'REC-005',
    grower: 'Sierra Farms',
    growerId: 'GRW-1005',
    category: 'compliance',
    priority: 'urgent',
    title: 'Update FSMA Documentation',
    recommendation: 'Food safety plan expires in 15 days - schedule renewal immediately',
    expectedBenefit: 'Maintain market access, avoid $50,000+ penalties',
    confidence: 100,
    source: 'AI Cowboy: Compliance Deputy',
    createdAt: '2026-01-30T09:00:00Z',
    status: 'active'
  }
];

// ===========================================================================
// GET /api/grower-recommendations/active - Active recommendations
// ===========================================================================
router.get('/active', (req, res) => {
  const activeRecs = recommendations.filter(r => r.status === 'active');
  
  res.json({
    success: true,
    count: activeRecs.length,
    recommendations: activeRecs,
    summary: {
      urgent: activeRecs.filter(r => r.priority === 'urgent').length,
      high: activeRecs.filter(r => r.priority === 'high').length,
      medium: activeRecs.filter(r => r.priority === 'medium').length,
      low: activeRecs.filter(r => r.priority === 'low').length,
      avgConfidence: Math.round(activeRecs.reduce((a, r) => a + r.confidence, 0) / activeRecs.length * 10) / 10
    },
    categories: {
      irrigation: activeRecs.filter(r => r.category === 'irrigation').length,
      pest_management: activeRecs.filter(r => r.category === 'pest_management').length,
      market_timing: activeRecs.filter(r => r.category === 'market_timing').length,
      fertilizer: activeRecs.filter(r => r.category === 'fertilizer').length,
      compliance: activeRecs.filter(r => r.category === 'compliance').length
    }
  });
});

// ===========================================================================
// GET /api/grower-recommendations/grower/:growerId - Recommendations for specific grower
// ===========================================================================
router.get('/grower/:growerId', (req, res) => {
  const { growerId } = req.params;
  const growerRecs = recommendations.filter(r => r.growerId === growerId);
  
  res.json({
    success: true,
    growerId,
    count: growerRecs.length,
    recommendations: growerRecs
  });
});

// ===========================================================================
// GET /api/grower-recommendations/stats - Recommendation statistics
// ===========================================================================
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    totalGenerated: 1847,
    implemented: 1423,
    implementationRate: 77.1,
    avgROI: 340, // percent
    totalValueGenerated: 2847500,
    avgConfidence: 91.2,
    topCategories: [
      { category: 'market_timing', count: 423, avgROI: 450 },
      { category: 'irrigation', count: 387, avgROI: 280 },
      { category: 'fertilizer', count: 312, avgROI: 220 }
    ]
  });
});

// ===========================================================================
// PUT /api/grower-recommendations/:id/implement - Mark as implemented
// ===========================================================================
router.put('/:id/implement', (req, res) => {
  const { id } = req.params;
  const { outcome, notes } = req.body;
  
  const rec = recommendations.find(r => r.id === id);
  
  if (!rec) {
    return res.status(404).json({ success: false, error: 'Recommendation not found' });
  }
  
  rec.status = 'implemented';
  rec.implementedAt = new Date().toISOString();
  rec.outcome = outcome || 'pending_evaluation';
  rec.notes = notes || '';
  
  res.json({ success: true, recommendation: rec, message: 'Recommendation marked as implemented' });
});

// ===========================================================================
// PUT /api/grower-recommendations/:id/dismiss - Dismiss recommendation
// ===========================================================================
router.put('/:id/dismiss', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const rec = recommendations.find(r => r.id === id);
  
  if (!rec) {
    return res.status(404).json({ success: false, error: 'Recommendation not found' });
  }
  
  rec.status = 'dismissed';
  rec.dismissedAt = new Date().toISOString();
  rec.dismissReason = reason || 'Not applicable';
  
  res.json({ success: true, recommendation: rec, message: 'Recommendation dismissed' });
});

// ===========================================================================
// POST /api/grower-recommendations/generate - Request new recommendations
// ===========================================================================
router.post('/generate', (req, res) => {
  const { growerId, categories } = req.body;
  
  res.json({
    success: true,
    message: 'Recommendation generation queued',
    jobId: `JOB-${Date.now()}`,
    growerId: growerId || 'all',
    categories: categories || ['all'],
    estimatedCompletion: new Date(Date.now() + 300000).toISOString()
  });
});

module.exports = router;

