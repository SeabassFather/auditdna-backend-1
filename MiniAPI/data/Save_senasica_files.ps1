# ============================================
# SAVE SENASICA FILES TO PROPER LOCATIONS
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SAVING SENASICA EMAIL FILES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$Downloads = "$env:USERPROFILE\Downloads"
$Backend = "C:\AuditDNA\frontend\backend"
$Data = "$Backend\MiniAPI\data"
$Seeds = "$Backend\database\seeds"

# Create directories if needed
@($Data, $Seeds, "$Backend\scripts") | ForEach-Object {
    if (!(Test-Path $_)) { 
        New-Item -ItemType Directory -Path $_ -Force | Out-Null 
        Write-Host "  Created: $_" -ForegroundColor Gray
    }
}

# Move files to proper locations
Write-Host "`n[1] Moving senasica_email_candidates.csv..." -ForegroundColor Yellow
if (Test-Path "$Downloads\senasica_email_candidates.csv") {
    Copy-Item "$Downloads\senasica_email_candidates.csv" -Destination "$Data\senasica_email_candidates.csv" -Force
    Write-Host "  SAVED: $Data\senasica_email_candidates.csv" -ForegroundColor Green
} else {
    Write-Host "  NOT FOUND in Downloads" -ForegroundColor Red
}

Write-Host "`n[2] Moving senasica_with_emails.json..." -ForegroundColor Yellow
if (Test-Path "$Downloads\senasica_with_emails.json") {
    Copy-Item "$Downloads\senasica_with_emails.json" -Destination "$Data\senasica_with_emails.json" -Force
    Write-Host "  SAVED: $Data\senasica_with_emails.json" -ForegroundColor Green
} else {
    Write-Host "  NOT FOUND in Downloads" -ForegroundColor Red
}

Write-Host "`n[3] Moving scrape_senasica_emails.js..." -ForegroundColor Yellow
if (Test-Path "$Downloads\scrape_senasica_emails.js") {
    Copy-Item "$Downloads\scrape_senasica_emails.js" -Destination "$Backend\scripts\scrape_senasica_emails.js" -Force
    Write-Host "  SAVED: $Backend\scripts\scrape_senasica_emails.js" -ForegroundColor Green
} else {
    Write-Host "  NOT FOUND in Downloads" -ForegroundColor Red
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  FILES SAVED TO:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CSV:    $Data\senasica_email_candidates.csv" -ForegroundColor White
Write-Host "  JSON:   $Data\senasica_with_emails.json" -ForegroundColor White
Write-Host "  Script: $Backend\scripts\scrape_senasica_emails.js" -ForegroundColor White
Write-Host ""
Write-Host "  Open CSV in Excel:" -ForegroundColor Yellow
Write-Host "  Start-Process '$Data\senasica_email_candidates.csv'" -ForegroundColor Gray
Write-Host ""