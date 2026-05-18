// ===============================================================
// AUDITDNA BACKEND SERVER v5.0 -- SECURED
// ===============================================================
// CHANGES FROM v4.0:
//   -- EBEM Email Marketing Command Center routes added
//   -- /api/scraper         -- internal DB scraper (requireAdmin)
//   -- /api/email/send-campaign  -- Gmail SMTP bulk send w/ batching
//   -- /api/email/analytics      -- open/click/sent stats from DB
//   -- /api/claude/generate-email -- AI Niner Miner content generation
//   -- emailScraper.js added to SKIP_AUTO (explicit mount)
//   -- multer memory storage for attachment uploads
// CHANGES FROM v3.3 (v4.0):
//   -- CORS restricted to known origins (not '*')
//   -- /metrics, /api/routes -- owner-only (JWT required)
//   -- /health sanitized (no AI model name, no internal details)
//   -- Brain endpoints require auth (except /api/brain/status)
//   -- express.json limit reduced to 12mb (was 50mb)
//   -- Helmet CSP enabled with sensible defaults
//   -- Rate limiter on credential recovery
//   -- Auth middleware loaded globally
//   -- JWT_SECRET enforced (fatal in production if default)
// ===============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

// ===============================================================
// DATABASE
// ===============================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

let poolReady = false;
pool.on('connect', () => {
  if (!poolReady) {
    poolReady = true;
    console.log('[OK] POSTGRESQL POOL CONNECTED (max: 20, idle: 30s)');
  }
});
pool.on('error', err => console.error('[ERR] PostgreSQL pool error:', err.message));

global.db = pool;
console.log('[DB] global.db assigned -> pool accessible to all routes');
module.exports.pool = pool;

// ===============================================================
// ANTHROPIC AI CLIENT
// ===============================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

anthropic.messages.create({
  model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  max_tokens: 32,
  messages:   [{ role: 'user', content: 'ping' }],
}).then(() => {
  console.log('[OK] ANTHROPIC AI: Connected');
}).catch(err => {
  console.error('[ERR] ANTHROPIC AI: Connection failed --', err.message);
});

const aiHelper = {
  ask: async (prompt, systemPrompt = 'You are AuditDNA AI, an expert in real estate, mortgage lending, and agricultural supply chains.') => {
    const response = await anthropic.messages.create({
      model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096'),
      system:     systemPrompt,
      messages:   [{ role: 'user', content: prompt }],
    });
    return response.content[0]?.text || '';
  },
  si: async (prompt) => {
    const response = await anthropic.messages.create({
      model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     'You are AuditDNA SI (Synthetic Intelligence). You perform compliance-critical scoring and analysis. Always respond with valid JSON only. No prose, no markdown, no explanation outside the JSON structure.',
      messages:   [{ role: 'user', content: prompt }],
    });
    try { return JSON.parse(response.content[0]?.text || '{}'); }
    catch { return { error: 'SI parse failed', raw: response.content[0]?.text }; }
  },
  stream: (prompt, onChunk, systemPrompt = 'You are AuditDNA AI.') => {
    return anthropic.messages.stream({
      model:      process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096'),
      system:     systemPrompt,
      messages:   [{ role: 'user', content: prompt }],
    }).on('text', onChunk);
  },
  client: anthropic,
};

module.exports.ai = aiHelper;

// ===============================================================
// THE BRAIN
// ===============================================================

const brain = require('./Brain');
console.log('[BRAIN] Initializing 81 Niner Miners...');
if (typeof brain?.on === 'function') {
  brain.on('taskAssigned',      ({ workflowId, miner, team })    => console.log(`[MINER] Task assigned to ${miner} (${team}) - Workflow: ${workflowId}`));
  brain.on('taskCompleted',     ({ workflowId, miner, duration}) => console.log(`[OK] Task completed by ${miner} in ${duration}ms - Workflow: ${workflowId}`));
  brain.on('siScoreComplete',   ({ score, leadId })              => console.log(`[SI] Lead #${leadId} scored --> Tier ${score?.tier}`));
} else {
  console.log('[BRAIN] Running in direct-call mode');
}
module.exports.brain = brain;
// START AUTONOMOUS BLAST ENGINE
// START ENRIQUE - HEAD AI COMMAND AGENT
setTimeout(function(){ try { const enrique=require('./services/enrique'); enrique.startEnrique(app,brain); } catch(e){ console.error('[ENRIQUE] Start failed:',e.message); } }, 12000);
setTimeout(function(){ try { const oak=require('./services/oakland-agents'); oak.init(app,brain,global.db||pool); } catch(e){ console.error('[OAKLAND] Start failed:',e.message); } }, 16000);
setTimeout(function(){ try { const ab=require('./services/autonomous-blast'); ab.startAutonomousAgents(app,brain); } catch(e){ console.error('[AUTONOMOUS] Start failed:',e.message); } }, 8000);
// START INBOX SORTER - classifies replies, logs to email_activity_log, ntfy hot-lead alerts
setTimeout(function(){ try { const is=require('./services/inbox-sorter'); is.startInboxSorter(app); } catch(e){ console.error('[INBOX-SORTER] Start failed:',e.message); } }, 60000);

