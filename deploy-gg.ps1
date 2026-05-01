# =============================================================================
# GG DEPLOY SCRIPT
# File: C:\AuditDNA\backend\deploy-gg.ps1
# Run from C:\AuditDNA\backend after copying gg-smtp-medic.js, gg.routes.js, and
# the SQL migration into their respective folders.
# =============================================================================

$ErrorActionPreference = 'Stop'
Set-Location 'C:\AuditDNA\backend'
$server = 'C:\AuditDNA\backend\server.js'
$stamp  = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "`n=========================================================" -ForegroundColor Green
Write-Host " GG DEPLOY - SMTP DEDUPE + SELF-REPAIR AGENT" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

# ============================================================================
# STEP 0 - Verify prerequisites on disk
# ============================================================================
Write-Host "`n== STEP 0: Verify files in place ==" -ForegroundColor Cyan
$required = @(
  'C:\AuditDNA\backend\services\gg-smtp-medic.js',
  'C:\AuditDNA\backend\routes\gg.routes.js',
  'C:\AuditDNA\backend\migrations\2026-05-01-gg-smtp-medic.sql'
)
foreach ($f in $required) {
  if (-not (Test-Path $f)) {
    Write-Host "  [MISSING] $f" -ForegroundColor Red
    Write-Host "  Copy from D:\Downloads\gg-deploy\ first" -ForegroundColor Yellow
    return
  }
  Write-Host "  [OK] $f" -ForegroundColor Green
}
node --check 'C:\AuditDNA\backend\services\gg-smtp-medic.js'
if ($LASTEXITCODE -ne 0) { Write-Host "  gg-smtp-medic.js syntax FAIL" -ForegroundColor Red; return }
node --check 'C:\AuditDNA\backend\routes\gg.routes.js'
if ($LASTEXITCODE -ne 0) { Write-Host "  gg.routes.js syntax FAIL" -ForegroundColor Red; return }
Write-Host "  Both new files syntax-clean" -ForegroundColor Green

# ============================================================================
# STEP 1 - Backup server.js
# ============================================================================
Write-Host "`n== STEP 1: Backup server.js ==" -ForegroundColor Cyan
Copy-Item $server "$server.bak-gg-$stamp"
Write-Host "  $server.bak-gg-$stamp" -ForegroundColor Cyan

# ============================================================================
# STEP 2 - Inject shared transporter at module scope (after app.set('pool', pool))
# ============================================================================
Write-Host "`n== STEP 2: Inject shared transporter at module scope ==" -ForegroundColor Cyan
$srv = Get-Content $server -Raw

if ($srv -match "GG SHARED SMTP TRANSPORTER") {
  Write-Host "  Already injected - skipping" -ForegroundColor Yellow
} else {
  $oldAnchor = "app.set('pool', pool);"
  $newBlock = @'
app.set('pool', pool);

// =============================================================================
// GG SHARED SMTP TRANSPORTER - 2026-05-01
// Single Gmail-only transporter. Used by ALL inline send sites + GG medic.
// Standing rule: smtp.gmail.com:587, secure=false, sgarcia1911@gmail.com
// =============================================================================
const __ggNodemailer = require('nodemailer');
const sharedTransporter = __ggNodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'sgarcia1911@gmail.com',
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
app.set('smtp', sharedTransporter);
'@
  if (-not $srv.Contains($oldAnchor)) {
    Write-Host "  ANCHOR NOT FOUND: '$oldAnchor'" -ForegroundColor Red
    return
  }
  $srv = $srv.Replace($oldAnchor, $newBlock)
  Write-Host "  Shared transporter injected" -ForegroundColor Green
}

