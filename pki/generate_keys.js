/**
 * backend/pki/generate_keys.js
 * Generate RSA 4096 keypair and save to backend/pki/keys
 *
 * Usage:
 *   node backend/pki/generate_keys.js
 *
 * Outputs:
 *   backend/pki/keys/private.pem
 *   backend/pki/keys/public.pem
 */
const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

const outDir = path.join(__dirname, 'keys');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('Generating RSA 4096 keypair...');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
});

fs.writeFileSync(path.join(outDir, 'private.pem'), privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(outDir, 'public.pem'), publicKey, { mode: 0o644 });

console.log('Keys written to:', outDir);
console.log('private.pem (keep secure), public.pem (distribute as needed)');

