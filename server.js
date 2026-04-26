// ===============================================================
// AUDITDNA BACKEND SERVER v4.1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â SECURED
// ===============================================================
// CHANGES FROM v4.0:
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ EBEM Email Marketing Command Center routes added
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ /api/scraper         ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â internal DB scraper (requireAdmin)
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ /api/email/send-campaign  ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â GoDaddy SMTP bulk send w/ batching
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ /api/email/analytics      ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â open/click/sent stats from DB
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ /api/claude/generate-email ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â AI Niner Miner content generation
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ emailScraper.js added to SKIP_AUTO (explicit mount)
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ multer memory storage for attachment uploads
// CHANGES FROM v3.3 (v4.0):
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ CORS restricted to known origins (not '*')
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ /metrics, /api/routes ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ owner-only (JWT required)
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ /health sanitized (no AI model name, no internal details)
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Brain endpoints require auth (except /api/brain/status)
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ express.json limit reduced to 12mb (was 50mb)
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Helmet CSP enabled with sensible defaults
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Rate limiter on credential recovery
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Auth middleware loaded globally
//   ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ JWT_SECRET enforced (fatal in production if default)
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

// ===============================================================
// APP INIT
// ===============================================================

const app = express();

// === CORS preflight ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â MUST be first, before helmet/other middleware ===
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

if (typeof brain?.setAI   === 'function') brain.setAI(aiHelper);
if (typeof brain?.setPool === 'function') brain.setPool(pool);

// ===============================================================
// CORE MIDDLEWARE ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â SECURED
// ===============================================================

// Helmet with CSP ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no longer disabled
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


// RAW CORS PREFLIGHT ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â must be first, before all middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [
    'https://enjoybaja.com',
    'https://www.enjoybaja.com',
    'https://mexausafg.com',
    'https://www.mexausafg.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
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

// CORS ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â restricted to known origins
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
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

