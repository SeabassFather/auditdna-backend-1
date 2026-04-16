// ═══════════════════════════════════════════════════════════════════════════════
// AI EMAIL ROUTES - CONSOLIDATED MASTER FILE
// Mexausa Food Group, Inc. / MexaUSA Food Group, Inc.
// AI Learning Reports + Email Generation
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const EMAIL_CONFIG = {
  host: 'smtp.mexausafg.com',
  port: 587,
  secure: false,
  auth: {
    user: 'Saul@mexausafg.com',
    pass: 'SuperSeven#321'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STORAGE PATH
// ═══════════════════════════════════════════════════════════════════════════════
const LEARNING_DATA_PATH = path.join(__dirname, '..', 'data', 'ai_learning');

// Ensure data directory exists
if (!fs.existsSync(LEARNING_DATA_PATH)) {
  fs.mkdirSync(LEARNING_DATA_PATH, { recursive: true });
}

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/aiemailroutes/status - Email AI Status
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    features: ['email_generation', 'template_analysis', 'tone_adjustment', 'ai_learning_reports'],
    message: 'AI Email service ready',
    emailConfigured: EMAIL_CONFIG.host && EMAIL_CONFIG.auth.user,
    learningDataPath: LEARNING_DATA_PATH
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/aiemailroutes/generate - Generate Email
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/generate', (req, res) => {
  const { purpose, tone, recipient, context } = req.body;
  
  res.json({
    success: true,
    email: {
      subject: `${purpose || 'Important'} - ${tone || 'Professional'} Communication`,
      body: `Dear ${recipient || 'Valued Partner'},\n\n${context || 'This is a generated email body based on your requirements.'}\n\nBest regards,\nAuditDNA Team`,
      tone: tone || 'professional',
      generatedAt: new Date().toISOString()
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/aiemailroutes/send-learning-report - Send AI Learning Report
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/send-learning-report', async (req, res) => {
  try {
    const learningData = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save to file
    const fileName = `ai_learning_${timestamp}.json`;
    const filePath = path.join(LEARNING_DATA_PATH, fileName);
    fs.writeFileSync(filePath, JSON.stringify(learningData, null, 2));
    
    // Prepare email content
    const summary = learningData.summary || {};
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
            h1 { color: #cba658; margin-bottom: 20px; }
            h2 { color: #cbd5e1; font-size: 16px; margin-top: 20px; }
            .stat { background: #0f172a; padding: 12px; border-radius: 8px; margin: 8px 0; border-left: 3px solid #cba658; }
            .stat-label { color: #94a3b8; font-size: 12px; }
            .stat-value { color: #cba658; font-size: 24px; font-weight: bold; }
            .module { background: rgba(34,197,94,0.1); padding: 8px 12px; border-radius: 6px; margin: 4px 0; color: #22c55e; font-size: 13px; }
            .workflow { background: rgba(59,130,246,0.1); padding: 8px 12px; border-radius: 6px; margin: 4px 0; color: #3b82f6; font-size: 13px; }
            .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; color: #64748b; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🤠 AuditDNA AI Learning Report</h1>
            <p style="color: #94a3b8;">Generated: ${new Date().toLocaleString()}</p>
            
            <h2>📊 Session Statistics</h2>
            <div class="stat">
              <div class="stat-label">Total Questions Analyzed</div>
              <div class="stat-value">${summary.totalQuestions || 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">User Needs Identified</div>
              <div class="stat-value">${summary.identifiedNeeds || 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">New Modules Suggested</div>
              <div class="stat-value">${summary.suggestedModules || 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Workflows Generated</div>
              <div class="stat-value">${summary.generatedWorkflows || 0}</div>
            </div>
            
            ${learningData.session?.suggestedModules?.length > 0 ? `
              <h2>🚀 Suggested New Modules</h2>
              ${learningData.session.suggestedModules.map(m => `
                <div class="module">
                  <strong>${m.name}</strong> - ${m.category} (${m.priority} priority)
                </div>
              `).join('')}
            ` : ''}
            
            ${learningData.session?.generatedWorkflows?.length > 0 ? `
              <h2>⚡ Generated Workflows</h2>
              ${learningData.session.generatedWorkflows.map(w => `
                <div class="workflow">
                  <strong>${w.name}</strong> - Status: ${w.status}
                </div>
              `).join('')}
            ` : ''}
            
            <div class="footer">
              <p>This report was automatically generated by AuditDNA's 35 AI/SI Cowboys.</p>
              <p>Data file saved: ${fileName}</p>
              <p>AuditDNA Platform v3.6.0 - Adaptive AI Learning Edition</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: '"AuditDNA AI System" <Saul@mexausafg.com>',
      to: 'Saul@mexausafg.com',
      subject: `🤠 AuditDNA AI Learning Report - ${summary.totalQuestions || 0} Questions Analyzed`,
      html: htmlContent,
      attachments: [{
        filename: fileName,
        content: JSON.stringify(learningData, null, 2),
        contentType: 'application/json'
      }]
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      message: 'Learning report sent successfully',
      filePath: filePath,
      emailSent: true
    });

  } catch (error) {
    console.error('Error sending learning report:', error);
    
    // Still save data even if email fails
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `ai_learning_${timestamp}.json`;
      const filePath = path.join(LEARNING_DATA_PATH, fileName);
      fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
      
      res.json({ 
        success: true, 
        message: 'Data saved locally (email failed)',
        filePath: filePath,
        emailSent: false,
        emailError: error.message
      });
    } catch (saveError) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save data',
        error: saveError.message
      });
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/aiemailroutes/data - Retrieve All Learning Data
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/data', async (req, res) => {
  try {
    const files = fs.readdirSync(LEARNING_DATA_PATH);
    const data = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = fs.readFileSync(path.join(LEARNING_DATA_PATH, f), 'utf8');
        return {
          filename: f,
          data: JSON.parse(content)
        };
      })
      .sort((a, b) => b.filename.localeCompare(a.filename)); // Newest first
    
    res.json({ success: true, count: data.length, files: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/aiemailroutes/summary - Aggregated Learning Summary
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/summary', async (req, res) => {
  try {
    const files = fs.readdirSync(LEARNING_DATA_PATH);
    let totalQuestions = 0;
    let totalNeeds = 0;
    let totalModules = 0;
    let totalWorkflows = 0;
    const allModules = [];
    const allWorkflows = [];
    
    files.filter(f => f.endsWith('.json')).forEach(f => {
      const content = JSON.parse(fs.readFileSync(path.join(LEARNING_DATA_PATH, f), 'utf8'));
      if (content.summary) {
        totalQuestions += content.summary.totalQuestions || 0;
        totalNeeds += content.summary.identifiedNeeds || 0;
        totalModules += content.summary.suggestedModules || 0;
        totalWorkflows += content.summary.generatedWorkflows || 0;
      }
      if (content.session?.suggestedModules) {
        allModules.push(...content.session.suggestedModules);
      }
      if (content.session?.generatedWorkflows) {
        allWorkflows.push(...content.session.generatedWorkflows);
      }
    });
    
    res.json({
      success: true,
      aggregatedSummary: {
        totalSessions: files.length,
        totalQuestions,
        totalNeeds,
        totalModulesSuggested: totalModules,
        totalWorkflowsGenerated: totalWorkflows
      },
      uniqueModules: [...new Set(allModules.map(m => m.name))],
      uniqueWorkflows: [...new Set(allWorkflows.map(w => w.name))]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
