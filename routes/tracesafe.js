// TraceSafe Small Grower Compliance API
'use strict';

function registerTraceSafeRoutes(app, db) {
  // POST /api/tracesafe/growers — enroll small grower
  app.post('/api/tracesafe/growers', async (req, res) => {
    try {
      const g = req.body;
      const id = g.id || `SG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      try {
        await db.query(`
          INSERT INTO tracesafe_growers (id, name, region, country, commodity, hectares,
            annual_revenue, tier, aci_score, fund_balance, cert_goal, cert_cost,
            contact, phone, language, enrolled_at, payload)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'C',30,0,$8,$9,$10,$11,$12,NOW(),$13)
          ON CONFLICT (id) DO NOTHING`,
          [id, g.name, g.region, g.country, g.commodity, g.hectares||0,
           g.annualRevenue||0, g.certGoal, g.certCost||0, g.contact, g.phone,
           g.language||'es', JSON.stringify(g)]
        );
      } catch(dbErr) { console.warn('tracesafe_growers insert:', dbErr.message); }
      res.json({ success:true, id, name:g.name, tier:'C', aciScore:30 });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  // GET /api/tracesafe/growers
  app.get('/api/tracesafe/growers', async (req, res) => {
    try {
      const { tier, country, limit=100 } = req.query;
      let q = 'SELECT * FROM tracesafe_growers';
      const params=[]; const conds=[];
      if(tier)    { conds.push(`tier=$${params.length+1}`); params.push(tier); }
      if(country) { conds.push(`country=$${params.length+1}`); params.push(country); }
      if(conds.length) q+=' WHERE '+conds.join(' AND ');
      q+=` ORDER BY enrolled_at DESC LIMIT $${params.length+1}`; params.push(+limit);
      const r = await db.query(q,params);
      res.json({ growers:r.rows, total:r.rowCount });
    } catch(err) { res.status(500).json({ error:err.message, growers:[] }); }
  });

  // POST /api/tracesafe/fund/credit — record fund credit on transaction
  app.post('/api/tracesafe/fund/credit', async (req, res) => {
    try {
      const { growerId, transactionAmount, tier } = req.body;
      const rates = { C:0.01, B:0.015, A:0.02 };
      const credit = (transactionAmount||0) * (rates[tier]||0.01);
      try {
        await db.query(
          'UPDATE tracesafe_growers SET fund_balance = fund_balance + $1 WHERE id=$2',
          [credit, growerId]
        );
      } catch(dbErr) { console.warn('fund credit:', dbErr.message); }
      res.json({ success:true, growerId, credit, transactionAmount });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  // PUT /api/tracesafe/growers/:id/tier — update tier after review
  app.put('/api/tracesafe/growers/:id/tier', async (req, res) => {
    try {
      const { tier, aciScore } = req.body;
      await db.query('UPDATE tracesafe_growers SET tier=$1, aci_score=$2 WHERE id=$3',[tier,aciScore,req.params.id]);
      res.json({ success:true, id:req.params.id, tier, aciScore });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  console.log('[TraceSafe] Routes registered: /api/tracesafe/*');
}

async function createTraceSafeTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tracesafe_growers (
      id              VARCHAR(30) PRIMARY KEY,
      name            VARCHAR(200) NOT NULL,
      region          VARCHAR(100),
      country         VARCHAR(5),
      commodity       VARCHAR(100),
      hectares        NUMERIC DEFAULT 0,
      annual_revenue  NUMERIC DEFAULT 0,
      tier            VARCHAR(2) DEFAULT 'C',
      aci_score       INTEGER DEFAULT 30,
      fund_balance    NUMERIC DEFAULT 0,
      cert_goal       VARCHAR(100),
      cert_cost       NUMERIC DEFAULT 0,
      contact         VARCHAR(200),
      phone           VARCHAR(30),
      language        VARCHAR(5) DEFAULT 'es',
      enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
      payload         JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_ts_tier    ON tracesafe_growers(tier);
    CREATE INDEX IF NOT EXISTS idx_ts_country ON tracesafe_growers(country);
    CREATE INDEX IF NOT EXISTS idx_ts_aci     ON tracesafe_growers(aci_score DESC);
  `);
  console.log('[TraceSafe] Table ready: tracesafe_growers');
}

module.exports = { registerTraceSafeRoutes, createTraceSafeTable };
