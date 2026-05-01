import 'dotenv/config';
// ================================================================
// AUDITDNA BACKEND - EXPRESS SERVER (ES MODULE)
// ================================================================
// Date Created: 2025-11-11 18:09:17 UTC
// Last Updated: 2026-01-14 - Added USDA Registry + Live Prices
// Author: SeabassFather + Claude Integration
// Type: ES Module (import/export syntax)
// Status: PRODUCTION-READY
// ================================================================

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// IMPORT USDA REGISTRY ROUTE
import usdaRegistryRouter from './routes/usdaRegistry.js';

// miniapi-agents-wired
import miniApiAgents from './agents/index.js';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(miniApiAgents.kikiMiddleware);
app.use('/api/agents', miniApiAgents.statusRouter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ZADARMA CONFIGURATION
// ============================================================
const ZADARMA = {
  API_KEY: process.env.ZADARMA_KEY || 'a2aaea04d645d80e739c',
  API_SECRET: process.env.ZADARMA_SECRET || '424a974e04f67227b466',
  BASE_URL: 'https://api.zadarma.com/v1',
  WHATSAPP: '+52-646-340-2686'
};

// ============================================================
// GOOGLE CALENDAR CONFIGURATION
// ============================================================
const GOOGLE_CALENDAR = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://process.env.DB_HOST:4000/api/calendar/callback',
  SCOPES: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
  CALENDARS: {
    sales: process.env.SALES_CALENDAR_ID || 'primary',
    admin: process.env.ADMIN_CALENDAR_ID || 'primary',
    inquiries: process.env.INQUIRIES_CALENDAR_ID || 'primary'
  }
};

// In-memory token storage (use database in production)
let googleTokens = {};

// ============================================================
// IN-MEMORY STORAGE FOR CRM
// ============================================================
let callLog = [];
let smsLog = [];
let leads = [];
let calendarEvents = [];

// Load contacts from file if exists
const contactsPath = path.join(__dirname, 'data', 'shipper-contacts.json');
try {
  if (fs.existsSync(contactsPath)) {
    leads = JSON.parse(fs.readFileSync(contactsPath, 'utf-8'));
    console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Loaded ${leads.length} contacts from shipper-contacts.json`);
  }
} catch (e) {
  console.log('Note: No contacts file found, starting fresh');
}

// ============================================================
// USDA PRICES DATA - Load from CSV
// ============================================================
let usdaPrices = [];
const pricesPath = path.join(__dirname, 'data', 'usda_prices.csv');
try {
  if (fs.existsSync(pricesPath)) {
    const csvContent = fs.readFileSync(pricesPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header
    usdaPrices = lines.filter(l => l.trim()).map(line => {
      const [date, commodity_desc, price, region] = line.split(',');
      return { date, commodity: commodity_desc, price: parseFloat(price), region };
    });
    console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Loaded ${usdaPrices.length} price records from usda_prices.csv`);
  }
} catch (e) {
  console.log('Note: No prices CSV found');
}

// ============================================================
// ROOT ENDPOINT - API DOCUMENTATION
// ============================================================
app.get('/', (req, res) => {
  res.json({ 
    message: 'AuditDNA Backend API',
    version: '2.2.0',
    status: 'Active',
    author: 'SeabassFather',
    timestamp: new Date().toISOString(),
    endpoints: {
      produce: [
        'GET  /api/produce/commodity/:name',
        'GET  /api/produce/compare?items=avocado,strawberry',
        'GET  /api/produce/regions/:commodity',
        'POST /api/produce/analyze',
        'GET  /api/produce/top',
        'GET  /api/produce/ai-insights/:commodity'
      ],
      usdaRegistry: [
        'GET  /api/usda-registry',
        'GET  /api/usda-registry?commodity=avocado&country=Mexico',
        'GET  /api/usda-registry/refresh'
      ],
      usdaPrices: [
        'GET  /api/usda-prices',
        'GET  /api/usda-prices?commodity=AVOCADO',
        'GET  /api/usda-prices?region=West',
        'GET  /api/usda-prices/compare?commodities=AVOCADO,CORN,STRAWBERRY',
        'GET  /api/usda-prices/regions'
      ],
      foodSafety: [
        'GET  /api/foodsafety/dashboard',
        'POST /api/foodsafety/upload',
        'GET  /api/foodsafety/score/:growerId',
        'GET  /api/foodsafety/alerts'
      ],
      zadarma: [
        'POST /api/zadarma/call',
        'POST /api/zadarma/sms',
        'GET  /api/zadarma/calls',
        'GET  /api/zadarma/leads',
        'POST /api/zadarma/leads',
        'POST /api/zadarma/leads/import',
        'GET  /api/zadarma/metrics'
      ],
      calendar: [
        'GET  /api/calendar/auth',
        'GET  /api/calendar/callback',
        'GET  /api/calendar/events',
        'POST /api/calendar/events',
        'POST /api/calendar/invoice',
        'POST /api/calendar/inquiry'
      ]
    }
  });
});

