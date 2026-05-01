const { Pool } = require('pg');
const pool = new Pool({ host:'hopper.proxy.rlwy.net', port:55424, database:'railway', user:'postgres', password:'PMJobEqMsVuiwvFwHlHFUrGXarncSAQj', ssl:{rejectUnauthorized:false} });
pool.query(`SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name='auth_users' ORDER BY ordinal_position`).then(r => { r.rows.forEach(c => console.log(c.column_name, c.character_maximum_length||'')); pool.end(); }).catch(e => { console.error(e.message); pool.end(); });
