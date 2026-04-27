// =============================================================================
// File: Internal-messenger.js
// Save to: C:\AuditDNA\backend\routes\Internal-messenger.js
// =============================================================================
// Sprint D Wave 3C - Internal Messaging Bus
//
// Lightweight ntfy + email + DB persistence for admin-to-admin and
// system-to-admin messages. Used when:
//   - factor-intake fires a $25K+ deal alert
//   - distress upload accepted by Mexausa
//   - high-priority compliance event
//
// Endpoints:
//   POST /api/internal-messenger/send    - send a message (ntfy + email + DB)
//   GET  /api/internal-messenger/inbox   - admin inbox (recent N messages)
//   GET  /api/internal-messenger/health
//
// Persists to internal_messages table (auto-created).
// =============================================================================

const express = require('express');
const router = express.Router();

const db = () => global.db || null;
const NTFY_TOPIC = process.env.NTFY_NINER_TOPIC || 'mfg-niner-alerts';
const NTFY_BASE  = process.env.NTFY_BASE || 'https://ntfy.sh';
const NTFY_TOKEN = process.env.NTFY_TOKEN || '';

const ADMIN_RECIPIENTS = [
  'palt@mfginc.com',
  'saul@mexausafg.com',
  'ogut@mfginc.com'
];

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return true;
  const pool = db();
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS internal_messages (
        id SERIAL PRIMARY KEY,
        priority TEXT DEFAULT 'normal',
        category TEXT,
        title TEXT NOT NULL,
        body TEXT,
        recipients TEXT[],
        sent_via_ntfy BOOLEAN DEFAULT FALSE,
        sent_via_email BOOLEAN DEFAULT FALSE,
        sender_module TEXT,
        related_deal_id INTEGER,
        related_upload_id INTEGER,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_intmsg_at ON internal_messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_intmsg_unread ON internal_messages(read_at) WHERE read_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_intmsg_priority ON internal_messages(priority);
    `);
    schemaReady = true;
    return true;
  } catch (e) {
    console.error('[INTMSG] schema init failed:', e.message);
    return false;
  }
}

// Global send function for in-process callers
if (!global.internalSend) {
  global.internalSend = async function (msg) {
    const pool = db();
    if (!pool) return;
    if (!schemaReady) await ensureSchema();
    try {
      // Persist
      await pool.query(
        `INSERT INTO internal_messages (priority, category, title, body, recipients, sender_module, related_deal_id, related_upload_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          msg.priority || 'normal',
          msg.category || null,
          msg.title || '(no title)',
          msg.body || null,
          msg.recipients || ADMIN_RECIPIENTS,
          msg.sender_module || 'system',
          msg.related_deal_id || null,
          msg.related_upload_id || null
        ]
      );
      // ntfy push (non-blocking)
      try {
        const headers = {
          'Content-Type': 'text/plain',
          'Title': msg.title || 'Mexausa internal',
          'Priority': msg.priority === 'high' ? '5' : msg.priority === 'urgent' ? '4' : '3'
        };
        if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
        fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: msg.body || msg.title })
          .catch(() => {});
      } catch (e) { /* fire and forget */ }
    } catch (e) { /* non-fatal */ }
  };
}

ensureSchema().catch(() => {});

router.post('/send', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  await ensureSchema();
  const m = req.body || {};
  if (!m.title) return res.status(400).json({ error: 'title required' });
  try {
    const r = await pool.query(
      `INSERT INTO internal_messages (priority, category, title, body, recipients, sender_module, related_deal_id, related_upload_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at`,
      [
        m.priority || 'normal',
        m.category || null,
        m.title,
        m.body || null,
        m.recipients || ADMIN_RECIPIENTS,
        m.sender_module || 'manual',
        m.related_deal_id || null,
        m.related_upload_id || null
      ]
    );
    // ntfy fire and forget
    try {
      const headers = {
        'Content-Type': 'text/plain',
        'Title': m.title,
        'Priority': m.priority === 'high' ? '5' : m.priority === 'urgent' ? '4' : '3'
      };
      if (NTFY_TOKEN) headers['Authorization'] = 'Bearer ' + NTFY_TOKEN;
      fetch(`${NTFY_BASE}/${NTFY_TOPIC}`, { method: 'POST', headers, body: m.body || m.title })
        .catch(() => {});
    } catch (e) {}
    res.json({ ok: true, id: r.rows[0].id, sent_at: r.rows[0].created_at });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/inbox', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  await ensureSchema();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const unread = req.query.unread === 'true';
  try {
    let q = `SELECT id, priority, category, title, body, recipients, sender_module,
                    related_deal_id, related_upload_id, read_at, created_at
             FROM internal_messages WHERE 1=1`;
    if (unread) q += ` AND read_at IS NULL`;
    q += ` ORDER BY created_at DESC LIMIT ${limit}`;
    const r = await pool.query(q);
    res.json({ ok: true, count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/mark-read/:id', async (req, res) => {
  const pool = db();
  if (!pool) return res.status(503).json({ error: 'db unavailable' });
  try {
    await pool.query(`UPDATE internal_messages SET read_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'internal-messenger', version: '3C', schema_ready: schemaReady });
});

module.exports = router;
