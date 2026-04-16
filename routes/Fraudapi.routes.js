// ═══════════════════════════════════════════════════════════════════════════════════════════
// AUDITDNA - FRAUD API ROUTES (CommonJS)
// Mexausa Food Group, Inc. | AuditDNA Platform
// ═══════════════════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════════════════════════
const fraudFlags = new Map();

// ═══════════════════════════════════════════════════════════════════════════════════════════
// RISK CODES
// ═══════════════════════════════════════════════════════════════════════════════════════════
const RISK_CODES = {
  FR001: { code: 'FR001', name: 'High Margin Anomaly', weight: 25 },
  FR002: { code: 'FR002', name: 'Off-Hours Transaction', weight: 15 },
  FR003: { code: 'FR003', name: 'Velocity Spike', weight: 20 },
  FR004: { code: 'FR004', name: 'New Entity High Value', weight: 30 },
  FR005: { code: 'FR005', name: 'Jurisdiction Mismatch', weight: 20 },
  FR006: { code: 'FR006', name: 'Rapid Mutation', weight: 25 },
  FR007: { code: 'FR007', name: 'Cert Expired Transaction', weight: 35 },
  FR008: { code: 'FR008', name: 'Price Below Market', weight: 20 },
  FR009: { code: 'FR009', name: 'Duplicate Invoice', weight: 40 },
  FR010: { code: 'FR010', name: 'Sanction List Hit', weight: 50 }
};

// Sample flags
fraudFlags.set('FLG-001', {
  id: 'FLG-001',
  entity_id: 'TXN-98765',
  risk_codes: ['FR001', 'FR002'],
  risk_score: 40,
  risk_level: 'MEDIUM',
  jurisdiction: 'MX',
  status: 'FLAGGED',
  flagged_by: 'SYSTEM',
  created_at: '2026-01-14T23:15:00Z'
});

