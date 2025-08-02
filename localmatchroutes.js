// controllers/loanMatchController.js

exports.doLoanMatch = (req, res) => {
  console.log('🛎️ /api/loan-match payload:', req.body);
  const { creditScore, dti, ltv } = req.body;

  // Mock lender logic
  const mockLender = {
    lender: 'AuditDNA Partner Lender',
    matchQuality: 'high'
  };

  // Return all three fields under "criteria"
  res.json({
    status: 'matched',
    ...mockLender,
    criteria: { creditScore, dti, ltv }
  });
};
