// server.js

require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');

// 1. Import your route modules
const uploadRoutes    = require('./routes/uploadRoutes');
const loanMatchRoutes = require('./routes/loanMatchRoutes');

const app  = express();
const port = process.env.PORT || 3002;

// 2. Connect to MongoDB
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('🔴 MONGO_URI not defined in .env');
  process.exit(1);
}
console.log('🔑 Using MongoDB URI:', mongoUri);

mongoose
  .connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// 3. Middleware
app.use(express.json());

// 4. Health-check
app.get('/api/test', (req, res) => {
  res.json({ message: '✅ Backend API is working and MongoDB connected' });
});

// 5. Mount your routers
app.use('/api/upload', uploadRoutes);
console.log('🔀 Mounted: POST /api/upload');

app.use('/api/loan-match', loanMatchRoutes);
console.log('🔀 Mounted: POST /api/loan-match');

// 6. Start server
app.listen(port, () => {
  console.log(`🚀 AuditDNA Backend running on http://localhost:${port}`);
});
