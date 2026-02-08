<#
Build-PROSE_Installer.ps1
Final stage of the AuditDNA PROSE Portal (Produce & Finance Powered by AI)
Installs required NPM packages and prints run instructions.
#>

$frontend = "C:\AuditDNA_Elite_Frontend_Recovery"
$backend  = "C:\AuditDNA_Elite\backend\MiniAPI"

Write-Host "=== AuditDNA PROSE Portal Installer ===" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1️⃣  Install frontend dependencies
# ------------------------------------------------------------
Write-Host "`nInstalling frontend packages..." -ForegroundColor Yellow
Push-Location $frontend
npm install axios recharts lucide-react jspdf html2canvas --save
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
Pop-Location
Write-Host "✔ Frontend dependencies installed" -ForegroundColor Green

# ------------------------------------------------------------
# 2️⃣  Backend dependencies check (Express & Axios)
# ------------------------------------------------------------
Write-Host "`nChecking backend dependencies..." -ForegroundColor Yellow
Push-Location $backend
npm install express axios cors body-parser dotenv --save
Pop-Location
Write-Host "✔ Backend dependencies verified" -ForegroundColor Green

# ------------------------------------------------------------
# 3️⃣  Tailwind reminder
# ------------------------------------------------------------
$tailwindNote = @'
Add to src/index.css if not already present:
@tailwind base;
@tailwind components;
@tailwind utilities;
'@
Set-Content "$frontend\TAILWIND_NOTE.txt" $tailwindNote -Encoding UTF8 -Force
Write-Host "✔ Tailwind reminder written" -ForegroundColor Green

# ------------------------------------------------------------
# 4️⃣  Startup instructions
# ------------------------------------------------------------
Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Verify backend routes in:" (Join-Path $backend "server.js") -ForegroundColor White
Write-Host "   app.use('/api/market', require('./routes/market'))"
Write-Host "   app.use('/api/marketplace', require('./routes/marketplace'))"
Write-Host "   app.use('/api/receivables', require('./routes/receivables'))"
Write-Host "   app.use('/api/finance', require('./routes/factoring_po'))"
Write-Host "   app.use('/api/tickers', require('./routes/tickers'))"
Write-Host "   app.use('/api/reports', require('./routes/reports'))"
Write-Host ""
Write-Host "2. Start backend from $backend" -ForegroundColor Yellow
Write-Host "      npm start"
Write-Host "3. Start frontend from $frontend" -ForegroundColor Yellow
Write-Host "      npm run dev"
Write-Host ""
Write-Host "4. Open http://localhost:5173/prose to launch the AuditDNA PROSE Portal." -ForegroundColor Cyan
Write-Host "5. Dashboard tickers live at /api/tickers/live (JSON feed for FX + commodities)." -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Installation complete.  AuditDNA PROSE Portal ready to expand." -ForegroundColor Green
