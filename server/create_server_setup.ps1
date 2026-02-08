<#
Create Server Setup Script for AuditDNA dev-stub
Run this from the folder where you want the server/ files to live (e.g. C:\path\to\AUDIT_DNA_Frontend_Final\backend\server).

Usage:
  - Open PowerShell as your user and cd into the server folder (or parent and provide -ServerFolder)
  - To run with defaults (Port 4000, frontend on 3000):
      .\create_server_setup.ps1
  - To force overwrite of .env, listings.json or .gitignore:
      .\create_server_setup.ps1 -Force
  - To automatically run npm install (requires package.json present):
      .\create_server_setup.ps1 -Install
  - To override ports:
      .\create_server_setup.ps1 -ServerPort 4000 -FrontendPort 3000

What it does:
  - Ensures directories: uploads/, uploads/certs/, db/
  - Creates db/listings.json with [] if missing (or overwrites with -Force)
  - Creates .gitignore (safe defaults) if missing (or overwrites with -Force)
  - Creates .env from template if missing (or overwrites with -Force)
  - Optionally runs npm install if -Install and package.json exists
  - Prints next-step instructions (how to start server, how to proxy front-end)
#>

param(
  [switch]$Force = $false,
  [switch]$Install = $false,
  [int]$ServerPort = 4000,
  [int]$FrontendPort = 3000
)

function Write-IfNotExistsOrForce {
  param($Path, $Content)
  if (Test-Path $Path) {
    if ($Force) {
      Set-Content -Path $Path -Value $Content -Encoding UTF8
      Write-Host "Overwrote $Path"
    } else {
      Write-Host "Skipped (exists): $Path"
    }
  } else {
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Created $Path"
  }
}

# Determine working dir (script current path)
$scriptDir = (Get-Location).Path
Write-Host "Working directory: $scriptDir"

# Ensure directories
$uploadsDir = Join-Path $scriptDir 'uploads'
$certsDir = Join-Path $uploadsDir 'certs'
$dbDir = Join-Path $scriptDir 'db'
New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
Write-Host "Ensured directories: uploads/, uploads/certs/, db/"

# listings.json
$listingsFile = Join-Path $dbDir 'listings.json'
$listingsDefault = "[]"
if (-not (Test-Path $listingsFile) -or $Force) {
  Set-Content -Path $listingsFile -Value $listingsDefault -Encoding UTF8
  Write-Host "Created or overwritten db/listings.json"
} else {
  Write-Host "db/listings.json exists (skipped)"
}

# .gitignore content
$gitignorePath = Join-Path $scriptDir '.gitignore'
$gitignoreContent = @"
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.*.local

# Build & uploads
build/
dist/
uploads/
uploads/*
db/
db/*

# Editor
.vscode/
.idea/
.DS_Store
"@

Write-IfNotExistsOrForce -Path $gitignorePath -Content $gitignoreContent

# .env.example (always create if missing)
$envExamplePath = Join-Path $scriptDir '.env.example'
$envExampleContent = @"
# Optional: SMTP settings (if present, /api/notify will attempt to use SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_SECURE=false
FROM_EMAIL=notifications@example.com
NOTIFY_TO=admin@example.com

# Optional: webhook URL to forward notifications (used if SMTP not configured)
WEBHOOK_URL=

# Server port (default 4000)
PORT=$ServerPort
"@
Write-IfNotExistsOrForce -Path $envExamplePath -Content $envExampleContent

# Create .env from example if missing or Force
$envPath = Join-Path $scriptDir '.env'
if (-not (Test-Path $envPath) -or $Force) {
  $envContent = $envExampleContent + "`n# Frontend dev URL (used for logging or optional checks)`nFRONTEND_URL=http://localhost:$FrontendPort`n"
  Set-Content -Path $envPath -Value $envContent -Encoding UTF8
  Write-Host "Created or overwritten .env (PORT=$ServerPort, FRONTEND_URL=http://localhost:$FrontendPort)"
} else {
  Write-Host ".env exists (skipped). If you want to overwrite, re-run with -Force"
}

# package.json presence check (optional npm install)
$packageJsonPath = Join-Path $scriptDir 'package.json'
if (Test-Path $packageJsonPath) {
  Write-Host "Found package.json"
  if ($Install) {
    Write-Host "Running npm install. This may take a moment..."
    npm install
    Write-Host "npm install complete."
  } else {
    Write-Host "To install dependencies: run `npm install` in $scriptDir or re-run this script with -Install"
  }
} else {
  Write-Host "No package.json found in $scriptDir. If you need it, place the server's package.json here (I provided one earlier)."
}

# Helpful quick commands summary
Write-Host ""
Write-Host "NEXT STEPS:"
Write-Host "1) Start the server from this folder:"
Write-Host "   npm start"
Write-Host "   (or `npm run start:dev` if using nodemon)"
Write-Host ""
Write-Host "2) Front-end (React dev server) runs on port 3000 by default."
Write-Host "   You can either call the server endpoints directly from front-end using the full URL:"
Write-Host "     http://localhost:$ServerPort/api/upload"
Write-Host "   Or add a proxy in your front-end package.json:"
Write-Host "     \"proxy\": \"http://localhost:$ServerPort\""
Write-Host "   Then fetch('/api/upload') will be proxied to the server."
Write-Host ""
Write-Host "3) To view persisted listings in a browser:"
Write-Host "   http://localhost:$ServerPort/api/listings"
Write-Host ""
Write-Host "If you want, re-run this script with -Force to overwrite .env/.gitignore/listings.json, or with -Install to run npm install automatically."
Write-Host ""
Write-Host "Done."