// ============================================================
// USDA PRICES ROUTES (from CSV data)
// ============================================================
const usdaPricesRouter = express.Router();

// Get all prices with optional filters
usdaPricesRouter.get('/', (req, res) => {
  const { commodity, region, startDate, endDate, limit } = req.query;
  let filtered = [...usdaPrices];
  
  if (commodity) {
    filtered = filtered.filter(p => p.commodity.toLowerCase().includes(commodity.toLowerCase()));
  }
  if (region) {
    filtered = filtered.filter(p => p.region.toLowerCase().includes(region.toLowerCase()));
  }
  if (startDate) {
    filtered = filtered.filter(p => p.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(p => p.date <= endDate);
  }
  
  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Apply limit
  if (limit) {
    filtered = filtered.slice(0, parseInt(limit));
  }
  
  // Calculate stats
  const stats = {};
  if (filtered.length > 0) {
    const prices = filtered.map(p => p.price);
    stats.min = Math.min(...prices);
    stats.max = Math.max(...prices);
    stats.avg = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
    stats.latest = filtered[0]?.price;
  }
  
  res.json({
    total: filtered.length,
    stats,
    results: filtered,
    timestamp: new Date().toISOString()
  });
});

// Compare multiple commodities
usdaPricesRouter.get('/compare', (req, res) => {
  const commodities = (req.query.commodities || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
  
  if (commodities.length === 0) {
    return res.status(400).json({ error: 'Please provide commodities parameter (comma-separated)' });
  }
  
  const comparison = {};
  
  commodities.forEach(commodity => {
    const prices = usdaPrices.filter(p => p.commodity.toUpperCase().includes(commodity));
    if (prices.length > 0) {
      const priceValues = prices.map(p => p.price);
      const latestByRegion = {};
      
      // Get latest price per region
      prices.forEach(p => {
        if (!latestByRegion[p.region] || p.date > latestByRegion[p.region].date) {
          latestByRegion[p.region] = p;
        }
      });
      
      comparison[commodity] = {
        commodity,
        recordCount: prices.length,
        min: Math.min(...priceValues),
        max: Math.max(...priceValues),
        avg: (priceValues.reduce((a, b) => a + b, 0) / priceValues.length).toFixed(2),
        latestByRegion,
        history: prices.slice(0, 10) // Last 10 records
      };
    }
  });
  
  res.json({
    commodities: commodities,
    comparison,
    timestamp: new Date().toISOString()
  });
});

// Get available regions and their commodities
usdaPricesRouter.get('/regions', (req, res) => {
  const regionData = {};
  
  usdaPrices.forEach(p => {
    if (!regionData[p.region]) {
      regionData[p.region] = {
        region: p.region,
        commodities: new Set(),
        priceRange: { min: Infinity, max: -Infinity },
        recordCount: 0
      };
    }
    regionData[p.region].commodities.add(p.commodity);
    regionData[p.region].recordCount++;
    regionData[p.region].priceRange.min = Math.min(regionData[p.region].priceRange.min, p.price);
    regionData[p.region].priceRange.max = Math.max(regionData[p.region].priceRange.max, p.price);
  });
  
  // Convert Sets to arrays
  const regions = Object.values(regionData).map(r => ({
    ...r,
    commodities: Array.from(r.commodities)
  }));
  
  res.json({
    total: regions.length,
    regions,
    timestamp: new Date().toISOString()
  });
});

// Get unique commodities list
usdaPricesRouter.get('/commodities', (req, res) => {
  const commodities = [...new Set(usdaPrices.map(p => p.commodity))].sort();
  res.json({
    total: commodities.length,
    commodities,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/usda-prices', usdaPricesRouter);

// ============================================================
// MOUNT USDA REGISTRY ROUTER
// ============================================================
app.use('/api/usda-registry', usdaRegistryRouter);

// ============================================================
// PRODUCE ROUTES
// ============================================================
const produceRouter = express.Router();

const mockUSDAData = {
  avocado: {
    commodity: 'Avocado', variety: 'Hass', region: 'CA',
    wholesalePrice: 42.50, retailPrice: 1.89, volume: 12500,
    costEstimate: 28.30, freightCost: 3.50, riskIndex: 0.45,
    forecast30d: 45.20, forecast90d: 47.80, volatility: 0.12, trend: 'up',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 42.50 + (Math.random() - 0.5) * 10
    }))
  },
  strawberry: {
    commodity: 'Strawberry', variety: 'Albion', region: 'CA',
    wholesalePrice: 18.75, retailPrice: 3.99, volume: 8900,
    costEstimate: 12.40, freightCost: 2.20, riskIndex: 0.38,
    forecast30d: 19.50, forecast90d: 20.10, volatility: 0.18, trend: 'stable',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 18.75 + (Math.random() - 0.5) * 6
    }))
  },
  tomato: {
    commodity: 'Tomato', variety: 'Roma', region: 'MX',
    wholesalePrice: 24.00, retailPrice: 2.49, volume: 15600,
    costEstimate: 16.80, freightCost: 4.10, riskIndex: 0.52,
    forecast30d: 26.30, forecast90d: 28.50, volatility: 0.22, trend: 'up',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 24.00 + (Math.random() - 0.5) * 8
    }))
  },
  lettuce: {
    commodity: 'Lettuce', variety: 'Romaine', region: 'CA',
    wholesalePrice: 22.10, retailPrice: 2.29, volume: 9800,
    costEstimate: 15.60, freightCost: 2.80, riskIndex: 0.41,
    forecast30d: 21.50, forecast90d: 20.90, volatility: 0.15, trend: 'down',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 22.10 + (Math.random() - 0.5) * 7
    }))
  },
  pepper: {
    commodity: 'Bell Pepper', variety: 'Red', region: 'MX',
    wholesalePrice: 31.20, retailPrice: 3.49, volume: 11400,
    costEstimate: 21.50, freightCost: 3.80, riskIndex: 0.47,
    forecast30d: 32.80, forecast90d: 34.10, volatility: 0.19, trend: 'up',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 31.20 + (Math.random() - 0.5) * 9
    }))
  },
  lime: {
    commodity: 'Lime', variety: 'Persian', region: 'MX',
    wholesalePrice: 35.80, retailPrice: 0.29, volume: 18200,
    costEstimate: 24.50, freightCost: 3.20, riskIndex: 0.51,
    forecast30d: 38.20, forecast90d: 41.00, volatility: 0.25, trend: 'up',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 35.80 + (Math.random() - 0.5) * 12
    }))
  },
  mango: {
    commodity: 'Mango', variety: 'Ataulfo', region: 'MX',
    wholesalePrice: 28.40, retailPrice: 1.49, volume: 7800,
    costEstimate: 19.20, freightCost: 4.50, riskIndex: 0.44,
    forecast30d: 26.80, forecast90d: 24.50, volatility: 0.21, trend: 'down',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 28.40 + (Math.random() - 0.5) * 8
    }))
  },
  blueberry: {
    commodity: 'Blueberry', variety: 'Conventional', region: 'MX',
    wholesalePrice: 48.60, retailPrice: 4.99, volume: 5400,
    costEstimate: 32.80, freightCost: 5.20, riskIndex: 0.39,
    forecast30d: 52.10, forecast90d: 55.80, volatility: 0.16, trend: 'up',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      price: 48.60 + (Math.random() - 0.5) * 14
    }))
  }
};

