const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const loanFormRoutes = require('./routes/loanFormRoutes');
const loanMatchRoutes = require('./routes/loanMatchRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use('/api/loan/shortform', loanFormRoutes);
app.use('/api/loan/match', loanMatchRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: '? AuditDNA Backend is live!' });
});

app.listen(PORT, () => {
  console.log("? AuditDNA Backend running on http://localhost:" + PORT);
});
