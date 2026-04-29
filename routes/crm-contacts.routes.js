// Save to: C:\AuditDNA\backend\routes\crm-contacts.routes.js
const express = require('express');
const router = express.Router();

const getDb = () => global.db;

// ============================================================
// GET /api/crm-contacts
// List contacts with filters + pagination
// ============================================================
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

    const {
      category, platform, source, country,
      is_active, opt_out, search,
      limit = 500, offset = 0
    } = req.query;

    const where = [];
    const params = [];
    let i = 1;

    if (category) { where.push(`category = $${i++}`); params.push(category); }
    if (platform) { where.push(`platform = $${i++}`); params.push(platform); }
    if (source)   { where.push(`source = $${i++}`); params.push(source); }
    if (country)  { where.push(`country = $${i++}`); params.push(country); }
    if (is_active !== undefined) { where.push(`is_active = $${i++}`); params.push(is_active === 'true'); }
    if (opt_out   !== undefined) { where.push(`opt_out = $${i++}`);   params.push(opt_out === 'true'); }
    if (search) {
      where.push(`(email ILIKE $${i} OR category ILIKE $${i} OR country ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit, 10) || 500, 5000);
    const off = parseInt(offset, 10) || 0;

    const dataSql = `
      SELECT email, category, platform, source, country, is_active, opt_out
      FROM crm_contacts
      ${whereSql}
      ORDER BY email ASC
      LIMIT $${i++} OFFSET $${i++}
    `;
    const countSql = `SELECT COUNT(*)::int AS total FROM crm_contacts ${whereSql}`;

    const [dataRes, countRes] = await Promise.all([
      db.query(dataSql, [...params, lim, off]),
      db.query(countSql, params)
    ]);

    res.json({
      ok: true,
      total: countRes.rows[0].total,
      count: dataRes.rows.length,
      limit: lim,
      offset: off,
      contacts: dataRes.rows
    });
  } catch (err) {
    console.error('[crm-contacts] list error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/crm-contacts/stats
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

    const r = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END)::int AS active,
        SUM(CASE WHEN opt_out = true THEN 1 ELSE 0 END)::int AS opted_out,
        SUM(CASE WHEN is_active = true AND opt_out = false THEN 1 ELSE 0 END)::int AS mailable,
        COUNT(DISTINCT category)::int AS categories,
        COUNT(DISTINCT platform)::int AS platforms,
        COUNT(DISTINCT country)::int AS countries
      FROM crm_contacts
    `);
    res.json({ ok: true, stats: r.rows[0] });
  } catch (err) {
    console.error('[crm-contacts] stats error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// GET /api/crm-contacts/segments
// Auto-categorize: COMMODITY + STATE + COUNTRY
// ============================================================
router.get('/segments', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

    const r = await db.query(`
      SELECT
        category, platform, country,
        COUNT(*)::int AS total,
        SUM(CASE WHEN is_active = true AND opt_out = false THEN 1 ELSE 0 END)::int AS mailable
      FROM crm_contacts
      GROUP BY category, platform, country
      ORDER BY total DESC
    `);
    res.json({ ok: true, segments: r.rows });
  } catch (err) {
    console.error('[crm-contacts] segments error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// POST /api/crm-contacts/blast-targets
// Returns mailable list for matched buyer segments
// ============================================================
router.post('/blast-targets', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

    const { categories = [], platforms = [], countries = [], sources = [] } = req.body || {};

    const where = ['is_active = true', 'opt_out = false'];
    const params = [];
    let i = 1;

    if (categories.length) { where.push(`category = ANY($${i++})`); params.push(categories); }
    if (platforms.length)  { where.push(`platform = ANY($${i++})`); params.push(platforms); }
    if (countries.length)  { where.push(`country = ANY($${i++})`);  params.push(countries); }
    if (sources.length)    { where.push(`source = ANY($${i++})`);   params.push(sources); }

    const r = await db.query(`
      SELECT email, category, platform, source, country
      FROM crm_contacts
      WHERE ${where.join(' AND ')}
      ORDER BY email ASC
    `, params);

    res.json({ ok: true, count: r.rows.length, contacts: r.rows });
  } catch (err) {
    console.error('[crm-contacts] blast-targets error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// PATCH /api/crm-contacts/opt-out
// ============================================================
router.patch('/opt-out', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'email required' });

    const r = await db.query(
      `UPDATE crm_contacts SET opt_out = true WHERE email = $1 RETURNING email, opt_out`,
      [email]
    );
    if (!r.rowCount) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, contact: r.rows[0] });
  } catch (err) {
    console.error('[crm-contacts] opt-out error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
