'use strict';
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/webhook', async (req, res) => {
  res.json({ ok:true, received:true });
});

router.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    console.log('[SMS] Send request to', to, ':', message);
    res.json({ ok:true, message:'SMS queued — Twilio integration pending', to, body:message });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/blast', async (req, res) => {
  try {
    const { recipients, message } = req.body;
    res.json({ ok:true, message:'SMS blast queued', count:(recipients||[]).length });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

module.exports = router;
