// routes/uploadRoutes.js
const express = require('express');
const router  = express.Router();
const { handleUpload } = require('../controllers/uploadController');

router.post('/', handleUpload);
module.exports = router;
