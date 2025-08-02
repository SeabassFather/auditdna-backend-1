const express = require('express');
const { body, validationResult } = require('express-validator');
const { submitLoanForm } = require('../controllers/loanFormController');

const router = express.Router();
router.post('/',
  [
    body('amount').isFloat({ gt: 0 }),
    body('purpose').isString().notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    submitLoanForm(req, res);
  }
);
module.exports = router;