fraudFlags.set('FLG-002', {
  id: 'FLG-002',
  entity_id: 'TXN-87654',
  risk_codes: ['FR004', 'FR006', 'FR007'],
  risk_score: 90,
  risk_level: 'CRITICAL',
  jurisdiction: 'MX',
  status: 'UNDER_REVIEW',
  flagged_by: 'SYSTEM',
  created_at: '2026-01-15T08:30:00Z'
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET ALL FLAGS
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/flags', async (req, res) => {
  try {
    const { status, risk_level, jurisdiction, min_score, limit = 100 } = req.query;
    
    let results = Array.from(fraudFlags.values());
    
    if (status) results = results.filter(f => f.status === status);
    if (risk_level) results = results.filter(f => f.risk_level === risk_level);
    if (jurisdiction) results = results.filter(f => f.jurisdiction === jurisdiction);
    if (min_score) results = results.filter(f => f.risk_score >= parseInt(min_score));
    
    results.sort((a, b) => b.risk_score - a.risk_score);
    results = results.slice(0, Number(limit));
    
    res.json({
      success: true,
      count: results.length,
      criticalCount: results.filter(f => f.risk_level === 'CRITICAL').length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// GET SINGLE FLAG
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/flags/:id', async (req, res) => {
  try {
    const flag = fraudFlags.get(req.params.id);
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    
    const enrichedCodes = flag.risk_codes.map(code => ({
      ...RISK_CODES[code],
      triggered: true
    }));
    
    res.json({
      success: true,
      data: { ...flag, risk_code_details: enrichedCodes }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CREATE FLAG
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/flags', async (req, res) => {
  try {
    const { entity_id, risk_codes, reason, jurisdiction } = req.body;
    
    if (!entity_id || !risk_codes || risk_codes.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const riskScore = Math.min(100, risk_codes.reduce((sum, code) => 
      sum + (RISK_CODES[code]?.weight || 0), 0));
    
    let riskLevel = 'LOW';
    if (riskScore > 75) riskLevel = 'CRITICAL';
    else if (riskScore > 50) riskLevel = 'HIGH';
    else if (riskScore > 25) riskLevel = 'MEDIUM';
    
    const flag = {
      id: `FLG-${Date.now()}`,
      entity_id,
      risk_codes,
      risk_score: riskScore,
      risk_level: riskLevel,
      risk_details: { manual: true, reason },
      jurisdiction: jurisdiction || 'US',
      status: 'FLAGGED',
      flagged_by: req.user?.sub || 'SYSTEM',
      created_at: new Date().toISOString()
    };
    
    fraudFlags.set(flag.id, flag);
    res.status(201).json({ success: true, data: flag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REVIEW FLAG
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/flags/:id/review', async (req, res) => {
  try {
    const flag = fraudFlags.get(req.params.id);
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    
    flag.status = 'UNDER_REVIEW';
    flag.reviewed_by = req.user?.sub || 'SYSTEM';
    flag.review_started_at = new Date().toISOString();
    
    fraudFlags.set(flag.id, flag);
    res.json({ success: true, data: flag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CLEAR FLAG
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/flags/:id/clear', async (req, res) => {
  try {
    const flag = fraudFlags.get(req.params.id);
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    
    const { clear_reason } = req.body;
    if (!clear_reason) {
      return res.status(400).json({ error: 'Clear reason required' });
    }
    
    flag.status = 'CLEARED';
    flag.cleared_by = req.user?.sub || 'SYSTEM';
    flag.cleared_at = new Date().toISOString();
    flag.clear_reason = clear_reason;
    
    fraudFlags.set(flag.id, flag);
    res.json({ success: true, data: flag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// BLOCK ENTITY
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/flags/:id/block', async (req, res) => {
  try {
    const flag = fraudFlags.get(req.params.id);
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    
    flag.status = 'BLOCKED';
    flag.blocked_by = req.user?.sub || 'SYSTEM';
    flag.blocked_at = new Date().toISOString();
    flag.block_reason = req.body.reason || 'Fraud confirmed';
    
    fraudFlags.set(flag.id, flag);
    res.json({ success: true, data: flag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ANALYZE TRANSACTION
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.post('/analyze', async (req, res) => {
  try {
    const { entity_id, transaction_data, jurisdiction = 'US' } = req.body;
    
    const triggeredCodes = [];
    
    // Check margin
    if (transaction_data?.margin > 55) {
      triggeredCodes.push('FR001');
    }
    
    // Check transaction hour
    const hour = new Date().getHours();
    if (hour >= 21 || hour <= 7) {
      triggeredCodes.push('FR002');
    }
    
    // Check transaction value for new entity
    if (transaction_data?.entityAge < 30 && transaction_data?.value > 50000) {
      triggeredCodes.push('FR004');
    }
    
    // Calculate score
    const riskScore = Math.min(100, triggeredCodes.reduce((sum, code) => 
      sum + (RISK_CODES[code]?.weight || 0), 0));
    
    let riskLevel = 'LOW';
    if (riskScore > 75) riskLevel = 'CRITICAL';
    else if (riskScore > 50) riskLevel = 'HIGH';
    else if (riskScore > 25) riskLevel = 'MEDIUM';
    
    const shouldFlag = riskScore >= 25;
    
    res.json({
      success: true,
      analysis: {
        entity_id,
        risk_score: riskScore,
        risk_level: riskLevel,
        triggered_codes: triggeredCodes.map(c => RISK_CODES[c]),
        should_flag: shouldFlag,
        recommendation: shouldFlag ? 'FLAG_FOR_REVIEW' : 'ALLOW'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const all = Array.from(fraudFlags.values());
    
    const stats = {
      total: all.length,
      byStatus: {},
      byRiskLevel: {},
      byJurisdiction: {},
      averageScore: 0
    };
    
    let totalScore = 0;
    all.forEach(f => {
      stats.byStatus[f.status] = (stats.byStatus[f.status] || 0) + 1;
      stats.byRiskLevel[f.risk_level] = (stats.byRiskLevel[f.risk_level] || 0) + 1;
      stats.byJurisdiction[f.jurisdiction] = (stats.byJurisdiction[f.jurisdiction] || 0) + 1;
      totalScore += f.risk_score;
    });
    
    stats.averageScore = all.length > 0 ? Math.round(totalScore / all.length) : 0;
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════════════════════
router.get('/reference/risk-codes', (req, res) => {
  res.json({ success: true, data: Object.values(RISK_CODES) });
});

module.exports = router;
