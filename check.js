const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace(/\r\n/g, '\n');

// Check exact strings present
console.log('GoDaddy:', c.includes('GoDaddy') ? 'FOUND' : 'NOT FOUND');
const shutIdx = c.indexOf('function shutdown');
console.log('shutdown snippet:', JSON.stringify(c.substring(shutIdx, shutIdx+120)));