# ============================================================================
# STEP 3 - Replace inline transporter at line 511-517 (recovery email)
# ============================================================================
Write-Host "`n== STEP 3: Replace recovery-email inline transporter ==" -ForegroundColor Cyan
$old1 = @'
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
'@
$new1 = @'
    const transporter = sharedTransporter;
    if (process.env.SMTP_USER) {
      await transporter.sendMail({
'@
if ($srv.Contains($old1)) {
  $srv = $srv.Replace($old1, $new1)
  Write-Host "  Recovery transporter replaced with sharedTransporter" -ForegroundColor Green
} else {
  Write-Host "  Recovery block not found verbatim - already patched or whitespace mismatch" -ForegroundColor Yellow
}

# ============================================================================
# STEP 4 - Replace inline transporter at line 558-607 (campaign send + GoDaddy)
# ============================================================================
Write-Host "`n== STEP 4: Replace campaign-send inline transporter (kills GoDaddy) ==" -ForegroundColor Cyan
$old2 = @'
    const nodemailer = require('nodemailer');
    const crypto     = require('crypto');
'@
$new2 = @'
    const crypto     = require('crypto');
'@
if ($srv.Contains($old2)) {
  $srv = $srv.Replace($old2, $new2)
  Write-Host "  Removed redundant nodemailer require in campaign block" -ForegroundColor Green
} else {
  Write-Host "  Campaign require block not found - already patched" -ForegroundColor Yellow
}

$old3 = @'
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtpout.secureserver.net',
      port:   parseInt(process.env.SMTP_PORT || '465'),
      secure: parseInt(process.env.SMTP_PORT || '465') === 465,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    });
'@
$new3 = @'
    const transporter = sharedTransporter;
'@
if ($srv.Contains($old3)) {
  $srv = $srv.Replace($old3, $new3)
  Write-Host "  Campaign transporter replaced with sharedTransporter (GoDaddy gone)" -ForegroundColor Green
} else {
  Write-Host "  Campaign transporter block not found verbatim" -ForegroundColor Yellow
}

# ============================================================================
# STEP 5 - Mount /api/gg route
# ============================================================================
Write-Host "`n== STEP 5: Mount /api/gg route ==" -ForegroundColor Cyan
if ($srv -match "require\('\./routes/gg\.routes'\)") {
  Write-Host "  Already mounted" -ForegroundColor Yellow
} else {
  $mountAnchor = "app.use('/api/swarm', require('./routes/swarm.routes'));"
  $mountInsert = @"
app.use('/api/swarm', require('./routes/swarm.routes'));
app.use('/api/gg',    require('./routes/gg.routes'));
"@
  if ($srv.Contains($mountAnchor)) {
    $srv = $srv.Replace($mountAnchor, $mountInsert)
    Write-Host "  /api/gg mounted next to swarm.routes" -ForegroundColor Green
  } else {
    Write-Host "  Swarm mount anchor not found - need manual mount" -ForegroundColor Red
  }
}

# ============================================================================
# STEP 6 - Auto-start GG inside __server.listen callback
# ============================================================================
Write-Host "`n== STEP 6: Auto-start GG inside __server.listen ==" -ForegroundColor Cyan
if ($srv -match "gg-smtp-medic") {
  Write-Host "  Already auto-starting" -ForegroundColor Yellow
} else {
  $startAnchor = "console.log('[SWARM] Phase 4 coordinator startup invoked');"
  $startInsert = @"
console.log('[SWARM] Phase 4 coordinator startup invoked');
    }
  } catch (err) {
    console.error('[SWARM] coordinator load error:', err.message);
  }

  // ============================================================
  // 2026-05-01: Auto-start GG SMTP Medic agent
  // ============================================================
  try {
    const gg = require('./services/gg-smtp-medic');
    gg.init({ pool, aiHelper, transporter: sharedTransporter });
    gg.start().catch(e => console.error('[GG] start error:', e.message));
    console.log('[GG] SMTP Medic startup invoked');
  } catch (err) {
    console.error('[GG] load error:', err.message);
  }

  // KEEP THIS BRACE - it closes the next try-catch placeholder
  try { /* placeholder */
"@
  # The original block is "console.log('[SWARM]...'); }} catch ... {}" - we surgically extend it
  # Use a simpler approach: just inject a new try-catch RIGHT AFTER the swarm catch closes
  $simpleAnchor = @'
    if (swarmCoord && typeof swarmCoord.start === 'function') {
      swarmCoord.start({ pool });
      console.log('[SWARM] Phase 4 coordinator startup invoked');
    }
  } catch (err) {
    console.error('[SWARM] coordinator load error:', err.message);
  }
'@
  $simpleInsert = @'
    if (swarmCoord && typeof swarmCoord.start === 'function') {
      swarmCoord.start({ pool });
      console.log('[SWARM] Phase 4 coordinator startup invoked');
    }
  } catch (err) {
    console.error('[SWARM] coordinator load error:', err.message);
  }

  // ============================================================
  // 2026-05-01: Auto-start GG SMTP Medic agent
  // ============================================================
  try {
    const gg = require('./services/gg-smtp-medic');
    gg.init({ pool, aiHelper, transporter: sharedTransporter });
    gg.start().catch(e => console.error('[GG] start error:', e.message));
    console.log('[GG] SMTP Medic startup invoked');
  } catch (err) {
    console.error('[GG] load error:', err.message);
  }
'@
  if ($srv.Contains($simpleAnchor)) {
    $srv = $srv.Replace($simpleAnchor, $simpleInsert)
    Write-Host "  GG auto-start injected" -ForegroundColor Green
  } else {
    Write-Host "  Swarm startup anchor not found verbatim - showing context for manual fix:" -ForegroundColor Red
    Select-String -Path $server -Pattern 'swarm-coordinator|SWARM.*coordinator' | Select-Object LineNumber, Line | Format-Table -AutoSize -Wrap
    return
  }
}

# ============================================================================
# STEP 7 - Save + syntax check
# ============================================================================
Write-Host "`n== STEP 7: Save server.js + syntax check ==" -ForegroundColor Cyan
Set-Content -Path $server -Value $srv -NoNewline -Encoding UTF8
node --check $server
if ($LASTEXITCODE -ne 0) {
  Write-Host "  SYNTAX FAIL - restoring backup" -ForegroundColor Red
  Copy-Item "$server.bak-gg-$stamp" $server -Force
  return
}
Write-Host "  server.js syntax OK" -ForegroundColor Green

