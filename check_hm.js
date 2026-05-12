const {Pool} = require('pg');
const p = new Pool({connectionString:'postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway'});
p.query("SELECT username, password_hash, access_code FROM auth_users WHERE username IN ('hmar@mfginc.com','hector')").then(r=>{ console.table(r.rows); p.end(); });
