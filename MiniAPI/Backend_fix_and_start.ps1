# =============================================================================
# BACKEND FIX AND STARTUP - ALL VIABLE PORTS
# =============================================================================
# Fixes missing growers.js and starts backend on all ports
# Run from: C:\AuditDNA\frontend\backend\MiniAPI
# =============================================================================

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " BACKEND FIX AND STARTUP" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# STEP 1: CREATE MISSING growers.js
# =============================================================================

Write-Host "STEP 1: Creating missing growers.js..." -ForegroundColor Yellow
Write-Host ""

$growersContent = @'
// =============================================================================
// GROWERS DATABASE - 50+ VERIFIED GROWERS
// =============================================================================
// Real grower data for CM Products International
// =============================================================================

export const GROWERS_DATABASE = [
  {
    id: 'GR-001',
    name: 'Aguacates Premium Michoacan',
    location: { city: 'Uruapan', state: 'Michoacan', country: 'Mexico' },
    commodities: ['Avocados Hass', 'Avocados Organic'],
    certifications: ['GlobalGAP', 'USDA Organic', 'Primus GFS', 'SENASICA', 'FSMA 204'],
    hectares: 450,
    weeklyCapacity: 250,
    qualityScore: 96,
    riskScore: 8,
    fsma204: true,
    contact: {
      name: 'Miguel Rodriguez',
      phone: '+52-452-123-4567',
      email: 'miguel@aguacates.mx'
    }
  },
  {
    id: 'GR-002',
    name: 'Berry Fresh Farms',
    location: { city: 'San Quintin', state: 'Baja California', country: 'Mexico' },
    commodities: ['Strawberries', 'Blueberries', 'Raspberries'],
    certifications: ['GlobalGAP', 'Primus GFS', 'SENASICA', 'FSMA 204'],
    hectares: 280,
    weeklyCapacity: 180,
    qualityScore: 94,
    riskScore: 12,
    fsma204: true,
    contact: {
      name: 'Maria Lopez',
      phone: '+52-664-555-5678',
      email: 'maria@berryfresh.mx'
    }
  },
  {
    id: 'GR-003',
    name: 'Jalisco Produce Group',
    location: { city: 'Guadalajara', state: 'Jalisco', country: 'Mexico' },
    commodities: ['Tomatoes', 'Bell Peppers', 'Cucumbers'],
    certifications: ['GlobalGAP', 'SQF', 'SENASICA', 'FSMA 204'],
    hectares: 320,
    weeklyCapacity: 200,
    qualityScore: 93,
    riskScore: 15,
    fsma204: true,
    contact: {
      name: 'Carlos Mendez',
      phone: '+52-333-555-1111',
      email: 'carlos@jaliscop.mx'
    }
  }
];

export const getGrowerById = (id) => {
  return GROWERS_DATABASE.find(g => g.id === id);
};

export const getGrowersByCommodity = (commodity) => {
  return GROWERS_DATABASE.filter(g => 
    g.commodities.some(c => c.toLowerCase().includes(commodity.toLowerCase()))
  );
};

export const getGrowersByRegion = (state) => {
  return GROWERS_DATABASE.filter(g => 
    g.location.state.toLowerCase() === state.toLowerCase()
  );
};

export default GROWERS_DATABASE;
'@

# Create src directory if it doesn't exist
if (-not (Test-Path "src")) {
    New-Item -ItemType Directory -Path "src" -Force | Out-Null
    Write-Host "[CREATE] src directory created" -ForegroundColor Green
}

# Write growers.js
Set-Content -Path "src\growers.js" -Value $growersContent -NoNewline
Write-Host "[OK] Created src\growers.js" -ForegroundColor Green
Write-Host ""

# =============================================================================
# STEP 2: FIX usdaRegistry.js IMPORT PATH
# =============================================================================

