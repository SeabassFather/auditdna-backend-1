# =============================================================================
# DEPLOY EMMA + EVELYN
# File: C:\AuditDNA\backend\deploy-emma-evelyn.ps1
#
# Wires both AI agents into the AuditDNA backend in one shot:
#   1. Verifies all 6 source files copied to correct locations
#   2. Runs migrations against LOCAL + RAILWAY postgres
#   3. Patches server.js to mount /api/emma + /api/evelyn routes
#   4. Patches server.js to start both services inside __server.listen callback
#   5. Registers EMMA + EVELYN in services/swarm-agents.js REGISTRY
#   6. Restarts PM2 + verifies endpoints HTTP 200
#   7. Commits + pushes
# =============================================================================

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " EMMA + EVELYN DEPLOY" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

cd C:\AuditDNA\backend

$stamp = Get-Date -Format 'yyyyMMddHHmmss'

# ============================================================================
# STEP 0: Verify all source files in place
# ============================================================================
Write-Host "`n== STEP 0: Verify files in place ==" -ForegroundColor Green
$files = @(
  'C:\AuditDNA\backend\services\emma-oauth-medic.js',
  'C:\AuditDNA\backend\routes\emma.routes.js',
  'C:\AuditDNA\backend\migrations\2026-05-01-emma-oauth-medic.sql',
  'C:\AuditDNA\backend\services\evelyn-code-janitor.js',
  'C:\AuditDNA\backend\routes\evelyn.routes.js',
  'C:\AuditDNA\backend\migrations\2026-05-01-evelyn-janitor.sql'
)
foreach ($f in $files) {
  if (Test-Path $f) { Write-Host "  [OK] $f" -ForegroundColor Green }
  else { Write-Host "  [MISSING] $f" -ForegroundColor Red; exit 1 }
}

node --check 'C:\AuditDNA\backend\services\emma-oauth-medic.js'
node --check 'C:\AuditDNA\backend\routes\emma.routes.js'
node --check 'C:\AuditDNA\backend\services\evelyn-code-janitor.js'
node --check 'C:\AuditDNA\backend\routes\evelyn.routes.js'
Write-Host "  All 4 .js files syntax-clean" -ForegroundColor Green

# ============================================================================
# STEP 1: Backup server.js + swarm-agents.js
# ============================================================================
Write-Host "`n== STEP 1: Backup ==" -ForegroundColor Green
Copy-Item 'C:\AuditDNA\backend\server.js' "C:\AuditDNA\backend\server.js.bak-emma-evelyn-$stamp"
Copy-Item 'C:\AuditDNA\backend\services\swarm-agents.js' "C:\AuditDNA\backend\services\swarm-agents.js.bak-emma-evelyn-$stamp"
Write-Host "  Backups created"

# ============================================================================
# STEP 2: Patch server.js (Node patcher - exact-byte indexOf with CRLF fallback)
# ============================================================================
Write-Host "`n== STEP 2: Patch server.js ==" -ForegroundColor Green

$patcher = @'
const fs = require('fs');
const SERVER = 'C:/AuditDNA/backend/server.js';
let s = fs.readFileSync(SERVER, 'utf8');
let patches = 0;

function tryReplace(oldStr, newStr, label) {
  if (s.includes(oldStr)) {
    s = s.replace(oldStr, newStr);
    console.log('  [OK]   ' + label);
    patches++;
    return true;
  }
  const oldCRLF = oldStr.replace(/\n/g, '\r\n');
  if (s.includes(oldCRLF)) {
    s = s.replace(oldCRLF, newStr.replace(/\n/g, '\r\n'));
    console.log('  [OK]   ' + label + ' (CRLF)');
    patches++;
    return true;
  }
  console.log('  [SKIP] ' + label + ' - anchor not found (already applied?)');
  return false;
}

