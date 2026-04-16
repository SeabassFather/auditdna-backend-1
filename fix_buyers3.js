const fs = require('fs');
let c = fs.readFileSync('C:/AuditDNA/backend/routes/buyers.js', 'utf8');

// Replace entire ORDER BY line regardless of what it looks like now
c = c.replace(/query \+= .* ORDER BY legal_name LIMIT.*?;[\s\S]*?params\.push\(offset\);/, 
`query += ' ORDER BY legal_name LIMIT $' + (paramCount + 1) + ' OFFSET $' + (paramCount + 2);
    params.push(parseInt(req.query.limit) || 10000);
    params.push(parseInt(req.query.offset) || 0);`);

fs.writeFileSync('C:/AuditDNA/backend/routes/buyers.js', c);
console.log('DONE');
console.log('Verify:', c.match(/ORDER BY legal_name/)?.[0]);
