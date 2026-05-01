# C:\AuditDNA\backend\patch-phase2-tables.ps1
# Renames production_declarations -> production_declarations_v2 in declarations service.
# Renames rfq_disputes -> rfq_disputes_v2 in disputes service.
# Updates price-alerts to query the v2 declarations table.
# Updates brain-events to use rfq_needs (already correct).

cd C:\AuditDNA\backend

# === 1. production-declarations.js ===
$f = 'services\production-declarations.js'
$c = Get-Content $f -Raw
Copy-Item $f "$f.pre-v2.bak" -Force
$c = $c.Replace('FROM production_declarations', 'FROM production_declarations_v2')
$c = $c.Replace('UPDATE production_declarations',     'UPDATE production_declarations_v2')
$c = $c.Replace('INTO production_declarations (',     'INTO production_declarations_v2 (')
Set-Content -Path $f -Value $c -NoNewline
Write-Host "OK production-declarations.js patched" -ForegroundColor Green

# === 2. disputes.js ===
$f = 'services\disputes.js'
$c = Get-Content $f -Raw
Copy-Item $f "$f.pre-v2.bak" -Force
$c = $c.Replace('FROM rfq_disputes ',  'FROM rfq_disputes_v2 ')
$c = $c.Replace('FROM rfq_disputes`n', "FROM rfq_disputes_v2`n")
$c = $c.Replace('UPDATE rfq_disputes ', 'UPDATE rfq_disputes_v2 ')
$c = $c.Replace('INTO rfq_disputes (',  'INTO rfq_disputes_v2 (')
$c = $c.Replace('rfq_disputes d',  'rfq_disputes_v2 d')
Set-Content -Path $f -Value $c -NoNewline
Write-Host "OK disputes.js patched" -ForegroundColor Green

# === 3. price-alerts.js (queries production_declarations) ===
$f = 'services\price-alerts.js'
$c = Get-Content $f -Raw
Copy-Item $f "$f.pre-v2.bak" -Force
$c = $c.Replace('FROM production_declarations pd', 'FROM production_declarations_v2 pd')
Set-Content -Path $f -Value $c -NoNewline
Write-Host "OK price-alerts.js patched" -ForegroundColor Green

# === Verify ===
Write-Host "`n=== Verification - should show only _v2 references ===" -ForegroundColor Cyan
Select-String -Path 'services\production-declarations.js','services\disputes.js','services\price-alerts.js' -Pattern "production_declarations|rfq_disputes" | Select-Object Path,LineNumber,Line | Format-Table -Wrap

# === Apply schema ===
Write-Host "`n=== Apply schema (v2) ===" -ForegroundColor Cyan
$env:DATABASE_URL = "postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway"
Get-Content 'C:\AuditDNA\backend\sql\phase2-schema.sql' | psql $env:DATABASE_URL

# === Commit + push ===
git add services\production-declarations.js services\disputes.js services\price-alerts.js sql\phase2-schema.sql
git commit -m "Phase 2 fix: rename to production_declarations_v2 + rfq_disputes_v2 to avoid collision with existing FSMA traceability + dispute v1 tables"
git push origin main

Start-Sleep -Seconds 90

$base = "https://auditdna-backend-1-production.up.railway.app"

Write-Host "`n--- Declarations open ---" -ForegroundColor Yellow
try { Invoke-RestMethod -Uri "$base/api/declarations/open" } catch {
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd() -ForegroundColor Red
  } else { Write-Host $_.Exception.Message -ForegroundColor Red }
}

Write-Host "`n--- Disputes admin queue ---" -ForegroundColor Yellow
try { Invoke-RestMethod -Uri "$base/api/disputes/admin/queue" } catch {
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd() -ForegroundColor Red
  } else { Write-Host $_.Exception.Message -ForegroundColor Red }
}

Write-Host "`n--- Create test declaration (avocados, grower 15121) ---" -ForegroundColor Yellow
$declBody = @{
  grower_id = 15121
  commodity_category = "avocados"
  commodity_subcategory = "hass_48"
  estimated_volume = 500
  volume_unit = "cases"
  available_from = "2026-05-01"
  available_to = "2026-05-15"
  ask_price = 36
  origin_country = "MX"
  origin_state = "Michoacan"
  organic = $false
  notes = "Phase 2 v2 smoke test"
} | ConvertTo-Json
try { (Invoke-RestMethod -Uri "$base/api/declarations" -Method POST -Body $declBody -ContentType "application/json") | ConvertTo-Json -Depth 4 } catch {
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd() -ForegroundColor Red
  } else { Write-Host $_.Exception.Message -ForegroundColor Red }
}

Write-Host "`n--- Test dispute on RFQ 5 (recipient 15121, grower 15121) ---" -ForegroundColor Yellow
$dispBody = @{
  rfq_id = 5
  raised_by_id = 1
  raised_by_role = "buyer"
  against_id = 15121
  against_role = "grower"
  category = "quality"
  description = "Phase 2 v2 dispute smoke test - hass count short and bruising on outer layer"
  gmv_amount = 6000
  currency = "USD"
} | ConvertTo-Json
try { (Invoke-RestMethod -Uri "$base/api/disputes" -Method POST -Body $dispBody -ContentType "application/json") | ConvertTo-Json -Depth 4 } catch {
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd() -ForegroundColor Red
  } else { Write-Host $_.Exception.Message -ForegroundColor Red }
}

Write-Host "`n--- Force price alert check (should now find the declaration) ---" -ForegroundColor Yellow
try { Invoke-RestMethod -Uri "$base/api/price-alerts/check-now" -Method POST } catch { $_.Exception.Message }