// Body limits ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 12MB for property photo uploads, 1MB for everything else
app.use('/api/properties', express.json({ limit: '12mb' }));
app.use('/api/properties', require('./routes/properties'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===============================================================
// REQUEST METRICS (internal only ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â not exposed publicly)
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
// AUTH MIDDLEWARE ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â load shared JWT verifier
// ===============================================================

const { requireOwner, requireAdmin, requireAuth, attachUser } = require('./middleware/auth-middleware');

// ===============================================================
// EXPLICIT ROUTE MOUNTS
// ===============================================================

const explicitMounts = [];

// -- auth --> /api/auth
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);

// Ã¢â€â‚¬Ã¢â€â‚¬ AUTONOMOUS INVENTORY NOTIFICATION PIPELINE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
try {
  const inventoryRoutes = require('./routes/inventory');
  app.use('/api/inventory', inventoryRoutes);
  console.log('[OK] inventory.routes: mounted at /api/inventory');
} catch (e) {
  console.warn('[WARN] inventory route failed to mount:', e.message);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ UNIFIED CRM DEAL FLOOR Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// -- audits --> /api/audits
try {
  app.use('/api/audits', require('./routes/audits'));
  explicitMounts.push({ file: 'audits.js', path: '/api/audits' });
} catch(e) { console.warn('[WARN] audits not found:', e.message); }

// -- analytics --> /api/analytics
try {
  app.use('/api/analytics',      require('./routes/analytics'));
  app.use('/api/mortgage-leads', require('./routes/mortgage-leads'));
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

// -- CRM --> /api/crm  (growers + buyers + shippers ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â frontend expects this exact path)
try {
  const crmRoutes = require('./routes/crm.routes');
  app.use('/api/crm', crmRoutes);
  try { app.use('/api/user', require('./routes/user')); console.log('[OK] user.js: mounted at /api/user'); } catch(e) { console.warn('[WARN] user.js mount failed:', e.message); }
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
  try { app.use('/api/brain', require('./routes/brain-stream')); console.log('[OK] brain-stream mounted at /api/brain'); } catch(e) { console.error('[FAIL] brain-stream mount:', e.message); }
  try { app.use('/api/grower', require('./routes/grower-pipeline')); console.log('[OK] grower-pipeline.js: mounted at /api/grower (Sprint C)'); } catch(e) { console.error('[FAIL] grower-pipeline mount:', e.message); }
  console.log('[OK] /api/financing mounted');
} catch (err) {
  console.error('[WARN] /api/financing mount failed:', err.message);
}
  explicitMounts.push({ file: 'crm.routes.js', path: '/api/crm' });
  console.log('[OK] crm.routes: mounted at /api/crm');
} catch(e) { console.warn('[WARN] crm.routes not found:', e.message); }

// ===============================================================
// CREDENTIAL RECOVERY ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â /api/auth/recover-credentials
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
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: `"EnjoyBaja Platform" <${process.env.SMTP_USER}>`,
        to: 'sg01@eb.com',
        subject: `[EnjoyBaja] Credential Recovery: ${lookupEmail}`,
        text: `CREDENTIAL RECOVERY REQUEST\n\nEmail: ${lookupEmail}\nFound: ${found ? 'YES ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ' + (found.name || found.email) : 'NOT IN DB'}\nSource: ${found?.source || 'N/A'}\nTime: ${requestedAt || new Date().toISOString()}\nIP: ${req.ip}\n\n-- EnjoyBaja Platform`,
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
// EBEM ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â EMAIL MARKETING COMMAND CENTER
// /api/email/send-campaign  ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â bulk send via GoDaddy SMTP
// /api/email/analytics       ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â open/click/sent stats from DB
// /api/claude/generate-email ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â AI Niner Miner content generation
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
    const nodemailer = require('nodemailer');
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Check suppression list (unsubscribes + bounces) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    let suppressedEmails = new Set();
    try {
      const [unsub, bounce] = await Promise.all([
        pool.query('SELECT email FROM email_unsubscribes'),
        pool.query('SELECT email FROM email_bounces WHERE bounce_type = $1', ['hard']),
      ]);
      unsub.rows.forEach(r  => suppressedEmails.add(r.email.toLowerCase()));
      bounce.rows.forEach(r => suppressedEmails.add(r.email.toLowerCase()));
    } catch { /* tables may not exist yet ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â continue */ }

    const filteredRecipients = recipients.filter(r => r.email && !suppressedEmails.has(r.email.toLowerCase()));
    const suppressedCount    = recipients.length - filteredRecipients.length;
    if (suppressedCount > 0) {
      console.log(`[EBEM] Suppressed ${suppressedCount} unsubscribed/bounced addresses`);
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Attachments from multer ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    const attachments = (req.files || []).map(f => ({
      filename:    f.originalname,
      content:     f.buffer,
      contentType: f.mimetype,
    }));

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ SMTP transporter ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtpout.secureserver.net',
      port:   parseInt(process.env.SMTP_PORT || '465'),
      secure: parseInt(process.env.SMTP_PORT || '465') === 465,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    });

    const fromAddress  = process.env.EMAIL_FROM      || process.env.SMTP_USER || 'saul@mexausafg.com';
    const fromName     = process.env.EMAIL_FROM_NAME || 'Saul Garcia | EnjoyBaja';
    const BASE_URL     = process.env.REACT_APP_API_URL || process.env.BASE_URL || 'https://auditdna-realestate-production.up.railway.app';
    const BATCH_SIZE   = parseInt(process.env.EMAIL_BATCH_SIZE  || '10');
    const BATCH_DELAY  = parseInt(process.env.EMAIL_BATCH_DELAY || '1200');

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ HTML email builder v2.0 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Bilingual styled templates ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
          if (lines[0].startsWith('ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢') || lines[0].startsWith('-')) {
            const items = lines.map(l => `<li style="margin-bottom:6px;color:#1e293b;">${l.replace(/^[ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢\-]\s*/, '')}</li>`).join('');
            return `<ul style="margin:0 0 16px 0;padding-left:20px;line-height:1.7;">${items}</ul>`;
          }
          const html = lines.join('<br>');
          return `<p style="margin:0 0 16px 0;line-height:1.8;color:#1e293b;font-size:14px;">${html}</p>`;
        })
        .join('');

      const htmlBody = buildBodyHtml(wrappedBody);

      // Tracking pixel
      const pixel = `<img src="${BASE_URL}/api/track/open?tid=${trackingId}" width="1" height="1" style="display:none" alt="" />`;

      // Unsubscribe URL ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â CAN-SPAM + LFPDPPP compliant
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
        loi_pipeline: { accent: '#f59e0b', badge: 'LOI PIPELINE / CARTA DE INTENCIÃƒÆ’Ã¢â‚¬Å“N', badgeBg: '#451a03' },
        drip:         { accent: '#cba658', badge: 'CAMPAIGN / CAMPAÃƒÆ’Ã¢â‚¬ËœA',               badgeBg: '#1a1200' },
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

  <!-- ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â HEADER ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â -->
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

  <!-- ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â SUBJECT BAR ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â -->
  <tr>
    <td style="background:#1e293b;padding:16px 32px;border-left:4px solid ${style.accent};">
      <div style="font-size:16px;color:#f1f5f9;font-weight:600;line-height:1.4;">${personalSubject}</div>
    </td>
  </tr>

  <!-- ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â BODY ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â -->
  <tr>
    <td style="background:#ffffff;padding:32px 32px 24px;">
      <div style="font-size:14px;color:#1e293b;line-height:1.8;font-family:'Helvetica Neue',Arial,sans-serif;">
        ${htmlBody}
      </div>
    </td>
  </tr>

  <!-- ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â DIVIDER ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â -->
  <tr>
    <td style="background:#ffffff;padding:0 32px;">
      <div style="height:2px;background:linear-gradient(90deg,${style.accent},transparent);"></div>
    </td>
  </tr>

  <!-- ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â CONTACT CARD ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â -->
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

  <!-- ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â LEGAL DISCLAIMER ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â -->
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

  <!-- ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â FOOTER ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â -->
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Send loop ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
    } catch { /* tables not yet created ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â return zeros */ }

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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Init email_tracking table ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