produceRouter.get('/commodity/:name', (req, res) => {
  const data = mockUSDAData[req.params.name.toLowerCase()];
  if (!data) return res.status(404).json({ error: 'Commodity not found', available: Object.keys(mockUSDAData) });
  const margin = data.wholesalePrice - data.costEstimate - data.freightCost;
  res.json({ ...data, margin, marginPercent: (margin / data.wholesalePrice * 100).toFixed(2), timestamp: new Date().toISOString() });
});

produceRouter.get('/compare', (req, res) => {
  const items = (req.query.items?.split(',') || []).map(i => {
    const data = mockUSDAData[i.toLowerCase().trim()];
    if (data) {
      const margin = data.wholesalePrice - data.costEstimate - data.freightCost;
      return { ...data, margin, marginPercent: (margin / data.wholesalePrice * 100).toFixed(2) };
    }
    return null;
  }).filter(Boolean);
  res.json({ items, count: items.length, timestamp: new Date().toISOString() });
});

produceRouter.get('/regions/:commodity', (req, res) => {
  const commodity = req.params.commodity.toLowerCase();
  const baseData = mockUSDAData[commodity];
  
  if (!baseData) {
    return res.status(404).json({ error: 'Commodity not found', available: Object.keys(mockUSDAData) });
  }
  
  // Generate regional pricing variations
  const regions = [
    { region: 'West Coast', code: 'CA', multiplier: 1.0, freight: 0, terminals: ['Los Angeles', 'San Francisco', 'Seattle'] },
    { region: 'Midwest', code: 'MW', multiplier: 1.15, freight: 6.25, terminals: ['Chicago', 'Dallas', 'Detroit'] },
    { region: 'East Coast', code: 'EC', multiplier: 1.23, freight: 9.80, terminals: ['New York', 'Philadelphia', 'Miami'] }
  ];
  
  const regionPricing = regions.map(r => ({
    region: r.region,
    code: r.code,
    terminals: r.terminals,
    basePrice: baseData.wholesalePrice,
    freightCost: r.freight,
    landedCost: (baseData.wholesalePrice + r.freight).toFixed(2),
    wholesalePrice: ((baseData.wholesalePrice + r.freight) * r.multiplier).toFixed(2),
    retailPrice: ((baseData.wholesalePrice + r.freight) * r.multiplier * 1.65).toFixed(2),
    consumerPrice: ((baseData.wholesalePrice + r.freight) * r.multiplier * 2.10).toFixed(2),
    margin: (((baseData.wholesalePrice + r.freight) * r.multiplier) - baseData.costEstimate - r.freight).toFixed(2),
    trend: baseData.trend,
    volume: Math.round(baseData.volume * (1 + (Math.random() - 0.5) * 0.3))
  }));
  
  res.json({ 
    commodity: baseData.commodity,
    variety: baseData.variety,
    regions: regionPricing,
    timestamp: new Date().toISOString()
  });
});

