// =========================
// AUDITDNA SERVER (STABLE BUILD)
// =========================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// =========================
// DATABASE
// =========================
const pool = new Pool({
  host: process.env.DB_HOST || 'process.env.DB_HOST',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 40,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// =========================
// APP INIT
// =========================
const app = express();
const PORT = process.env.PORT || 5050;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.locals.pool = pool;

// =========================
// MIDDLEWARE
// =========================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://process.env.DB_HOST:3000', 'https://mexausafg.com'];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || NODE_ENV === 'development') return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// SESSION
// =========================
app.use(
  session({
    store: new pgSession({
      pool,
      tableName: 'user_sessions'
    }),
    name: 'auditdna.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

// =========================
// ROUTES AUTO LOAD (SAFE)
// =========================
const routesDir = path.join(__dirname, 'routes');

if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir)
    .filter(file => file.endsWith('.js')) // IGNORE .py
    .forEach(file => {
      try {
        const route = require(path.join(routesDir, file));

        if (typeof route === 'function') {
          app.use(`/api/${file.replace('.js', '')}`, route);
          console.log(`[ROUTE LOADED] /api/${file.replace('.js', '')}`);
        } else {
          console.warn(`[SKIPPED] ${file} (not a router)`);
        }

      } catch (err) {
        console.error(`[ROUTE ERROR] ${file}:`, err.message);
      }
    });
}

// =========================
// AUTH ROUTES (FIXED)
// =========================
const authRouter = require('./src/Auth');

app.use('/api/auth', (req, res, next) => {
  req.app.locals.pool = pool;
  next();
}, authRouter);

app.use('/api/tenant-auth', require('./routes/tenant-auth'));

// =========================
// HEALTH CHECK
// =========================
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// =========================
// ERROR HANDLING
// =========================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: err.message });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`?? AUDITDNA SERVER RUNNING ON PORT ${PORT}`);
});

// =========================
// EXPORT
// =========================
module.exports = Object.assign(app, { pool });
