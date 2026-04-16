require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ host: 'process.env.DB_HOST', port: 5432, database: 'auditdna', user: 'postgres', password: 'auditdna2026', ssl: false });
const USERS = [
  { email: 'dsg@mfginc.com', password: 'Seabass#2026', pin: '7731', role: 'admin', name: 'DSG' },
  { email: 'etc@mfginc.com', password: 'Condor#2026', pin: '4482', role: 'admin', name: 'ETC' },
  { email: 'ecjr@mfginc.com', password: 'Falcon#2026', pin: '9923', role: 'admin', name: 'ECJR' },
  { email: 'fmarquez@mfginc.com', password: 'Marquez#2026', pin: '5541', role: 'admin', name: 'F. Marquez' },
];
async function run() {
  for (const u of USERS) {
    const ph = await bcrypt.hash(u.password, 12);
    const pp = await bcrypt.hash(u.pin, 10);
    await pool.query(`INSERT INTO auth_users (email,password_hash,pin_hash,role,name,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'active',NOW(),NOW()) ON CONFLICT (email) DO UPDATE SET password_hash=$2,pin_hash=$3,role=$4,name=$5,status='active',updated_at=NOW()`,[u.email,ph,pp,u.role,u.name]);
    console.log('[OK] ' + u.email);
  }
  await pool.end();
  console.log('Done.');
}
run().catch(e => { console.error(e); process.exit(1); });
