// =============================================================================
// CAMPAIGN RECIPES -- BACKEND ROUTES
// Save to: C:\AuditDNA\backend\routes\campaign-recipes.routes.js
// =============================================================================
// Mount in server.js:
//   try { app.use('/api/campaign-recipes', require('./routes/campaign-recipes.routes')); console.log('[OK] campaign-recipes mounted at /api/campaign-recipes'); } catch (e) { console.error('[FAIL] campaign-recipes:', e.message); }
//
// ENDPOINTS:
//   GET    /api/campaign-recipes              list all (filters: ?category=&vertical_id=&favorite=true&q=search)
//   POST   /api/campaign-recipes              create new recipe
//   GET    /api/campaign-recipes/:id          single recipe
//   PUT    /api/campaign-recipes/:id          update recipe
//   DELETE /api/campaign-recipes/:id          delete recipe
//   POST   /api/campaign-recipes/:id/use      increment use_count + update last_used (call before applying)
//   POST   /api/campaign-recipes/:id/favorite toggle favorite flag
// =============================================================================

const express = require('express');
const pool = require('../db');
const router = express.Router();

const getDb = () => pool;

// Lightweight auth gate -- presence of bearer token. Replace with full JWT verify when you wire that.
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const tok = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!tok) return res.status(401).json({ ok: false, error: 'Auth required' });
  // Decode the user identifier from token if possible (graceful)
  req.userId = req.headers['x-user-id'] || req.headers['x-user-email'] || 'unknown';
  next();
}

const newId = () => 'CR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

// =============================================================================
// LIST
// =============================================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

    const { category, vertical_id, favorite, q, limit = 100, offset = 0 } = req.query;
    const where = ['(shared_with_team = TRUE OR created_by = $1)'];
    const params = [req.userId];
    let i = 2;
    if (category && category !== 'ALL') { where.push(`category = $${i++}`); params.push(category); }
    if (vertical_id) { where.push(`vertical_id = $${i++}`); params.push(vertical_id); }
    if (favorite === 'true') { where.push(`favorite = TRUE`); }
    if (q && q.trim()) { where.push(`(name ILIKE $${i} OR description ILIKE $${i} OR subject ILIKE $${i})`); params.push('%' + q.trim() + '%'); i++; }

    const lim = Math.min(parseInt(limit, 10) || 100, 500);
    const off = parseInt(offset, 10) || 0;

    const r = await db.query(`
      SELECT id, name, description, category, subject, ai_prompt, products, audience_filter,
             sender_employee_id, vertical_id, language, created_by, shared_with_team, favorite,
             use_count, last_used_at, last_used_by, created_at, updated_at
      FROM campaign_recipes
      WHERE ${where.join(' AND ')}
      ORDER BY favorite DESC, last_used_at DESC NULLS LAST, created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `, [...params, lim, off]);

    res.json({ ok: true, recipes: r.rows.map(parseJsonbRow) });
  } catch (err) {
    console.error('[recipes] list error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// CREATE
// =============================================================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

    const b = req.body || {};
    if (!b.name || !b.name.trim()) return res.status(400).json({ ok: false, error: 'name required' });
    if (!b.subject || !b.subject.trim()) return res.status(400).json({ ok: false, error: 'subject required' });
    if (!b.body_html || !b.body_html.trim()) return res.status(400).json({ ok: false, error: 'body_html required' });

    const id = newId();
    await db.query(`
      INSERT INTO campaign_recipes (
        id, name, description, category, subject, body_html, ai_prompt,
        products, audience_filter, attachments,
        sender_employee_id, vertical_id, language,
        created_by, shared_with_team, favorite, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, NOW()
      )
    `, [
      id, b.name.trim(), b.description || '', b.category || 'custom',
      b.subject.trim(), b.body_html, b.ai_prompt || '',
      JSON.stringify(b.products || []), JSON.stringify(b.audience_filter || {}), JSON.stringify(b.attachments || []),
      b.sender_employee_id || null, b.vertical_id || null, b.language || 'en',
      req.userId, b.shared_with_team !== false, !!b.favorite,
    ]);

    res.json({ ok: true, recipe_id: id, message: 'Recipe saved' });
  } catch (err) {
    console.error('[recipes] create error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// GET ONE
// =============================================================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });
    const r = await db.query('SELECT * FROM campaign_recipes WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, recipe: parseJsonbRow(r.rows[0]) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// UPDATE
// =============================================================================
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });
    const b = req.body || {};
    const fields = [];
    const params = [];
    let i = 1;
    const map = {
      name: 'name', description: 'description', category: 'category',
      subject: 'subject', body_html: 'body_html', ai_prompt: 'ai_prompt',
      sender_employee_id: 'sender_employee_id', vertical_id: 'vertical_id',
      language: 'language', shared_with_team: 'shared_with_team', favorite: 'favorite',
    };
    for (const [k, col] of Object.entries(map)) {
      if (b[k] !== undefined) { fields.push(`${col} = $${i++}`); params.push(b[k]); }
    }
    // JSONB fields
    if (b.products !== undefined) { fields.push(`products = $${i++}`); params.push(JSON.stringify(b.products)); }
    if (b.audience_filter !== undefined) { fields.push(`audience_filter = $${i++}`); params.push(JSON.stringify(b.audience_filter)); }
    if (b.attachments !== undefined) { fields.push(`attachments = $${i++}`); params.push(JSON.stringify(b.attachments)); }

    if (!fields.length) return res.status(400).json({ ok: false, error: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    params.push(req.params.id);

    await db.query(`UPDATE campaign_recipes SET ${fields.join(', ')} WHERE id = $${i}`, params);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// DELETE
// =============================================================================
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });
    const r = await db.query('DELETE FROM campaign_recipes WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, deleted: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// USE -- call this when applying a recipe to track usage
// =============================================================================
router.post('/:id/use', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });
    await db.query(`
      UPDATE campaign_recipes
      SET use_count = use_count + 1, last_used_at = NOW(), last_used_by = $1, updated_at = NOW()
      WHERE id = $2
    `, [req.userId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================================================================
// FAVORITE TOGGLE
// =============================================================================
router.post('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });
    const r = await db.query(`
      UPDATE campaign_recipes SET favorite = NOT favorite, updated_at = NOW()
      WHERE id = $1 RETURNING favorite
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, favorite: r.rows[0].favorite });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Helper: parse JSONB columns back to objects
function parseJsonbRow(row) {
  if (typeof row.products === 'string') row.products = JSON.parse(row.products);
  if (typeof row.audience_filter === 'string') row.audience_filter = JSON.parse(row.audience_filter);
  if (typeof row.attachments === 'string') row.attachments = JSON.parse(row.attachments);
  return row;
}

module.exports = router;
