#!/usr/bin/env node
// ============================================================================
// gmail-oauth-refresh.js
// Save to: C:\AuditDNA\backend\scripts\gmail-oauth-refresh.js
// Run as:  node C:\AuditDNA\backend\scripts\gmail-oauth-refresh.js
// ----------------------------------------------------------------------------
// ITEM 24: PM2 logs report `Token refresh failed: invalid_grant`. That means
// the saved refresh_token has been revoked (most often by changing Google
// password, hitting 7-day quota in a Testing-state OAuth project, or
// rotating client secrets).
//
// This script walks Saul through getting a fresh refresh_token without
// touching the consent screen UI. Output the new token, paste into Railway
// env (or .env locally), restart pm2.
// ============================================================================

const http = require('http');
const url = require('url');
const { google } = require('googleapis');
const { exec } = require('child_process');

// ----------------------------------------------------------------------------
// Config - Saul's existing Google project credentials
// ----------------------------------------------------------------------------
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT      = 'http://localhost:8765/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('FAIL: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in env');
  console.error('');
  console.error('Easiest path:');
  console.error('  $env:GOOGLE_CLIENT_ID="..." ; $env:GOOGLE_CLIENT_SECRET="..." ; node gmail-oauth-refresh.js');
  process.exit(1);
}

// All scopes Saul needs across the platform (Gmail send/read + People + Drive read)
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
];

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);

// Force a *new* refresh_token by passing prompt=consent + access_type=offline
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES
});

console.log('');
console.log('=' .repeat(78));
console.log(' GMAIL OAUTH REFRESH TOKEN REGEN');
console.log('='.repeat(78));
console.log('');
console.log('1) Browser will open. Sign in as sgarcia1911@gmail.com');
console.log('2) Click "Continue" past the unverified-app warning if shown');
console.log('3) Approve all scopes');
console.log('4) You will be bounced to localhost:8765 - this script catches it');
console.log('');
console.log('If browser does not open automatically, paste this URL:');
console.log('');
console.log(authUrl);
console.log('');

// ----------------------------------------------------------------------------
// Tiny localhost listener to catch the OAuth redirect
// ----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (!parsed.query.code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('No code in callback. Try again.');
    return;
  }
  const code = parsed.query.code;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<html><body style="font-family:system-ui;padding:48px;background:#0F1419;color:#C8E6C9"><h1>Token captured. You can close this tab.</h1></body></html>');
  try {
    const { tokens } = await oauth2.getToken(code);
    console.log('');
    console.log('=' .repeat(78));
    console.log(' SUCCESS - PASTE THESE INTO RAILWAY + LOCAL .env');
    console.log('='.repeat(78));
    console.log('');
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('');
    if (tokens.access_token) {
      console.log('GOOGLE_ACCESS_TOKEN=' + tokens.access_token);
      console.log('  (access_token expires in ~1 hour - refresh_token regenerates it)');
      console.log('');
    }
    console.log('Scopes granted:');
    (tokens.scope || '').split(' ').forEach(s => console.log('  - ' + s));
    console.log('');
    console.log('Next steps:');
    console.log('  1. railway variables set GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token + ' --service auditdna-backend');
    console.log('  2. railway up --service auditdna-backend  (or just wait for auto-redeploy)');
    console.log('  3. Verify: pm2 logs auditdna-backend | grep -i "token"');
    console.log('');
    process.exit(0);
  } catch (e) {
    console.error('FAIL exchanging code for token:', e.message);
    process.exit(1);
  }
});

server.listen(8765, () => {
  console.log('Listener up on http://localhost:8765');
  console.log('Opening browser...');
  // Cross-platform open
  const cmd = process.platform === 'win32' ? `start "" "${authUrl}"` :
              process.platform === 'darwin' ? `open "${authUrl}"` :
              `xdg-open "${authUrl}"`;
  exec(cmd, () => {});
});

// Hard timeout so script exits if user walks away
setTimeout(() => {
  console.error('TIMEOUT - 5 minutes no callback. Re-run.');
  process.exit(2);
}, 5 * 60 * 1000);
