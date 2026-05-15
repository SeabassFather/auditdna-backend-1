// Partner Portal API — Government & Network Partner Access
'use strict';

function registerPartnerRoutes(app, db) {
  // POST /api/partners — register new partner
  app.post('/api/partners', async (req, res) => {
    try {
      const p = req.body;
      const id = p.id || `P${Date.now().toString(36).toUpperCase().slice(-6)}`;
      try {
        await db.query(`
          INSERT INTO partner_registry (id, name, type, tier, country, contact, phone, status, data_access, briefing_cadence, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending',$8,'bi-weekly',NOW())
          ON CONFLICT (id) DO NOTHING`,
          [id, p.name, p.type, p.tier, p.country, p.contact, p.phone, JSON.stringify(p.dataAccess||[])]
        );
      } catch(dbErr) { console.warn('partner insert:', dbErr.message); }
      res.json({ success:true, id, name:p.name, status:'Pending' });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  // GET /api/partners
  app.get('/api/partners', async (req, res) => {
    try {
      const { tier, status, limit=100 } = req.query;
      let q = 'SELECT * FROM partner_registry';
      const params=[]; const conds=[];
      if(tier)  { conds.push(`tier=$${params.length+1}`); params.push(tier); }
      if(status){ conds.push(`status=$${params.length+1}`); params.push(status); }
      if(conds.length) q+=' WHERE '+conds.join(' AND ');
      q+=` ORDER BY created_at DESC LIMIT $${params.length+1}`; params.push(+limit);
      const r = await db.query(q, params);
      res.json({ partners: r.rows, total: r.rowCount });
    } catch(err) { res.status(500).json({ error:err.message, partners:[] }); }
  });

  // PUT /api/partners/:id/approve
  app.put('/api/partners/:id/approve', async (req, res) => {
    try {
      await db.query("UPDATE partner_registry SET status='Active' WHERE id=$1",[req.params.id]);
      res.json({ success:true, id:req.params.id, status:'Active' });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  // POST /api/partner-messages
  app.post('/api/partner-messages', async (req, res) => {
    try {
      const m = req.body;
      const id = `MSG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      try {
        await db.query(`
          INSERT INTO partner_messages (id, from_partner, to_partner, subject, body, urgent, message_type, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [id, m.from, m.to, m.subject, m.body, m.urgent||false, m.type||'direct']
        );
      } catch(dbErr) { console.warn('message insert:', dbErr.message); }
      res.json({ success:true, id });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  // GET /api/partner-messages
  app.get('/api/partner-messages', async (req, res) => {
    try {
      const r = await db.query('SELECT * FROM partner_messages ORDER BY created_at DESC LIMIT 100');
      res.json({ messages: r.rows, total: r.rowCount });
    } catch(err) { res.status(500).json({ error:err.message, messages:[] }); }
  });

  // POST /api/partner-resources
  app.post('/api/partner-resources', async (req, res) => {
    try {
      const r = req.body;
      const id = `RES-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      try {
        await db.query(`
          INSERT INTO partner_resources (id, partner, type, description, value, region, status, expires_at, submitted_at)
          VALUES ($1,$2,$3,$4,$5,$6,'Available',$7,NOW())`,
          [id, r.partner, r.type, r.desc, r.value, r.region, r.expires||null]
        );
      } catch(dbErr) { console.warn('resource insert:', dbErr.message); }
      res.json({ success:true, id });
    } catch(err) { res.status(500).json({ error:err.message }); }
  });

  // GET /api/partner-resources
  app.get('/api/partner-resources', async (req, res) => {
    try {
      const r = await db.query("SELECT * FROM partner_resources WHERE status='Available' ORDER BY submitted_at DESC LIMIT 100");
      res.json({ resources: r.rows, total: r.rowCount });
    } catch(err) { res.status(500).json({ error:err.message, resources:[] }); }
  });

  console.log('[PartnerPortal] Routes registered: /api/partners/* /api/partner-messages/* /api/partner-resources/*');
}

async function createPartnerTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS partner_registry (
      id               VARCHAR(30) PRIMARY KEY,
      name             VARCHAR(200) NOT NULL,
      type             VARCHAR(100),
      tier             VARCHAR(20) DEFAULT 'network',
      country          VARCHAR(5),
      contact          VARCHAR(200),
      phone            VARCHAR(30),
      status           VARCHAR(20) DEFAULT 'Pending',
      data_access      JSONB DEFAULT '[]',
      briefing_cadence VARCHAR(20) DEFAULT 'bi-weekly',
      briefings_sent   INTEGER DEFAULT 0,
      last_brief_date  DATE,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_partner_tier   ON partner_registry(tier);
    CREATE INDEX IF NOT EXISTS idx_partner_status ON partner_registry(status);

    CREATE TABLE IF NOT EXISTS partner_messages (
      id           VARCHAR(30) PRIMARY KEY,
      from_partner VARCHAR(200),
      to_partner   VARCHAR(200),
      subject      VARCHAR(500),
      body         TEXT,
      urgent       BOOLEAN DEFAULT FALSE,
      message_type VARCHAR(20) DEFAULT 'direct',
      read         BOOLEAN DEFAULT FALSE,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_msg_to   ON partner_messages(to_partner);
    CREATE INDEX IF NOT EXISTS idx_msg_date ON partner_messages(created_at DESC);

    CREATE TABLE IF NOT EXISTS partner_resources (
      id           VARCHAR(30) PRIMARY KEY,
      partner      VARCHAR(200),
      type         VARCHAR(50),
      description  TEXT,
      value        VARCHAR(100),
      region       VARCHAR(200),
      status       VARCHAR(20) DEFAULT 'Available',
      expires_at   DATE,
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_res_type   ON partner_resources(type);
    CREATE INDEX IF NOT EXISTS idx_res_status ON partner_resources(status);
  `);
  console.log('[PartnerPortal] Tables ready: partner_registry, partner_messages, partner_resources');
}


const express = require('express');
const _partnerRouter = express.Router();
_partnerRouter.get('/', async (req, res) => { res.json({ partners:[], total:0 }); });
_partnerRouter.post('/', async (req, res) => { res.json({ success:true, id:'P'+Date.now() }); });
module.exports = _partnerRouter;
module.exports.registerPartnerRoutes = registerPartnerRoutes;
module.exports.createPartnerTables = createPartnerTables;

