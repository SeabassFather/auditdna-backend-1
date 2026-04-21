const fs = require('fs');
const f = 'src/Auth.js';
let c = fs.readFileSync(f, 'utf8');
const before = c;

// Auth.js uses single quotes: require('../server').pool
c = c.split("require('../server').pool").join("require('../db').pool");

fs.writeFileSync(f, c, 'utf8');

if (before === c) {
  console.log('NOT FOUND â€” printing all require lines for inspection:');
  c.split('\n').filter(l => l.includes('require')).forEach(l => console.log(' >', l.trim()));
} else {
  console.log('Auth.js FIXED â€” pool now reads from ../db');
}

