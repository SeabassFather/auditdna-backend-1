const{Pool}=require('pg');
const p=new Pool({host:'localhost',port:5432,database:'auditdna',user:'postgres',password:'auditdna2026'});
(async()=>{
  const r=await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('=== ALL TABLES ===');
  r.rows.forEach(t=>console.log(t.table_name));
  try{const g=await p.query('SELECT * FROM growers LIMIT 1');console.log('\n=== GROWER COLUMNS ===');console.log(Object.keys(g.rows[0]||{}))}catch(e){console.log('growers:',e.message)}
  try{const b=await p.query('SELECT * FROM buyers LIMIT 1');console.log('\n=== BUYER COLUMNS ===');console.log(Object.keys(b.rows[0]||{}))}catch(e){console.log('buyers:',e.message)}
  await p.end();
})()
