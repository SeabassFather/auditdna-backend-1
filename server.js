// ════════════════════════════════════════════════════════════════════════════
// AUDITDNA BACKEND SERVER v3.5 — ENTERPRISE + AI LEARNING (STABLE)
// Fixes: pool export conflict, LIMIT 50000, session fault isolation,
//        JWT startup validation, failed route reporting, request timeout
// Added: /api/onboarding — Phase 1 Lead Capture + Phase 2 KYC
// Save to: C:\AuditDNA\backend\server.js
// ════════════════════════════════════════════════════════════════════════════

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const morgan     = require('morgan');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
require('dotenv').config();

const session   = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool }  = require('pg');

// ════════════════════════════════════════════════════════════════════════════
// DATABASE POOL
// ════════════════════════════════════════════════════════════════════════════

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'auditdna',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max:      40,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => console.log('[OK] POSTGRESQL CONNECTED!'));
pool.on('error',   err  => console.error('[XX] PostgreSQL pool error:', err.message));

// ── Shared pool — use app.locals so it survives module.exports = app ────────
// FIX: old pattern (module.exports.pool then module.exports = app) silently
//      destroyed the pool export. app.locals survives the reassignment.
// Any route can reach it via:  req.app.locals.pool  OR  app.locals.pool
// ────────────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// STARTUP VALIDATION
// ════════════════════════════════════════════════════════════════════════════

const REQUIRED_ENV = ['DB_PASSWORD'];
const WARN_ENV     = ['JWT_SECRET', 'SESSION_SECRET', 'SMTP_PASS'];

REQUIRED_ENV.forEach(k => {
  if (!process.env[k]) {
    console.error(`[FATAL] Missing required env var: ${k} — server will not start correctly`);
  }
});

WARN_ENV.forEach(k => {
  if (!process.env[k]) {
    console.warn(`[WARN] Missing env var: ${k} — some features may be disabled`);
  }
});

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET not set — auth tokens will be insecure in production');
}

// ════════════════════════════════════════════════════════════════════════════
// APP INIT
// ════════════════════════════════════════════════════════════════════════════

const app      = express();
const PORT     = process.env.PORT     || 5050;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Attach shared pool to app.locals — accessible via req.app.locals.pool
app.locals.pool = pool;

// ── BRAIN DATA MESH — wires all APIs into Brain, fires schedules ─────────────
// Adds: /api/ag-intel/snapshot | /api/brain/live-feed | /api/brain/price-predictions
//       /api/brain/weather-alerts | /api/brain/grower-scores | /api/brain/status
try {
  require('./brain-data-mesh')(app, pool);
  console.log('[OK] Brain Data Mesh installed — all API feeds live');
} catch (e) {
  console.warn('[WARN] Brain Data Mesh failed to load:', e.message);
}

// ════════════════════════════════════════════════════════════════════════════
// CORE MIDDLEWARE
// ════════════════════════════════════════════════════════════════════════════

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// CORS — locked to known origins in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:5050', 'https://mexausafg.com', 'https://auditdna.netlify.app'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile, Postman) in dev
    if (!origin || NODE_ENV === 'development') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
// ── Stripe webhook — raw body MUST come before express.json() ────────────────
// This allows the webhook route to verify Stripe signatures correctly.
app.use('/api/onboarding/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Request timeout (60s) — prevents hung requests piling up ────────────────
app.use((req, res, next) => {
  res.setTimeout(60000, () => {
    console.warn(`[TIMEOUT] ${req.method} ${req.path} timed out`);
    if (!res.headersSent) res.status(503).json({ error: 'Request timeout' });
  });
  next();
});

// ════════════════════════════════════════════════════════════════════════════
// SESSION SETUP (POSTGRES BACKED) — fault-isolated
// ════════════════════════════════════════════════════════════════════════════

try {
  app.use(
    session({
      store: new pgSession({
        pool,
        tableName:       'user_sessions',
        createTableIfMissing: true,
      }),
      name:             'auditdna.sid',
      secret:           process.env.SESSION_SECRET || 'auditdna-dev-secret',
      resave:           false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure:   NODE_ENV === 'production',   // true in prod (HTTPS only)
        sameSite: 'lax',
        maxAge:   1000 * 60 * 60 * 8,          // 8 hours
      },
    })
  );
  console.log('[OK] Sessions initialized (PostgreSQL)');
} catch (e) {
  console.error('[ERROR] Session store failed — falling back to memory sessions:', e.message);
  app.use(session({
    name:   'auditdna.sid',
    secret: process.env.SESSION_SECRET || 'auditdna-dev-secret-fallback',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 * 8 },
  }));
  console.warn('[WARN] Using in-memory sessions — will not survive restarts');
}

