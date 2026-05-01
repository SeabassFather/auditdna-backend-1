'use strict';
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const signToken = (payload) => {
  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const body = Buffer.from(JSON.stringify({...payload,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400})).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET||'auditdna_secret_2026').update(header+'.'+body).digest('base64url');
  return header+'.'+body+'.'+sig;
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await pool.query('SELECT * FROM auth_users WHERE email = $1', [email]);
    if (!r.rows.length) return res.status(401).json({ ok:false, error:'Invalid credentials' });
    const user = r.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash||user.password||'');
    if (!valid) return res.status(401).json({ ok:false, error:'Invalid credentials' });
    const token = signToken({ id:user.id, email:user.email, role:user.role });
    res.json({ ok:true, token, user:{ id:user.id, email:user.email, role:user.role, name:user.name } });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      'INSERT INTO auth_users (email, password_hash, name, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,role',
      [email, hash, name, role||'agent', 'active']
    );
    res.json({ ok:true, user:r.rows[0] });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/refresh', async (req, res) => {
  res.json({ ok:true, token: signToken({ refreshed:true }) });
});

router.post('/logout', async (req, res) => {
  res.json({ ok:true, message:'Logged out' });
});

router.get('/me', async (req, res) => {
  res.json({ ok:true, user:{ id:1, email:'saul@mexausafg.com', role:'owner' } });
});

router.post('/change-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE auth_users SET password_hash=$1 WHERE email=$2', [hash, email]);
    res.json({ ok:true, message:'Password updated' });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

module.exports = router;

