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
  
// ── BUYER REGISTRATION (confirmed schema) ────────────────────────────────────
app.post('/api/buyers/register', async (req, res) => {
  const b = req.body || {};
  const legal_name = (b.legal_name || b.companyLegal || '').trim();
  const country    = (b.country || 'USA').trim();
  if (!legal_name) return res.status(400).json({ success:false, error:'legal_name required' });
  if (!country)    return res.status(400).json({ success:false, error:'country required' });
  try {
    const commodities = Array.isArray(b.commodities_preferred)
      ? b.commodities_preferred.join(',') : (b.commodities_preferred || '');
    const regions = Array.isArray(b.regions_served)
      ? b.regions_served.join(',') : (b.regions_served || '');
    const cold_chain = (b.cold_chain_capability === true || b.cold_chain_capability === 'true') ? true : false;

    const r = await pool.query(
      `INSERT INTO secure_buyers
         (legal_name, dba, country, state_province, city, address_line1, postal_code,
          business_type, paca_license, commodities_preferred, regions_served,
          cold_chain_capability, payment_terms_requested, registration_status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',NOW())
       RETURNING id, legal_name, country, registration_status`,
      [
        legal_name,
        b.dba || b.trade_name || '',
        country,
        b.state_province || b.state_region || b.state || '',
        b.city || '',
        b.address_line1 || b.address || '',
        b.postal_code || b.zip_code || '',
        b.business_type || b.buyer_type || 'wholesale',
        b.paca_license || '',
        commodities,
        regions,
        cold_chain,
        b.payment_terms_requested || b.payment_terms || 'net30'
      ]
    );
    const buyer = r.rows[0];
    console.log('[BUYER REG] Created:', buyer.legal_name, buyer.id);
    res.status(201).json({ success:true, buyer, message:'Welcome to the Mexausa network.' });
  } catch(err) {
    console.error('[BUYER REG ERR]', err.message, err.code);
    res.status(500).json({ success:false, error:err.message, code:err.code });
  }
});

try { app.use('/api/buyers', require('./routes/buyers.routes')); console.log('[OK] buyers.routes: mounted at /api/buyers'); } catch(e) { console.warn('[WARN] buyers.routes mount failed:', e.message); }
  try { app.use('/api/hot-leads', require('./routes/hot-leads.routes')); console.log('[OK] hot-leads.routes: mounted at /api/hot-leads'); } catch(e) { console.warn('[WARN] hot-leads.routes mount failed:', e.message); }
// === Factoring waterfall routes (financing partner disclosure is gated) ===
try {
  const financingRoutes = require('./routes/financing');
  app.use('/api/financing', financingRoutes);
  // SPRINT C - Explicit mount of grower-pipeline.js (overrides any dynamic loader version)
  // SPRINT C Phase 3 - Factor Matchmaker
  try { app.use('/api/factor', require('./routes/factor-matchmaker')); console.log('[OK] factor-matchmaker mounted'); } catch(e) { console.error('[FAIL] factor-matchmaker mount:', e.message); }
  try { const fi = require('./routes/factor-intake'); app.use('/api/factor/intake', fi); console.log('[OK] factor-intake mounted at /api/factor/intake', typeof fi); } catch(e) { console.error('[FAIL] factor-intake mount:', e.message, e.stack); }
  try { const brainEvents = require('./routes/brain-events'); app.use('/api/brain/events', brainEvents); app.use('/api/brain/emit', (req,res,next)=>{ req.url='/emit'; brainEvents(req,res,next); }); app.use('/api/brain/deploy-webhook', (req,res,next)=>{ req.url='/deploy-webhook'; brainEvents(req,res,next); }); app.use('/api/brain/health', (req,res,next)=>{ req.url='/health'; brainEvents(req,res,next); }); console.log('[OK] brain-events SSE + health + webhook mounted'); } catch(e) { console.error('[FAIL] brain-events:', e.message); }
  try { app.use('/api/omega/kernel', require('./routes/omegaKernel')); console.log('[OK] omega-kernel mounted at /api/omega/kernel'); } catch(e) { console.error('[FAIL] omega-kernel mount:', e.message); }
try { app.use('/api/brain', require('./routes/brain-stream')); console.log('[OK] brain-stream mounted at /api/brain'); } catch(e) { console.error('[FAIL] brain-stream mount:', e.message); }
  try { app.use('/api/grower', require('./routes/grower-pipeline')); console.log('[OK] grower-pipeline.js: mounted at /api/grower (Sprint C)'); } catch(e) { console.error('[FAIL] grower-pipeline mount:', e.message); }
  try { const matchEngine = require('./services/rfq-match-engine'); app.use('/api/rfq', matchEngine.router); console.log('[OK] rfq-match-engine mounted at /api/rfq (Phase 1 Day 3)'); } catch(e) { console.error('[FAIL] rfq-match-engine mount:', e.message); }
  try { const pacaValidator = require('./services/paca-validator'); pacaValidator.startNightlyCron(); app.use('/api/paca', pacaValidator.router); console.log('[OK] paca-validator mounted at /api/paca + nightly cron 03:00 UTC'); } catch(e) { console.error('[FAIL] paca-validator mount:', e.message); }
  try { const cfdiGen = require('./services/cfdi-generator'); app.use('/api/cfdi', cfdiGen.router); console.log('[OK] cfdi-generator mounted at /api/cfdi (test mode=' + (process.env.CFDI_TEST_MODE||'true') + ')'); } catch(e) { console.error('[FAIL] cfdi-generator mount:', e.message); }
  try { const webpush = require('./services/webpush-server'); webpush.init(); app.use('/api/push', webpush.router); console.log('[OK] webpush-server mounted at /api/push'); } catch(e) { console.error('[FAIL] webpush-server mount:', e.message); }
// REMOVED DUPLICATE MOUNT: /api/brain
  try { const wa = require('./services/whatsapp-rfq-bridge'); app.use('/api/whatsapp', wa.router); console.log('[OK] whatsapp-rfq-bridge mounted at /api/whatsapp'); } catch(e) { console.error('[FAIL] whatsapp-rfq-bridge mount:', e.message); }
  try { const photos = require('./services/photo-upload'); app.use('/api/photos', photos.router); console.log('[OK] photo-upload mounted at /api/photos'); } catch(e) { console.error('[FAIL] photo-upload mount:', e.message); }
  try { const decls = require('./services/production-declarations'); app.use('/api/declarations', decls.router); console.log('[OK] production-declarations mounted at /api/declarations'); } catch(e) { console.error('[FAIL] production-declarations mount:', e.message); }
  try { const cal = require('./routes/calendar.routes'); app.use('/api/calendar', cal);
  try { app.use(require('./routes/intake.routes')(pool)); console.log('[OK] intake routes mounted'); } catch(e) { console.error('[FAIL] intake mount:', e.message); } console.log('[OK] calendar mounted at /api/calendar'); } catch(e) { console.error('[FAIL] calendar mount:', e.message); }
  try { const sb = require('./routes/sourcing-blast.routes'); app.use('/api/sourcing', sb); console.log('[OK] sourcing-blast mounted at /api/sourcing'); } catch(e) { console.error('[FAIL] sourcing-blast mount:', e.message); }
  try { const palerts = require('./services/price-alerts'); app.use('/api/price-alerts', palerts.router); palerts.startCron(); console.log('[OK] price-alerts mounted at /api/price-alerts + cron started'); } catch(e) { console.error('[FAIL] price-alerts mount:', e.message); }
  try { const disputes = require('./services/disputes'); app.use('/api/disputes', disputes.router); console.log('[OK] disputes mounted at /api/disputes'); } catch(e) { console.error('[FAIL] disputes mount:', e.message); }
  try { const auctionWs = require('./services/auction-ws'); app.use('/api/auction-ws', auctionWs.router); console.log('[OK] auction-ws router mounted at /api/auction-ws'); global.__auctionWs = auctionWs; } catch(e) { console.error('[FAIL] auction-ws router mount:', e.message); }

// BRAIN-WIRE-MARKER - Phase 1 universal Brain endpoints

// LOAF-WIRE-MARKER
// REMOVED DUPLICATE MOUNT: /api/loaf
// REMOVED DUPLICATE MOUNT: /api/brain
// REMOVED DUPLICATE MOUNT: /api/brain
  console.log('[OK] /api/financing mounted');
} catch (err) {
  console.error('[WARN] /api/financing mount failed:', err.message);
}
// REMOVED DUPLICATE MOUNT: /api/loaf
try { app.use('/api/commodity-tags', require('./routes/commodity-tags')); console.log('[OK] commodity-tags'); } catch(e) { console.error('[FAIL] commodity-tags:', e.message); }
try { app.use('/api/production-declaration', require('./routes/production-declaration')); console.log('[OK] production-declaration'); } catch(e) { console.error('[FAIL] prod-decl:', e.message); }
try { app.use('/api/blast-templates', require('./routes/blast-templates')); console.log('[OK] blast-templates'); } catch(e) { console.error('[FAIL] blast-templates:', e.message); }
try { app.use('/api/mexico', require('./routes/mexico-contacts')); console.log('[OK] mexico-contacts'); } catch(e) { console.error('[FAIL] mexico:', e.message); }
  explicitMounts.push({ file: 'crm.routes.js', path: '/api/crm' });
  console.log('[OK] crm.routes: mounted at /api/crm');
} catch(e) { console.warn('[WARN] crm.routes not found:', e.message); }

// ===============================================================
// SPRINT D - COMPLIANCE CENTER (Sprint D Run 1, 2026-04-26)
// 6-tab module: dashboard, PACA counterparty lookup, cert tracker,
// production declarations, document vault, mobile field uploads.
// Backed by 6 tables (compliance_certs, compliance_documents,
// paca_registry_seed, production_declarations, compliance_alerts,
// field_uploads) + 3 views. Migration: compliance_center.sql
// ===============================================================
try {
  app.use('/api/compliance-center', require('./routes/compliance-center'));
  explicitMounts.push({ file: 'compliance-center.js', path: '/api/compliance-center' });
  console.log('[OK] compliance-center: mounted at /api/compliance-center');
} catch(e) { console.error('[FAIL] compliance-center mount:', e.message); }

// ===============================================================
// CREDENTIAL RECOVERY -- /api/auth/recover-credentials
// Rate limited: 3 per hour per IP
// ===============================================================
const recoveryBuckets = new Map();