// GET /api/track/open?tid=xxx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 1x1 transparent pixel, records open
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

// GET /api/track/click?tid=xxx&url=xxx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â redirect + record click
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

// GET /api/unsubscribe?email=xxx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â one-click unsubscribe (CAN-SPAM + LFPDPPP)
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

// POST /api/unsubscribe ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â one-click unsubscribe header support (RFC 8058)
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
// AI Niner Miner ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â content generation for EBEM compose + AI Brain panel
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
      loi:        'You are an LOI (Letter of Intent) drafter for EnjoyBaja cross-border real estate transactions. Write formal, professional Letters of Intent for property purchases in Baja California. Include: buyer/seller info placeholders, property description, offer price, financing type (cash/USA mortgage/developer terms), fideicomiso note for restricted zones, LOIÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢LOCÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Term Sheet sequence, escrow-first workflow, lender identity confidentiality clause. Signatory: Saul Garcia | CM Products International | NMLS #337526.',
      compliance: 'You are a compliance copywriter for CM Products International (NMLS #337526). Write RESPA-compliant, CFPB-compliant, and Mexican LFPDPPP-compliant email content. For US mortgage content: include required disclosures, equal housing language, NMLS number. For Mexican content: include privacy notice references and proper Spanish-language disclosures. Never make specific rate promises. Always include: "This is not a commitment to lend."',
    };

    const systemPrompt = minerProfiles[miner] || 'You are an expert real estate and mortgage email copywriter for EnjoyBaja (EnjoyBaja.com) and CM Products International (NMLS #337526), operating in Baja California, Mexico and the United States. Write bilingual EN/ES when appropriate. Professional, luxury tone.';

    const contextNote = context.recipientCount
      ? `\n\nCampaign context: ${context.recipientCount} recipients, channels: ${(context.channels || []).join(', ')}.`
      : '';

    const fullPrompt = `${prompt}${contextNote}\n\nAlways include contact info at the end: Saul Garcia | EnjoyBaja | NMLS #337526 | saul@mexausafg.com | US: +1-831-251-3116 | MX: +52-646-340-2686`;

    const text = await aiHelper.ask(fullPrompt, systemPrompt);

    // Subject Sniper ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â return all 3 options as JSON
    if (miner === 'subject') {
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        return res.json({ success: true, subjects: parsed.subjects, subject: parsed.subjects?.[0], content: text });
      } catch { /* fall through */ }
    }

    // SMS ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â trim to 160
    if (miner === 'sms') {
      return res.json({ success: true, content: text.substring(0, 160) });
    }

    // SI Letter / LOI / Compliance / Bilingual ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â return full letter as content
    if (['si_letter', 'loi', 'compliance', 'bilingual'].includes(miner)) {
      const subjectMatch = text.match(/^(?:Subject|RE|SUBJECT):\s*(.+)/im);
      const subject = subjectMatch ? subjectMatch[1].trim() : null;
      return res.json({ success: true, subject, content: text, text, isLetter: true });
    }

    // Standard ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â split subject from body
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

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// POST /api/ai/generate  Ã¢â‚¬â€  Anthropic-SDK-compatible passthrough
// Accepts native Anthropic messages format from EmailMarketing.jsx and
// SaulIntelCRM.jsx AI Subject/Body/Full Email generators.
// Body: { model, max_tokens, messages: [{role, content}], system? }
// Returns: native Anthropic response { content: [{type:'text', text:'...'}], ... }
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
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
// BRAIN API ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â status is public (moved above Ownermetrics), everything else requires auth
// ===============================================================

