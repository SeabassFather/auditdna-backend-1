const express = require('express');
const { body, validationResult } = require('express-validator');
const { doLoanMatch } = require('../controllers/loanMatchController');

const router = express.Router();
router.post('/',
  [
    body('creditScore').isInt({ min: 0, max: 850 }),
    body('dti').isFloat({ min: 0 }),
    body('ltv').isFloat({ min: 0 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    doLoanMatch(req, res);
  }
);
module.exports = router;
