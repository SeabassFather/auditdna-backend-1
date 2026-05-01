const fs = require('fs');
const FILE = 'C:\\AuditDNA\\backend\\routes\\gmail.js';
let src = fs.readFileSync(FILE, 'utf8');

const OLD = "const REDIRECT_URI  = process.env.GMAIL_REDIRECT_URI || 'http://localhost:5050/api/gmail/callback';";
const NEW = "const REDIRECT_URI  = process.env.GMAIL_REDIRECT_URI || 'https://auditdna-backend-1-production.up.railway.app/api/gmail/callback';";

if (!src.includes(OLD)) { console.error('[FAIL] anchor not found'); process.exit(1); }

src = src.replace(OLD, NEW);
fs.writeFileSync(FILE, src, 'utf8');
console.log('[OK] hardcoded Railway fallback');
