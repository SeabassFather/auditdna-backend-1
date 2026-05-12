const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace(/\r\n/g, '\n');
c = c.replace('via GoDaddy SMTP', 'via Brevo SMTP');
fs.writeFileSync('server.js', c, 'utf8');
console.log('GoDaddy fixed:', !c.includes('GoDaddy') ? 'OK' : 'MISS');
