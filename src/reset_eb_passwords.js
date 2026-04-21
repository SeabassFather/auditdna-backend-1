const b = require('bcryptjs');
const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway',
  ssl: { rejectUnauthorized: false }
});

const users = [
  ['sg01@eb.com',     '060905Dsg#321'],
  ['gl@eb.com',       'Admin2026!'],
  ['ab-03@eb.com',    'Admin2026!'],
  ['og01@eb.com',     'Admin2026!'],
  ['hm@eb.com',       'Mariscal#321'],
  ['ec@eb.com',       'e&e#321'],
  ['dsg@eb.com',      'seabass01'],
  ['fms@eb.com',      'sunshine101'],
  ['mg@eb.com',       'Shopehere#321'],
  ['dv@eb.com',       'Velazquez#321'],
  ['fl@eb.com',       'WhatBerry#321'],
  ['moi@eb.com',      'IcanIamIwill2026!'],
  ['ema@eb.com',      'CasaCaracol321'],
  ['lucero@eb.com',   'Caracola123'],
  ['fjlm@eb.com',     'Admin2026!!'],
  ['admin01@eb.com',  'Admin2026!'],
  ['admin02@eb.com',  'Admin2026!'],
  ['admin03@eb.com',  'Admin2026!'],
  ['admin04@eb.com',  'Admin2026!'],
  ['admin05@eb.com',  'Admin2026!'],
  ['sales01@eb.com',  'Sales2026!'],
  ['sales02@eb.com',  'Sales2026!'],
  ['sales03@eb.com',  'Sales2026!'],
  ['sales04@eb.com',  'Sales2026!'],
  ['sales05@eb.com',  'Sales2026!'],
];

(async () => {
  for (const [email, pass] of users) {
    const hash = await b.hash(pass, 12);
    const result = await p.query('UPDATE auth_users SET password_hash=$1 WHERE email=$2', [hash, email]);
    console.log(result.rowCount > 0 ? 'RESET: ' + email : 'NOT FOUND: ' + email);
  }
  console.log('ALL DONE');
  p.end();
})();

