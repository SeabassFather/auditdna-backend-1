const {Pool} = require('pg');
const bcrypt = require('bcryptjs');
const p = new Pool({connectionString:'postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway'});
bcrypt.hash('Hector#321', 10).then(hash => {
  return p.query("UPDATE auth_users SET password_hash=$1 WHERE username='hmar@mfginc.com'", [hash]);
}).then(r => {
  console.log('Reset done:', r.rowCount);
  p.end();
});