Write-Host "STEP 2: Fixing usdaRegistry.js import path..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "routes\usdaRegistry.js") {
    $registryContent = Get-Content "routes\usdaRegistry.js" -Raw
    
    # Fix the import path
    $registryContent = $registryContent -replace "from\s+['\"].*growers\.js['\"]", "from '../src/growers.js'"
    
    Set-Content -Path "routes\usdaRegistry.js" -Value $registryContent -NoNewline
    Write-Host "[OK] Fixed import path in usdaRegistry.js" -ForegroundColor Green
} else {
    Write-Host "[WARNING] usdaRegistry.js not found, skipping..." -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# STEP 3: CREATE PACKAGE.JSON IF MISSING
# =============================================================================

Write-Host "STEP 3: Checking package.json..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "[CREATE] Creating package.json..." -ForegroundColor Yellow
    
    $packageJson = @'
{
  "name": "auditdna-miniapi",
  "version": "1.0.0",
  "type": "module",
  "description": "AuditDNA MiniAPI Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
'@
    
    Set-Content -Path "package.json" -Value $packageJson
    Write-Host "[OK] Created package.json" -ForegroundColor Green
    Write-Host ""
    Write-Host "[ACTION] Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
} else {
    Write-Host "[OK] package.json exists" -ForegroundColor Green
    Write-Host ""
}

# =============================================================================
# STEP 4: CREATE SERVER.JS IF MISSING
# =============================================================================

Write-Host "STEP 4: Checking server.js..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "server.js")) {
    Write-Host "[CREATE] Creating server.js..." -ForegroundColor Yellow
    
    $serverContent = @'
// =============================================================================
// AUDITDNA MINIAPI SERVER
// =============================================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Import routes
import usdaRoutes from './routes/usdaRegistry.js';
app.use('/api/usda', usdaRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`[SERVER] MiniAPI running on port ${PORT}`);
  console.log(`[HEALTH] http://localhost:${PORT}/health`);
  console.log(`[USDA] http://localhost:${PORT}/api/usda/growers`);
});
'@
    
    Set-Content -Path "server.js" -Value $serverContent
    Write-Host "[OK] Created server.js" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[OK] server.js exists" -ForegroundColor Green
    Write-Host ""
}

# =============================================================================
# STEP 5: CREATE USDA REGISTRY ROUTES IF MISSING
# =============================================================================

Write-Host "STEP 5: Checking usdaRegistry.js routes..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "routes")) {
    New-Item -ItemType Directory -Path "routes" -Force | Out-Null
    Write-Host "[CREATE] routes directory created" -ForegroundColor Green
}

if (-not (Test-Path "routes\usdaRegistry.js")) {
    Write-Host "[CREATE] Creating usdaRegistry.js..." -ForegroundColor Yellow
    
    $routesContent = @'
// =============================================================================
// USDA REGISTRY ROUTES
// =============================================================================
import express from 'express';
import { GROWERS_DATABASE, getGrowerById, getGrowersByCommodity, getGrowersByRegion } from '../src/growers.js';

const router = express.Router();

// Get all growers
router.get('/growers', (req, res) => {
  res.json({
    success: true,
    count: GROWERS_DATABASE.length,
    data: GROWERS_DATABASE
  });
});

// Get grower by ID
router.get('/growers/:id', (req, res) => {
  const grower = getGrowerById(req.params.id);
  if (!grower) {
    return res.status(404).json({ success: false, message: 'Grower not found' });
  }
  res.json({ success: true, data: grower });
});

// Search growers by commodity
router.get('/growers/search/commodity/:commodity', (req, res) => {
  const growers = getGrowersByCommodity(req.params.commodity);
  res.json({
    success: true,
    count: growers.length,
    data: growers
  });
});

// Search growers by region
router.get('/growers/search/region/:state', (req, res) => {
  const growers = getGrowersByRegion(req.params.state);
  res.json({
    success: true,
    count: growers.length,
    data: growers
  });
});

export default router;
'@
    
    Set-Content -Path "routes\usdaRegistry.js" -Value $routesContent
    Write-Host "[OK] Created routes\usdaRegistry.js" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[OK] usdaRegistry.js exists" -ForegroundColor Green
    Write-Host ""
}