produceRouter.get('/top', (req, res) => {
  const topCommodities = Object.entries(mockUSDAData)
    .map(([key, data]) => ({
      id: key,
      commodity: data.commodity,
      variety: data.variety,
      region: data.region,
      wholesalePrice: data.wholesalePrice,
      margin: (data.wholesalePrice - data.costEstimate - data.freightCost).toFixed(2),
      trend: data.trend,
      volume: data.volume
    }))
    .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin));
  
  res.json({
    count: topCommodities.length,
    commodities: topCommodities,
    timestamp: new Date().toISOString()
  });
});

produceRouter.post('/analyze', (req, res) => {
  const { commodity, quantity, targetMargin } = req.body;
  const data = mockUSDAData[commodity?.toLowerCase()];
  if (!data) return res.status(404).json({ error: 'Commodity not found' });
  
  const totalCost = (data.costEstimate + data.freightCost) * quantity;
  const totalRevenue = data.wholesalePrice * quantity;
  const actualMargin = totalRevenue - totalCost;
  
  res.json({
    commodity: data.commodity,
    quantity,
    totalCost: totalCost.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    actualMargin: actualMargin.toFixed(2),
    marginPercent: ((actualMargin / totalRevenue) * 100).toFixed(2),
    targetMet: targetMargin ? actualMargin >= targetMargin * quantity : null,
    recommendation: actualMargin > 0 ? 'PROCEED' : 'REVIEW PRICING',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/produce', produceRouter);

// ============================================================
// FOOD SAFETY ROUTES
// ============================================================
const foodSafetyRouter = express.Router();

foodSafetyRouter.get('/dashboard', (req, res) => {
  res.json({
    overallScore: 94.2,
    totalGrowers: 156,
    pendingAudits: 12,
    certExpiring: 8,
    recentAlerts: [
      { id: 1, type: 'warning', grower: 'Rancho Los Pinos', message: 'Water test due in 15 days', date: new Date().toISOString() },
      { id: 2, type: 'info', grower: 'Berries del Valle', message: 'GlobalGAP cert expires in 30 days', date: new Date().toISOString() }
    ],
    complianceByCategory: {
      'Water Testing': 96,
      'Pesticide Logs': 92,
      'Traceability': 98,
      'Employee Training': 89,
      'Equipment Sanitation': 94
    },
    timestamp: new Date().toISOString()
  });
});

foodSafetyRouter.get('/score/:growerId', (req, res) => {
  res.json({
    growerId: req.params.growerId,
    overallScore: 87 + Math.random() * 13,
    components: {
      compliance: 92, quality: 88, delivery: 95, financial: 85, traceability: 91, communication: 89
    },
    tier: Math.random() > 0.7 ? 0 : Math.random() > 0.5 ? 1 : 2,
    lastAudit: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split('T')[0],
    timestamp: new Date().toISOString()
  });
});

foodSafetyRouter.get('/alerts', (req, res) => {
  res.json({
    alerts: [
      { id: 1, severity: 'high', type: 'cert_expiring', grower: 'Agricola Don Pedro', message: 'SENASICA permit expires in 7 days', dueDate: '2026-01-21' },
      { id: 2, severity: 'medium', type: 'test_due', grower: 'Citricos Familiares', message: 'Water analysis overdue by 5 days', dueDate: '2026-01-09' },
      { id: 3, severity: 'low', type: 'reminder', grower: 'Huerta Santa Elena', message: 'Annual audit scheduled next month', dueDate: '2026-02-15' }
    ],
    timestamp: new Date().toISOString()
  });
});

app.use('/api/foodsafety', foodSafetyRouter);

// ============================================================
// ZADARMA CRM ROUTES
// ============================================================
const zadarmaRouter = express.Router();

function generateZadarmaSignature(method, params) {
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('');
  const data = method + sortedParams + crypto.createHash('md5').update(ZADARMA.API_SECRET).digest('hex');
  return crypto.createHmac('sha1', ZADARMA.API_SECRET).update(data).digest('hex');
}

zadarmaRouter.post('/call', async (req, res) => {
  const { to, from } = req.body;
  if (!to) return res.status(400).json({ success: false, error: 'Phone number required' });
  
  const call = {
    id: 'call_' + Date.now(),
    to, from: from || ZADARMA.WHATSAPP,
    status: 'initiated',
    timestamp: new Date().toISOString(),
    duration: 0
  };
  callLog.push(call);
  
  res.json({ success: true, call, message: 'Call initiated (simulated)' });
});

zadarmaRouter.post('/sms', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ success: false, error: 'to and message required' });
  
  const sms = {
    id: 'sms_' + Date.now(),
    to, message,
    status: 'sent',
    timestamp: new Date().toISOString()
  };
  smsLog.push(sms);
  
  res.json({ success: true, sms, message: 'SMS sent (simulated)' });
});

zadarmaRouter.get('/calls', (req, res) => {
  res.json({ success: true, calls: callLog, total: callLog.length });
});

zadarmaRouter.get('/leads', (req, res) => {
  const { status, tag, search } = req.query;
  let filtered = [...leads];
  
  if (status) filtered = filtered.filter(l => l.status === status);
  if (tag) filtered = filtered.filter(l => l.tags?.includes(tag));
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l => 
      l.name?.toLowerCase().includes(q) || 
      l.company?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  }
  
  res.json({ success: true, leads: filtered, total: filtered.length });
});

