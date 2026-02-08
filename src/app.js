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
      console.log('✅ MongoDB Connected');
      app.listen(PORT, () => {
        console.log(`🚀 AuditDNA Backend running on port ${PORT}`);
        console.log(`📊 API URL: http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('❌ MongoDB Connection Error:', err);
      process.exit(1);
    });
} else {
  // Start without MongoDB if not configured
  console.log('⚠️  MongoDB URI not found - starting without database');
  app.listen(PORT, () => {
    console.log(`🚀 AuditDNA Backend running on port ${PORT}`);
    console.log(`📊 API URL: http://localhost:${PORT}`);
  });
}

export default app;