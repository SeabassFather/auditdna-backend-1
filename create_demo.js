const b = require('bcryptjs');
const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  const ph   = await b.hash('Demo2026!', 12);
  const pinh = await b.hash('0000', 12);
  await p.query(
    'INSERT INTO auth_users (email,password_hash,pin_hash,name,role,status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO UPDATE SET password_hash=$2, pin_hash=$3',
    ['demo@eb.com', ph, pinh, 'Demo User', 'sales', 'active']
  );
  console.log('demo@eb.com CREATED OK');
  p.end();
})().catch(e => { console.error(e.message); p.end(); });