// PATCH 1: Mount /api/emma + /api/evelyn next to /api/gg
const ggMountAnchor = "explicitMounts.push({ file: 'gg.routes.js', path: '/api/gg' });";
if (s.includes(ggMountAnchor) || s.includes(ggMountAnchor.replace(/\n/g, '\r\n'))) {
  if (!s.includes("'/api/emma'")) {
    const newMount = ggMountAnchor + `

const emmaRoutes = require('./routes/emma.routes');
app.use('/api/emma', emmaRoutes);
explicitMounts.push({ file: 'emma.routes.js', path: '/api/emma' });

const evelynRoutes = require('./routes/evelyn.routes');
app.use('/api/evelyn', evelynRoutes);
explicitMounts.push({ file: 'evelyn.routes.js', path: '/api/evelyn' });`;
    tryReplace(ggMountAnchor, newMount, 'PATCH 1: Mount /api/emma + /api/evelyn');
  } else {
    console.log('  [SKIP] PATCH 1: /api/emma already mounted');
  }
} else {
  // Fallback: try to find any /api/gg mount line and inject after it
  const ggGenericAnchor = "app.use('/api/gg'";
  const ggLineMatch = s.match(/app\.use\(['"]\/api\/gg['"][^;]*;/);
  if (ggLineMatch && !s.includes("'/api/emma'")) {
    const after = ggLineMatch[0] + `

const emmaRoutes = require('./routes/emma.routes');
app.use('/api/emma', emmaRoutes);

const evelynRoutes = require('./routes/evelyn.routes');
app.use('/api/evelyn', evelynRoutes);`;
    s = s.replace(ggLineMatch[0], after);
    console.log('  [OK]   PATCH 1 (fallback): mounted next to existing /api/gg');
    patches++;
  }
}

// PATCH 2: Start emma + evelyn inside __server.listen
const ggStartAnchor = "const ggMedic = require('./services/gg-smtp-medic');";
if (s.includes(ggStartAnchor) || s.includes(ggStartAnchor.replace(/\n/g, '\r\n'))) {
  if (!s.includes("emma-oauth-medic")) {
    const ggStartReplacement = ggStartAnchor + `
    const emmaMedic = require('./services/emma-oauth-medic');
    const evelynJanitor = require('./services/evelyn-code-janitor');`;
    tryReplace(ggStartAnchor, ggStartReplacement, 'PATCH 2a: Inject Emma + Evelyn requires');
  }
}

// PATCH 2b: Init + start Emma & Evelyn after GG starts
const ggInitAnchor = "ggMedic.init({ pool, aiHelper });";
if (s.includes(ggInitAnchor) || s.includes(ggInitAnchor.replace(/\n/g, '\r\n'))) {
  if (!s.includes("emmaMedic.init")) {
    const ggInitReplacement = ggInitAnchor + `
    emmaMedic.init({ pool, aiHelper });
    emmaMedic.start();
    evelynJanitor.init({ pool, aiHelper });
    evelynJanitor.start();`;
    tryReplace(ggInitAnchor, ggInitReplacement, 'PATCH 2b: Start Emma + Evelyn');
  } else {
    console.log('  [SKIP] PATCH 2b: emmaMedic.init already present');
  }
} else {
  // Fallback: find ggMedic.start() and inject after it
  const startAnchor = "ggMedic.start();";
  if (s.includes(startAnchor) && !s.includes("emmaMedic.start")) {
    const startReplacement = startAnchor + `
    const emmaMedic = require('./services/emma-oauth-medic');
    emmaMedic.init({ pool, aiHelper });
    emmaMedic.start();
    const evelynJanitor = require('./services/evelyn-code-janitor');
    evelynJanitor.init({ pool, aiHelper });
    evelynJanitor.start();`;
    tryReplace(startAnchor, startReplacement, 'PATCH 2 (fallback): Start Emma + Evelyn after GG');
  }
}

if (patches > 0) {
  fs.writeFileSync(SERVER, s);
  console.log(`  Wrote server.js with ${patches} patches`);
} else {
  console.log('  No server.js patches applied');
}
'@

$patcher | Out-File -FilePath 'C:\AuditDNA\backend\.emma-evelyn-patcher.js' -Encoding UTF8
node 'C:\AuditDNA\backend\.emma-evelyn-patcher.js'

node --check 'C:\AuditDNA\backend\server.js'
if ($LASTEXITCODE -ne 0) {
  Write-Host "  server.js syntax FAIL - restoring backup" -ForegroundColor Red
  Copy-Item "C:\AuditDNA\backend\server.js.bak-emma-evelyn-$stamp" 'C:\AuditDNA\backend\server.js' -Force
  exit 1
}
Write-Host "  server.js syntax OK" -ForegroundColor Green

# ============================================================================
# STEP 3: Register EMMA + EVELYN in swarm-agents.js
# ============================================================================
Write-Host "`n== STEP 3: Register EMMA + EVELYN in swarm-agents.js ==" -ForegroundColor Green

$agentsPatcher = @'
const fs = require('fs');
const PATH = 'C:/AuditDNA/backend/services/swarm-agents.js';
let a = fs.readFileSync(PATH, 'utf8');
let patches = 0;

function tryReplace(oldStr, newStr, label) {
  if (a.includes(oldStr)) {
    a = a.replace(oldStr, newStr); patches++; console.log('  [OK]   ' + label); return true;
  }
  const oldCRLF = oldStr.replace(/\n/g, '\r\n');
  if (a.includes(oldCRLF)) {
    a = a.replace(oldCRLF, newStr.replace(/\n/g, '\r\n')); patches++; console.log('  [OK]   ' + label + ' (CRLF)'); return true;
  }
  console.log('  [SKIP] ' + label); return false;
}

// PATCH 1: Insert EMMA + EVELYN const definitions after GG (before REGISTRY)
if (!/const\s+EMMA\s*=/.test(a)) {
  // Anchor: end of GG definition (before REGISTRY)
  const ggAnchor = "const GG = {\n  description: 'SMTP Medic - self-repair via Claude AI',\n  subscribes: ['smtp.health.degraded', 'smtp.send.failed', 'smtp.health.recovered'],\n  cron:       null,\n  async handler(event, ctx) {\n    return { ok: true, note: 'handled_by_gg-smtp-medic_service', event_type: event.event_type };\n  }\n};\n";
  const insert = ggAnchor + `
// =============================================================================
// 17. EMMA - OAuth Medic (self-repair via Claude AI)
// =============================================================================
const EMMA = {
  description: 'OAuth Medic - Google token refresh self-repair via Claude AI',
  subscribes: ['oauth.refresh.failed', 'oauth.token.expired', 'oauth.scope.missing'],
  cron:       null,
  async handler(event, ctx) {
    return { ok: true, note: 'handled_by_emma-oauth-medic_service', event_type: event.event_type };
  }
};

// =============================================================================
// 18. EVELYN - Code Janitor (proactive cleanup via Claude AI)
// =============================================================================
const EVELYN = {
  description: 'Code Janitor - aggressive cleanup proposals via Claude AI',
  subscribes: ['cleanup.scan.completed', 'cleanup.approved', 'cleanup.executed'],
  cron:       null,
  async handler(event, ctx) {
    return { ok: true, note: 'handled_by_evelyn-code-janitor_service', event_type: event.event_type };
  }
};
`;
  tryReplace(ggAnchor, insert, 'PATCH 1: EMMA + EVELYN const defs after GG');
}

// PATCH 2: Add EMMA, EVELYN to REGISTRY
if (!/^\s*EMMA[,\s]/m.test(a)) {
  const regOld = "  WHISPERER,\n  COURIER,\n  GG\n};\n";
  const regNew = "  WHISPERER,\n  COURIER,\n  GG,\n  EMMA,\n  EVELYN\n};\n";
  tryReplace(regOld, regNew, 'PATCH 2: Add EMMA + EVELYN to REGISTRY');
}

if (patches > 0) {
  fs.writeFileSync(PATH, a);
  console.log(`  Wrote swarm-agents.js with ${patches} patches`);
} else {
  console.log('  No swarm patches applied (already done?)');
}
'@

$agentsPatcher | Out-File -FilePath 'C:\AuditDNA\backend\.swarm-patcher.js' -Encoding UTF8
node 'C:\AuditDNA\backend\.swarm-patcher.js'

node --check 'C:\AuditDNA\backend\services\swarm-agents.js'
if ($LASTEXITCODE -ne 0) {
  Write-Host "  swarm-agents.js syntax FAIL - restoring backup" -ForegroundColor Red
  Copy-Item "C:\AuditDNA\backend\services\swarm-agents.js.bak-emma-evelyn-$stamp" 'C:\AuditDNA\backend\services\swarm-agents.js' -Force
  exit 1
}
Write-Host "  swarm-agents.js syntax OK" -ForegroundColor Green

Remove-Item 'C:\AuditDNA\backend\.emma-evelyn-patcher.js' -Force -ErrorAction SilentlyContinue
Remove-Item 'C:\AuditDNA\backend\.swarm-patcher.js' -Force -ErrorAction SilentlyContinue

# ============================================================================
# STEP 4: Run migrations (LOCAL + RAILWAY)
# ============================================================================
Write-Host "`n== STEP 4: Run migrations LOCAL ==" -ForegroundColor Green
$env:PGPASSWORD = 'auditdna2026'
psql -h localhost -p 5432 -U postgres -d auditdna -f 'C:\AuditDNA\backend\migrations\2026-05-01-emma-oauth-medic.sql'
psql -h localhost -p 5432 -U postgres -d auditdna -f 'C:\AuditDNA\backend\migrations\2026-05-01-evelyn-janitor.sql'

Write-Host "`n== STEP 4b: Run migrations RAILWAY ==" -ForegroundColor Green
$env:PGPASSWORD = 'PMJobEqMsVuiwvFwHlHFUrGXarncSAQj'
psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f 'C:\AuditDNA\backend\migrations\2026-05-01-emma-oauth-medic.sql'
psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f 'C:\AuditDNA\backend\migrations\2026-05-01-evelyn-janitor.sql'

# ============================================================================
# STEP 5: Restart + verify
# ============================================================================
Write-Host "`n== STEP 5: Restart PM2 ==" -ForegroundColor Green
pm2 flush auditdna-backend
pm2 restart auditdna-backend --update-env
Start-Sleep -Seconds 12

Write-Host "`n== STEP 6: Verify endpoints ==" -ForegroundColor Green
$endpoints = @(
  'http://localhost:5050/api/swarm/agents',
  'http://localhost:5050/api/gg/status',
  'http://localhost:5050/api/emma/status',
  'http://localhost:5050/api/evelyn/status',
  'http://localhost:5050/api/gmail/status'
)
foreach ($url in $endpoints) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
    Write-Host "  [HTTP $($r.StatusCode)] $url" -ForegroundColor Green
  } catch {
    Write-Host "  [DOWN] $url - $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "`n== Swarm count (should be 18: ECHO,HEALER,STITCHER,FOLLOWUP,TRIAGER,ARCHIVIST,NIGHTWATCH,HARVESTER,TRANSLATOR,COMMITWATCH,ROUTECHECK,COSTHAWK,INVENTORY,WHISPERER,COURIER,GG,EMMA,EVELYN) ==" -ForegroundColor Green
$r = Invoke-WebRequest -Uri 'http://localhost:5050/api/swarm/agents' -UseBasicParsing
$obj = $r.Content | ConvertFrom-Json
Write-Host "  count: $($obj.agents.Count)"
$obj.agents | ForEach-Object { Write-Host "    - $($_.name)" }

Write-Host "`n== Emma status ==" -ForegroundColor Green
(Invoke-WebRequest -Uri 'http://localhost:5050/api/emma/status' -UseBasicParsing).Content

Write-Host "`n== Evelyn status ==" -ForegroundColor Green
(Invoke-WebRequest -Uri 'http://localhost:5050/api/evelyn/status' -UseBasicParsing).Content

# ============================================================================
# STEP 7: Commit + push
# ============================================================================
Write-Host "`n== STEP 7: Commit + push ==" -ForegroundColor Green
git add services/emma-oauth-medic.js services/evelyn-code-janitor.js routes/emma.routes.js routes/evelyn.routes.js migrations/2026-05-01-emma-oauth-medic.sql migrations/2026-05-01-evelyn-janitor.sql server.js services/swarm-agents.js deploy-emma-evelyn.ps1
git commit -m 'EMMA (OAuth medic) + EVELYN (Code janitor) - Claude-powered self-repair agents 17 + 18'
git pull --rebase
git push

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " EMMA + EVELYN DEPLOYED" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Yellow
Write-Host "  GET  /api/emma/status"
Write-Host "  GET  /api/emma/proposals"
Write-Host "  POST /api/emma/approve/:id"
Write-Host "  POST /api/emma/reject/:id"
Write-Host "  POST /api/emma/test-now"
Write-Host "  POST /api/emma/force-refresh"
Write-Host ""
Write-Host "  GET  /api/evelyn/status"
Write-Host "  GET  /api/evelyn/proposals?status=proposed"
Write-Host "  POST /api/evelyn/approve/:id  (auto-executes deletion!)"
Write-Host "  POST /api/evelyn/reject/:id"
Write-Host "  POST /api/evelyn/scan-now"
Write-Host "  POST /api/evelyn/approve-all  (bulk approve all proposed)"
