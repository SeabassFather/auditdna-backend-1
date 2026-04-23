'use strict';
const express = require('express');
const router = express.Router();
const https = require('https');
const { classifyBatch, matchBuyersForInventory } = require('../services/contact-classifier');
const db = global.db || global.pgglobal;
const USDA_KEY = process.env.USDA_API_KEY || process.env.USDA_NASS_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';

const _cache = new Map();
const CACHE_TTL = 15 * 60 * 1000;
function cacheGet(k){ const e=_cache.get(k); if(e && Date.now()-e.t<CACHE_TTL) return e.v; return null; }
function cacheSet(k,v){ _cache.set(k,{t:Date.now(),v}); }

function usdaFetch(params){
  return new Promise((resolve,reject)=>{
    const qs = new URLSearchParams({ key: USDA_KEY, format:'JSON', ...params }).toString();
    const url = 'https://quickstats.nass.usda.gov/api/api_GET/?' + qs;
    https.get(url, r => {
      let data='';
      r.on('data', c => data+=c);
      r.on('end', () => { try { resolve(JSON.parse(data)); } catch(e){ resolve({data:[], error:data.slice(0,200)}); } });
    }).on('error', reject);
  });
}

function toUSDAName(q){
  const s = String(q).toUpperCase().trim();
  const map = {'AVOCADO':'AVOCADOS','ARTICHOKE':'ARTICHOKES','STRAWBERRY':'STRAWBERRIES','BLUEBERRY':'BLUEBERRIES','RASPBERRY':'RASPBERRIES','TOMATO':'TOMATOES','CUCUMBER':'CUCUMBERS','PEPPER':'PEPPERS','BELL PEPPER':'PEPPERS','LIME':'LIMES','LEMON':'LEMONS','ORANGE':'ORANGES','MANGO':'MANGOES','ONION':'ONIONS','CARROT':'CARROTS','MELON':'MELONS','WATERMELON':'WATERMELONS','GRAPE':'GRAPES','APPLE':'APPLES','PEAR':'PEARS','CHERRY':'CHERRIES','PEACH':'PEACHES'};
  return map[s] || s;
}

