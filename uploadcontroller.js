// controllers/uploadController.js
exports.handleUpload = async (req, res) => {
  // TODO: plug in multer/multer-gridfs-storage or S3 logic here.
  // For now just echo success.
  res.json({ success: true, fileInfo: req.file || null });
};
