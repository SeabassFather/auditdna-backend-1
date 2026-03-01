// ═══════════════════════════════════════════════════════════════
// AUDITDNA BACKEND SERVER v3.2 – ENTERPRISE + AI LEARNING (STABLE)
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// ═══════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20
});

pool.on('connect', () => {
  console.log('✅ POSTGRESQL CONNECTED!');
});

pool.on('error', err => {
  console.error('❌ PostgreSQL error:', err);
});

module.exports.pool = pool;

// ═══════════════════════════════════════════════════════════════
// THE BRAIN - NINER MINER ORCHESTRATION
// ═══════════════════════════════════════════════════════════════

const brain = require('./Brain');

console.log('🧠 THE BRAIN: Initializing 81 Niner Miners...');

// Brain event listeners for real-time monitoring
brain.on('taskAssigned', ({ workflowId, miner, team }) => {
  console.log(`⛏️  [BRAIN] Task assigned to ${miner} (${team}) - Workflow: ${workflowId}`);
});

brain.on('taskCompleted', ({ workflowId, miner, duration }) => {
  console.log(`✅ [BRAIN] Task completed by ${miner} in ${duration}ms - Workflow: ${workflowId}`);
});

module.exports.brain = brain;


// ═══════════════════════════════════════════════════════════════
// APP INIT
// ═══════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ═══════════════════════════════════════════════════════════════
// CORE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ═══════════════════════════════════════════════════════════════
// SESSION SETUP (POSTGRES BACKED)
// ═══════════════════════════════════════════════════════════════

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: 'user_sessions'
    }),
    name: 'auditdna.sid',
    secret: process.env.SESSION_SECRET || 'auditdna-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

console.log('✅ Sessions initialized (PostgreSQL)');

// ═══════════════════════════════════════════════════════════════
// REQUEST METRICS
// ═══════════════════════════════════════════════════════════════

const requestStats = { total: 0, success: 0, errors: 0 };

app.use((req, res, next) => {
  requestStats.total++;
  res.on('finish', () => {
    res.statusCode < 400 ? requestStats.success++ : requestStats.errors++;
  });
  next();
});

// ═══════════════════════════════════════════════════════════════
// AUTO ROUTE LOADER
// ═══════════════════════════════════════════════════════════════

const routesDir = path.join(__dirname, 'routes');
const loadedRoutes = [];
const failedRoutes = [];

function loadRoutes(dir, base = '/api') {
  if (!fs.existsSync(dir)) return;
  
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    
    if (fs.statSync(full).isDirectory()) {
      loadRoutes(full, `${base}/${file}`);
      continue;
    }
    
    if (!file.endsWith('.js')) continue;
    
    try {
      app.use(`${base}/${file.replace('.js', '')}`, require(full));
      loadedRoutes.push(full);
    } catch (e) {
      failedRoutes.push({ file: full, error: e.message });
    }
  }
}

console.log('\n🔍 Discovering routes...\n');
loadRoutes(routesDir);

// ═══════════════════════════════════════════════════════════════
// HEALTH + METRICS
// ═══════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    routesLoaded: loadedRoutes.length,
    routesFailed: failedRoutes.length
  });
});

app.get('/metrics', (req, res) => {
  res.json({
    requests: requestStats,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

const server = app.listen(PORT, () => {
  console.log(`
════════════════════════════════════════════════════════════════
 AUDITDNA BACKEND SERVER v3.2
 Port: ${PORT}
 Env: ${NODE_ENV}
 PID: ${process.pid}
 Routes Loaded: ${loadedRoutes.length}
════════════════════════════════════════════════════════════════
⛏️  YEEHAW! 81 NINER MINERS ARE LIVE! ⛏️
🧠 THE BRAIN IS OPERATIONAL 🧠
════════════════════════════════════════════════════════════════
`);
});

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down…`);
  
  server.close(() => {
    pool.end(() => {
      console.log('✅ PostgreSQL closed');
      process.exit(0);
    });
  });
  
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = app;