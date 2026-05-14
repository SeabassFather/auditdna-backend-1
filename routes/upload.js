// upload.js — File upload handler
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const storage  = multer.memoryStorage();
const upload   = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
router.get('/health', (req, res) => res.json({ ok: true, module: 'upload' }));
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ ok: true, filename: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
});
module.exports = router;
