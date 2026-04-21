require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'auditdna',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD
});
(async () => {
  try {
    const c = await pool.query("SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS addr, inet_server_port() AS port");
    console.log('=== NODE CONNECTION ===');
    console.log(c.rows[0]);
    const t = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name='auth_users'");
    console.log('\n=== auth_users LOCATIONS ===');
    console.log(t.rows);
    const r = await pool.query("SELECT id, username, role, is_active, access_code, pin, LEFT(password_hash,10) AS pw FROM auth_users ORDER BY id");
    console.log('\n=== ALL auth_users ROWS (' + r.rows.length + ') ===');
    r.rows.forEach(x => console.log(x));
  } catch(e) { console.error('ERR:', e.message); }
  await pool.end();
})();