// ════════════════════════════════════════════════════════════════════════════
// REQUEST METRICS
// ════════════════════════════════════════════════════════════════════════════

const requestStats = { total: 0, success: 0, errors: 0, startTime: Date.now() };

app.use((req, res, next) => {
  requestStats.total++;
  res.on('finish', () => {
    res.statusCode < 400 ? requestStats.success++ : requestStats.errors++;
  });
  next();
});

// ════════════════════════════════════════════════════════════════════════════
// AUTO ROUTE LOADER — fault isolated per route
// ════════════════════════════════════════════════════════════════════════════

const routesDir    = path.join(__dirname, 'routes');
const loadedRoutes = [];
const failedRoutes = [];

function loadRoutes(dir, base = '/api') {
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) { loadRoutes(full, `${base}/${file}`); continue; }
    if (!file.endsWith('.js')) continue;

    const routePath = `${base}/${file.replace('.js', '')}`;
    try {
      app.use(routePath, require(full));
      loadedRoutes.push(routePath);
      console.log(`  [ROUTE] ${routePath}`);
    } catch (e) {
      failedRoutes.push({ path: routePath, file: full, error: e.message });
      console.error(`  [FAIL]  ${routePath} — ${e.message}`);
    }
  }
}

console.log('\n[>>] Discovering routes...\n');
loadRoutes(routesDir);

// ── Auth route (kept separate from auto-loader for explicit control) ─────────
try {
  app.use('/api/auth', require('./src/Auth'));
  loadedRoutes.push('/api/auth');
  console.log('  [ROUTE] /api/auth');
} catch (e) {
  failedRoutes.push({ path: '/api/auth', error: e.message });
  console.error('  [FAIL]  /api/auth —', e.message);
}

// ── Tenant Auth — login + token verify for provisioned tenants ────────────────
try {
  app.use('/api/auth', require('./routes/tenant-auth'));
  loadedRoutes.push('/api/auth/tenant-login');
  console.log('  [ROUTE] /api/auth/tenant-login + /api/auth/tenant-verify');
} catch (e) {
  failedRoutes.push({ path: '/api/auth/tenant-login', error: e.message });
  console.error('  [FAIL]  /api/auth/tenant-login —', e.message);
}

// ── Contacts proxy ────────────────────────────────────────────────────────────
try {
  app.use('/api/contacts-proxy', require('./Contacts-proxy'));
  loadedRoutes.push('/api/contacts-proxy');
  console.log('  [ROUTE] /api/contacts-proxy');
} catch (e) {
  console.warn('  [SKIP]  /api/contacts-proxy —', e.message);
}

// ── Tenant Onboarding — Phase 1 Lead Capture + Phase 2 KYC ──────────────────
// Handles: /api/onboarding/lead | /otp/send | /otp/verify
//          /kyc/init | /kyc/step1–5 | /kyc/complete | /status/:lead_id
// NOTE: auto-loader also picks this up from routes/ — explicit mount here
//       overrides if routes/onboarding.js exists (first-mount wins)
try {
  app.use('/api/onboarding', require('./routes/onboarding'));
  loadedRoutes.push('/api/onboarding');
  console.log('  [ROUTE] /api/onboarding');
} catch (e) {
  failedRoutes.push({ path: '/api/onboarding', error: e.message });
  console.error('  [FAIL]  /api/onboarding —', e.message);
}

// ════════════════════════════════════════════════════════════════════════════
// CRM ENDPOINTS — paginated (was LIMIT 50000 — CRASH RISK)
// ════════════════════════════════════════════════════════════════════════════

const paginate = (req) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1'));
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '100')));
  return { limit, offset: (page - 1) * limit, page };
};

