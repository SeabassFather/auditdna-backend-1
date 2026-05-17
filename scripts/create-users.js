#!/usr/bin/env node
// ONE-TIME USER MIGRATION — run once then delete
// Usage: node scripts/create-users.js
const{Client}=require('pg');
const bcrypt=require('bcryptjs');

async function main(){
  const client=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
  await client.connect();
  console.log('Connected.');

  const users=[
    // FIX BROKEN
    {username:'osvaldo',password:'Osvaldo2026#',access_code:'2C08BBCE',pin:'7211',display_name:'Osvaldo',role:'admin',fix:true},
    {username:'hector',password:'Plastpac2026!',access_code:'Devan2026Hector#',pin:'8310374',display_name:'Hector',role:'admin',fix:true},
    // NEW CONSULTANTS
    {username:'rudy',password:'Rudy2026#MFG',access_code:'Rudy2026#MFG',pin:'7777',display_name:'Rudy Jacinto',role:'admin_sales'},
    {username:'carlos',password:'Carlos2026#MFG',access_code:'Carlos2026#MFG',pin:'8888',display_name:'Lic. Carlos Romero',role:'admin_sales'},
    // NEW BUYERS
    {username:'david',password:'David2026#MFG',access_code:'David2026#MFG',pin:'9901',display_name:'David Gattis',role:'sales'},
    {username:'michael',password:'Waltz2026#MFG',access_code:'Waltz2026#MFG',pin:'9902',display_name:'Michael Waltz',role:'sales'},
    // RAMIRO
    {username:'ramiro',password:'Ramiro2026#MFG',access_code:'Ramiro2026#MFG',pin:'9903',display_name:'Ramiro - UR Choice Distributing',role:'sales'},
    // 5 GENERIC SALESMEN
    {username:'sales1',password:'Sales1#MFG2026',access_code:'Sales1#MFG2026',pin:'1001',display_name:'Sales Rep 1',role:'sales'},
    {username:'sales2',password:'Sales2#MFG2026',access_code:'Sales2#MFG2026',pin:'1002',display_name:'Sales Rep 2',role:'sales'},
    {username:'sales3',password:'Sales3#MFG2026',access_code:'Sales3#MFG2026',pin:'1003',display_name:'Sales Rep 3',role:'sales'},
    {username:'sales4',password:'Sales4#MFG2026',access_code:'Sales4#MFG2026',pin:'1004',display_name:'Sales Rep 4',role:'sales'},
    {username:'sales5',password:'Sales5#MFG2026',access_code:'Sales5#MFG2026',pin:'1005',display_name:'Sales Rep 5',role:'sales'},
  ];

  for(const u of users){
    const hash=await bcrypt.hash(u.password,10);
    if(u.fix){
      const r=await client.query(
        `UPDATE auth_users SET password_hash=$1,access_code=$2,pin=$3,is_active=true,updated_at=NOW() WHERE username=$4 RETURNING id,username`,
        [hash,u.access_code,u.pin,u.username]
      );
      console.log(r.rows.length?'FIXED  '+u.username+' id:'+r.rows[0].id:'NOT FOUND '+u.username);
    } else {
      const ex=await client.query('SELECT id FROM auth_users WHERE username=$1',[u.username]);
      if(ex.rows.length){
        await client.query(
          `UPDATE auth_users SET password_hash=$1,access_code=$2,pin=$3,display_name=$4,role=$5,is_active=true,updated_at=NOW() WHERE username=$6`,
          [hash,u.access_code,u.pin,u.display_name,u.role,u.username]
        );
        console.log('UPDATED',u.username);
      } else {
        const r=await client.query(
          `INSERT INTO auth_users(username,password_hash,access_code,pin,display_name,role,is_active,login_count,created_at,updated_at)
           VALUES($1,$2,$3,$4,$5,$6,true,0,NOW(),NOW()) RETURNING id`,
          [u.username,hash,u.access_code,u.pin,u.display_name,u.role]
        );
        console.log('CREATED',u.username,'id:'+r.rows[0].id,'role:'+u.role);
      }
    }
  }

  const all=await client.query('SELECT id,username,display_name,role,is_active FROM auth_users ORDER BY id');
  console.log('\nFINAL USER TABLE:');
  all.rows.forEach(r=>console.log(String(r.id).padEnd(4),r.username.padEnd(12),r.role.padEnd(14),r.is_active?'ACTIVE':'INACTIVE',r.display_name));
  await client.end();
  console.log('\nDone. Delete this file: scripts/create-users.js');
}
main().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
