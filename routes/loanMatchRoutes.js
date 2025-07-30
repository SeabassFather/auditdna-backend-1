const express = require("express");
const router = express.Router();

// Health check route
router.get('/test', (req, res) => {
  res.json({
    message: "✅ Backend test route working"
  });
});

// Fix: Change "/" to "/loan-match"
router.post("/loan-match", (req, res) => {
  const { income, creditScore, loanAmount, dti, ltv } = req.body;
  
  // Mock logic
  const result = {
    success: true,
    status: "matched",
    matchQuality: "high",
    lender: "AuditDNA Partner Lender",
    data: {
      criteria: { income, creditScore, loanAmount, dti, ltv },
      matchCount: 1,
      lenders: [{
        name: "AuditDNA Partner Lender",
        rate: 6.75,
        apr: 6.95
      }]
    }
  };
  res.json(result);
});

module.exports = router;