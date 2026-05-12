const fs = require('fs');
let c = fs.readFileSync('gmail.js', 'utf8');

const contactTarget = "console.log(`[Gmail] Contacts synced: ${allContacts.length} (saved: ${allContacts.filter(c=>c.source==='contacts').length}, other: ${otherCount})`);";
const contactPing = `
  try {
    const brainUser = req.user || {};
    const pool = global.db || pgPool;
    pool.query('INSERT INTO mortgage_brain_log (module, event, data, source) VALUES ($1,$2,$3,$4)',
      ['gmail','GMAIL_CONTACTS_SYNCED', JSON.stringify({ user: brainUser.username||brainUser.email||'unknown', role: brainUser.role||'unknown', contactCount: allContacts.length, breakdown:{ saved: allContacts.filter(cx=>cx.source==='contacts').length, other: otherCount }, timestamp: Date.now() }), 'gmail_sync']
    ).catch(()=>{});
  } catch(e) {}
`;
c = c.replace(contactTarget, contactTarget + contactPing);

const bulkTarget = "console.log(`[BULK] complete: ${sent} sent, ${failed} failed, FROM: ${FROM_ADDRESS}`);";
const bulkPing = `
  try {
    const brainUser = req.user || {};
    const pool = global.db || pgPool;
    pool.query('INSERT INTO mortgage_brain_log (module, event, data, source) VALUES ($1,$2,$3,$4)',
      ['gmail','GMAIL_BULK_SENT', JSON.stringify({ user: brainUser.username||brainUser.email||req.body.senderEmail||'unknown', role: brainUser.role||'unknown', sent, failed, subject: req.body.subject||'', recipientCount: recipients.length, timestamp: Date.now() }), 'gmail_bulk']
    ).catch(()=>{});
  } catch(e) {}
`;
c = c.replace(bulkTarget, bulkTarget + bulkPing);

fs.writeFileSync('gmail.js', c, 'utf8');
console.log('Brain pings:', (c.match(/GMAIL_CONTACTS_SYNCED|GMAIL_BULK_SENT/g)||[]).length);
