const express = require('express');
const router = express.Router();
let pool; try { pool = require('../db'); } catch(e) {} pool = pool || global.db;

pool.query(`
  CREATE TABLE IF NOT EXISTS blast_templates (
    id SERIAL PRIMARY KEY,
    template_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(80) DEFAULT 'general',
    subject VARCHAR(300),
    body TEXT,
    flyer_html TEXT,
    type VARCHAR(20) DEFAULT 'email',
    commodity VARCHAR(80),
    language VARCHAR(10) DEFAULT 'EN',
    times_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).catch(()=>{});

// List templates
router.get('/', async (req,res) => {
  try {
    const {category,type,commodity} = req.query;
    const where=[]; const params=[];
    if(category){params.push(category);where.push(`category=$${params.length}`);}
    if(type){params.push(type);where.push(`type=$${params.length}`);}
    if(commodity){params.push(`%${commodity}%`);where.push(`commodity ILIKE $${params.length}`);}
    const r=await pool.query(
      `SELECT id,template_number,name,category,subject,type,commodity,language,times_used,created_at
       FROM blast_templates ${where.length?'WHERE '+where.join(' AND '):''}
       ORDER BY template_number ASC`,params);
    res.json({ok:true,templates:r.rows});
  } catch(e){res.status(500).json({error:e.message});}
});

// Get single template
router.get('/:num', async (req,res) => {
  try {
    const r=await pool.query('SELECT * FROM blast_templates WHERE template_number=$1',[req.params.num]);
    if(!r.rows[0]) return res.status(404).json({error:'Not found'});
    await pool.query('UPDATE blast_templates SET times_used=times_used+1 WHERE template_number=$1',[req.params.num]).catch(()=>{});
    res.json({ok:true,template:r.rows[0]});
  } catch(e){res.status(500).json({error:e.message});}
});

// Save / update template
router.post('/save', async (req,res) => {
  const {template_number,name,category,subject,body,flyer_html,type,commodity,language} = req.body;
  if(!template_number||!name) return res.status(400).json({error:'template_number and name required'});
  try {
    const r=await pool.query(`
      INSERT INTO blast_templates (template_number,name,category,subject,body,flyer_html,type,commodity,language)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (template_number) DO UPDATE SET
        name=$2,category=$3,subject=$4,body=$5,flyer_html=$6,type=$7,commodity=$8,language=$9,updated_at=NOW()
      RETURNING *`,
      [template_number,name,category||'general',subject||'',body||'',flyer_html||'',type||'email',commodity||'',language||'EN']
    );
    res.json({ok:true,template:r.rows[0]});
  } catch(e){res.status(500).json({error:e.message});}
});

// Delete template
router.delete('/:num', async (req,res) => {
  try {
    await pool.query('DELETE FROM blast_templates WHERE template_number=$1',[req.params.num]);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
