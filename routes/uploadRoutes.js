const express = require('express');
const router = express.Router();

let uploads = [];

// POST /api/upload/file
router.post('/file', (req, res) => {
    // In production, use multer for actual file handling
    const { filename, mimetype, size, category, uploadedBy } = req.body;
    const upload = {
        id: uploads.length + 1,
        fileId: `FILE-${Date.now().toString().slice(-8)}`,
        filename,
        mimetype,
        size,
        category,
        uploadedBy,
        url: `/uploads/${Date.now()}-${filename}`,
        createdAt: new Date()
    };
    uploads.push(upload);
    res.status(201).json({ data: upload });
});

// GET /api/upload/files
router.get('/files', (req, res) => {
    const { category } = req.query;
    let data = uploads;
    if (category) data = uploads.filter(u => u.category === category);
    res.json({ data, count: data.length });
});

// GET /api/upload/files/:id
router.get('/files/:id', (req, res) => {
    const file = uploads.find(u => u.id === parseInt(req.params.id));
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ data: file });
});

// DELETE /api/upload/files/:id
router.delete('/files/:id', (req, res) => {
    const idx = uploads.findIndex(u => u.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'File not found' });
    uploads.splice(idx, 1);
    res.json({ success: true });
});

// POST /api/upload/document
router.post('/document', (req, res) => {
    const { type, lotId, growerId, filename, data } = req.body;
    const doc = {
        id: uploads.length + 1,
        docId: `DOC-${Date.now().toString().slice(-8)}`,
        type,
        lotId,
        growerId,
        filename,
        url: `/documents/${Date.now()}-${filename}`,
        createdAt: new Date()
    };
    uploads.push(doc);
    res.status(201).json({ data: doc });
});

module.exports = router;