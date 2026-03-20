const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
Promise.all([
  bcrypt.hash('Dsg060905#321', 12),
  bcrypt.hash('0609051974', 12)
]).then(([passHash, pinHash]) => {
  return pool.query(
    'UPDATE auth_users SET password_hash=$1, pin_hash=$2, status=$3',
    [passHash, pinHash, 'active']
  );
}).then(r => { console.log('Updated rows:', r.rowCount); pool.end(); })
.catch(e => { console.error(e.message); pool.end(); });