# ============================================================================
# STEP 8 - Run migration on local + Railway
# ============================================================================
Write-Host "`n== STEP 8: Run migration (LOCAL postgres) ==" -ForegroundColor Cyan
$env:PGPASSWORD = 'auditdna2026'
psql -h localhost -p 5432 -U postgres -d auditdna -f 'C:\AuditDNA\backend\migrations\2026-05-01-gg-smtp-medic.sql'

Write-Host "`n== STEP 8b: Run migration (RAILWAY) ==" -ForegroundColor Cyan
$env:PGPASSWORD = 'PMJobEqMsVuiwvFwHlHFUrGXarncSAQj'
psql -h hopper.proxy.rlwy.net -p 55424 -U postgres -d railway -f 'C:\AuditDNA\backend\migrations\2026-05-01-gg-smtp-medic.sql'

# ============================================================================
# STEP 9 - Wire GG into swarm-agents.js as 16th agent
# ============================================================================
Write-Host "`n== STEP 9: Register GG in swarm-agents.js ==" -ForegroundColor Cyan
$agentsFile = 'C:\AuditDNA\backend\services\swarm-agents.js'
$agentsContent = Get-Content $agentsFile -Raw
if ($agentsContent -match "GG:\s*\{") {
  Write-Host "  GG already in REGISTRY" -ForegroundColor Yellow
} else {
  # Find COURIER entry and append GG after it
  $courierAnchor = @'
  COURIER: {
'@
  if ($agentsContent.Contains($courierAnchor)) {
    # Insert before COURIER (safest - we add a new entry after the comma of the previous one)
    # Actually safer: just append before the closing of REGISTRY
    Write-Host "  Adding GG entry programmatically (manual review recommended)" -ForegroundColor Yellow
    $registryEnd = "};`r`n`r`nmodule.exports"
    if (-not $agentsContent.Contains($registryEnd)) {
      $registryEnd = "};`nmodule.exports"
    }
    if ($agentsContent.Contains($registryEnd)) {
      $ggEntry = @'
  GG: {
    name: 'GG',
    description: 'SMTP Medic - self-repair via Claude AI',
    subscribes: ['smtp.health.degraded', 'smtp.send.failed'],
  },
};

module.exports
'@
      $agentsContent = $agentsContent.Replace($registryEnd, $ggEntry)
      Set-Content -Path $agentsFile -Value $agentsContent -NoNewline -Encoding UTF8
      node --check $agentsFile
      if ($LASTEXITCODE -ne 0) {
        Write-Host "  swarm-agents.js syntax FAIL after GG insert - manual fix needed" -ForegroundColor Red
      } else {
        Write-Host "  GG registered in swarm-agents REGISTRY" -ForegroundColor Green
      }
    } else {
      Write-Host "  Could not find REGISTRY end - skip swarm registration" -ForegroundColor Yellow
    }
  }
}

# ============================================================================
# STEP 10 - Restart PM2
# ============================================================================
Write-Host "`n== STEP 10: Restart PM2 ==" -ForegroundColor Cyan
pm2 restart auditdna-backend --update-env
Start-Sleep -Seconds 10

Write-Host "`n== STEP 11: Verify ==" -ForegroundColor Cyan
Get-Content 'C:\Users\Mexausa\.pm2\logs\auditdna-backend-out.log' | Select-String -Pattern 'GG|SMTP Medic|sharedTransporter' | Select-Object -Last 15

Write-Host "`n== /api/gg/status ==" -ForegroundColor Cyan
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:5050/api/gg/status' -UseBasicParsing -TimeoutSec 5
  Write-Host $r.Content -ForegroundColor Green
} catch {
  Write-Host "  GG endpoint: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n== /api/gg/test-now (force immediate verify) ==" -ForegroundColor Cyan
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:5050/api/gg/test-now' -Method POST -UseBasicParsing -TimeoutSec 10
  Write-Host $r.Content -ForegroundColor Green
} catch {
  Write-Host "  test-now: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================================================
# STEP 12 - Commit + push
# ============================================================================
Write-Host "`n== STEP 12: Commit + push ==" -ForegroundColor Cyan
git add server.js services/gg-smtp-medic.js services/swarm-agents.js routes/gg.routes.js migrations/2026-05-01-gg-smtp-medic.sql
git status
git commit -m 'GG: SMTP self-repair AI agent (Claude-powered) + SMTP dedupe (kills GoDaddy fallback) + 16th swarm agent'
git pull --rebase
git push

Write-Host "`n=========================================================" -ForegroundColor Green
Write-Host " GG DEPLOY COMPLETE" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "Endpoints:"
Write-Host "  GET  /api/gg/status"
Write-Host "  GET  /api/gg/proposals"
Write-Host "  GET  /api/gg/proposals/:id"
Write-Host "  POST /api/gg/approve/:id"
Write-Host "  POST /api/gg/reject/:id"
Write-Host "  POST /api/gg/test-now"
