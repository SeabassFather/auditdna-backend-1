exports.doLoanMatch = (req, res) => {
  console.log('??? /api/loan-match payload:', req.body);
  const { creditScore, dti, ltv } = req.body;
  const mockLender = { lender: 'AuditDNA Partner Lender', matchQuality: 'high' };
  res.json({ status: 'matched', ...mockLender, criteria: { creditScore, dti, ltv } });
};
