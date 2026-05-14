const express = require('express');
const router = express.Router();
router.get('/status', (req,res) => res.json({ ok:true, agents:25, status:'ONLINE', label:'Oakland A's 25 AI Agents' }));
router.get('/', (req,res) => res.json({ ok:true, agents:25, status:'ONLINE' }));
module.exports = router;