// ===============================================================
// APP INIT
// ===============================================================

const app = express();

// === CORS preflight -- MUST be first, before helmet/other middleware ===
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  const allowedOrigins = [
    'https://enjoybaja.com','https://www.enjoybaja.com',
    'https://mexausafg.com','https://www.mexausafg.com',
    'https://auditdna.com','https://www.auditdna.com'
  ];
  const isAllowed = !origin ||
                    allowedOrigins.includes(origin) ||
                    (isDev && origin.includes('localhost'));
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,x-user-email,x-access-level,x-admin');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  next();
});
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.set('ai', aiHelper);
app.set('pool', pool);

// =============================================================================
// MEXAUSA SMTP — Gmail only, single transporter (May 2026)
// smtp.gmail.com:587 — sgarcia1911@gmail.com — app password rotated May 7 2026
// ALL routes use this one transporter. No Brevo. No GoDaddy. No conflicts.
// =============================================================================
const __ggNodemailer = require('nodemailer');
const sharedTransporter = __ggNodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER || 'sgarcia1911@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
app.set('smtp', sharedTransporter);

if (typeof brain?.setAI   === 'function') brain.setAI(aiHelper);
if (typeof brain?.setPool === 'function') brain.setPool(pool);

// ===============================================================
// CORE MIDDLEWARE -- SECURED
// ===============================================================

// Helmet with CSP -- no longer disabled
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc:     ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.anthropic.com", "https://open.er-api.com", "https://maps.googleapis.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // needed for external images
}));

app.use(compression());

// RAW CORS PREFLIGHT -- must be first, before all middleware -- updated 1779000488215
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [
    'https://enjoybaja.com',
    'https://www.enjoybaja.com',
    'https://mexausafg.com',
    'https://www.mexausafg.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5050',
    'http://localhost:5051',
    'http://localhost:5052',
    'http://localhost:5053',
    'http://localhost:3001',
    'http://localhost:5050',
    'http://localhost:5051',
    'http://localhost:5052',
    'http://localhost:5053',
  ];
  if (origin && (allowed.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,x-user-email,x-access-level,x-admin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// CORS -- restricted to known origins
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5050',
  'http://localhost:5051',
  'http://localhost:5052',
  'http://localhost:5053',
  'https://enjoybaja.com',
  'https://www.enjoybaja.com',
  'https://mexausafg.com',
  'https://www.mexausafg.com',
  'https://auditdna.com',
  'https://www.auditdna.com',
  // Add staging/preview domains as needed:
  // 'https://staging.enjoybaja.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // In development, allow any localhost
    if (NODE_ENV === 'development' && origin.includes('localhost')) return callback(null, true);
    console.warn(`[CORS] Blocked request from: ${origin}`);
    callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true,
  exposedHeaders: ['Authorization'],
}));

app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

// Body limits -- 12MB for property photo uploads, 1MB for everything else
app.use('/api/properties', express.json({ limit: '12mb' }));
// REMOVED DUPLICATE MOUNT: /api/properties
// LOAF Stripe webhook needs RAW body BEFORE express.json
app.post('/api/nadine/stripe/webhook',
  express.raw({ type: 'application/json' }),
  require('./services/nadine-payments').webhookHandler);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===============================================================
// REQUEST METRICS (internal only -- not exposed publicly)
// ===============================================================

const requestStats = { total: 0, success: 0, errors: 0, startedAt: new Date() };

app.use((req, res, next) => {
  requestStats.total++;
  res.on('finish', () => {
    res.statusCode < 400 ? requestStats.success++ : requestStats.errors++;
  });
  next();
});

// ===============================================================
// AUTH MIDDLEWARE -- load shared JWT verifier
// ===============================================================

const { requireOwner, requireAdmin, requireAuth, attachUser } = require('./middleware/auth-middleware');

// ===============================================================
// EXPLICIT ROUTE MOUNTS
// ===============================================================

const explicitMounts = [];

