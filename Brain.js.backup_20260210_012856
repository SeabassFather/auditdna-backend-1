// =============================================================================
// THE BRAIN - CENTRAL INTELLIGENCE ORCHESTRATOR
// =============================================================================
// Coordinates all 81 Niner Miners across 9 teams
// Processes data through SI (Synthetic Intelligence)
// Routes workflows and reports to Dashboard/Command Center/Sphere
// =============================================================================

const EventEmitter = require('events');

class Brain extends EventEmitter {
  constructor() {
    super();
    this.ninerMiners = this.initializeNinerMiners();
    this.activeWorkflows = new Map();
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      avgResponseTime: 0,
      minerPerformance: {}
    };
    this.siModules = {
      riskAssessment: true,
      complianceValidation: true,
      financialUnderwriting: true,
      qualityControl: true
    };
  }

  // Initialize all 81 Niner Miners
  initializeNinerMiners() {
    return {
      // TEAM 1: DATA INTELLIGENCE (9 Miners)
      dataIntelligence: [
        { id: 'data_harvester', name: 'Data Harvester', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'pattern_scout', name: 'Pattern Scout', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'insight_tracker', name: 'Insight Tracker', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'trend_ranger', name: 'Trend Ranger', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'metric_wrangler', name: 'Metric Wrangler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'analytics_sheriff', name: 'Analytics Sheriff', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'query_outlaw', name: 'Query Outlaw', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'database_marshal', name: 'Database Marshal', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'cache_gunslinger', name: 'Cache Gunslinger', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 2: WORKFLOW AUTOMATION (9 Miners)
      workflowAutomation: [
        { id: 'process_pioneer', name: 'Process Pioneer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'task_buckaroo', name: 'Task Buckaroo', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'automation_ace', name: 'Automation Ace', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'workflow_deputy', name: 'Workflow Deputy', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'schedule_rider', name: 'Schedule Rider', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'trigger_trailblazer', name: 'Trigger Trailblazer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'event_wrangler', name: 'Event Wrangler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'pipeline_rustler', name: 'Pipeline Rustler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'orchestrator_outlaw', name: 'Orchestrator Outlaw', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 3: SECURITY & COMPLIANCE (9 Miners)
      securityCompliance: [
        { id: 'guard_ranger', name: 'Guard Ranger', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'auth_marshal', name: 'Auth Marshal', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'encrypt_sheriff', name: 'Encrypt Sheriff', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'firewall_deputy', name: 'Firewall Deputy', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'audit_tracker', name: 'Audit Tracker', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'compliance_scout', name: 'Compliance Scout', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'threat_hunter', name: 'Threat Hunter', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'vulnerability_wrangler', name: 'Vulnerability Wrangler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'policy_enforcer', name: 'Policy Enforcer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 4: INTEGRATION & API (9 Miners)
      integrationAPI: [
        { id: 'api_pathfinder', name: 'API Pathfinder', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'endpoint_explorer', name: 'Endpoint Explorer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'webhook_wanderer', name: 'Webhook Wanderer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'rest_rustler', name: 'REST Rustler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'graphql_gunslinger', name: 'GraphQL Gunslinger', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'sync_scout', name: 'Sync Scout', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'bridge_builder', name: 'Bridge Builder', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'connector_cowpoke', name: 'Connector Cowpoke', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'gateway_guardian', name: 'Gateway Guardian', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 5: COMMUNICATION (9 Miners)
      communication: [
        { id: 'message_courier', name: 'Message Courier', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'email_express', name: 'Email Express', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'sms_sender', name: 'SMS Sender', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'notification_herald', name: 'Notification Herald', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'broadcast_bandit', name: 'Broadcast Bandit', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'alert_ranger', name: 'Alert Ranger', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'channel_chief', name: 'Channel Chief', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'voice_vaquero', name: 'Voice Vaquero', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'chat_champion', name: 'Chat Champion', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 6: FINANCIAL OPS (9 Miners)
      financialOps: [
        { id: 'ledger_lawman', name: 'Ledger Lawman', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'transaction_tracker', name: 'Transaction Tracker', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'payment_processor', name: 'Payment Processor', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'invoice_inspector', name: 'Invoice Inspector', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'reconciliation_ranger', name: 'Reconciliation Ranger', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'ar_accountant', name: 'AR Accountant', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'ap_auditor', name: 'AP Auditor', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'revenue_rider', name: 'Revenue Rider', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'expense_enforcer', name: 'Expense Enforcer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 7: CUSTOMER INTELLIGENCE (9 Miners)
      customerIntelligence: [
        { id: 'crm_captain', name: 'CRM Captain', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'contact_curator', name: 'Contact Curator', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'engagement_explorer', name: 'Engagement Explorer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'journey_scout', name: 'Journey Scout', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'sentiment_sheriff', name: 'Sentiment Sheriff', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'loyalty_lawman', name: 'Loyalty Lawman', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'churn_champion', name: 'Churn Champion', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'feedback_frontiersman', name: 'Feedback Frontiersman', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'support_specialist', name: 'Support Specialist', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 8: AGRICULTURAL INTELLIGENCE (9 Miners)
      agriculturalIntelligence: [
        { id: 'grower_guardian', name: 'Grower Guardian', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'harvest_hero', name: 'Harvest Hero', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'crop_commander', name: 'Crop Commander', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'soil_scout', name: 'Soil Scout', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'water_wrangler', name: 'Water Wrangler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'yield_yodeler', name: 'Yield Yodeler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'quality_quartermaster', name: 'Quality Quartermaster', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'traceability_tracker', name: 'Traceability Tracker', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'compliance_cowhand', name: 'Compliance Cowhand', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ],

      // TEAM 9: OPERATIONS COMMAND (9 Miners)
      operationsCommand: [
        { id: 'ops_commander', name: 'Ops Commander', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'resource_ranger', name: 'Resource Ranger', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'capacity_captain', name: 'Capacity Captain', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'performance_pioneer', name: 'Performance Pioneer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'monitoring_marshal', name: 'Monitoring Marshal', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'health_handler', name: 'Health Handler', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'incident_investigator', name: 'Incident Investigator', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'recovery_rider', name: 'Recovery Rider', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 },
        { id: 'uptime_enforcer', name: 'Uptime Enforcer', status: 'ACTIVE', currentTask: null, tasksCompleted: 0 }
      ]
    };
  }

  // Assign task to appropriate Niner Miner
  assignTask(task) {
    const { type, data, priority } = task;
    const team = this.selectTeam(type);
    const miner = this.selectMiner(team, priority);

    if (!miner) {
      console.error('No available miner for task:', task);
      return null;
    }

    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    miner.status = 'BUSY';
    miner.currentTask = {
      id: workflowId,
      type,
      data,
      startTime: Date.now()
    };

    this.activeWorkflows.set(workflowId, {
      id: workflowId,
      minerId: miner.id,
      team,
      task,
      status: 'RUNNING',
      startTime: Date.now()
    });

    this.metrics.activeTasks++;
    this.metrics.totalTasks++;

    // Emit event for real-time updates
    this.emit('taskAssigned', { workflowId, miner: miner.name, team, task });

    return workflowId;
  }

  // Select appropriate team based on task type
  selectTeam(taskType) {
    const teamMapping = {
      'data_analysis': 'dataIntelligence',
      'workflow': 'workflowAutomation',
      'security': 'securityCompliance',
      'api': 'integrationAPI',
      'communication': 'communication',
      'financial': 'financialOps',
      'customer': 'customerIntelligence',
      'agriculture': 'agriculturalIntelligence',
      'operations': 'operationsCommand'
    };

    return teamMapping[taskType] || 'operationsCommand';
  }

  // Select best available miner from team
  selectMiner(team, priority = 'NORMAL') {
    const miners = this.ninerMiners[team];
    
    // Find idle miner
    const idleMiner = miners.find(m => m.status === 'ACTIVE' && !m.currentTask);
    
    if (idleMiner) return idleMiner;

    // If no idle miners and priority is HIGH, find miner with least tasks
    if (priority === 'HIGH') {
      return miners.reduce((min, m) => 
        m.tasksCompleted < min.tasksCompleted ? m : min
      );
    }

    return null;
  }

  // Complete task and update metrics
  completeTask(workflowId, result) {
    const workflow = this.activeWorkflows.get(workflowId);
    
    if (!workflow) {
      console.error('Workflow not found:', workflowId);
      return;
    }

    const miner = this.findMinerById(workflow.minerId);
    
    if (miner) {
      miner.status = 'ACTIVE';
      miner.currentTask = null;
      miner.tasksCompleted++;
    }

    workflow.status = 'COMPLETED';
    workflow.endTime = Date.now();
    workflow.duration = workflow.endTime - workflow.startTime;
    workflow.result = result;

    this.metrics.activeTasks--;
    this.metrics.completedTasks++;
    
    // Update avg response time
    const totalTime = this.calculateTotalResponseTime();
    this.metrics.avgResponseTime = totalTime / this.metrics.completedTasks;

    // Emit event
    this.emit('taskCompleted', { workflowId, miner: miner?.name, duration: workflow.duration, result });

    // Move to completed workflows (keep last 100)
    this.activeWorkflows.delete(workflowId);
  }

  // Find miner by ID across all teams
  findMinerById(minerId) {
    for (const team of Object.values(this.ninerMiners)) {
      const miner = team.find(m => m.id === minerId);
      if (miner) return miner;
    }
    return null;
  }

  // Get all miners status
  getAllMinersStatus() {
    const status = {};
    
    for (const [teamName, miners] of Object.entries(this.ninerMiners)) {
      status[teamName] = miners.map(m => ({
        id: m.id,
        name: m.name,
        status: m.status,
        currentTask: m.currentTask?.type || null,
        tasksCompleted: m.tasksCompleted
      }));
    }

    return status;
  }

  // Get Brain metrics
  getMetrics() {
    return {
      ...this.metrics,
      activeMiners: this.countActiveMiners(),
      busyMiners: this.countBusyMiners(),
      totalMiners: 81,
      siStatus: this.siModules
    };
  }

  countActiveMiners() {
    let count = 0;
    for (const team of Object.values(this.ninerMiners)) {
      count += team.filter(m => m.status === 'ACTIVE').length;
    }
    return count;
  }

  countBusyMiners() {
    let count = 0;
    for (const team of Object.values(this.ninerMiners)) {
      count += team.filter(m => m.status === 'BUSY').length;
    }
    return count;
  }

  calculateTotalResponseTime() {
    let total = 0;
    this.activeWorkflows.forEach(wf => {
      if (wf.status === 'COMPLETED') {
        total += wf.duration;
      }
    });
    return total;
  }
}

// Singleton instance
const brain = new Brain();

module.exports = brain;