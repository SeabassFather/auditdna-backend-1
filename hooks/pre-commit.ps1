$badPattern = 'type="module".*?/src/main.jsx|/src/main.jsx'
$staged = git diff --cached --name-only --diff-filter=ACM
if (-not $staged) { exit 0 }
$errors = @()
foreach ($f in $staged) {
  if (Test-Path $f) {
    $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
    if ($null -ne $content -and $content -match $badPattern) { $errors += $f }
  }
}
if ($errors.Count -gt 0) {
  Write-Host "ERROR: Commit blocked. Remove offending tag(s) from:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host $_ }
  exit 1
}
exit 0