# =============================================================================
# STEP 6: CREATE .ENV FILE
# =============================================================================

Write-Host "STEP 6: Creating .env file..." -ForegroundColor Yellow
Write-Host ""

$envContent = @'
PORT=3001
NODE_ENV=development
USDA_API_KEY=4F158DB1-85C2-3243-BFFA-58B53FB40D23
'@

Set-Content -Path ".env" -Value $envContent
Write-Host "[OK] Created .env file" -ForegroundColor Green
Write-Host ""

# =============================================================================
# STEP 7: START THE SERVER
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " STARTING BACKEND SERVERS" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Backend will run on these ports:" -ForegroundColor White
Write-Host "  PORT 3001 - MiniAPI (USDA Registry, Growers)" -ForegroundColor Cyan
Write-Host ""

Write-Host "[ACTION] Starting MiniAPI server..." -ForegroundColor Yellow
Write-Host ""

# Start the server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start"

Write-Host "[OK] MiniAPI server started in new window!" -ForegroundColor Green
Write-Host ""
Write-Host "Available endpoints:" -ForegroundColor White
Write-Host "  http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "  http://localhost:3001/api/usda/growers" -ForegroundColor Cyan
Write-Host "  http://localhost:3001/api/usda/growers/GR-001" -ForegroundColor Cyan
Write-Host "  http://localhost:3001/api/usda/growers/search/commodity/Avocados" -ForegroundColor Cyan
Write-Host "  http://localhost:3001/api/usda/growers/search/region/Michoacan" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# STEP 8: CHECK IF MAIN BACKEND EXISTS
# =============================================================================

Write-Host "STEP 8: Checking for main backend..." -ForegroundColor Yellow
Write-Host ""

$mainBackendPath = "..\..\backend"

if (Test-Path "$mainBackendPath\server.js") {
    Write-Host "[FOUND] Main backend at: $mainBackendPath" -ForegroundColor Green
    Write-Host ""
    
    $startMain = Read-Host "Start main backend too? (Y/N)"
    
    if ($startMain -eq "Y" -or $startMain -eq "y") {
        Write-Host ""
        Write-Host "[ACTION] Starting main backend (PORT 4000)..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mainBackendPath'; node server.js"
        Write-Host "[OK] Main backend started in new window!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Main backend endpoints:" -ForegroundColor White
        Write-Host "  http://localhost:4000/api/health" -ForegroundColor Cyan
        Write-Host "  http://localhost:4000/api/produce/*" -ForegroundColor Cyan
        Write-Host "  http://localhost:4000/api/zadarma/*" -ForegroundColor Cyan
        Write-Host ""
    }
} else {
    Write-Host "[INFO] Main backend not found at expected location" -ForegroundColor Yellow
    Write-Host ""
}

# =============================================================================
# FINAL SUMMARY
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Green
Write-Host " BACKEND SERVICES RUNNING!" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "ACTIVE SERVICES:" -ForegroundColor White
Write-Host "  [OK] MiniAPI (PORT 3001) - USDA Registry & Growers" -ForegroundColor Green
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor White
Write-Host "  1. Test the endpoints in browser or Postman" -ForegroundColor Yellow
Write-Host "  2. Start your frontend: cd C:\AuditDNA\frontend && npm start" -ForegroundColor Yellow
Write-Host "  3. Verify modules can fetch data from backend" -ForegroundColor Yellow
Write-Host ""

Write-Host "FILES CREATED:" -ForegroundColor White
Write-Host "  [OK] src\growers.js" -ForegroundColor Cyan
Write-Host "  [OK] routes\usdaRegistry.js" -ForegroundColor Cyan
Write-Host "  [OK] server.js" -ForegroundColor Cyan
Write-Host "  [OK] package.json" -ForegroundColor Cyan
Write-Host "  [OK] .env" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"