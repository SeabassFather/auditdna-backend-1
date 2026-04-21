const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/file', upload.single('doc'), (req, res) => {
  res.json({ success: true, file: req.file });
});

module.exports = router;

