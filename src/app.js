import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// Import route modules
import growersRouter from './routes/growers.js';
import pricesRouter from './routes/prices.js';
import importsRouter from './routes/imports.js';
import safetyRouter from './routes/safety.js';
import financialRouter from './financial.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AuditDNA Backend API Online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      growers: '/api/growers',
      prices: '/api/prices',
      imports: '/api/imports',
      safety: '/api/safety',
      financial: '/api/financial'
    }
  });
});

// Mount API routes
app.use('/api/growers', growersRouter);
app.use('/api/imports', importsRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/financial', financialRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection and server start
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    })
    .then(() => {
      console.log('Ã¢Å“â€¦ MongoDB Connected');
      
// Sprint C P6: Deal Documents
app.use(require('./routes/dealDocuments'));


// Sprint C P7: Lender Responses
app.use(require('./routes/lenderResponses'));


// Sprint C P9: Borrowers
app.use(require('./routes/borrowers'));


// Sprint C P10: Risk Center
app.use(require('./routes/dealRiskScoring'));


// Sprint C P12: Borrower Portal
app.use(require('./routes/borrowerPortal'));


// Sprint C P13: Notifications
app.use(require('./routes/notificationEngine'));


// Sprint C P14: Deal Intelligence
app.use(require('./routes/dealIntelligence'));


// Sprint C P15: Brain Events + HARVEST
app.use(require('./routes/brainEvents'));


// P17: Lender Marketplace
app.use(require('./routes/lenderMarketplace'));


// SPRINT C RUN 13B - OpenClaw + Tree Bus
try {
  const openClawAgent = require('./routes/openClawAgent');
  app.use('/api/openclaw', openClawAgent(pool));
  console.log('[boot] /api/openclaw mounted');
} catch (e) { console.error('[boot] openClawAgent mount failed:', e.message); }
app.listen(PORT, () => {
        console.log(`Ã°Å¸Å¡â‚¬ AuditDNA Backend running on port ${PORT}`);
        console.log(`Ã°Å¸â€œÅ  API URL: http://process.env.DB_HOST:${PORT}`);
      });
    })
    .catch(err => {
      console.error('Ã¢ÂÅ’ MongoDB Connection Error:', err);
      process.exit(1);
    });
} else {
  // Start without MongoDB if not configured
  console.log('Ã¢Å¡Â Ã¯Â¸Â  MongoDB URI not found - starting without database');
  app.listen(PORT, () => {
    console.log(`Ã°Å¸Å¡â‚¬ AuditDNA Backend running on port ${PORT}`);
    console.log(`Ã°Å¸â€œÅ  API URL: http://process.env.DB_HOST:${PORT}`);
  });
}

export default app;

