// ============================================================================
// AuditDNA - INTERNAL INBOX (Inbox A)
// File: C:\AuditDNA\backend\routes\internal-inbox.js
//
// In-app messaging between MFG employees. Threading, read receipts, stars,
// archive, optional CRM contact link, optional vertical/campaign link.
//
// Routes:
//   GET    /api/inbox/list?folder=inbox|sent|starred|archive   List messages
//   GET    /api/inbox/thread/:thread_id                        Full thread
//   POST   /api/inbox/send                                     Send new message
//   POST   /api/inbox/reply                                    Reply to thread
//   POST   /api/inbox/:id/read                                 Mark read
//   POST   /api/inbox/:id/star                                 Star toggle
//   POST   /api/inbox/:id/archive                              Archive
//   GET    /api/inbox/unread-count                             Badge count
// ============================================================================
'use strict';

const express = require('express');
const router  = express.Router();
function db() { return global.db || require('../db').pool; }

// ----------------------------------------------------------------------------
// Helper: get logged-in username from JWT (assumes auth middleware sets req.user)
// ----------------------------------------------------------------------------
function getUsername(req) {
  return req.user?.username || req.headers['x-mfg-user'] || req.query.user || null;
}

// ----------------------------------------------------------------------------
// GET /api/inbox/list - list messages for logged-in user
// folder: inbox (received), sent, starred, archive
// ----------------------------------------------------------------------------
router.get('/list', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.status(401).json({ ok: false, error: 'No user' });
  const { folder = 'inbox', limit = 50 } = req.query;

  try {
    let sql, params;
    if (folder === 'inbox') {
      sql = `SELECT * FROM employee_inbox
             WHERE to_users @> $1::jsonb
               AND NOT (archived_by @> $1::jsonb)
             ORDER BY created_at DESC LIMIT $2`;
      params = [JSON.stringify([user]), parseInt(limit)];
    } else if (folder === 'sent') {
      sql = `SELECT * FROM employee_inbox WHERE from_user=$1 ORDER BY created_at DESC LIMIT $2`;
      params = [user, parseInt(limit)];
    } else if (folder === 'starred') {
      sql = `SELECT * FROM employee_inbox
             WHERE (to_users @> $1::jsonb OR from_user=$2)
               AND starred_by @> $1::jsonb
             ORDER BY created_at DESC LIMIT $3`;
      params = [JSON.stringify([user]), user, parseInt(limit)];
    } else if (folder === 'archive') {
      sql = `SELECT * FROM employee_inbox
             WHERE (to_users @> $1::jsonb OR from_user=$2)
               AND archived_by @> $1::jsonb
             ORDER BY created_at DESC LIMIT $3`;
      params = [JSON.stringify([user]), user, parseInt(limit)];
    } else {
      return res.status(400).json({ ok: false, error: 'invalid folder' });
    }

    const r = await db().query(sql, params);
    // Decorate with read flag
    const out = r.rows.map(m => ({
      ...m,
      is_read: Array.isArray(m.read_by) ? m.read_by.includes(user) : false,
      is_starred: Array.isArray(m.starred_by) ? m.starred_by.includes(user) : false
    }));
    res.json({ ok: true, messages: out });
  } catch (e) {
    console.error('[inbox/list]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/inbox/thread/:thread_id
// ----------------------------------------------------------------------------
router.get('/thread/:thread_id', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.status(401).json({ ok: false });
  try {
    const r = await db().query('SELECT * FROM employee_inbox WHERE thread_id=$1 OR id=$1 ORDER BY created_at ASC', [parseInt(req.params.thread_id)]);
    res.json({ ok: true, messages: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/inbox/send
// Body: { to_users:[], cc_users:[], subject, body, body_html, attachments, priority, related_contact_id, related_vertical }
// ----------------------------------------------------------------------------
router.post('/send', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.status(401).json({ ok: false });
  const { to_users, cc_users, subject, body, body_html, attachments, priority, related_contact_id, related_vertical } = req.body;
  if (!Array.isArray(to_users) || to_users.length === 0 || !body) {
    return res.status(400).json({ ok: false, error: 'to_users and body required' });
  }
  try {
    const r = await db().query(`
      INSERT INTO employee_inbox (from_user, to_users, cc_users, subject, body, body_html, attachments, priority, related_contact_id, related_vertical)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [user, JSON.stringify(to_users), JSON.stringify(cc_users || []), subject || '(no subject)', body, body_html || null, JSON.stringify(attachments || []), priority || 'normal', related_contact_id || null, related_vertical || null]);
    const id = r.rows[0].id;
    // Set thread_id = id for first message in thread
    await db().query('UPDATE employee_inbox SET thread_id=$1 WHERE id=$1', [id]);
    res.json({ ok: true, id, thread_id: id });
  } catch (e) {
    console.error('[inbox/send]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/inbox/reply
// Body: { thread_id, body, body_html, attachments }
// ----------------------------------------------------------------------------
router.post('/reply', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.status(401).json({ ok: false });
  const { thread_id, body, body_html, attachments } = req.body;
  if (!thread_id || !body) return res.status(400).json({ ok: false });
  try {
    // Get thread head to copy subject + recipient list
    const head = await db().query('SELECT * FROM employee_inbox WHERE id=$1 OR thread_id=$1 ORDER BY created_at ASC LIMIT 1', [parseInt(thread_id)]);
    if (!head.rowCount) return res.status(404).json({ ok: false });
    const h = head.rows[0];
    // Reply recipients: original from + original to (minus self) + cc
    const allRecipients = new Set();
    if (h.from_user !== user) allRecipients.add(h.from_user);
    (h.to_users || []).forEach(u => { if (u !== user) allRecipients.add(u); });
    const r = await db().query(`
      INSERT INTO employee_inbox (thread_id, from_user, to_users, cc_users, subject, body, body_html, attachments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [parseInt(thread_id), user, JSON.stringify([...allRecipients]), JSON.stringify(h.cc_users || []), 'Re: ' + (h.subject || ''), body, body_html || null, JSON.stringify(attachments || [])]);
    res.json({ ok: true, id: r.rows[0].id, thread_id: parseInt(thread_id) });
  } catch (e) {
    console.error('[inbox/reply]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/inbox/:id/read
// ----------------------------------------------------------------------------
router.post('/:id/read', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.status(401).json({ ok: false });
  try {
    await db().query(`UPDATE employee_inbox SET read_by = COALESCE(read_by,'[]'::jsonb) || $1::jsonb WHERE id=$2 AND NOT (read_by @> $1::jsonb)`, [JSON.stringify([user]), parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/inbox/:id/star (toggle)
// ----------------------------------------------------------------------------
router.post('/:id/star', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.status(401).json({ ok: false });
  try {
    const cur = await db().query('SELECT starred_by FROM employee_inbox WHERE id=$1', [parseInt(req.params.id)]);
    if (!cur.rowCount) return res.status(404).json({ ok: false });
    const arr = cur.rows[0].starred_by || [];
    const next = arr.includes(user) ? arr.filter(u => u !== user) : [...arr, user];
    await db().query('UPDATE employee_inbox SET starred_by=$1::jsonb WHERE id=$2', [JSON.stringify(next), parseInt(req.params.id)]);
    res.json({ ok: true, starred: next.includes(user) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/inbox/:id/archive
// ----------------------------------------------------------------------------
router.post('/:id/archive', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.status(401).json({ ok: false });
  try {
    await db().query(`UPDATE employee_inbox SET archived_by = COALESCE(archived_by,'[]'::jsonb) || $1::jsonb WHERE id=$2 AND NOT (archived_by @> $1::jsonb)`, [JSON.stringify([user]), parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/inbox/unread-count
// ----------------------------------------------------------------------------
router.get('/unread-count', async (req, res) => {
  const user = getUsername(req);
  if (!user) return res.json({ ok: true, count: 0 });
  try {
    const r = await db().query(`
      SELECT COUNT(*) AS n FROM employee_inbox
      WHERE to_users @> $1::jsonb
        AND NOT (read_by @> $1::jsonb)
        AND NOT (archived_by @> $1::jsonb)`, [JSON.stringify([user])]);
    res.json({ ok: true, count: parseInt(r.rows[0].n) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, count: 0 });
  }
});

module.exports = router;
