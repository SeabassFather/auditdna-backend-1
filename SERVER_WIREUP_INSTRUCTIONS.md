# Server.js Wire-Up Instructions

After dropping the new files, edit `C:\AuditDNA\backend\server.js` via **GitHub web editor** (NOT PowerShell sed - file has UTF-8 + complex strings).

## Step 1: Add 2 require() lines near the top (with other route imports)

Find a line like:
```js
const authRoutes = require('./routes/auth');
```

Add after it:
```js
const campaignsEngine = require('./routes/campaigns-engine');
const internalInbox   = require('./routes/internal-inbox');
```

## Step 2: Add 2 app.use() lines near the bottom (with other route mounts)

Find a line like:
```js
app.use('/api/auth', authRoutes);
```

Add after the route mount block:
```js
app.use('/api/campaigns', campaignsEngine);
app.use('/api/inbox',     internalInbox);
// Public unsubscribe endpoint (no /api prefix needed but kept for consistency)
app.get('/api/email/unsubscribe', (req, res) => {
  req.url = '/unsubscribe-public?' + new URLSearchParams(req.query).toString();
  campaignsEngine.handle(req, res);
});
```

## Step 3: Restart backend
```powershell
pm2 restart auditdna-backend
pm2 logs auditdna-backend --lines 20 --nostream
```

Expect to see no errors. The new tables and verticals will be available immediately.

## Step 4: Verify
```powershell
$env:PGPASSWORD="PMJobEqMsVuiwvFwHlHFUrGXarncSAQj"
psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -c "SELECT id, name_en, frequency_per_week, enabled FROM campaign_verticals ORDER BY id;"
psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -c "SELECT username, primary_email, jsonb_array_length(vertical_access) AS verts FROM mfg_employees ORDER BY id;"
```

Should return 8 verticals + 7 employees with their vertical access counts.

## Step 5: Smoke test the routes
```powershell
$api = "https://auditdna-backend-1-production.up.railway.app"
Invoke-RestMethod -Uri "$api/api/campaigns/verticals" | ConvertTo-Json -Depth 3 | Select-Object -First 30
Invoke-RestMethod -Uri "$api/api/campaigns/employees" | ConvertTo-Json -Depth 3 | Select-Object -First 30
```

Both should return JSON with the seed data. If yes, Phase 1 backend is LIVE.

Phase 2 (UI: Campaigns tab + Internal Inbox tab in EmailMarketing.jsx and SaulIntelCRM.jsx) comes next session.
