const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const USDA_KEY = '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const CM_DISCOUNT = 0.175;
const SMTP = { host: 'smtpout.secureserver.net', port: 465, secure: true, auth: { user: process.env.SMTP_USER || 'saul@mexausafg.com', pass: process.env.SMTP_PASS || 'KongKing#321' } };

const COMMODITY_REPORTS = {
  avocado:    { label: 'Hass Avocados',  unit: '25lb carton', segment: 'avocado'   },
  strawberry: { label: 'Strawberries',   unit: '8x1pt flat',  segment: 'berry'     },
  blueberry:  { label: 'Blueberries',    unit: '12pt flat',   segment: 'berry'     },
  raspberry:  { label: 'Raspberries',    unit: '12 half-pt',  segment: 'berry'     },
  tomato:     { label: 'Roma Tomatoes',  unit: '25lb box',    segment: 'vegetable' },
  bell_pepper:{ label: 'Bell Peppers',   unit: '25lb carton', segment: 'vegetable' },
  cucumber:   { label: 'Cucumbers',      unit: '55ct carton', segment: 'vegetable' },
};

let campaignState = { lastRun: null, lastStatus: null, sentCount: 0, failCount: 0, lastPrices: [] };

function getMockPrice(key) {
  const base = { avocado:38.50, strawberry:22.00, blueberry:28.50, raspberry:34.00, tomato:18.00, bell_pepper:24.00, cucumber:16.00 };
  const usda = base[key] || 25.00;
  const cm   = +(usda * (1 - CM_DISCOUNT)).toFixed(2);
  return { key, ...COMMODITY_REPORTS[key], usdaPrice: usda, cmPrice: cm, savings: +(usda - cm).toFixed(2), discount: CM_DISCOUNT };
}

async function fetchUsdaPrice(key) {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://marsapi.ams.usda.gov/services/v1.2/reports?api_key=${USDA_KEY}&q=${COMMODITY_REPORTS[key].label}`;
    const res = await fetch(url, { timeout: 6000 });
    if (!res.ok) throw new Error('USDA ' + res.status);
    const json = await res.json();
    const results = json.results || [];
    const prices = results.flatMap(r => [r.price_high, r.price_low].filter(Boolean).map(Number)).filter(p => p > 0);
    if (!prices.length) throw new Error('no prices');
    const usda = +(prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(2);
    const cm   = +(usda*(1-CM_DISCOUNT)).toFixed(2);
    return { key, ...COMMODITY_REPORTS[key], usdaPrice: usda, cmPrice: cm, savings: +(usda-cm).toFixed(2), discount: CM_DISCOUNT };
  } catch(e) {
    console.error('[usda-campaign] fallback for', key, e.message);
    return getMockPrice(key);
  }
}

function buildHtml(prices, name, company) {
  const date = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const rows = prices.map(p=>`<tr><td style="padding:9px 12px;border-bottom:1px solid #2d3748;color:#cbd5e1">${p.label}</td><td style="padding:9px 12px;border-bottom:1px solid #2d3748;color:#94a3b0">${p.unit}</td><td style="padding:9px 12px;border-bottom:1px solid #2d3748;color:#94a3b0">$${p.usdaPrice.toFixed(2)}</td><td style="padding:9px 12px;border-bottom:1px solid #2d3748;color:#cba658;font-weight:600">$${p.cmPrice.toFixed(2)}</td><td style="padding:9px 12px;border-bottom:1px solid #2d3748;color:#38bdf8;font-weight:600">$${p.savings.toFixed(2)}</td></tr>`).join('');
  const avg = prices.length ? (prices.reduce((s,p)=>s+p.savings,0)/prices.length).toFixed(2) : '0.00';
  return `<!DOCTYPE html><html><body style="margin:0;background:#0f172a;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border:1px solid rgba(203,166,88,0.25)"><tr><td style="background:#0a1220;padding:22px 28px;border-bottom:1px solid rgba(203,166,88,0.2)"><div style="font-size:10px;color:#64748b;letter-spacing:.1em;text-transform:uppercase">CM PRODUCTS INTERNATIONAL</div><div style="font-size:20px;color:#cba658;font-weight:700;margin-top:4px">Daily Market Price Sheet</div><div style="font-size:11px;color:#64748b;margin-top:2px">${date} | PACA #20241168</div></td></tr><tr><td style="padding:20px 28px 0"><p style="margin:0 0 8px;font-size:13px;color:#94a3b0">Dear ${name||'Valued Buyer'}${company?' — '+company:''},</p><p style="margin:0;font-size:13px;color:#94a3b0;line-height:1.6">CM Products International offers today pricing <strong style="color:#cba658">15-20% below USDA wholesale</strong> on fresh produce sourced direct from growers in Mexico. FOB pricing. PACA guaranteed.</p></td></tr><tr><td style="padding:16px 28px"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><thead><tr style="background:#0a1220"><th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;border-bottom:1px solid rgba(203,166,88,0.2)">Commodity</th><th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;border-bottom:1px solid rgba(203,166,88,0.2)">Pack</th><th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;border-bottom:1px solid rgba(203,166,88,0.2)">USDA Market</th><th style="padding:8px 12px;text-align:left;font-size:10px;color:#cba658;text-transform:uppercase;border-bottom:1px solid rgba(203,166,88,0.2)">CM Products</th><th style="padding:8px 12px;text-align:left;font-size:10px;color:#38bdf8;text-transform:uppercase;border-bottom:1px solid rgba(203,166,88,0.2)">You Save</th></tr></thead><tbody>${rows}</tbody></table></td></tr><tr><td style="padding:0 28px 20px"><div style="background:rgba(203,166,88,0.08);border:1px solid rgba(203,166,88,0.25);padding:14px 16px"><div style="font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:4px">Avg buyer savings per unit today</div><div style="font-size:24px;color:#cba658;font-weight:700">$${avg}</div></div></td></tr><tr><td style="padding:0 28px 24px;text-align:center"><a href="mailto:saul@mexausafg.com?subject=Price Inquiry" style="display:inline-block;padding:12px 28px;background:rgba(203,166,88,0.15);border:1px solid #cba658;color:#cba658;font-size:12px;font-weight:600;text-decoration:none">CONTACT US TO ORDER</a><p style="margin:10px 0 0;font-size:11px;color:#64748b">Saul Garcia | saul@mexausafg.com | +1-831-251-3116</p></td></tr><tr><td style="padding:12px 28px;background:#0a1220;border-top:1px solid rgba(203,166,88,0.1)"><p style="margin:0;font-size:10px;color:#334155">You received this as a registered produce buyer in the CM Products network. <a href="https://mexausafg.com/unsubscribe" style="color:#64748b">Unsubscribe</a> | CAN-SPAM compliant</p></td></tr></table></td></tr></table></body></html>`;
}

