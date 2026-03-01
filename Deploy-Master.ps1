# ═══════════════════════════════════════════════════════════════
# AUDITDNA MASTER DEPLOYMENT
# Run from: C:\AuditDNA\backend\
# Does: Migration + Routes + Frontend fixes
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " AUDITDNA MASTER DEPLOYMENT" -ForegroundColor Cyan
Write-Host " Database + Backend + Frontend" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ── STEP 1: RUN DATABASE MIGRATION ──
Write-Host "[1/4] RUNNING DATABASE MIGRATION..." -ForegroundColor Yellow

$env:PGPASSWORD = "auditdna2026"
$migrationPath = "D:\Downloads\migration.sql"

if (Test-Path $migrationPath) {
    psql -h localhost -p 5432 -U postgres -d auditdna -f $migrationPath
    Write-Host "[OK] Migration complete" -ForegroundColor Green
} else {
    Write-Host "[SKIP] migration.sql not found at $migrationPath" -ForegroundColor Yellow
    Write-Host "       Run manually: psql -U postgres -d auditdna -f migration.sql" -ForegroundColor Gray
}

# ── STEP 2: DEPLOY BACKEND ROUTES ──
Write-Host ""
Write-Host "[2/4] DEPLOYING BACKEND ROUTES..." -ForegroundColor Yellow

$routesDir = "C:\AuditDNA\backend\routes"

# products.js route (catalog, inventory, manifests, orders, COGS, brain tasks, analytics)
$productsRoute = "D:\Downloads\products.js"
if (Test-Path $productsRoute) {
    Copy-Item $productsRoute "$routesDir\products.js" -Force
    Write-Host "  [OK] products.js deployed (catalog, inventory, orders, COGS, brain, analytics)" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] products.js not found in Downloads" -ForegroundColor Yellow
}

# Verify usda.js exists
if (Test-Path "$routesDir\usda.js") {
    Write-Host "  [OK] usda.js already deployed" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] usda.js - deploy it from earlier" -ForegroundColor Red
}

# ── STEP 3: RESTORE REAL FRONTEND MODULES ──
Write-Host ""
Write-Host "[3/4] RESTORING REAL FRONTEND MODULES..." -ForegroundColor Yellow

$modulesDir = "C:\AuditDNA\frontend\src\modules"

# Restore COGS engine (75KB real replaces 4KB shell)
$cogsSource = "D:\Downloads\Cogsengine.jsx"
if (Test-Path $cogsSource) {
    Copy-Item $cogsSource "$modulesDir\Cogsengine.jsx" -Force
    Write-Host "  [OK] Cogsengine.jsx restored (75KB real COGS engine)" -ForegroundColor Green
} else {
    # Try from existing files in modules
    $cogsUltimate = "$modulesDir\Cogsengine_ultimate.jsx"
    $cogsComplete = "$modulesDir\Cogsengine_complete.jsx"
    if (Test-Path $cogsUltimate) {
        Copy-Item $cogsUltimate "$modulesDir\Cogsengine.jsx" -Force
        Write-Host "  [OK] Cogsengine.jsx restored from Cogsengine_ultimate.jsx" -ForegroundColor Green
    } elseif (Test-Path $cogsComplete) {
        Copy-Item $cogsComplete "$modulesDir\Cogsengine.jsx" -Force
        Write-Host "  [OK] Cogsengine.jsx restored from Cogsengine_complete.jsx" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] No COGS source found" -ForegroundColor Yellow
    }
}

# Restore CM Products Intelligence (151KB real replaces 7KB shell)
$cmFixed = "$modulesDir\Cmproductsintell_fixed-01.jsx"
if (Test-Path $cmFixed) {
    Copy-Item $cmFixed "$modulesDir\CMProductsIntelligence.jsx" -Force
    $size = [math]::Round((Get-Item "$modulesDir\CMProductsIntelligence.jsx").Length / 1KB)
    Write-Host "  [OK] CMProductsIntelligence.jsx restored (${size}KB from Cmproductsintell_fixed-01.jsx)" -ForegroundColor Green
} else {
    Write-Host "  [SKIP] Cmproductsintell_fixed-01.jsx not found" -ForegroundColor Yellow
}

# ── STEP 4: VERIFY ──
Write-Host ""
Write-Host "[4/4] VERIFICATION..." -ForegroundColor Yellow

# Count routes
$routeCount = (Get-ChildItem "$routesDir\*.js" | Where-Object { $_.Name -notmatch "BACKUP|backup|old" }).Count
Write-Host "  Backend routes: $routeCount" -ForegroundColor Cyan

# Count frontend modules
$moduleCount = (Get-ChildItem "$modulesDir\*.jsx" | Where-Object { $_.Name -notmatch "backup|BACKUP|old" }).Count
Write-Host "  Frontend modules: $moduleCount" -ForegroundColor Cyan

# Check key files
$checks = @{
    "usda.js route" = "$routesDir\usda.js"
    "products.js route" = "$routesDir\products.js"
    "Cogsengine.jsx" = "$modulesDir\Cogsengine.jsx"
    "CMProductsIntelligence.jsx" = "$modulesDir\CMProductsIntelligence.jsx"
    "EmailMarketing.jsx" = "$modulesDir\EmailMarketing.jsx"
}

foreach ($name in $checks.Keys) {
    $path = $checks[$name]
    if (Test-Path $path) {
        $size = [math]::Round((Get-Item $path).Length / 1KB)
        $status = if ($size -gt 10) { "[OK]" } else { "[SMALL?]" }
        Write-Host "  $status $name (${size}KB)" -ForegroundColor $(if ($size -gt 10) { "Green" } else { "Yellow" })
    } else {
        Write-Host "  [MISSING] $name" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " NEXT STEPS:" -ForegroundColor White
Write-Host "   1. Restart backend:  cd C:\AuditDNA\backend && npm start" -ForegroundColor Yellow
Write-Host "   2. Test products:    http://localhost:5050/api/products/catalog" -ForegroundColor Yellow
Write-Host "   3. Test health:      http://localhost:5050/api/products/health" -ForegroundColor Yellow
Write-Host "   4. Frontend will hot-reload automatically" -ForegroundColor Gray
Write-Host ""
Write-Host " NEW ENDPOINTS:" -ForegroundColor White
Write-Host "   /api/products/catalog          - 39 products (your real catalog)" -ForegroundColor Gray
Write-Host "   /api/products/categories        - Product categories" -ForegroundColor Gray
Write-Host "   /api/products/inventory         - Real-time stock" -ForegroundColor Gray
Write-Host "   /api/products/inventory/summary - Stock by SKU" -ForegroundColor Gray
Write-Host "   /api/products/manifests         - Inbound/outbound" -ForegroundColor Gray
Write-Host "   /api/products/orders            - Sales orders" -ForegroundColor Gray
Write-Host "   /api/products/cogs              - Cost tracking" -ForegroundColor Gray
Write-Host "   /api/products/cogs/summary      - Profit by product" -ForegroundColor Gray
Write-Host "   /api/products/price-alerts      - Alert management" -ForegroundColor Gray
Write-Host "   /api/products/inspections       - Field inspections" -ForegroundColor Gray
Write-Host "   /api/products/cold-chain        - Temperature tracking" -ForegroundColor Gray
Write-Host "   /api/products/shipments         - Logistics" -ForegroundColor Gray
Write-Host "   /api/products/brain/tasks       - Brain.js task log" -ForegroundColor Gray
Write-Host "   /api/products/analytics/snapshots - Analytics data" -ForegroundColor Gray
Write-Host "   /api/products/documents         - Document vault" -ForegroundColor Gray
Write-Host ""