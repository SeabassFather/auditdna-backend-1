// run_score_local.js
// Calls factor-matchmaker-service against the live Railway DB
// Bypasses HTTP and JWT - imports the service module directly
// Proves the deployed code path produces correct harvest_window

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const { Pool } = require('pg');

// Force-clear require cache so we get the freshly-patched service file
const svcPath = path.resolve(__dirname, 'services', 'factor-matchmaker-service.js');
delete require.cache[svcPath];
const svc = require(svcPath);

const pool = new Pool({
  host: 'hopper.proxy.rlwy.net',
  port: 55424,
  user: 'postgres',
  password: 'PMJobEqMsVuiwvFwHlHFUrGXarncSAQj',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const exports = Object.keys(svc).filter(k => typeof svc[k] === 'function');
  console.log('--- service exports ---');
  console.log(exports.join(', '));
  console.log('');

  // Try scoreDeals first (we know it exists from line 89)
  if (typeof svc.scoreDeals === 'function') {
    console.log('--- calling scoreDeals({ pool, deal_id: 1 }) ---');
    try {
      const result = await svc.scoreDeals({ pool, deal_id: 1 });
      console.log('SUCCESS - top-level keys:', Object.keys(result));

      // Look for harvest_window in any nested structure
      const json = JSON.stringify(result);
      console.log('');
      console.log('full response length:', json.length, 'chars');
      console.log('');

      if (json.match(/2027/)) {
        console.log('PASS: 2027 found in scoreDeals output');
        // Find context around 2027
        const idx = json.indexOf('2027');
        console.log('context: ...' + json.substring(Math.max(0, idx - 60), Math.min(json.length, idx + 80)) + '...');
      } else if (json.match(/TBD/)) {
        console.log('FAIL: TBD found in scoreDeals output');
        const idx = json.indexOf('TBD');
        console.log('context: ...' + json.substring(Math.max(0, idx - 60), Math.min(json.length, idx + 80)) + '...');
      } else {
        console.log('NEITHER 2027 nor TBD - dumping first 2000 chars:');
        console.log(json.substring(0, 2000));
      }
    } catch (e) {
      console.error('scoreDeals threw:', e.message);
      console.error(e.stack);
    }
  }

  console.log('');

  // Now try draftOutreach if exported (this is what /api/factor/draft calls)
  const draftFn = svc.draftOutreach || svc.draftPartnerOutreach || svc.generateDraft || svc.buildDraft;
  if (typeof draftFn === 'function') {
    const fnName = Object.keys(svc).find(k => svc[k] === draftFn);
    console.log(`--- calling ${fnName}({ pool, deal_id: 1, partner_code: 'FP_QPF' }) ---`);
    try {
      const draft = await draftFn({ pool, deal_id: 1, partner_code: 'FP_QPF' });
      console.log('SUCCESS - top-level keys:', Object.keys(draft));
      const text = draft.body_text || (draft.draft && draft.draft.body_text) || JSON.stringify(draft);
      console.log('');
      console.log('--- body_text first 1500 chars ---');
      console.log(text.substring(0, 1500));
      console.log('');
      if (text.match(/2027/)) {
        console.log('PASS: 2027 in draft body');
      } else if (text.match(/TBD/)) {
        console.log('FAIL: still TBD');
      }
      if (draft.harvest_window_used) console.log('harvest_window_used:', draft.harvest_window_used);
    } catch (e) {
      console.error('draft fn threw:', e.message);
    }
  } else {
    console.log('No draft function exported. Available:', exports.join(', '));
  }

  await pool.end();
})().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});