/**
 * C:\AuditDNA\backend\services\photo-upload.js
 *
 * Phase 2 - Photo upload to PostgreSQL bytea + retrieval.
 *
 * Routes:
 *   POST /api/photos/upload          multipart/form-data
 *   GET  /api/photos/:id             serves binary
 *   GET  /api/photos/:id/thumb       serves binary (same for now, R2 + sharp later)
 *   GET  /api/photos/by-rfq/:rfqId   list
 *   GET  /api/photos/by-offer/:offerId   list
 *   DELETE /api/photos/:id           uploader-only delete
 *
 * Mount: app.use('/api/photos', require('./services/photo-upload').router);
 *
 * Required dep: multer
 */

const express = require('express');
const router = express.Router();
const getPool = require('../db');
const pool = getPool();

let multer = null;
let upload = null;
try {
  multer = require('multer');
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
    fileFilter: (req, file, cb) => {
      if (!/^image\/(jpeg|jpg|png|webp|heic)/i.test(file.mimetype)) {
        return cb(new Error('Only JPEG/PNG/WebP/HEIC accepted'));
      }
      cb(null, true);
    },
  });
} catch (e) {
  console.warn('[photo-upload] multer not installed - run: npm i multer --save');
}

// ----------------------------------------------------------------------------
// POST /upload - multipart with fields: rfq_id|offer_id|declaration_id, uploader_id, uploader_role, caption
// ----------------------------------------------------------------------------
router.post('/upload', (req, res, next) => {
  if (!upload) return res.status(503).json({ error: 'multer not installed' });
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'no file uploaded (field name must be "photo")' });
    try {
      const {
        rfq_id, offer_id, declaration_id,
        uploader_id, uploader_role, caption, is_primary,
      } = req.body || {};
      if (!uploader_id || !uploader_role) {
        return res.status(400).json({ error: 'uploader_id and uploader_role required' });
      }
      const r = await pool.query(`
        INSERT INTO rfq_photos
          (rfq_id, offer_id, declaration_id, uploader_id, uploader_role,
           filename, mime_type, size_bytes, data, caption, is_primary)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id, filename, mime_type, size_bytes, created_at
      `, [
        rfq_id || null, offer_id || null, declaration_id || null,
        parseInt(uploader_id, 10), uploader_role,
        req.file.originalname || 'photo.jpg',
        req.file.mimetype, req.file.size, req.file.buffer,
        caption || null, is_primary === 'true',
      ]);
      const photo = r.rows[0];
      res.json({
        ok: true, photo: { ...photo, url: `/api/photos/${photo.id}`, thumb_url: `/api/photos/${photo.id}/thumb` },
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// ----------------------------------------------------------------------------
// GET /:id  serve image binary
// ----------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT data, mime_type, filename FROM rfq_photos WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).send('not found');
    const photo = r.rows[0];
    res.setHeader('Content-Type', photo.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="${photo.filename}"`);
    res.send(photo.data);
  } catch (e) {
    res.status(500).send(e.message);
  }
});
router.get('/:id/thumb', async (req, res) => {
  try {
    const r = await pool.query(`SELECT data, mime_type FROM rfq_photos WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).send('not found');
    res.setHeader('Content-Type', r.rows[0].mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(r.rows[0].data);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ----------------------------------------------------------------------------
// List endpoints
// ----------------------------------------------------------------------------
router.get('/by-rfq/:rfqId', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, uploader_id, uploader_role, filename, mime_type, size_bytes,
             caption, is_primary, created_at
        FROM rfq_photos WHERE rfq_id = $1 ORDER BY is_primary DESC, created_at DESC
    `, [req.params.rfqId]);
    res.json({ photos: r.rows.map(p => ({ ...p, url: `/api/photos/${p.id}`, thumb_url: `/api/photos/${p.id}/thumb` })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/by-offer/:offerId', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, uploader_id, uploader_role, filename, mime_type, size_bytes,
             caption, is_primary, created_at
        FROM rfq_photos WHERE offer_id = $1 ORDER BY is_primary DESC, created_at DESC
    `, [req.params.offerId]);
    res.json({ photos: r.rows.map(p => ({ ...p, url: `/api/photos/${p.id}`, thumb_url: `/api/photos/${p.id}/thumb` })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/by-declaration/:decId', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, uploader_id, uploader_role, filename, mime_type, size_bytes,
             caption, is_primary, created_at
        FROM rfq_photos WHERE declaration_id = $1 ORDER BY is_primary DESC, created_at DESC
    `, [req.params.decId]);
    res.json({ photos: r.rows.map(p => ({ ...p, url: `/api/photos/${p.id}`, thumb_url: `/api/photos/${p.id}/thumb` })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// DELETE /:id  uploader-only
// ----------------------------------------------------------------------------
router.delete('/:id', express.json(), async (req, res) => {
  try {
    const { uploader_id } = req.body || {};
    if (!uploader_id) return res.status(400).json({ error: 'uploader_id required' });
    const r = await pool.query(
      `DELETE FROM rfq_photos WHERE id = $1 AND uploader_id = $2 RETURNING id`,
      [req.params.id, parseInt(uploader_id, 10)]
    );
    if (r.rows.length === 0) return res.status(403).json({ error: 'not authorized or not found' });
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router };