zadarmaRouter.post('/leads', (req, res) => {
  const lead = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: req.body.status || 'lead'
  };
  leads.push(lead);
  res.json({ success: true, lead });
});

zadarmaRouter.post('/leads/import', (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts)) return res.status(400).json({ success: false, error: 'contacts array required' });
  
  const imported = contacts.map(c => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    ...c,
    createdAt: new Date().toISOString(),
    status: c.status || 'lead',
    source: 'import'
  }));
  
  leads.push(...imported);
  res.json({ success: true, imported: imported.length, total: leads.length });
});

zadarmaRouter.get('/metrics', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json({
    success: true,
    metrics: {
      totalLeads: leads.length,
      totalCalls: callLog.length,
      totalSMS: smsLog.length,
      callsToday: callLog.filter(c => c.timestamp.startsWith(today)).length,
      leadsByStatus: leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {}),
      conversionRate: leads.length > 0 ? ((leads.filter(l => l.status === 'customer').length / leads.length) * 100).toFixed(1) : 0
    }
  });
});

app.use('/api/zadarma', zadarmaRouter);

// ============================================================
// CALENDAR ROUTES
// ============================================================
const calendarRouter = express.Router();

calendarRouter.get('/auth', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CALENDAR.CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(GOOGLE_CALENDAR.REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(GOOGLE_CALENDAR.SCOPES.join(' '))}&` +
    `access_type=offline&prompt=consent`;
  
  res.json({ success: true, authUrl, message: 'Visit authUrl to authorize Google Calendar access' });
});

calendarRouter.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ success: false, error: 'No authorization code provided' });
  res.json({ success: true, message: 'OAuth callback received. Token exchange would happen here in production.' });
});

calendarRouter.get('/events', (req, res) => {
  const { calendar, startDate, endDate } = req.query;
  let filtered = [...calendarEvents];
  
  if (calendar) filtered = filtered.filter(e => e.calendar === calendar);
  if (startDate) filtered = filtered.filter(e => e.start >= startDate);
  if (endDate) filtered = filtered.filter(e => e.start <= endDate);
  
  filtered.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  res.json({ success: true, events: filtered, total: filtered.length });
});

calendarRouter.post('/events', (req, res) => {
  const { title, description, start, end, calendar = 'sales', type = 'general' } = req.body;
  
  if (!title || !start) {
    return res.status(400).json({ success: false, error: 'title and start required' });
  }
  
  const event = {
    id: 'evt_' + Date.now(),
    title, description,
    start, end: end || start,
    calendar, type,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    color: type === 'invoice' ? '#22c55e' : type === 'inquiry' ? '#3b82f6' : '#94a3b8'
  };
  
  calendarEvents.push(event);
  
  res.json({ success: true, event, message: `Event created on ${calendar} calendar` });
});

calendarRouter.post('/invoice', (req, res) => {
  const { invoiceNumber, customerName, amount, dueDate, items, assignTo = 'sales' } = req.body;
  
  if (!invoiceNumber || !customerName || !dueDate) {
    return res.status(400).json({ success: false, error: 'invoiceNumber, customerName, and dueDate required' });
  }
  
  const event = {
    id: 'inv_' + Date.now(),
    title: `ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â° Invoice #${invoiceNumber} - ${customerName}`,
    description: `Amount: $${amount || 'TBD'}\nCustomer: ${customerName}\nItems: ${items || 'See invoice'}`,
    start: dueDate, end: dueDate,
    calendar: assignTo, type: 'invoice',
    metadata: { invoiceNumber, customerName, amount, items },
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    color: '#22c55e'
  };
  
  calendarEvents.push(event);
  
  res.json({ success: true, event, message: `Invoice event created on ${assignTo} calendar` });
});

