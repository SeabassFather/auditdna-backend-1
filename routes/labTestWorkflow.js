// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUDITDNA LAB TEST WORKFLOW ROUTES
// Soil, Water, Seed testing workflow management
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TEST TYPES & STATUS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const TEST_TYPES = {
  SOIL: 'soil',
  WATER: 'water',
  SEED: 'seed',
  FERTILIZER: 'fertilizer',
  PESTICIDE_RESIDUE: 'pesticide_residue',
  HEAVY_METALS: 'heavy_metals',
  MICROBIAL: 'microbial'
};

const WORKFLOW_STATUS = {
  REQUESTED: 'requested',
  SAMPLE_COLLECTED: 'sample_collected',
  IN_TRANSIT: 'in_transit',
  RECEIVED_BY_LAB: 'received_by_lab',
  TESTING_IN_PROGRESS: 'testing_in_progress',
  RESULTS_AVAILABLE: 'results_available',
  RESULTS_REVIEWED: 'results_reviewed',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INIT: Create lab test workflow tables
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const initLabTestTables = async () => {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS lab_test_requests (
      id SERIAL PRIMARY KEY,
      request_number VARCHAR(50) UNIQUE,
      grower_id INTEGER NOT NULL,
      grower_name VARCHAR(255),
      
      test_type VARCHAR(50) NOT NULL,
      test_category VARCHAR(100),
      urgency VARCHAR(20) DEFAULT 'normal',
      
      sample_location VARCHAR(255),
      sample_description TEXT,
      sample_collected_date TIMESTAMP,
      sample_collected_by VARCHAR(255),
      
      lab_name VARCHAR(255),
      lab_contact VARCHAR(255),
      lab_certification VARCHAR(100),
      
      status VARCHAR(50) DEFAULT 'requested',
      workflow_stage VARCHAR(50) DEFAULT 'sample_collection',
      
      tracking_number VARCHAR(100),
      shipped_date TIMESTAMP,
      received_date TIMESTAMP,
      testing_started_date TIMESTAMP,
      results_date TIMESTAMP,
      
      results JSONB,
      compliance_status VARCHAR(50),
      pass_fail VARCHAR(20),
      
      estimated_completion DATE,
      actual_completion DATE,
      
      assigned_to VARCHAR(255),
      notes TEXT,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lab_test_results (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES lab_test_requests(id),
      grower_id INTEGER NOT NULL,
      
      test_type VARCHAR(50) NOT NULL,
      parameter_name VARCHAR(255),
      result_value DECIMAL(12,4),
      result_unit VARCHAR(50),
      
      reference_min DECIMAL(12,4),
      reference_max DECIMAL(12,4),
      threshold_value DECIMAL(12,4),
      
      status VARCHAR(50),
      compliance BOOLEAN,
      
      tested_date TIMESTAMP,
      verified_by VARCHAR(255),
      
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lab_test_history (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES lab_test_requests(id),
      
      action VARCHAR(100) NOT NULL,
      status_from VARCHAR(50),
      status_to VARCHAR(50),
      
      performed_by VARCHAR(255),
      notes TEXT,
      attachments TEXT[],
      
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_lab_requests_grower ON lab_test_requests(grower_id);
    CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_test_requests(status);
    CREATE INDEX IF NOT EXISTS idx_lab_results_request ON lab_test_results(request_id);
    CREATE INDEX IF NOT EXISTS idx_lab_history_request ON lab_test_history(request_id);
  `;

  try {
    await global.db.query(createTablesSQL);
    console.log('âœ… [Lab Test Workflow] Tables initialized');
  } catch (error) {
    console.error('âŒ [Lab Test Workflow] Table init failed:', error.message);
  }
};

initLabTestTables();

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELPER: Generate request number
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const generateRequestNumber = (testType) => {
  const prefix = testType.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-8);
  return `LAB-${prefix}-${timestamp}`;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /lab/request - Create new test request
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/request', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      growerId, growerName, testType, testCategory, urgency,
      sampleLocation, sampleDescription, labName, labContact,
      labCertification, assignedTo, estimatedCompletion
    } = req.body;

    const requestNumber = generateRequestNumber(testType);

    const result = await client.query(
      `INSERT INTO lab_test_requests (
        request_number, grower_id, grower_name, test_type, test_category,
        urgency, sample_location, sample_description, lab_name, lab_contact,
        lab_certification, assigned_to, estimated_completion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        requestNumber, growerId, growerName, testType, testCategory,
        urgency || 'normal', sampleLocation, sampleDescription, labName,
        labContact, labCertification, assignedTo, estimatedCompletion
      ]
    );

    const request = result.rows[0];

    // Log history
    await client.query(
      `INSERT INTO lab_test_history (
        request_id, action, status_to, performed_by
      ) VALUES ($1, 'request_created', 'requested', $2)`,
      [request.id, assignedTo || 'system']
    );

    await client.query('COMMIT');

    console.log(`âœ… [Lab Test] Request created: ${requestNumber} (${testType})`);

    res.status(201).json({
      success: true,
      request,
      message: 'Lab test request created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Lab Test] Request creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PUT /lab/status/:requestId - Update request status
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.put('/status/:requestId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { requestId } = req.params;
    const { status, workflowStage, notes, performedBy, trackingNumber } = req.body;

    // Get current request
    const currentRequest = await client.query(
      'SELECT * FROM lab_test_requests WHERE id = $1',
      [requestId]
    );

    if (currentRequest.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const oldStatus = currentRequest.rows[0].status;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    updates.push(`status = $${paramIndex}`);
    values.push(status);
    paramIndex++;

    if (workflowStage) {
      updates.push(`workflow_stage = $${paramIndex}`);
      values.push(workflowStage);
      paramIndex++;
    }

    if (trackingNumber) {
      updates.push(`tracking_number = $${paramIndex}`);
      values.push(trackingNumber);
      paramIndex++;
    }

    // Update date fields based on status
    if (status === WORKFLOW_STATUS.SAMPLE_COLLECTED) {
      updates.push(`sample_collected_date = NOW()`);
    } else if (status === WORKFLOW_STATUS.IN_TRANSIT) {
      updates.push(`shipped_date = NOW()`);
    } else if (status === WORKFLOW_STATUS.RECEIVED_BY_LAB) {
      updates.push(`received_date = NOW()`);
    } else if (status === WORKFLOW_STATUS.TESTING_IN_PROGRESS) {
      updates.push(`testing_started_date = NOW()`);
    } else if (status === WORKFLOW_STATUS.RESULTS_AVAILABLE) {
      updates.push(`results_date = NOW()`);
    } else if (status === WORKFLOW_STATUS.COMPLETED) {
      updates.push(`actual_completion = CURRENT_DATE`);
    }

    updates.push(`updated_at = NOW()`);
    values.push(requestId);

    const updateQuery = `
      UPDATE lab_test_requests 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    // Log history
    await client.query(
      `INSERT INTO lab_test_history (
        request_id, action, status_from, status_to, performed_by, notes
      ) VALUES ($1, 'status_updated', $2, $3, $4, $5)`,
      [requestId, oldStatus, status, performedBy || 'system', notes]
    );

    await client.query('COMMIT');

    console.log(`âœ… [Lab Test] Status updated: ${currentRequest.rows[0].request_number} â†’ ${status}`);

    res.json({
      success: true,
      request: result.rows[0],
      message: 'Status updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Lab Test] Status update error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /lab/results/:requestId - Submit test results
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/results/:requestId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { requestId } = req.params;
    const { results, complianceStatus, passFail, verifiedBy } = req.body;

    // Update request with results
    const requestResult = await client.query(
      `UPDATE lab_test_requests 
       SET results = $1,
           compliance_status = $2,
           pass_fail = $3,
           status = 'results_available',
           results_date = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [JSON.stringify(results), complianceStatus, passFail, requestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Insert individual result parameters
    if (Array.isArray(results)) {
      for (const param of results) {
        await client.query(
          `INSERT INTO lab_test_results (
            request_id, grower_id, test_type, parameter_name,
            result_value, result_unit, reference_min, reference_max,
            threshold_value, status, compliance, verified_by, tested_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            requestId, request.grower_id, request.test_type, param.name,
            param.value, param.unit, param.refMin, param.refMax,
            param.threshold, param.status, param.compliant, verifiedBy
          ]
        );
      }
    }

    // Log history
    await client.query(
      `INSERT INTO lab_test_history (
        request_id, action, status_to, performed_by
      ) VALUES ($1, 'results_submitted', 'results_available', $2)`,
      [requestId, verifiedBy || 'lab']
    );

    await client.query('COMMIT');

    console.log(`âœ… [Lab Test] Results submitted: ${request.request_number}`);

    res.json({
      success: true,
      request: requestResult.rows[0],
      resultsCount: Array.isArray(results) ? results.length : 0,
      message: 'Test results submitted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Lab Test] Results submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /lab/requests/:growerId - Get all requests for grower
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/requests/:growerId', async (req, res) => {
  try {
    const { growerId } = req.params;
    const { testType, status, limit = 50 } = req.query;

    let query = 'SELECT * FROM lab_test_requests WHERE grower_id = $1';
    const params = [growerId];
    let paramIndex = 2;

    if (testType) {
      query += ` AND test_type = $${paramIndex}`;
      params.push(testType);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await global.db.query(query, params);

    res.json({
      success: true,
      requests: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('[Lab Test] Get requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /lab/request/:requestId - Get single request with details
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await global.db.query(
      'SELECT * FROM lab_test_requests WHERE id = $1',
      [requestId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const results = await global.db.query(
      'SELECT * FROM lab_test_results WHERE request_id = $1 ORDER BY created_at ASC',
      [requestId]
    );

    const history = await global.db.query(
      'SELECT * FROM lab_test_history WHERE request_id = $1 ORDER BY created_at DESC',
      [requestId]
    );

    res.json({
      success: true,
      request: request.rows[0],
      results: results.rows,
      history: history.rows
    });

  } catch (error) {
    console.error('[Lab Test] Get request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /lab/dashboard - Lab test workflow dashboard
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await global.db.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'requested') as pending_collection,
        COUNT(*) FILTER (WHERE status = 'sample_collected') as collected,
        COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
        COUNT(*) FILTER (WHERE status = 'received_by_lab') as at_lab,
        COUNT(*) FILTER (WHERE status = 'testing_in_progress') as testing,
        COUNT(*) FILTER (WHERE status = 'results_available') as results_ready,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE pass_fail = 'pass') as passed,
        COUNT(*) FILTER (WHERE pass_fail = 'fail') as failed
      FROM lab_test_requests
      WHERE created_at > NOW() - INTERVAL '90 days'
    `);

    const byTestType = await global.db.query(`
      SELECT test_type, COUNT(*) as count
      FROM lab_test_requests
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY test_type
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      byTestType: byTestType.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Lab Test] Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXPORT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

module.exports = router;

