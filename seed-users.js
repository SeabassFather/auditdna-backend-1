const { pool } = require('./db');
const bcrypt   = require('bcryptjs');

const NEW_AGENTS = [
  { username:'joseb',    password:'CMProd2026!', access_code:'CM-JOSE-2026',    pin:'1111', display_name:'Jose B',    role:'agent' },
  { username:'armandom', password:'CMProd2026!', access_code:'CM-ARMANDO-2026', pin:'2222', display_name:'Armando M', role:'agent' },
];

async function seed() {
  console.log('\n[AUDITDNA] Adding Jose B and Armando M only...\n');
  for (const u of NEW_AGENTS) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      `INSERT INTO auth_users (username, password_hash, access_code, pin, display_name, role, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (username) DO UPDATE SET
         password_hash=EXCLUDED.password_hash, access_code=EXCLUDED.access_code,
         pin=EXCLUDED.pin, display_name=EXCLUDED.display_name, role=EXCLUDED.role, is_active=true`,
      [u.username, hash, u.access_code, u.pin, u.display_name, u.role]
    );
    console.log(`  [OK] ${u.display_name} | user: ${u.username} | pass: ${u.password} | code: ${u.access_code} | PIN: ${u.pin}`);
  }
  console.log('\n[DONE] Saul untouched.\n');
  process.exit(0);
}
seed().catch(e => { console.error('[ERROR]', e.message); process.exit(1); });
