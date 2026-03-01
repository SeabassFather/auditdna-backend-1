// AUDITDNA BACKEND SERVER v3.2 - ENTERPRISE + AI LEARNING (STABLE)
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

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20
});
pool.on('connect', () => { console.log('[OK] POSTGRESQL CONNECTED!'); });
pool.on('error', err => { console.error('[XX] PostgreSQL error:', err); });
module.exports.pool = pool;

const brain = require('./Brain');
console.log('[BRAIN] Initializing 81 Niner Miners...');
brain.on('taskAssigned', ({ workflowId, miner, team }) => {
  console.log(`[BRAIN] Task assigned to ${miner} (${team}) - Workflow: ${workflowId}`);
});
brain.on('taskCompleted', ({ workflowId, miner, duration }) => {
  console.log(`[BRAIN] Task completed by ${miner} in ${duration}ms - Workflow: ${workflowId}`);
});
module.exports.brain = brain;

const app = express();
const PORT = process.env.PORT || 5050;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(
  session({
    store: new pgSession({ pool, tableName: 'user_sessions' }),
    name: 'auditdna.sid',
    secret: process.env.SESSION_SECRET || 'auditdna-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
  })
);
console.log('[OK] Sessions initialized (PostgreSQL)');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'AuditDNA_JWT_Secret_2026_MFG_Saul_CHANGE_THIS';

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  if (req.path === '/health' || req.path === '/metrics') return next();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try { req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET); return next(); } catch {}
  }
  if (req.session && req.session.userId) {
    req.user = { userId: req.session.userId, username: req.session.username, role: req.session.role };
    return next();
  }
  return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
});
console.log('AUTH: JWT middleware active - all /api routes protected');

try {
  app.use('/api/auth', require('./src/Auth'));
  console.log('AUTH: /api/auth routes loaded from src/Auth.js');
} catch (err) {
  console.error('AUTH: Failed to load src/Auth.js:', err.message);
}

const requestStats = { total: 0, success: 0, errors: 0 };
app.use((req, res, next) => {
  requestStats.total++;
  res.on('finish', () => { res.statusCode < 400 ? requestStats.success++ : requestStats.errors++; });
  next();
});

const routesDir = path.join(__dirname, 'routes');
const loadedRoutes = [];
const failedRoutes = [];

function loadRoutes(dir, base = '/api') {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) { loadRoutes(full, `${base}/${file}`); continue; }
    if (!file.endsWith('.js')) continue;
    try { app.use(`${base}/${file.replace('.js', '')}`, require(full)); loadedRoutes.push(full); }
    catch (e) { failedRoutes.push({ file: full, error: e.message }); }
  }
}

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[OK] PostgreSQL pool ready');
    console.log('   DB: ' + (process.env.DB_NAME || 'auditdna'));
    console.log('   Host: ' + (process.env.DB_HOST || 'localhost') + ':' + (process.env.DB_PORT || 5432));
    console.log('\n[>>] Discovering routes...\n');
    loadRoutes(routesDir);
  } catch (err) {
    console.error('[XX] PostgreSQL connection failed:', err.message);
    console.log('\n[>>] Loading routes anyway...\n');
    loadRoutes(routesDir);
  }
})();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), routesLoaded: loadedRoutes.length, routesFailed: failedRoutes.length });
});
app.get('/metrics', (req, res) => {
  res.json({ requests: requestStats, memory: process.memoryUsage(), uptime: process.uptime() });
});

const server = app.listen(PORT, () => {
  console.log(`\n AUDITDNA BACKEND SERVER v3.2\n Port: ${PORT}\n Env: ${NODE_ENV}\n PID: ${process.pid}\n Routes: ${loadedRoutes.length}\n YEEHAW! 81 NINER MINERS ARE LIVE\n THE BRAIN IS OPERATIONAL\n`);
});

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(() => { pool.end(() => { console.log('[OK] PostgreSQL closed'); process.exit(0); }); });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
module.exports.pool = pool;
module.exports.brain = brain;
