const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route (fixes Render 404 on "/")
app.get('/', (req, res) => {
  res.send('✅ AuditDNA Backend is Running');
});

// Test route
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: '✅ Backend test route working' });
});

// Add your other API routes here...
// app.use('/api/upload', require('./routes/uploadRoutes'));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ AuditDNA backend running on port ${PORT}`);
});
