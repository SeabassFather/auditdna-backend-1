const express = require('express');
const { body, validationResult } = require('express-validator');
const { submitBorrowerApplication } = require('../controllers/borrowerApplicationController');

const router = express.Router();
router.post('/',
  [
    body('name').isString().notEmpty(),
    body('email').isEmail(),
    body('phone').isString().notEmpty(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    submitBorrowerApplication(req, res);
  }
);
module.exports = router;
