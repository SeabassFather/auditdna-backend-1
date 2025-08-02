require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(express.json());

// Serve frontend build folder
app.use(express.static(path.join(__dirname, '../auditdna-frontend/Frontend/build')));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: '✅ Backend API is working' });
});

// Catch-all: serve frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../auditdna-frontend/Frontend/build/index.html'));
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Full AuditDNA app running at http://localhost:${PORT}`);
});
