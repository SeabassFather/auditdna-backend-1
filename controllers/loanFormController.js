exports.submitLoanForm = (req, res) => {
  const { amount, purpose } = req.body;
  res.json({ success: true, form: { amount, purpose } });
};
