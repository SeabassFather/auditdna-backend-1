const express = require('express');
const cors = require('cors');

const loanMatchRoutes = require('./routes/loanMatchRoutes');
const borrowerApplicationRoutes = require('./routes/borrowerApplicationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(' AuditDNA Backend is Running');
});

app.use('/api', loanMatchRoutes);
app.use('/api', borrowerApplicationRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log( AuditDNA backend running on port );
});
