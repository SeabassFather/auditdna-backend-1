const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// Normalize to LF for matching
c = c.replace(/\r\n/g, '\n');

c = c.replace('GoDaddy SMTP bulk send', 'Brevo SMTP bulk send');
c = c.replace('Single Gmail-only transporter. Used by ALL inline send sites + GG medic.\n// Standing rule: smtp.gmail.com:587, secure=false, sgarcia1911@gmail.com', 'Brevo primary transporter. Used by ALL inline send sites + GG medic.\n// Standing rule: smtp-relay.brevo.com:587, env SMTP_USER/SMTP_PASS');
c = c.replace('const server =\n// SPRINT D', '// SPRINT D');
c = c.replace(/\nfunction shutdown\(signal\) \{\n  console\.log[^}]+server\.close/, '\nfunction shutdown(signal) {\n  console.log(`\\n${signal} received. Shutting down...`);\n  __server.close');
c = c.replace('\nmodule.exports = app; global.db = pool;\nconsole.log(\'[DB] global.db assigned -> pool accessible to all routes\');\nmodule.exports.pool = pool; module.exports.app = app;', '\nmodule.exports = app;\nmodule.exports.pool = pool;\nmodule.exports.app = app;');

fs.writeFileSync('server.js', c, 'utf8');
console.log('GoDaddy fixed:', !c.includes('GoDaddy SMTP') ? 'OK' : 'MISS');
console.log('const server fixed:', !c.includes('const server =') ? 'OK' : 'MISS');
console.log('shutdown fixed:', c.includes('__server.close') ? 'OK' : 'MISS');
console.log('global.db refs:', (c.match(/global\.db = pool/g)||[]).length);
