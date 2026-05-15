// Certification records API — Re:Collect module
'use strict';

function registerCertificationRoutes(app, db) {
  app.post('/api/certifications', async (req, res) => {
    try {
      const c = req.body;
      const id = `CERT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      try {
        await db.query(`
          INSERT INTO certifications (id, body, grower, cert_number, commodity, country, expires, score, status, added_at, payload)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Active',NOW(),$9)
          ON CONFLICT (id) DO NOTHING`,
          [id, c.body, c.grower, c.certNumber||c.cert_number, c.commodity, c.country, c.expires, c.score, JSON.stringify(c)]
        );
      } catch(dbErr) { console.warn('certifications insert:', dbErr.message); }
      res.json({ success:true, id, body:c.body, grower:c.grower });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  app.get('/api/certifications', async (req, res) => {
    try {
      const { grower, body, status, limit=50 } = req.query;
      let q = 'SELECT * FROM certifications';
      const params=[]; const conds=[];
      if(grower){ conds.push(`grower ILIKE $${params.length+1}`); params.push('%'+grower+'%'); }
      if(body)  { conds.push(`body = $${params.length+1}`); params.push(body); }
      if(status){ conds.push(`status = $${params.length+1}`); params.push(status); }
      if(conds.length) q+=' WHERE '+conds.join(' AND ');
      q+=` ORDER BY added_at DESC LIMIT $${params.length+1}`; params.push(+limit);
      const r = await db.query(q, params);
      res.json({ certifications: r.rows, total: r.rowCount });
    } catch(err) { res.status(500).json({ error:err.message, certifications:[] }); }
  });

  app.get('/api/certifications/grower/:grower', async (req, res) => {
    try {
      const r = await db.query(
        'SELECT * FROM certifications WHERE grower ILIKE $1 ORDER BY expires DESC',
        ['%'+req.params.grower+'%']
      );
      res.json({ certifications: r.rows, total: r.rowCount });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  console.log('[Certifications] Routes registered: /api/certifications/*');
}

async function createCertificationsTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS certifications (
      id          VARCHAR(30) PRIMARY KEY,
      body        VARCHAR(100),
      grower      VARCHAR(200),
      cert_number VARCHAR(100),
      commodity   VARCHAR(100),
      country     VARCHAR(5),
      expires     DATE,
      score       INTEGER,
      status      VARCHAR(30) DEFAULT 'Active',
      added_at    TIMESTAMPTZ DEFAULT NOW(),
      payload     JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_cert_grower ON certifications(grower);
    CREATE INDEX IF NOT EXISTS idx_cert_body   ON certifications(body);
    CREATE INDEX IF NOT EXISTS idx_cert_expires ON certifications(expires);
  `);
  console.log('[Certifications] Table ready: certifications');
}

module.exports = { registerCertificationRoutes, createCertificationsTable };
