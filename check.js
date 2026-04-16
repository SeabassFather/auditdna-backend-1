const {Pool}=require('pg');
const p=new Pool({connectionString:'postgresql://postgres:postgres@process.env.DB_HOST:5432/auditdna'});
p.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('growers','buyers','contacts','shippers') ORDER BY table_name, ordinal_position")
.then(r=>{r.rows.forEach(x=>console.log(x.table_name+'.'+x.column_name));p.end()})
.catch(e=>{console.error(e.message);p.end()});
