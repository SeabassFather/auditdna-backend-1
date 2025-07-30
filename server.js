const express = require('express');
const cors = require('cors');
const borrowerApplicationRoutes = require("./routes/borrowerApplicationRoutes");
const app = express();
const loanMatchRoutes = require("./routes/loanMatchRoutes");

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/loanmatch", loanMatchRoutes);

// Root route (fixes Render 404 on "/")
app.get('/', (req, res) => {
  res.send('âœ… AuditDNA Backend is Running');
});

// Test route
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'âœ… Backend test route working' });
});

// Other API routes
// app.use('/api/upload', require('./routes/uploadRoutes'));
app.use("/api", borrowerApplicationRoutes);
app.use("/api", loanMatchRoutes);
app.use("/api", borrowerApplicationRoutes);

const PORT = process.env.PORT || 3002;
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'API root is active' });
});
app.listen(PORT, () => {
  console.log(`âœ… AuditDNA backend running on port ${PORT}`);
});
