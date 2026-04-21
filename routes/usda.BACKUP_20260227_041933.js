// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// USDA MARS API ROUTES - LIVE INTEGRATION
// Mexausa Food Group, Inc. | AuditDNA Platform
// Auto-mounts at: /api/usda/* (via server.js auto-loader)
// Deps: ZERO (native https + Buffer only)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require('express');
const https = require('https');
const router = express.Router();

const API_KEY = process.env.USDA_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';
const AMS_HOST = 'marsapi.ams.usda.gov';
const AMS_PATH = '/services/v1.2';
const NASS_HOST = 'quickstats.nass.usda.gov';
const FDA_HOST = 'api.fda.gov';

// MARS uses HTTP Basic Auth: username=api_key, password=empty
const basicAuth = 'Basic ' + Buffer.from(API_KEY + ':').toString('base64');

console.log('[USDA] Route loaded. API key:', API_KEY ? 'SET' : 'MISSING');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPER: HTTPS GET with Basic Auth (for AMS MARS)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function marsGet(path, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: AMS_HOST,
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': basicAuth },
      timeout: timeoutMs
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('MARS API timeout')); });
    req.end();
  });
}

// HELPER: HTTPS GET without auth (NASS, FDA)
function publicGet(host, path, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host, path, method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: timeoutMs
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('API timeout')); });
    req.end();
  });
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. GET /api/usda/commodities
//    Returns full list of 500+ USDA tracked commodities
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/commodities', async (req, res) => {
  try {
    const r = await marsGet(AMS_PATH + '/commodities');
    res.json({ success: true, data: r.data });
  } catch (err) {
    console.error('[USDA] commodities:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. GET /api/usda/reports
//    Table of contents - every available USDA report
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/reports', async (req, res) => {
  try {
    const r = await marsGet(AMS_PATH + '/reports');
    res.json({ success: true, data: r.data });
  } catch (err) {
    console.error('[USDA] reports:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. GET /api/usda/report/:slugId
//    Specific report by slug ID
//    ?lastReports=1  (most recent only)
//    ?commodity=Avocados&date=02/27/2026
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/report/:slugId', async (req, res) => {
  try {
    const { slugId } = req.params;
    const { lastReports, commodity, date } = req.query;

    let p = AMS_PATH + '/reports/' + encodeURIComponent(slugId);
    const params = [];
    if (lastReports) params.push('lastReports=' + lastReports);
    const qParts = [];
    if (commodity) qParts.push('commodity=' + encodeURIComponent(commodity));
    if (date) qParts.push('report_date=' + encodeURIComponent(date));
    if (qParts.length) params.push('q=' + qParts.join(';'));
    if (params.length) p += '?' + params.join('&');

    const r = await marsGet(p);
    res.json({ success: true, data: r.data });
  } catch (err) {
    console.error('[USDA] report/' + req.params.slugId + ':', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4. GET /api/usda/terminal-markets
//    Wholesale pricing from 13 US terminal markets
//    ?commodity=Avocados&location=Los Angeles&date=02/27/2026
//    ?group=Fruits  or  ?group=Vegetables
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/terminal-markets', async (req, res) => {
  try {
    const { commodity, date, location, group } = req.query;
    const qParts = [];
    if (commodity) qParts.push('commodity=' + encodeURIComponent(commodity));
    if (date) qParts.push('report_date=' + encodeURIComponent(date));
    if (location) qParts.push('city_name=' + encodeURIComponent(location));

    let p = AMS_PATH + '/reports';
    const params = [];
    if (qParts.length) params.push('q=' + qParts.join(';'));
    params.push('report_type=Terminal');
    if (group) params.push('group=' + encodeURIComponent(group));
    p += '?' + params.join('&');

    const r = await marsGet(p, 45000);
    res.json({ success: true, data: r.data });
  } catch (err) {
    console.error('[USDA] terminal-markets:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5. GET /api/usda/market-types
//    All market type categories
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/market-types', async (req, res) => {
  try {
    const r = await marsGet(AMS_PATH + '/marketTypes');
    res.json({ success: true, data: r.data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 6. GET /api/usda/offices
//    AMS Market News field offices
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/offices', async (req, res) => {
  try {
    const r = await marsGet(AMS_PATH + '/offices');
    res.json({ success: true, data: r.data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 7. GET /api/usda/search/:term
//    Quick commodity search across reports
//    PRIMARY search endpoint for frontend commodity browser
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/search/:term', async (req, res) => {
  try {
    const term = encodeURIComponent(req.params.term);
    const r = await marsGet(AMS_PATH + '/reports?q=commodity=' + term + '&lastReports=1');
    res.json({ success: true, searchTerm: req.params.term, data: r.data });
  } catch (err) {
    console.error('[USDA] search/' + req.params.term + ':', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 8. GET /api/usda/nass
//    NASS QuickStats - historical production & pricing
//    ?commodity=AVOCADOS&year=2024&state=CALIFORNIA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/nass', async (req, res) => {
  try {
    const { commodity, year, state } = req.query;
    const params = new URLSearchParams({
      key: API_KEY,
      source_desc: 'SURVEY',
      sector_desc: 'CROPS',
      commodity_desc: (commodity || 'AVOCADOS').toUpperCase(),
      statisticcat_desc: 'PRICE RECEIVED',
      agg_level_desc: state ? 'STATE' : 'NATIONAL',
      format: 'JSON'
    });
    if (year) params.set('year', year);
    if (state) params.set('state_name', state.toUpperCase());

    const r = await publicGet(NASS_HOST, '/api/api_GET/?' + params.toString());
    res.json({ success: true, data: r.data });
  } catch (err) {
    console.error('[USDA] NASS:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 9. GET /api/usda/nass/5year/:commodity
//    5-year price history for trend charts
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/nass/5year/:commodity', async (req, res) => {
  try {
    const commodity = req.params.commodity.toUpperCase();
    const curYear = new Date().getFullYear();
    const results = [];

    for (let y = curYear - 5; y <= curYear; y++) {
      try {
        const params = new URLSearchParams({
          key: API_KEY, source_desc: 'SURVEY', sector_desc: 'CROPS',
          commodity_desc: commodity, statisticcat_desc: 'PRICE RECEIVED',
          year: y.toString(), agg_level_desc: 'NATIONAL', format: 'JSON'
        });
        const r = await publicGet(NASS_HOST, '/api/api_GET/?' + params.toString(), 10000);
        if (r.data && r.data.data && r.data.data.length) {
          results.push({ year: y, records: r.data.data });
        }
      } catch (e) { /* year may lack data */ }
    }

    res.json({ success: true, commodity, years: results });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 10. GET /api/usda/fda/recalls
//     FDA food recalls & enforcement
//     ?search=avocado&limit=25
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/fda/recalls', async (req, res) => {
  try {
    const { search, limit } = req.query;
    const params = new URLSearchParams({ limit: limit || '25' });
    if (search) params.set('search', 'product_description:"' + search + '"');

    const r = await publicGet(FDA_HOST, '/food/enforcement.json?' + params.toString());
    res.json({ success: true, data: r.data });
  } catch (err) {
    console.error('[USDA] FDA recalls:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 11. GET /api/usda/city/:city
//     Pricing for a specific terminal market city
//     city: LA, CHICAGO, NY, MIAMI, DALLAS, SF, ATLANTA, BOSTON,
//           PHILADELPHIA, DETROIT, COLUMBIA, BALTIMORE, ASHEVILLE
//     ?type=fruit  or  ?type=veg  (default: both)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const CITY_SLUGS = {
  'LA':           { fruit: 2486, veg: 2487 },
  'CHICAGO':      { fruit: 2510, veg: 2511 },
  'NY':           { fruit: 2498, veg: 2499 },
  'MIAMI':        { fruit: 2522, veg: 2523 },
  'DALLAS':       { fruit: 2534, veg: 2535 },
  'SF':           { fruit: 2322, veg: 2323 },
  'ATLANTA':      { fruit: 2546, veg: 2547 },
  'BOSTON':        { fruit: 2558, veg: 2559 },
  'PHILADELPHIA': { fruit: 2570, veg: 2571 },
  'DETROIT':      { fruit: 2582, veg: 2583 },
  'COLUMBIA':     { fruit: 2594, veg: 2595 },
  'BALTIMORE':    { fruit: 2606, veg: 2607 },
  'ASHEVILLE':    { fruit: 2618, veg: 2619 }
};

router.get('/city/:city', async (req, res) => {
  try {
    const city = req.params.city.toUpperCase();
    const type = (req.query.type || 'all').toLowerCase();
    const slugs = CITY_SLUGS[city];

    if (!slugs) {
      return res.status(404).json({
        success: false, error: 'Unknown city: ' + city,
        available: Object.keys(CITY_SLUGS)
      });
    }

    const targets = [];
    if (type === 'all' || type === 'fruit') targets.push({ label: 'fruit', slug: slugs.fruit });
    if (type === 'all' || type === 'veg' || type === 'vegetable') targets.push({ label: 'veg', slug: slugs.veg });

    const results = [];
    for (const t of targets) {
      try {
        const r = await marsGet(AMS_PATH + '/reports/' + t.slug + '?lastReports=1');
        results.push({ type: t.label, slug: t.slug, data: r.data });
      } catch (e) {
        results.push({ type: t.label, slug: t.slug, error: e.message });
      }
    }

    res.json({ success: true, city, results });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 12. GET /api/usda/cities
//     Available terminal market cities list
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/cities', (req, res) => {
  res.json({ success: true, cities: Object.keys(CITY_SLUGS), detail: CITY_SLUGS });
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 13. GET /api/usda/mexico-crossings
//     Mexico border crossing produce reports
//     ?commodity=Avocados
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/mexico-crossings', async (req, res) => {
  try {
    const { commodity } = req.query;
    let p = AMS_PATH + '/reports?q=slug_name=Mexico Crossing';
    if (commodity) p += ';commodity=' + encodeURIComponent(commodity);
    p += '&lastReports=1';

    const r = await marsGet(p, 45000);
    res.json({ success: true, data: r.data });
  } catch (err) {
    console.error('[USDA] mexico-crossings:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 14. GET /api/usda/shipping-point
//     FOB pricing reports
//     ?commodity=Avocados&region=California
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/shipping-point', async (req, res) => {
  try {
    const { commodity, region } = req.query;
    const qParts = [];
    if (commodity) qParts.push('commodity=' + encodeURIComponent(commodity));
    if (region) qParts.push('region=' + encodeURIComponent(region));

    let p = AMS_PATH + '/reports?report_type=Shipping Point';
    if (qParts.length) p += '&q=' + qParts.join(';');
    p += '&lastReports=1';

    const r = await marsGet(p, 45000);
    res.json({ success: true, data: r.data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 15. GET /api/usda/movement
//     Shipment/movement reports
//     ?commodity=Strawberries
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/movement', async (req, res) => {
  try {
    const { commodity } = req.query;
    let p = AMS_PATH + '/reports?report_type=Movement';
    if (commodity) p += '&q=commodity=' + encodeURIComponent(commodity);
    p += '&lastReports=1';

    const r = await marsGet(p, 45000);
    res.json({ success: true, data: r.data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HEALTH CHECK
// GET /api/usda/health
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/health', async (req, res) => {
  try {
    const r = await marsGet(AMS_PATH + '/reports', 10000);
    res.json({
      success: true,
      apiKey: API_KEY ? 'configured' : 'missing',
      marsApi: r.status === 200 ? 'connected' : 'error',
      endpoints: 15,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      success: false,
      apiKey: API_KEY ? 'configured' : 'missing',
      marsApi: 'unreachable',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});


module.exports = router;

