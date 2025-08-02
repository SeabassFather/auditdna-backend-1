exports.submitBorrowerApplication = (req, res) => {
  const { name, email, phone } = req.body;
  res.json({ success: true, application: { name, email, phone } });
};
