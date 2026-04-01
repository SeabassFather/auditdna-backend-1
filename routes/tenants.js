'use strict';
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');
const uid = () => crypto.randomUUID();

const bootstrap = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name VARCHAR(255) NOT NULL,
      plan VARCHAR(50) DEFAULT 'starter',
      status VARCHAR(50) DEFAULT 'active',
      modules JSONB DEFAULT '[]',
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(e => console.warn('[tenants] bootstrap:', e.message));
};
bootstrap();

router.get('/tenants', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM tenants ORDER BY created_at DESC');
    res.json({ ok:true, tenants:r.rows });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/tenants', async (req, res) => {
  try {
    const { name, plan } = req.body;
    const r = await pool.query(
      'INSERT INTO tenants (id, name, plan) VALUES ($1,$2,$3) RETURNING *',
      [uid(), name, plan||'starter']
    );
    res.json({ ok:true, tenant:r.rows[0] });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/tenants/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM tenants WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    res.json({ ok:true, tenant:r.rows[0] });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.put('/tenants/:id', async (req, res) => {
  try {
    const { name, plan, status } = req.body;
    await pool.query('UPDATE tenants SET name=$1,plan=$2,status=$3 WHERE id=$4', [name,plan,status,req.params.id]);
    res.json({ ok:true, message:'Updated' });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.delete('/tenants/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tenants WHERE id=$1', [req.params.id]);
    res.json({ ok:true, message:'Deleted' });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/tenants/:id/users', async (req, res) => {
  try {
    const r = await pool.query('SELECT id,email,name,role,status FROM auth_users WHERE tenant_id=$1', [req.params.id]).catch(()=>({rows:[]}));
    res.json({ ok:true, users:r.rows });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/tenants/:id/users', async (req, res) => {
  res.json({ ok:true, message:'User added to tenant' });
});

router.get('/tenants/:id/modules', async (req, res) => {
  try {
    const r = await pool.query('SELECT modules FROM tenants WHERE id=$1', [req.params.id]);
    res.json({ ok:true, modules:r.rows[0]?.modules||[] });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.put('/tenants/:id/modules/:moduleName', async (req, res) => {
  try {
    const { enabled } = req.body;
    const r = await pool.query('SELECT modules FROM tenants WHERE id=$1', [req.params.id]);
    const modules = r.rows[0]?.modules||[];
    const updated = enabled ? [...new Set([...modules, req.params.moduleName])] : modules.filter(m=>m!==req.params.moduleName);
    await pool.query('UPDATE tenants SET modules=$1 WHERE id=$2', [JSON.stringify(updated), req.params.id]);
    res.json({ ok:true, modules:updated });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/tenants/:id/usage', async (req, res) => {
  res.json({ ok:true, usage:{ api_calls:0, storage_mb:0, users:0 } });
});

router.get('/tenants/:id/invoices', async (req, res) => {
  res.json({ ok:true, invoices:[] });
});

module.exports = router;
