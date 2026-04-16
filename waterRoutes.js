const express = require('express');
const router = express.Router();

router.get('/water/status', (req, res) => {
  res.json({
    status: 'ok',
    module: 'waterRoutes',
    timestamp: new Date()
  });
});

module.exports = router;
