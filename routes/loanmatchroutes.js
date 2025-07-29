const express = require('express');
const router = express.Router();

// Dummy lender match logic
router.post('/match', (req, res) => {
  const { creditScore, income, dti, ltv } = req.body;

  // Replace with real match logic later
  const matchedLenders = [
    { name: 'Lender A', maxLTV: 80, minCreditScore: 620 },
    { name: 'Lender B', maxLTV: 90, minCreditScore: 700 },
  ];

  const result = matchedLenders.filter(lender => {
    return creditScore >= lender.minCreditScore && ltv <= lender.maxLTV;
  });

  res.json({ matched: result });
});

module.exports = router;