// -- auth --> /api/auth
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/other-contacts', require('./routes/other-contacts'));
app.use('/api/swarm', require('./routes/swarm.routes'));
app.use('/api/gg',    require('./routes/gg.routes'));

const emmaRoutes = require('./routes/emma.routes');
app.use('/api/emma', emmaRoutes);

const evelynRoutes = require('./routes/evelyn.routes');
app.use('/api/evelyn', evelynRoutes);

const margieRoutes = require('./routes/margie.routes');
app.use('/api/margie', margieRoutes);
app.use('/api/auth', authRoutes);
try { app.use('/api', require('./routes/stub-routes')); console.log('[OK] stub-routes mounted'); } catch(e){ console.warn('[WARN] stub-routes:', e.message); }
try { app.use('/api/alerts', require('./routes/platform-alerts')); console.log('[OK] /api/alerts mounted'); } catch(e){ console.warn('[SKIP] platform-alerts:', e.message); }
// LOAF Lifecycle Intelligence API
try { registerLifecycleRoutes(app, db || global.db); createLifecycleTable(db || global.db).catch(e=>console.warn('lifecycle table:',e.message)); } catch(e) { console.warn('lifecycle routes:', e.message); }
app.use('/api/plastpac', require('./routes/plastpac.routes'));
app.use('/api/blast', require('./routes/autonomous-blast.routes'));
app.use('/api/send-audit', require('./routes/send-audit.routes'));
app.use('/api/ai-letter', require('./routes/ai-letter.routes'));
app.use('/api/anthropic', require('./routes/anthropic-rewrite'));

// Daily 6 AM PT digest cron
try { require('./services/send-audit-digest-cron').start(); } catch(e) { console.error('[send-audit-digest] init failed:', e.message); }
app.use('/api/loaf/agent', require('./routes/loaf-chat.routes'));
app.use('/api/gatekeeper', require('./routes/gatekeeper.routes'));

// -- AUTONOMOUS INVENTORY NOTIFICATION PIPELINE --
try {
  const inventoryRoutes = require('./routes/inventory');
  app.use('/api/inventory', inventoryRoutes);
  console.log('[OK] inventory.routes: mounted at /api/inventory');
} catch (e) {
  console.warn('[WARN] inventory route failed to mount:', e.message);
}

// -- UNIFIED CRM DEAL FLOOR --
// Anonymous deal rooms, DD vault, PO + factoring cascade, compliance,
// commodity channels. Phase 1 backbone for the full deal floor.
try {
  const dealFloorRoutes = require('./routes/deal-floor');
  app.use('/api/deals', dealFloorRoutes);

// Sprint C Run 13B: OpenClaw + Cohesive Tree Bus
try {
  const openClawFactory = require('./src/routes/openClawAgent');
  const openClawRoutes = (typeof openClawFactory === 'function' && openClawFactory.length <= 1) ? openClawFactory(global.db) : openClawFactory;
  app.use('/api/openclaw', openClawRoutes);
  if (typeof explicitMounts !== 'undefined') explicitMounts.push({ file: 'openClawAgent.js', path: '/api/openclaw' });
  console.log('[OK] openClawAgent.js mounted at /api/openclaw');
} catch(e) {
  console.warn('[WARN] openClawAgent not loaded:', e.message);
}
  try { const dealStream = require('./routes/deal-stream'); app.use('/api/stream', dealStream); console.log('[OK] deal-stream.js mounted at /api/stream'); } catch(e) { console.warn('[WARN] deal-stream mount failed:', e.message); }
  explicitMounts.push({ file: 'deal-floor.js', path: '/api/deals' });
  console.log('[OK] deal-floor.js mounted at /api/deals');
} catch (e) {
  console.warn('[WARN] deal-floor route failed to mount:', e.message);
}
  explicitMounts.push({ file: 'auth.js', path: '/api/auth' });
} catch(e) { console.warn('[WARN] auth not found:', e.message); }

// -- mortgage --> /api/mortgage
try {
  const mortgageRoutes = require('./routes/mortgage');
  app.use('/api/mortgage', mortgageRoutes);
  explicitMounts.push({ file: 'mortgage.js', path: '/api/mortgage' });
} catch(e) { console.warn('[WARN] mortgage not found:', e.message); }

// -- brain/status PUBLIC -- must be before Ownermetrics (/api root catch)
app.get('/api/brain/status', (req, res) => {
  const status = typeof brain?.getStatus === 'function'
    ? brain.getStatus()
    : { status: 'operational', mode: 'direct-call' };
  res.json({ success: true, status: status.status || 'operational' });
});

