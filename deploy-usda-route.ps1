# ═══════════════════════════════════════════════════════════════
# AUDITDNA - DEPLOY USDA ROUTE
# Run from: C:\AuditDNA\backend\
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " AUDITDNA - USDA ROUTE DEPLOYMENT" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 1. CHECK WE'RE IN THE RIGHT FOLDER ──
$routesDir = ".\routes"
if (-Not (Test-Path $routesDir)) {
    Write-Host "[ERROR] routes/ folder not found. Run this from C:\AuditDNA\backend\" -ForegroundColor Red
    exit 1
}

$serverFile = ".\server.js"
if (-Not (Test-Path $serverFile)) {
    Write-Host "[ERROR] server.js not found. Run this from C:\AuditDNA\backend\" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Running from: $(Get-Location)" -ForegroundColor Green

# ── 2. CHECK DEPENDENCIES (USDA route uses ONLY native https - nothing to install) ──
Write-Host ""
Write-Host "[CHECK] Verifying installed packages..." -ForegroundColor Yellow

$packageJson = Get-Content ".\package.json" -Raw | ConvertFrom-Json
$deps = $packageJson.dependencies.PSObject.Properties.Name

$required = @("express", "dotenv", "pg")
$missing = @()

foreach ($dep in $required) {
    if ($deps -contains $dep) {
        Write-Host "  [OK] $dep" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $dep" -ForegroundColor Red
        $missing += $dep
    }
}

Write-Host "  [OK] https (native Node.js - no install needed)" -ForegroundColor Green
Write-Host "  [OK] Buffer (native Node.js - no install needed)" -ForegroundColor Green

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "[INSTALLING] $($missing -join ', ')..." -ForegroundColor Yellow
    npm install $($missing -join ' ') --save
} else {
    Write-Host ""
    Write-Host "[OK] All dependencies satisfied. Zero new packages needed." -ForegroundColor Green
}

# ── 3. CHECK IF USDA ROUTE ALREADY EXISTS ──
$usdaRoute = "$routesDir\usda.js"
if (Test-Path $usdaRoute) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backup = "$routesDir\usda.BACKUP_$timestamp.js"
    Copy-Item $usdaRoute $backup
    Write-Host ""
    Write-Host "[BACKUP] Existing usda.js backed up to: $backup" -ForegroundColor Yellow
}

# ── 4. CHECK .env FOR USDA_API_KEY ──
Write-Host ""
$envFile = ".\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "USDA_API_KEY") {
        Write-Host "[OK] USDA_API_KEY found in .env" -ForegroundColor Green
    } else {
        Write-Host "[ADDING] USDA_API_KEY to .env..." -ForegroundColor Yellow
        Add-Content $envFile "`nUSDA_API_KEY=4F158DB1-85C2-3243-BFFA-58B53FB40D23"
        Write-Host "[OK] Added USDA_API_KEY to .env" -ForegroundColor Green
    }
} else {
    Write-Host "[WARNING] No .env file found. USDA route will use hardcoded fallback key." -ForegroundColor Yellow
}

# ── 5. COUNT CURRENT ROUTES ──
$currentRoutes = (Get-ChildItem "$routesDir\*.js" | Where-Object { $_.Name -notmatch "BACKUP" }).Count
Write-Host ""
Write-Host "[INFO] Current route files: $currentRoutes" -ForegroundColor Cyan

# ── 6. LIST ALL ROUTE FILES ──
Write-Host ""
Write-Host "[ROUTES] Current files in routes/:" -ForegroundColor Cyan
Get-ChildItem "$routesDir\*.js" | Where-Object { $_.Name -notmatch "BACKUP" } | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 1)
    Write-Host "  $($_.Name) (${size}KB)" -ForegroundColor Gray
}

# ── 7. DONE - INSTRUCTIONS ──
Write-Host ""
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " NEXT STEPS:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Copy the usda.js file (from Claude) into:" -ForegroundColor White
Write-Host "     C:\AuditDNA\backend\routes\usda.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Restart the server:" -ForegroundColor White
Write-Host "     npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Test these endpoints:" -ForegroundColor White
Write-Host "     http://localhost:5050/api/usda/commodities" -ForegroundColor Yellow
Write-Host "     http://localhost:5050/api/usda/reports" -ForegroundColor Yellow
Write-Host "     http://localhost:5050/api/usda/search/Avocados" -ForegroundColor Yellow
Write-Host "     http://localhost:5050/api/usda/terminal-markets?commodity=Avocados" -ForegroundColor Yellow
Write-Host "     http://localhost:5050/api/usda/nass?commodity=AVOCADOS&year=2024" -ForegroundColor Yellow
Write-Host "     http://localhost:5050/api/usda/fda/recalls?search=avocado" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Auto-mounts as /api/usda/* (server.js auto-loader handles it)" -ForegroundColor Gray
Write-Host ""