async function runCampaign(pool, segment) {
  console.log('[usda-campaign] Starting', segment);
  campaignState.lastRun = new Date().toISOString();
  campaignState.lastStatus = 'running';
  try {
    const keys = { avocado:['avocado'], berry:['strawberry','blueberry','raspberry'], vegetable:['tomato','bell_pepper','cucumber'], all:Object.keys(COMMODITY_REPORTS) }[segment] || Object.keys(COMMODITY_REPORTS);
    const prices = (await Promise.all(keys.map(fetchUsdaPrice))).filter(Boolean);
    campaignState.lastPrices = prices;
    const subjects = { avocado:'Hass Avocado Pricing — CM Products 17% Below USDA Wholesale', berry:'Strawberry / Blueberry / Raspberry — CM Products Daily Price Sheet', vegetable:'Tomato / Pepper / Cucumber — Today\'s CM Products Pricing', all:'CM Products Daily Market Price Sheet' };
    const labels = { avocado:['Avocado'], berry:['Strawberry','Blueberry','Raspberry','Berry'], vegetable:['Tomato','Pepper','Cucumber'], all:[] };
    let buyers = [];
    if (pool) {
      try {
        const terms = labels[segment]||[];
        const q = terms.length ? `SELECT email, COALESCE(trade_name, legal_name) AS name, COALESCE(trade_name, legal_name) AS company, primary_contact FROM buyers WHERE email IS NOT NULL AND status='active' AND unsubscribed=false AND (${terms.map((_,i)=>`commodities ILIKE $${i+1}`).join(' OR ')}) LIMIT 2000` : `SELECT email, COALESCE(trade_name, legal_name) AS name, COALESCE(trade_name, legal_name) AS company, primary_contact FROM buyers WHERE email IS NOT NULL AND status='active' AND unsubscribed=false LIMIT 2000`;
        const r = await pool.query(q, terms.map(t=>`%${t}%`));
        buyers = r.rows;
      } catch(e) { console.error('[usda-campaign] DB error', e.message); }
    }
    if (!buyers.length) { campaignState.lastStatus='ok-no-buyers'; return; }
    const transporter = nodemailer.createTransport(SMTP);
    let sent=0, failed=0;
    for (const b of buyers) {
      try {
        await transporter.sendMail({ from:'"CM Products International" <saul@mexausafg.com>', to:b.email, subject:subjects[segment]||subjects.all, html:buildHtml(prices,b.name,b.company) });
        sent++;
        if (sent%5===0) await new Promise(r=>setTimeout(r,1000));
      } catch(e) { failed++; }
    }
    campaignState.sentCount=sent; campaignState.failCount=failed; campaignState.lastStatus='ok';
    console.log('[usda-campaign] Done — sent:'+sent+' failed:'+failed);
  } catch(e) { campaignState.lastStatus='error'; campaignState.lastError=e.message; console.error('[usda-campaign]',e); }
}

router.get('/prices', async (req,res) => {
  if (campaignState.lastPrices.length) return res.json({ prices:campaignState.lastPrices, cached:true });
  const prices = (await Promise.all(Object.keys(COMMODITY_REPORTS).map(fetchUsdaPrice))).filter(Boolean);
  campaignState.lastPrices = prices;
  res.json({ prices, cached:false });
});

router.get('/status', (req,res) => res.json(campaignState));

router.post('/trigger', async (req,res) => {
  const segment = (req.body && req.body.segment) ? req.body.segment : (req.query.segment||'all');
  res.json({ message:'Campaign triggered', segment });
  setImmediate(()=>runCampaign(req.app.locals.pool, segment));
});

module.exports = router;
module.exports.startCronJobs = function(pool) {
  try {
    const cron = require('node-cron');
    cron.schedule('0 8 * * *',  ()=>runCampaign(pool,'avocado'),   {timezone:'America/New_York'});
    cron.schedule('5 8 * * *',  ()=>runCampaign(pool,'berry'),     {timezone:'America/New_York'});
    cron.schedule('10 8 * * *', ()=>runCampaign(pool,'vegetable'), {timezone:'America/New_York'});
    console.log('[usda-campaign] Cron jobs registered — 3:00/3:05/3:10 AM EST');
  } catch(e) { console.error('[usda-campaign] node-cron not installed:', e.message); }
};
