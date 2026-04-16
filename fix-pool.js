const fs   = require('fs');
const path = require('path');

const dir   = path.join(__dirname, 'routes');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

let fixed = 0;
files.forEach(f => {
  const fp = path.join(dir, f);
  let c = fs.readFileSync(fp, 'utf8');
  const before = c;

  // Fix: const pool = require('../db')  →  const { pool } = require('../db')
  c = c.replace(/const pool = require\('\.\.\/db'\);/g, "const { pool } = require('../db');");
  c = c.replace(/const pool = require\("\.\.\/db"\);/g, 'const { pool } = require("../db");');

  // Fix old server pattern
  c = c.replace(/const pool = require\('\.\.\/server'\)\.pool;/g, "const { pool } = require('../db');");
  c = c.split("require('../server').pool").join("require('../db').pool");

  if (c !== before) {
    fs.writeFileSync(fp, c, 'utf8');
    fixed++;
    console.log('Fixed:', f);
  }
});
console.log('Total routes fixed:', fixed);