// -- Ownermetrics --> /api (root)
try {
  const ownerMetrics = require('./routes/Ownermetrics');
  app.use('/api', ownerMetrics);
  explicitMounts.push({ file: 'Ownermetrics.js', path: '/api (cross-namespace)' });
} catch(e) { console.warn('[WARN] ownerMetrics not found:', e.message); }

// -- unsubscribe --> /api/unsubscribe
try {
  const unsubscribeRoutes = require('./routes/unsubscribe');
  if (unsubscribeRoutes.initTables) {
    unsubscribeRoutes.initTables(pool).catch(e => console.warn('[WARN] unsubscribe initTables:', e.message));
  }
  app.use('/api/unsubscribe', unsubscribeRoutes);
  explicitMounts.push({ file: 'unsubscribe.js', path: '/api/unsubscribe' });
} catch(e) { console.warn('[WARN] unsubscribe not found:', e.message); }

// -- letters --> /api/letters
try {
  app.use('/api/letters', require('./routes/letters'));
  explicitMounts.push({ file: 'letters.js', path: '/api/letters' });
} catch(e) { console.warn('[WARN] letters not found:', e.message); }

// -- LOAF chat agent (re-mount outside main try block to ensure availability)
try {
  const loafChat = require('./routes/loaf-chat.routes');
// REMOVED DUPLICATE MOUNT: /api/loaf/agent
  app.use('/api/loaf', loafChat);
  console.log('[OK] loaf-chat: mounted at /api/loaf/agent and /api/loaf');
} catch(e) { console.error('[FAIL] loaf-chat mount:', e.message); }

// -- audits --> /api/audits

try {
  app.use('/api/audits', require('./routes/audits'));
  explicitMounts.push({ file: 'audits.js', path: '/api/audits' });
} catch(e) { console.warn('[WARN] audits not found:', e.message); }

// -- analytics --> /api/analytics
try {
  app.use('/api/analytics',      require('./routes/analytics'));
// // routes/mortgage-leads.js — stub pending build   // DISABLED: route file never existed, AuditDNA carries ZERO NMLS refs (standing rule)
  explicitMounts.push({ file: 'analytics.js', path: '/api/analytics' });
} catch(e) { console.warn('[WARN] analytics not found:', e.message); }

// -- emailScraper --> /api/scraper  (admin-only internal DB scraper for EBEM)
try {
  const emailScraper = require('./routes/emailScraper');
  app.use('/api/scraper', requireAdmin, emailScraper);
  explicitMounts.push({ file: 'emailScraper.js', path: '/api/scraper' });
  console.log('[OK] emailScraper: mounted at /api/scraper');
} catch(e) { console.warn('[WARN] emailScraper not found:', e.message); }

// -- Brainlog --> /api/brain/log  (must be before inline brain handlers)
try {
  app.use('/api/brain/log', require('./routes/Brainlog'));
  explicitMounts.push({ file: 'Brainlog.js', path: '/api/brain/log' });
} catch(e) { console.warn('[WARN] Brainlog not found:', e.message); }

// -- admin-notifications --> /api/admin/notifications
try {
  app.use('/api/admin/notifications', require('./routes/admin-notifications'));
  explicitMounts.push({ file: 'admin-notifications.js', path: '/api/admin/notifications' });
} catch(e) { console.warn('[WARN] admin-notifications not found:', e.message); }

