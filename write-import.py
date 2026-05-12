with open("C:/AuditDNA/backend/import-senasica.js","w") as f:
    f.write("""require('dotenv').config();
const{Pool}=require('pg');
const fs=require('fs');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:false});
const contacts=JSON.parse(fs.readFileSync('C:/AuditDNA/backend/MiniAPI/data/senasica_with_emails.json','utf8'));
function fix(s){return(s||'').replace(/\u00c3\u00b3/g,'\u00f3').replace(/\u00c3\u00a9/g,'\u00e9').replace(/\u00c3\u00a1/g,'\u00e1');}
async function run(){
  let ins=0,sk=0,err=0;
  for(let i=0;i<contacts.length;i++){
    const c=contacts[i];
    const email=(c.primary_email||'').trim().toLowerCase();
    const name=fix(c.company_name||'');
    if(!email||!name){sk++;continue;}
    try{
      await pool.query('INSERT INTO ag_contacts (email,contact_name,company_name,state_province,city,country,source,industry_segment,language_pref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (email) DO NOTHING',[email,name,name,fix(c.state||''),fix(c.city||''),'MX','SENASICA',c.campaign_id||'agriculture','es']);
      ins++;
    }catch(e){err++;if(err<=2)console.log('ERR:',e.message.slice(0,100));}
    if((i+1)%200===0)process.stdout.write('\\r  '+(i+1)+'/'+contacts.length+' ins:'+ins+' err:'+err);
  }
  console.log('\\nDone ins:'+ins+' sk:'+sk+' err:'+err);
  const t=await pool.query('SELECT COUNT(*) FROM ag_contacts');
  console.log('total:',t.rows[0].count);
  await pool.end();
}
run().catch(e=>console.error('FATAL:',e.message));
""")
print("Written OK")
