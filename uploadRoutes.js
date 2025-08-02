// routes/uploadRoutes.js
const express = require('express');
const multer  = require('multer');
const { handleUpload } = require('../controllers/uploadController');

// Store uploads to ./uploads (make sure this folder exists)
const upload = multer({ dest: './uploads/' });

const router = express.Router();
// ‘file’ here must match the field name in the form you send
router.post('/', upload.single('file'), handleUpload);

module.exports = router;