app.get('/crm/growers', async (req, res) => {
  try {
    const { limit, offset, page } = paginate(req);
    const [data, count] = await Promise.all([
      pool.query('SELECT * FROM growers ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM growers'),
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/crm/buyers', async (req, res) => {
  try {
    const { limit, offset, page } = paginate(req);
    const [data, count] = await Promise.all([
      pool.query('SELECT * FROM buyers ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM buyers'),
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/crm/shippers', async (req, res) => {
  try {
    const { limit, offset, page } = paginate(req);
    const [data, count] = await Promise.all([
      pool.query('SELECT * FROM shipper_contacts ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM shipper_contacts'),
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FULL DUMP ENDPOINTS — no pagination, returns ALL records like pgAdmin ──
// Used by SaulIntelCRM to load the complete 23K+ contact database in one shot
app.get('/crm/growers/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM growers ORDER BY id DESC LIMIT 50000');
    res.json({ data: result.rows, total: result.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/crm/buyers/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buyers ORDER BY id DESC LIMIT 50000');
    res.json({ data: result.rows, total: result.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/crm/shippers/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shipper_contacts ORDER BY id DESC LIMIT 50000');
    res.json({ data: result.rows, total: result.rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SINGLE CALL — returns all 3 tables in one PostgreSQL round-trip ──
app.get('/crm/all-contacts', async (req, res) => {
  try {
    const [g, b, s] = await Promise.all([
      pool.query('SELECT * FROM growers ORDER BY id DESC LIMIT 50000'),
      pool.query('SELECT * FROM buyers ORDER BY id DESC LIMIT 50000'),
      pool.query('SELECT * FROM shipper_contacts ORDER BY id DESC LIMIT 50000'),
    ]);
    res.json({
      growers:  g.rows,
      buyers:   b.rows,
      shippers: s.rows,
      total:    g.rows.length + b.rows.length + s.rows.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// HEALTH + METRICS + ROUTE REPORT
// ════════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    status:        'healthy',
    uptime:        process.uptime(),
    uptimeHours:   (process.uptime() / 3600).toFixed(2),
    routesLoaded:  loadedRoutes.length,
    routesFailed:  failedRoutes.length,
    env:           NODE_ENV,
    node:          process.version,
    memory:        `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  });
});

app.get('/metrics', (req, res) => {
  res.json({
    requests:      requestStats,
    errorRate:     requestStats.total > 0 ? ((requestStats.errors / requestStats.total) * 100).toFixed(2) + '%' : '0%',
    memory:        process.memoryUsage(),
    uptime:        process.uptime(),
    uptimeHours:   (process.uptime() / 3600).toFixed(2),
    loadedRoutes,
    failedRoutes,
  });
});

// Route report — shows what loaded and what failed (owner only in prod)
app.get('/routes', (req, res) => {
  res.json({ loaded: loadedRoutes, failed: failedRoutes });
});

// ════════════════════════════════════════════════════════════════════════════
// 404 + GLOBAL ERROR HANDLER
// ════════════════════════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', req.method, req.path, err.message);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// OLLAMA HEALTH CHECK
// ════════════════════════════════════════════════════════════════════════════

try {
  const ollamaProvider = require('./ai-core/providers/ollamaProvider');
  ollamaProvider.healthCheck().catch(() => {});
} catch (e) { console.warn('[WARN] Ollama provider not loaded:', e.message); }

// ════════════════════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════════════════════

const server = app.listen(PORT, () => {
  const failMsg = failedRoutes.length > 0
    ? `\n  FAILED ROUTES (${failedRoutes.length}):\n${failedRoutes.map(f => `    ✗ ${f.path} — ${f.error}`).join('\n')}`
    : '';

  console.log(`
════════════════════════════════════════════════════════
 AUDITDNA BACKEND SERVER v3.5
 Port:          ${PORT}
 Env:           ${NODE_ENV}
 PID:           ${process.pid}
 Routes Loaded: ${loadedRoutes.length}
 Routes Failed: ${failedRoutes.length}
 JWT Secret:    ${process.env.JWT_SECRET ? 'SET' : 'MISSING — auth insecure'}
 DB Password:   ${process.env.DB_PASSWORD ? 'SET' : 'MISSING — DB will fail'}
════════════════════════════════════════════════════════
YEEHAW! AI COWBOYS ARE LIVE${failMsg}
════════════════════════════════════════════════════════
`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use.`);
    console.error('[FIX] Run: pm2 restart auditdna-backend');
    process.exit(1);
  } else {
    throw err;
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════════════════

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    pool.end(() => {
      console.log('[OK] PostgreSQL pool closed');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('[FORCE] Shutdown timeout — forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', err => {
  console.error('[UNCAUGHT]', err.message, err.stack);
  // Don't exit — log and continue. PM2 will restart if needed.
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// ════════════════════════════════════════════════════════════════════════════
// EXPORT
// FIX: was module.exports.pool = pool (line 40) THEN module.exports = app
//      (end of file) which silently DESTROYED the pool export.
//      Now pool is on app.locals — use req.app.locals.pool in any route.
// ════════════════════════════════════════════════════════════════════════════

module.exports = Object.assign(app, { pool });
