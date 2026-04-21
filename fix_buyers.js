const fs = require('fs');
let c = fs.readFileSync('C:/AuditDNA/backend/routes/buyers.js', 'utf8');

const bad = `    const limit = parseInt(req.query.limit) || 10000;
    const offset = parseInt(req.query.offset) || 0;
    paramCount++;
    query += \` ORDER BY legal_name LIMIT \${paramCount}\`;
    params.push(limit);
    paramCount++;
    query += \` OFFSET \${paramCount}\`;
    params.push(offset);`;

const good = `    const limit = parseInt(req.query.limit) || 10000;
    const offset = parseInt(req.query.offset) || 0;
    paramCount++;
    query += ' ORDER BY legal_name LIMIT $' + paramCount;
    params.push(limit);
    paramCount++;
    query += ' OFFSET $' + paramCount;
    params.push(offset);`;

c = c.replace(bad, good);
fs.writeFileSync('C:/AuditDNA/backend/routes/buyers.js', c);
console.log('DONE');

