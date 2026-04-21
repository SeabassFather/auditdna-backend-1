'use strict';
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ ok:true, service:'AuditDNA API', version:'3.0', status:'live', paca:'20241168' });
});

module.exports = router;

