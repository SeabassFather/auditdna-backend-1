// routes/loanMatchRoutes.js
const express = require('express');
const router  = express.Router();
const { doLoanMatch } = require('../controllers/loanMatchController');

router.post('/', doLoanMatch);
module.exports = router;
