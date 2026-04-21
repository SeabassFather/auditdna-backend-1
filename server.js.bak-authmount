'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// ============================================
// 🔧 CORE CONFIG
// ============================================

const PORT = process.env.PORT || 5050;

// ⚠️ DO NOT KILL SERVER — just warn
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret') {
  console.warn('⚠️ WARNING: JWT_SECRET is weak or missing (dev mode)');
}

// ============================================
// 🧠 GLOBAL DB INIT
// ============================================

let db;
try {
  const dbModule = require('./db');
  const getPool = dbModule.getPool || dbModule;

  if (typeof getPool !== 'function') {
    throw new Error('getPool is not a function');
  }

  db = getPool();
  global.db = db;

  console.log('✅ [DB] Connected (global.db ready)');
} catch (err) {
  console.error('❌ [DB] FAILED TO INITIALIZE:', err.message);
}

// ============================================
// 🌐 MIDDLEWARE
// ============================================

app.use(cors({
  origin: true,
  credentials: true
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// 🔍 HEALTH CHECK (ALWAYS AVAILABLE)
// ============================================

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    db: !!global.db
  });
});

// ============================================
// 🔐 EXPLICIT AUTH MOUNT (restores /api/auth/* paths)
// ============================================
// Owner portal uses { password, accessCode, pin } → auth.routes.js
// auth-portal.js and authApi.routes.js are intentionally NOT mounted
// (different signatures / broken). They're skipped in auto-loader below.

try {
  app.use('/api/auth', require('./routes/auth.routes'));
  console.log('✅ [AUTH] /api/auth → auth.routes.js (3-field owner portal)');
} catch (err) {
  console.error('❌ [AUTH] Failed to mount auth.routes.js:', err.message);
}

// ============================================
// 📦 AUTO LOAD ROUTES (SAFE LOADER)
// ============================================

const routesDir = path.join(__dirname, 'routes');

// Files handled by explicit mounts above — do not double-mount
const SKIP_AUTOLOAD = new Set([
  'auth.routes.js',      // mounted above at /api/auth
  'auth-portal.js',      // wrong signature for owner portal
  'authApi.routes.js'    // queries nonexistent email column
]);

if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir).forEach(file => {
    if (!file.endsWith('.js')) return;

    if (SKIP_AUTOLOAD.has(file)) {
      console.log(`⏭️  [SKIPPED] ${file} (handled explicitly or disabled)`);
      return;
    }

    const routePath = path.join(routesDir, file);

    try {
      const route = require(routePath);

      if (typeof route === 'function') {
        app.use('/api', route);
        console.log(`✅ [ROUTE LOADED] /api/${file}`);
      } else {
        console.warn(`⚠️ [SKIPPED] ${file} (not a router)`);
      }

    } catch (err) {
      console.error(`❌ FAILED ROUTE: ${file}`);
      console.error(err.message);
    }
  });
} else {
  console.warn('⚠️ routes directory not found');
}

// ============================================
// 🚀 START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});

// ============================================
// 🛑 GLOBAL ERROR HANDLER (NO CRASH)
// ============================================

process.on('uncaughtException', err => {
  console.error('❌ UNCAUGHT EXCEPTION:', err.message);
});

process.on('unhandledRejection', err => {
  console.error('❌ UNHANDLED REJECTION:', err);
});