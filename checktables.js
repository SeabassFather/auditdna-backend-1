require('dotenv').config();
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:false});
p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
.then(r=>{console.log(r.rows.map(x=>x.table_name).join(', '));p.end();})
.catch(e=>console.error(e.message));
