// ============================================================================
// AuditDNA - Deal Documents Route
// Sprint C P6 / 4.25.2026
// Storage: PostgreSQL bytea (max 25MB per file)
// Brain emits: DOCUMENT_UPLOADED, DOCUMENT_DELETED
// Self-migrating: runs CREATE TABLE IF NOT EXISTS at startup
// ============================================================================

const express = require('express');
const pool = require('../../db');
const router = express.Router();

// ---- Self-migrating schema ------------------------------------------------
async function ensureSchema() {
  if (!pool) {
    console.warn('[dealDocuments] pool not available at startup, skipping migration');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deal_documents (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL,
        lane VARCHAR(50) DEFAULT 'factoring',
        doc_type VARCHAR(50),
        filename TEXT NOT NULL,
        mime_type VARCHAR(100),
        size_bytes BIGINT,
        file_data BYTEA NOT NULL,
        uploaded_by VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id, lane);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deal_documents_doc_type ON deal_documents(doc_type);`);
    console.log('[dealDocuments] schema OK');
  } catch (e) {
    console.error('[dealDocuments] schema error:', e.message);
  }
}
// run at module load - delay slightly so pool is ready
setTimeout(ensureSchema, 1500);

// ---- Brain emit (defensive: brain endpoint may 404) ------------------------
function emitBrain(type, payload) {
  try {
    if (typeof global.brainEmit === 'function') {
      global.brainEmit(type, payload);
    }
  } catch (e) {
    // swallow - brain is non-critical for document operations
  }
}

// ---- Heavy JSON parser for upload route only -------------------------------
const heavyJson = express.json({ limit: '30mb' });

// ============================================================================
// POST /api/deals/:lane/:dealId/documents
// Body: { filename, mime_type, doc_type, file_base64, uploaded_by?, notes? }
// ============================================================================
router.post('/api/deals/:lane/:dealId/documents', heavyJson, async (req, res) => {
  const { lane, dealId } = req.params;
  const { filename, mime_type, doc_type, file_base64, uploaded_by, notes } = req.body || {};

  if (!filename || !file_base64) {
    return res.status(400).json({ error: 'filename and file_base64 required' });
  }
  if (!['factoring', 'po', 'commercial'].includes(lane)) {
    return res.status(400).json({ error: 'invalid lane (must be factoring, po, or commercial)' });
  }

  try {
    const buf = Buffer.from(file_base64, 'base64');
    const sizeBytes = buf.length;
    if (sizeBytes === 0) return res.status(400).json({ error: 'empty file' });
    if (sizeBytes > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'file too large (max 25MB)' });
    }

    const r = await pool.query(
      `INSERT INTO deal_documents
         (deal_id, lane, doc_type, filename, mime_type, size_bytes, file_data, uploaded_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, uploaded_at`,
      [
        parseInt(dealId, 10),
        lane,
        doc_type || 'other',
        filename,
        mime_type || 'application/octet-stream',
        sizeBytes,
        buf,
        uploaded_by || 'system',
        notes || null
      ]
    );

    emitBrain('DOCUMENT_UPLOADED', {
      deal_id: parseInt(dealId, 10),
      lane,
      doc_id: r.rows[0].id,
      filename,
      doc_type: doc_type || 'other',
      size_bytes: sizeBytes
    });

    res.json({
      ok: true,
      doc_id: r.rows[0].id,
      uploaded_at: r.rows[0].uploaded_at,
      size_bytes: sizeBytes,
      filename
    });
  } catch (e) {
    console.error('[dealDocuments] upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/deals/:lane/:dealId/documents
// Returns list (metadata only, no file_data)
// ============================================================================
router.get('/api/deals/:lane/:dealId/documents', async (req, res) => {
  const { lane, dealId } = req.params;
  try {
    const r = await pool.query(
      `SELECT id, deal_id, lane, doc_type, filename, mime_type, size_bytes,
              uploaded_by, uploaded_at, notes
       FROM deal_documents
       WHERE deal_id = $1 AND lane = $2
       ORDER BY uploaded_at DESC`,
      [parseInt(dealId, 10), lane]
    );
    res.json({ documents: r.rows, count: r.rows.length });
  } catch (e) {
    console.error('[dealDocuments] list error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/deals/:lane/:dealId/documents/:docId/download
// Returns binary file stream
// ============================================================================
router.get('/api/deals/:lane/:dealId/documents/:docId/download', async (req, res) => {
  const { lane, dealId, docId } = req.params;
  try {
    const r = await pool.query(
      `SELECT filename, mime_type, file_data, size_bytes
       FROM deal_documents
       WHERE id = $1 AND deal_id = $2 AND lane = $3`,
      [parseInt(docId, 10), parseInt(dealId, 10), lane]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });

    const doc = r.rows[0];
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`);
    res.setHeader('Content-Length', doc.size_bytes || doc.file_data.length);
    res.send(doc.file_data);
  } catch (e) {
    console.error('[dealDocuments] download error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// DELETE /api/deals/:lane/:dealId/documents/:docId
// ============================================================================
router.delete('/api/deals/:lane/:dealId/documents/:docId', async (req, res) => {
  const { lane, dealId, docId } = req.params;
  try {
    const r = await pool.query(
      `DELETE FROM deal_documents
       WHERE id = $1 AND deal_id = $2 AND lane = $3
       RETURNING filename, doc_type`,
      [parseInt(docId, 10), parseInt(dealId, 10), lane]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });

    emitBrain('DOCUMENT_DELETED', {
      deal_id: parseInt(dealId, 10),
      lane,
      doc_id: parseInt(docId, 10),
      filename: r.rows[0].filename,
      doc_type: r.rows[0].doc_type
    });

    res.json({ ok: true, deleted: r.rows[0].filename });
  } catch (e) {
    console.error('[dealDocuments] delete error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/deal-documents/summary
// Cross-deal summary (admin overview)
// ============================================================================
router.get('/api/deal-documents/summary', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT deal_id, lane, COUNT(*) as doc_count, SUM(size_bytes) as total_bytes,
              MAX(uploaded_at) as last_upload
       FROM deal_documents
       GROUP BY deal_id, lane
       ORDER BY last_upload DESC
       LIMIT 200`
    );
    res.json({ rows: r.rows, count: r.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/deal-documents/by-type
// Distribution of doc types across system
// ============================================================================
router.get('/api/deal-documents/by-type', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT doc_type, lane, COUNT(*) as count, SUM(size_bytes) as total_bytes
       FROM deal_documents
       GROUP BY doc_type, lane
       ORDER BY count DESC`
    );
    res.json({ rows: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
