// ═══════════════════════════════════════════════════════════════
// AUDITDNA MULTI-AI VERIFICATION ROUTES
// 81 AI Cowboys - Multi-platform consensus verification system
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ═══════════════════════════════════════════════════════════════
// AI COWBOYS CONFIGURATION (81 Total = 9 Teams × 9 Cowboys each)
// ═══════════════════════════════════════════════════════════════

const AI_TEAMS = {
  COMPLIANCE: 'compliance_team',
  TRACEABILITY: 'traceability_team',
  DOCUMENT_ANALYSIS: 'document_analysis_team',
  RISK_ASSESSMENT: 'risk_assessment_team',
  DATA_VALIDATION: 'data_validation_team',
  FRAUD_DETECTION: 'fraud_detection_team',
  QUALITY_CONTROL: 'quality_control_team',
  MARKET_INTELLIGENCE: 'market_intelligence_team',
  PREDICTIVE_ANALYTICS: 'predictive_analytics_team'
};

const VERIFICATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  CONSENSUS_REACHED: 'consensus_reached',
  CONFLICTED: 'conflicted',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// ═══════════════════════════════════════════════════════════════
// INIT: Create multi-AI verification tables
// ═══════════════════════════════════════════════════════════════

const initAIVerificationTables = async () => {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS ai_verification_requests (
      id SERIAL PRIMARY KEY,
      request_id VARCHAR(100) UNIQUE,
      
      verification_type VARCHAR(100) NOT NULL,
      target_entity_type VARCHAR(50),
      target_entity_id INTEGER,
      
      data_payload JSONB NOT NULL,
      context JSONB,
      
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'normal',
      
      teams_assigned TEXT[],
      total_cowboys INTEGER DEFAULT 0,
      cowboys_responded INTEGER DEFAULT 0,
      
      consensus_score DECIMAL(5,2),
      confidence_level DECIMAL(5,2),
      unanimous BOOLEAN DEFAULT false,
      
      primary_result JSONB,
      consensus_result JSONB,
      conflict_areas TEXT[],
      
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      
      requested_by VARCHAR(255),
      notes TEXT,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_cowboy_responses (
      id SERIAL PRIMARY KEY,
      request_id VARCHAR(100) NOT NULL,
      
      team VARCHAR(50) NOT NULL,
      cowboy_id VARCHAR(50) NOT NULL,
      cowboy_name VARCHAR(255),
      
      platform VARCHAR(50),
      model_version VARCHAR(100),
      
      response_data JSONB NOT NULL,
      confidence_score DECIMAL(5,2),
      processing_time_ms INTEGER,
      
      vote VARCHAR(50),
      reasoning TEXT,
      evidence JSONB,
      
      status VARCHAR(50) DEFAULT 'completed',
      error_message TEXT,
      
      responded_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_consensus_analysis (
      id SERIAL PRIMARY KEY,
      request_id VARCHAR(100) NOT NULL,
      
      analysis_type VARCHAR(100),
      
      total_responses INTEGER,
      agreement_count INTEGER,
      disagreement_count INTEGER,
      abstention_count INTEGER,
      
      majority_vote VARCHAR(50),
      majority_percentage DECIMAL(5,2),
      
      confidence_distribution JSONB,
      team_breakdown JSONB,
      
      consensus_reached BOOLEAN,
      consensus_type VARCHAR(50),
      
      conflict_analysis TEXT,
      recommendations TEXT[],
      
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_verification_requests(status);
    CREATE INDEX IF NOT EXISTS idx_ai_requests_type ON ai_verification_requests(verification_type);
    CREATE INDEX IF NOT EXISTS idx_ai_responses_request ON ai_cowboy_responses(request_id);
    CREATE INDEX IF NOT EXISTS idx_ai_responses_team ON ai_cowboy_responses(team);
    CREATE INDEX IF NOT EXISTS idx_ai_consensus_request ON ai_consensus_analysis(request_id);
  `;

  try {
    await pool.query(createTablesSQL);
    console.log('✅ [Multi-AI Verification] Tables initialized');
  } catch (error) {
    console.error('❌ [Multi-AI Verification] Table init failed:', error.message);
  }
};

initAIVerificationTables();

// ═══════════════════════════════════════════════════════════════
// HELPER: Generate verification request ID
// ═══════════════════════════════════════════════════════════════

const generateRequestId = (verificationType) => {
  const prefix = verificationType.substring(0, 4).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `AI-${prefix}-${timestamp}`;
};

// ═══════════════════════════════════════════════════════════════
// POST /verify - Submit verification request
// ═══════════════════════════════════════════════════════════════

router.post('/verify', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      verificationType,
      targetEntityType,
      targetEntityId,
      dataPayload,
      context,
      teamsToAssign,
      priority,
      requestedBy
    } = req.body;

    const requestId = generateRequestId(verificationType);

    // Determine which AI teams to use
    let assignedTeams = teamsToAssign || [];
    if (assignedTeams.length === 0) {
      // Auto-assign based on verification type
      switch (verificationType) {
        case 'compliance_check':
          assignedTeams = [AI_TEAMS.COMPLIANCE, AI_TEAMS.DOCUMENT_ANALYSIS, AI_TEAMS.RISK_ASSESSMENT];
          break;
        case 'fraud_detection':
          assignedTeams = [AI_TEAMS.FRAUD_DETECTION, AI_TEAMS.DATA_VALIDATION, AI_TEAMS.RISK_ASSESSMENT];
          break;
        case 'document_verification':
          assignedTeams = [AI_TEAMS.DOCUMENT_ANALYSIS, AI_TEAMS.DATA_VALIDATION, AI_TEAMS.COMPLIANCE];
          break;
        case 'traceability_audit':
          assignedTeams = [AI_TEAMS.TRACEABILITY, AI_TEAMS.DATA_VALIDATION, AI_TEAMS.QUALITY_CONTROL];
          break;
        case 'risk_assessment':
          assignedTeams = [AI_TEAMS.RISK_ASSESSMENT, AI_TEAMS.FRAUD_DETECTION, AI_TEAMS.PREDICTIVE_ANALYTICS];
          break;
        default:
          assignedTeams = Object.values(AI_TEAMS).slice(0, 3); // Use first 3 teams
      }
    }

    const totalCowboys = assignedTeams.length * 9; // 9 cowboys per team

    const result = await client.query(
      `INSERT INTO ai_verification_requests (
        request_id, verification_type, target_entity_type, target_entity_id,
        data_payload, context, teams_assigned, total_cowboys, priority,
        requested_by, status, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'in_progress', NOW())
      RETURNING *`,
      [
        requestId, verificationType, targetEntityType, targetEntityId,
        JSON.stringify(dataPayload), JSON.stringify(context || {}),
        assignedTeams, totalCowboys, priority || 'normal', requestedBy || 'system'
      ]
    );

    await client.query('COMMIT');

    console.log(`✅ [AI Verification] Request created: ${requestId} (${verificationType})`);
    console.log(`   Teams assigned: ${assignedTeams.join(', ')}`);
    console.log(`   Total AI Cowboys: ${totalCowboys}`);

    // In production, this would trigger actual AI processing
    // For now, we simulate the verification process

    res.status(201).json({
      success: true,
      request: result.rows[0],
      requestId,
      teamsAssigned: assignedTeams,
      totalCowboys,
      message: 'AI verification request submitted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[AI Verification] Request creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /verify/:requestId/response - Submit AI cowboy response
// ═══════════════════════════════════════════════════════════════

router.post('/verify/:requestId/response', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { requestId } = req.params;
    const {
      team,
      cowboyId,
      cowboyName,
      platform,
      modelVersion,
      responseData,
      confidenceScore,
      processingTimeMs,
      vote,
      reasoning,
      evidence
    } = req.body;

    // Insert cowboy response
    const responseResult = await client.query(
      `INSERT INTO ai_cowboy_responses (
        request_id, team, cowboy_id, cowboy_name, platform, model_version,
        response_data, confidence_score, processing_time_ms, vote, reasoning, evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        requestId, team, cowboyId, cowboyName, platform, modelVersion,
        JSON.stringify(responseData), confidenceScore, processingTimeMs,
        vote, reasoning, JSON.stringify(evidence || {})
      ]
    );

    // Update request with new response count
    const updateResult = await client.query(
      `UPDATE ai_verification_requests 
       SET cowboys_responded = cowboys_responded + 1,
           updated_at = NOW()
       WHERE request_id = $1
       RETURNING *`,
      [requestId]
    );

    const request = updateResult.rows[0];

    // Check if all cowboys have responded
    if (request.cowboys_responded >= request.total_cowboys) {
      await client.query(
        `UPDATE ai_verification_requests 
         SET status = 'consensus_reached', completed_at = NOW()
         WHERE request_id = $1`,
        [requestId]
      );
    }

    await client.query('COMMIT');

    console.log(`✅ [AI Verification] Response from ${cowboyName} (${team})`);
    console.log(`   Progress: ${request.cowboys_responded}/${request.total_cowboys}`);

    res.json({
      success: true,
      response: responseResult.rows[0],
      progress: {
        responded: request.cowboys_responded,
        total: request.total_cowboys,
        percentage: Math.round((request.cowboys_responded / request.total_cowboys) * 100)
      },
      message: 'AI cowboy response recorded'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[AI Verification] Response submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /verify/:requestId/analyze - Analyze consensus
// ═══════════════════════════════════════════════════════════════

router.post('/verify/:requestId/analyze', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { requestId } = req.params;

    // Get all responses for this request
    const responses = await client.query(
      'SELECT * FROM ai_cowboy_responses WHERE request_id = $1',
      [requestId]
    );

    if (responses.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'No responses found for this request'
      });
    }

    // Analyze votes
    const voteCounts = {};
    responses.rows.forEach(r => {
      voteCounts[r.vote] = (voteCounts[r.vote] || 0) + 1;
    });

    const totalResponses = responses.rows.length;
    const sortedVotes = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    const majorityVote = sortedVotes[0][0];
    const majorityCount = sortedVotes[0][1];
    const majorityPercentage = (majorityCount / totalResponses) * 100;

    // Calculate confidence distribution
    const avgConfidence = responses.rows.reduce((sum, r) => sum + parseFloat(r.confidence_score || 0), 0) / totalResponses;

    // Team breakdown
    const teamBreakdown = {};
    responses.rows.forEach(r => {
      if (!teamBreakdown[r.team]) {
        teamBreakdown[r.team] = { total: 0, votes: {} };
      }
      teamBreakdown[r.team].total++;
      teamBreakdown[r.team].votes[r.vote] = (teamBreakdown[r.team].votes[r.vote] || 0) + 1;
    });

    // Determine consensus type
    let consensusType;
    let consensusReached;
    if (majorityPercentage === 100) {
      consensusType = 'unanimous';
      consensusReached = true;
    } else if (majorityPercentage >= 80) {
      consensusType = 'strong_consensus';
      consensusReached = true;
    } else if (majorityPercentage >= 66) {
      consensusType = 'majority_consensus';
      consensusReached = true;
    } else {
      consensusType = 'no_consensus';
      consensusReached = false;
    }

    // Insert consensus analysis
    const analysisResult = await client.query(
      `INSERT INTO ai_consensus_analysis (
        request_id, total_responses, agreement_count, disagreement_count,
        majority_vote, majority_percentage, confidence_distribution,
        team_breakdown, consensus_reached, consensus_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        requestId, totalResponses, majorityCount, totalResponses - majorityCount,
        majorityVote, majorityPercentage, JSON.stringify({ average: avgConfidence }),
        JSON.stringify(teamBreakdown), consensusReached, consensusType
      ]
    );

    // Update request with consensus results
    await client.query(
      `UPDATE ai_verification_requests 
       SET consensus_score = $1,
           confidence_level = $2,
           unanimous = $3,
           consensus_result = $4,
           status = 'completed',
           completed_at = NOW()
       WHERE request_id = $5`,
      [
        majorityPercentage,
        avgConfidence,
        consensusType === 'unanimous',
        JSON.stringify({ vote: majorityVote, confidence: avgConfidence }),
        requestId
      ]
    );

    await client.query('COMMIT');

    console.log(`✅ [AI Verification] Consensus analyzed: ${requestId}`);
    console.log(`   Result: ${consensusType} (${majorityPercentage.toFixed(1)}%)`);
    console.log(`   Majority vote: ${majorityVote}`);

    res.json({
      success: true,
      analysis: analysisResult.rows[0],
      summary: {
        consensusReached,
        consensusType,
        majorityVote,
        majorityPercentage: majorityPercentage.toFixed(2),
        averageConfidence: avgConfidence.toFixed(2),
        totalResponses,
        teamBreakdown
      },
      message: 'Consensus analysis completed'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[AI Verification] Analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /verify/:requestId - Get verification request with results
// ═══════════════════════════════════════════════════════════════

router.get('/verify/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await pool.query(
      'SELECT * FROM ai_verification_requests WHERE request_id = $1',
      [requestId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    const responses = await pool.query(
      'SELECT * FROM ai_cowboy_responses WHERE request_id = $1 ORDER BY responded_at ASC',
      [requestId]
    );

    const consensus = await pool.query(
      'SELECT * FROM ai_consensus_analysis WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1',
      [requestId]
    );

    res.json({
      success: true,
      request: request.rows[0],
      responses: responses.rows,
      consensus: consensus.rows[0] || null
    });

  } catch (error) {
    console.error('[AI Verification] Get request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /verify/dashboard - AI verification dashboard
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE unanimous = true) as unanimous_decisions,
        AVG(consensus_score) as avg_consensus_score,
        AVG(confidence_level) as avg_confidence_level,
        SUM(total_cowboys) as total_cowboys_deployed,
        SUM(cowboys_responded) as total_responses_received
      FROM ai_verification_requests
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const byType = await pool.query(`
      SELECT verification_type, COUNT(*) as count
      FROM ai_verification_requests
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY verification_type
      ORDER BY count DESC
    `);

    const teamPerformance = await pool.query(`
      SELECT 
        team,
        COUNT(*) as total_responses,
        AVG(confidence_score) as avg_confidence,
        AVG(processing_time_ms) as avg_processing_time
      FROM ai_cowboy_responses
      WHERE responded_at > NOW() - INTERVAL '30 days'
      GROUP BY team
      ORDER BY avg_confidence DESC
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      byVerificationType: byType.rows,
      teamPerformance: teamPerformance.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI Verification] Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = router;