// Auth required ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â event ingestion
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

// Auth required ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â logging
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

// Owner only ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â workflow trigger
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

// Owner only ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â full brain status with metrics
app.get('/api/brain/full-status', requireOwner, (req, res) => {
  const status = typeof brain?.getStatus === 'function'
    ? brain.getStatus()
    : { mode: 'direct-call', miners: 81, status: 'operational' };
  res.json({ success: true, brain: status });
});

explicitMounts.push({ file: 'Brain.js (inline)', path: '/api/brain/*' });

// ===============================================================
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
  'crm.routes.js',     // explicitly mounted at /api/crm (frontend expects /api/crm/*)
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
// INTERNAL MESSENGER ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â soft auth on presence/channels (stops 401 flood)
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
// HEALTH ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sanitized (no internal details)
// ===============================================================

app.get('/health', (req, res) => {
  res.json({
    status:  'healthy',
    version: 'v4.1',
    uptime:  Math.round(process.uptime()),
  });
});

// ===============================================================
// METRICS & ROUTES ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â OWNER ONLY (JWT required)
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

const server = app.listen(PORT, () => {
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
});

// ===============================================================
// GRACEFUL SHUTDOWN
// ===============================================================

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(() => {
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
// SCHEDULER ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â cron jobs for cooling-off, aging alerts, daily digest
// ===============================================================
try {
  require('./scheduler');
  console.log('[OK] SCHEDULER: 5 cron jobs registered');
} catch (e) {
  console.warn('[WARN] Scheduler not loaded:', e.message);
}

module.exports = app; global.db = pool;
console.log('[DB] global.db assigned -> pool accessible to all routes');
module.exports.pool = pool; module.exports.app = app;

// COMMODITY SEARCH ENGINE
try { const gm = require('./routes/gmail'); app.use('/api/gmail', gm); console.log('[OK] gmail routes loaded'); } catch(e) { console.error('[FAIL] gmail routes:', e.message); }
try { const be = require('./routes/brainevents'); app.use('/api/brain/events', be); console.log('[OK] brain/events routes loaded'); } catch(e) { console.error('[FAIL] brain/events:', e.message); }

try { const cs = require('./routes/commodity-search'); app.use('/api/commodity', cs); console.log('[OK] commodity-search mounted at /api/commodity'); } catch(e) { console.warn('[WARN] commodity:', e.message); }

// AuditDNA Autonomy Phase 2A boot
try {
  const autonomy = require('./autonomy');
  const { Pool } = require('pg');
  const _autonomyPool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL || 'postgres://postgres:auditdna2026@localhost:5432/auditdna' });
  autonomy.boot(_autonomyPool);
  console.log('[OK] Autonomy Phase 2A booted - 15 agents loaded');
} catch (e) { console.warn('[WARN] Autonomy boot failed:', e.message); }
app.use('/api/auth', require('./routes/pin-verify'));
