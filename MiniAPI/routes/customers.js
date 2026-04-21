cd C:\AuditDNA\AUDIT_DNA_Frontend_Final\frontend\src

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "ðŸ”¥ FIXING App.js - REMOVING ALL GARBLE!" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Cyan

# Backup
Copy-Item "App.js" "App.js.GARBLE_BACKUP_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force
Write-Host "âœ… Backup created: App.js.GARBLE_BACKUP" -ForegroundColor Green

# Read file
$content = Get-Content "App.js" -Raw -Encoding UTF8

Write-Host "`nðŸ”§ Removing all garbled emojis..." -ForegroundColor Yellow

# Remove ALL garbled emojis
$content = $content -replace "Ã°Å¸  ", ""           # Home emoji
$content = $content -replace "Ã°Å¸'Â¼ ", ""          # Briefcase emoji
$content = $content -replace "Ã°Å¸Å’Â± ", ""          # Seedling emoji
$content = $content -replace "Ã°Å¸Â¥' ", ""          # Avocado emoji
$content = $content -replace "Ã°Å¸Â¥Â© ", ""          # Meat emoji
$content = $content -replace "Ã¢Å“â€¦ ", ""          # Checkmark emoji
$content = $content -replace "Ã°Å¸" ", ""           # Lock emoji
$content = $content -replace "Ã¢Å¡â„¢Ã¯Â¸ ", ""         # Gear emoji
$content = $content -replace "Ã°Å¸Â§Â¬ ", ""          # DNA emoji
$content = $content -replace "Ã°Å¸Å’ ", ""           # Globe emoji

# Fix Spanish accents
$content = $content -replace "pÃƒÂºblico", "pÃºblico"
$content = $content -replace "LogÃƒÂ­stica", "LogÃ­stica"
$content = $content -replace "EnvÃƒÂ­os", "EnvÃ­os"
$content = $content -replace "ProteÃƒÂ­na", "ProteÃ­na"
$content = $content -replace "VerificaciÃƒÂ³n", "VerificaciÃ³n"
$content = $content -replace "cÃƒÂ³digo", "cÃ³digo"
$content = $content -replace "ConfiguraciÃƒÂ³n", "ConfiguraciÃ³n"

# Fix other garble
$content = $content -replace "Ã¢â‚¬"", "â€”"
$content = $content -replace "Ã¢â‚¬Â¢", "â€¢"
$content = $content -replace "Ã‚Â©", "Â©"

# Save with clean UTF-8
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD\App.js", $content, $utf8NoBom)

Write-Host "âœ… App.js cleaned!" -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "ðŸ“Š CHANGES MADE:" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   â€¢ Removed: Ã°Å¸  (Home)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã°Å¸'Â¼ (Mexausa Food Group)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã°Å¸Å’Â± (Grower Hub)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã°Å¸Â¥' (Produce)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã°Å¸Â¥Â© (Protein)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã¢Å“â€¦ (Verify)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã°Å¸" (Customer Portal)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã¢Å¡â„¢Ã¯Â¸ (Admin)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã°Å¸Â§Â¬ (AuditDNA logo)" -ForegroundColor White
Write-Host "   â€¢ Removed: Ã°Å¸Å’ (Language toggle)" -ForegroundColor White
Write-Host "   â€¢ Fixed all Spanish accents" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`nðŸ”„ React should auto-reload in ~5 seconds..." -ForegroundColor Cyan
Write-Host "`nðŸ’¡ If garble persists after reload:" -ForegroundColor Yellow
Write-Host "   â€¢ Hard refresh: Ctrl+Shift+R" -ForegroundColor White
Write-Host "   â€¢ Or open Incognito: Ctrl+Shift+N" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

