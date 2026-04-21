// ================================================================
// USDA ORGANIC REGISTRY ROUTE
// MiniAPI — C:\AuditDNA\backend\MiniAPI\routes\usdaRegistry.js
// Endpoints:
//   GET /api/usda-registry              — search registry
//   GET /api/usda-registry?commodity=X&country=Y
//   GET /api/usda-registry/refresh      — force refresh cache
// ================================================================

import express from 'express';
import https from 'https';

const router = express.Router();

// In-memory cache
let registryCache = [];
let lastFetched = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// USDA API Key
const USDA_KEY = process.env.USDA_API_KEY || '4F158DB1-85C2-3243-BFFA-58B53FB40D23';

// Fetch from USDA NASS quickstats
function fetchUSDA(commodity) {
  return new Promise((resolve) => {
    const comm = encodeURIComponent((commodity || 'AVOCADO').toUpperCase());
    const url = `https://quickstats.nass.usda.gov/api/api_GET/?key=${USDA_KEY}&commodity_desc=${comm}&statisticcat_desc=PRICE+RECEIVED&unit_desc=%24+%2F+CWT&year__GE=2020&format=JSON`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).data || []); }
        catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

// GET /api/usda-registry
router.get('/', async (req, res) => {
  try {
    const { commodity, country, refresh } = req.query;
    const now = Date.now();
    const needsRefresh = refresh === 'true' || !lastFetched || (now - lastFetched) > CACHE_TTL_MS || registryCache.length === 0;

    if (needsRefresh) {
      const commodities = ['AVOCADO','STRAWBERRY','TOMATO','PEPPER','BROCCOLI'];
      let allData = [];
      for (const c of commodities) {
        const rows = await fetchUSDA(c);
        allData = allData.concat(rows.slice(0, 20).map(r => ({
          commodity: r.commodity_desc || c,
          year: r.year,
          value: r.Value,
          unit: r.unit_desc,
          state: r.state_name || 'National',
          country: 'USA',
          source: 'USDA NASS'
        })));
      }
      registryCache = allData;
      lastFetched = now;
    }

    let results = registryCache;
    if (commodity) results = results.filter(r => r.commodity.toLowerCase().includes(commodity.toLowerCase()));
    if (country)   results = results.filter(r => (r.country||'').toLowerCase().includes(country.toLowerCase()));

    res.json({ success: true, count: results.length, fetched: lastFetched ? new Date(lastFetched).toISOString() : null, data: results.slice(0,200) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/usda-registry/refresh
router.get('/refresh', async (req, res) => {
  registryCache = [];
  lastFetched = null;
  res.json({ success: true, message: 'Cache cleared' });
});

export default router;

