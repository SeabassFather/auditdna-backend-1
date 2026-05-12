const express = require('express');
const router = express.Router();
const pool = require('../db');

// Auto-backfill contact_commodity_tags from growers + buyers tables
router.post('/backfill', async (req, res) => {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_commodity_tags (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER, contact_type VARCHAR(20),
        email VARCHAR(200), commodity VARCHAR(80),
        state VARCHAR(80), country VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(email, commodity)
      )
    `).catch(()=>{});

    let inserted = 0;

    // Tag growers
    const growers = await pool.query(
      `SELECT id, email, primary_products, state_region, country FROM growers
       WHERE email IS NOT NULL AND email != '' AND primary_products IS NOT NULL`
    ).catch(()=>({rows:[]}));

    for (const g of growers.rows) {
      const raw = g.primary_products;
        const prods = Array.isArray(raw)
          ? raw.map(p=>String(p).trim().toLowerCase()).filter(Boolean)
          : String(raw||'').split(/[,;|]/).map(p=>p.trim().toLowerCase()).filter(Boolean);
      for (const prod of prods.slice(0,5)) {
        await pool.query(
          `INSERT INTO contact_commodity_tags (contact_id,contact_type,email,commodity,state,country)
           VALUES ($1,'grower',$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [g.id, g.email, prod, g.state_region||'', g.country||'MX']
        ).catch(()=>{});
        inserted++;
      }
    }

    // Tag buyers
    const buyers = await pool.query(
      `SELECT id, email, commodities_purchased, state, country FROM buyers
       WHERE email IS NOT NULL AND email != ''`
    ).catch(()=>({rows:[]}));

    for (const b of buyers.rows) {
      const rawb = b.commodities_purchased;
        const prods = Array.isArray(rawb)
          ? rawb.map(p=>String(p).trim().toLowerCase()).filter(Boolean)
          : String(rawb||'').split(/[,;|]/).map(p=>p.trim().toLowerCase()).filter(Boolean);
      for (const prod of prods.slice(0,5)) {
        await pool.query(
          `INSERT INTO contact_commodity_tags (contact_id,contact_type,email,commodity,state,country)
           VALUES ($1,'buyer',$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [b.id, b.email, prod, b.state||'', b.country||'US']
        ).catch(()=>{});
        inserted++;
      }
    }

    const count = await pool.query('SELECT COUNT(*) FROM contact_commodity_tags');
    res.json({ ok: true, inserted, total: parseInt(count.rows[0].count) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT commodity, COUNT(*) as contacts FROM contact_commodity_tags
       GROUP BY commodity ORDER BY contacts DESC LIMIT 30`
    );
    res.json({ ok: true, tags: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