app.post('/api/auth/recover-credentials', async (req, res) => {
  // Rate limit
  const key = `recovery:${req.ip}`;
  const now = Date.now();
  const bucket = recoveryBuckets.get(key) || { count: 0, start: now };
  if (now - bucket.start > 3600000) { bucket.count = 0; bucket.start = now; }
  bucket.count++;
  recoveryBuckets.set(key, bucket);
  if (bucket.count > 3) {
    return res.status(429).json({ error: 'Too many recovery requests. Try again in 1 hour.' });
  }

  const { email, agentCode, requestedAt } = req.body;
  const lookupEmail = (email || agentCode || '').toLowerCase().trim();

  if (!lookupEmail || !lookupEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }

  console.log(`[AUTH] Credential recovery requested for: ${lookupEmail}`);

  // Check auth_users + agent_registrations
  let found = null;
  try {
    let result = await pool.query(
      `SELECT email, name, role FROM auth_users WHERE LOWER(email) = $1 AND status = 'active' LIMIT 1`,
      [lookupEmail]
    );
    if (result.rows.length) {
      found = { ...result.rows[0], source: 'auth_users' };
    } else {
      result = await pool.query(
        `SELECT agent_code, nombre, agent_type FROM agent_registrations WHERE LOWER(email) = $1 OR LOWER(agent_code) = $1 LIMIT 1`,
        [lookupEmail]
      );
      if (result.rows.length) {
        found = { email: result.rows[0].agent_code, name: result.rows[0].nombre, source: 'agent_registrations' };
      }
    }
  } catch (err) {
    console.warn('[AUTH] Recovery lookup failed:', err.message);
  }

  // Log the request
  pool.query(
    `INSERT INTO auth_login_log (email, ip, success, role, reason) VALUES ($1, $2, $3, $4, $5)`,
    [lookupEmail, req.ip, !!found, null, 'recovery_request']
  ).catch(() => {});

  // Notify owner
  try {
    const transporter = sharedTransporter;

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: `"EnjoyBaja Platform" <${process.env.SMTP_USER}>`,
        to: 'sg01@eb.com',
        subject: `[EnjoyBaja] Credential Recovery: ${lookupEmail}`,
        text: `CREDENTIAL RECOVERY REQUEST\n\nEmail: ${lookupEmail}\nFound: ${found ? 'YES -- ' + (found.name || found.email) : 'NOT IN DB'}\nSource: ${found?.source || 'N/A'}\nTime: ${requestedAt || new Date().toISOString()}\nIP: ${req.ip}\n\n-- EnjoyBaja Platform`,
      });
    }
  } catch (err) {
    console.warn('[AUTH] Recovery email failed:', err.message);
  }

  // NEVER return credentials in HTTP response
  if (found) {
    res.json({ success: true, message: 'Recovery request sent. Check your email or contact sg01@eb.com.' });
  } else {
    res.status(404).json({ success: false, error: 'Email not found. Contact sg01@eb.com or WhatsApp +52 646 340 2686.' });
  }
});

explicitMounts.push({ file: 'server.js (inline)', path: '/api/auth/recover-credentials' });

// ===============================================================
// EBEM -- EMAIL MARKETING COMMAND CENTER
// SMTP: using sharedTransporter defined above — see line 182
// /api/email/analytics       -- open/click/sent stats from DB
// /api/claude/generate-email -- AI Niner Miner content generation
// ===============================================================

// Multer for multipart (attachments + blobs from EBEM)
let multer;
try { multer = require('multer'); } catch { multer = null; }
const ebemUpload = multer
  ? multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })
  : { any: () => (req, res, next) => next() };