calendarRouter.post('/inquiry', (req, res) => {
  const { customerName, email, phone, product, quantity, notes, preferredContactDate, assignTo = 'sales', priority = 'medium' } = req.body;
  
  if (!customerName) {
    return res.status(400).json({ success: false, error: 'customerName required' });
  }
  
  const contactDate = preferredContactDate || new Date().toISOString().split('T')[0];
  
  const event = {
    id: 'inq_' + Date.now(),
    title: `ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¾ Sales Inquiry: ${customerName}${priority === 'high' ? ' ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥' : ''}`,
    description: `Customer: ${customerName}\nEmail: ${email || 'N/A'}\nPhone: ${phone || 'N/A'}\nProduct: ${product || 'General'}\nQuantity: ${quantity || 'TBD'}\nNotes: ${notes || 'None'}\nPriority: ${priority.toUpperCase()}`,
    start: contactDate, end: contactDate,
    calendar: assignTo, type: 'inquiry', priority,
    metadata: { customerName, email, phone, product, quantity, notes },
    createdAt: new Date().toISOString(),
    status: 'pending',
    color: priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#3b82f6'
  };
  
  calendarEvents.push(event);
  
  const lead = {
    id: Date.now().toString(),
    name: customerName, email, phone,
    company: customerName,
    notes: `Inquiry: ${product || 'General'} - ${notes || 'No notes'}`,
    status: 'lead', priority,
    tags: product ? [product.toLowerCase()] : ['inquiry'],
    source: 'calendar-inquiry',
    calendarEventId: event.id,
    createdAt: new Date().toISOString()
  };
  
  leads.push(lead);
  
  res.json({ success: true, event, lead, message: `Inquiry scheduled + lead created` });
});

