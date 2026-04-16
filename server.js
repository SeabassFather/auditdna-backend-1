// CLEANED + FIXED AUTH ROUTING (NO LOGIC CHANGES, ONLY CONFLICT FIXED)

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

// DATABASE
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'auditdna',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 40,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

const app = express();
const PORT = process.env.PORT || 5050;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.locals.pool = pool;

// MIDDLEWARE
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'https://mexausafg.com'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || NODE_ENV === 'development') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION
app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions' }),
  name: 'auditdna.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false
}));

// ROUTES AUTO LOAD
const routesDir = path.join(__dirname, 'routes');
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir).forEach(file => {
    if (file.endsWith('.js')) {
      app.use(`/api/${file.replace('.js', '')}`, require(path.join(routesDir, file)));
    }
  });
}

// 🔥 FIXED AUTH ROUTING (THIS WAS YOUR ISSUE)
app.use('/api/auth', require('./src/Auth'));           // YOUR ADMIN LOGIN
app.use('/api/tenant-auth', require('./routes/tenant-auth')); // SEPARATED

// HEALTH
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ERROR HANDLING
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

// START
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = Object.assign(app, { pool });