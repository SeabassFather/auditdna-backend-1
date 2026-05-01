// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUDITDNA GROWER WORKFLOW ROUTES
// Onboarding, compliance tracking, FSMA 204 workflow management
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// WORKFLOW STAGES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const WORKFLOW_STAGES = {
  REGISTRATION: 'registration',
  DOCUMENT_COLLECTION: 'document_collection',
  INITIAL_AUDIT: 'initial_audit',
  COMPLIANCE_REVIEW: 'compliance_review',
  TRAINING: 'training',
  CERTIFICATION: 'certification',
  ACTIVE: 'active',
  ANNUAL_REVIEW: 'annual_review'
};

const WORKFLOW_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INIT: Create workflow tables
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const initWorkflowTables = async () => {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS grower_workflows (
      id SERIAL PRIMARY KEY,
      grower_id INTEGER NOT NULL,
      grower_code VARCHAR(50),
      grower_name VARCHAR(255),
      
      current_stage VARCHAR(50) DEFAULT 'registration',
      stage_status VARCHAR(50) DEFAULT 'in_progress',
      progress_percentage INTEGER DEFAULT 0,
      
      registration_date TIMESTAMP DEFAULT NOW(),
      registration_status VARCHAR(50) DEFAULT 'pending',
      documents_submitted INTEGER DEFAULT 0,
      documents_required INTEGER DEFAULT 8,
      documents_status VARCHAR(50) DEFAULT 'incomplete',
      
      initial_audit_date TIMESTAMP,
      initial_audit_status VARCHAR(50) DEFAULT 'not_started',
      auditor_name VARCHAR(255),
      audit_score INTEGER,
      
      compliance_items_total INTEGER DEFAULT 12,
      compliance_items_completed INTEGER DEFAULT 0,
      compliance_status VARCHAR(50) DEFAULT 'pending',
      
      training_completed BOOLEAN DEFAULT false,
      training_date TIMESTAMP,
      training_modules_completed INTEGER DEFAULT 0,
      
      certification_issued BOOLEAN DEFAULT false,
      certification_date TIMESTAMP,
      certification_number VARCHAR(100),
      certification_expiry DATE,
      
      fsma_204_compliant BOOLEAN DEFAULT false,
      food_safety_plan BOOLEAN DEFAULT false,
      traceability_records BOOLEAN DEFAULT false,
      
      assigned_to VARCHAR(255),
      priority VARCHAR(20) DEFAULT 'medium',
      notes TEXT,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_tasks (
      id SERIAL PRIMARY KEY,
      workflow_id INTEGER NOT NULL REFERENCES grower_workflows(id),
      grower_id INTEGER NOT NULL,
      
      task_type VARCHAR(100) NOT NULL,
      task_name VARCHAR(255) NOT NULL,
      description TEXT,
      stage VARCHAR(50),
      
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'medium',
      assigned_to VARCHAR(255),
      
      due_date TIMESTAMP,
      completed_date TIMESTAMP,
      completed_by VARCHAR(255),
      
      result TEXT,
      attachments TEXT[],
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workflow_history (
      id SERIAL PRIMARY KEY,
      workflow_id INTEGER NOT NULL REFERENCES grower_workflows(id),
      grower_id INTEGER NOT NULL,
      
      action VARCHAR(100) NOT NULL,
      stage_from VARCHAR(50),
      stage_to VARCHAR(50),
      status_from VARCHAR(50),
      status_to VARCHAR(50),
      
      performed_by VARCHAR(255),
      notes TEXT,
      
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_workflows_grower ON grower_workflows(grower_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_stage ON grower_workflows(current_stage);
    CREATE INDEX IF NOT EXISTS idx_workflows_status ON grower_workflows(stage_status);
    CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON workflow_tasks(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON workflow_tasks(status);
  `;

  try {
    await pool.query(createTablesSQL);
    console.log('âœ… [Grower Workflow] Tables initialized');
  } catch (error) {
    console.error('âŒ [Grower Workflow] Table init failed:', error.message);
  }
};

initWorkflowTables();

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /workflow/start - Start workflow for new grower
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/start', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { growerId, growerCode, growerName, assignedTo, priority } = req.body;

    // Create workflow
    const workflowResult = await client.query(
      `INSERT INTO grower_workflows (
        grower_id, grower_code, grower_name, assigned_to, priority
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [growerId, growerCode, growerName, assignedTo || 'unassigned', priority || 'medium']
    );

    const workflow = workflowResult.rows[0];

    // Create initial tasks
    const initialTasks = [
      { type: 'document', name: 'Business License', stage: 'document_collection' },
      { type: 'document', name: 'Food Safety Certification', stage: 'document_collection' },
      { type: 'document', name: 'Water Test Results', stage: 'document_collection' },
      { type: 'document', name: 'Soil Test Results', stage: 'document_collection' },
      { type: 'document', name: 'Insurance Certificate', stage: 'document_collection' },
      { type: 'document', name: 'Tax ID / RFC', stage: 'document_collection' },
      { type: 'document', name: 'Property Documentation', stage: 'document_collection' },
      { type: 'document', name: 'FSMA Compliance Attestation', stage: 'document_collection' },
      { type: 'audit', name: 'Schedule Initial Site Audit', stage: 'initial_audit' },
      { type: 'compliance', name: 'Verify FSMA 204 Requirements', stage: 'compliance_review' },
      { type: 'training', name: 'Complete Food Safety Training', stage: 'training' },
      { type: 'certification', name: 'Issue Grower Certification', stage: 'certification' }
    ];

    for (const task of initialTasks) {
      await client.query(
        `INSERT INTO workflow_tasks (
          workflow_id, grower_id, task_type, task_name, stage, assigned_to
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [workflow.id, growerId, task.type, task.name, task.stage, assignedTo || 'unassigned']
      );
    }

    // Log workflow creation
    await client.query(
      `INSERT INTO workflow_history (
        workflow_id, grower_id, action, stage_to, status_to, performed_by
      ) VALUES ($1, $2, 'workflow_created', 'registration', 'in_progress', $3)`,
      [workflow.id, growerId, assignedTo || 'system']
    );

    await client.query('COMMIT');

    console.log(`âœ… [Workflow] Started for grower ${growerName} (ID: ${growerId})`);

    res.status(201).json({
      success: true,
      workflow,
      tasksCreated: initialTasks.length,
      message: 'Workflow started successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Workflow] Start error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /workflow/:growerId - Get workflow for grower
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/:growerId', async (req, res) => {
  try {
    const { growerId } = req.params;

    const workflow = await pool.query(
      'SELECT * FROM grower_workflows WHERE grower_id = $1',
      [growerId]
    );

    if (workflow.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const tasks = await pool.query(
      `SELECT * FROM workflow_tasks 
       WHERE workflow_id = $1 
       ORDER BY created_at ASC`,
      [workflow.rows[0].id]
    );

    const history = await pool.query(
      `SELECT * FROM workflow_history 
       WHERE workflow_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [workflow.rows[0].id]
    );

    res.json({
      success: true,
      workflow: workflow.rows[0],
      tasks: tasks.rows,
      history: history.rows
    });

  } catch (error) {
    console.error('[Workflow] Get error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PUT /workflow/task/:taskId - Update task status
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.put('/task/:taskId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { taskId } = req.params;
    const { status, result, completedBy, attachments } = req.body;

    const taskResult = await client.query(
      `UPDATE workflow_tasks 
       SET status = $1, 
           result = $2, 
           completed_by = $3,
           completed_date = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_date END,
           attachments = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, result, completedBy, attachments, taskId]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Update workflow progress
    const progressResult = await client.query(
      `SELECT 
         workflow_id,
         COUNT(*) as total_tasks,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
       FROM workflow_tasks 
       WHERE workflow_id = $1
       GROUP BY workflow_id`,
      [task.workflow_id]
    );

    if (progressResult.rows.length > 0) {
      const { workflow_id, total_tasks, completed_tasks } = progressResult.rows[0];
      const progress = Math.round((completed_tasks / total_tasks) * 100);

      await client.query(
        `UPDATE grower_workflows 
         SET progress_percentage = $1, updated_at = NOW()
         WHERE id = $2`,
        [progress, workflow_id]
      );
    }

    // Log history
    await client.query(
      `INSERT INTO workflow_history (
        workflow_id, grower_id, action, status_to, performed_by, notes
      ) VALUES ($1, $2, 'task_updated', $3, $4, $5)`,
      [task.workflow_id, task.grower_id, status, completedBy, `Task: ${task.task_name}`]
    );

    await client.query('COMMIT');

    console.log(`âœ… [Workflow] Task updated: ${task.task_name} â†’ ${status}`);

    res.json({
      success: true,
      task: taskResult.rows[0],
      message: 'Task updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Workflow] Task update error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /workflow/advance/:workflowId - Advance to next stage
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.post('/advance/:workflowId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { workflowId } = req.params;
    const { performedBy, notes } = req.body;

    // Get current workflow
    const workflowResult = await client.query(
      'SELECT * FROM grower_workflows WHERE id = $1',
      [workflowId]
    );

    if (workflowResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const workflow = workflowResult.rows[0];
    const stages = Object.values(WORKFLOW_STAGES);
    const currentIndex = stages.indexOf(workflow.current_stage);

    if (currentIndex >= stages.length - 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Workflow already at final stage'
      });
    }

    const nextStage = stages[currentIndex + 1];

    // Update workflow stage
    const updateResult = await client.query(
      `UPDATE grower_workflows 
       SET current_stage = $1,
           stage_status = 'in_progress',
           updated_at = NOW(),
           completed_at = CASE WHEN $1 = 'active' THEN NOW() ELSE completed_at END
       WHERE id = $2
       RETURNING *`,
      [nextStage, workflowId]
    );

    // Log history
    await client.query(
      `INSERT INTO workflow_history (
        workflow_id, grower_id, action, stage_from, stage_to, 
        status_to, performed_by, notes
      ) VALUES ($1, $2, 'stage_advanced', $3, $4, 'in_progress', $5, $6)`,
      [workflowId, workflow.grower_id, workflow.current_stage, nextStage, performedBy, notes]
    );

    await client.query('COMMIT');

    console.log(`âœ… [Workflow] Advanced: ${workflow.grower_name} â†’ ${nextStage}`);

    res.json({
      success: true,
      workflow: updateResult.rows[0],
      message: `Workflow advanced to ${nextStage}`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Workflow] Advance error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /workflow/dashboard - Workflow overview dashboard
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(*) FILTER (WHERE current_stage = 'registration') as in_registration,
        COUNT(*) FILTER (WHERE current_stage = 'document_collection') as in_documents,
        COUNT(*) FILTER (WHERE current_stage = 'initial_audit') as in_audit,
        COUNT(*) FILTER (WHERE current_stage = 'compliance_review') as in_compliance,
        COUNT(*) FILTER (WHERE current_stage = 'training') as in_training,
        COUNT(*) FILTER (WHERE current_stage = 'certification') as in_certification,
        COUNT(*) FILTER (WHERE current_stage = 'active') as active,
        AVG(progress_percentage) as avg_progress
      FROM grower_workflows
      WHERE stage_status != 'completed'
    `);

    const taskStats = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
      FROM workflow_tasks
    `);

    res.json({
      success: true,
      workflows: stats.rows[0],
      tasks: taskStats.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Workflow] Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXPORT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

module.exports = router;

