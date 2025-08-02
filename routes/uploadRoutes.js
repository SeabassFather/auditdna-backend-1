const express = require('express');
const multer  = require('multer');
const { handleUpload } = require('../controllers/uploadController');

const upload = multer({ dest: './uploads/' });
const router = express.Router();
router.post('/', upload.single('file'), handleUpload);
module.exports = router;
