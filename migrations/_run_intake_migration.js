const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const sqlPath = process.argv[2];
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new Pool({
  host:     process.env.PGHOST     || 'hopper.proxy.rlwy.net',
  port:     parseInt(process.env.PGPORT || '55424', 10),
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'PMJobEqMsVuiwvFwHlHFUrGXarncSAQj',
  database: process.env.PGDATABASE || 'railway',
  ssl:      false,
});

(async () => {
  try {
    console.log('[migrate] Connecting...');
    const r0 = await pool.query('SELECT NOW() AS now');
    console.log('[migrate] Connected. DB time:', r0.rows[0].now);

    console.log('[migrate] Running SQL...');
    await pool.query(sql);
    console.log('[migrate] OK');

    const tables = ['intake_cases','intake_files','intake_id_verification','intake_consent','intake_chain_log'];
    for (const t of tables) {
      const r = await pool.query('SELECT COUNT(*)::int AS n FROM ' + t);
      console.log('[migrate] ' + t + ': ' + r.rows[0].n + ' rows');
    }
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('[migrate] FAIL:', e.message);
    process.exit(1);
  }
})();