function fdaRecalls(commodity){
  return new Promise((resolve)=>{
    const q = encodeURIComponent('product_description:"' + commodity + '"');
    const url = 'https://api.fda.gov/food/enforcement.json?search=' + q + '&limit=5';
    https.get(url, r => {
      let data='';
      r.on('data', c => data+=c);
      r.on('end', () => { try { resolve(JSON.parse(data).results||[]); } catch(e){ resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

async function loadContacts(){
  if (!db) return [];
  let rows = [];
  try {
    const crm = await db.query("SELECT id, first_name, last_name, email, phone, company, city, state, country, notes, category FROM ag_contacts WHERE email IS NOT NULL AND email != ''");
    rows = crm.rows.map(r => ({ ...r, name:[r.first_name,r.last_name].filter(Boolean).join(' ').trim()||r.company||r.email, source:'CRM' }));
  } catch(e) { console.warn('[commodity-search] crm query failed:', e.message); }
  return classifyBatch(rows).results;
}

function buildLetter(commodity, buyerName, buyerRegion, lang){
  lang = lang || 'en';
  if (lang === 'es') {
    return {
      subject: 'Solicitud de cotizacion: ' + commodity + ' para ' + buyerRegion,
      html: '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fef8e7;border:1px solid #cba658;padding:24px;"><div style="color:#cba658;font-size:10px;letter-spacing:3px;font-weight:700;">MEXAUSA FOOD GROUP, INC.</div><div style="color:#0f172a;font-size:18px;margin:8px 0 20px 0;">Solicitud de Cotizacion</div><p>Estimado Productor,</p><p>Tengo un comprador confirmado (<strong>' + buyerName + '</strong>) en <strong>' + buyerRegion + '</strong> con necesidad inmediata de <strong>' + commodity + '</strong>. Por favor enviar:</p><ul><li>Precio FOB origen por caja</li><li>Volumen disponible por semana</li><li>Grado y certificaciones</li><li>Fecha de disponibilidad</li></ul><p>Responder a este correo o WhatsApp +52-646-340-2686.</p><p>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>PACA #20241168</p></div>'
    };
  }
  return {
    subject: 'Pricing request: ' + commodity + ' for ' + buyerRegion,
    html: '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fef8e7;border:1px solid #cba658;padding:24px;"><div style="color:#cba658;font-size:10px;letter-spacing:3px;font-weight:700;">MEXAUSA FOOD GROUP, INC.</div><div style="color:#0f172a;font-size:18px;margin:8px 0 20px 0;">Product Pricing Request</div><p>Dear Grower,</p><p>I have a confirmed buyer (<strong>' + buyerName + '</strong>) in <strong>' + buyerRegion + '</strong> with immediate need for <strong>' + commodity + '</strong>. Please send:</p><ul><li>FOB origin price per case</li><li>Weekly volume available</li><li>Grade and certifications</li><li>Availability date</li></ul><p>Reply to this email or WhatsApp +52-646-340-2686.</p><p>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>PACA #20241168</p></div>'
  };
}

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q||'').trim();
    if (!q) return res.status(400).json({ error: 'q required' });
    const buyer = String(req.query.buyer || 'Confirmed Buyer');
    const region = String(req.query.region || 'North America');
    const lang = String(req.query.lang || 'en');
    const ck = 'search:' + q.toLowerCase();
    const cached = cacheGet(ck);
    if (cached) return res.json({ ...cached, cached: true });
    const uname = toUSDAName(q);
    const [uAcres, uPrice, fda, contacts] = await Promise.all([
      usdaFetch({ commodity_desc: uname, statisticcat_desc: 'AREA BEARING', year__GE: '2020' }).catch(()=>({data:[]})),
      usdaFetch({ commodity_desc: uname, statisticcat_desc: 'PRICE RECEIVED', year__GE: '2020' }).catch(()=>({data:[]})),
      fdaRecalls(q),
      loadContacts(),
    ]);
    const qLower = q.toLowerCase();
    const growers = contacts.filter(c => c.role === 'grower' && c.commodities && c.commodities.some(x => x.toLowerCase().includes(qLower) || qLower.includes(x.toLowerCase())));
    const buyers = matchBuyersForInventory(contacts, { commodity_category: q });
    const priceRecs = (uPrice.data||[]).filter(r => r.Value && r.Value !== '(D)' && !isNaN(parseFloat(r.Value)));
    const prices = priceRecs.map(r => parseFloat(r.Value));
    const priceSummary = prices.length ? { samples: prices.length, min: Math.min(...prices), max: Math.max(...prices), avg: (prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(2), latest: priceRecs[0] } : null;
    const acresRecs = (uAcres.data||[]).filter(r => r.Value && r.Value !== '(D)' && !isNaN(parseFloat(String(r.Value).replace(/,/g,''))));
    const byState = {};
    for (const r of acresRecs) {
      const st = r.state_name || 'UNKNOWN';
      const v = parseFloat(String(r.Value).replace(/,/g,''));
      if (!byState[st] || Number(r.year) > Number(byState[st].year)) byState[st] = { value: v, year: r.year, unit: r.unit_desc };
    }
    const letter = buildLetter(q, buyer, region, lang);
    const result = {
      query: q, usda_commodity: uname, usda_key_status: 'live',
      price_summary: priceSummary, production_footprint: byState,
      fda_recalls: fda.slice(0,5).map(f => ({ recall_number:f.recall_number, status:f.status, classification:f.classification, product:f.product_description && f.product_description.slice(0,120), reason:f.reason_for_recall && f.reason_for_recall.slice(0,120), date:f.recall_initiation_date })),
      growers: growers.map(g => ({ id:g.id, name:g.name, email:g.email, phone:g.phone, company:g.company, country:g.country, state:g.state, commodities:g.commodities })),
      buyers: buyers.map(b => ({ id:b.id, name:b.name, email:b.email, company:b.company, country:b.country, role:b.role })),
      letter,
      counts: { growers: growers.length, buyers: buyers.length, usda_price_records: prices.length, usda_production_records: acresRecs.length, fda_alerts: fda.length },
      generated_at: new Date().toISOString(),
    };
    try { if (global.brain && typeof global.brain.ingest === 'function') global.brain.ingest('commodity_search', { q, growers: growers.length, buyers: buyers.length }); } catch(e) {}
    cacheSet(ck, result);
    res.json(result);
  } catch (err) { console.error('[commodity/search]', err.message); res.status(500).json({ error: err.message }); }
});

router.post('/blast', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.q) return res.status(400).json({ error: 'q required' });
    if (b.confirm !== 'YES_BLAST') return res.status(400).json({ error: 'pass confirm=YES_BLAST' });
    const contacts = await loadContacts();
    const qL = b.q.toLowerCase();
    const growers = contacts.filter(c => c.role === 'grower' && c.email && c.commodities && c.commodities.some(x => x.toLowerCase().includes(qL) || qL.includes(x.toLowerCase())));
    if (!growers.length) return res.json({ sent: 0, note: 'no matched growers' });
    const letter = buildLetter(b.q, b.buyer||'Confirmed Buyer', b.region||'North America', b.lang||'en');
    const nm = require('nodemailer');
    const t = nm.createTransport({ host: process.env.SMTP_HOST||'smtp.gmail.com', port: parseInt(process.env.SMTP_PORT||'587'), secure: process.env.SMTP_SECURE==='true', auth: { user: process.env.SMTP_USER||'sgarcia1911@gmail.com', pass: process.env.SMTP_PASS||process.env.GMAIL_APP_PASS||'' }, tls: { rejectUnauthorized: false } });
    let sent=0, failed=0;
    for (const g of growers) {
      try { await t.sendMail({ from: 'Saul Garcia | Mexausa Food Group <Saul@mexausafg.com>', to: g.email, subject: letter.subject, html: letter.html }); sent++; } catch(e){ failed++; }
    }
    res.json({ total_growers: growers.length, sent, failed, commodity: b.q });
  } catch (err) { console.error('[commodity/blast]', err.message); res.status(500).json({ error: err.message }); }
});

module.exports = router;
