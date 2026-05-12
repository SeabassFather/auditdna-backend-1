const express = require('express');
const router = express.Router();
const pool = require('../db');

// Cache layer — avoid hammering free APIs
const cache = {};
function cached(key, ttlMs, fn) {
  const now = Date.now();
  if (cache[key] && (now - cache[key].ts) < ttlMs) return Promise.resolve(cache[key].data);
  return fn().then(data => { cache[key] = { data, ts: now }; return data; });
}

const HEADERS = { 'Accept':'application/json', 'User-Agent':'Mexausa-AuditDNA/1.0' };

// ── USDA AMS MARKET NEWS — real-time commodity FOB prices ─────────────────
router.get('/market-news', async (req, res) => {
  const { commodity='tomatoes', market='Los Angeles' } = req.query;
  try {
    const data = await cached(`market-news-${commodity}-${market}`, 15*60*1000, async () => {
      // USDA AMS Market News API v1.2
      const r = await fetch(
        `https://marsapi.ams.usda.gov/services/v1.2/reports?commodity=${encodeURIComponent(commodity)}&market_location_name=${encodeURIComponent(market)}&limit=10&sort_by=report_date&sort_order=desc`,
        { headers: HEADERS }
      ).then(r=>r.json()).catch(()=>({results:[]}));
      return r;
    });
    res.json({ ok:true, source:'USDA AMS Market News API', commodity, market, data });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── USDA AMS — ALL TERMINAL MARKET PRICES for a commodity ─────────────────
router.get('/terminal-prices', async (req, res) => {
  const { commodity='broccoli' } = req.query;
  try {
    const data = await cached(`terminal-${commodity}`, 30*60*1000, async () => {
      const markets = ['Los Angeles','Chicago','New York','Dallas','Atlanta','Miami','Seattle','Denver','Boston','Philadelphia'];
      const results = await Promise.all(markets.map(async market => {
        try {
          const r = await fetch(
            `https://marsapi.ams.usda.gov/services/v1.2/reports?commodity=${encodeURIComponent(commodity)}&market_location_name=${encodeURIComponent(market)}&limit=1&sort_by=report_date&sort_order=desc`,
            { headers: HEADERS, signal: AbortSignal.timeout(5000) }
          ).then(r=>r.json()).catch(()=>({results:[]}));
          const latest = r.results?.[0];
          return { market, commodity,
            high_price: latest?.high_price, low_price: latest?.low_price,
            mostly_high: latest?.mostly_high, mostly_low: latest?.mostly_low,
            report_date: latest?.report_date, unit: latest?.unit_of_sale,
            variety: latest?.variety, grade: latest?.grade };
        } catch(_) { return { market, commodity, error: true }; }
      }));
      return results.filter(r=>!r.error && r.high_price);
    });
    res.json({ ok:true, source:'USDA AMS Terminal Markets', commodity, markets:data });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── USDA NASS — crop production forecasts, acreage, yield by state ─────────
router.get('/nass/crops', async (req, res) => {
  const { commodity='BROCCOLI', state='CA', year=new Date().getFullYear() } = req.query;
  const NASS_KEY = process.env.USDA_NASS_API_KEY || 'DEMO_KEY';
  try {
    const data = await cached(`nass-${commodity}-${state}-${year}`, 24*60*60*1000, async () => {
      const r = await fetch(
        `https://quickstats.nass.usda.gov/api/api_GET/?key=${NASS_KEY}&commodity_desc=${encodeURIComponent(commodity)}&state_alpha=${state}&year=${year}&statisticcat_desc=PRODUCTION&format=JSON`,
        { headers: HEADERS, signal: AbortSignal.timeout(8000) }
      ).then(r=>r.json()).catch(()=>({data:[]}));
      return r.data || [];
    });
    res.json({ ok:true, source:'USDA NASS Quick Stats API', commodity, state, year, data });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── USDA NASS — acreage planted/harvested ──────────────────────────────────
router.get('/nass/acreage', async (req, res) => {
  const { commodity='BROCCOLI', state='CA' } = req.query;
  const NASS_KEY = process.env.USDA_NASS_API_KEY || 'DEMO_KEY';
  try {
    const data = await cached(`nass-acres-${commodity}-${state}`, 24*60*60*1000, async () => {
      const r = await fetch(
        `https://quickstats.nass.usda.gov/api/api_GET/?key=${NASS_KEY}&commodity_desc=${encodeURIComponent(commodity)}&state_alpha=${state}&statisticcat_desc=AREA HARVESTED&format=JSON&year__GE=${new Date().getFullYear()-3}`,
        { headers: HEADERS, signal: AbortSignal.timeout(8000) }
      ).then(r=>r.json()).catch(()=>({data:[]}));
      return r.data || [];
    });
    res.json({ ok:true, source:'USDA NASS Quick Stats', commodity, state, data });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── USDA ERS — food supply chain, import/export volumes ───────────────────
router.get('/ers/trade', async (req, res) => {
  try {
    const data = await cached('ers-trade', 24*60*60*1000, async () => {
      // ERS Fruit & Vegetable prices dataset
      const r = await fetch(
        'https://api.ers.usda.gov/data/fruit-vegetable-prices?category=vegetables&format=json',
        { headers: HEADERS, signal: AbortSignal.timeout(8000) }
      ).then(r=>r.json()).catch(()=>null);

      // Also fetch ERS Food Expenditure Series
      const exp = await fetch(
        'https://api.ers.usda.gov/data/foodexpenditures?category=freshandprocessed&format=json',
        { headers: HEADERS, signal: AbortSignal.timeout(8000) }
      ).then(r=>r.json()).catch(()=>null);

      return { prices: r, expenditures: exp };
    });
    res.json({ ok:true, source:'USDA ERS API', data,
      investor_note:'ERS data shows $800B+ US food expenditure annually — fresh produce represents ~15% ($120B+)',
      mexausa_share:'At 2.5% commission on $2.4M annual volume = $60K yr 1 → scale to $240K at $10M volume' });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── USDA AMS LPMS — Livestock, Poultry & Grain Market News ────────────────
router.get('/lpms', async (req, res) => {
  const { type='cattle', region='national' } = req.query;
  try {
    const data = await cached(`lpms-${type}-${region}`, 60*60*1000, async () => {
      // LPMS API endpoints
      const endpoints = {
        cattle:  'https://mpr.datamart.ams.usda.gov/services/public/v1/reports?slug_id=LM_CT150',
        hogs:    'https://mpr.datamart.ams.usda.gov/services/public/v1/reports?slug_id=LM_HG201',
        sheep:   'https://mpr.datamart.ams.usda.gov/services/public/v1/reports?slug_id=LM_SH004',
        poultry: 'https://mpr.datamart.ams.usda.gov/services/public/v1/reports?slug_id=PY_LS711',
        dairy:   'https://mpr.datamart.ams.usda.gov/services/public/v1/reports?slug_id=DY_WO1100',
        grain:   'https://www.ams.usda.gov/mnreports/gx_gr110.txt',
      };
      const url = endpoints[type] || endpoints.cattle;
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
        .then(r=>r.json()).catch(()=>({results:[]}));
      return r.results || r.data || [];
    });
    res.json({ ok:true, source:'USDA AMS LPMS — Livestock, Poultry & Grain Market News', type, data: Array.isArray(data)?data.slice(0,20):data,
      loaf_note:'Wire to LOAF dairy/livestock sections — growers post excess, buyers bid via LPMS price benchmarks' });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── UNIFIED PRICE FEED — combines all USDA sources for one commodity ───────
router.get('/unified-feed', async (req, res) => {
  const { commodity='broccoli' } = req.query;
  try {
    const [terminal, nass] = await Promise.all([
      fetch(`http://localhost:${process.env.PORT||5050}/api/usda-data/terminal-prices?commodity=${commodity}`)
        .then(r=>r.json()).catch(()=>({markets:[]})),
      fetch(`http://localhost:${process.env.PORT||5050}/api/usda-data/nass/crops?commodity=${commodity.toUpperCase()}&state=CA`)
        .then(r=>r.json()).catch(()=>({data:[]})),
    ]);

    const prices = terminal.markets || [];
    const avgHigh = prices.length ? prices.reduce((s,m)=>s+parseFloat(m.high_price||0),0)/prices.length : 0;
    const avgLow  = prices.length ? prices.reduce((s,m)=>s+parseFloat(m.low_price||0),0)/prices.length : 0;

    res.json({
      ok: true,
      commodity,
      summary: {
        avg_fob_high: avgHigh.toFixed(2),
        avg_fob_low:  avgLow.toFixed(2),
        markets_reporting: prices.length,
        best_market: prices.sort((a,b)=>parseFloat(b.high_price||0)-parseFloat(a.high_price||0))[0]?.market,
      },
      terminal_markets: prices,
      nass_production: nass.data?.slice(0,5) || [],
      sources: ['USDA AMS Market News API','USDA NASS Quick Stats'],
      mexausa_commission_2pct: (avgHigh * 0.02).toFixed(2),
      mexausa_commission_3pct: (avgHigh * 0.03).toFixed(2),
    });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── BORDER CROSSING DATA — AMS weekly ─────────────────────────────────────
router.get('/border', async (req, res) => {
  try {
    const data = await cached('border-crossings', 6*60*60*1000, async () => {
      const r = await fetch(
        'https://www.ams.usda.gov/mnreports/fv_mx100.txt',
        { headers: HEADERS, signal: AbortSignal.timeout(8000) }
      ).then(r=>r.text()).catch(()=>'');
      return { raw: r.slice(0,3000), fetched_at: new Date().toISOString() };
    });
    res.json({ ok:true, source:'USDA AMS Border Crossing Report', data });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ── PING SPOT PRICE INTEGRATION — fire price alerts from USDA data ─────────
router.post('/trigger-price-alerts', async (req, res) => {
  const { commodities=['broccoli','avocado','tomato','lettuce','strawberry'] } = req.body;
  const alerts = [];
  try {
    const activeAlerts = await pool.query(
      "SELECT * FROM price_alerts WHERE status='active'"
    ).catch(()=>({rows:[]}));

    for (const alert of activeAlerts.rows) {
      const commodity = alert.commodity?.toLowerCase();
      try {
        const r = await fetch(
          `http://localhost:${process.env.PORT||5050}/api/usda-data/terminal-prices?commodity=${commodity}`
        ).then(r=>r.json()).catch(()=>({markets:[]}));

        const markets = r.markets || [];
        if (!markets.length) continue;
        const avgPrice = markets.reduce((s,m)=>s+parseFloat(m.high_price||0),0)/markets.length;
        const trigger = parseFloat(alert.trigger_price||0);
        const changePct = ((avgPrice - trigger) / trigger) * 100;
        const fired = alert.alert_type==='drop' ? changePct <= -alert.threshold_pct : changePct >= alert.threshold_pct;
        if (fired) alerts.push({ commodity, avgPrice, trigger, changePct: changePct.toFixed(1), alert_id: alert.id });
      } catch(_) {}
    }
    res.json({ ok:true, checked: activeAlerts.rows.length, triggered: alerts.length, alerts });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
