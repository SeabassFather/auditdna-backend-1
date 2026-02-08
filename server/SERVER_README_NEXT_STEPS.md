```text
Quick notes after running create_server_setup.ps1

Context
- Your React front-end runs at http://localhost:3000 (you said local3000).
- The dev-stub server defaults to port 4000 (you can override when running the PowerShell script).

If front-end is at http://localhost:3000 (CRA default), recommended options:

Option A — use proxy (recommended for local dev)
- In your React app's package.json (frontend), add:
  "proxy": "http://localhost:4000"
- Then your existing front-end fetch('/api/upload') calls will be proxied to the dev server automatically during `npm start`.

Option B — call full URL
- Keep fetch calls as fetch('http://localhost:4000/api/upload', {...}) in front-end.
- Make sure the server is running and CORS is allowed (server already enables CORS).

Start sequence
1) In server/ directory:
   npm install   # if not already done
   npm start     # starts dev-stub on PORT from .env (default 4000)

2) In front-end directory:
   npm install
   npm start     # runs React on 3000

Endpoints (dev-stub)
- POST /api/upload       (multipart/form-data; field 'listing' JSON + files)
- POST /api/notify       (JSON { subject, message, to })
- POST /api/verify-cert  (multipart field 'cert' OR JSON { certificateUrl })
- GET  /api/listings     (list saved listings)

Files created by the script
- uploads/ (uploaded files)
- uploads/certs/ (certs)
- db/listings.json (persisted listings)
- .env (PORT and FRONTEND_URL values)
- .env.example
- .gitignore

Security / git
- Add .env, uploads/, db/ to .gitignore (script added .gitignore already).
- Do not commit SMTP credentials to git.

If you want: I can now
- Generate the PowerShell script as a one-click zip or give you a Windows batch file.
- Add a small sample cURL command and a Node example that posts a FormData listing to /api/upload for quick integration testing.
- Add BasicAuth / API-key protection for admin endpoints.

Tell me which of the above you'd like next and I'll produce the file(s).
```