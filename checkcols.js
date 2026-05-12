require('dotenv').config();
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:false});
p.query("SELECT column_name FROM information_schema.columns WHERE table_name='ag_contacts' ORDER BY ordinal_position")
.then(r=>{console.log(r.rows.map(x=>x.column_name).join(', '));p.end();})
.catch(e=>console.error(e.message));