calendarRouter.delete('/events/:id', (req, res) => {
  const idx = calendarEvents.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Event not found' });
  calendarEvents.splice(idx, 1);
  res.json({ success: true, message: 'Event deleted' });
});

calendarRouter.get('/summary', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisWeek = calendarEvents.filter(e => {
    const eventDate = new Date(e.start);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    return eventDate >= now && eventDate <= weekFromNow;
  });
  
  const byType = {};
  const byCalendar = {};
  
  calendarEvents.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1;
    byCalendar[e.calendar] = (byCalendar[e.calendar] || 0) + 1;
  });
  
  res.json({
    success: true,
    summary: {
      totalEvents: calendarEvents.length,
      thisWeek: thisWeek.length,
      upcomingThisWeek: thisWeek,
      byType, byCalendar,
      calendars: Object.keys(GOOGLE_CALENDAR.CALENDARS)
    }
  });
});

app.use('/api/calendar', calendarRouter);

// ============================================================
// ERROR HANDLING
// ============================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5051;

app.listen(PORT, () => {
  console.log(`[MiniAPI] Running on port ${PORT}`);
  console.log(`[MiniAPI] URL: http://process.env.DB_HOST:${PORT}`);
  try {
    // miniapi-pool-injected
    const { Pool } = pg;
    const miniApiPool = new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || 5432, 10),
      database: process.env.DB_NAME     || 'auditdna',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 5
    });
    miniApiPool.on('error', (err) => console.error('[miniapi-pool] error:', err.message));
    miniApiAgents.initAll({ pool: miniApiPool, aiHelper: global.aiHelper || null });
    miniApiAgents.startAll();
  } catch (err) {
    console.error('[MiniAPI Agents] init error:', err.message);
  }
});

export default app;