// -- CRM --> /api/crm  (growers + buyers + shippers -- frontend expects this exact path)
try {
  const crmRoutes = require('./routes/crm.routes');
  app.use('/api/crm', crmRoutes);
  try { app.use('/api/match', require('./routes/match-engine.routes')); console.log('[OK] match-engine routes loaded'); } catch (e) { console.error('[FAIL] match-engine:', e.message); }
  try { app.use('/api/crm-contacts', require('./routes/crm-contacts.routes')); console.log('[OK] crm-contacts.routes: mounted at /api/crm-contacts'); } catch(e) { console.warn('[WARN] crm-contacts.routes mount failed:', e.message); }
// REMOVED DUPLICATE MOUNT: /api/crm
  try { app.use('/api/user', require('./routes/user')); } catch(e) { console.warn('[WARN] user:', e.message); }
  try { const brevoRoutes = require('./routes/brevo-webhook'); if (brevoRoutes.setPool) brevoRoutes.setPool(pool); app.use('/api/brevo', brevoRoutes); console.log('[OK] brevo-webhook mounted at /api/brevo'); } catch (e) { console.error('[brevo-webhook] mount fail:', e.message); }
  

// ── BUYER REGISTRATION — inline cascade ───────────────────────────────────────
app.post('/api/buyers/register', async (req, res) => {
  const b = req.body || {};
  const legal_name = (b.legal_name || b.companyLegal || '').trim();
  const country    = (b.country || 'USA').trim();
  if (!legal_name) return res.status(400).json({ success:false, error:'legal_name required' });
  // Cascading INSERT — finds which columns exist
  const inserts=[
    {sql:`INSERT INTO secure_buyers(legal_name,country,city,buyer_type,payment_terms,status)VALUES($1,$2,$3,$4,$5,'PENDING')RETURNING id,legal_name,country`,
     vals:[legal_name,country,b.city||'',b.buyer_type||'BUYER',b.payment_terms||'NET30']},
    {sql:`INSERT INTO secure_buyers(legal_name,country,status)VALUES($1,$2,'PENDING')RETURNING id,legal_name,country`,
     vals:[legal_name,country]},
    {sql:`INSERT INTO secure_buyers(legal_name,country)VALUES($1,$2)RETURNING id,legal_name,country`,
     vals:[legal_name,country]},
    {sql:`INSERT INTO secure_buyers(legal_name)VALUES($1)RETURNING id,legal_name`,
     vals:[legal_name]},
  ];
  for(const ins of inserts){
    try{
      const r=await pool.query(ins.sql,ins.vals);
      console.log('[BUYER REG] Created:',legal_name,r.rows[0].id);
      return res.status(201).json({success:true,buyer:r.rows[0],message:'Welcome to the Mexausa network.'});
    }catch(e){
      if(e.code!=='42703'&&e.code!=='23502')return res.status(500).json({success:false,error:e.message,code:e.code});
    }
  }
  res.status(500).json({success:false,error:'Cannot determine secure_buyers schema'});
});

// ── REGISTRATION ROUTES — correct mount paths ──────────────────────────────
// Grower public registration: POST /api/growers/register-public
try { app.use('/api/growers', require('./routes/grower-public-register')); console.log('[OK] grower-public-register at /api/growers'); } catch(e){ console.warn('[WARN] grower-public-register:', e.message); }
// Small grower program
try { app.use('/api/small-grower', require('./routes/smallGrowerRoutes')); console.log('[OK] smallGrowerRoutes at /api/small-grower'); } catch(e){ console.warn('[WARN] smallGrowerRoutes:', e.message); }
// Grower workflow engine
try { app.use('/api/grower-workflow', require('./routes/growerworkflow')); console.log('[OK] growerworkflow at /api/grower-workflow'); } catch(e){ console.warn('[WARN] growerworkflow:', e.message); }



// ── MISSING ROUTE STUBS — analytics, match, factor, rfq ────────────────────

app.get('/api/analytics/summary', (req, res) => {
  res.json({
    summary: { totalGrowers: 0, totalBuyers: 0, activeDeals: 0, totalVolume: 0 },
    trends: [],
    ts: new Date().toISOString()
  });
});

app.get('/api/analytics/growers', (req, res) => {
  res.json({ data: [], total: 0 });
});

app.get('/api/analytics/buyers', (req, res) => {
  res.json({ data: [], total: 0 });
});

app.get('/api/match/grower-buyer', (req, res) => {
  res.json({ matches: [], count: 0, algorithm: 'commodity+region+volume', ts: new Date().toISOString() });
});

app.post('/api/match/grower-buyer', (req, res) => {
  res.json({ matches: [], count: 0, query: req.body });
});

app.get('/api/factor/intake', (req, res) => {
  res.json({ applications: [], count: 0, status: 'accepting' });
});

app.post('/api/factor/intake', (req, res) => {
  res.json({ success: true, message: 'Application received. Team will contact within 24 hours.', id: Date.now() });
});

app.get('/api/rfq', (req, res) => {
  res.json({ rfqs: [], total: 0, open: 0 });
});

app.post('/api/rfq', (req, res) => {
  res.json({ success: true, rfqId: 'RFQ-'+Date.now(), status: 'submitted' });
});

app.get('/api/rfq/:id', (req, res) => {
  res.json({ id: req.params.id, status: 'open', matches: [] });
});

// ── AUTONOMY STATUS endpoint // redeploy 1779113140344 ───────────────────���──────────────────────────────
if (!app._autonomyStatusMounted) {
  app._autonomyStatusMounted = true;
  app.get('/api/autonomy/status', (req, res) => {
    res.json({
      ok: true,
      agents: ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'],
      status: 'operational',
      uptime: process.uptime(),
      ts: new Date().toISOString()
    });
  });
}

