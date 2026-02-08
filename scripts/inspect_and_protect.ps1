<# inspect_and_protect.ps1
   - Dry-run: shows offending lines and files
     powershell -ExecutionPolicy Bypass -File .\scripts\inspect_and_protect.ps1

   - Fix (safe; creates backup):
     powershell -ExecutionPolicy Bypass -File .\scripts\inspect_and_protect.ps1 -Fix

   - Fix + commit:
     powershell -ExecutionPolicy Bypass -File .\scripts\inspect_and_protect.ps1 -Fix -Commit
#>

param(
  [switch]$Fix,
  [switch]$Commit
)

function Timestamp { (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss") }

$root = Get-Location
$publicIndex = Join-Path $root "public\index.html"
$srcMain = Join-Path $root "src\main.jsx"

Write-Host "`nRepository root:" $root
Write-Host "`n-- Files status --"
Write-Host "public/index.html exists? " (Test-Path $publicIndex)
Write-Host "src/main.jsx exists? " (Test-Path $srcMain)

Write-Host "`n-- public/index.html (first 200 lines) --"
if (Test-Path $publicIndex) {
  Get-Content $publicIndex -TotalCount 200 | ForEach-Object -Begin { $i=0 } -Process { $i++; "{0,4}: $_" -f $i }
} else {
  Write-Host "public/index.html not found."
}

Write-Host "`n-- Searching repository for risky patterns --"
$patterns = @('type="module"','/src/main.jsx','<script type="module"')
$foundAny = $false
foreach ($p in $patterns) {
  $found = Select-String -Path .\**\* -Pattern $p -SimpleMatch -ErrorAction SilentlyContinue
  if ($found) {
    $foundAny = $true
    $found | ForEach-Object { "{0}:{1} -> {2}" -f $_.Path,$_.LineNumber,$_.Line.Trim() }
  }
}
if (-not $foundAny) {
  Write-Host "No risky patterns found."
}

if ($Fix) {
  if (-not (Test-Path $publicIndex)) {
    Write-Host "public/index.html not found — cannot apply fix." -ForegroundColor Red
    exit 1
  }
  $bak = "$publicIndex.bak.$(Timestamp)"
  Copy-Item $publicIndex $bak -Force
  Write-Host "Backup created: $bak"

  $orig = Get-Content $publicIndex -Raw
  $new = ($orig -split "`n") | Where-Object { $_ -notmatch 'type="module".*?/src/main.jsx' }
  $new -join "`n" | Set-Content $publicIndex -Encoding UTF8
  Write-Host "Removed Vite-style module tag(s) from public/index.html"

  $docsDir = Join-Path $root "docs"
  if (-not (Test-Path $docsDir)) { New-Item -ItemType Directory -Path $docsDir | Out-Null }
  $recoveryFile = Join-Path $docsDir "RECOVERY.md"
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $recoveryText = @"
# Recovery log: Vite-style module tag removed

Time: $ts
public/index.html backup: $bak

Action: removed `<script type="module" src="/src/main.jsx"></script>` lines.
"@
  Add-Content -Path $recoveryFile -Value $recoveryText
  Write-Host "Wrote recovery record to $recoveryFile"

  if ($Commit) {
    git add public/index.html $recoveryFile
    git commit -m "chore: remove Vite-style module tag from public/index.html and add RECOVERY.md"
    if ($LASTEXITCODE -eq 0) { Write-Host "Committed changes." } else { Write-Host "git commit failed; inspect git status." -ForegroundColor Yellow }
  }
}
Write-Host "`nDone."