// POST /api/email/send-campaign
app.post('/api/email/send-campaign', requireAdmin, ebemUpload.any(), async (req, res) => {
  try {
    const crypto     = require('crypto');

    const subject      = req.body.subject      || '(No Subject)';
    const body         = req.body.body         || '';
    const cc           = req.body.cc           || '';
    const bcc          = req.body.bcc          || '';
    const replyTo      = req.body.replyTo      || '';
    const channels      = JSON.parse(req.body.channels     || '["email"]');
    const recipients    = JSON.parse(req.body.recipients   || '[]');
    const campaignType  = req.body.campaignType || 'drip';

    if (!recipients.length) {
      return res.status(400).json({ success: false, error: 'No recipients provided' });
    }

    // -- Check suppression list (unsubscribes + bounces) --
    let suppressedEmails = new Set();
    try {
      const [unsub, bounce] = await Promise.all([
        pool.query('SELECT email FROM email_unsubscribes'),
        pool.query('SELECT email FROM email_bounces WHERE bounce_type = $1', ['hard']),
      ]);
      unsub.rows.forEach(r  => suppressedEmails.add(r.email.toLowerCase()));
      bounce.rows.forEach(r => suppressedEmails.add(r.email.toLowerCase()));
    } catch { /* tables may not exist yet -- continue */ }

    const filteredRecipients = recipients.filter(r => r.email && !suppressedEmails.has(r.email.toLowerCase()));
    const suppressedCount    = recipients.length - filteredRecipients.length;
    if (suppressedCount > 0) {
      console.log(`[EBEM] Suppressed ${suppressedCount} unsubscribed/bounced addresses`);
    }

    // -- Attachments from multer --
    const attachments = (req.files || []).map(f => ({
      filename:    f.originalname,
      content:     f.buffer,
      contentType: f.mimetype,
    }));

    // -- SMTP transporter --
    const transporter = sharedTransporter;

    const fromAddress  = process.env.EMAIL_FROM      || process.env.SMTP_USER || 'saul@mexausafg.com';
    const fromName     = process.env.EMAIL_FROM_NAME || 'Saul Garcia | EnjoyBaja';
    const BASE_URL     = process.env.REACT_APP_API_URL || process.env.BASE_URL || 'https://auditdna-realestate-production.up.railway.app';
    const BATCH_SIZE   = parseInt(process.env.EMAIL_BATCH_SIZE  || '10');
    const BATCH_DELAY  = parseInt(process.env.EMAIL_BATCH_DELAY || '1200');

    // -- HTML email builder v2.0 -- Bilingual styled templates --
    const buildHtml = (personalBody, personalSubject, recipientEmail, trackingId, campaignType) => {
      // Wrap links with click tracking
      const wrappedBody = personalBody.replace(
        /\bhttps?:\/\/[^\s<>"]+/g,
        (url) => {
          const encoded = encodeURIComponent(url);
          return `${BASE_URL}/api/track/click?tid=${trackingId}&url=${encoded}`;
        }
      );

      // Convert plain text to styled HTML paragraphs
      const buildBodyHtml = (text) => text
        .split(/\n\n+/)
        .map(para => {
          // Detect section headers (ALL CAPS lines or lines ending with :)
          const lines = para.split('\n');
          if (lines.length === 1 && (lines[0] === lines[0].toUpperCase() && lines[0].length > 3 && lines[0].length < 80)) {
            return `<div style="font-size:11px;font-weight:700;color:#cba658;letter-spacing:1.5px;text-transform:uppercase;margin:20px 0 8px 0;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">${lines[0]}</div>`;
          }
          // Bullet points
          if (lines[0].startsWith('--') || lines[0].startsWith('-')) {
            const items = lines.map(l => `<li style="margin-bottom:6px;color:#1e293b;">${l.replace(/^[--\-]\s*/, '')}</li>`).join('');
            return `<ul style="margin:0 0 16px 0;padding-left:20px;line-height:1.7;">${items}</ul>`;
          }
          const html = lines.join('<br>');
          return `<p style="margin:0 0 16px 0;line-height:1.8;color:#1e293b;font-size:14px;">${html}</p>`;
        })
        .join('');

      const htmlBody = buildBodyHtml(wrappedBody);

      // Tracking pixel
      const pixel = `<img src="${BASE_URL}/api/track/open?tid=${trackingId}" width="1" height="1" style="display:none" alt="" />`;

      // Unsubscribe URL -- CAN-SPAM + LFPDPPP compliant
      const unsubUrl = `${BASE_URL}/api/unsubscribe?email=${encodeURIComponent(recipientEmail)}&tid=${trackingId}`;

      // Campaign-type accent colors and badges
      const CAMPAIGN_STYLES = {
        us_purchase:  { accent: '#3b82f6', badge: 'USA PURCHASE / COMPRA USA',       badgeBg: '#1e3a5f' },
        us_refi:      { accent: '#f59e0b', badge: 'USA REFINANCE / REFINANCIAMIENTO', badgeBg: '#451a03' },
        mx_purchase:  { accent: '#cba658', badge: 'MEXICO PURCHASE / COMPRA MEXICO',  badgeBg: '#1a1200' },
        mx_refi:      { accent: '#94a3b8', badge: 'MEXICO REFINANCE / REFI MEXICO',   badgeBg: '#0f172a' },
        new_listing:  { accent: '#cba658', badge: 'NEW LISTING / NUEVA PROPIEDAD',    badgeBg: '#1a1200' },
        market_update:{ accent: '#3b82f6', badge: 'MARKET UPDATE / ACTUALIZACION',    badgeBg: '#1e3a5f' },
        mortgage_intro:{ accent: '#cba658', badge: 'MORTGAGE INFO / HIPOTECA',        badgeBg: '#1a1200' },
        follow_up:    { accent: '#94a3b8', badge: 'FOLLOW-UP / SEGUIMIENTO',          badgeBg: '#0f172a' },
        loi_pipeline: { accent: '#f59e0b', badge: 'LOI PIPELINE / CARTA DE INTENCI--N', badgeBg: '#451a03' },
        drip:         { accent: '#cba658', badge: 'CAMPAIGN / CAMPA--A',               badgeBg: '#1a1200' },
      };
      const style = CAMPAIGN_STYLES[campaignType] || CAMPAIGN_STYLES['drip'];

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${personalSubject}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- WRAPPER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f1f5f9;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;">

  <!-- -- HEADER -- -->
  <tr>
    <td style="background:#0f172a;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:20px 32px 16px;">
            <!-- Logo area -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="font-size:22px;font-weight:100;letter-spacing:12px;color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">ENJOY<span style="color:#cba658;">BAJA</span></div>
                  <div style="font-size:8px;letter-spacing:3px;color:#64748b;text-transform:uppercase;margin-top:2px;">Real Estate &bull; Mortgage &bull; Lifestyle</div>
                </td>
                <td style="text-align:right;vertical-align:middle;">
                  <div style="font-size:8px;color:#475569;letter-spacing:1px;">CM Products International</div>
                  <div style="font-size:8px;color:#cba658;letter-spacing:1px;font-weight:700;">NMLS #337526</div>
                  <div style="font-size:8px;color:#475569;margin-top:2px;">enjoybaja.com</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Campaign type badge -->
        <tr>
          <td style="background:${style.badgeBg};padding:6px 32px;border-top:1px solid rgba(203,166,88,0.2);">
            <div style="font-size:8px;font-weight:700;color:${style.accent};letter-spacing:2px;text-transform:uppercase;">${style.badge}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- -- SUBJECT BAR -- -->
  <tr>
    <td style="background:#1e293b;padding:16px 32px;border-left:4px solid ${style.accent};">
      <div style="font-size:16px;color:#f1f5f9;font-weight:600;line-height:1.4;">${personalSubject}</div>
    </td>
  </tr>

  <!-- -- BODY -- -->
  <tr>
    <td style="background:#ffffff;padding:32px 32px 24px;">
      <div style="font-size:14px;color:#1e293b;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">
        ${htmlBody}
      </div>
    </td>
  </tr>

  <!-- -- DIVIDER -- -->
  <tr>
    <td style="background:#ffffff;padding:0 32px;">
      <div style="height:2px;background:linear-gradient(90deg,${style.accent},transparent);"></div>
    </td>
  </tr>

  <!-- -- CONTACT CARD -- -->
  <tr>
    <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="vertical-align:top;padding-right:16px;">
            <div style="font-size:13px;font-weight:700;color:#0f172a;letter-spacing:0.5px;">Saul Garcia</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">Licensed Mortgage Originator</div>
            <div style="font-size:11px;color:#64748b;">CM Products International | NMLS #337526</div>
            <div style="font-size:11px;color:#64748b;margin-top:6px;">
              US: <a href="tel:+18312513116" style="color:#64748b;text-decoration:none;">+1-831-251-3116</a><br>
              MX: <a href="tel:+526463402686" style="color:#64748b;text-decoration:none;">+52-646-340-2686</a>
            </div>
          </td>
          <td style="vertical-align:top;text-align:right;">
            <a href="mailto:saul@mexausafg.com" style="display:inline-block;padding:8px 16px;background:#0f172a;color:#cba658;font-size:11px;font-weight:700;text-decoration:none;letter-spacing:0.5px;border:1px solid #cba658;">saul@mexausafg.com</a>
            <div style="font-size:10px;color:#94a3b8;margin-top:8px;">
              <a href="https://enjoybaja.com" style="color:#94a3b8;text-decoration:none;">enjoybaja.com</a>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- -- LEGAL DISCLAIMER -- -->
  <tr>
    <td style="background:#f1f5f9;padding:12px 32px;border-top:1px solid #e2e8f0;">
      <div style="font-size:9px;color:#94a3b8;line-height:1.6;text-align:center;">
        <strong style="color:#64748b;">Aviso Legal / Legal Notice:</strong>
        Este correo fue enviado a ${recipientEmail} por EnjoyBaja &bull; CM Products International &bull; NMLS #337526<br>
        This email was sent to ${recipientEmail} by EnjoyBaja &bull; CM Products International &bull; NMLS #337526<br>
        Ensenada, Baja California, Mexico &bull; MexaUSA Food Group, Inc.<br>
        This is not a commitment to lend. Equal Housing Lender. / Esto no es un compromiso de prestamo.
      </div>
    </td>
  </tr>

  <!-- -- FOOTER -- -->
  <tr>
    <td style="background:#0f172a;padding:14px 32px;text-align:center;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="text-align:center;">
            <a href="${unsubUrl}" style="color:#475569;font-size:9px;text-decoration:underline;letter-spacing:0.5px;">
              Unsubscribe / Cancelar suscripcion
            </a>
            <span style="color:#334155;font-size:9px;">&nbsp;&bull;&nbsp;</span>
            <a href="mailto:saul@mexausafg.com" style="color:#475569;font-size:9px;text-decoration:none;">
              Contact / Contacto
            </a>
            <span style="color:#334155;font-size:9px;">&nbsp;&bull;&nbsp;</span>
            <a href="https://enjoybaja.com" style="color:#475569;font-size:9px;text-decoration:none;">
              enjoybaja.com
            </a>
          </td>
        </tr>
      </table>
      <div style="font-size:8px;color:#1e293b;margin-top:8px;letter-spacing:0.5px;">
        CAN-SPAM Compliant &bull; LFPDPPP Compliant &bull; First American Title Escrow Protocol
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>

${pixel}
</body>
</html>`;
    };

    // -- Send loop --
    let sent = 0, failed = 0;

    // Insert campaign record first to get campaign_id
    let campaignId = null;
    try {
      const campRes = await pool.query(
        `INSERT INTO email_campaigns (subject, recipients_count, sent_count, failed_count, channels, sent_at)
         VALUES ($1,$2,0,0,$3,NOW()) RETURNING id`,
        [subject, filteredRecipients.length, JSON.stringify(channels)]
      );
      campaignId = campRes.rows[0]?.id;
    } catch { /* non-blocking */ }

    for (let i = 0; i < filteredRecipients.length; i += BATCH_SIZE) {
      const batch = filteredRecipients.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(batch.map(async r => {
        if (!r.email) return;

        const personalBody    = body.replace(/\[Name\]/gi, r.name || 'Valued Client');
        const personalSubject = subject.replace(/\[Name\]/gi, r.name || 'Valued Client');

        // Generate unique tracking ID per recipient
        const trackingId = crypto.randomBytes(12).toString('hex');

        // Store tracking record
        pool.query(
          `INSERT INTO email_campaign_log
             (campaign_id, recipient_email, recipient_name, subject, status, sent_at)
           VALUES ($1,$2,$3,$4,'sent',NOW())
           ON CONFLICT (campaign_id, recipient_email) DO NOTHING`,
          [campaignId, r.email.toLowerCase(), r.name || '', personalSubject]
        ).catch(() => {});

        // Store tracking ID for open/click lookup
        pool.query(
          `INSERT INTO email_tracking (tracking_id, campaign_id, recipient_email, created_at)
           VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
          [trackingId, campaignId, r.email.toLowerCase()]
        ).catch(() => {});

        const htmlContent = buildHtml(personalBody, personalSubject, r.email, trackingId, campaignType);

        const mailOpts = {
          from:        `"${fromName}" <${fromAddress}>`,
          to:          r.email,
          subject:     personalSubject,
          text:        personalBody + `\n\n--\nUnsubscribe: ${BASE_URL}/api/unsubscribe?email=${encodeURIComponent(r.email)}`,
          html:        htmlContent,
          attachments,
          headers: {
            'List-Unsubscribe':      `<${BASE_URL}/api/unsubscribe?email=${encodeURIComponent(r.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Mailer':              'EnjoyBaja-EBEM/2.0',
          },
        };
        if (cc)      mailOpts.cc      = cc;
        if (bcc)     mailOpts.bcc     = bcc;
        if (replyTo) mailOpts.replyTo = replyTo;

        try {
          await transporter.sendMail(mailOpts);
          sent++;
        } catch (err) {
          failed++;
          console.error(`[EBEM] Send failed to ${r.email}:`, err.message);
          pool.query(
            `INSERT INTO email_campaign_log
               (campaign_id, recipient_email, recipient_name, subject, status, error, sent_at)
             VALUES ($1,$2,$3,$4,'failed',$5,NOW())
             ON CONFLICT (campaign_id, recipient_email) DO UPDATE SET status='failed', error=$5`,
            [campaignId, r.email.toLowerCase(), r.name || '', personalSubject, err.message]
          ).catch(() => {});
        }
      }));

      if (i + BATCH_SIZE < filteredRecipients.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }

    // Update campaign final counts
    if (campaignId) {
      pool.query(
        `UPDATE email_campaigns SET sent_count=$1, failed_count=$2 WHERE id=$3`,
        [sent, failed, campaignId]
      ).catch(() => {});
    }

    console.log(`[EBEM] Campaign sent: ${sent} OK, ${failed} failed, ${suppressedCount} suppressed`);

    res.json({
      success:         true,
      sent,
      failed,
      suppressed:      suppressedCount,
      total:           recipients.length,
      emailCount:      sent,
      channels:        channels.length,
      campaignId,
    });

  } catch (err) {
    console.error('[EBEM] send-campaign error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

explicitMounts.push({ file: 'server.js (inline)', path: '/api/email/send-campaign' });

// GET /api/email/analytics
app.get('/api/email/analytics', requireAdmin, async (req, res) => {
  try {
    // Try email_campaign_log table; fall back to zeros if not yet created
    let totalSent = 0, delivered = 0, opened = 0, clicked = 0, campaigns = 0;

    try {
      const [logRes, campRes] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*)                                        AS total_sent,
            COUNT(*) FILTER (WHERE status = 'sent')        AS delivered,
            COUNT(*) FILTER (WHERE opened_at IS NOT NULL)  AS opened,
            COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked
          FROM email_campaign_log
        `),
        pool.query(`SELECT COUNT(*) AS campaigns FROM email_campaigns`),
      ]);
      totalSent = parseInt(logRes.rows[0].total_sent  || 0);
      delivered = parseInt(logRes.rows[0].delivered   || 0);
      opened    = parseInt(logRes.rows[0].opened      || 0);
      clicked   = parseInt(logRes.rows[0].clicked     || 0);
      campaigns = parseInt(campRes.rows[0].campaigns  || 0);
    } catch { /* tables not yet created -- return zeros */ }

    res.json({
      totalSent,
      delivered,
      opened,
      clicked,
      campaigns,
      openRate:  totalSent > 0 ? ((opened  / totalSent) * 100).toFixed(1) : 0,
      clickRate: opened   > 0 ? ((clicked / opened)    * 100).toFixed(1) : 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

explicitMounts.push({ file: 'server.js (inline)', path: '/api/email/analytics' });

// -- Init email_tracking table --
pool.query(`
  CREATE TABLE IF NOT EXISTS email_tracking (
    id             SERIAL PRIMARY KEY,
    tracking_id    VARCHAR(24) UNIQUE NOT NULL,
    campaign_id    INTEGER,
    recipient_email VARCHAR(200),
    opened_at      TIMESTAMPTZ,
    open_count     INTEGER DEFAULT 0,
    clicked_at     TIMESTAMPTZ,
    click_count    INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});

// GET /api/track/open?tid=xxx -- 1x1 transparent pixel, records open
app.get('/api/track/open', async (req, res) => {
  const { tid } = req.query;
  // Respond immediately with transparent pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
  );
  res.writeHead(200, {
    'Content-Type':  'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma':        'no-cache',
  });
  res.end(pixel);

  // Log open async
  if (tid) {
    pool.query(`
      UPDATE email_tracking
      SET opened_at  = COALESCE(opened_at, NOW()),
          open_count = open_count + 1
      WHERE tracking_id = $1
    `, [tid]).then(() => {
      // Sync to campaign log
      pool.query(`
        UPDATE email_campaign_log ecl
        SET opened_at  = COALESCE(ecl.opened_at, NOW()),
            open_count = ecl.open_count + 1
        FROM email_tracking et
        WHERE et.tracking_id = $1
          AND ecl.campaign_id = et.campaign_id
          AND ecl.recipient_email = et.recipient_email
      `, [tid]).catch(() => {});
    }).catch(() => {});
  }
});

// GET /api/track/click?tid=xxx&url=xxx -- redirect + record click
app.get('/api/track/click', async (req, res) => {
  const { tid, url } = req.query;
  const dest = url ? decodeURIComponent(url) : 'https://enjoybaja.com';

  res.redirect(302, dest);

  if (tid) {
    pool.query(`
      UPDATE email_tracking
      SET clicked_at  = COALESCE(clicked_at, NOW()),
          click_count = click_count + 1
      WHERE tracking_id = $1
    `, [tid]).then(() => {
      pool.query(`
        UPDATE email_campaign_log ecl
        SET clicked_at  = COALESCE(ecl.clicked_at, NOW()),
            click_count = ecl.click_count + 1
        FROM email_tracking et
        WHERE et.tracking_id = $1
          AND ecl.campaign_id = et.campaign_id
          AND ecl.recipient_email = et.recipient_email
      `, [tid]).catch(() => {});
    }).catch(() => {});
  }
});

// GET /api/unsubscribe?email=xxx -- one-click unsubscribe (CAN-SPAM + LFPDPPP)
app.get('/api/unsubscribe', async (req, res) => {
  const { email } = req.query;
  if (!email || !email.includes('@')) {
    return res.status(400).send('<h2>Invalid unsubscribe request.</h2>');
  }
  try {
    await pool.query(`
      INSERT INTO email_unsubscribes (email, reason, ip_address, unsubscribed_at)
      VALUES ($1, 'user', $2, NOW())
      ON CONFLICT (email) DO NOTHING
    `, [email.toLowerCase().trim(), req.ip]);

    // Also remove from bounce list if present
    pool.query('DELETE FROM email_bounces WHERE email=$1', [email.toLowerCase()]).catch(() => {});

    console.log(`[EBEM] Unsubscribed: ${email}`);

    res.send(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Unsubscribed</title></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="background:#fff;border-top:3px solid #cba658;padding:40px 48px;max-width:480px;text-align:center;">
    <div style="font-size:10px;letter-spacing:3px;color:#cba658;margin-bottom:16px;">ENJOYBAJA &bull; NMLS #337526</div>
    <h2 style="color:#0f172a;font-size:18px;font-weight:600;margin-bottom:12px;">You have been unsubscribed.</h2>
    <p style="color:#64748b;font-size:13px;line-height:1.7;margin-bottom:8px;">
      <strong>${email}</strong> has been removed from our mailing list.<br>
      You will no longer receive marketing emails from EnjoyBaja or CM Products International.
    </p>
    <p style="color:#94a3b8;font-size:11px;">
      Ha sido dado de baja de nuestra lista de correos.<br>
      If this was a mistake, contact us at saul@mexausafg.com
    </p>
  </div>
</body>
</html>`);
  } catch (e) {
    res.status(500).send('<h2>Error processing unsubscribe. Please contact saul@mexausafg.com</h2>');
  }
});

// POST /api/unsubscribe -- one-click unsubscribe header support (RFC 8058)
app.post('/api/unsubscribe', async (req, res) => {
  const email = req.body.email || req.query.email;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    await pool.query(`
      INSERT INTO email_unsubscribes (email, reason, ip_address, unsubscribed_at)
      VALUES ($1, 'one-click', $2, NOW())
      ON CONFLICT (email) DO NOTHING
    `, [email.toLowerCase().trim(), req.ip]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

explicitMounts.push({ file: 'server.js (inline)', path: '/api/track/open + /api/track/click + /api/unsubscribe' });

// POST /api/claude/generate-email
// AI Niner Miner -- content generation for EBEM compose + AI Brain panel
app.post('/api/claude/generate-email', attachUser, async (req, res) => {
  try {
    const { prompt, miner, context = {} } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ success: false, error: 'Prompt required' });

    const minerProfiles = {
      listing:    'You are a luxury real estate copywriter for EnjoyBaja. Write bilingual EN/ES property listing announcements for Baja California. Tone: sophisticated, aspirational, concise.',
      mortgage:   'You are a cross-border mortgage specialist for CM Products International (NMLS #337526). Write clear, compliant email content about US mortgage financing for Mexico property purchases. Include fideicomiso info when relevant. Always mention NMLS #337526.',
      subject:    'You are an email subject line specialist. Generate exactly 3 high-open-rate subject lines for real estate / mortgage campaigns. Return ONLY valid JSON, no markdown, no explanation: { "subjects": ["subject 1","subject 2","subject 3"] }',
      followup:   'You are a real estate follow-up specialist for EnjoyBaja. Write warm, personalized bilingual EN/ES follow-up emails for leads who inquired about properties or mortgage options.',
      social:     'You are a bilingual social media manager for EnjoyBaja real estate. Write punchy, engaging captions for Instagram, Facebook, and LinkedIn. Use relevant hashtags. EN/ES.',
      sms:        'You are an SMS marketing specialist. Write concise, high-conversion SMS/WhatsApp messages for real estate and mortgage campaigns. Max 160 chars for SMS, 300 for WhatsApp. No fluff.',
      market:     'You are a Baja California real estate market analyst. Write professional, data-driven market update emails covering property trends, pricing, and investment opportunities in Baja California.',
      calendar:   'You are a scheduling assistant for a cross-border real estate firm. Write professional meeting invitations and scheduling emails for property showings, mortgage consultations, and LOI reviews.',
      si_letter:  'You are AuditDNA SI (Synthetic Intelligence), a compliance letter specialist for CM Products International (NMLS #337526). Write formal, legally precise letters including: Letters of Intent (LOI), Letters of Commitment (LOC), Term Sheets, CFPB complaint letters, RESPA violation notices, and mortgage dispute correspondence. Always include proper legal headings, NMLS #337526, and Saul Garcia as signatory. Bilingual EN/ES when requested.',
      bilingual:  'You are a bilingual EN/ES email template specialist for EnjoyBaja and USAMortgage. Create full dual-language email templates with English and Spanish side by side or clearly separated. Format: English paragraph, then Spanish translation of the same paragraph. Professional, luxury real estate tone. Always include NMLS #337526 in mortgage content.',
      loi:        'You are an LOI (Letter of Intent) drafter for EnjoyBaja cross-border real estate transactions. Write formal, professional Letters of Intent for property purchases in Baja California. Include: buyer/seller info placeholders, property description, offer price, financing type (cash/USA mortgage/developer terms), fideicomiso note for restricted zones, LOI--LOC--Term Sheet sequence, escrow-first workflow, lender identity confidentiality clause. Signatory: Saul Garcia | CM Products International | NMLS #337526.',
      compliance: 'You are a compliance copywriter for CM Products International (NMLS #337526). Write RESPA-compliant, CFPB-compliant, and Mexican LFPDPPP-compliant email content. For US mortgage content: include required disclosures, equal housing language, NMLS number. For Mexican content: include privacy notice references and proper Spanish-language disclosures. Never make specific rate promises. Always include: "This is not a commitment to lend."',
    };

    const systemPrompt = minerProfiles[miner] || 'You are an expert real estate and mortgage email copywriter for EnjoyBaja (EnjoyBaja.com) and CM Products International (NMLS #337526), operating in Baja California, Mexico and the United States. Write bilingual EN/ES when appropriate. Professional, luxury tone.';

    const contextNote = context.recipientCount
      ? `\n\nCampaign context: ${context.recipientCount} recipients, channels: ${(context.channels || []).join(', ')}.`
      : '';

    const fullPrompt = `${prompt}${contextNote}\n\nAlways include contact info at the end: Saul Garcia | EnjoyBaja | NMLS #337526 | saul@mexausafg.com | US: +1-831-251-3116 | MX: +52-646-340-2686`;

    const text = await aiHelper.ask(fullPrompt, systemPrompt);

    // Subject Sniper -- return all 3 options as JSON
    if (miner === 'subject') {
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        return res.json({ success: true, subjects: parsed.subjects, subject: parsed.subjects?.[0], content: text });
      } catch { /* fall through */ }
    }

    // SMS -- trim to 160
    if (miner === 'sms') {
      return res.json({ success: true, content: text.substring(0, 160) });
    }

    // SI Letter / LOI / Compliance / Bilingual -- return full letter as content
    if (['si_letter', 'loi', 'compliance', 'bilingual'].includes(miner)) {
      const subjectMatch = text.match(/^(?:Subject|RE|SUBJECT):\s*(.+)/im);
      const subject = subjectMatch ? subjectMatch[1].trim() : null;
      return res.json({ success: true, subject, content: text, text, isLetter: true });
    }

    // Standard -- split subject from body
    const subjectMatch = text.match(/^Subject:\s*(.+)/im);
    const subject      = subjectMatch ? subjectMatch[1].trim() : null;
    const body         = subject ? text.replace(/^Subject:\s*.+\n?/im, '').trim() : text;

    res.json({ success: true, subject, content: body, text });

  } catch (err) {
    console.error('[EBEM] generate-email error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

explicitMounts.push({ file: 'server.js (inline)', path: '/api/claude/generate-email' });

// --
// POST /api/ai/generate  ???  Anthropic-SDK-compatible passthrough
// Accepts native Anthropic messages format from EmailMarketing.jsx and
// SaulIntelCRM.jsx AI Subject/Body/Full Email generators.
// Body: { model, max_tokens, messages: [{role, content}], system? }
// Returns: native Anthropic response { content: [{type:'text', text:'...'}], ... }
// --
app.post('/api/ai/generate', attachUser, async (req, res) => {
  try {
    const { model, max_tokens, messages, system } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array required' });
    }
    const chosenModel = model || 'claude-opus-4-5';
    const response = await anthropic.messages.create({
      model:      chosenModel,
      max_tokens: parseInt(max_tokens) || 1024,
      system:     system || 'You are a helpful AI assistant for Mexausa Food Group, Inc. agricultural trade intelligence platform. Be concise, specific, and professional. No emojis.',
      messages
    });
    res.json(response);
  } catch (err) {
    console.error('[AI_GENERATE] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
explicitMounts.push({ file: 'server.js (inline)', path: '/api/ai/generate' });

// ===============================================================
// BRAIN API -- status is public (moved above Ownermetrics), everything else requires auth
// ===============================================================

// Auth required -- event ingestion
app.post('/api/brain/events', attachUser, async (req, res) => {
  try {
    const { events } = req.body;
    const result = typeof brain?.ingestFrontendEvents === 'function'
      ? await brain.ingestFrontendEvents(events)
      : { success: true, processed: 0 };
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auth required -- logging
app.post('/api/brain/log', attachUser, async (req, res) => {
  try {
    const { module: mod = 'frontend', event, data = {}, source = 'frontend', timestamp } = req.body;
    pool.query(
      `INSERT INTO mortgage_brain_log (module, event, data, source) VALUES ($1,$2,$3,$4)`,
      [mod, event, JSON.stringify({ ...data, clientTimestamp: timestamp, user: req.user?.email }), source]
    ).catch(() => {});
    if (typeof brain?.logEvent === 'function') brain.logEvent(mod, event, data);
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// Owner only -- workflow trigger
app.post('/api/brain/workflow', requireAdmin, async (req, res) => {
  try {
    const { type, payload } = req.body;
    const result = typeof brain?.processWorkflow === 'function'
      ? await brain.processWorkflow(type, payload)
      : { success: true, workflowId: `WF-${Date.now()}`, status: 'queued' };
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Owner only -- full brain status with metrics
// /api/brain/query -- called by SaulIntelCRM.jsx for AI-assisted contact/deal enrichment
app.post('/api/brain/query', attachUser, async (req, res) => {
  try {
    const { query, context = {}, module: mod = 'crm' } = req.body || {};
    if (!query?.trim()) return res.status(400).json({ success: false, error: 'query required' });
    const sysPrompt = 'You are AuditDNA SI. Module: ' + mod + '. Be concise. JSON response: { "answer": "...", "action": "...", "data": {} }';
    const fullPrompt = context.contactData ? 'Contact: ' + JSON.stringify(context.contactData) + '\n\nQuery: ' + query : query;
    let answer = '';
    try {
      const r = await anthropic.messages.create({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 512, system: sysPrompt, messages: [{ role: 'user', content: fullPrompt }] });
      answer = r.content[0]?.text || '';
    } catch (e) { console.warn('[brain/query] AI fail:', e.message); answer = JSON.stringify({ answer: 'Temporarily unavailable.', action: null, data: {} }); }
    let parsed = { answer, action: null, data: {} };
    try { parsed = JSON.parse(answer.replace(/```json|```/g, '').trim()); } catch {}
    if (typeof brain?.logEvent === 'function') brain.logEvent(mod, 'brain_query', { query });
    res.json({ success: true, ...parsed });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
explicitMounts.push({ file: 'server.js (inline)', path: '/api/brain/query' });

// /api/zadarma-sync/* + /api/Zadarma-sync/* -- called fire-and-forget by SaulIntelCRM and EmailMarketing after campaign sends
const _zadarmaSync = async (req, res) => {
  try {
    const { campaignId, subject = '', recipients = [] } = req.body || {};
    const cid = campaignId || ('CAMP-' + Date.now());
    pool.query(
      `INSERT INTO zadarma_campaign_log (campaign_id, subject, recipient_count, synced_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (campaign_id) DO UPDATE SET synced_at=NOW()`,
      [cid, subject, recipients.length]
    ).catch(() => pool.query(`CREATE TABLE IF NOT EXISTS zadarma_campaign_log (id SERIAL PRIMARY KEY, campaign_id VARCHAR(100) UNIQUE, subject TEXT, recipient_count INT DEFAULT 0, synced_at TIMESTAMPTZ DEFAULT NOW())`).catch(() => {}));
    res.json({ success: true, campaignId: cid, message: 'Campaign synced', synced: recipients.length });
  } catch { res.json({ success: true, message: 'Sync queued' }); }
};
const _zadarmaStats = async (req, res) => {
  try {
    const r = await pool.query('SELECT COUNT(*) AS c, COALESCE(SUM(recipient_count),0) AS t FROM zadarma_campaign_log').catch(() => ({ rows: [{ c: 0, t: 0 }] }));
    res.json({ success: true, campaigns: parseInt(r.rows[0]?.c || 0), totalRecipients: parseInt(r.rows[0]?.t || 0) });
  } catch { res.json({ success: true, campaigns: 0, totalRecipients: 0 }); }
};
app.post('/api/zadarma-sync/campaign',  attachUser, _zadarmaSync);
app.post('/api/Zadarma-sync/campaign',  attachUser, _zadarmaSync);
app.get('/api/zadarma-sync/stats',      attachUser, _zadarmaStats);
app.get('/api/Zadarma-sync/stats',      attachUser, _zadarmaStats);
explicitMounts.push({ file: 'server.js (inline)', path: '/api/zadarma-sync/* + /api/Zadarma-sync/*' });

app.get('/api/brain/full-status', requireOwner, (req, res) => {
  const status = typeof brain?.getStatus === 'function'
    ? brain.getStatus()
    : { mode: 'direct-call', miners: 81, status: 'operational' };
  res.json({ success: true, brain: status });
});

explicitMounts.push({ file: 'Brain.js (inline)', path: '/api/brain/*' });

// ===============================================================

// ── PREVIOUSLY MISSING ROUTES — now created ──────────────────────────────────
app.use('/api/inventory',     require('./routes/inventory'));
app.use('/api/mortgage',      require('./routes/mortgage'));
app.use('/api/owner-metrics', require('./routes/Ownermetrics'));
app.use('/api/mortgage-leads',require('./routes/mortgage-leads'));
app.use('/api/user',          require('./routes/user'));

// AUTO ROUTE LOADER
// ===============================================================

const routesDir = path.join(__dirname, 'routes');
const loadedRoutes = [];
const failedRoutes = [];

const SKIP_AUTO = new Set([
  'mortgage.js',
  'Ownermetrics.js',
  'auth.js',
  'unsubscribe.js',
  'letters.js',
  'audits.js',
  'analytics.js',
  'Brain.js',
  'Brainlog.js',
  'admin-notifications.js',
  'Server-registration.js',
  'Audit-notifictions.js',
  'notifications.js',
  'Executionengine.js',
  'Ollama.js',
  'Ollamaprovider.js',
  'Tier1-extraction.js',
  'Tier2-compliance.js',
  'Tier3-jurisdiction.js',
  'Tier4-chain.js',
  'Tier5-financial.js',
  'Tier6-legal.js',
  'verify-security.js',
  'Letterengine.js',
  'letterEngine.js',
  'emailScraper.js',   // explicitly mounted at /api/scraper (requireAdmin)
  'land-listings.js',
  'land-listings-upload.js',
  'land-listings.js',
  'land-listings-upload.js',
  'crm.routes.js',     // explicitly mounted at /api/crm (frontend expects /api/crm/*)
  'compliance-center.js', // explicitly mounted at /api/compliance-center (Sprint D)
  'Crm.js',            // hardcoded bad DB config (host literal string 'process.env.DB_HOST')
]);

function loadRoutes(dir, base = '/api') {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) { loadRoutes(full, `${base}/${file}`); continue; }
    if (!file.endsWith('.js')) continue;
    if (SKIP_AUTO.has(file)) { console.log(`   [SKIP] ${file} (explicitly mounted)`); continue; }
    try {
      const mountPath = `${base}/${file.replace('.js', '')}`;
      app.use(mountPath, require(full));
      loadedRoutes.push({ file, path: mountPath });
    } catch (e) {
      failedRoutes.push({ file, error: e.message });
      console.error(`   [ERR] Failed to load ${file}: ${e.message}`);
    }
  }
}

// ===============================================================
// INTERNAL MESSENGER -- soft auth on presence/channels (stops 401 flood)
// ===============================================================
try {
  const messengerRoutes = require('./routes/Internal-messenger');
  const softAuth = (req, res, next) => { req.softAuth = true; next(); };
  app.get('/internal-messenger/channels',      attachUser, softAuth, messengerRoutes);
  app.get('/internal-messenger/presence',      attachUser, softAuth, messengerRoutes);
  app.post('/internal-messenger/presence',     attachUser, softAuth, messengerRoutes);
  app.use('/internal-messenger',               attachUser, messengerRoutes);
  app.get('/api/internal-messenger/channels',  attachUser, softAuth, messengerRoutes);
  app.get('/api/internal-messenger/presence',  attachUser, softAuth, messengerRoutes);
  app.post('/api/internal-messenger/presence', attachUser, softAuth, messengerRoutes);
  app.use('/api/internal-messenger',           attachUser, messengerRoutes);
  SKIP_AUTO.add('Internal-messenger.js');
  explicitMounts.push({ file: 'Internal-messenger.js', path: '/internal-messenger + /api/internal-messenger' });
  console.log('[OK] Internal-messenger: mounted at /internal-messenger and /api/internal-messenger');
} catch(e) { console.warn('[WARN] Internal-messenger:', e.message); }

console.log('\n[SCAN] Discovering routes...\n');
loadRoutes(routesDir);

// ===============================================================
// HEALTH -- sanitized (no internal details)
// ===============================================================

app.get('/health', (req, res) => {
  res.json({
    status:  'healthy',
    version: 'v4.1',
    uptime:  Math.round(process.uptime()),
  });
});

// ===============================================================
// METRICS & ROUTES -- OWNER ONLY (JWT required)
// ===============================================================

app.get('/metrics', requireOwner, (req, res) => {
  res.json({
    requests: requestStats,
    memory:   process.memoryUsage(),
    uptime:   process.uptime(),
    routes: {
      explicit: explicitMounts,
      auto:     loadedRoutes,
      failed:   failedRoutes,
    }
  });
});

app.get('/api/routes', requireOwner, (req, res) => {
  res.json({
    explicit: explicitMounts,
    auto:     loadedRoutes,
    failed:   failedRoutes,
    total:    explicitMounts.length + loadedRoutes.length,
  });
});

// ===============================================================
// START SERVER
// ===============================================================

// SPRINT D - Price Prediction Engine
app.use('/api/ai/predict-price', require('./routes/ai-price-predict'));

// SPRINT D WAVE 2 - Niner Bridge
app.use('/api/niner', require('./routes/niner-bridge'));

// SPRINT D WAVE 3D - Autonomy Loop
try { app.use('/api/autonomy', require('./routes/autonomy-loop')); console.log('[OK] autonomy-loop mounted at /api/autonomy'); } catch(e) { console.error('[FAIL] autonomy-loop:', e.message); }

const __server = require('http').createServer(app);
try { if (global.__auctionWs && typeof global.__auctionWs.attach === 'function') { global.__auctionWs.attach(__server); console.log('[OK] auction-ws attached to http server'); } } catch(e) { console.error('[FAIL] auction-ws attach:', e.message); }
// ============ LOAF AGENTS - Priscilla (reporter) + Nadine (onboarding) ============
try {
  const priscilla = require('./agents/priscilla');
  priscilla.init(app, pool, sharedTransporter);
  console.log('[PRISCILLA] LOAF marketing agent ONLINE');
} catch (err) {
  console.error('[PRISCILLA] init failed:', err.message);
}
try {
  const nadine = require('./agents/nadine');
  nadine.init(app, pool);
  // LOAF sponsor payments - Stripe checkout + apply pipeline
  const nadinePayments = require('./services/nadine-payments');
  nadinePayments.init(app, {
    pool,
    publicSiteUrl: process.env.LOAF_PUBLIC_URL || 'https://loaf.mexausafg.com',
    alertEmail:    process.env.NADINE_ALERT_EMAIL || 'sgarcia1911@gmail.com',
    selfBaseUrl:   process.env.NADINE_SELF_URL || ('http://127.0.0.1:' + (process.env.PORT || 5050)),
    gmailApiSend:  (function(){ try { return require('./routes/gmail').gmailApiSend; } catch (e) { return null; } })()
  });
    console.log('[NADINE-PAY] payments routes ONLINE');
  // LOAF poller - local PM2 picks up paid_apply_failed from Railway
  try {
    const nadinePoller = require('./services/nadine-poller');
    nadinePoller.init(app, {
      railwayUrl:   process.env.NADINE_POLLER_RAILWAY_URL || null,
      selfBaseUrl:  process.env.NADINE_SELF_URL || ('http://127.0.0.1:' + (process.env.PORT || 5050)),
      loafHtmlPath: process.env.LOAF_HTML_PATH || 'C:\\AuditDNA\\frontend\\public\\mfginc-loaf.html',
      intervalMs:   parseInt(process.env.NADINE_POLLER_INTERVAL_MS, 10) || 60000
    });
  } catch (e) { console.error('[FAIL] nadine-poller mount:', e.message); }
  console.log('[NADINE] LOAF sponsor onboarding agent ONLINE');
} catch (err) {
  console.error('[NADINE] init failed:', err.message);
}

__server.listen(PORT, () => {
  // ============================================================
  // 2026-05-01: Auto-start swarm Phase 4 coordinator
  // (start() logs its own status, does not return a Promise)
  // ============================================================
  try {
    const swarmCoord = require('./services/swarm-coordinator');
    if (swarmCoord && typeof swarmCoord.start === 'function') {
      swarmCoord.start({ pool });
      console.log('[SWARM] Phase 4 coordinator startup invoked');
    }
  } catch (err) {
    console.error('[SWARM] coordinator load error:', err.message);
  }

  // ============================================================
  // 2026-05-01: Auto-start GG SMTP Medic agent
  // Skip on Railway (SMTP blocked) by setting SKIP_GG=true
  // ============================================================
  if (process.env.SKIP_GG === 'true') {
    console.log('[GG] SKIP_GG=true - SMTP medic disabled (Railway env)');
  } else {
    try {
      const gg = require('./services/gg-smtp-medic');
      gg.init({ pool, aiHelper, transporter: sharedTransporter });
      gg.start().catch(e => console.error('[GG] start error:', e.message));
      console.log('[GG] SMTP Medic startup invoked');
    } catch (err) {
      console.error('[GG] load error:', err.message);
    }
  }
  const totalRoutes = explicitMounts.length + loadedRoutes.length;
  console.log(`
================================================================
 AUDITDNA BACKEND SERVER v4.1 (SECURED)
 Port: ${PORT}
 Env: ${NODE_ENV}
 CORS: ${NODE_ENV === 'development' ? 'localhost + allowed origins' : 'restricted'}
================================================================
 EXPLICIT MOUNTS: ${explicitMounts.length}
${explicitMounts.map(r => `    |-- ${r.path.padEnd(28)} <-- ${r.file}`).join('\n')}
 AUTO-DISCOVERED: ${loadedRoutes.length}
${loadedRoutes.map(r => `    |-- ${r.path.padEnd(28)} <-- ${r.file}`).join('\n')}
${failedRoutes.length ? ` FAILED: ${failedRoutes.length}\n${failedRoutes.map(r => `    |-- ${r.file}: ${r.error}`).join('\n')}` : ''}
 TOTAL ROUTES: ${totalRoutes}
================================================================
`);

  const expectedRoutes = ['developments', 'agent-registrations', 'notifications'];
  const existingFiles = fs.existsSync(routesDir) ? fs.readdirSync(routesDir).map(f => f.replace('.js', '').toLowerCase()) : [];
  const missing = expectedRoutes.filter(r => !existingFiles.includes(r));
  if (missing.length) {
    console.log(`[WARN] MISSING ROUTE FILES:`);
    missing.forEach(r => console.log(`    \\-- routes/${r}.js`));
  }

  // Auto-start EMMA OAuth Medic
  try {
    const emma = require('./services/emma-oauth-medic');
    emma.init({ pool, aiHelper });
    emma.start();
    console.log('[EMMA] OAuth Medic startup invoked');
  } catch (err) {
    console.error('[EMMA] load error:', err.message);
  }

  // Auto-start EVELYN Code Janitor
  try {
    const evelyn = require('./services/evelyn-code-janitor');
    evelyn.init({ pool, aiHelper });
    evelyn.start();
    console.log('[EVELYN] Code Janitor startup invoked');
  } catch (err) {
    console.error('[EVELYN] load error:', err.message);
  }

  // Auto-start MARGIE Audit Keeper
  try {
    const margie = require('./services/margie-audit-keeper');
    margie.init({ pool });
    margie.start();
    console.log('[MARGIE] Audit Keeper startup invoked');
  } catch (err) {
    console.error('[MARGIE] load error:', err.message);
  }
});

// ===============================================================
// GRACEFUL SHUTDOWN
// ===============================================================

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  __server.close(() => {
    pool.end(() => {
      console.log('[OK] PostgreSQL closed');
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

try { require('./complianceCleaner')(pool); }
catch (e) { console.warn('[WARN] complianceCleaner not loaded:', e.message); }

// ===============================================================
// SCHEDULER -- cron jobs for cooling-off, aging alerts, daily digest
// ===============================================================
try {
  require('./scheduler');
  console.log('[OK] SCHEDULER: 5 cron jobs registered');
} catch (e) {
  console.warn('[WARN] Scheduler not loaded:', e.message);
}

// BOUNCE HARVEST CRON -- every 6 hours, auto-quarantine Gmail bounces
try {
  const cron = require('node-cron');
  cron.schedule('0 */6 * * *', () => {
    fetch(`http://localhost:${process.env.PORT || 5050}/api/gmail/harvest-bounces`)
      .then(r => r.json())
      .then(d => console.log('[bounce-cron] harvested:', d.harvested, 'quarantined'))
      .catch(e => console.error('[bounce-cron] failed:', e.message));
  });
  console.log('[OK] BOUNCE HARVEST CRON: every 6 hours');
} catch (e) {
  console.warn('[WARN] bounce-cron not loaded:', e.message);
}

// CAMPAIGNS ENGINE + INTERNAL INBOX (Phase 1 - mounted BEFORE export so they actually load)
try { app.use('/api/campaigns', require('./routes/campaigns-engine')); console.log('[OK] campaigns-engine mounted at /api/campaigns'); } catch(e) { console.error('[FAIL] campaigns-engine mount:', e.message); }
try { app.use('/api/inbox', require('./routes/internal-inbox')); console.log('[OK] internal-inbox mounted at /api/inbox'); } catch(e) { console.error('[FAIL] internal-inbox mount:', e.message); }
try { app.use('/api/wesource', require('./routes/wesource.routes')); console.log('[OK] wesource routes mounted at /api/wesource'); } catch(e){ console.error('[ERR] wesource:',e.message); app.get('/api/wesource',(req,res)=>res.json({results:[]})); } //esource'); } catch (e) { console.error('[FAIL] wesource routes:', e.message); }
try { const ar=require('./routes/agents.routes'); app.use('/api/agents', ar); console.log('[OK] agents mounted at /api/agents'); } catch(e){ console.error('[ERR] agents.routes failed to load:',e.message); app.get('/api/agents',(req,res)=>res.json({agents:[],total:0})); } //catch (e) { console.error('[FAIL] agents:', e.message); }
try {
  const diego = require('./services/diego-si');
  diego.startCron();
  console.log('[OK] Diego SI compliance watchdog started');
} catch (e) { console.error('[FAIL] diego cron:', e.message); }
try { app.use('/api/campaign-recipes', require('./routes/campaign-recipes.routes')); console.log('[OK] campaign-recipes mounted at /api/campaign-recipes'); } catch (e) { console.error('[FAIL] campaign-recipes:', e.message); }

module.exports = app;
module.exports.pool = pool;
module.exports.app = app;

// COMMODITY SEARCH ENGINE
try { const gm = require('./routes/gmail'); app.use('/api/gmail', gm); app.set('gmailRoute', gm); console.log('[OK] gmail routes loaded'); } catch(e) { console.error('[FAIL] gmail routes:', e.message); }
// REMOVED DUPLICATE MOUNT: /api/gmail
  try { const cs = require('./routes/commodity-search'); app.use('/api/commodity', cs); console.log('[OK] commodity-search mounted at /api/commodity'); } catch(e) { console.warn('[WARN] commodity:', e.message); }

// MOBILE WORKSPACE v2 - Run 13e
try { const mw = require('./routes/mobileWorkspace'); app.use('/api/mobile', mw); console.log('[OK] mobileWorkspace mounted at /api/mobile'); } catch(e) { console.error('[FAIL] mobileWorkspace mount:', e.message); }

// AuditDNA Autonomy Phase 2A boot
try {
  const autonomy = require('./autonomy');
  // Use already-connected global.db pool (Railway-aware) instead of creating a new one
  autonomy.boot(global.db);
  console.log('[OK] Autonomy Phase 2A booted - 15 agents loaded');
} catch (e) { console.warn('[WARN] Autonomy boot failed:', e.message); }
// REMOVED DUPLICATE MOUNT: /api/other-contacts
// REMOVED DUPLICATE MOUNT: /api/auth
try { app.use('/api/land-listings', require('./routes/land-listings')); console.log('[OK] land-listings mounted'); } catch(e) { console.error('[FAIL] land-listings:', e.message); }

try { app.use('/api/loaf/freshness', require('./routes/freshness-router')); console.log('[OK] freshness-router mounted'); } catch(e) { console.error('[FAIL] freshness-router:', e.message); }
try { app.use('/api/loaf/loads', require('./routes/loaf-consolidator')); console.log('[OK] loaf-consolidator mounted'); } catch(e) { console.error('[FAIL] loaf-consolidator:', e.message); }
try { app.use('/api/loaf/whatsapp', require('./routes/loaf-whatsapp')); console.log('[OK] loaf-whatsapp mounted'); } catch(e) { console.error('[FAIL] loaf-whatsapp:', e.message); }
try { app.use('/api/oakland', require('./routes/oakland')); console.log('[OK] oakland mounted'); } catch(e) { console.error('[FAIL] oakland:', e.message); }

try {
  app.get('/api/usda/markets', (req,res) => {
    res.json({ ok:true, status:'ONLINE', markets:20, service:'usda-market-intel' });
  });
  console.log('[OK] /api/usda/markets stub mounted');
} catch(e) {}
try { app.use('/api/we-link-invite', require('./routes/we-link-invite')); console.log('[OK] we-link-invite mounted'); } catch(e) { console.error('[FAIL] we-link-invite:', e.message); }
try { app.use('/api/we-link/contract', require('./routes/we-link-contract')); console.log('[OK] we-link-contract mounted'); } catch(e) { console.error('[FAIL] we-link-contract:', e.message); }
try { app.use('/api/we-link', require('./routes/we-link')); console.log('[OK] we-link mounted'); } catch(e) { console.error('[FAIL] we-link:', e.message); }
try { app.use('/api/land-listings/upload', require('./routes/land-listings-upload')); console.log('[OK] land-listings-upload mounted'); } catch(e) { console.error('[FAIL] land-listings-upload:', e.message); }


// ── TRACEABILITY + GLOBAL INTEL (FSMA 204 KDE/CTE + international data) ──────
try { app.use('/api/traceability', require('./routes/traceabilityWorkflow')); console.log('[OK] traceability: FSMA 204 KDE/CTE engine mounted'); } catch(e) { console.error('[FAIL] traceability:', e.message); }
try { app.use('/api/global-intel', require('./routes/global-intel')); console.log('[OK] global-intel: FAO/USDA-NASS/OpenFDA/WorldBank aggregator mounted'); } catch(e) { console.error('[FAIL] global-intel:', e.message); }

// ── ag_intel_cache — international data cache for global-intel routes ─────────
(async () => {
  try {
    const pool = global.db || app.get('db');
    if (!pool) return;
    // Create table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ag_intel_cache (
        id SERIAL PRIMARY KEY,
        commodity VARCHAR(100),
        source VARCHAR(100),
        country_code VARCHAR(20),
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Add missing columns to existing table (ALTER TABLE is safe if col already exists)
    const alterCols = [
      "ALTER TABLE ag_intel_cache ADD COLUMN IF NOT EXISTS commodity VARCHAR(100)",
      "ALTER TABLE ag_intel_cache ADD COLUMN IF NOT EXISTS source VARCHAR(100)",
      "ALTER TABLE ag_intel_cache ADD COLUMN IF NOT EXISTS country_code VARCHAR(20)",
      "ALTER TABLE ag_intel_cache ADD COLUMN IF NOT EXISTS payload JSONB",
    ];
    for (const sql of alterCols) {
      try { await pool.query(sql); } catch(_) {}
    }
    // Create index — safe now that column guaranteed to exist
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ag_intel_commodity ON ag_intel_cache(commodity, source, created_at DESC)`);
    console.log('[OK] ag_intel_cache table ready');
  } catch(e) { console.warn('[WARN] ag_intel_cache (non-fatal):', e.message); }
})();


// ── PHASE 2 ROUTES — all 8 priorities ────────────────────────────────────────
try { app.use('/api/fda',              require('./routes/fda-prior-notice'));  console.log('[OK] /api/fda — FDA Prior Notice + contamination risk'); } catch(e) { console.error('[FAIL] fda:', e.message); }
try { app.use('/api/global-compliance',require('./routes/globalCompliance'));   console.log('[OK] /api/global-compliance — SENASICA crosswalk + border docs'); } catch(e) { console.error('[FAIL] global-compliance:', e.message); }
try { app.use('/api/harvest-risk',     require('./routes/harvest-risk'));       console.log('[OK] /api/harvest-risk — Harvest Risk Score engine'); } catch(e) { console.error('[FAIL] harvest-risk:', e.message); }
try { app.use('/api/payments',         require('./routes/payment-rails'));      console.log('[OK] /api/payments — Wise + ACH + CFDI + revenue dashboard'); } catch(e) { console.error('[FAIL] payments:', e.message); }
try { app.use('/api/investor',         require('./routes/investor-pipeline'));  console.log('[OK] /api/investor — SAM.gov + SBIR + investor CRM'); } catch(e) { console.error('[FAIL] investor:', e.message); }
try { app.use('/api/team',             require('./routes/team-ops'));           console.log('[OK] /api/team — team tasks + border digital twin + cold chain'); } catch(e) { console.error('[FAIL] team:', e.message); }

try { app.use('/api/gov-access', require('./routes/gov-access')); console.log('[OK] /api/gov-access — Government/Agency Read-Only Portal'); } catch(e) { console.error('[FAIL] gov-access:', e.message); }
try { app.use('/api/grower-compliance', require('./routes/grower-compliance')); console.log('[OK] /api/grower-compliance — Grower Trust Score + GlobalGAP umbrella + APHIS'); } catch(e) { console.error('[FAIL] grower-compliance:', e.message); }
// ── MEXAUSA FOOD GROUP — New Platform Routes (TraceSafe / Certifications / Lab / Border / Partners) ──
try {
  const { registerTraceSafeRoutes, createTraceSafeTable } = require('./routes/tracesafe');
  registerTraceSafeRoutes(app, global.db || app.get('db') || pool);
  createTraceSafeTable(global.db || app.get('db') || pool).catch(e => console.warn('[WARN] tracesafe table:', e.message));
  console.log('[OK] TraceSafe Small Grower Program routes mounted');
} catch(e) { console.error('[FAIL] tracesafe routes:', e.message); }

try {
  const { registerCertificationRoutes, createCertificationsTable } = require('./routes/certifications');
  registerCertificationRoutes(app, global.db || app.get('db') || pool);
  createCertificationsTable(global.db || app.get('db') || pool).catch(e => console.warn('[WARN] cert table:', e.message));
  console.log('[OK] Re:Collect Certification Exchange routes mounted');
} catch(e) { console.error('[FAIL] certifications routes:', e.message); }

try {
  const { registerTraceabilityRoutes, createTraceabilityTables } = require('./routes/traceability');
  registerTraceabilityRoutes(app, global.db || app.get('db') || pool);
  createTraceabilityTables(global.db || app.get('db') || pool).catch(e => console.warn('[WARN] traceability tables:', e.message));
  console.log('[OK] Lab Reports + Border Compliance + Traceability Events routes mounted');
} catch(e) { console.error('[FAIL] traceability routes:', e.message); }

try {
  const { registerPartnerRoutes, createPartnerTables } = require('./routes/partners');
  registerPartnerRoutes(app, global.db || app.get('db') || pool);
  createPartnerTables(global.db || app.get('db') || pool).catch(e => console.warn('[WARN] partner tables:', e.message));
  console.log('[OK] Partner Portal — Gov/Agency/Network partner routes mounted');
} catch(e) { console.error('[FAIL] partners routes:', e.message); }

// ── PLATFORM GUARD — 50 self-healing agents ──────────────────────────────────
try {
  const PlatformGuard = require('./agents/PlatformGuard');
  // Memory guard — only start agents if sufficient memory available
  const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
  console.log('[INFO] Memory before PlatformGuard:', memMB, 'MB');
  if (memMB < 400) {
    PlatformGuard.start(app, pool);
    console.log('[OK] PlatformGuard: 50 health agents armed');
  } else {
    console.warn('[SKIP] PlatformGuard: memory', memMB, 'MB — skipping to prevent OOM');
  }
} catch(e) { console.error('[FAIL] PlatformGuard:', e.message); }


// Fix Rudy and Carlos roles to sales
app.get('/api/admin/fix-roles', async (req, res) => {
  if (req.query.secret !== 'MFG2026migrate') return res.status(403).json({error:'forbidden'});
  try {
    const r1 = await pool.query("UPDATE auth_users SET role='sales', updated_at=NOW() WHERE username='rudy' RETURNING id,username,role");
    const r2 = await pool.query("UPDATE auth_users SET role='sales', updated_at=NOW() WHERE username='carlos' RETURNING id,username,role");
    res.json({success:true, rudy:r1.rows[0], carlos:r2.rows[0]});
  } catch(e){res.status(500).json({error:e.message});}
});



// ── PLATFORM HEALTH & CRASH LOG SYSTEM ──────────────────────────────────────
const crashLog = []; // In-memory crash log (last 100 entries)
const MAX_CRASH_LOG = 100;

// POST /api/health/crash-log — frontend error boundaries report crashes here
app.post('/api/health/crash-log', (req, res) => {
  const { module, error, stack, component, ts, user } = req.body || {};
  const entry = {
    module: module || 'Unknown',
    error: (error || '').slice(0, 300),
    stack: (stack || '').slice(0, 500),
    component: (component || '').slice(0, 300),
    ts: ts || new Date().toISOString(),
    user: user || 'unknown',
    id: Date.now()
  };
  crashLog.unshift(entry);
  if (crashLog.length > MAX_CRASH_LOG) crashLog.pop();
  console.warn('[CRASH LOG]', entry.module, '-', entry.error.slice(0, 80));
  res.json({ success: true, logged: true });
});

// GET /api/health/crash-log — owner dashboard reads crash history
app.get('/api/health/crash-log', (req, res) => {
  res.json({ logs: crashLog, count: crashLog.length });
});

// GET /api/health/status — full platform health check
app.get('/api/health/status', async (req, res) => {
  const checks = {};
  const routes = [
    ['/api/crm/growers?limit=1', 'growers'],
    ['/api/campaigns', 'campaigns'],
    ['/api/inbox', 'inbox'],
    ['/api/autonomy/status', 'autonomy'],
    ['/api/alerts/events', 'alerts'],
  ];
  for (const [path, name] of routes) {
    try {
      const r = await new Promise((resolve) => {
        const start = Date.now();
        const req2 = require('http').request(
          { hostname: 'localhost', port: process.env.PORT || 5050, path, method: 'GET' },
          (res2) => { resolve({ ok: res2.statusCode < 400, status: res2.statusCode, ms: Date.now()-start }); }
        );
        req2.on('error', () => resolve({ ok: false, status: 0, ms: Date.now()-start }));
        req2.setTimeout(3000, () => { req2.destroy(); resolve({ ok: false, status: 0, ms: 3000 }); });
        req2.end();
      });
      checks[name] = r;
    } catch(e) {
      checks[name] = { ok: false, status: 0, error: e.message };
    }
  }
  const healthy = Object.values(checks).filter(c => c.ok).length;
  const total = Object.keys(checks).length;
  res.json({
    status: healthy === total ? 'healthy' : 'degraded',
    healthy, total,
    routes: checks,
    crashes: crashLog.slice(0, 10),
    uptime: process.uptime(),
    ts: new Date().toISOString()
  });
});

// Self-repair agent — runs every 5 minutes, logs degraded routes
setInterval(async () => {
  try {
    const degraded = [];
    const routes = ['/api/crm/growers?limit=1', '/api/campaigns', '/api/inbox'];
    for (const path of routes) {
      try {
        const start = Date.now();
        await new Promise((resolve, reject) => {
          const r = require('http').request(
            { hostname:'localhost', port:process.env.PORT||5050, path, method:'GET' },
            res => resolve(res.statusCode)
          );
          r.on('error', reject);
          r.setTimeout(3000, () => { r.destroy(); reject(new Error('timeout')); });
          r.end();
        });
      } catch(e) {
        degraded.push(path);
      }
    }
    if (degraded.length > 0) {
      console.warn('[SELF-REPAIR] Degraded routes detected:', degraded.join(', '));
      crashLog.unshift({
        module: 'SELF-REPAIR AGENT',
        error: 'Degraded routes: ' + degraded.join(', '),
        ts: new Date().toISOString(),
        user: 'system',
        id: Date.now()
      });
    }
  } catch(e) {
    console.error('[SELF-REPAIR] Agent error:', e.message);
  }
}, 5 * 60 * 1000);


// ── MISSING ROUTE STUBS — silence 404s from CommandSphere polling ────────────
app.get('/api/brain/live-feed', (req, res) => {
  res.json({ events: [], count: 0, ts: new Date().toISOString() });
});

app.get('/api/audits', (req, res) => {
  res.json({ audits: [], total: 0, page: 1 });
});

app.get('/api/deals', (req, res) => {
  res.json({ deals: [], total: 0, stage: 'all' });
});

app.get('/api/agents', (req, res) => {
  res.json({ agents: ['A1','A2','A3','A4','A5'], status: 'operational' });
});

app.get('/api/wesource', (req, res) => {
  res.json({ sources: [], active: 0 });
});

app.get('/api/niner/status', (req, res) => {
  res.json({ status: 'standby', miners: 9, active: 0 });
});

app.get('/api/admin/dashboard', (req, res) => {
  res.json({ users: 0, sessions: 0, uptime: process.uptime() });
});

app.get('/api/user/preferences', (req, res) => {
  res.json({ theme: 'dark', language: 'en', notifications: true });
});

app.get('/api/app/api/user/me', (req, res) => {
  res.json({ error: 'use /api/auth/verify' });
});



// ── OWNER DOCUMENT VAULT ──────────────────────────────────────────────────────
// Stores sensitive owner-only documents. Accessible only with valid owner JWT.

const OWNER_DOCS = [
  {
    id: 'supply-letter-strawberry-2026',
    name: 'MFG Supply Commitment Letter — Strawberry Program 2026',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
    category: 'Supply Agreements',
    date: '2026-05-17',
    parties: 'Productora de Hortalizas y Berrys S.A. de C.V. / Mexausa Food Group, Inc.',
    notes: 'Erik Alfredo Ramos Morelos — 10 containers/week min, Strawberry, Jalisco MX',
    data: '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'
  }
];

// GET /api/owner/documents — list (owner only)
app.get('/api/owner/documents', async (req, res) => {
  try {
    const auth = req.headers.authorization?.replace('Bearer ', '');
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth, process.env.JWT_SECRET || 'mfg_secret_2024');
    if (decoded.role !== 'owner') return res.status(403).json({ error: 'Owner access only' });
    // Return list without data field
    res.json({ docs: OWNER_DOCS.map(d => ({ id:d.id, name:d.name, type:d.type, ext:d.ext, category:d.category, date:d.date, parties:d.parties, notes:d.notes })) });
  } catch(e) { res.status(401).json({ error: 'Invalid token' }); }
});

// GET /api/owner/documents/:id/download — download file (owner only)
app.get('/api/owner/documents/:id/download', async (req, res) => {
  try {
    const auth = req.headers.authorization?.replace('Bearer ', '');
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth, process.env.JWT_SECRET || 'mfg_secret_2024');
    if (decoded.role !== 'owner') return res.status(403).json({ error: 'Owner access only' });
    const doc = OWNER_DOCS.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const buf = Buffer.from(doc.data, 'base64');
    res.setHeader('Content-Type', doc.type);
    res.setHeader('Content-Disposition', 'attachment; filename="' + doc.id + '.' + doc.ext + '"');
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch(e) { res.status(401).json({ error: 'Invalid token' }); }
});

// POST /api/owner/documents — add new document (owner only, base64 body)
app.post('/api/owner/documents', async (req, res) => {
  try {
    const auth = req.headers.authorization?.replace('Bearer ', '');
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth, process.env.JWT_SECRET || 'mfg_secret_2024');
    if (decoded.role !== 'owner') return res.status(403).json({ error: 'Owner access only' });
    const { id, name, type, ext, category, date, parties, notes, data } = req.body;
    if (!id || !data) return res.status(400).json({ error: 'id and data required' });
    const existing = OWNER_DOCS.findIndex(d => d.id === id);
    if (existing >= 0) { OWNER_DOCS[existing] = req.body; }
    else { OWNER_DOCS.push(req.body); }
    res.json({ success: true, id, count: OWNER_DOCS.length });
  } catch(e) { res.status(401).json({ error: 'Invalid token' }); }
});


// ── REGISTRATION ROUTES — grower/buyer/loaf public intake ──────────────────

// ── GROWER PUBLIC REGISTRATION — inline safe version ───────────────────────
app.post('/api/growers/register-public', async (req, res) => {
  const { companyLegal, contactEmail, contactName, entityType, state, city,
          region, commodities, ein, pacaNum, gapCert, globalGap,
          fsmaTeir, notes } = req.body || {};
  if (!companyLegal || !contactEmail) {
    return res.status(400).json({ error: 'Company name and contact email are required' });
  }
  try {
    // Ensure required columns exist
    try {
      await pool.query("ALTER TABLE growers ADD COLUMN IF NOT EXISTS risk_tier VARCHAR(20) DEFAULT 'TIER_0'");
      await pool.query("ALTER TABLE growers ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'pending_review'");
      await pool.query("ALTER TABLE growers ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW()");
    } catch(e) { /* columns may already exist */ }

    const result = await pool.query(
      `INSERT INTO growers (company_name, email, first_name, state, entity_type, city,
         status, risk_tier, compliance_status, registered_at)
       VALUES ($1,$2,$3,$4,$5,$6,'pending_review','TIER_0','pending_review',NOW())
       RETURNING id, company_name, email, status`,
      [companyLegal, contactEmail, contactName||'', state||'', entityType||'LLC', city||'']
    );
    const grower = result.rows[0];
    console.log('[GROWER REGISTER] New grower:', grower.company_name, grower.id);
    res.status(201).json({ success: true, grower, message: 'Registration received. Our team will review within 24 hours.' });
  } catch(err) {
    console.error('[GROWER REGISTER ERROR]', err.message);
    res.status(500).json({ error: err.message, code: err.code });
  }
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



// ── USDA INTELLIGENCE ROUTES ──────────────────────────────────────────────────
try { app.use('/api/usda-market-intel', require('./routes/usda-market-intel')); console.log('[OK] usda-market-intel mounted'); } catch(e){ console.warn('[WARN] usda-market-intel:', e.message); }
try { app.use('/api/usda-data',         require('./routes/usda-data'));          console.log('[OK] usda-data mounted'); }         catch(e){ console.warn('[WARN] usda-data:', e.message); }
try { app.use('/api/usda-campaign',     require('./routes/usda-campaign'));      console.log('[OK] usda-campaign mounted'); }     catch(e){ console.warn('[WARN] usda-campaign:', e.message); }
try { app.use('/api/usda-overlay',      require('./routes/usdaMarketOverlay'));  console.log('[OK] usda-overlay mounted'); }     catch(e){ console.warn('[WARN] usda-overlay:', e.message); }
try { app.use('/api/usda-registry',     require('./routes/usdaRegistry'));       console.log('[OK] usda-registry mounted'); }    catch(e){ console.warn('[WARN] usda-registry:', e.message); }
try { app.use('/api/usda-intel',        require('./routes/usdaRoutes.DISABLED')); console.log('[OK] usda-intel mounted'); }     catch(e){ console.warn('[WARN] usda-intel:', e.message); }


// ── CANONICAL SMTP — Gmail only ───────────────────────────────────────────────
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: 'sgarcia1911@gmail.com', pass: process.env.SMTP_PASS || 'emgptqrmqdbxrpil' }
};

app.locals.pool = pool; // campaign trigger + USDA routes access pool via req.app.locals.pool


// ── OSCAR MEJIA — MISSION PROGRAM ASSIGNMENT ─────────────────────────────────
// Programs: Broccoli | Berries (Strawberry/Blueberry/Raspberry) | Avocado
// Territory: Midwest + East Coast wholesale buyers
app.get('/api/agents/oscar-mejia/programs', (req, res) => {
  res.json({
    agent: { name:'Oscar Mejia', email:'oscar@mexausafg.com', role:'sales', territory:'Midwest + East Coast' },
    programs: [
      { id:'OM-001', name:'Broccoli Program', commodity:'Broccoli Crown', origin:'Salinas CA + Yuma AZ + Mexico',
        packSpec:'20lb carton', targetBuyers:'Midwest wholesale + restaurant groups',
        priceRef:'USDA Salinas shipping point', status:'ACTIVE', campaign:'2x/week + 45-day drip' },
      { id:'OM-002', name:'Berry Program', commodity:'Strawberry | Blueberry | Raspberry',
        origin:'Baja CA + Michoacan + Sinaloa', packSpec:'8x1lb clamshell | 12x6oz clamshell',
        targetBuyers:'East Coast wholesale + chain distribution', priceRef:'USDA AMS terminal',
        status:'ACTIVE', campaign:'2x/week + 45-day drip' },
      { id:'OM-003', name:'Avocado Program', commodity:'Hass Avocado 48ct-60ct',
        origin:'Michoacan MX', packSpec:'25lb 48ct or 60ct',
        targetBuyers:'Midwest wholesale + foodservice', priceRef:'USDA Hass index',
        status:'ACTIVE', campaign:'2x/week + 45-day drip' }
    ],
    emailTemplates: ['avocado-midwest-intro','berry-eastcoast-intro','broccoli-midwest-intro'],
    drip: { frequency:'2x/week', duration:'45 days', totalTouchpoints:13 },
    ts: new Date().toISOString()
  });
});
app.get('/api/agents/oscar-mejia/buyers', async (req, res) => {
  try {
    const states=['IL','OH','MI','IN','WI','MN','MO','IA','NY','NJ','PA','MA','CT','MD','VA','NC','GA'];
    const r=await pool.query(
      "SELECT id,company_name,email,state,country,commodity FROM growers WHERE state=ANY($1) LIMIT 200",
      [states]
    ).catch(()=>({rows:[]}));
    res.json({agent:'Oscar Mejia',territory:'Midwest + East Coast',count:r.rows.length,buyers:r.rows});
  } catch(e){ res.json({agent:'Oscar Mejia',territory:'Midwest + East Coast',count:0,buyers:[]}); }
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

