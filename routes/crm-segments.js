// routes/crm-segments.js
// Country x Commodity x Category segments browser + blast for UnifiedCRM SEGMENTS tab
// Derives synthetic names from email local-parts (no real names in crm_contacts)

const express = require('express');
const router = express.Router();
const brain = require('../services/brain-emitter');
let pool;

function setPool(p) { pool = p; brain.setPool(p); }

function deriveName(email) {
  if (!email || typeof email !== 'string') return '';
  const local = email.split('@')[0] || '';
  let parts = [];
  if (local.includes('.')) parts = local.split('.');
  else if (local.includes('_')) parts = local.split('_');
  else if (local.includes('-')) parts = local.split('-');
  else parts = [local];
  return parts.filter(function(p){return p.length > 0;}).map(function(p){
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(' ').slice(0, 60);
}

function deriveCompany(email) {
  if (!email || !email.includes('@')) return '';
  const domain = email.split('@')[1] || '';
  const root = domain.split('.')[0] || '';
  return root.toUpperCase();
}

// GET /api/crm/segments-tree - country x category x commodity tree with counts
router.get('/segments-tree', async (req, res) => {
  try {
    const r = await pool.query("SELECT country, detected_category, COUNT(*) AS contacts FROM crm_contacts WHERE is_active = TRUE AND COALESCE(opt_out, FALSE) = FALSE AND detected_category IS NOT NULL GROUP BY country, detected_category ORDER BY country, contacts DESC");
    const tree = {};
    r.rows.forEach(function(row){
      if (!tree[row.country]) tree[row.country] = { country: row.country, total: 0, categories: [] };
      tree[row.country].categories.push({ category: row.detected_category, count: parseInt(row.contacts) });
      tree[row.country].total += parseInt(row.contacts);
    });
    res.json({ ok: true, tree: Object.values(tree).sort(function(a,b){return b.total - a.total;}) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/crm/segments-emails?country=MX&category=GROWER_INVITATION_ES&limit=200&page=1&q=search
router.get('/segments-emails', async (req, res) => {
  try {
    const country = req.query.country || null;
    const category = req.query.category || null;
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const q = (req.query.q || '').trim().toLowerCase();
    const where = ["is_active = TRUE", "COALESCE(opt_out, FALSE) = FALSE"];
    const params = [];
    if (country) { params.push(country); where.push('country = $' + params.length); }
    if (category) { params.push(category); where.push('detected_category = $' + params.length); }
    if (q) { params.push('%' + q + '%'); where.push('LOWER(email) LIKE $' + params.length); }
    params.push(limit); const lp = params.length;
    params.push(offset); const op = params.length;
    const sql = 'SELECT email, country, detected_category, source FROM crm_contacts WHERE ' + where.join(' AND ') + ' ORDER BY email LIMIT $' + lp + ' OFFSET $' + op;
    const cs = 'SELECT COUNT(*) AS total FROM crm_contacts WHERE ' + where.join(' AND ');
    const cparams = params.slice(0, params.length - 2);
    const r = await pool.query(sql, params);
    const c = await pool.query(cs, cparams);
    const enriched = r.rows.map(function(row){
      return {
        email: row.email,
        derived_name: deriveName(row.email),
        derived_company: deriveCompany(row.email),
        country: row.country,
        category: row.detected_category,
        source: row.source
      };
    });
    res.json({ ok: true, total: parseInt(c.rows[0].total), page: page, limit: limit, contacts: enriched });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/crm/segments-blast - fire blast to a segment
// Body: { country, category, commodity_slug?, max_recipients, custom_letter? }
router.post('/segments-blast', async (req, res) => {
  try {
    const country = req.body.country;
    const category = req.body.category;
    const max = Math.min(parseInt(req.body.max_recipients) || 100, 500);
    const slug = req.body.commodity_slug || 'loaf-marketplace';
    if (!country || !category) return res.status(400).json({ ok: false, error: 'country and category required' });
    const matcher = require('../services/blind-matcher');
    const r = await matcher.fireGrowerOutreach({ countries: [country], limit: max, language: 'auto' });
    brain.emit('SEGMENT_BLAST_FIRED', { country: country, category: category, recipients: r.recipients || 0, sent: r.sent || 0, failed: r.failed || 0, commodity_slug: slug }, { agent_id: 'SEGMENTS_BLAST', severity: 1 });
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/crm/segments-stats - dashboard summary
router.get('/segments-stats', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) AS c FROM crm_contacts WHERE is_active = TRUE AND COALESCE(opt_out, FALSE) = FALSE');
    const tagged = await pool.query('SELECT COUNT(*) AS c FROM crm_contacts WHERE is_active = TRUE AND COALESCE(opt_out, FALSE) = FALSE AND detected_category IS NOT NULL');
    const countries = await pool.query('SELECT COUNT(DISTINCT country) AS c FROM crm_contacts WHERE country IS NOT NULL');
    const categories = await pool.query('SELECT COUNT(DISTINCT detected_category) AS c FROM crm_contacts WHERE detected_category IS NOT NULL');
    const blasts = await pool.query("SELECT COUNT(*) AS c FROM grower_outreach_log WHERE sent_at > NOW() - INTERVAL '7 days'").catch(function(){ return { rows: [{ c: 0 }] }; });
    res.json({ ok: true, total: parseInt(total.rows[0].c), tagged: parseInt(tagged.rows[0].c), countries: parseInt(countries.rows[0].c), categories: parseInt(categories.rows[0].c), blasts_7d: parseInt(blasts.rows[0].c) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
module.exports.setPool = setPool;