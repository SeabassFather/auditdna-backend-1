const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  const { income, creditScore, loanAmount } = req.body;

  // Mock logic
  const result = {
    status: "matched",
    matchQuality: "high",
    lender: "AuditDNA Partner Lender",
    details: {
      income,
      creditScore,
      loanAmount,
    },
  };

  res.json(result);
});

module.exports = router;
