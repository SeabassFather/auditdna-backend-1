cd C:\AuditDNA\AUDIT_DNA_Frontend_Final\frontend\src

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🔥 FIXING App.js - REMOVING ALL GARBLE!" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Cyan

# Backup
Copy-Item "App.js" "App.js.GARBLE_BACKUP_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force
Write-Host "✅ Backup created: App.js.GARBLE_BACKUP" -ForegroundColor Green

# Read file
$content = Get-Content "App.js" -Raw -Encoding UTF8

Write-Host "`n🔧 Removing all garbled emojis..." -ForegroundColor Yellow

# Remove ALL garbled emojis
$content = $content -replace "ðŸ  ", ""           # Home emoji
$content = $content -replace "ðŸ'¼ ", ""          # Briefcase emoji
$content = $content -replace "ðŸŒ± ", ""          # Seedling emoji
$content = $content -replace "ðŸ¥' ", ""          # Avocado emoji
$content = $content -replace "ðŸ¥© ", ""          # Meat emoji
$content = $content -replace "âœ… ", ""          # Checkmark emoji
$content = $content -replace "ðŸ" ", ""           # Lock emoji
$content = $content -replace "âš™ï¸ ", ""         # Gear emoji
$content = $content -replace "ðŸ§¬ ", ""          # DNA emoji
$content = $content -replace "ðŸŒ ", ""           # Globe emoji

# Fix Spanish accents
$content = $content -replace "pÃºblico", "público"
$content = $content -replace "LogÃ­stica", "Logística"
$content = $content -replace "EnvÃ­os", "Envíos"
$content = $content -replace "ProteÃ­na", "Proteína"
$content = $content -replace "VerificaciÃ³n", "Verificación"
$content = $content -replace "cÃ³digo", "código"
$content = $content -replace "ConfiguraciÃ³n", "Configuración"

# Fix other garble
$content = $content -replace "â€"", "—"
$content = $content -replace "â€¢", "•"
$content = $content -replace "Â©", "©"

# Save with clean UTF-8
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD\App.js", $content, $utf8NoBom)

Write-Host "✅ App.js cleaned!" -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "📊 CHANGES MADE:" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   • Removed: ðŸ  (Home)" -ForegroundColor White
Write-Host "   • Removed: ðŸ'¼ (Mexausa Food Group)" -ForegroundColor White
Write-Host "   • Removed: ðŸŒ± (Grower Hub)" -ForegroundColor White
Write-Host "   • Removed: ðŸ¥' (Produce)" -ForegroundColor White
Write-Host "   • Removed: ðŸ¥© (Protein)" -ForegroundColor White
Write-Host "   • Removed: âœ… (Verify)" -ForegroundColor White
Write-Host "   • Removed: ðŸ" (Customer Portal)" -ForegroundColor White
Write-Host "   • Removed: âš™ï¸ (Admin)" -ForegroundColor White
Write-Host "   • Removed: ðŸ§¬ (AuditDNA logo)" -ForegroundColor White
Write-Host "   • Removed: ðŸŒ (Language toggle)" -ForegroundColor White
Write-Host "   • Fixed all Spanish accents" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`n🔄 React should auto-reload in ~5 seconds..." -ForegroundColor Cyan
Write-Host "`n💡 If garble persists after reload:" -ForegroundColor Yellow
Write-Host "   • Hard refresh: Ctrl+Shift+R" -ForegroundColor White
Write-Host "   • Or open Incognito: Ctrl+Shift+N" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
