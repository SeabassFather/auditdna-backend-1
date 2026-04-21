const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load smallGrowerRoutes (self-contained, no dependencies!)
const smallGrowerRoutes = require('./routes/smallGrowerRoutes');
app.use('/api/small-growers', smallGrowerRoutes);

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '3.0.0'
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'AuditDNA Backend Server',
        version: '3.0.0',
        health: '/health',
        api: '/api'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('');
    console.log('================================================================');
    console.log('   AUDITDNA BACKEND SERVER v3.0.0');
    console.log('================================================================');
    console.log(`   Port: ${PORT}`);
    console.log('   Status: Running');
    console.log('');
    console.log('   API Routes:');
    console.log('   |-- POST /api/small-growers/growers');
    console.log('   |-- GET  /api/small-growers/growers');
    console.log('   |-- POST /api/small-growers/growers/:id/lab-tests');
    console.log('   |-- GET  /api/small-growers/growers/:id/grs');
    console.log('   |-- POST /api/small-growers/traceability');
    console.log('================================================================');
    console.log('   BOOM SHAKALAKA!!!');
    console.log('================================================================');
    console.log('');
});

module.exports = app;

