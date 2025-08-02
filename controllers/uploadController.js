exports.handleUpload = async (req, res) => {
  res.json({ success: true, fileInfo: req.file || null });
};
