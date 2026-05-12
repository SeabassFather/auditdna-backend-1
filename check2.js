const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace(/\r\n/g, '\n');
const idx = c.indexOf('GoDaddy');
console.log(JSON.stringify(c.substring(idx-5, idx+40)));
