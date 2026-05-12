const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace(/\r\n/g, '\n');

c = c.replace('GoDaddy SMTP bulk send w/ batching', 'Brevo SMTP bulk send w/ batching');
c = c.replace('  server.close(() => {\n    pool.end(() => {', '  __server.close(() => {\n    pool.end(() => {');

fs.writeFileSync('server.js', c, 'utf8');
console.log('GoDaddy fixed:', !c.includes('GoDaddy SMTP') ? 'OK' : 'MISS');
console.log('shutdown fixed:', c.includes('__server.close') ? 'OK' : 'MISS');
console.log('global.db refs:', (c.match(/global\.db = pool/g)||[]).length);
