```text
AuditDNA dev-stub server (local)

What this server provides:
- POST /api/upload
  - Accepts multipart/form-data with a "listing" field (JSON string) and file fields (file0, file1, ...).
  - Saves files to ./uploads and persists the listing to ./db/listings.json.
  - Attempts to forward a notification (SMTP or webhook) if configured; otherwise logs to console.

- POST /api/notify
  - Accepts JSON { subject, message, to }.
  - If SMTP env vars configured, will send email. Otherwise forwards to WEBHOOK_URL (if set) or logs.

- POST /api/verify-cert
  - Accepts multipart single file field 'cert' OR JSON { certificateUrl }.
  - Performs a mock verification and returns { verified: true/false, notes }.
  - Saves uploaded certs to ./uploads/certs.

- GET /api/listings
  - Returns persisted listings from ./db/listings.json

Quick start:
1) Copy the server/ folder into your project root (or wherever you like).
2) Open a terminal in server/ and install:
   npm install

3) Create an .env file (optional) based on .env.example. For example, to enable SMTP notifications:
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-user
   SMTP_PASS=your-pass
   FROM_EMAIL=notify@example.com
   NOTIFY_TO=admin@example.com

   Or to forward notifications to a webhook:
   WEBHOOK_URL=https://hooks.example.com/your-path

4) Start the server:
   npm start
   (or npm run start:dev if you installed nodemon)

5) In your front-end, leave API calls unchanged — they hit /api/upload, /api/notify, /api/verify-cert on the same origin. If your front-end is served from a different port during development, configure the front-end to call http://localhost:4000/api/... or run the server with a proxy.

Notes:
- This is a lightweight dev stub, NOT production-ready.
- Files are stored on disk and listings in a local JSON file — fine for testing.
- You can replace "forwardNotify" behavior with your production email/webhook logic later without changing the front-end.
```