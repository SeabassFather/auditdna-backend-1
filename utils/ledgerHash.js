const hash = (data) => { return 'hash_stub_' + Date.now(); };
const buildEntryHash = (entry) => { return hash(JSON.stringify(entry)); };
const computeLedgerHash = (entry) => { return buildEntryHash(entry); };
const verifyChain = (chain) => { return true; };
module.exports = { hash, buildEntryHash, computeLedgerHash, verifyChain };

