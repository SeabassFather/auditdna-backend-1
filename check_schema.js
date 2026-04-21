const {Pool}=require("pg");const p=new Pool({host:"process.env.DB_HOST",port:5432,database:"auditdna",user:"postgres",password:"auditdna2026",ssl:false});p.query("SELECT column_name FROM information_schema.columns WHERE table_name=$$auth_users$$ ORDER BY ordinal_position").then(r=>{console.log(r.rows.map(x=>x.column_name));p.end()}).catch(e=>console.error(e));

