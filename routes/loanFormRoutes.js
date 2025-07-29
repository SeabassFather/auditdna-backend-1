const express = require('express');
const router = express.Router();

router.post('/shortform', (req, res) => {
  const { name, email, phone, income, loanAmount, lotNumber } = req.body;
  console.log('?? New ShortForm Submission:', req.body);
  res.json({ message: 'Short form received!' });
});

module.exports = router;
