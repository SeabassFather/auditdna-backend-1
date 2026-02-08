# ═══════════════════════════════════════════════════════════════
# Find and Show sessionRoutes.js Issue
# ═══════════════════════════════════════════════════════════════

Write-Host "`n🔍 Searching for session pool import issue...`n" -ForegroundColor Cyan

$sessionFile = "C:\AuditDNA\backend\routes\sessionRoutes.js"

if (Test-Path $sessionFile) {
    Write-Host "✅ Found: $sessionFile`n" -ForegroundColor Green
    
    # Show the top 30 lines (should contain the imports)
    Write-Host "━━━ First 30 lines of file ━━━`n" -ForegroundColor Yellow
    Get-Content $sessionFile -Head 30 | ForEach-Object { Write-Host $_ }
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow
    
    # Search for the warning message
    Write-Host "🔍 Searching for the warning message...`n" -ForegroundColor Cyan
    $warningLine = Select-String -Path $sessionFile -Pattern "No database pool found" -Context 2,2
    
    if ($warningLine) {
        Write-Host "❌ FOUND THE PROBLEM:`n" -ForegroundColor Red
        $warningLine | Format-List
    }
    
    # Search for pool imports
    Write-Host "`n🔍 Searching for pool import statements...`n" -ForegroundColor Cyan
    Select-String -Path $sessionFile -Pattern "pool.*require|require.*pool|new Pool" | Format-Table LineNumber, Line -AutoSize
    
    Write-Host "`n✅ FIX NEEDED:" -ForegroundColor Green
    Write-Host "   Replace pool import with: const pool = require('../db');`n" -ForegroundColor White
    Write-Host "   Remove any 'No database pool found' warning code`n" -ForegroundColor White
    
} else {
    Write-Host "❌ File not found: $sessionFile" -ForegroundColor Red
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan