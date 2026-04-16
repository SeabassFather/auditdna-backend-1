const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'process.env.DB_HOST', port: 5432,
  database: 'auditdna', user: 'postgres', password: 'auditdna2026',
});

const users = [
  { username: 'sg01@eb.com',   password: 'DiegoSebastian#321', pin: '10051974', display_name: 'Saul Garcia',  role: 'owner' },
  { username: 'gl@eb.com',     password: 'Admin2026!',          pin: '0505',     display_name: 'Gibran Lopez', role: 'admin' },
  { username: 'moi@eb.com',    password: 'Sales2026!',          pin: '0000',     display_name: 'Moises',       role: 'sales' },
  { username: 'ema@eb.com',    password: 'Sales2026!',          pin: '0000',     display_name: 'Ema',          role: 'sales' },
  { username: 'lucero@eb.com', password: 'Sales2026!',          pin: '0000',     display_name: 'Lucero',       role: 'sales' },
];

async function run() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO auth_users (username, password_hash, pin, display_name, role, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT (username) DO UPDATE
         SET password_hash=$2, pin=$3, display_name=$4, role=$5, is_active=true`,
      [u.username, hash, u.pin, u.display_name, u.role]
    );
    console.log('[OK] ' + u.username + ' (' + u.role + ')');
  }
  console.log('\nAll done — try logging in now.');
  await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
