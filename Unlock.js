const { pool } = require('./db');
pool.query(
  'UPDATE auth_users SET failed_attempts=0, locked_until=NULL, is_active=true WHERE username=$1',
  ['saul']
).then(r => {
  console.log('Unlocked. Rows affected:', r.rowCount);
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});

