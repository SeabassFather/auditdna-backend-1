// ============================================================================
// SAUL INTEL CRM DATA LAYER — SaulIntelData.js
// All static data, constants, helpers — zero React, zero render cost
// ============================================================================
// -
// Mexausa Food Group, Inc.
// -
// ALL FEATURES MERGED | LUXURY ROBB REPORT STYLE
// 27K Contacts | Email Marketing | AI Cowboys | Video | Voice
// Conference | Files | Buyers USA/Mexico | Commodity Search
// -

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import {
  Mail, Video, Upload, Send, Save, UserPlus, Volume2, VolumeX, MonitorPlay, Square, Play, Download, Trash2, X,
  Users, List, Paperclip, Image as ImageIcon, Mic, BarChart as BarChartIcon, UserX, Eye, Plus, Calendar, Clock, Globe,
  ExternalLink, Bell, Repeat, FileText, Copy, Check, ChevronLeft, ChevronRight, Settings, Brain,
  Sparkles, Circle, Volume, Smartphone, Youtube, Facebook, Instagram, Twitter, Linkedin, QrCode,
  Printer, MapPin, CalendarDays, CalendarPlus, CalendarCheck, MicOff, VideoOff, Layout, Search,
  Edit3, Layers, Zap, Package, Shield, Truck, AlertTriangle, DollarSign, TrendingUp, Filter
} from 'lucide-react';

// -
// LUXURY COLOR SCHEME - ROBB REPORT / DUPONT REGISTRY
// -
// -
// CONSTANTS
// -
export const SIGNATURE = `Best regards,\nSaul Garcia\nCEO, Mexausa Food Group, Inc.\nSaul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116\nmexausafg.com`;
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.readonly';
export const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google && window.google.accounts) { resolve(); return; }
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.onload = resolve;
  s.onerror = reject;
  document.head.appendChild(s);
});

export const C = {
  // Luxury dark theme
  bg: '#0a0a0a',
  bgLight: '#1a1a1a',
  panel: 'rgba(26, 26, 26, 0.95)',
  card: 'rgba(30, 30, 30, 0.9)',
  
  // Luxury metallics
  gold: '#cba658',
  goldDark: '#b8944d',
  silver: '#c0c0c0',
  silverDark: '#94a3b8',
  platinum: '#e5e4e2',
  
  // Luxury accents
  champagne: '#f7e7ce',
  bronze: '#cd7f32',
  copper: '#b87333',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#dc2626',
  info: '#3b82f6',
  cyan: '#06b6d4',
  
  // Text
  white: '#f8fafc',
  grey: '#94a3b8',
  greyDark: '#64748b',
  
  // Borders
  border: 'rgba(192, 192, 192, 0.15)',
  borderGold: 'rgba(203, 166, 88, 0.3)',
  
  // White theme for Email
  whiteBg: '#f5f3ed',
  whiteCard: '#fefdfb',
  whiteBorder: '#e5e7eb',
  whiteGrey: '#d1d5db',
  whiteText: '#111827',
  whiteTextSec: '#6b7280',
  
  // Social
  youtube: '#FF0000',
  facebook: '#1877F2',
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  sms: '#22c55e'
};

export const API = {
  base: (process.env.REACT_APP_API_URL || 'http://localhost:5050'),
  zadarma: `${process.env.REACT_APP_API_URL || 'http://localhost:5050'}/api/zadarma`,
  email: `${process.env.REACT_APP_API_URL || 'http://localhost:5050'}/api/email`,
  files: `${process.env.REACT_APP_API_URL || 'http://localhost:5050'}/api/files`,
  crm: `${process.env.REACT_APP_API_URL || 'http://localhost:5050'}/api`
};
export const CRM = API.crm;

// ─── CONTACT FIELD HELPERS ───────────────────────────────────────────────────
export const gName = c => c?.first_name ? `${c.first_name} ${c.last_name||''}`.trim() : (c?.legal_name || c?.trade_name || c?.name || '');
export const gComp = c => c?.company || c?.trade_name || c?.legal_name || '';
export const gCity = c => c?.city || '';
export const gCtry = c => c?.country || '';
export const gMail = c => c?.email || c?.email_address || '';
export const cid   = c => c?.id || c?.email || Math.random().toString(36).slice(2);
export const gPhone = c => c?.phone || c?.mobile || c?.telephone || c?.phone_number || c?.cell || '';
// ─────────────────────────────────────────────────────────────────────────────

// -
// 81 MINER NINERS
// -
export const COWBOYS = [
  // TIER 0: Market Intelligence (10)
  { id: 'price-hawk', name: 'Price Hawk', tier: 0, status: 'ACTIVE', action: 'Monitoring prices', category: 'Market' },
  { id: 'demand', name: 'Demand Prophet', tier: 0, status: 'ACTIVE', action: 'Forecasting demand', category: 'Market' },
  { id: 'supply', name: 'Supply Scout', tier: 0, status: 'ACTIVE', action: 'Supply tracking', category: 'Market' },
  { id: 'trend', name: 'Trend Tracker', tier: 0, status: 'ACTIVE', action: 'Market trends', category: 'Market' },
  { id: 'competition', name: 'Competition Spy', tier: 0, status: 'ACTIVE', action: 'Competitor watch', category: 'Market' },
  { id: 'season', name: 'Season Sage', tier: 0, status: 'ACTIVE', action: 'Seasonal analysis', category: 'Market' },
  { id: 'export', name: 'Export Expert', tier: 0, status: 'ACTIVE', action: 'Export regs', category: 'Market' },
  { id: 'import', name: 'Import Intel', tier: 0, status: 'ACTIVE', action: 'Import tracking', category: 'Market' },
  { id: 'currency', name: 'Currency Crusader', tier: 0, status: 'ACTIVE', action: 'Exchange rates', category: 'Market' },
  { id: 'futures', name: 'Futures Forecaster', tier: 0, status: 'ACTIVE', action: 'Futures pricing', category: 'Market' },
  
  // TIER 1: Compliance (10)
  { id: 'compliance', name: 'Compliance Sheriff', tier: 1, status: 'ACTIVE', action: 'FSMA 204', category: 'Compliance' },
  { id: 'cert', name: 'Cert Checker', tier: 1, status: 'ACTIVE', action: 'Certifications', category: 'Compliance' },
  { id: 'doc', name: 'Doc Detective', tier: 1, status: 'ACTIVE', action: 'Documents', category: 'Compliance' },
  { id: 'audit', name: 'Audit Ace', tier: 1, status: 'ACTIVE', action: 'Audits', category: 'Compliance' },
  { id: 'fda', name: 'FDA Guardian', tier: 1, status: 'ACTIVE', action: 'FDA regs', category: 'Compliance' },
  { id: 'usda', name: 'USDA Watchdog', tier: 1, status: 'ACTIVE', action: 'USDA compliance', category: 'Compliance' },
  { id: 'gfsi', name: 'GFSI Guru', tier: 1, status: 'ACTIVE', action: 'GFSI standards', category: 'Compliance' },
  { id: 'trace', name: 'Trace Tracker', tier: 1, status: 'ACTIVE', action: 'Traceability', category: 'Compliance' },
  { id: 'label', name: 'Label Lawman', tier: 1, status: 'ACTIVE', action: 'Labels', category: 'Compliance' },
  { id: 'safety', name: 'Safety Sentinel', tier: 1, status: 'ACTIVE', action: 'Food safety', category: 'Compliance' },
  
  // TIER 2: Logistics (10)
  { id: 'route', name: 'Route Ranger', tier: 2, status: 'ACTIVE', action: 'Routes', category: 'Logistics' },
  { id: 'port', name: 'Port Pilot', tier: 2, status: 'ACTIVE', action: 'Ports', category: 'Logistics' },
  { id: 'truck', name: 'Truck Tracker', tier: 2, status: 'ACTIVE', action: 'Fleet', category: 'Logistics' },
  { id: 'cold', name: 'Cold Chain Chief', tier: 2, status: 'ACTIVE', action: 'Temperature', category: 'Logistics' },
  { id: 'customs', name: 'Customs Captain', tier: 2, status: 'ACTIVE', action: 'Customs', category: 'Logistics' },
  { id: 'freight', name: 'Freight Foreman', tier: 2, status: 'ACTIVE', action: 'Freight', category: 'Logistics' },
  { id: 'warehouse', name: 'Warehouse Warden', tier: 2, status: 'ACTIVE', action: 'Inventory', category: 'Logistics' },
  { id: 'delivery', name: 'Delivery Deputy', tier: 2, status: 'ACTIVE', action: 'Delivery', category: 'Logistics' },
  { id: 'border', name: 'Border Boss', tier: 2, status: 'ACTIVE', action: 'Border crossing', category: 'Logistics' },
  { id: 'load', name: 'Load Master', tier: 2, status: 'ACTIVE', action: 'Load planning', category: 'Logistics' },
  
  // TIER 3: Quality (10)
  { id: 'quality', name: 'Quality Marshal', tier: 3, status: 'ACTIVE', action: 'Inspections', category: 'Quality' },
  { id: 'lab', name: 'Lab Lieutenant', tier: 3, status: 'ACTIVE', action: 'Lab analysis', category: 'Quality' },
  { id: 'fresh', name: 'Freshness Finder', tier: 3, status: 'ACTIVE', action: 'Shelf life', category: 'Quality' },
  { id: 'defect', name: 'Defect Detective', tier: 3, status: 'ACTIVE', action: 'Defects', category: 'Quality' },
  { id: 'grade', name: 'Grade Guardian', tier: 3, status: 'ACTIVE', action: 'Grading', category: 'Quality' },
  { id: 'brix', name: 'Brix Boss', tier: 3, status: 'ACTIVE', action: 'Sugar content', category: 'Quality' },
  { id: 'color', name: 'Color Commander', tier: 3, status: 'ACTIVE', action: 'Color', category: 'Quality' },
  { id: 'size', name: 'Size Supervisor', tier: 3, status: 'ACTIVE', action: 'Sizing', category: 'Quality' },
  { id: 'pack', name: 'Pack Perfectionist', tier: 3, status: 'ACTIVE', action: 'Packaging', category: 'Quality' },
  { id: 'taste', name: 'Taste Tester', tier: 3, status: 'ACTIVE', action: 'Taste', category: 'Quality' },
  
  // TIER 4: Weather (10)
  { id: 'storm', name: 'Storm Tracker', tier: 4, status: 'ALERT', action: 'Frost warning', category: 'Weather' },
  { id: 'rain', name: 'Rain Ranger', tier: 4, status: 'ACTIVE', action: 'Rainfall', category: 'Weather' },
  { id: 'temp', name: 'Temp Tracker', tier: 4, status: 'ACTIVE', action: 'Temperature', category: 'Weather' },
  { id: 'wind', name: 'Wind Watcher', tier: 4, status: 'ACTIVE', action: 'Wind speed', category: 'Weather' },
  { id: 'drought', name: 'Drought Deputy', tier: 4, status: 'ACTIVE', action: 'Drought', category: 'Weather' },
  { id: 'flood', name: 'Flood Forecaster', tier: 4, status: 'ACTIVE', action: 'Flood risk', category: 'Weather' },
  { id: 'hail', name: 'Hail Hero', tier: 4, status: 'ACTIVE', action: 'Hail warnings', category: 'Weather' },
  { id: 'heat', name: 'Heat Hunter', tier: 4, status: 'ACTIVE', action: 'Heat waves', category: 'Weather' },
  { id: 'climate', name: 'Climate Chief', tier: 4, status: 'ACTIVE', action: 'Climate', category: 'Weather' },
  { id: 'harvest-time', name: 'Harvest Herald', tier: 4, status: 'ACTIVE', action: 'Harvest timing', category: 'Weather' },
  
  // TIER 5: Finance (10)
  { id: 'cash', name: 'Cash Wrangler', tier: 5, status: 'ACTIVE', action: 'Payments', category: 'Finance' },
  { id: 'invoice', name: 'Invoice Inspector', tier: 5, status: 'ACTIVE', action: 'Invoices', category: 'Finance' },
  { id: 'credit', name: 'Credit Cowboy', tier: 5, status: 'ACTIVE', action: 'Credit checks', category: 'Finance' },
  { id: 'collections', name: 'Collections Captain', tier: 5, status: 'ACTIVE', action: 'AR collections', category: 'Finance' },
  { id: 'factor', name: 'Factor Finder', tier: 5, status: 'ACTIVE', action: 'Factoring', category: 'Finance' },
  { id: 'loan', name: 'Loan Lawman', tier: 5, status: 'ACTIVE', action: 'Loans', category: 'Finance' },
  { id: 'escrow', name: 'Escrow Expert', tier: 5, status: 'ACTIVE', action: 'Escrow', category: 'Finance' },
  { id: 'payment', name: 'Payment Patrol', tier: 5, status: 'ACTIVE', action: 'Payment terms', category: 'Finance' },
  { id: 'margin', name: 'Margin Master', tier: 5, status: 'ACTIVE', action: 'Margins', category: 'Finance' },
  { id: 'risk', name: 'Risk Ranger', tier: 5, status: 'ACTIVE', action: 'Risk', category: 'Finance' },
  
  // TIER 6: Grower Relations (10)
  { id: 'grower', name: 'Grower Guardian', tier: 6, status: 'ACTIVE', action: 'Support', category: 'Grower' },
  { id: 'contract', name: 'Contract Cowboy', tier: 6, status: 'ACTIVE', action: 'Contracts', category: 'Grower' },
  { id: 'harvest', name: 'Harvest Helper', tier: 6, status: 'ACTIVE', action: 'Coordination', category: 'Grower' },
  { id: 'yield', name: 'Yield Yodeler', tier: 6, status: 'ACTIVE', action: 'Forecasting', category: 'Grower' },
  { id: 'field', name: 'Field Foreman', tier: 6, status: 'ACTIVE', action: 'Inspections', category: 'Grower' },
  { id: 'pest', name: 'Pest Patrol', tier: 6, status: 'ACTIVE', action: 'Pest control', category: 'Grower' },
  { id: 'soil', name: 'Soil Scout', tier: 6, status: 'ACTIVE', action: 'Soil analysis', category: 'Grower' },
  { id: 'water', name: 'Water Warden', tier: 6, status: 'ACTIVE', action: 'Water mgmt', category: 'Grower' },
  { id: 'fertilizer', name: 'Fertilizer Finder', tier: 6, status: 'ACTIVE', action: 'Fertilizers', category: 'Grower' },
  { id: 'tech', name: 'Tech Trainer', tier: 6, status: 'ACTIVE', action: 'Training', category: 'Grower' },
  
  // TIER 7: Buyer Relations (10)
  { id: 'buyer', name: 'Buyer Buddy', tier: 7, status: 'ACTIVE', action: 'Engagement', category: 'Buyer' },
  { id: 'order', name: 'Order Officer', tier: 7, status: 'ACTIVE', action: 'Orders', category: 'Buyer' },
  { id: 'quote', name: 'Quote Quickdraw', tier: 7, status: 'ACTIVE', action: 'Quotes', category: 'Buyer' },
  { id: 'volume', name: 'Volume Vanguard', tier: 7, status: 'ACTIVE', action: 'Volume', category: 'Buyer' },
  { id: 'preference', name: 'Preference Pro', tier: 7, status: 'ACTIVE', action: 'Preferences', category: 'Buyer' },
  { id: 'loyalty', name: 'Loyalty Lieutenant', tier: 7, status: 'ACTIVE', action: 'Loyalty', category: 'Buyer' },
  { id: 'complaint', name: 'Complaint Commander', tier: 7, status: 'ACTIVE', action: 'Complaints', category: 'Buyer' },
  { id: 'feedback', name: 'Feedback Finder', tier: 7, status: 'ACTIVE', action: 'Feedback', category: 'Buyer' },
  { id: 'renewal', name: 'Renewal Ranger', tier: 7, status: 'ACTIVE', action: 'Renewals', category: 'Buyer' },
  { id: 'upsell', name: 'Upsell Ace', tier: 7, status: 'ACTIVE', action: 'Upselling', category: 'Buyer' },
  
  // TIER 8: Analytics (11)
  { id: 'data', name: 'Data Desperado', tier: 8, status: 'ACTIVE', action: 'Data mining', category: 'Analytics' },
  { id: 'insight', name: 'Insight Inspector', tier: 8, status: 'ACTIVE', action: 'Patterns', category: 'Analytics' },
  { id: 'report', name: 'Report Rustler', tier: 8, status: 'ACTIVE', action: 'Reports', category: 'Analytics' },
  { id: 'dashboard', name: 'Dashboard Deputy', tier: 8, status: 'ACTIVE', action: 'Dashboards', category: 'Analytics' },
  { id: 'metrics', name: 'Metrics Marshal', tier: 8, status: 'ACTIVE', action: 'KPIs', category: 'Analytics' },
  { id: 'benchmark', name: 'Benchmark Boss', tier: 8, status: 'ACTIVE', action: 'Benchmarks', category: 'Analytics' },
  { id: 'predict', name: 'Predict Prophet', tier: 8, status: 'ACTIVE', action: 'Predictions', category: 'Analytics' },
  { id: 'alert', name: 'Alert Ace', tier: 8, status: 'ACTIVE', action: 'Alerts', category: 'Analytics' },
  { id: 'anomaly', name: 'Anomaly Agent', tier: 8, status: 'ACTIVE', action: 'Anomalies', category: 'Analytics' },
  { id: 'viz', name: 'Viz Virtuoso', tier: 8, status: 'ACTIVE', action: 'Visualization', category: 'Analytics' },
  { id: 'intel', name: 'Intelligence Chief', tier: 8, status: 'ACTIVE', action: 'Business intel', category: 'Analytics' }
];

// AI CONTENT COWBOYS
export const CONTENT_COWBOYS = [
  { id: 'content',  name: 'Content Cowboy',  skill: 'Full email campaigns',      tier: 'Buyer'   },
  { id: 'subject',  name: 'Subject Sniper',  skill: 'Subject line optimization', tier: 'Buyer'   },
  { id: 'grower',   name: 'Grower Guardian', skill: 'Grower network outreach',   tier: 'Grower'  },
  { id: 'price',    name: 'Price Hawk',      skill: 'FOB price alert blasts',    tier: 'Market'  },
  { id: 'contract', name: 'Contract Cowboy', skill: 'Contract & LOI templates',  tier: 'Grower'  },
  { id: 'recon',    name: 'Recon Chief',     skill: 'AI buyer intel & recon',    tier: 'Buyer'   },
  { id: 'social',   name: 'Social Scout',    skill: 'Multi-channel campaigns',   tier: 'Market'  },
  { id: 'sms',      name: 'SMS Sniper',      skill: 'SMS & push campaigns',      tier: 'Market'  }
];

// GROWER NETWORK COMMODITY CATALOG
export const COMMODITY_CATALOG = [
  {id:'AVO-48', name:'Hass Avocado 48ct',       cat:'Avocados',     origin:'Michoacan MX',   fob:46.5, ws:52,  status:'OPEN_MARKET', vol:'Full Truckload'},
  {id:'AVO-60', name:'Hass Avocado 60ct',       cat:'Avocados',     origin:'Jalisco MX',     fob:42.5, ws:48,  status:'OPEN_MARKET', vol:'Spot + Contract'},
  {id:'STR-ALB',name:'Strawberry Albion 8x1lb', cat:'Berries',      origin:'Baja CA MX',     fob:27,   ws:32,  status:'CONTRACT',    vol:'Year-Round'},
  {id:'BLU-12', name:'Blueberries 12x6oz',      cat:'Berries',      origin:'Jalisco MX',     fob:42.5, ws:48,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'RSP-12', name:'Raspberries 12x6oz',      cat:'Berries',      origin:'Jalisco MX',     fob:46,   ws:52,  status:'CONTRACT',    vol:'Weekly Program'},
  {id:'BLK-12', name:'Blackberries 12x6oz',     cat:'Berries',      origin:'Jalisco MX',     fob:40,   ws:46,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'LIM-40', name:'Persian Limes 40lb',      cat:'Citrus',       origin:'Veracruz MX',    fob:19,   ws:24,  status:'OPEN_MARKET', vol:'Year-Round'},
  {id:'TOM-ROM',name:'Roma Tomatoes 25lb',      cat:'Tomatoes',     origin:'Sinaloa MX',     fob:21.5, ws:27,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'PEP-RED',name:'Bell Pepper Red 11lb',    cat:'Peppers',      origin:'Sinaloa MX',     fob:25,   ws:30,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'PEP-GRN',name:'Bell Pepper Green 11lb',  cat:'Peppers',      origin:'Sinaloa MX',     fob:16.5, ws:22,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'ROM-24', name:'Romaine Lettuce 24ct',    cat:'Leafy Greens', origin:'Guanajuato MX',  fob:21,   ws:26,  status:'CONTRACT',    vol:'Year-Round'},
  {id:'ICE-24', name:'Iceberg Lettuce 24ct',    cat:'Leafy Greens', origin:'Guanajuato MX',  fob:19,   ws:24,  status:'CONTRACT',    vol:'Year-Round'},
  {id:'CIL-60', name:'Cilantro 60ct Bunched',   cat:'Herbs',        origin:'Baja CA MX',     fob:17,   ws:22,  status:'OPEN_MARKET', vol:'OPEN THIS WEEK'},
  {id:'MNG-ATA',name:'Mango Ataulfo 10lb',      cat:'Tropical',     origin:'Chiapas MX',     fob:15,   ws:18,  status:'SEASONAL',    vol:'Peak Season'},
  {id:'ASP-STD',name:'Asparagus 11lb',          cat:'Asparagus',    origin:'Sonora MX',      fob:32,   ws:38,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'JAL-25', name:'Jalapeno 25lb',           cat:'Peppers',      origin:'Chihuahua MX',   fob:14.5, ws:19,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'ONI-YEL',name:'Yellow Onions 50lb',      cat:'Onions',       origin:'Chihuahua MX',   fob:16.5, ws:20,  status:'CONTRACT',    vol:'Year-Round'},
  {id:'BRC-20', name:'Broccoli Crowns 20lb',    cat:'Brassica',     origin:'Guanajuato MX',  fob:21,   ws:26,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'CUC-ENG',name:'English Cucumber 12ct',   cat:'Cucumbers',    origin:'Sinaloa MX',     fob:15,   ws:19,  status:'OPEN_MARKET', vol:'Spot Available'},
  {id:'MNG-TOM',name:'Mango Tommy Atkins 10lb', cat:'Tropical',     origin:'Chiapas MX',     fob:17,   ws:20,  status:'SEASONAL',    vol:'Peak Season'},
];

// TEMPLATE LIBRARY - wired to Brain + grower inventory
export const TEMPLATE_LIBRARY = [
  {id:'t-avo',       cat:'Avocados',    name:'Avocado FOB Alert',                   subject:'Avocado FOB Update — Mexausa Food Group',    products:['AVO-48','AVO-60'],
   body:'<p>Hi {{first_name}},</p><p>We have <strong>Hass Avocados from Michoacan and Jalisco, Mexico</strong> available on the open market this week. Quality is excellent. If {{company}} has a spot need or wants to lock in for the next few weeks, reply or call and I will have pricing to you within one hour.</p>{{PRODUCT_TABLE}}<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
  {id:'t-berry',     cat:'Berries',     name:'Berry Season Program',                subject:'Year-Round Berry Programs — Strawberry, Blueberry, Raspberry', products:['STR-ALB','BLU-12','RSP-12','BLK-12'],
   body:'<p>Hi {{first_name}},</p><p>Mexausa Food Group operates <strong>year-round berry programs</strong> from Baja California and Jalisco, Mexico. Strawberry, Blueberry, Raspberry, and Blackberry available weekly spot and fixed-price seasonal contracts.</p>{{PRODUCT_TABLE}}<p>Reply or call me for this week FOB pricing for {{company}}.</p><p>Best regards,<br/>Saul Garcia<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
  {id:'t-cilantro',  cat:'Herbs',       name:'Cilantro Open Market Alert',          subject:'Cilantro Available Now — Baja California FOB This Week', products:['CIL-60'],
   body:'<p>Hi {{first_name}},</p><p>Quick note — we have <strong>Cilantro 60ct Bunched from Baja California, Mexico</strong> available on the open market this week. Quality is excellent, volume is available, pricing is competitive FOB. Reply or call me directly.</p><p>Best regards,<br/>Saul Garcia<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
  {id:'t-lime',      cat:'Citrus',      name:'Persian Lime Weekly Update',          subject:'Persian Limes 40lb — FOB Pricing This Week', products:['LIM-40'],
   body:'<p>Hi {{first_name}},</p><p>Persian Limes 40lb from Veracruz and Colima, Mexico — year-round program open for spot and contract purchasing. This week pricing available for {{company}} on request.</p>{{PRODUCT_TABLE}}<p>Best regards,<br/>Saul Garcia<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
  {id:'t-intro',     cat:'General',     name:'Company Introduction — USA Buyers',   subject:'Mexausa Food Group — Direct from Mexico & California Growers', products:['AVO-48','STR-ALB','LIM-40','ROM-24','CIL-60'],
   body:'<p>Hi {{first_name}},</p><p>My name is Saul Garcia, CEO of <strong>Mexausa Food Group, Inc.</strong> — a licensed PACA wholesale importer headquartered in Ensenada, Baja California. Year-round programs: Hass Avocados, Persian Limes, Mixed Berries, Romaine and Iceberg Lettuce, and Cilantro. PACA Licensed, FSMA 204 traceable, direct from grower.</p>{{PRODUCT_TABLE}}<p>I would like to schedule a 15-minute call to share current availability and pricing for {{company}}.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>'},
  {id:'t-grower',    cat:'Growers',     name:'Small Grower Program Invite',         subject:'Get Your Produce in Front of 3,000 Verified US Buyers — Free', products:[],
   body:'<p>Hi {{first_name}},</p><p>My name is Saul Garcia. I run <strong>Mexausa Food Group</strong>, a PACA-licensed wholesale importer. We are opening our <strong>Small Grower Program</strong> to qualified operations in your region. Sell under our PACA license umbrella, get FSMA 204 compliant digitally, and list on AuditDNA visible to 3,000+ verified US buyers. No cost to register. Reply YES and I will send the registration link within 24 hours.</p><p>Best regards,<br/>Saul Garcia<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
  {id:'t-auditdna',  cat:'Platform',    name:'AuditDNA Platform Pitch',             subject:'Free Agricultural Trade Intelligence Platform — AuditDNA', products:[],
   body:'<p>Hi {{first_name}},</p><p>Beyond our wholesale distribution business, our team has built <strong>AuditDNA</strong> — a full-stack agricultural trade intelligence platform for the produce industry. Free to sign up for buyers and growers.</p><p>For Buyers: Live FOB Pricing, Grower Discovery, FSMA 204 Traceability, AI Market Intelligence, Port and Border Intel, Digital Contract Management.</p><p>Platform stats: 500+ commodity SKUs, 27,000+ contacts, 119 patent-eligible inventions.</p><p>Visit <a href="https://mexausafg.com">mexausafg.com</a> or reply to schedule a 20-minute walkthrough.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. and AuditDNA<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
  {id:'t-price',     cat:'Pricing',     name:'Weekly FOB Price List',               subject:'Mexausa Weekly FOB Update', products:['AVO-48','AVO-60','STR-ALB','BLU-12','LIM-40','CIL-60','ROM-24'],
   body:'<p>Hi {{first_name}},</p><p>This week FOB pricing from Mexausa Food Group, Inc. — direct from grower, no broker layers. All products PACA compliant, FSMA 204 traceable.</p>{{PRODUCT_TABLE}}<p>Contact me directly for volume pricing and contract programs.</p><p>Best regards,<br/>Saul Garcia<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
  {id:'t-newsletter',cat:'Newsletter',  name:'Weekly Market Intel Newsletter',       subject:'Mexausa Weekly Market Intel — FOB Pricing & Border Updates', products:['AVO-48','STR-ALB','BLU-12','LIM-40','TOM-ROM','CIL-60'],
   body:'<p>Good morning {{first_name}},</p><p>Your weekly market intelligence from Mexausa Food Group, Inc.</p>{{PRODUCT_TABLE}}<p><strong>BORDER STATUS THIS WEEK:</strong> Nogales 45 min — OPEN. San Diego 2.5 hrs — BUSY. El Paso 1.2 hrs — OPEN. Otay Mesa 4.2 hrs — SLOW.</p><p>Questions or spot needs? Reply directly to this email.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>'},
];

// SOCIAL PLATFORMS
export const SOCIAL_PLATFORMS = [
  { id: 'email', name: 'Email', icon: Mail, color: C.gold },
  { id: 'sms', name: 'SMS', icon: Smartphone, color: C.sms },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: C.youtube },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: C.facebook },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: C.instagram },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: C.twitter },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: C.linkedin }
];

// -
// MAIN COMPONENT
// -;
export const getSI=c=>['TIER-0','TIER-1','TIER-2','TIER-3'][(parseInt(cid(c))||0)%4];
export const getTemp=c=>c?.temperature||c?.lead_temp||c?.temp||'COLD';
export const WF_ST=['NEW_LEAD','CONTACTED','QUALIFIED','PROPOSAL','CLOSED'];
export const WF_C={NEW_LEAD:'#94a3b0',CONTACTED:'#60a5fa',QUALIFIED:'#cba658',PROPOSAL:'#f59e0b',CLOSED:'#22c55e'};
export const tempC=t=>t==='HOT'?'#ef4444':t==='WARM'?'#f59e0b':'#60a5fa';
export const siC=t=>t==='TIER-0'?'#cba658':t==='TIER-1'?'#cbd5e1':t==='TIER-2'?'#f59e0b':'#ef4444';

/* - STATIC DATA - */

export const _C=(id,name,cat,origin,fob,ws)=>({id,name,cat,origin,fob,wholesale:ws});
export const COMMODITIES=[
  _C('AVO-32','Hass Avocado 32ct XL','Avocados','Michoacan MX',56,62),
  _C('AVO-36','Hass Avocado 36ct Large','Avocados','Michoacan MX',52.5,58),
  _C('AVO-40','Hass Avocado 40ct Med-Large','Avocados','Michoacan MX',49,54),
  _C('AVO-48','Hass Avocado 48ct Medium','Avocados','Michoacan MX',46.5,51),
  _C('AVO-60','Hass Avocado 60ct Small-Med','Avocados','Jalisco MX',42.5,47),
  _C('AVO-70','Hass Avocado 70ct Small','Avocados','Jalisco MX',38.5,43),
  _C('AVO-84','Hass Avocado 84ct XSmall','Avocados','Jalisco MX',31.5,36),
  _C('AVO-ORG48','Hass Avocado Organic 48ct','Avocados','Michoacan MX',56,64),
  _C('AVO-ORG60','Hass Avocado Organic 60ct','Avocados','Michoacan MX',50,56),
  _C('AVO-COL','Colombian Hass 48/60ct','Avocados','Colombia',48,54),
  _C('AVO-PER','Peruvian Hass 48/60ct','Avocados','Peru',44,50),
  _C('AVO-CHL','Chilean Hass 48/60ct','Avocados','Chile',46,52),
  _C('AVO-GUAC','Avocado Guacamole Grade','Avocados','Jalisco MX',28,34),
  _C('AVO-IQF','Avocado Halves IQF 4x5lb','Avocados','Michoacan MX',74,85),
  _C('STR-ALB','Strawberry Albion 8x1lb','Berries','Baja California MX',27,32),
  _C('STR-SAN','Strawberry San Andreas 8x1lb','Berries','Baja California MX',25.5,30),
  _C('STR-FES','Strawberry Festival 8x1lb','Berries','Guanajuato MX',24,28),
  _C('STR-ORG','Strawberry Organic 8x1lb','Berries','Baja California MX',35,42),
  _C('STR-CAL','Strawberry California 8x1lb','Berries','Oxnard CA',28,34),
  _C('STR-FRZ','Strawberry Frozen IQF 30lb','Berries','Guanajuato MX',35,40),
  _C('BLU-12','Blueberries 12x6oz','Berries','Jalisco MX',42.5,48),
  _C('BLU-PNT','Blueberries 12x1pt','Berries','Jalisco MX',46,52),
  _C('BLU-ORG','Blueberries Organic 12x6oz','Berries','Jalisco MX',52,60),
  _C('BLU-PER','Blueberries Peru 12x6oz','Berries','Peru',40,46),
  _C('RSP-12','Raspberries 12x6oz','Berries','Jalisco MX',46,52),
  _C('RSP-ORG','Raspberries Organic 12x6oz','Berries','Baja MX',56,64),
  _C('BLK-12','Blackberries 12x6oz','Berries','Jalisco MX',40,46),
  _C('BLK-ORG','Blackberries Organic 12x6oz','Berries','Jalisco MX',50,58),
  _C('TOM-ROM','Roma Tomatoes 25lb','Tomatoes','Sinaloa MX',21.5,27),
  _C('TOM-CHR','Cherry Tomatoes 12x1pt','Tomatoes','Sinaloa MX',29,34),
  _C('TOM-GRP','Grape Tomatoes 12x1pt','Tomatoes','Sinaloa MX',27,32),
  _C('TOM-BEF','Beefsteak Tomatoes 25lb','Tomatoes','Sinaloa MX',25,30),
  _C('TOM-TOV','Tomatoes On Vine 15lb','Tomatoes','Sinaloa MX',31,36),
  _C('TOM-ORG','Roma Tomatoes Organic 25lb','Tomatoes','Sinaloa MX',29,35),
  _C('TOM-TGL','Tomatillo 10lb','Tomatoes','Jalisco MX',16.5,20),
  _C('PEP-GRN','Bell Pepper Green 11lb','Peppers','Sinaloa MX',16.5,22),
  _C('PEP-RED','Bell Pepper Red 11lb','Peppers','Sinaloa MX',25,30),
  _C('PEP-YEL','Bell Pepper Yellow 11lb','Peppers','Sinaloa MX',27,32),
  _C('PEP-MNI','Mini Sweet Peppers 12x1lb','Peppers','Sinaloa MX',31,36),
  _C('PEP-POB','Poblano Peppers 20lb','Peppers','Guanajuato MX',25,30),
  _C('JAL-25','Jalapeno Peppers 25lb','Peppers','Chihuahua MX',14.5,19),
  _C('HAB-10','Habanero Peppers 10lb','Peppers','Yucatan MX',21,26),
  _C('SER-25','Serrano Peppers 25lb','Peppers','Chihuahua MX',16.5,21),
  _C('LIM-40','Persian Limes 40lb','Citrus','Veracruz MX',19,24),
  _C('LIM-KEY','Key Limes 40lb','Citrus','Colima MX',21,26),
  _C('LEM-38','Lemons Choice 38lb','Citrus','Veracruz MX',27,32),
  _C('ORG-NAV','Navel Oranges 40lb','Citrus','Sonora MX',25,30),
  _C('GRF-RBY','Ruby Red Grapefruit 40lb','Citrus','Tamaulipas MX',23,28),
  _C('MNG-ATA','Mango Ataulfo 10lb','Tropical','Chiapas MX',15,18),
  _C('MNG-TOM','Mango Tommy Atkins 10lb','Tropical','Chiapas MX',17,20),
  _C('MNG-KNT','Mango Kent 10lb','Tropical','Nayarit MX',18,22),
  _C('MNG-ORG','Mango Organic Ataulfo 10lb','Tropical','Chiapas MX',21,26),
  _C('PPY-MAR','Papaya Maradol 35lb','Tropical','Chiapas MX',17,22),
  _C('PNA-STD','Pineapple 35lb','Tropical','Costa Rica',15,18),
  _C('BAN-STD','Banana Standard 40lb','Tropical','Guatemala',14,17),
  _C('BAN-ORG','Banana Organic 40lb','Tropical','Ecuador',18,22),
  _C('BAN-PLT','Plantain Green 50lb','Tropical','Guatemala',18,22),
  _C('DRG-RED','Dragon Fruit Red 10lb','Tropical','Vietnam',42,50),
  _C('CUC-ENG','English Cucumber 12ct','Cucumbers','Sinaloa MX',15,19),
  _C('CUC-SLC','Slicing Cucumber 1-1/9bu','Cucumbers','Sinaloa MX',16.5,20),
  _C('CUC-PRS','Persian Mini Cucumber 12x1lb','Cucumbers','Sinaloa MX',25,30),
  _C('SQU-ZUC','Zucchini Green 20lb','Squash','Sonora MX',16.5,20),
  _C('SQU-YEL','Yellow Squash 20lb','Squash','Sonora MX',16.5,20),
  _C('SQU-CHY','Chayote Squash 40lb','Squash','Veracruz MX',17,22),
  _C('ROM-24','Romaine Lettuce 24ct','Leafy Greens','Guanajuato MX',21,26),
  _C('ICE-24','Iceberg Lettuce 24ct','Leafy Greens','Guanajuato MX',19,24),
  _C('SPR-4','Spring Mix 4lb Bulk','Leafy Greens','Baja California MX',19,24),
  _C('KAL-24','Kale Bunched 24ct','Leafy Greens','Baja California MX',21,26),
  _C('SPN-4','Spinach Baby 4lb Bulk','Leafy Greens','Baja California MX',19,24),
  _C('CBG-50','Green Cabbage 50lb','Leafy Greens','Guanajuato MX',14.5,18),
  _C('CIL-60','Cilantro 60ct Bunched','Herbs','Baja California MX',17,22),
  _C('PAR-60','Parsley Flat 60ct','Herbs','Baja California MX',17,22),
  _C('BSL-12','Basil 12x4oz','Herbs','Baja California MX',32,38),
  _C('ONI-YEL','Yellow Onions 50lb','Onions','Chihuahua MX',16.5,20),
  _C('ONI-WHT','White Onions 50lb','Onions','Chihuahua MX',18.5,22),
  _C('ONI-RED','Red Onions 25lb','Onions','Chihuahua MX',16.5,20),
  _C('ONI-GRN','Green Onions 48ct','Onions','Baja California MX',17,22),
  _C('GAR-30','Garlic White 30lb','Onions','Sonora MX',40,48),
  _C('ASP-STD','Asparagus Standard 11lb','Asparagus','Sonora MX',32,38),
  _C('ASP-PER','Asparagus Peru 11lb','Asparagus','Peru',30,36),
  _C('GRP-GRN','Green Grapes Seedless 18lb','Grapes','Sonora MX',25,30),
  _C('GRP-RED','Red Grapes Seedless 18lb','Grapes','Sonora MX',27,32),
  _C('GRP-CHL','Chilean Grapes Green 18lb','Grapes','Chile',26,32),
  _C('MEL-CAN','Cantaloupe 12ct','Melons','Sonora MX',19,24),
  _C('MEL-HNY','Honeydew 5ct','Melons','Sonora MX',17,22),
  _C('MEL-WTS','Watermelon Seedless ea','Melons','Sonora MX',7,8.5),
  _C('CRT-25','Carrots 25lb Cello','Root Veg','Guanajuato MX',16.5,20),
  _C('JIC-40','Jicama 40lb','Root Veg','Nayarit MX',17,22),
  _C('GNG-30','Ginger Root 30lb','Root Veg','Peru',36,42),
  _C('YAM-40','Yams/Sweet Potato 40lb','Root Veg','Honduras',18.5,22),
  _C('BRC-20','Broccoli Crowns 20lb','Brassica','Guanajuato MX',21,26),
  _C('CLF-12','Cauliflower 12ct','Brassica','Guanajuato MX',21,26),
  _C('BRS-25','Brussels Sprouts 25lb','Brassica','Baja California MX',32,38),
  _C('GRB-25','Green Beans 25lb','Beans','Sinaloa MX',21,26),
  _C('FRB-10','French Green Beans 10lb','Beans','Guatemala',32,38),
  _C('SNP-10','Sugar Snap Peas 10lb','Beans','Guatemala',30,36),
  _C('CRN-48','Sweet Corn Yellow 48ct','Corn','Sinaloa MX',21,26),
  _C('EGG-22','Eggplant Globe 22lb','Eggplant','Sinaloa MX',16.5,20),
  _C('MSH-10','White Button Mushrooms 10lb','Mushrooms','Puebla MX',18.5,22),
  _C('MSH-SHT','Shiitake Mushrooms 5lb','Mushrooms','Mexico',32,38),
  _C('RST-50','Russet Potatoes 50lb','Potatoes','Sinaloa MX',18.5,22),
  _C('SWT-40','Sweet Potatoes 40lb','Potatoes','Guanajuato MX',18.5,22),
  _C('CEL-24','Celery 24ct','Vegetables','Guanajuato MX',17,22),
  _C('NOP-20','Cactus Pads Nopales 20lb','Vegetables','Jalisco MX',15,20),
  _C('DTE-11','Medjool Dates 11lb','Specialty','Baja California MX',52,62),
  _C('PCN-30','Pecans In-Shell 30lb','Specialty','Chihuahua MX',88,100),
  _C('CHR-18','Cherries 18lb','Stone Fruit','Chile',74,85),
  _C('FJI-40','Fuji Apples 40lb','Tree Fruit','Washington USA',30,36),
  _C('GAL-40','Gala Apples 40lb','Tree Fruit','Washington USA',28,34),
  _C('HNC-40','Honeycrisp Apples 40lb','Tree Fruit','Washington USA',44,52),
  _C('ANJ-44','Anjou Pears 44lb','Tree Fruit','Washington USA',30,36),
];
export const COMM_CATS=['All',...new Set(COMMODITIES.map(c=>c.cat))].sort();


export const AG_TEMPLATES=[
  {id:'avocado-quote',name:'Avocado Price Quote',cat:'Quotes'},
  {id:'berry-quote',name:'Berry Season Quote',cat:'Quotes'},
  {id:'veggie-quote',name:'Vegetable Mixed Quote',cat:'Quotes'},
  {id:'tropical-quote',name:'Tropical Fruits Quote',cat:'Quotes'},
  {id:'intro',name:'Company Introduction',cat:'General'},
  {id:'follow-up',name:'Follow-Up After Call',cat:'General'},
  {id:'thank-you',name:'Thank You Note',cat:'General'},
  {id:'weekly-market',name:'Weekly Produce Report',cat:'Marketing'},
  {id:'trade-show',name:'Trade Show Invite',cat:'Marketing'},
  {id:'multi-product',name:'Multi-Product Showcase',cat:'Marketing'},
  {id:'holiday',name:'Holiday Greeting',cat:'Marketing'},
  {id:'supply-alert',name:'Supply Alert',cat:'Alerts'},
  {id:'price-drop',name:'Price Drop Notification',cat:'Alerts'},
  {id:'new-season',name:'New Season Announcement',cat:'Seasonal'},
  {id:'organic-cert',name:'Organic Certification',cat:'Compliance'},
  {id:'fsma-204',name:'FSMA 204 Compliance',cat:'Compliance'},
  {id:'grower-invite',name:'Grower Program Invitation',cat:'Sourcing'},
  {id:'buyer-onboard',name:'Buyer Onboarding',cat:'Sales'},
  {id:'volume-discount',name:'Volume Discount Offer',cat:'Sales'},
  {id:'custom-pack',name:'Custom Packaging Offer',cat:'Sales'},
  {id:'credit-app',name:'Credit Application Request',cat:'Finance'},
  {id:'shipping-confirm',name:'Shipping Confirmation',cat:'Logistics'},
  {id:'cold-chain',name:'Cold Chain Capabilities',cat:'Logistics'},
  {id:'quality-report',name:'Quality Report',cat:'Compliance'},
  {id:'partnership',name:'Partnership Proposal',cat:'Business'},
  // ─── MEXAUSA FOOD GROUP COMPANY TEMPLATES ────────────────────────────────────
  {id:'mfg-intro-en', cat:'Mexausa', name:'Company Introduction (EN)',
   subject:'Mexausa Food Group — Direct from Mexico & California Growers',
   body:`<p>Hi {{first_name}},</p><p>My name is Saul Garcia, CEO of <strong>Mexausa Food Group, Inc.</strong> — a licensed PACA wholesale importer and direct distributor headquartered in Ensenada, Baja California, with operations serving California, Arizona, and the greater USA produce corridor.</p><p>We are the technology and commercial partner for <strong>Mexausa Food Group, Inc.</strong> (Los Angeles, CA and Mexico), giving us direct relationships with growers across Baja California, Michoacan, Jalisco, Sinaloa, and the Salinas Valley.</p><p><strong>What we offer {{company}}:</strong></p><ul><li><strong>Year-Round Programs:</strong> Hass Avocados, Persian Limes, Mixed Berries, Romaine and Iceberg Lettuce, and Cilantro</li><li><strong>Seasonal Open Market:</strong> Week-in, week-out competitive FOB pricing</li><li><strong>Contract Programs:</strong> Fixed-price seasonal contracts for volume buyers</li><li><strong>PACA Licensed:</strong> Full compliance, documented chain of custody, FSMA 204 traceability</li><li><strong>Direct from Grower:</strong> No middlemen — better pricing and fresher product</li></ul><p>I would like to schedule a 15-minute call to learn more about {{company}} needs and share our current availability and pricing.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},
  {id:'mfg-intro-es', cat:'Mexausa', name:'Introduccion Empresa (ES)',
   subject:'Mexausa Food Group — Directo de Productores de Mexico y California',
   body:`<p>Estimado/a {{first_name}},</p><p>Mi nombre es Saul Garcia, CEO de <strong>Mexausa Food Group, Inc.</strong> — importador mayorista con licencia PACA y distribuidor directo con sede en Ensenada, Baja California, con operaciones en California, Arizona y el corredor de produccion de EE.UU.</p><p>Somos el socio tecnologico y comercial de <strong>Mexausa Food Group, Inc.</strong> (Los Angeles, CA y Mexico), con relaciones directas con productores en Baja California, Michoacan, Jalisco, Sinaloa y el Valle de Salinas.</p><p><strong>Lo que ofrecemos a {{company}}:</strong></p><ul><li><strong>Programas Todo el Ano:</strong> Aguacates Hass, Limones Persas, Berries Mixtos, Lechuga Romana y Americana, y Cilantro</li><li><strong>Mercado Abierto Estacional:</strong> Precios FOB competitivos semana a semana</li><li><strong>Programas de Contrato:</strong> Contratos a precio fijo para compradores de volumen</li><li><strong>Licencia PACA:</strong> Cumplimiento total, cadena de custodia documentada, trazabilidad FSMA 204</li><li><strong>Directo del Productor:</strong> Sin intermediarios — mejores precios y producto mas fresco</li></ul><p>Me gustaria agendar una llamada de 15 minutos para conocer las necesidades de {{company}} y compartir disponibilidad y precios actuales.</p><p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},
  {id:'mfg-product-en', cat:'Mexausa', name:'Year-Round Product Programs (EN)',
   subject:'Year-Round Avocado, Lime, Berry, Lettuce & Cilantro Programs — Open Now',
   body:`<p>Hi {{first_name}},</p><p>At <strong>Mexausa Food Group</strong> we operate five year-round produce programs open for contract and spot-market purchasing. Here is what is available for {{company}} right now:</p><table style="border-collapse:collapse;width:100%;max-width:580px;margin:12px 0"><tr style="background:#0a4d8c"><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">PROGRAM</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">ORIGIN</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">AVAILABILITY</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">PRICING</th></tr><tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Hass Avocados (all sizes)</td><td style="padding:8px 10px;font-size:11px">Michoacan and Jalisco, MX</td><td style="padding:8px 10px;font-size:11px">Year-Round</td><td style="padding:8px 10px;font-size:11px">Weekly FOB / Contract</td></tr><tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Persian Limes 40lb</td><td style="padding:8px 10px;font-size:11px">Veracruz and Colima, MX</td><td style="padding:8px 10px;font-size:11px">Year-Round</td><td style="padding:8px 10px;font-size:11px">Weekly FOB / Contract</td></tr><tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Berries (Strawberry, Blueberry, Raspberry, Blackberry)</td><td style="padding:8px 10px;font-size:11px">Baja California and Jalisco, MX</td><td style="padding:8px 10px;font-size:11px">Year-Round</td><td style="padding:8px 10px;font-size:11px">Weekly FOB / Contract</td></tr><tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Romaine and Iceberg Lettuce</td><td style="padding:8px 10px;font-size:11px">Guanajuato, MX and Salinas, CA</td><td style="padding:8px 10px;font-size:11px">Year-Round</td><td style="padding:8px 10px;font-size:11px">Weekly FOB / Contract</td></tr><tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Cilantro 60ct Bunched</td><td style="padding:8px 10px;font-size:11px">Baja California, MX</td><td style="padding:8px 10px;font-size:11px;color:#156f3e;font-weight:700">OPEN NOW</td><td style="padding:8px 10px;font-size:11px">Spot Market Available</td></tr></table><p>All programs available week-to-week spot or as fixed-price seasonal contracts. We price every Monday at 8:00 AM PST.</p><p>Reply or call me directly for this week pricing for {{company}}.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},
  {id:'mfg-product-es', cat:'Mexausa', name:'Programas de Producto Todo el Ano (ES)',
   subject:'Programas de Aguacate, Limon, Berries, Lechuga y Cilantro — Disponibles Ahora',
   body:`<p>Estimado/a {{first_name}},</p><p>En <strong>Mexausa Food Group</strong> operamos cinco programas anuales disponibles en contrato y mercado spot. Esto es lo disponible para {{company}} ahora mismo:</p><table style="border-collapse:collapse;width:100%;max-width:580px;margin:12px 0"><tr style="background:#0a4d8c"><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">PROGRAMA</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">ORIGEN</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">DISPONIBILIDAD</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">PRECIO</th></tr><tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Aguacates Hass (todos los tamanos)</td><td style="padding:8px 10px;font-size:11px">Michoacan y Jalisco, MX</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">FOB Semanal / Contrato</td></tr><tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Limones Persas 40lb</td><td style="padding:8px 10px;font-size:11px">Veracruz y Colima, MX</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">FOB Semanal / Contrato</td></tr><tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Berries (Fresa, Arandano, Frambuesa, Mora)</td><td style="padding:8px 10px;font-size:11px">Baja California y Jalisco, MX</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">FOB Semanal / Contrato</td></tr><tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Lechuga Romana y Americana</td><td style="padding:8px 10px;font-size:11px">Guanajuato, MX y Salinas, CA</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">FOB Semanal / Contrato</td></tr><tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Cilantro 60ct en Manojo</td><td style="padding:8px 10px;font-size:11px">Baja California, MX</td><td style="padding:8px 10px;font-size:11px;color:#156f3e;font-weight:700">DISPONIBLE AHORA</td><td style="padding:8px 10px;font-size:11px">Mercado Spot</td></tr></table><p>Todos los programas disponibles semana a semana o en contratos a precio fijo. Precios cada lunes a las 8:00 AM.</p><p>Respondame o llameme directamente para los precios de esta semana para {{company}}.</p><p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},
  {id:'mfg-cilantro-en', cat:'Mexausa', name:'Cilantro Open Market Alert (EN)',
   subject:'Cilantro Available Now — Baja California FOB This Week',
   body:`<p>Hi {{first_name}},</p><p>Quick note — we have <strong>Cilantro 60ct Bunched from Baja California, Mexico</strong> available on the open market this week. Quality is excellent, volume is available, pricing is competitive FOB.</p><p>If {{company}} has a need this week or wants to lock in for the next few weeks, reply or call me directly and I will have a quote to you within the hour.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},
  {id:'mfg-cilantro-es', cat:'Mexausa', name:'Alerta Cilantro Mercado Abierto (ES)',
   subject:'Cilantro Disponible Esta Semana — Baja California FOB',
   body:`<p>Estimado/a {{first_name}},</p><p>Aviso rapido — tenemos <strong>Cilantro 60ct en Manojo de Baja California, Mexico</strong> disponible en mercado abierto esta semana. Calidad excelente, volumen disponible, precio FOB competitivo.</p><p>Si {{company}} tiene necesidad esta semana o quiere asegurar las proximas semanas, respondame o llameme directamente y le tengo cotizacion en menos de una hora.</p><p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},
  {id:'mfg-auditdna-en', cat:'Mexausa', name:'AuditDNA Platform Pitch (EN)',
   subject:'Free Agricultural Trade Intelligence Platform for Buyers and Growers',
   body:`<p>Hi {{first_name}},</p><p>Beyond our wholesale distribution business, our team at Mexausa Food Group has built something we believe will change how the produce industry operates — and we want {{company}} to be among the first to use it.</p><p><strong>Introducing AuditDNA — Agricultural Trade Intelligence Platform</strong></p><p>AuditDNA is a full-stack SaaS platform built from the ground up for the produce industry. It is <strong>free to sign up</strong> for buyers and growers.</p><p><strong>For Buyers:</strong></p><ul><li><strong>Live FOB Pricing Intelligence</strong> — Real-time market pricing across 500+ commodities from Mexico, California, and Latin America</li><li><strong>Grower Discovery Engine</strong> — Search and connect directly with verified growers across 12 countries, filtered by commodity, certification, volume, and region</li><li><strong>FSMA 204 Traceability</strong> — Full chain of custody from field to dock. One scan shows origin, harvest date, handler chain, and lab results</li><li><strong>AI Market Intelligence</strong> — 2-4 week price and supply forecasts powered by USDA data, weather patterns, and border crossing analytics</li><li><strong>Port and Border Intelligence</strong> — Live crossing wait times at all major US-Mexico ports of entry</li><li><strong>Digital Contract Management</strong> — LOI, LOC, and Term Sheet workflows executed and tracked digitally</li><li><strong>Quality Control Hub</strong> — Digital inspection reports, photo documentation, and lab results tied to individual lots</li></ul><p><strong>For Growers:</strong></p><ul><li><strong>GrowerMaster Registration</strong> — 5-step digital KYC that certifies your operation and connects you to 3,000+ verified US and Mexico buyers</li><li><strong>Small Grower Program</strong> — Sell under our PACA license and FSMA compliance umbrella — eliminating the biggest barrier to US market access</li><li><strong>AI Risk Tiering</strong> — Tier 0-3 classification that qualifies you for credit terms and premium buyer programs</li><li><strong>Digital Food Safety Attestations</strong> — Replace paper GAP/GMP records with blockchain-verified digital attestations</li></ul><p><strong>Platform stats:</strong> 500+ commodity SKUs, 27,000+ contacts, 119 patent-eligible inventions, full USDA and border data integration.</p><p><strong>Free to sign up.</strong> Visit <a href="https://mexausafg.com">mexausafg.com</a> or reply to schedule a personal 20-minute walkthrough.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. and AuditDNA<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},
  {id:'mfg-auditdna-es', cat:'Mexausa', name:'Plataforma AuditDNA (ES)',
   subject:'Plataforma Gratuita de Inteligencia Agricola para Compradores y Productores',
   body:`<p>Estimado/a {{first_name}},</p><p>Ademas de nuestro negocio de distribucion mayorista, el equipo de Mexausa Food Group ha construido algo que creemos cambiara la industria del produce — y queremos que {{company}} sea de los primeros en utilizarlo.</p><p><strong>Presentamos AuditDNA — Agricultural Trade Intelligence Platform</strong></p><p>AuditDNA es una plataforma SaaS completa construida especificamente para la industria del produce. Es <strong>completamente gratuita</strong> para compradores y productores.</p><p><strong>Para Compradores:</strong></p><ul><li><strong>Precios FOB en Tiempo Real</strong> — Precios de mercado para 500+ productos de Mexico, California y America Latina</li><li><strong>Motor de Descubrimiento de Productores</strong> — Conecte con productores verificados en 12 paises</li><li><strong>Trazabilidad FSMA 204</strong> — Cadena de custodia completa del campo al muelle</li><li><strong>Inteligencia de Mercado AI</strong> — Pronosticos de precio y suministro de 2-4 semanas</li><li><strong>Inteligencia de Puertos y Fronteras</strong> — Tiempos de cruce en tiempo real en puertos Mexico-EE.UU.</li></ul><p><strong>Para Productores:</strong></p><ul><li><strong>Registro GrowerMaster</strong> — KYC digital de 5 pasos que lo conecta con 3,000+ compradores verificados</li><li><strong>Programa Pequenos Productores</strong> — Venda bajo nuestro paraguas PACA y FSMA</li><li><strong>Puntuacion de Riesgo AI</strong> — Clasificacion Tier 0-3 para acceso a credito y programas premium</li></ul><p><strong>Registro completamente gratuito.</strong> Visite <a href="https://mexausafg.com">mexausafg.com</a> para crear su cuenta.</p><p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. y AuditDNA<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},
  {id:'mfg-grower-en', cat:'Mexausa', name:'Grower Recruitment (EN)',
   subject:'Get Your Produce in Front of 3,000 Verified US Buyers — Free',
   body:`<p>Hi {{first_name}},</p><p>My name is Saul Garcia. I run <strong>Mexausa Food Group</strong>, a PACA-licensed wholesale importer and the company behind <strong>AuditDNA</strong> — an agriculture intelligence platform built for Mexico and Latin American growers who want consistent access to US buyers.</p><p>We are opening our <strong>Small Grower Program</strong> to qualified operations in your region. This program allows growers of any size to:</p><ul><li>Sell under our <strong>PACA license umbrella</strong> — eliminating the biggest compliance barrier to the US market</li><li>Get <strong>FSMA 204 compliant</strong> through our digital attestation system — no paper, no consultants</li><li>List on <strong>AuditDNA</strong> — visible to 3,000+ verified US buyers searching for your commodity now</li><li>Access <strong>AI risk scoring</strong> for credit terms and premium buyer programs</li><li>Receive <strong>weekly FOB market intelligence</strong> so you know your product value before you negotiate</li></ul><p><strong>No cost to register.</strong> We earn through trade finance and logistics, not upfront fees.</p><p>If {{company}} produces avocados, limes, berries, lettuce, cilantro, tomatoes, peppers, or any PACA commodity — reply YES and I will send the registration link and have a specialist call you within 24 hours.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},
  {id:'mfg-grower-es', cat:'Mexausa', name:'Reclutamiento de Productores (ES)',
   subject:'Ponga su Producto Frente a 3,000 Compradores de EE.UU. — Gratis',
   body:`<p>Estimado/a {{first_name}},</p><p>Mi nombre es Saul Garcia. Dirijo <strong>Mexausa Food Group</strong>, importador con licencia PACA y la empresa detras de <strong>AuditDNA</strong> — plataforma de inteligencia agricola para productores de Mexico que quieren acceso constante a compradores de EE.UU.</p><p>Estamos abriendo nuestro <strong>Programa para Pequenos Productores</strong> a operaciones calificadas en su region:</p><ul><li>Venda bajo nuestro <strong>paraguas de licencia PACA</strong></li><li>Cumpla con <strong>FSMA 204</strong> via nuestro sistema digital — sin papel ni consultores</li><li>Listese en <strong>AuditDNA</strong> — visible para 3,000+ compradores verificados de EE.UU.</li><li>Acceda a <strong>puntuacion de riesgo AI</strong> para credito y programas premium</li><li>Reciba <strong>inteligencia de mercado FOB semanal</strong></li></ul><p><strong>Sin costo de registro.</strong> Respondame SI y le envio el enlace de registro.</p><p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},
  {id:'mfg-foodservice-en', cat:'Mexausa', name:'Foodservice Introduction (EN)',
   subject:'Direct Produce Supply for Your Foodservice Operation — Mexausa Food Group',
   body:`<p>Hi {{first_name}},</p><p>I am reaching out to introduce <strong>Mexausa Food Group</strong> as a direct produce supply partner for {{company}} foodservice operation.</p><p>We work directly with growers in Mexico and California — no broker layers — which means better pricing, better quality control, and a direct line when you need it most.</p><p><strong>What foodservice operators value most about working with us:</strong></p><ul><li><strong>Consistency</strong> — Year-round programs on avocados, limes, berries, lettuce, and cilantro</li><li><strong>Flexibility</strong> — Spot buys, weekly standing orders, and fixed-price contracts</li><li><strong>Traceability</strong> — Every lot documented from field to delivery. FSMA 204 compliant</li><li><strong>Competitive Pricing</strong> — Direct from grower eliminates 1-2 middleman margins (typically 8-15% of your produce cost)</li><li><strong>PACA Protected</strong> — Federal PACA regulations on every transaction</li></ul><p>I would like to learn about {{company}} current supply chain and show you where we can add value. A 15-minute call is all it takes.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},
  {id:'mfg-followup-en', cat:'Mexausa', name:'Follow-Up First Contact (EN)',
   subject:'Following Up — Mexausa Food Group / {{company}}',
   body:`<p>Hi {{first_name}},</p><p>Following up on my previous message about produce supply programs from Mexausa Food Group. I will keep it short — we have <strong>avocados, limes, berries, lettuce, and cilantro</strong> available this week on the open market. If {{company}} has any spot needs or wants to explore a standing program, I can have pricing to you in under an hour.</p><p>If the timing is not right, just let me know and I will circle back next season.</p><p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},
  {id:'mfg-followup-es', cat:'Mexausa', name:'Seguimiento Primer Contacto (ES)',
   subject:'Seguimiento — Mexausa Food Group / {{company}}',
   body:`<p>Estimado/a {{first_name}},</p><p>Dando seguimiento a mi mensaje anterior sobre programas de suministro de Mexausa Food Group. Se lo hago breve — tenemos <strong>aguacates, limones, berries, lechuga y cilantro</strong> disponibles esta semana. Si {{company}} tiene necesidades spot o quiere explorar un programa permanente, puedo tener precios en menos de una hora.</p><p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},
  // ─── USA BUYER WHOLESALE IMPORTER TEMPLATES (3) ──────────────────────────────
  {id:'mfg-usa-wholesale-1', cat:'USA Buyers', name:'USA Wholesale — Mexico Import Program',
   subject:'Direct from Mexico: Avocados, Berries, Limes & More — PACA Licensed Importer',
   body:`<p>Hi {{first_name}},</p>
<p>My name is Saul Garcia, CEO of <strong>Mexausa Food Group, Inc.</strong> — a PACA-licensed wholesale importer and distributor headquartered in Ensenada, Baja California, with distribution into California, Arizona, and the broader US produce corridor.</p>
<p>We import direct from verified growers across Mexico and source from California and the West Coast, giving {{company}} a single reliable supply partner across multiple commodities:</p>
<table style="border-collapse:collapse;width:100%;max-width:600px;margin:14px 0">
  <tr style="background:#0a4d8c"><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">COMMODITY</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">ORIGIN</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">PROGRAM TYPE</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">AVAILABILITY</th></tr>
  <tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Hass Avocados (all sizes)</td><td style="padding:8px 10px;font-size:11px">Michoacan &amp; Jalisco, MX</td><td style="padding:8px 10px;font-size:11px">Contract &amp; Spot</td><td style="padding:8px 10px;font-size:11px">Year-Round</td></tr>
  <tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Persian Limes 40lb</td><td style="padding:8px 10px;font-size:11px">Veracruz &amp; Colima, MX</td><td style="padding:8px 10px;font-size:11px">Contract &amp; Spot</td><td style="padding:8px 10px;font-size:11px">Year-Round</td></tr>
  <tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Strawberries, Blueberries, Raspberries</td><td style="padding:8px 10px;font-size:11px">Baja California &amp; Jalisco, MX</td><td style="padding:8px 10px;font-size:11px">Contract &amp; Spot</td><td style="padding:8px 10px;font-size:11px">Year-Round</td></tr>
  <tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Romaine &amp; Iceberg Lettuce</td><td style="padding:8px 10px;font-size:11px">Guanajuato, MX &amp; Salinas, CA</td><td style="padding:8px 10px;font-size:11px">Contract &amp; Spot</td><td style="padding:8px 10px;font-size:11px">Year-Round</td></tr>
  <tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Cilantro, Tomatoes, Peppers, Onions</td><td style="padding:8px 10px;font-size:11px">Sinaloa &amp; Baja CA, MX</td><td style="padding:8px 10px;font-size:11px">Spot Market</td><td style="padding:8px 10px;font-size:11px">Seasonal/Weekly</td></tr>
</table>
<p><strong>Why buyers choose Mexausa:</strong></p>
<ul>
  <li>PACA Licensed — federal protection on every transaction</li>
  <li>FSMA 204 compliant — full traceability field to dock</li>
  <li>No broker layers — direct grower relationships mean better pricing</li>
  <li>Weekly FOB pricing every Monday at 8AM PST</li>
  <li>Dedicated account rep — call or text me directly</li>
</ul>
<p>I would like to learn about {{company}} current supply needs and send pricing for this week. A 15-minute call is all it takes.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. | PACA Licensed Importer &amp; Distributor<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},

  {id:'mfg-usa-wholesale-2', cat:'USA Buyers', name:'USA Wholesale — West Coast Produce Programs',
   subject:'West Coast Produce Direct: Strawberries, Lettuce, Avocados — Mexausa Food Group',
   body:`<p>Hi {{first_name}},</p>
<p>I am reaching out from <strong>Mexausa Food Group, Inc.</strong>, a PACA-licensed wholesale importer and West Coast produce distributor. We work directly with growers in Baja California, California's Salinas Valley, and Oxnard — and import from Michoacan, Jalisco, and Sinaloa, Mexico.</p>
<p>For {{company}}, we can offer the following West Coast and Mexico-origin programs:</p>
<ul>
  <li><strong>Strawberries Albion/San Andreas</strong> — Baja California year-round + Oxnard CA seasonal. 8x1lb flat. Fixed-price and spot programs available.</li>
  <li><strong>Romaine &amp; Iceberg Lettuce</strong> — Salinas CA + Guanajuato MX. 24ct. Year-round continuity program with weekly pricing.</li>
  <li><strong>Hass Avocados</strong> — Michoacan &amp; Jalisco MX import. All sizes 32ct through 84ct. Conventional and certified organic.</li>
  <li><strong>Cilantro 60ct Bunched</strong> — Baja California MX. Open market pricing updated weekly. Strong availability now.</li>
  <li><strong>Blueberries, Raspberries, Blackberries</strong> — Jalisco MX year-round berry programs.</li>
</ul>
<p>All product is:</p>
<ul>
  <li>PACA protected on every invoice</li>
  <li>FSMA 204 digitally traceable from field to delivery</li>
  <li>Available FOB origin or delivered to your dock</li>
  <li>Priced competitively — we cut the middleman</li>
</ul>
<p>If {{company}} has a spot need this week or wants to discuss a standing weekly program, reply or call me and I will have pricing to you within the hour.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116 | mexausafg.com</p>`},

  {id:'mfg-usa-wholesale-3', cat:'USA Buyers', name:'USA Wholesale — Distributor Partnership Proposal',
   subject:'Wholesale Distributor Partnership — Mexausa Food Group | PACA Licensed',
   body:`<p>Hi {{first_name}},</p>
<p>I want to introduce <strong>Mexausa Food Group, Inc.</strong> as a long-term wholesale supply partner for {{company}}.</p>
<p>We are a PACA-licensed importer and distributor with direct relationships with growers across Baja California, Michoacan, Jalisco, Sinaloa, and the Salinas Valley. We bring product in under our own PACA license and handle the full import chain — so what {{company}} gets is reliable, consistent, traceable product at competitive pricing without navigating multiple broker relationships.</p>
<p><strong>What a partnership with Mexausa looks like:</strong></p>
<ul>
  <li><strong>Dedicated weekly pricing</strong> — FOB origin every Monday. Locked contract pricing available for volume commitments.</li>
  <li><strong>Flexible volume</strong> — from single pallets to full truckloads. We scale with your needs.</li>
  <li><strong>Consistent year-round supply</strong> on avocados, limes, berries, and lettuce. No gaps, no scrambling mid-season.</li>
  <li><strong>Trade finance options</strong> — net terms available for qualified buyers. Invoice factoring and PO financing through our partner network.</li>
  <li><strong>Full FSMA 204 traceability</strong> — QR-scannable lots, digital chain of custody, instant recall response.</li>
  <li><strong>One point of contact</strong> — you call or text me directly. No call centers, no ticket systems.</li>
</ul>
<p><strong>Commodities available now:</strong> Hass Avocados | Persian Limes | Strawberries | Blueberries | Raspberries | Romaine | Iceberg | Cilantro | Roma Tomatoes | Bell Peppers | Jalisco Mangos | Asparagus.</p>
<p>I would like to schedule a 20-minute introduction call with {{company}} to share current pricing and discuss what a supply program would look like. Are you available this week?</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. | PACA Licensed Importer &amp; Distributor<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},

  // ─── MEXICO BUYER WHOLESALE IMPORTER TEMPLATES (3) ────────────────────────────
  {id:'mfg-mx-wholesale-1', cat:'Mexico Buyers', name:'MX Buyers — Importacion y Distribucion USA',
   subject:'Mexausa Food Group — Distribuidor Mayorista PACA para el Mercado de EE.UU.',
   body:`<p>Estimado/a {{first_name}},</p>
<p>Mi nombre es Saul Garcia, CEO de <strong>Mexausa Food Group, Inc.</strong> — importador mayorista con licencia PACA y distribuidor con sede en Ensenada, Baja California. Somos el puente directo entre productores de Mexico y compradores verificados en todo Estados Unidos.</p>
<p>Si {{company}} produce o comercializa frutas y verduras frescas, podemos ser su socio de distribucion en el mercado americano. Asi es como funciona nuestra operacion:</p>
<ul>
  <li><strong>Importamos bajo nuestra propia licencia PACA</strong> — usted vende bajo nuestro paraguas de cumplimiento. Sin costo de tramite ni certificacion adicional.</li>
  <li><strong>Distribuimos a compradores verificados en California, Arizona, Texas y mas alla</strong> — 3,000+ compradores activos en nuestra red.</li>
  <li><strong>Pagamos en tiempo</strong> — cumplimiento PACA garantiza pago en 10 dias habiles o antes.</li>
  <li><strong>Trazabilidad FSMA 204 digital</strong> — su producto certificado y rastreable desde la parcela hasta el muelle de descarga en EE.UU.</li>
  <li><strong>Precios FOB competitivos</strong> — actualizados cada lunes. Sin capas de intermediarios.</li>
</ul>
<p>Productos que actualmente importamos y distribuimos: Aguacates Hass | Limones Persas | Fresas, Arandanos, Frambuesas | Lechuga Romana y Americana | Cilantro | Tomates Roma | Chiles | Cebollas | Mangos | Esparragos.</p>
<p>Si {{company}} quiere explorar como podemos distribuir su producto en EE.UU. o necesita un socio de abastecimiento confiable, respondame o llameme directamente.</p>
<p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},

  {id:'mfg-mx-wholesale-2', cat:'Mexico Buyers', name:'MX Buyers — Programa de Aguacate y Berries',
   subject:'Programa de Aguacate Hass y Berries Mexico — Distribucion Directa EE.UU.',
   body:`<p>Estimado/a {{first_name}},</p>
<p>Le contacto de parte de <strong>Mexausa Food Group, Inc.</strong>, importador mayorista con licencia PACA especializado en aguacate Hass, berries y citricos de Mexico para el mercado estadounidense.</p>
<p>Tenemos programas activos de distribucion para los siguientes productos de origen mexicano:</p>
<table style="border-collapse:collapse;width:100%;max-width:600px;margin:14px 0">
  <tr style="background:#0a4d8c"><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">PRODUCTO</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">ORIGEN</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">TEMPORADA</th><th style="padding:8px 10px;color:white;text-align:left;font-size:11px">TIPO DE PROGRAMA</th></tr>
  <tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Aguacate Hass 32ct–84ct</td><td style="padding:8px 10px;font-size:11px">Michoacan, Jalisco</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">Contrato / Spot</td></tr>
  <tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Fresa Albion 8x1lb</td><td style="padding:8px 10px;font-size:11px">Baja California</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">Contrato / Spot</td></tr>
  <tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Arandano 12x6oz</td><td style="padding:8px 10px;font-size:11px">Jalisco</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">Contrato</td></tr>
  <tr><td style="padding:8px 10px;font-size:11px;font-weight:700">Limon Persa 40lb</td><td style="padding:8px 10px;font-size:11px">Veracruz, Colima</td><td style="padding:8px 10px;font-size:11px">Todo el Ano</td><td style="padding:8px 10px;font-size:11px">Contrato / Spot</td></tr>
  <tr style="background:#f8fafc"><td style="padding:8px 10px;font-size:11px;font-weight:700">Cilantro 60ct Manojo</td><td style="padding:8px 10px;font-size:11px">Baja California</td><td style="padding:8px 10px;font-size:11px">Disponible Ahora</td><td style="padding:8px 10px;font-size:11px">Mercado Abierto</td></tr>
</table>
<p>Compramos FOB origen, manejamos el cruce de frontera bajo nuestra licencia y entregamos a compradores mayoristas en todo EE.UU. Si {{company}} tiene volumen disponible esta semana o quiere establecer un programa mensual, respondame con cantidades y origen y le tengo una oferta en menos de 24 horas.</p>
<p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},

  {id:'mfg-mx-wholesale-3', cat:'Mexico Buyers', name:'MX Buyers — Propuesta Distribucion Mayorista',
   subject:'Propuesta de Asociacion Mayorista — Mexausa Food Group | Distribuidor PACA EE.UU.',
   body:`<p>Estimado/a {{first_name}},</p>
<p>Me comunico para presentar una propuesta de asociacion comercial entre {{company}} y <strong>Mexausa Food Group, Inc.</strong></p>
<p>Somos un importador mayorista con licencia PACA con sede en Ensenada, Baja California. Nuestra operacion conecta directamente a productores mexicanos con mas de 3,000 compradores verificados en Estados Unidos — sin capas de intermediarios y con proteccion PACA en cada transaccion.</p>
<p><strong>Lo que ofrecemos a {{company}} como socio de distribucion:</strong></p>
<ul>
  <li><strong>Acceso inmediato al mercado de EE.UU.</strong> — distribuimos en California, Arizona, Nevada, Texas, Illinois, Florida y mas.</li>
  <li><strong>Importacion bajo nuestra licencia PACA</strong> — usted no necesita licencia propia para vender en EE.UU. con nosotros.</li>
  <li><strong>Cumplimiento FSMA 204 completo</strong> — certificacion digital incluida en el programa, sin costo adicional.</li>
  <li><strong>Opciones de financiamiento</strong> — factoraje de facturas y financiamiento de OC disponibles para productores calificados.</li>
  <li><strong>Precios FOB transparentes</strong> — cotizacion semanal basada en mercado real. Sin sorpresas.</li>
  <li><strong>Plataforma AuditDNA gratuita</strong> — visibilidad completa de sus envios, precios de mercado en tiempo real y trazabilidad digital desde su cuenta.</li>
</ul>
<p>El siguiente paso es simple: una llamada de 20 minutos para entender el volumen, origen y temporada de {{company}}, y presentarles una propuesta concreta de programa de distribucion.</p>
<p>Estoy disponible esta semana. Respondame o llameme directamente.</p>
<p>Saludos,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc.<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},

  // ─── END MEXAUSA TEMPLATES ───────────────────────────────────────────────────

  // ─── AUDITDNA PLATFORM MARKETING TEMPLATES (8) ──────────────────────────────
  {id:'auditdna-exec-en', cat:'AuditDNA', name:'Platform Executive Pitch (EN)',
   subject:'AuditDNA — The Only Field-Driven Agriculture Intelligence Platform for the Produce Industry',
   body:`<p>Hi {{first_name}},</p>
<p>My name is Saul Garcia. I am the founder of <strong>AuditDNA Agriculture Intelligence Platform</strong> and CEO of Mexausa Food Group, Inc. (PACA #20241168), headquartered in Ensenada, Baja California.</p>
<p>I want to share something I believe will fundamentally change how {{company}} sources, prices, and structures produce transactions.</p>
<p><strong>AuditDNA is not a marketplace. It is a field-driven intelligence and sourcing platform that provides direct, verified access to agricultural supply at origin — with built-in compliance validation, pricing leverage, and real-time market intelligence.</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:620px;margin:16px 0;background:#0a0f1a;border:1px solid rgba(203,166,88,0.3)">
  <tr><td colspan="2" style="padding:12px 16px;background:linear-gradient(135deg,#1a2a0a,#0f1a2e);border-bottom:2px solid #cba658"><span style="font-family:Arial,sans-serif;font-size:12px;font-weight:900;color:#e8d5a0;letter-spacing:2px">PLATFORM CAPABILITIES</span></td></tr>
  <tr style="background:rgba(203,166,88,0.05)"><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;width:220px;border-bottom:1px solid rgba(255,255,255,0.06)">Real-Time FOB Pricing</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">200+ commodities tracked live from Mexico, California, and Latin America</td></tr>
  <tr><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">Verified Grower Network</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">5,000+ vetted producers across 12 Mexican regions — direct access, no broker layers</td></tr>
  <tr style="background:rgba(203,166,88,0.05)"><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">FSMA 204 Traceability</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">Full chain of custody, QR lot tracking, blockchain-verified attestations, recall workflows</td></tr>
  <tr><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">81 Niner Miners AI</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">81 specialized AI agents for pricing, compliance, logistics, growers, weather, and finance</td></tr>
  <tr style="background:rgba(203,166,88,0.05)"><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">Blind Lender Marketplace</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">AR factoring, PO financing, LOI/LOC/Term Sheet digital workflow — lender identity protected until NDA</td></tr>
  <tr><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">Contact Intelligence</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">23,000+ verified produce industry contacts segmented by commodity, geography, and buying behavior</td></tr>
  <tr style="background:rgba(203,166,88,0.05)"><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658">Port & Border Intel</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1">Live crossing wait times, USDA data integration, tariff intelligence for all US-Mexico ports</td></tr>
</table>
<p><strong>Why {{company}} should care:</strong></p>
<ul>
  <li>Traditional broker-heavy model: reactive sourcing, unknown supply risk, margin leakage at every layer</li>
  <li>AuditDNA model: direct-to-grower access, field-verified supply, proactive intelligence, margin-focused execution</li>
</ul>
<p style="font-style:italic;color:#94a3b8;border-left:3px solid #cba658;padding-left:12px;margin:16px 0"><em>"We don't just find supply — we validate it, secure it, and structure it for performance."</em></p>
<p><strong>Free to sign up.</strong> Tier 0 gets you full access to the intelligence layer. Premium tiers unlock the complete sourcing and finance stack.</p>
<p>Visit <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a> or reply to schedule a 20-minute walkthrough. I will personally run the demo.</p>
<p>Best regards,<br/>Saul Garcia<br/>Founder, AuditDNA | CEO, Mexausa Food Group, Inc. (PACA #20241168)<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},

  {id:'auditdna-buyer-en', cat:'AuditDNA', name:'Buyer Intelligence Pitch (EN)',
   subject:'Stop Chasing FOB Pricing — AuditDNA Sends It to You Before the Market Moves',
   body:`<p>Hi {{first_name}},</p>
<p>If {{company}} is still calling brokers every Monday morning to get FOB pricing, you are getting information that is already two days old — and you are paying for it in margin.</p>
<p><strong>AuditDNA gives procurement teams direct market intelligence at the source.</strong></p>
<ul>
  <li><strong>Real-time FOB pricing</strong> on 200+ commodities — avocados, limes, berries, tomatoes, peppers, lettuce, asparagus, mangos, and more — updated live from origin</li>
  <li><strong>Price alert system</strong> — set a target price per commodity and get notified the moment it hits, before your competition knows the market moved</li>
  <li><strong>Grower reliability scoring</strong> — every grower in our network is scored on fill rate, quality consistency, compliance history, and delivery performance</li>
  <li><strong>Direct grower access</strong> — 5,000+ verified producers across Michoacan, Jalisco, Sinaloa, Sonora, Baja California, and the Salinas Valley. No brokers. No middlemen. No mystery.</li>
  <li><strong>PACA-compliant transaction management</strong> — every deal structured and documented inside the platform</li>
  <li><strong>Cross-border execution</strong> — logistics coordination, port wait times, customs alignment, and cold chain monitoring in one dashboard</li>
</ul>
<p>Result for {{company}}: lower cost per box, stronger supply control, and purchasing decisions based on real intelligence — not gut feel and phone calls.</p>
<p><strong>Free to sign up. No credit card required.</strong></p>
<p>Visit <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a> or reply and I will schedule a personal walkthrough for your team.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. | AuditDNA Agriculture Platform<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},

  {id:'auditdna-grower-en', cat:'AuditDNA', name:'Grower Registration Pitch (EN)',
   subject:'Get Your Farm in Front of 3,000+ Verified US Buyers — Free Digital Registration',
   body:`<p>Hi {{first_name}},</p>
<p>If you are growing produce in Mexico, you already have the most valuable asset in the supply chain. The problem is visibility — and access to US buyers who are ready to buy right now.</p>
<p><strong>AuditDNA solves that. Here is exactly what registration gives your operation:</strong></p>
<ul>
  <li><strong>5-step digital GrowerMaster registration</strong> — completes your farm profile, certifies your operation, and makes you discoverable to 3,000+ verified US buyers searching for your commodity today</li>
  <li><strong>FSMA 204 compliance — digitally, from your phone</strong> — no consultants, no paper binders. Your attestations are blockchain-verified and QR-scannable for any US buyer audit</li>
  <li><strong>Small Grower Program</strong> — sell under our PACA license umbrella. This eliminates the single biggest barrier to US market access for Mexican growers</li>
  <li><strong>AI risk tiering</strong> — Tier 0 through Tier 3 classification that unlocks credit terms, premium buyer programs, and financing options</li>
  <li><strong>Direct connection to terminal market buyers</strong> — Los Angeles, Phoenix, Dallas, Miami, Chicago. Buyers who are actively looking for growers in your region</li>
  <li><strong>Trade finance access</strong> — invoice factoring and PO financing available for qualified Tier 2+ operations</li>
</ul>
<p>Registration is free. The platform is free. You bring the product — we bring the buyers.</p>
<p>Register at <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a> or reply YES and I will send you the direct registration link within 24 hours.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. (PACA #20241168)<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},

  {id:'auditdna-compliance-en', cat:'AuditDNA', name:'Compliance & Food Safety Teams (EN)',
   subject:'FSMA 204, GlobalGAP, SENASICA — All in One Dashboard with Live Expiration Alerts',
   body:`<p>Hi {{first_name}},</p>
<p>Managing produce compliance in 2025 means tracking FSMA 204 traceability requirements, GlobalGAP certifications, PrimusGFS audit schedules, SENASICA documentation, and FDA alerts — simultaneously, across multiple suppliers and seasons.</p>
<p>Most teams are doing this in spreadsheets. <strong>AuditDNA was built to replace that entirely.</strong></p>
<p><strong>What the AuditDNA Compliance Hub gives {{company}}:</strong></p>
<ul>
  <li><strong>FSMA 204 full traceability</strong> — QR-scannable lots from field to dock. One scan returns origin, harvest date, handler chain, lab results, and digital GAP attestation</li>
  <li><strong>Certificate expiration tracking</strong> — GlobalGAP, PrimusGFS, SENASICA, USDA Organic all monitored with automatic alerts 30, 14, and 7 days before expiration</li>
  <li><strong>Recall response workflow</strong> — identify affected lots, trace forward and backward, generate FDA notification documentation in under 4 hours instead of 4 days</li>
  <li><strong>Supplier compliance scoring</strong> — every grower in the network is scored on compliance history, inspection results, and certification status</li>
  <li><strong>Live FDA alert integration</strong> — compliance team is notified immediately when an FDA alert impacts a commodity or region you are sourcing from</li>
  <li><strong>Digital inspection reports</strong> — photo documentation, temperature logs, and lab results tied to individual lots and stored with full audit trail</li>
</ul>
<p>Result: your compliance team stops firefighting and starts managing proactively. Audit prep time drops from weeks to hours.</p>
<p>Free to sign up. Visit <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a> or reply to schedule a walkthrough.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. | AuditDNA Platform<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},

  {id:'auditdna-finance-en', cat:'AuditDNA', name:'Trade Finance & Lender Marketplace (EN)',
   subject:'Blind Lender Marketplace for Produce Trade Finance — AR Factoring, PO Financing, Deal Structuring',
   body:`<p>Hi {{first_name}},</p>
<p>The produce industry moves fast. Capital constraints — slow-pay customers, front-loaded grower payments, seasonal inventory peaks — are the primary reason good deals fall apart or margins collapse.</p>
<p><strong>AuditDNA integrates the financial intelligence that most sourcing platforms have never considered building.</strong></p>
<p><strong>The AuditDNA Financial Stack:</strong></p>
<ul>
  <li><strong>Blind Lender Marketplace</strong> — submit your financing need and receive competing bids from qualified agricultural lenders. Lender identity is protected by NDA/LOI until terms are accepted. No cold calls, no shopping your deal around the market.</li>
  <li><strong>Accounts Receivable Factoring</strong> — advance up to 90% of invoice value within 24-48 hours. Qualified PACA-compliant transactions only. No liens required on operations under $500K.</li>
  <li><strong>Purchase Order Financing</strong> — fund confirmed POs from verified US buyers before the product ships. Bridge the grower payment gap without touching your credit line.</li>
  <li><strong>LOI / LOC / Term Sheet digital workflow</strong> — the full deal lifecycle executed and tracked inside the platform. Every document timestamped, version-controlled, and stored with full audit trail.</li>
  <li><strong>Risk and payment flow optimization</strong> — AI-powered scoring of every transaction for payment risk, compliance exposure, and deal structure optimization before you commit.</li>
</ul>
<p>For {{company}}: faster deal execution, reduced capital constraints, and financial structuring support built specifically for PACA-regulated produce transactions.</p>
<p>This is not available anywhere else in the produce industry.</p>
<p>Reply to schedule a 20-minute financial structure walkthrough, or visit <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a>.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. (PACA #20241168)<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},

  {id:'auditdna-agtech-en', cat:'AuditDNA', name:'Ag Technology API Partnership (EN)',
   subject:'API Access to a Live US-Mexico Produce Intelligence Network — Partnership Opportunity',
   body:`<p>Hi {{first_name}},</p>
<p>If {{company}} builds technology for the produce industry, you already know the hardest part is not the software — it is getting access to live, verified, structured data from growers, buyers, and markets across the US-Mexico corridor.</p>
<p><strong>AuditDNA has built that infrastructure. And we are opening API access to qualified technology partners.</strong></p>
<p><strong>What the AuditDNA Intelligence Layer gives technology partners:</strong></p>
<ul>
  <li><strong>Live grower database API</strong> — 5,000+ verified producers with commodity profiles, certification status, capacity data, and compliance scoring. Updated continuously.</li>
  <li><strong>Real-time FOB pricing feed</strong> — 200+ commodity pricing signals from origin markets, updated live. Structured JSON, ready to embed in any platform.</li>
  <li><strong>FSMA 204 traceability engine</strong> — QR generation, lot tracking, chain of custody documentation, and blockchain attestation as a service.</li>
  <li><strong>Border and port intelligence</strong> — live crossing wait times, USDA data integration, and tariff intelligence for all major US-Mexico ports of entry.</li>
  <li><strong>Buyer and contact intelligence</strong> — 23,000+ verified produce industry contacts with commodity affinity, buying behavior, and geographic segmentation.</li>
  <li><strong>AI pricing and supply forecasting</strong> — 2-4 week forward price and volume signals powered by 81 Niner Miners agents trained on produce market data.</li>
</ul>
<p>119 patent-eligible inventions across 12 technology families. White-label, co-branding, and revenue-share partnership structures available.</p>
<p>I am available for a technical partnership call this week. Reply or visit <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a>.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. | AuditDNA Agriculture Platform<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},

  {id:'auditdna-exec-es', cat:'AuditDNA', name:'Platform Executive Pitch (ES)',
   subject:'AuditDNA — La Unica Plataforma de Inteligencia Agricola de Campo para la Industria del Produce',
   body:`<p>Estimado/a {{first_name}},</p>
<p>Mi nombre es Saul Garcia, fundador de <strong>AuditDNA Agriculture Intelligence Platform</strong> y CEO de Mexausa Food Group, Inc. (PACA #20241168), con sede en Ensenada, Baja California.</p>
<p>Quiero compartir algo que creo cambiara fundamentalmente como {{company}} obtiene, cotiza y estructura sus transacciones de produce.</p>
<p><strong>AuditDNA no es un marketplace. Es una plataforma de inteligencia y abastecimiento de campo que proporciona acceso directo y verificado al suministro agricola en origen — con validacion de cumplimiento integrada, ventaja en precios, e inteligencia de mercado en tiempo real.</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:620px;margin:16px 0;background:#0a0f1a;border:1px solid rgba(203,166,88,0.3)">
  <tr><td colspan="2" style="padding:12px 16px;background:linear-gradient(135deg,#1a2a0a,#0f1a2e);border-bottom:2px solid #cba658"><span style="font-family:Arial,sans-serif;font-size:12px;font-weight:900;color:#e8d5a0;letter-spacing:2px">CAPACIDADES DE LA PLATAFORMA</span></td></tr>
  <tr style="background:rgba(203,166,88,0.05)"><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;width:220px;border-bottom:1px solid rgba(255,255,255,0.06)">Precios FOB en Tiempo Real</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">200+ productos monitoreados en vivo desde Mexico, California y Latinoamerica</td></tr>
  <tr><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">Red de Productores Verificados</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">5,000+ productores verificados en 12 regiones de Mexico — acceso directo, sin intermediarios</td></tr>
  <tr style="background:rgba(203,166,88,0.05)"><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">Trazabilidad FSMA 204</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">Cadena de custodia completa, trazabilidad QR por lote, atestaciones blockchain, flujos de retiro</td></tr>
  <tr><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">81 Niner Miners AI</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">81 agentes especializados para precios, cumplimiento, logistica, productores, clima y finanzas</td></tr>
  <tr style="background:rgba(203,166,88,0.05)"><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658;border-bottom:1px solid rgba(255,255,255,0.06)">Mercado Ciego de Prestamistas</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.06)">Factoraje, financiamiento OC, flujo LOI/LOC/Term Sheet digital — identidad del prestamista protegida</td></tr>
  <tr><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#cba658">Inteligencia de Contactos</td><td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1">23,000+ contactos verificados de la industria segmentados por producto, zona y comportamiento</td></tr>
</table>
<p style="font-style:italic;color:#94a3b8;border-left:3px solid #cba658;padding-left:12px;margin:16px 0"><em>"No solo encontramos el suministro — lo validamos, aseguramos y estructuramos para que funcione."</em></p>
<p><strong>Registro gratuito.</strong> El Tier 0 da acceso completo a la capa de inteligencia. Los tiers premium desbloquean el stack completo de abastecimiento y finanzas.</p>
<p>Visita <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a> o respondeme para agendar un recorrido personalizado de 20 minutos.</p>
<p>Saludos,<br/>Saul Garcia<br/>Fundador, AuditDNA | CEO, Mexausa Food Group, Inc. (PACA #20241168)<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116<br/>mexausafg.com</p>`},

  {id:'auditdna-tier-upgrade-en', cat:'AuditDNA', name:'Tier Upgrade Upsell (EN)',
   subject:'Your AuditDNA Tier 0 Access Is Active — Here Is What You Are Missing',
   body:`<p>Hi {{first_name}},</p>
<p>Your free Tier 0 account on AuditDNA is active — and you already have access to more produce intelligence than most sourcing teams see in a week.</p>
<p>But here is what {{company}} is not seeing yet:</p>
<table style="border-collapse:collapse;width:100%;max-width:600px;margin:14px 0;background:#0a0f1a;border:1px solid rgba(203,166,88,0.2)">
  <tr><td style="padding:10px 16px;background:linear-gradient(135deg,#1a2a0a,#0f1a2e);border-bottom:1px solid rgba(203,166,88,0.3)" colspan="3"><span style="font-family:Arial,sans-serif;font-size:11px;font-weight:900;color:#e8d5a0;letter-spacing:2px">TIER COMPARISON</span></td></tr>
  <tr style="background:rgba(203,166,88,0.06)"><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#94a3b0;border-bottom:1px solid rgba(255,255,255,0.06)">FEATURE</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#94a3b0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">TIER 0 (FREE)</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#cba658;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">TIER 1+</td></tr>
  <tr><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.04)">FOB Pricing (commodities)</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#94a3b0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">25 commodities</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#86efac;font-weight:700;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">200+ live</td></tr>
  <tr style="background:rgba(203,166,88,0.03)"><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.04)">Grower Network Access</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#94a3b0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">View only</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#86efac;font-weight:700;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">Direct contact + outreach</td></tr>
  <tr><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.04)">Blind Lender Marketplace</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#ef4444;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">Locked</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#86efac;font-weight:700;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">Full access</td></tr>
  <tr style="background:rgba(203,166,88,0.03)"><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.04)">AI Price Alerts</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#ef4444;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">Locked</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#86efac;font-weight:700;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">Real-time alerts</td></tr>
  <tr><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,0.04)">CRM + Email Marketing</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#94a3b0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">Basic</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#86efac;font-weight:700;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)">Full 23,000 contact suite</td></tr>
  <tr style="background:rgba(203,166,88,0.03)"><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#cbd5e1">API Access</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#ef4444;text-align:center">Locked</td><td style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;color:#cba658;font-weight:700;text-align:center">Available</td></tr>
</table>
<p>Produce season pricing windows do not wait. Every week {{company}} stays on Tier 0, you are making purchasing decisions without the full intelligence stack.</p>
<p>Reply to this email or sign in at <a href="https://mexausafg.com" style="color:#cba658">mexausafg.com</a> to upgrade. I will personally walk you through the setup.</p>
<p>Best regards,<br/>Saul Garcia<br/>CEO, Mexausa Food Group, Inc. | AuditDNA Platform<br/>Saul@mexausafg.com | MX: +52-646-340-2686 | US: +1-831-251-3116</p>`},

  // ─── AGRI-MAXX WATER ENERGY SYSTEM ─────────────────────────────────────────
  {id:'agrimaxx-a1',cat:'Agri-Maxx',name:'Track A — Day 0 Intro (EN)',
   subject:'Cut Water Use 20% — Without Changing How You Farm',
   body:`<p>Hi {{first_name}},</p>
<p>Water costs are rising. Regulations are tightening. Most solutions require ripping out your infrastructure.</p>
<p>The <strong>Agri-Maxx Water Energy System</strong> attaches inline to your existing irrigation — no replumbing, no downtime. Growers across California, Arizona, and Baja California are reporting:</p>
<ul>
  <li>Up to <strong>20% reduction in water use</strong></li>
  <li>Up to <strong>20% less fertilizer and chemicals</strong></li>
  <li>10–20% <strong>yield improvement</strong> in berries, avocados, and tree crops</li>
  <li>Scale and biofilm removed from irrigation lines</li>
</ul>
<p>We'd like to send you a <strong>Free Farm Efficiency Report</strong> for your operation — no obligation, no sales pressure.</p>
<p>Reply to this email or visit <a href="https://agri-maxx.com">agri-maxx.com</a> to learn more.</p>
<p>— Saul Garcia | Mexausa Food Group, Inc.<br>Saul@mexausafg.com </p>`},
  {id:'agrimaxx-a1-es',cat:'Agri-Maxx',name:'Track A — Dia 0 Introduccion (ES)',
   subject:'Reduzca el Uso de Agua 20% — Sin Cambiar Su Sistema de Riego',
   body:`<p>Estimado/a {{first_name}},</p>
<p>Los costos del agua siguen subiendo. Las regulaciones se vuelven mas estrictas. Y la mayoria de las soluciones requieren reemplazar toda la infraestructura.</p>
<p>El <strong>Sistema Agri-Maxx de Energia de Agua</strong> se instala en linea con su sistema de riego actual — sin obras, sin tiempo de inactividad. Productores en California, Arizona y Baja California reportan:</p>
<ul>
  <li>Hasta un <strong>20% menos de consumo de agua</strong></li>
  <li>Hasta un <strong>20% menos de fertilizantes y quimicos</strong></li>
  <li>Mejora de rendimiento del <strong>10–20%</strong> en berries, aguacates y frutales</li>
  <li>Eliminacion de sarro y biopeliculas en las lineas de riego</li>
</ul>
<p>Queremos enviarle un <strong>Informe Gratuito de Eficiencia de su Rancho</strong> — sin compromiso.</p>
<p>Responda este correo o visitenos en <a href="https://agri-maxx.com">agri-maxx.com</a>.</p>
<p>— Saul Garcia | Mexausa Food Group, Inc.<br>Saul@mexausafg.com</p>`},
  {id:'agrimaxx-a2',cat:'Agri-Maxx',name:'Track A — Day 7 ROI Calculator (EN)',
   subject:'What Would 20% Less Water Cost You This Season?',
   body:`<p>Hi {{first_name}},</p>
<p>Last week I reached out about the Agri-Maxx Water Energy System. Today I want to make it concrete.</p>
<p><strong>Quick estimate for a 100-acre berry operation:</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:500px">
  <tr style="background:#f8f8f8"><td style="padding:8px;border:1px solid #ddd">Annual water cost</td><td style="padding:8px;border:1px solid #ddd">$180,000</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">20% reduction with Agri-Maxx</td><td style="padding:8px;border:1px solid #ddd"><strong>$36,000 saved</strong></td></tr>
  <tr style="background:#f8f8f8"><td style="padding:8px;border:1px solid #ddd">Fertilizer savings (20%)</td><td style="padding:8px;border:1px solid #ddd"><strong>$12,000 saved</strong></td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Typical payback period</td><td style="padding:8px;border:1px solid #ddd"><strong>6–14 months</strong></td></tr>
</table>
<p>Want us to run the numbers for <strong>{{company}}</strong> specifically? Reply with your irrigated acres and primary crop and we'll send a custom ROI estimate within 24 hours.</p>
<p>— Saul Garcia | Mexausa Food Group, Inc.<br><a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
  {id:'agrimaxx-a2-es',cat:'Agri-Maxx',name:'Track A — Dia 7 Calculadora ROI (ES)',
   subject:'Cuanto Le Costaria Usar 20% Menos de Agua Esta Temporada?',
   body:`<p>Estimado/a {{first_name}},</p>
<p>La semana pasada le escribi sobre el Sistema Agri-Maxx. Hoy quiero ser especifico.</p>
<p><strong>Estimado rapido para una operacion de 100 hectareas de berries:</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:500px">
  <tr style="background:#f8f8f8"><td style="padding:8px;border:1px solid #ddd">Costo anual de agua</td><td style="padding:8px;border:1px solid #ddd">$180,000</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Ahorro con Agri-Maxx (20%)</td><td style="padding:8px;border:1px solid #ddd"><strong>$36,000</strong></td></tr>
  <tr style="background:#f8f8f8"><td style="padding:8px;border:1px solid #ddd">Ahorro en fertilizantes (20%)</td><td style="padding:8px;border:1px solid #ddd"><strong>$12,000</strong></td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Periodo de recuperacion tipico</td><td style="padding:8px;border:1px solid #ddd"><strong>6–14 meses</strong></td></tr>
</table>
<p>Podemos calcular el retorno especifico para <strong>{{company}}</strong>. Respondanos con sus hectareas irrigadas y cultivo principal.</p>
<p>— Saul Garcia | Mexausa Food Group, Inc.<br><a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
  {id:'agrimaxx-a3',cat:'Agri-Maxx',name:'Track A — Day 18 Testimonial (EN)',
   subject:'What Growers in Your Region Are Saying',
   body:`<p>Hi {{first_name}},</p>
<p>Sometimes the best proof comes from people farming the same soil.</p>
<blockquote style="border-left:4px solid #cba658;padding-left:16px;color:#555;font-style:italic">
"We installed Agri-Maxx on our drip system in April. By harvest we had cut water use 18%, reduced our fertilizer runs, and yields were up 12%. The system paid for itself in the first season."
<br><em>— Grower, Ventura County CA, Strawberries and Raspberries</em>
</blockquote>
<p>Results vary by crop, soil, and water quality — which is exactly why we offer a <strong>Free Farm Efficiency Analysis</strong> before any commitment.</p>
<p>Ready to see what your numbers could look like? <a href="https://agri-maxx.com/analysis">Request your analysis here.</a></p>
<p>— Saul Garcia | Mexausa Food Group, Inc.</p>`},
  {id:'agrimaxx-a3-es',cat:'Agri-Maxx',name:'Track A — Dia 18 Testimonio (ES)',
   subject:'Lo Que Dicen los Productores en Su Region',
   body:`<p>Estimado/a {{first_name}},</p>
<p>A veces la mejor prueba viene de productores que trabajan la misma tierra.</p>
<blockquote style="border-left:4px solid #cba658;padding-left:16px;color:#555;font-style:italic">
"Instalamos Agri-Maxx en nuestro sistema de goteo en abril. Al momento de la cosecha habiamos reducido el uso de agua 18%, reducido las aplicaciones de fertilizante, y el rendimiento subio 12%. El sistema se pago solo en la primera temporada."
<br><em>— Productor, Condado de Ventura CA, Fresas y Frambuesas</em>
</blockquote>
<p>Los resultados varian segun cultivo, suelo y calidad del agua — por eso ofrecemos un <strong>Analisis Gratuito de Eficiencia</strong> antes de cualquier compromiso.</p>
<p>Listo para ver sus numeros? <a href="https://agri-maxx.com/analysis">Solicite su analisis aqui.</a></p>
<p>— Saul Garcia | Mexausa Food Group, Inc.</p>`},
  {id:'agrimaxx-a4',cat:'Agri-Maxx',name:'Track A — Day 30 Close (EN)',
   subject:'Last Chance: Free Farm Efficiency Report for {{company}}',
   body:`<p>Hi {{first_name}},</p>
<p>Over the past month I've shared how growers like you are saving water, reducing inputs, and improving yields with the Agri-Maxx Water Energy System.</p>
<p>This is my last outreach. I'd like to offer you a <strong>complimentary Farm Efficiency Analysis</strong> — a customized report showing exactly what Agri-Maxx could save at {{company}}.</p>
<p><strong>What's included:</strong></p>
<ul>
  <li>Estimated annual water savings (gallons + dollars)</li>
  <li>Fertilizer and chemical cost reduction projection</li>
  <li>Yield improvement estimate by crop type</li>
  <li>Payback period calculation</li>
</ul>
<p>No cost. No commitment. Just data.</p>
<p>Reply YES and I'll send it within 24 hours.</p>
<p>— Saul Garcia | CEO, Mexausa Food Group, Inc.<br>Saul@mexausafg.com  | <a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
  {id:'agrimaxx-a4-es',cat:'Agri-Maxx',name:'Track A — Dia 30 Cierre (ES)',
   subject:'Ultima Oportunidad: Informe Gratuito de Eficiencia para {{company}}',
   body:`<p>Estimado/a {{first_name}},</p>
<p>Durante el ultimo mes le comparti como productores como usted estan ahorrando agua, reduciendo insumos y mejorando rendimientos con el Sistema Agri-Maxx.</p>
<p>Este es mi ultimo contacto. Me gustaria ofrecerle un <strong>Analisis de Eficiencia Gratuito</strong> — un informe personalizado que muestra exactamente que puede ahorrar Agri-Maxx en {{company}}.</p>
<ul>
  <li>Estimado de ahorro anual de agua (litros + dolares)</li>
  <li>Proyeccion de reduccion de fertilizantes y quimicos</li>
  <li>Estimado de mejora de rendimiento por tipo de cultivo</li>
  <li>Calculo del periodo de recuperacion de inversion</li>
</ul>
<p>Sin costo. Sin compromiso. Solo datos.</p>
<p>Responda SI y se lo enviamos en 24 horas.</p>
<p>— Saul Garcia | CEO, Mexausa Food Group, Inc.<br>Saul@mexausafg.com | <a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
  {id:'agrimaxx-b1',cat:'Agri-Maxx',name:'Track B — Day 0 Processor Intro (EN)',
   subject:'Cut Facility Water Costs 20% — Without Downtime',
   body:`<p>Hi {{first_name}},</p>
<p>Water is one of the highest controllable costs in food processing — and most facilities are overpaying.</p>
<p>The <strong>Agri-Maxx Water Energy System</strong> installs inline on your existing water supply lines. No downtime, no facility modifications. Processing and packing facilities are reporting:</p>
<ul>
  <li><strong>20% reduction</strong> in total water consumption</li>
  <li><strong>20% reduction</strong> in sanitization chemical usage</li>
  <li>Reduced biofilm and mineral scale in processing lines</li>
  <li>Improved produce shelf life post-wash</li>
  <li>ROI typically achieved in 8–18 months</li>
</ul>
<p>We work with facilities across the California-Mexico produce corridor. I'd like to schedule a 15-minute call to see if Agri-Maxx is a fit for <strong>{{company}}</strong>.</p>
<p>— Saul Garcia | Mexausa Food Group, Inc.<br>Saul@mexausafg.com | <a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
  {id:'agrimaxx-b1-es',cat:'Agri-Maxx',name:'Track B — Dia 0 Procesadores (ES)',
   subject:'Reduzca los Costos de Agua de su Planta 20% — Sin Interrupciones',
   body:`<p>Estimado/a {{first_name}},</p>
<p>El agua es uno de los costos controlables mas altos en el procesamiento de alimentos — y la mayoria de las plantas estan pagando de mas.</p>
<p>El <strong>Sistema Agri-Maxx de Energia de Agua</strong> se instala en las lineas de suministro de agua existentes. Sin tiempo de inactividad, sin modificaciones a la planta. Instalaciones de procesamiento y empaque reportan:</p>
<ul>
  <li><strong>20% de reduccion</strong> en el consumo total de agua</li>
  <li><strong>20% de reduccion</strong> en el uso de quimicos de sanitizacion</li>
  <li>Reduccion de biopeliculas y sarro mineral en las lineas</li>
  <li>Mayor vida util del producto post-lavado</li>
  <li>Retorno de inversion tipicamente en 8–18 meses</li>
</ul>
<p>Trabajamos con plantas en el corredor de produccion California-Mexico. Me gustaria programar una llamada de 15 minutos para evaluar si Agri-Maxx es adecuado para <strong>{{company}}</strong>.</p>
<p>— Saul Garcia | Mexausa Food Group, Inc.<br>Saul@mexausafg.com | <a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
  {id:'agrimaxx-b2',cat:'Agri-Maxx',name:'Track B — Day 14 Case Study (EN)',
   subject:'How a Salinas Packing House Cut Water Bills $42,000/Year',
   body:`<p>Hi {{first_name}},</p>
<p>A produce packing facility in the Salinas Valley recently shared their Agri-Maxx results after 12 months of operation:</p>
<table style="border-collapse:collapse;width:100%;max-width:500px;margin:12px 0">
  <tr style="background:#f8f8f8"><td style="padding:8px;border:1px solid #ddd">Daily water volume processed</td><td style="padding:8px;border:1px solid #ddd">85,000 gallons</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Water reduction achieved</td><td style="padding:8px;border:1px solid #ddd"><strong>19.4%</strong></td></tr>
  <tr style="background:#f8f8f8"><td style="padding:8px;border:1px solid #ddd">Annual water cost savings</td><td style="padding:8px;border:1px solid #ddd"><strong>$42,000</strong></td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Chemical reduction</td><td style="padding:8px;border:1px solid #ddd"><strong>22%</strong></td></tr>
  <tr style="background:#f8f8f8"><td style="padding:8px;border:1px solid #ddd">System payback achieved</td><td style="padding:8px;border:1px solid #ddd"><strong>11 months</strong></td></tr>
</table>
<p>Every facility is different. Let me run a <strong>free efficiency estimate</strong> for {{company}} based on your daily water usage and current costs.</p>
<p>Reply with your approximate daily water volume and I'll have numbers back to you in 24 hours.</p>
<p>— Saul Garcia | Mexausa Food Group, Inc.<br><a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
  {id:'agrimaxx-b3',cat:'Agri-Maxx',name:'Track B — Day 30 Close Processor (EN)',
   subject:'Free Water Efficiency Audit for {{company}} — Final Offer',
   body:`<p>Hi {{first_name}},</p>
<p>This is my final outreach regarding the Agri-Maxx Water Energy System for {{company}}.</p>
<p>I'd like to offer a <strong>complimentary Water Efficiency Audit</strong> — no cost, no obligation — that will show you exactly what your facility could save annually on water and chemical costs.</p>
<p>For a facility using 50,000+ gallons daily, savings typically range from <strong>$28,000 to $85,000 per year</strong>.</p>
<p>If the timing isn't right, I completely understand. But if you'd like the audit, simply reply YES and I'll have it to you within 24 hours.</p>
<p>— Saul Garcia | CEO, Mexausa Food Group, Inc.<br>Saul@mexausafg.com  | <a href="https://agri-maxx.com">agri-maxx.com</a></p>`},
];


export const SEED_CONTACTS=[
  {id:'gc1',name:'Armando Martinez',email:'cmproducts365@gmail.com',company:'Mexausa Food Group West',source:'GMAIL'},
  {id:'gc2',name:'Jose Bremont',email:'solreal1110@gmail.com',company:'Solreal Distributors',source:'GMAIL'},
  {id:'gc3',name:'Oscar Mejia',email:'omejia@agrilinkproducts.com',company:'AgriLink Products',source:'GMAIL'},
  
  {id:'gc5',name:'Roberto Sanchez',email:'rsanchez@costco.com',company:'Costco Wholesale',source:'GMAIL'},
  {id:'gc6',name:'Maria Fernanda Lopez',email:'mflopez@walmart.com',company:'Walmart Fresh',source:'GMAIL'},
  {id:'gc7',name:'Carlos Mendoza',email:'cmendoza@kroger.com',company:'Kroger Distribution',source:'GMAIL'},
  {id:'gc8',name:'Patricia Navarro',email:'pnavarro@heb.com',company:'HEB Texas',source:'GMAIL'},
  {id:'gc9',name:'Miguel Angel Reyes',email:'mareyes@sysco.com',company:'Sysco Foodservice',source:'GMAIL'},
  {id:'gc10',name:'Sofia Gutierrez',email:'sgutierrez@usfoods.com',company:'US Foods',source:'GMAIL'},
  
  {id:'gc12',name:'Raul Hernandez',email:'rhernandez@empacadora.mx',company:'Empacadora Del Valle',source:'GMAIL'},
  {id:'gc13',name:'Luis Alberto Vega',email:'lavega@freshpoint.com',company:'FreshPoint Inc',source:'GMAIL'},
  {id:'gc14',name:'Carmen Diaz',email:'cdiaz@sprouts.com',company:'Sprouts Farmers Market',source:'GMAIL'},
  {id:'gc15',name:'Ricardo Pena',email:'rpena@traderjoes.com',company:'Trader Joes',source:'GMAIL'},
];

export const PORTS=[
  {name:'Nogales, AZ',wait:'45 min',status:'OPEN',load:72},
  {name:'San Diego, CA',wait:'2.5 hrs',status:'BUSY',load:88},
  {name:'El Paso, TX',wait:'1.2 hrs',status:'OPEN',load:65},
  {name:'Pharr, TX',wait:'55 min',status:'OPEN',load:58},
  {name:'Laredo, TX',wait:'3.1 hrs',status:'BUSY',load:91},
  {name:'Otay Mesa, CA',wait:'4.2 hrs',status:'SLOW',load:95},
  {name:'Calexico, CA',wait:'1.8 hrs',status:'OPEN',load:70},
];
export const PRICING=[
  {commodity:'Avocado 48ct',fob:'$46.50',trend:'UP'},
  {commodity:'Avocado 60ct',fob:'$42.50',trend:'STABLE'},
  {commodity:'Strawberries 8x1lb',fob:'$27.00',trend:'UP'},
  {commodity:'Blueberries 12x6oz',fob:'$42.50',trend:'UP'},
  {commodity:'Raspberries 12x6oz',fob:'$46.00',trend:'STABLE'},
  {commodity:'Roma Tomatoes 25lb',fob:'$21.50',trend:'DOWN'},
  {commodity:'Persian Limes 40lb',fob:'$19.00',trend:'UP'},
  {commodity:'Bell Peppers Green',fob:'$16.50',trend:'STABLE'},
  {commodity:'Mango Ataulfo 10lb',fob:'$15.00',trend:'UP'},
  {commodity:'Asparagus 11lb',fob:'$32.00',trend:'UP'},
];
export const JAM=["DEAL LOCKED!","PIPELINE FIRING!","AVOCADOS MOVING!","FOB CONFIRMED!","GROWER SIGNED!","CAMPAIGN SENT!","LEAD CONVERTED!","CONTRACT CLOSED!","RECON COMPLETE!","BLAST DEPLOYED!","BUYERS MATCHED!","PACA APPROVED!"];

export const AGRIMAXX_PDF_DATA = {
    'growers_en': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzA0Nwo+PgpzdHJlYW0KR2F1MEZEMCkxOycpbkowZDMmKGpESz9UOl1KQWlPX1s6UWRDS1c5SD5pTWw1XyhwMkRRJVRvTEBjK0IoKlg0PF01cWFpSzhMOVRXZSdtLiFkbGxNQzZicF8hViJmO04iPzZxTWYqX1k1NkxYdS4+OSY1Rm46UHJbLFErKXJeMDs9PipMREFyNiJwSDRuKSU4K0YiKjVaMHE1XDlKMGheQGRxWjhKZ2wsPi1FKC0xJj91W05sYkpCcEMmYHRwak1qTWhGN01JOSYpR3QoRj8mYGUnLkJRdGxLTDQ0VW41JkxuM1o8c2owNDAwWmk0Zmk5ZjJHPCVQYTpCNlo0cGdVN3JlakJGclpCc0tCOGdeX0onVDY3M1ZNS1FxJlYjWCFpQ0RMPXBYNjgnQl5XLWtPI1srUGllRWpjM242IWBlQjpnbVJtWSskU0xHMEVHcWciJFYnXzU2XmdTViQiW0lMKi1CYUJdcmFIUlFoY2ZWRVdkcXIyVUBBKShIMT9LTCEsJjxvSU8sJiFsMidQO1EuJWVdUXE5Lkp1JG9pJChiXGlBKytjbFNCQltrI09qKV1kUU9SaDw9b0okN09fIkg6UjlaY1VoUFwsPSI2LkV1LmQ0TFpyPVBoUi5RTTN1Y0c1SDc1SSRaSCUhQjJJQlo/RCs+SSwmNjRgQShKJlw1OSpwJWZWUjMzJUEmVC5qSiwmWyxTSk0kclxeRCtIO2dnPCxbVilGb3E0cUU0WVVWN18qVDxfcVcvZHRlNTg8MjNrITprJmZwOFtEIUYzYFUtdXJyLlhPOV0oIXREbjNQWkZqOWlZQGR1UCRNTk9EJmo5aiw8ZS9xQCUpMlEuNS9fOlVcaTp1Ty1BKjBAZCIqKSNTZXRWWVoxLWk0LmUiIyJnOigqZShXS0w3JSMnX1omUC9YYjkzW3Mkc29KVCo9aXVTMzVpKGAwcWxiK3JJTGlFVjNEJF4nJ0NIMm82OmxJJitlTiRtRTArXTspV1FmQGAlVj1bI0YvazNbRlZFWTkoImAhZmRRXG9STlxiaThmREUuaUotK0dAKEFAT1Q3bkc3aUNQUWkwWnFFMmM9X1wyTkFSSW05MktsT3FOUm1iRnRdbTNfZD1ZYkBtMDUmOTZFai1PKFAmcDZ1Km5ydHJRQGoxJyVRRD8xUVUudF9dLV08Ny0+Y21oJnQhVD4lLVtrNVI8TV5OWypHISo7RjUwaiJeMzRER0ItI25QIlsxOGY9bDo7QCYyaGZJTXBqPG4ncypTKlwnVGNkXDYwXVkyMD0qMWYiPy09c04sNjE9QGIhM0VeNzUzPig7aXBMPzguZiwqYCFmZGNudHUzOispXDRsKl8qNDc6KjUjZVRrKklrJWZKIVByI1hSaVk0ODctIiEpW15VRGJBZXVJSFZWRmBDQE5QbzNfPVwhMjlaXzsyODJsW3FhWF0/Q2JAJkJHNS08XTFoS3AqPjtBaDwpVyNlJmQoMz9CXXRDNCktKC06XlEibjEzOWBAPDVlXz5WOWhvOCJJcWQzYW5LUlhFRnAlcW1DVD0qSFs8NVYrPVEhJSpBXFgzWm49a1VHOiRnP0BOak0rNidENGFRMGNrUWItayFRbj80cCFtW1B0ST4zWTY/IitrLkU4RUYuXGYraVc9XmRdV0sjMyVkYlgqNTpDOCU5MDM0IUo2LWNtOkM+LWJhanBnQVxOQVlAXm4paExQa1E7LVMyWVxjZilHb1EhO3BKXy1nbG8zbVxkbjNtOFd1IyQrYVtZPWNJUEFbcSsyJSdhNE00Sjo8a0UhUGJFW05DJUpyVycnJF1McCEsWCRQLmtVWlZbImo5OV4rRy5QKlE1N10rSTdiWT0oMXFCXylRblxTOTByQT1GV2dgSEgzWCZsbUc8cU5jdWU8XUdCPCppM2RaLlptMzooYmkzS1UvRiRVWTRVI24wPidybSQyMm9zP0lPdDFZK0dDXjNVKzw2V1tlUkAuQklnWGNGZEQ0bD4jP1hTcWxSXVloQTQ+OiVWRjlqMFhKJyk+TmNgZiMyNikkWEJEck5wN0psdSpHXi1wbEU2cF1kMDk3RnI+QS80THNzcFonWWs/JlJkcU5GX1tRLGMhcTtrUFlzQjsxUDtMPVBALU8jNE8mOU4qMXMuXzc0RzMpRzxfbXFjME1kbGlqTm0vVSUnaC1iXmNZY1VgdTtrXiUiOG41ayRNNV5gcWYzREtXQkglVnI5YiFrOiNUKTxhX1IiW1MvczRCRzNSKTUhc2EzJEQvXXBoZS9ldWklUFBPOS02WFQ9LzBPUUIiLCteKyExTzY6Lk4rYldnJExgbCtWZSVAWiE/PWVTUVE9NTJxcyZSJWQsL2tNVjwhSWwrbFQ1bz9eb2gxLylHL19UMzw8Y0RFXDZBYCI4YCx1cVYnX1NbLUA1KzVcZylDQjZDRG5zP2M9PW9Pamc/MWhMOEk2dS4ycXJjUkcmIlNTXWZDRTozZVVdamxwQktEcGckaUktZjJpPVwhUzgwayhpZTAvYV0uY0pUajtpQGA6SWJTNyJeRFk4aUgsKzFzUj8lZEUpUC0uU0AmdTcvMXJiM1YjU2hsN0U8WFc3RSpdUzZTTCwhVDkjJTsxQEtPTyduXzxfdVRTPCMiTFRiaHJUXCZhNio6NyMwV15ANWIwZDJTX1RlKHRBKkZsSkZfcS9XJnJpTF8iQy1VMVhuYywzISJWJiRENWMiVGxnU19OU2xqPDdoXCtuIl5OV1REZEYtOyszQWhfIWhmRlN0QnVsXmpQRU1DRXMjKCFjM0tVciVIOyNjRmg6LDhNIl83WyovYysnc0t0RjwiNDVhISotYStcN2FXSF9VZylvUDxTJmguXkRdRDo0MlloU0JcXmx1OTJqV2xVO21Xc2hpaEtAbFx1QW1Oa0ZqcmJaZCxzZmNTXFcwXWZyb3U9UkRfO1hAaVNVV0ZVbiN0Ti9lUW1sYXNGXEpTZDZZcD1sPFUhQVRBSENgaFBjciYrLihHXC1XTiRdXldrcDkyN1lTMmtQXVlrVFZqMU0vbUBCYlZuYzhOVipiby1dQCZqcWxqJS00PzhTO2pISyVAXUVtdDg+cmQmTz9qbmJbKGIydEk9R2daLWpQTS5bXWNFUzssaDRLKS81RWFASTEwIUZON1c5LyM7Oz0hXTRCVXNWQ1xsXTVTM2RoNCwzMW8+WTpRLFI7VikyIipLI1xyU2NDMmRgKyZfaEs9bDslXXBJRDhdMk9YXDM1SWNCRDg6JENWbUBFaVVndTJTcFQ2OzBLPD9pTTk3N1g8VyhQOmpiIUlHIWBBOz9bbG0tSHJlNikpTEM7bUEkPGlPRzpRYiRLKnBUPjlYRzdZJUhSRm9eMFYjRGouXilgUlNnaiRcRzczIm5pdTJaTl5DXSUjW0lvNFJrOCg/LSdsXStDMnI8cjQydU5WNWNrZXNvRWpLZzBDPEorXTkiVjVSRnJsJElcTywxKSQxdSIybmxrImhSdVo3UFA5KklSaHBSW3FybClpaTM6YTguW3BBJCJNZFc1S2I5U2U3RF5OcmtMYGs1XCdXVUJDLFhYa2JdOWhGXW8yWUVxOjw+I3FOJydPTiRtI1g8bVUhJlVIXkUlQj4tJHJsKXIqIVJUX01WQWonOkotPXJlcHIsYGZuNV9PLjxrT2VSJls9LjcrY1AiaU88Iy9AYCFnLVxMTD47JCxmNFFgLGVSZyEmT2tyXUhGKl1uJkdbJDk2UDhddCwrYzQ4OFMqW0AqLnEoNWA7KTQmNTEraV5CL14+JV4/N28oQkpgWm0pJydNUjpNOltwUC1LLTw5KyUyXExpYmBZXiIlRDQiVE5xNzReJWx1M0AuNTg1UD5saElDJixzOCRUIysyOzUhOCtDNSJFVitvYis/ZE0+XSlkJEhAMEhgVlBUNW82YltAVms0dWhfbCJrcUgjQGNnKSxnLy0+QW9rYmo9QUIvLHEnUVBHM01vam5EdVYoUV80SCZqVCpjbko4MWcrN0VpWTNvQEU2Ml5Kazs0OyZpLjNNTklvU0E6VzNjWFQhLGsiUnRqWmpvKiUhfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDExMiAwMDAwMCBuIAowMDAwMDAwMjE5IDAwMDAwIG4gCjAwMDAwMDAzMzEgMDAwMDAgbiAKMDAwMDAwMDQ0NiAwMDAwMCBuIAowMDAwMDAwNjM5IDAwMDAwIG4gCjAwMDAwMDA3MDcgMDAwMDAgbiAKMDAwMDAwMDk2OCAwMDAwMCBuIAowMDAwMDAxMDI3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDc3NTNiZjVlMTUwOWY3YmY2ODA5MGE4YTM4MmM1ZjFhPjw3NzUzYmY1ZTE1MDlmN2JmNjgwOTBhOGEzODJjNWYxYT5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNyAwIFIKL1Jvb3QgNiAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjQxNjUKJSVFT0YK',
    'growers_es': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjk5NAo+PgpzdHJlYW0KR2F1MEY/JCMjSCduLGhbXC49ZCZHJTEzRzVMbkpjQkpCLVhBVy1gJDE2bjpFKSlTZTEhImZAR1QpQUg/bVpxQzosbHMkTDRKJ3RkSiklZCRTRDFNa01oNl5LZUdfTzYhZHBFUWNTbE9kS0JbVFFKZEBiIzYlPTMzKzV0US5xLW1wKXE+Z1xQTkFgTT1zKlIqcCpcYVVFRS90M1whZytccj1PQzpaaVMqVidcUm8pZStHKjYlI1R1ZltiNU07NG51XT0tTF1KMS8sLFUyXFpqN1Z0SGtpMCZlN2Vba3JZRkBOIz9TaDRsZHFiOnFBVyptUmtGTnJabCg7OC5OYUk7P083Z1ZwM2hbTSFzcnAkZF1YTmw4TlpQaWFnVV5wSnBAZSc8UDNUUGJpOGNBaz9XMGgpJEIvLDpVMWI6KTZWLEtCWHIpSnMjTSdacXNcQVxSPi9NaV5IZCZAKF1vKHBhcDdoREltKz9zS0FMOklzNEspcl5wbmxETlNqQnNWa19OUS9KME9lNk51JkprXXJAcy9ZZ3AhMS8hdFFvWV5HXUhDVFktUEdXRTJoNSVbVSxuKmcxWj1jTlRpZWVXKnFFVlNcPSZgJF1ZZSYsLDhwWi4wRlNzcEJwWWpxOTE3NWxFMzFOL0IuX1skL0M1a24yIUImJVpYJmJncVNLMFxFNWZRSG00Y1tdNjRycFExUkAmJ01Lc3J1X2hkMlpuczRFclgkLkxXIihHS1FrV0RFVycuWmdJYTtvSz46VUMzb3JYV0sqRFddVlw1QzYmS1lPPENwOTlwJVtVWV07K2IlaC5yXEMxQzpZYEIsXj5PM0BxJyI8YnEsQms4OjFHSShHOFhyOGtdI21KLjVoQVIsT1RIXixYJlwnI0FmR1smX0k0MVo0WnNTR2UkZXBYLzRkaShoTzddQVtCJyssaVI0IWJraiVRP1FgWHJdKy5WKWZMXVEmXyJAQDYzYkdZWGR1LS9FQjhMbW9PWSNSNHJYcHBUXWVdXCtXaWpNMClXKWVXZTNOUVUxLFYoaXRKQ28rXDEqLGIyVC8jPXNncl4+QlVWcWx1O20mKS5UTEBLM0hgcD8rZFFNQHQxSmFRSCZXUWBtVD1YTlpSUyI/PDRqM1RVRDddI2kmXGAkbk4pRiIqIUBPbVA1WDlfUGNNTWNeZStoaW8pW043KWxnUm4qYz5wNzdFT3BaNyM0TipeN1NZc2BCcTFSY3JLJnJaTUczYUFkXW9UKyhyPiZSMTJKQU1lW0YyXlRKbmVlVFMiTFNTb2NFUz1sZDdcRmxUV3MrIj5jJFVOOztycyphTSMoVlBFWzQudW9KNU5tQ0RjPDFcR089KCdrZTFGTCNjNSpgSGRKK0dWInAhJFpfXF5eUV0iZGhfVkxZT15oKXM+KTpoSkkyIU5cN3M5ZFZQQz5cQ3NBbzhSOV8yZCdsVTtPRCxWIzxUPGxyMEpibFUwTVQjOWEzUV9INz4kL1E/PTVVJzZEZlU1L2xzUS8sTCMiXT5aNDhBR0w3L0NQKjpXRDtGKGxANUNgJEJFdTo4bExWWVxgcWk0UT9db3RuQ1taI3U5TVZKJWVoN3VEVVQzXSolOzIiRjpmdUk2Jz9xLkxcV1lUNjMlZVdiNDE+ITlzSTFsLCFvPVUpUTJBaGApI0RXQydOQWlvTVJvXkRGJSxCc3NQWy1vLTZfcElhZFgubEEkXXQnR0tJXzVoRVEraE5FN0hSI05NRyVqYFVTNmlELkAqLWBEcSFmQ2QtQXMxcExoLE1rUl1YJzstb10oWVQ7cyViZnFlPFpgIVsuUmdGIichWkkmXiJsKVdba0otK2pFMkRtbGw+SkFbU09YKCo6ST9NcUw3VzwhJiRoUUExY2VyQFs4KUxaUmonSDN0Y1YrQm9KOE4zSkI8cGwuXjshVVFrLXFcY2wuTkBPPlI6LSprTSJtIVh1WiEqTklFJDFFTE1qcmAmLTA9QiJjZFBCRFo9OlxIRWVfRFRXRzdIUGJbYSs7TjJfV19UQipAWzRGPSVxPDVAUWVdamxaJ1VISzdAWS9aPl9QSSJqOk8oPHQqTClWMUMiKTorTCc2XkFpUT5QcEg6VD9qN24zW0hKP1plYEtIcGo5QT4wSCtUb28rJk9UOlFzXGI5Pzs7SCwpJSxrSVpfakxcWkluXlwyVFcjTldPJzhYLWVuV1okR2hQMy5kWD9xcWJfJiskcyssRmJiT2k/byUqW20zK2RSbkRRX28zPD5uLTtaU08tO0kzbjBEMDVzOGBLWD9ISkomMk9Ua1t1SUJOayRnZzd0ViMzcShVLE1lYmk7SjFHaE1vJnBzaF9SOzYuQSI7STFFMXVsVWZeTjxLSXVuJVpaOy4qTVNAYyhDcy90N0tOXnEiVnA3QGVOXyk7b14lbG0kKGNHS01XbGtzSGolQXJzNTlrN3RpP2xlaXA6R0ZyamU2MDhAWWwzIUwtUTUjZzhYNzsrTC9WLyFNNFYicEBqQlBVP0wvSFRJX1hKMSI6TFJ0XFcuZ2ItJlQ/OiU3dVQhUjpfYigvcjguaSQxIUJuTF1zSydXPDlsXixUSmBXVCtIKFxlSmg1cyRxPT0zRSNSUkJWTHI0LSksV0FnS0lMKnFVcV1IZGFYVmxuMS5VK0E6JDZCWyxfW2RQbnMjczlHYGNDOE1tQ0BWLEEybTExSl46T2RzL0tPTUQ4Oys/QDw2NkYvK1FZZFVhKylfUS0nOmhAVnNgNHNIZ09sIVhaTWBvci83Ik9mYllyUGZCV29SaFhLLUppc2QlWTldaigkbkFPcS8tdGMySTlzU2A+SEUvbkgvXCo2OERMM3FPWW9vQltLM3JKVjRadSppUGFPZGFeXzpuTEVEMFg4Sz5aJlNeXD1jNCkiRFk+MnVrJ1JoP2VMbFEvI19CVkNHT3NdPUdaLzJVR0YzSmZRYWNPb2ZGPi0rQz5eJHVLVV8sSGxoRFVnMm9FLGNZSCc1O1k8VXVDLD5jNVwpPlRVYmwoSVQmJ0YjJlhsLERiRVBfNEh1TWZyIj9IKChtPyJvdGYzNVU2bXMtLXNQP1RoQy9qZjRsME5dKlxELV0kWTM6aiwwQzZFIV9NKCNtTTs2KUUkXXBhbFNPQj47PV9XVEplKkJNUEVCISNwVXJwIVJIPENSLSNXTzcyYzBmQ0teXU5AR2FeW2BsNiRMJFNOQkBjOl5VQGRsaGw0aUlQYEssazBLXzRfdC5FaDZeNCcpXDU7O3FNN1xXayMyU2wiLl1fUiZqcG47OExeVUQtJWdhRjsxKSR1RWtGb20zJ1xZSE9sUVBAUGA0WUJJIT0raD9eKU9qNjs6THJKSSgtbjJeXEBOTSs1OEM4KEdJZDVuR1sxY0xrUEBNMFpLUDYtNFhBWFc0NiciPW9xJUxiU2Yzbk41aWJpaC0hPik6Yl9vXTNJUWhbKSZmdSpWKGUlT0kjbUBpVG1ubF5Uc0spdTtePy0uJ0E9TU8nWlwkRFJQMkxEbWA/Tm9yMSU9YVkhWXBDLCM5RzkmNFhBUHBHYkJlSypIQ0RGMz9uYzRZRyIsMzY+KEhZVkhlNVd0PklLOzReNEA3cUZlSSw9YypbWUt1b2heVWwoNFtMUDExJ2I2Zk9wYTRDKyFPaVo0NVVzMSlVWyh1TF0rKCtYPmwna01XV04nSFArQ1pAMEJqXCtVLiNMQiQoZS9bVnFuZkdJJiZgOlBoRmZFcjFgcENSQUg3c01jWjp1L0UhXWM4VSZvKiNhXm5fY188PD4xYVc+dDE/JltySFoyZ1hpI2cvOzI7MldocExqKitjXFs2Kj80SkwpZEpmbCZqXD4/Nz1ERDpcOjkzaGhMI3N0X0BKJ0QicEJLM1JbdXVYOy8kQ15WYUNpYFhnJ2xMXyVyInRybkZbVW1dND11OFclLzpdPTNNNjwpZSduK1paKlZXcC9CP00lRTRZKjhvbzx0LGVfKFU2bCJVZTYzLm8mIjhjJz1QUX4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0NDYgMDAwMDAgbiAKMDAwMDAwMDYzOSAwMDAwMCBuIAowMDAwMDAwNzA3IDAwMDAwIG4gCjAwMDAwMDA5NjggMDAwMDAgbiAKMDAwMDAwMTAyNyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzw0MmUxOTY2ZTAxMjJjYzBiOGJmOWI1MTdmMDQ3MGI1Yj48NDJlMTk2NmUwMTIyY2MwYjhiZjliNTE3ZjA0NzBiNWI+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgo0MTEyCiUlRU9GCg==',
    'dairy_en': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjk4MQo+PgpzdHJlYW0KR2F1MEY+QmVkbCZxOVNZVy8nYDJTVl40bj0xLjEpJCIwNVleKWIhXF1JLD9mUT5OYjdHVSpsanE9UnRKL0k9aCwhM1skdXByTGZmPyFaPmhlUSgtRGk4UDglXlcwOSdjUWk0LDZAX2xMNFRPRk5MWEEtUzdTITRjcmtzamYxR2RQUC43YkVtTFthZzFPbEozaCZkXSVoTShdL3BLKTcxRjdnbVcwR2RTR2JSKWEwNTwwRFJjODcvJ0RwJGxLS2cxV20qRWlmcFJOblZ0ZyNFV2E8Ti5PbSlxQHJxWjRyczkiKFtaLnVJWTYkdEBKJTEnUCYzcy44XFFFKjYmdEZbcEo+WU9VU3AuMzUmTmk3Pj07K203IjVabzBTXEY4TiQiQj8+VUYvRUwkb143ZExEcHFcW2BhYmlZbD1UKVRDKk1OYU1wcmtAVFE6WUMiYV82Kz5ZbGdxcVw6VyZLN1BlU20+SmxNXm0pMSRKXlxjP25xT3I4UEE9ZmMwJnFUKFVoI1VVKi41SStCNllMUS0uVzMlaDNYVWk0YGoqb2oxViVHb3MzblUtY1lJMWEwczJvQFBEYmllXz4pVUIzUWEzXkg8U01fRiZPZEIlOmZFOHUpOmctPjw2Z0pTOVBlb2xOLG1faGNkK1twUVxpNDtgcUgnJExWSnFiciQ0NWhoNy40SCM+LlU8MkMqOmtDTShhdGguJGJLbmc8RlpfJWBaXiw8XjF0TkhERiFEWS0wWWNpb1NLIih0UGRRM3MuNF8rSW5zI2xaVmM7PkghUl9OIz9OOUA8Pk1INXNBMj9fMz9VJy5xc19eW245YjY3UkEmLWdgPCxfPiYhTD9RLkA2O0xaJiQhJCJyKCpETl80aic7ZyRbU0ZVTG8rTTsnP2RxQ29xVGdmU0dKUzgxVDJHcDZsZ1AvaWdpTyZQaE9XaHRtYlVETUtmPFZAPlZbVG8zUTFiSEIrWENOKGZVLExnP24qJnNOXVU1K09jYThuYmI/ckheZ1RUSVBZP01PJS4/PDRkcUJfbzNKJkAjbG5MTjlqYldDOkc8KE5eJVgna0VPcDAvcTJzIydaWV5OZE9OMHA7LDIyLlJgKTQpUU9LRE8mYEdsQXIjTFBvajo+Yk1VTCdNYWQ+MldadWsrNz09K1VeKTJkJmFtOUQlZl1iZ242blBSLEpISScoME8iTXBWLSpqKl0vcFVXXlVHJWQ5VDZzMV1oW2dZbnBLLlVVK0ItRFdhKyoqJElmREJfZUM5VnVlZD44O1dKVyFaIT9VSyg4SFkuPkwyJ0V0MihuRTQjaHBLYkhRVCJMR0I9PSsocG9eW3MwVExYOWItR0FiXlxVVDZcSGtnWi0pNCs1SSw2P1czalknbTxvXmhhM2U7NE9BRDE4RSc+JVxVO3RrbWFcJl5bJk4mMHJaRTZbXT5gSzI/PThBZEdHXDomWWw/Q2hrJiguKHNxWEZlWDdmTHAqbE41UUVYalIiR1RgOjs6aWl1UUM8alZidTVROmQ4clFLRCZDNFdrNEgzJ0k+KSIqU1BJNCRTJCpRTWlWRVErRnQmcy1aaTVmNygiQzhBYUBfMzI2M1BYcFlBO1Q8ITthZT1ZYCQ4Zi0nYzckX1ZFSl9OK2p1NmZNaV5EYEooM0RcNm4sKW9lak9AWmY2ciVFbC1oTGNTP0UrSSRrTEUqUDhLL09DWD5YK14jZi5aSl85XjdWMiNNREVBanFlcUlyPz1KOEdRXzZPTEA+J1hdKzs9OyVdYEckM2dwc11TSmIoY15Na2U8bDYtR3JqXSFhTidzNTU6amQ+XVwkKmhpdW1yWWRuX21bLiddTWg8aSNLSTFAZTkjRjVmWllkPkI1Jil0VkxCUEtIVTF0OjJGKnVLIWVgXT1uZmtxQmg1KFFNWTZHLUVwXT1NMnQ+N0gpN1wrWklcJU1pNydaYUJfcDppKyhmb0FkYSVWQl1JSiVVJ14idCE4Q2E+am1JSTlSRCRxLz1sSUgnK1wtLjFWXFxLV0o4K3NBOUc0R0ppJDkuMFA6MF1wJCRpdTUjPFsnckwtLTo+Yj9vZEUvdEMhNGAtODArNWhcWj5EPDZKZlFJc0lpTUcpQjJNTVlhQ0c8cGg7KltbTmo7KWwpazlgKmktMGhgUShLWlJcZC1MYDZGZUYmWGRSZGlOZEdqJDNkNk8iTCpiODoqSmVSWSVzQDpHK2QqQ0RNSkgkTl9jMy4iWy4yPi9QOyFBMShVRS1DbWhNT2w8aTA8UE9dP1tCVTFRLCdQazorc0Q/OVUrWSxCTy5nVzlbUSInPnNiOG1tRW1AOjtcW0A6bSRzM2lObi5sSlRaJU5MRlRXdC1WPCFkQWIudFNUTCRGQ1M+KVtHbzojI0huclM/akAiPToiJSptXFksZW9aU00/b3VGNWxTcVJEY2dlNzs3dU1ecz9aJXEpSkwiIXA0cTBDPldZQkxwS0ZFaTdYQ2NcKHIjcU0maT89ZGcvVWFaSEVsU2h1OlVDUURjMGErKkglSlVFJGQwIVVSXk5AbFdDRDFhOXJeOGdmclQkYWchc101VV5DVDtrbypRODZXQEtZMykmPkMzRUxya3I1ZVlAPERjRVkiSl9cNjlDTHI7aHMna2Y0MUMzc0tpLixbWS5MRk8tazZqVHFgO1tnKjI5WCJFaVIoOj9dLT0lTl1pJyFRJzciaDlmO011UlomViYwW2c5XjMsOmhKaGc+Im82Zlgja2RVWUshZ2IkSlllZHREcHMnOVlLRSEuVjFkNj1idDg1TCM6QU8yQmBnWzhJNTpCKUN0MzBmO1E8W1ZCSWRAbVk4Iz1tS28oMjlnTlAvYEUiXGoyYFRaU0JsWS43SnM9OV5YJTY8aFtJJVZ0VD41QW5nYFNtTWVsUkMmL2hnOXNSb103TUVWTztEZD5BJk9lRD06cUFdNG44UmpRRkswcyJWUio1cD10bihoSlcmQ0hXJWwjIlYzSG8yRmo/PyJAQi4uaj4ySTpXRzdvTWxhSmAtUCYiWGNlJClEV3UxOzZjNGl0VjFZQnUtLU0xak9oUDo9QWlxLSdJT0s3QE1OMUVxXmA2VCFARDpFN1tnSVxQVC8tSjxdMWMicENYZ10kW1FSYS8uOlpTYSMuKVlONytLcDZUKjA/VSl1LkFZKzdBR3JZUGUyQGk5T0dNU2I9UXEtcTNWbUpnOT1WSVZqKi5nMjdxdT5taSVOdUQmZzlQTjxfWHAoSi4udCpjSz5nZlJBQmgiODtDKV1OOlk9OGNONFxQaVQ7aitJRXNSbiVCM0RZWmQ2SVhFRFlxLT0wJjBfI14tR2ZSN3A+ZGRcLDstIWBtUyd1JmBAbVpHZyQ5VGckTihTRGExXW1KLFRLRmpwLz4ibDBSPj9HNSJGPmVZVTQoV3VtZ2lkQkJyWzloa28rbHVlQUgkUmQvPGYraG5zUTJAdC1dKT5MWnJLJ2BnamFPM1hcTTFuY01HI14rQkJOQjpILDtiNU1UYTBbaihCPDI2dVI/OEAuP3FdPyleRCxqNiNHQ2BxKEh1XmNZO2c7KiMvIVdEZzJYOUY8JVJWSyQjcCRzTm0qMVg0N0RxJyVGa1pwM0NDZS5CcEdFcmElQnEtRV0nIWlKPUhOZTJEM21HLDZvUFdedElRQVtnUjQ9I1crbUUhMDgxblRHWFkpVSIpQWgpM2EsK1ZlRzJOamMzOzArW1hwI2IsKm5iYTRiQldPMVxeY3U2ZT9fZ0tFU3FcdDNadW46KjRQLUZGVyw3XUheVGJQaFZyOmphODpsVWVyVVM3Kk5nSU5QPD1sa0NdY2s6XGw3dUZKMzI5Xj49KUBfRVU1UnNzJUNXclBbSCRBQ3I7NG5dOGFpciJgT25LNS8zVXMhPm1fVWRyO2R1REQrUT9hKGEqJF4nQk07YippKUMpamxRQVhxKjdtbjghOTBJVWRZSCRAN0RGM21xTyJyVV0xQTRCdShrfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDExMiAwMDAwMCBuIAowMDAwMDAwMjE5IDAwMDAwIG4gCjAwMDAwMDAzMzEgMDAwMDAgbiAKMDAwMDAwMDQ0NiAwMDAwMCBuIAowMDAwMDAwNjM5IDAwMDAwIG4gCjAwMDAwMDA3MDcgMDAwMDAgbiAKMDAwMDAwMDk2OCAwMDAwMCBuIAowMDAwMDAxMDI3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPGI5YjA0NWU4ODAyODk3MGZmNTNhYzQ0YThiN2U5OGEzPjxiOWIwNDVlODgwMjg5NzBmZjUzYWM0NGE4YjdlOThhMz5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNyAwIFIKL1Jvb3QgNiAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjQwOTkKJSVFT0YK',
    'dairy_es': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzAwMAo+PgpzdHJlYW0KR2F1MEZELF1JUycpaykwNjZFXzxnRSJaKWg5cGE1RG9iMkhKNUFoOVMoYTthUmMiM2IscicwX1wnNGpKQ1dXbD02XyJ0RCRyXlBjPjJBSyxrdVA5KE0/blQscypacHVrZ3AuO29VLW9HZCxbOV8hWGdpcTZOLCIycF4iVilMQ1hiVzFib0lnKG1IRTNxcC0/PGlKKDNgMElQP3VNUWRlTFlcTE5aVSleQERML1QuNShvRlpMJl0yXChRc2tFVUhsOzwnQFliPicmXnNqIz1wK3FAPTlXPi5DK3QncnJZOGUhIyV1UVhRUzFSc2FtV3A2WlAqWSdkciRMYjxMPSc4ODtSVlJOWm5bXixBXmFCMT40TGtQKClcOT10R2xKN0pALFIwOVo1VkZjUzxtNUhIRjRiJFtNOkcuTEFROXVSTVltbzZUNiQmZzxMLDElVUNuQ2dBMW89SjxOb25NTUtFL2AqPi4pKjNMJkw3PEBUTS5jWz5uKF1KbkpIXltoW1xSV3EiLT1iX2xyJE9FSTtuUSpyZ1E6KypaaVNNJFs5M1ExNVhETEhJX2hnWk4zM2MvdDtqbGY/YVVORlZUQGJPM2JIU3VuU1pkOW5dSkNHdFA/SlJacGAmWWBOXzpSWVBAWV4yY1goIlxnL05GWiI3RUhwNFtgUCcrV1ZAVDlgcEZiRjZGYSU0RlswRExzNl8rSjtfQS5vTEJhUipZKzs/Kj4iJi1yZjRSTT1GaXNZJFZLXlRzR10oazNccixaL20qNzpeMlN0WVphOWlaRjcrISknJGkwOEBrOD9CWGNQJWE8QWJCUS4rUm9IPVVDNF9GJyZkYl08OmdkRS5ZTV5ccUpcck8tI000a0tZTlc+VzFXUF5jLGUxZCgmPDJrTWVUQDZsTVxccjA5VGBeLE4udC9NaVJMMlA7QVVcNFBYXUk1YGNTUXNZQkljQ2hcLWwoaydKQUJRb1NGdUBkWV0nZVlfU01eYzkrUSV1I3M4KjxuPVEpLywtM1xPJkNpLVtzOzE0QDtbWkEtPV5AJnQiTnUvODVwYjFCI0JLUTpaJ2FVZXRpZE8jLiVTKiQmYWlWQHBCL1xaODgyT3JrI01qNCJVOVxqT2k3ck5tb3RGbjBtRmdLKXNrIUQ8UWliKFQ7b0ducl5bPnBbdD9qRzlJTT85TCgrVyRIOz0zVlpySiM3bDtLaVtRbzlYN0RIPFVUMjpBMEVaTi8kKlFKSCsjYyswXkJHXnM4aChNbEZJVj8qRytWJ0taLyhdb0ptQWw3LkxTN1pccD90aHFgOmtVbEdIYTRvYHFVV1x0KiowPClEdGAuMkRMN1g1O1o0SHAvT2heKFJzck5eY2lWcG5ERVklX0ZZRl1jdVNvVz9VSFFtV10tUVBlY2srOl9pMyM/NEZEVTdySF9jP00iJDkkbCMyPEtRKERgRzJgQFhMPitsZDtaLGBeVzBcN0IlKW4taVNTYDc/Q0QpNjVXIU9wJlFccyY0Rl40dT5mRjxDJ1tLSVZDNWhDPGJNMmRWOEJGJHNBS2VCOWhqXWgqbGlWJTxUUzJxUmAxMTI4IjhTMTNoR2ZrU1EhIUBLMGNTX3M/Im50dWpZYEkxL2FZJ3BVYywsXUxMZWZFWidbNCYuKzAvcFwrYylmW1lodFZZQ2gmWjpgaDxqN0NWX0h1UHBRM1xXLGhyPWw7IV4xLSVwQHNaTklNKT1lO1lVYC1fKjolZTMmdCxwN3RnNGghSCVpMEkwWzJVR2NHXyl0OFddRXFkUiRlVzxwLWVOMWpgOmM3JjpHI3MpaFpxby9tX20yTFopcVc4QW9tKUVeb1xzSGdlSWJUaD5PVVtoQTQ7N05iLWE8Lz89YjRePCNbQyZoITs6SDNfNjxeKFg3NWY4KkwsLytzSS89LUhRLFttSWVIZC4yI1MvYUlxUSo8Z081NS1DKFNNZVxMVClFdGs/Xi1VUkhgJmJySlJbT1RSJUtLUzoxSTlrN2UsNCY7YzBMYloqUTlrbU0hOXVhRnA+JmZDdCpfZzlhWjRYL09ZcW0jQ1J1KCQkRDVRMjc2PE0hLXBGXjxAcz0kWig8MT9sQTRfKF5sO04lZC42TixWQ1J0cyonQFQkRG1vLiJQNkg5VFpUN0JVbi1jJklXTFo3YihsYVxmMi1dbmhzMEk3NCFZcmhwQzRWXGJXJypUNlU0RGdeKFVgSDMjZ0xlRUhnZjkzL0pPclNeZkZtIW1pKG5QPSsjIU1dSDNnRCdHYiFLczVVXEZYKkIiV1ZtKkIpRipgKDpWIjFOVmgwJCpfN0A6LDdZcmFLc2pRUDxVQk5pT0VQbUdbMVY9MWsuJFotTy9MOkFfRi43MCpaKTBbcW5OIWA3bzpiRydLXTsrPGBEbHVVYmhJLytYWihNXkZgRClHNUI/M1MzaUBaMDVLLUtERF1mWlxmY2RJKEcnayhOVjFcN0JcLW1wOEQoZSUpbV44OUxdMS8iT0dSNFZVJzAsUzhmI2JqVmI0QHJcWV46PVs3ajIycFhCI2tDJS11WXFRcVsjYFJnO106PVxZYm9FUy1xVUZLZE5sR1JXJzAmQltab0NrUklBSV1nN1ZSMl9FaTxMaEs0YUxiYiEvIypabEE1KCNHZSRZS04+NiJKNFZoXUZMbSRUWT5jV1RLLkkpRFBRXi0mNzQxOXUtU3JBPEBVRFdyXUZ1Ym5MX1ZWcGREYiFeV0dWLXU5QVdXQU5iaUZRLGEjOUlFL2c3UVRLS25cY0hbN2hSOzBNQz1nRG8yLlgnYC1iakI7cDxqLUVvK1MlMmMtJkI2bm1qWFYudGJbNlZXZFpiQnUwUVk0QiNyKFdeWlZvO0g3bVtIQV5GIWhMckk6TV5GQiREOjNNQVhZMy5lTkVHLWpvYCEhcFh1NkM3SlxOZ0EkXGRobDg1UDQmTi1rT2tfTGYnWkJZSDhDOjhlZF4yPD4kXl9QLDUkV2g0OV90MUtIVls1ZTRKaS9iPiMkaTshSF5AW2ImLC4/KWJzWCdmbzssIW5vNEAjb2RCbG80KS9MLjppUUwkVSEtTSoxNjJJOVg3NTxFIy4iPDU+YVdYPnQmbU9jQXBEbnIkSWhdVSM6JCZNWyUkSGpna2xTKiYxZms7SlQxSFM7P0EmXl9dPTlzaE5tSGBRX29YS3M4KiEyRyNuXz1JK01sUXMwJihQMGFEaitpXDs3LkVcZiYqNnFmOVRmUklsUEsmVF8jNyU0PiRAcmtWY0AsVURfNF47NlVcRE1AOmgzMnAzQTphXjZLaEs2PDliPU49JiFgIj9ZWClvIUgnQUYyQU5oK2ZhODxqWm9WIm5vRUxANEh0KC5iTyoxRW4lJSdvaCdVZV5PR0pncyRGV0kzbDdVVVooS3NaKm51ZmxGZnAkaClbJD8pJ2lUKmdgPjpDJWpvM0FUXVBJZHEsInVzYzJyXFE/dU5lITlcTTsyTVNTSzE8U0RUUjJXR09eVmRKRmBmQmpLUEIlTy42JV5TRFFUOytyQzpWTCVrIWwlRnVMby9IVkxYQT9taz0/JSQ/Kz1dRyhRYjVILHJFTyRqNHM9TEJwJUE/LG1hWyRMO0VyLS1YPDRtL01vPDteczl0T1wmR3JOWCpeW2RsW1xxPV87c1BURSw4VDNGQ0ZjVGcqZVdLWSRZVUNtXmRNYDRlXiZzYjRsZEVdVFc6WUIhXDs7Wk5RaHM6X2ZoYTxtKiU0PVpnb19RK3E4RFMpWjtoXzVGNDonaUFqXWthdU9ZWGQ1InJTak9fW1tDXmg1PXFySS1FOSsmJDt1Pk0xb0FuVC0kTidlPF1kUnUxWEInOC9lVCVraypAOSUkcC4hXkhrQUgsaW8xY0M/XXRuZi1UOmJra11pPXNEbl1LPU0qNW5LWU9wb0pVXF1LdWZMK2c8N08tNiVfVSE9ZEVTaFw5R1k1a3E4KEBmbCZmOlQnbz9tcHUwQjpAOiotS3VDSStmYkNuOjs8UDdycyptSmgvV34+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0NDYgMDAwMDAgbiAKMDAwMDAwMDYzOSAwMDAwMCBuIAowMDAwMDAwNzA3IDAwMDAwIG4gCjAwMDAwMDA5NjggMDAwMDAgbiAKMDAwMDAwMTAyNyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxhNzk1YTFhY2FjZTU0OTE3M2ZhY2M0YjYzMzYxMTg0ZD48YTc5NWExYWNhY2U1NDkxNzNmYWNjNGI2MzM2MTE4NGQ+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgo0MTE4CiUlRU9GCg==',
    'greenhouse_en': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzAwNAo+PgpzdHJlYW0KR2F1MEY/JCJeaig0Rk40XC5AOHBTWk0nUUojW2plUTRXQ1pAdFAwWSxpNlwlIV0mLjUrQkNhOnA9SmJNWzNQbTshNHQnWi5dKChtXlduazZwOl05Vl84Ry5lckhrZ01HWCRwaVk6MzlQaiFVTE8jVDJHY0dQaFtGJFwnUDEycDlfIzJbZ0I9LHA+Q2FIVUJwP1xFI21YUWNvXlg5UTgvUWdmdDNGKVgsJnByWVklIWRZZGljUGdMTzJBVUN0czo4YyRcI3MwSDFNKkBMRClVTjo8UzpUMExwQkNKaUk1QzV0bWI0OXRyclY2XF8iYUk7UC0lTDZTZFxKITduITJHcF84UFExRldfREBpMUpbN0Z0Ly8/JTMyPkAwNTdyUio5Xy1nOSE8bSFrcD9uYUEhOyViQVpvbyo/R2E2SjlpWj9tKTg2Lm8rMjc2Sk9rUDZnbEhmK11tazdiQiVaTUU1N1NgKD8yMm5qR0RDXkQuM0RzTXJVQTF1NkVibj0wSEw4ZHJnKlRCQSsvUClSUV5BVVtpXCkhWF48OXVhOi1BQGM3WUoxOy82Yis1RWVbT2E5VEVlVDdfbnIpbTg0R01KMHJfZUo3X0InMms6OjhiKlYmLi9ROT83UGtTWUUmP2wxISM2O25uZldAOT9qWD9aSTxYPGJwQkxSTypeaXIlNEgxbCI7ZF9rNEJlRHJkNVMmdD8jMXRsMHBpVi9DWFw6XU1nW0kjbV9qYFRuZGlbXFYoLXFpckhPY2ZMQSomLyo7bm5EPj0mcDFMNk9ZRz5pWSFnXyYsLmIhKjZLRzZlL2koLCxSQ01NO1xbW11CMldNZTVfOltsclghXmxqZzRfUjtQZnJvLS86LDY5MmI+UFJUXS1FNS9CWCEzdC8lQWFYMm4zTFNSY2g0Zz8tUytHW1pgaStMY0lUXjc/cW0tSGomJl5BWS8zJGNiL2pYQEhCTmouNiIvZ2xUJipWKitOXEM/cCRAbmkpX0k+XVRFOUs8IjwtQWZWJFZLc0ZNLDdHJExuUGVJRjRQcz5iP2tlIUxRRiQ1bHIvRj4/JEBjUFZybGI4Yk5USjYmaGk3Rk5fW1w6RU8pXlZXO1ZgMTRTOGE0NSdHQltWbkhwPjRFJ0NDbE1CWVhuPEA1Jm1HYidOKF8lcTQ+alhjb1RvSmU+Nj0qWWViRUxjIi5BYz4ubjhmMCZrTFtzLjowI2JfUllXT3RHKDFsI1UuP0EvJitBYWAjXWM2VWErJUsmcUIkclosOFM+XD83P18sLk1EPSlcU0dRXmcyNDQ9O0YyRigxTSY/T01QLjkhI2M/bEohIlxBJkIqdEVUTkNCKV1JaGkrNVdeP24mPFtgPSMvUUwoLXI+Z0wjajNZXG5EPC1kb3ROIjlNcDBVRUNca0dnPCVQXUhsO0ZQZV1VKFtFXCxjPHUpbSpJV1E/UWlvJD43SzNhclRzaCtnZ1VFTm1EKGwzXXJINytCOWZOaS81RDZBXjVUJUFzTmBybTNLSmc0XGB1PyM3Zy8kWy9HUlQ1cTdTL1EjVCE/XGwzWm0/aj5pJk4+LDQjTU9FQElGKUdDR0ZkRlwkOCYvNWgjVnIkWEZEJSttNVJeYzxHNDowYVk3QDpAcyowajRfT0dwdDZKbGdxcmddSSU1UWdfNTNXTj9tUD9kZixHOjFtNnJJKzZiQGc9LlxTNGU/YyFVa2E+XzVfaUUmNCoxX0FIPTEoUCNccjQ7YSglWE91SD9bR1BXUzByTmRiXyRMYEZeIWtwc2ZZUmctcXBPQlxLYVU7bDVqPDlQY1c6PkhYR0IyWGY+NjtOMj9acEomVmxZJSUrOyYkKz1YWVVZJCYyPDtadEMlTztTQWQ6YGlMNUYzcUgjJHM+Ny0/XjNGNTFnPTldcXNmQDY2XkJfdCVxNi8uM1BjJUphdC9APENNSiwiczxxbVBpJGszTzlaKF9vLS1oXWssRSdSYj4+aCtvVk9Ubz9NYmljMFRddGstK0FiP01IM21hRzc7PmwsVlRvTWgkJGk6I0ooIjcuWSl1SztMVGVDb0ZoQ25UXlchOV9pJCxZay0uQ04+bkxaNFU6KWduPmtpNFBaSSgwPDhQSDxYSyYuSnE7dUs4OXFRNjEjMUhybiYvXi9mbTxsNnBtbTQ3M1k8Ly0oYiYrSWhLaWJMJVZpOSlEKlIwbU9uMD8xLnMsNitpO0wmR15FWEwhazdZYXRWY11WWyUvdW83USthQzN1Ij1LSl9pIkhlcFgsbkUjTmRhJGFdUlpsUzZAXWtkLipwQWg7b10mVSc3NmZxRiVVUFQ5K0Q/WDJPYGNmYzhXajw4O0NDUV8scHRPYVVfWGVISERwOFchNiZKLj8mNmpZXUFqQmwxNWJAWjcyZkNDUTdaPW1VV2Fea15WZ0xDKC86byhdISM9LHI4PixTMjItPnBUcFgqb2Q4P2UyVlRLXjQkRC5nJWldZ1lfcygjV11yKmlAb2JNPkgjWD1WJjpSMmg0YCsnWCEzSGBAZmdYUllHMVVPbFlgOjwhUkJXOnVlSmYvMXJZIzxIIjtpN1lWS2pOJUczUm0+SkYrTSFsb3RoV3EkZy9SSy5UUVw/P3ErOCRHQUNxc0MrTURtXzsjUjVJcnRRZzBvYTlZPjdiLUs9aWZfITBPMV9nUlJBWTMoWFdIS1pFQltmLDI+LCheIkQ2WSx0VHE3W0pFIWhMOidgNWk8aF8uUWNpcCJfKiFeOzpcND9PWyUoRUwoMjshTksxanBxZEdRNCVHN1wjKDZYbWtMJjFSUms9U2BRZ0AxTylMRiRSUkcoVyNma2whQGBrM2JbRHJDZVFMNikxbl1oP2cpJ2tLR1tYYlZdcSUsTUdTKVwucUs/ZDlKQENINilAJHRbW2YqVygsQiUyYUFyJC0nTV5SNnBNZGpZMXAiZGosay5YPS0jOyVFPUhVSGIjVjJWbVY0XCcrZTdWQkZZOCIkR1BvLCs7UCdgVS1hWypQZF5gbFhmU2smUFBkLzIvbycqdT1UaigqOlM8SFFfIzsuPjVdMEdKcSpYXEBhOTNsOVtQREA8Yk5AWDkrb14uI0FIWFhzITcnPTxcZDJcYFRQTWI7PS5bPElJKkNsPW89J0A1TWdWJi5DWEprXWhGLU9gUGc/P086aVQ7Ri1YTSFvPWZiX3BuXEBTYCNyKyJoW19dMytLSjA4KWgkXk0ucEg0TTlyO20wI1EiLUFoRyZjZDBtOVx0XWt1NjIwQEhCdEldK3AjW0RhUGhUUVQ7ISYtV2RBdVVsNlZFZkBDRTROc2hyJUNjXEY8Z0lCbSEkNWtnXk40MSQqRlU3YTIkaVA4ZUl1TylrIkxuKm9rX2RFbi8+I0RCbjIiJDojLD5NYWYqblU4JUBxZW9tMktWNz4xa0RWPSo+Oz0uX1hzb0MmS0gpQzAmZSRmUCI4V3BvLnAkL2VDQDdzcDlpWT5uaCEtWl0hLGckK2xyQFprPDJTUWVJMnFvNCZZX0ZuY3RVViEzOy8jNkhpXnMnP1lSWEVCQmg1aS4lND1hL2VcOCdAYEg7O04rczBfcV88aWdvbkdhLlosIV9kSlQ3Li42KGokN1wxcUJJYVU9Pz9SWjxcN2I/L1UvbFoxSUhtWWpuc2RwUUA5X1Q3Yzg3X3M2WDJoPStSLmpLNFxqYmRgXGRGKnA8NTh0aTM4YCkyMyNsNi1FTFsvPWhfP1xrZlAzRDRUJ0EpOzJNUEY3WW9OSyklY0EwYG4sZWVqP0pzP0lbcGNGR29tSCxAcChLYmBRSmw8TjktM0A0VUlbVVAwIWVZdFNfV1A9PSVcQDsrJC4sTVRSUWhsRV1dL1NUVUpzI0FBWzkiVzdOXWlta2o0ZTddQVdLJldoKm1wSCkkVyhyODsjNFgyJjEmZjNoX1lhQ0RtdEY4NVlQcik5bmUmdXBaNVspSytFXiopW1ZCJi1kcV5BTy01aV5EMVdbUFhtNi0+PGs6Jj0qOl4sUjxpJHJ0clcsLFF+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDEwCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDQ2IDAwMDAwIG4gCjAwMDAwMDA2MzkgMDAwMDAgbiAKMDAwMDAwMDcwNyAwMDAwMCBuIAowMDAwMDAwOTY4IDAwMDAwIG4gCjAwMDAwMDEwMjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8NzhmYzIxYTRiMGVkMWM0NGVlNzkzYjRlZWI5ZWRmMjE+PDc4ZmMyMWE0YjBlZDFjNDRlZTc5M2I0ZWViOWVkZjIxPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA3IDAgUgovUm9vdCA2IDAgUgovU2l6ZSAxMAo+PgpzdGFydHhyZWYKNDEyMgolJUVPRgo=',
    'greenhouse_es': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjk4NQo+PgpzdHJlYW0KR2F1MEY/JCJjLyZxME1YZkVfL3JELyxjXzJxWSVPYikycjM5Q2JWb0RsL143N1VnMVcsZ2hzQz5qKCMlImkhSUpVYS8kPFNCM0gzSi1HWTpaZSxGUF84LjRecmp1ODdyJyNtQzU+bi1fazIxW3IsJSxqLUtEPl1NJEBoJmpNYlZvKV0qb0IzTT9FWUlpSVglREVRTmI7L3QiNT8wWW8zaTc8OW5HZiJtVTxtOyRNa1B1MTNXOzZGb0s+QVolZlhqXF5SQCk+WnEpLkYpUktGTVYvJSpoKlZTR082KG1HMUhrXW9pJ2JvP1QsaiRnJk9JUVtFcXFOb1VoPCVuKjNvNjtvIjExRlpRT1kwM2NuJTc7WTYlUXQyYEQ2V19CKThLVm5gIi9QaT5fMlhSb0FMKHAiViFFOjYrbGBTNW9ebktCQWZZaUZjTlZXOzQiZkhgUG1ZX2lvRnVAKiJEY0kodTBeZUY3NnFRJSlfVFdLQl8lIypfW3IzQXNFUmYlXiw6I20hSk1CRyFERz5KMm9oL1k9QEBXcU5LVSpzMmpUTitWSz5yVzBFZHNkPTZ0aWhWKkkpK2NDIz5STE5VJHFqQFsyVU0ncm1FTzopKDZMUUhyQUlfNWBUVTlsNiMwSUIvPGJLQGVYSUstZFVxb0pKTz8ydUNgRmxPQidGXSxMQHJTLW0xJzp1ODthQjdFLlJCZEtFKEVJZ2ttWjlNXG89ODdpQCE+VERfQ0NMSW9nS2hKYTI2PyJnX15JJEBVOSMrLU5rYCsjUHRnSys9LVU3LWZQJmhKQFlWSnRmKV1jai1dVkA4dHFwKSx1NVwpTTpAJWtRVkRWVHBgWlE9aEozQUZfIjdHLDY2biYxKTNOOWpfaD0vVUo4cCoxbmMlWmFCUEZqWE0zdG07MnBHYTYkIVcqRCthT1lVRGs9O19EVVksOCozKS4nMFlXUj1eKWJTcCpnKkZlXkY4REVKLV1OJFEySTtCOG1lcCRvSGA/XCxyNjhhKldkKTMuZGUsMTYiUi9BYThQMzhrLGtQS2JxYkBEJmRIMkJFJkV1VVhGUkdpWV1RNEcvXCUkMUFKMDxjNG48PEoyPy5vUz5LI1trbVRaWmtEaTFiOGBdOWlfLkZZRkIlO0pUWSRJXCpRITZrJlpPR0habUlVVkE9ZHM/WipMNHBeRkdHPyVoIWo6QzxFREZPPVY3RS5PMFdBKStpJyZrW0xVWDxOV3VpK1g9TktPOyVnQD9OJzJBTiooSipyXDdyaC1PQzEoXk1xcTtDcWxgQSZSWE5pQUBmQVs6ZUYjPEQkUUlVSmwhdFMraEpOO2xmIjdNSTRoKVBgcEx1RCVyQTc7dT4nQVFJOGteZmopYjYwVzRlN1tDaE0iIyNFaCZsSFI4Xz80bSMmMlZZOjVmQj8nQzJnLUknbyxxZUxbaz5tdXAva08kXz47Zy5GciQtTEJFbS81RG1tU3JFb2toXHVTNi44ZjxeOi4tKT9qXzgtQDMwOjVgaWonVlZGNEtWYTBlZG8kNHJjZ0FyMGFWKis/PHNsXlVrLzNuI1FKVnAoXFlGImNPJypyPExzL1ZDbCdBTUJWdVpkK0JnMlMzLCVmYV5wJU44WkRhaF8lMGQ+Tm5CJzJAJkEqXDMwaU4jL05kKGRmLFQpQV4mImkocVpVMWImTnIzN15iIjosSThtdCs4QkMpMHRIZURWVDw2WjA/OUFbYl0rMjBeUDZtLSFfWFtsY0ZdMVdERTUjdGUtV0Y4XkkhKVgvNDZIYmVoTz48V0NxLT9gakhYZD9gRD1qL11PW0lhdHMqRj4vXV1TLCQoT3I8Q1w2Nlk9M2dQcVxvczRWSVFFQzk6KWdKKVgxXkFsNWt1QCFTIypIPmhIa2dDMDgyR19tN2RybHEjJD5VK3U9IiVoXEgvRlYkMm1naSUuTGg4NVc4XFJgcUspVjhHMytvVkxJTW51ZjhgOl5LanE+MkddOSp0M00sZzZXJi1eW2ArQmIjTHRRWjtYM0Q4THU7PzE1X0JcUChJdWAlRk5WciNaM3RgU2RoI2EvOjkxNiJNQmJILTE+bThkaClZWUMobFhyUFcnc1JNcUxrMkcuY2ldKCI8SUJkdCVoIilVQTQpQzJyRigpblhqbSlRV1A2NHVFSTJSKCFTTDxuNl4vQWlgKEY0XzNRcSU7XzQqLEg/QnJNOk9bYS9rSnA8dFpLb0A7UiVLU01WIk9OJF9AQlxPKElHcTU7aGI/P2xgWSNERTEzMUslT2lVclE0QWRPblgmM109SDhLcTM6Nk9TMUU5a11GQy9tUVIoYlk1cj08TFBValQ6ZylLNGNvNHBaYTZGRnBiXU9uYSNbSEhSMUIjPmlISXM8N2BhNWpaVWdSPCVFYXU8XWNWQTdHX25nUl1fPUIvW2tZOTJeN1cuPzJTWiJxRDlddE1OT0ROdDVAXzdRc1BfIVpiUFhJO3FKN2VEIm8hLyFPcGFfNjxzLWM+cUhVNVpNLToxUmg/Im46WFw/U1AhXy5GVzNrRlBtM1FXX2gtMy00MEUsNEYndFJTdHI+U01jb0YrdEJbJipPLGYzOTw7TS5kYklQJUlnaj5fMWk3ckwrQUQqYTBqKlxkXVAxWmE1PT82SF5hXDcvV0E9JCc+PTombkxNMUhqP0heIjBEUnNCJEdNKT50InJJamE9Rz8oPVlkR1JKRyRjazluZjxBRCMvNzVhWD9yWmFTZkJiW0ZQU2xHUUYnR2NPW1RQUigwUGxQKiJnQ2BtYEJsZikxOUIsQFRoLSJIN0A0P05ZR0tWTjo1cS4pZE1aYEA2X1tFXylQV08nLiNlKmZ1PzNuTC1EXD5fL25BUU1uTGIoQzxyL24+XyM3STRMKW1fZW5iTGNmKUJrJTZHXi09SlwvIz45JFtxcTE7LUErQ0lsUW9GVysvUmQnXHJaM2hoUG46KTUkb1tNN0pGSFZmaXBqVE88T2s0US5DTzBRW1g6bU5TQj5XSEY5T2RyMm5xNDkpSShsPDJCYi1TLjdUSFoqbUNEOlx1bipyLCYvJGM9IVVQYE5oSmwxYj1cOGZmZk09J2owSyg3cGRcISpENDJhRkAsTXJZJTVmdDZcTmc2NlkqMipqZ2RSVTUla285XiZjQj8mZjlHSFI3dUVrLUFNa1REJGpmKyZFZV4kQ15HUiJIZkFJWjlOOy1HTihnOk0pMWVvRyEtITxoRkxWOy9aRWw7T0o7YFU4Ny1mNlJ1SjM/LkY+UGhWaF1dRVQrUnIuZE1uTydJMWhwTyJmUDhJKzdwT19wTWFMRmNYXSNfanBTJCI6KDUzNTosNk5AJFpYSmQrUl1dS0R0aSpAJSU7M2huXChfXzxXVkUnKlFSYGFyInArXVYpNy1DIiFOZDtGSTNgPVJMIURtK2kuYV9jXyZOO0ErMGclKGUnZ24nMEBPaFtlMDtUVls6LGtdJzshPVhpJlxHXEUtazlObmVQTmhddGY/XD1adDtkLVFtUzZUdCImNDxSOGNKc0VkZXJMI1pcR1VwcmUkayVFSkteKzxZK09dZSpAO0E0PWQhYGRiWF9zSTFPM1w0KD1aSDgsO2dSPGZNQU5cP2VtIktANDJWZ0U6RWMyRTk/VWlFOSNcb1smVyJZWSRWZClENz9uMj4wdDhlamVhK1tWKzFJXShwL0QuP05rRC5vbVJtMGgvL3BzQWFwYjphak9zWkhyIytyKFhXdWkwY1EjSygmU0dPZDtKZ2VoQVQ+V0tuJTtPWG0oQSFOK2ckXVAuQEQicmoqKUByKkE8M0hhJytHU1pDPCMpbWBFWWEkMy1mTTo1Y2BdOGxRbiJCdGhRYkhpOUFOVm8tMDtdZE0pbXFaOGlddXJkJTteLldrKzpoJUFjSmVBNW47Q2c/LHViRThCVEg7QkhwT1MsRDttXUFJSkxFZUxfSWFuWnREQWMwaEhfWkpaLlNhOzktU25yckVgN2g4MH4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0NDYgMDAwMDAgbiAKMDAwMDAwMDYzOSAwMDAwMCBuIAowMDAwMDAwNzA3IDAwMDAwIG4gCjAwMDAwMDA5NjggMDAwMDAgbiAKMDAwMDAwMTAyNyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzw4N2IwMGExODExYjFmYmY1MzI0ODgzZThkYmQ4MzM4MT48ODdiMDBhMTgxMWIxZmJmNTMyNDg4M2U4ZGJkODMzODE+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgo0MTAzCiUlRU9GCg==',
    'salad_en': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzAzOQo+PgpzdHJlYW0KR2F1MEY+QkFMaCg0T1Q1MyJPXUFTXHVyQUhZXTQ9JjhZOl1MLChgVFdPc1clRCFfTWg2Jy5LMG9tPThTT29aZkNYQ0FlSFpLXVFzbzZvZlUsMmhLP1oraWUtSkcyRVVHPjxaYihmI1UjTzJKMTBtR1RTbihPal4hP0hxaDUnaTl1T0JIRyJOYnElLGxQUi5POEI3Xj0tNE5cT01XWWQ/Skc4IydZU2N0P0xuPGN1UThcYyElbkVLZGduTUpsajciS0EnJl8zSzBRM1tfV3IiUCpBY21cYClyblk1c2txb1EzP2JaRkpfdUlVQ05MPnFPOjdJTE06WmAlMTY6bj1WJERmLVghYV5EbyQrNDhXLkk+S1RfYVFEO3ArMlppWF5KQlUoPTxpMTs2JDlSOldMWFUiVDw8Mz0kNCtMaE8rSDhYXWp0XCw+Xyx0OiUwIlRtYVxsaF9XVSg+JnE6QUYyYUk9ayFVXzZLNWRybG5ebj51LykwWiJ0OlEjMkdYdFQ6Sl8uQzYqJWMsRVVdPS1gLTZsQ1E8SlglYXVTJl5NJnEiWCc0ZFY1dV48Vi4tYiVbcUAuVklSLSdWb3NpT2tmY05RUkxLKGRRZGs1JCFGWmxwaDFVOE5rWnNYQD5eNSVDN2xmLG1EZ0VMQz5BYFJfPjlCPU5TYTIyVjBmOD1kQ0hTW1YhZUk5Oks5SEQyayInb09yNVdxL181QU4mREAiK0hTXGtxcl5VXFQjKEIoZVhmK2EjalNlRHQtZ1QuT2FAUCdvayJlRjRlJlU0Pyk5XS1NQi5XNSw7bHRuTU8ob19yNTVwMVxuQm5tbk0yVywzT1VabScmInA7UC9TQSM9WlQhPCFIQVZEbEImbD0lXFlhYXUjWFJUOEdfQDYwaDtrP2RwTTlxYi5FQjtpPi9zZHQvTDo7bz9kVD0jdUo4MklvW3FhPi8hLjlvXWMxWHJjYDZJWjA6YnRsV1pgOEc2TFEhQiFpYE9RcGQucSchbEBNYCdabSZtPEVzQ1NTP0d1a0M2RGZeciEjaGVgb0ZMU0BmYUE0Skx1OEQnVUJwWTwlRis7JStFUGw6KSZnSHRObDZsM0BZXi1DJi8tKzJfaWN0R2EkaGcoOClqcTJLWkEkUiwoazo8aScnYVtkI0JGIyRgcVFjbzQ6QlxLUlxsQWlLIidMKy0mKjImbTJBT1I0IykuU2AyWVdQXydaJzhOMklYWFhFQFtSVU51WklQTFByRzxOU1llOmgmYDBjTWs2ZF9qVSY0Ojc4WmAyImQuTk9sS28rME49Zkc0QF0mWV0rJmg2LT5GLzVJJC1zJDJUKGRndTo5KyVWP0VJME44T1RlYTBfXl0/T2RRYG9UKzJCIi5SOklZNzxsXGVTLVMpa2wpSClSaC9EcE40MVBvLXAlY0VKaTJlUzMjdXBoXSxzalVbLkwzbGMwQWVUZDEsYG81R0JrblI7WyNtVicpNCk6ZGo8ayVxSTcnLFJtR1EiR3MxO2BLJ1ZfMlVsOihyOWYoPnAjKzZDLCgxKS9vViVPSUxQXSdDRDxxYD1ZSl5NJXVmZzJWSXNfbS0jMDhbXC1eblovWXJiJ0I7TltTVmIkMWhNWzV0bkldY0NkITE1LD1eYGFtUGEwJmdaSnBFRl9NZVNQKDJaJjNPRkk+UT81L0pfbFU/cFxxPmNqV1cjMCh1OkxjJEI5cVstdVthNltGTS5lXDNAYEw2MmwyNkNcRi82PTA3SGZbVlQ4KjoqP21nOV40b1EiZktjLldIdUMocCpFKVUlLTlyS0gwWUJmV2okPCIkQG1IKVtpaGdfYUVPSkRDLG1cRTRhRGBhLm03W1RLIV9xTEw2TDxjZzopTEZsWiNCJCU/Y0E2RypCOT81RnQzNTpCRUZJOyZoIU00NigpQHAxNmk1Ty01ZiszLDIyVzcvcFo4ZypuNzs5bz0tPCYyJ05pVkByS1JPUVooM2lPUWo0ZHBuRFNGZT4vU1tlYj1JUTEkOUU1JV0oNWwsU0wvJ0k6RysoXydkXCdgOyMwZSxmMDNAMVpnMVs8c0pkS1MoWWJjUydTamNlUUdkQVUwbl8zTGNRS0dydEkyP1xiJD1jN0Y0OU9qQTpxTVNwTV5yZWxQckoxUm07KjNxJG0rdEdpSWdHMl9CYi8pMG9YIj1rZVR1WC9YJlUtNUptNCdeOTpxLzo4ZD1uKlV0IW1MYC0rXVBOPVZeSzpiJ1hyIzt0QXFjUGx0Nlk+V1ZkLkMjVSVaPkZuLUNLJ19bQk4vXillVkdPPVtyJ0o2ZVEiKGM0cSohVEEicWJxPmJqP3AuXVZcbCE0ZjBLPTRjL1lWSydlN0FAQXNScGAuXSppZ19IZEU3TDYtLms1SCdVJyMmLkI2KD5eKV8wJlhiOSwhMF4yMVpUPWdoKWdmTVFuYChDQC4kQi4nWDUnO1InZiw4MCVPVEhtYWY8WGY6TFJrS2tULCpBJVJIP1xWO2RaOzhaaDpsT0habihPXilTX2pGNiovQ2w9TS1XXGlUP04vO3VSWTdTKzw+WkkxQSZsK0VgW1VIVEkzJ19UWSpsX0hxNDhNalZoNUdEWmwlcWxNdT1HN2FQMVNiJS9kLWkvUkZbSUNHWyJDQW9nKFRhaUA+b1BcTkIiOWxpaDByWFFtPkpHSC9Ja1dHSWdqVSJnRD5IVlZPXFQ+aEAuODdaXTleTURgK0FkaVZFa2hyQWVrLWRyRiVNIklZN1gtLCN0R3JnWTluVWZGMy9BZyhJPWsscSouPERbaEU1aFVuVC1qPiVJa1RpO0JmJyUxbjc1bjQxJ2g0UT9MNDFjaCRgRUZMM20+ZFolT3BqO2JFPCMuNS11OlJNXFJGY0tVTzZCcU0jQT4rUEEwbFlDPzppQUFWQWNgJltpOCpFYkJINTFLMDluU1RWRXMpIlJsJzRZPiJcJFhYIjYkc0IuNUpKMWReXVtqTCtFNDdvMm5MLENvP2NWTlsxNXJWXXVkWUQpYC83JzFGVk1HX3VXIk5oa3MnWigtPUViJF4yU0gnMy1zXilra0YmZ05bNzpbdD5vXz9eP3M0WDpWdUBLOCtmLjlVK0g6J1RCbDRwYV5vQDdPXjVwU2lRImFuS2ItPksjSygyS3U1VU9qb1VMZF5JJyRJZnJLaUtdZmgmTE1pVUpEKTl1S1YpNmQ+IT0yImZdKDt1SmVZUFpgbFNESm1vL29aI2ZAR1Q6VnRQbVVtRHRmXy5LPmZWY3BhXFQnTi5TVylNdGt1OjlNJTU7YDNOOW9sKUJWXG0qcGEqWUVXaClpSU88VDRSJHFzIUA8Mj1FXFJzTGJTRlMjR206Y1VrOSsvQTUvdUNPVVZiIjpIMkJCTjtHIVlBYVJxWG9tREgzX0A0ViVCWzclcUhYajZaUCZzPGpyb1ZyPD5QbWw8UnQsaywqc0dXUzFcUjtGaGRdQ1AjRklSdGZQcWU5aGc0bDUxSjRfOTBYZmdJZyFZXlRXMDFFP2s7VmNkUzJYWkNESi9gZVwkTnJhaHQmUyJkQEEpISUlRl5KM2w8MTVBc3NAZFE9NXJNYU1gMW9QXTBGLCRyXTAtSyYhZGswaWlIO15faVVEP1EqckYyZ1YkKElARGZOWVJmMnNdSipLVj0qNi5bQmg9XVpEPDBmNS9YPkBhaVRZZCVTOFhZKGNSdCtLR2NoJXFBQWhbZihaM0M9MCNJRTQlYkVSXW5EciRIL3FUNixbc2g0J29MJj0oLG1WVkFNTVhvbDcuO0E+Wjc1ZGU+YmkqIzkvPGs2QzlKNj8lYzFcWDkkYS9hYipuKGxyISVkcVxbW0ZXJ1AjUT5nbyNlSSNdR1EzWmF1Z1pfMS8/MEElOWIiYWRtXytrPy1hcGhAVjlrXkFmYzA5Oj4obmZBJ0IkLmtnPlBiYz02OGlTdTBMSDRmSllYJTo0bSl0LEdOVWInWG8tNj9FQmZdR2dVX2o8VUdYZTYtRkFIUCksSyxVVjc2ZFdfPmVwTWA7cDNTTSoiaVpWIlRjJVFANW9RLCFhUHNQPihyMzNQIUgrSVQ8V34+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0NDYgMDAwMDAgbiAKMDAwMDAwMDYzOSAwMDAwMCBuIAowMDAwMDAwNzA3IDAwMDAwIG4gCjAwMDAwMDA5NjggMDAwMDAgbiAKMDAwMDAwMTAyNyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzw2MjU0YzM0ODVkMzNjNmNkNGQ3MmZjNDBkN2VlMDQ3OT48NjI1NGMzNDg1ZDMzYzZjZDRkNzJmYzQwZDdlZTA0Nzk+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgo0MTU3CiUlRU9GCg==',
    'salad_es': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzA1OQo+PgpzdHJlYW0KR2F1MEY+QmVpQSZVcj84UWo6KnVZcEM2NmA/SiozLjlMIkdNKDEwXWxmL2VLS09qLypLRUA8c2dnQXNsPmxaJnMhMk87XG5rInBWWU9kMiJtKitmL0U6Sl5OSidPPlttakBQdDRUUmxYRVguN1oqJHRhbi1ZTjRobjBiaDQ+RkRAWzpJL0hiLztDZGdCOScjQCcrPmwrIlNGYzdQVl4xaFU6SzQ7RyMyYXNrIzNKP0A0cSdyIUNxK2RWN1khaztlKi1YJEMnaWs7PD1iVCdrJTMtbXQrQ0okQ0FKW0lmcmlKcmwnJExuYCk4VnEjX3RJRmRJSnM4cnIkcDEqPVJMVCZecnFfWGYwLiI8OEwiLWJQbkFWKGI4dFBQJDgvN1BLbEg+ZkdCRVUtQkcqZ2kiRzQ5Vzg5VW5mYUdqby8pQyEtYD5sQV9uKXUpVFN0ajgkJVxUKUIjW1xtM1c3RzgrTG1qRUUjSE04cF5nWz9KXCQ9NVM1RlM0ZkFYdG4lLS05QzVPIVkpREMvZmZNcjtAZiZVYGVMInUpVj8jRyMhYitSIldGb1pbSDRxXmY5WzdaV1ZVLzciUT9hLGVWaSo1TUcuU1xuSG5EQkkvdF5SQC9FQ003NDBVdFhsTiY+ayErLk5BJ3M/IlpSKU5Ncmk7PVc8K0lbbTpQLDJAQElYS1hbYDhqZzVpbFkhcTpePl9QNz9IPCZsT28zaUdmbjhqaEg1WV4xcFBpMS4qZ3QvPzFiayw8S2c1aUReb1VwXiRjRiFmNygjS0I5XCc3cE9LR11zW0xaWG9VMjJIMmNSU3ImWls2OHNIYGZtJmZMU0NWY2QwQDtiWSwjY2g0S0RqOlBYN0FrQkVqSTI2YGR0WTxCUiYrY0glJkxVcWVROmlFLltraXFbYVU5QEIpZjpXJTQ/VUo0KCNoP1MwXkxxXVJzLmNCRUhucWxNNFZRRnInPFBoImQ8cylfYXE9Sz9DYVJObTAqTklLTlI0Tj1SYkpNZ2VjZ2RxZ2AnYlQnKVxYXT45TFclKC42SiEqIkk/QUFwbVBldCRMdC05LG51Q0ZsP2gpbDddVSdgciVENWppcTNabjd0Y0FEaVtEXENFbEhfQi85KDxwMVc8MzJpKDJxVW86KVZRNDU+WWNqP1E/Oj5ZIV0jJHBHcy4jLjU+KjhnKVIuNCVxVFRfQW1PKD1jLVxFXUw2cXNZVi9vcSZhaCpKX25Rc0tyOmpeRidrZS5eXDEpUGQ3KHAsQkEnL210UVBCXTdhNU9OWW9JTGg+SlNzTCE4YHFPU2QvXV9tTmZwMDhiWydPTnFbZEQmcDkkOG1MZ0RaJiwsPlk7Zzo6UDY2J1BdOVNZNmkuSElJRio7dFo3a3ImLE9TMEZHJz47Il89LURvTWdkJG4/RVxXKFNvYWVjJk9acD9SNVdvLklzTSxOKjxKOjgtTT01XT5OLj4/QnEzR0lRYUYhKG5mKFBONSRhKUlvKistPGVwT25MNUFTQVoma0doUDpeYVthQ2kyOEU4Y0ZSYlgwc24/STtmbVdRQ01HLUFlL2BEc2BZUz8mQVRUKnM5JjUjaHRmLyg7TFpWL2EiL2ZYNV1rNiRjUzxrYzpkRlByMTVTSi83dXNWamlCK0lwIVR1bl8xO2hvQlhaRkk9JTJAN0VdV2hzMSsraiZXIz1RKEIiaUlocC5FayIkNHJgQy47Jk42bF1oVDxudGE+VyVmYzZIbVFiQmxhZSpyWEthPEgtPlwxbTZdT18hNj9NTlVPYlVPaFJqcFFaK3MnX3FoYXUnJDpzKHAtP2dPKj1NZE4lNVgvc3BBNnFeYz1BY2k7Y3JnVUpgJC9CcD49I2JFVWtTP05BZU5MTF9mSC4uYHBUVTdOQm1RKUFTbjFFPFFCbkYxbUxsaz9CU0BMLCdVWCokRzxYaDVnakledShJS18wNGw0MDFLSERSU0VMTkNkLjsuJWpTRltsYTNrZSpTXXRkYDZfSlFtIV5cS20pYz1fTCM3LUViTDZQSnFBY3AmIlkwZlpSSWtRRiZUZStDalY0Z1UxQGJqbihkMT0rQyxFLTdLbnFOUV5uME0jNWFbJyEhO0loWyEqUzkyRGJkIzRVbjpONTozZlcmOSpMWHNhOWcqc1w/Ll8kOjZGKCxNM1lNaWNvN1ttb0UlSis3c1knInQtUWdyUFlKUGopOi9pTkszQ1xTWWc/bjVAInBZLUYxOSxIPm9dSzFnTlxtMi0oQUZnZytVQlA3XEYtRz9JM3I4YWElcD9KOEJCZDluXVouPCEpYFlsTCVrVkNwbGlldE8hcC9ENiZCWklTPl9pQC1CdUMjI0wjSGwuJEA7WzA5a1tIMWJVITBOJTFiaDdRVDIzKUBWJiFIZy9gLEc/KVZwXE5pbyNwPFNLRVsnSWMnYG1aTycjPVI0TTFOTiFUUmRfTVsnWVskYU43J1xESlRoJlA6bzcxaShlYCNua0opMS04YlpwY1s6bVg3O2ledCpbbzg8Ql5uYkdXLUN1W0hzUHNZYCZSQ2IkZFI3KF9QN0VGSG8oPFErakJoNHRzLmhQQS4nPHFwNSlGKjovJERkSilRQmNdaUciUTVlL2IqKyU5QitKUU07U0N0Z2pRUS5VakIuQyVkSHVQSTMhQnQkUVhNailYODtdN2E5LmNOJnVFQjNPQyRuVFFNOEgxXzRXbEtFR2MxOWFjJDBePjlGJCxTImtXPm91S3VraiohIlwyMzgkaV0wdVstZyQqJ1EzPltXMDFnSlYvPSk6RzhcSEYoK3RdNChWaylsRSomYzFPJ0A2czcwSHFKaEZhNWlXYyQtc0YyNlJUQ1NlbjNXQzdEcztAVUVYQUZSIVgkRzpVQ15GaTUrbEk6VCkpQEVlVXRZOTJXbnFAMXROOjhMPiFOaVVqRGE2SlU4U0BPW0BZLE0iTGMwTE42QUwxLC0lPSFodGEua0ouVEYjOFxVIyh1T1I0Wmk8YE08KWEjYGEkVl9WQDhkZCYjZm9cb11CUUhQTW1hNCFLSkc9NjROIjckLj85XkM5RiYuW1k2JTtjIT1pXT9ePS9GcExQVyYmISJLKkkqMUNTajlgTmd1L0wwNHUlR0FBdCdXaVk2S15lVlgoVitIVEhVMDklMFY/RXNgclI2UjozXU4mN0FPalc2XSFoO1MwSGpJbj8+Q1diXXErQTFsQ0JnRWk5VnFfa0JMWy5pXyVTQiQicSJ1VDEwWkUuZSFjamNib1BVKVs0dTNeMTgrYCo2aWpqVidqTSFwaltyN245JWBdSW5TXUZCKEVHWW9zbzlGVk0jSHM2OGhXPWMxMygsSi1YVyEkTXI8TidoNFlEZzBrJSNWc0FqckZuTjc/WUE9PGZRZ1NvakdPYzZBLHU2WWtFLlc6OmxybGAiWU4sY3VkIT5DRDEvMmdQP0giRytCJjY6RiRySickKi0oP3MpSVRXYVg9cTBjLFBMQFtKYTh0MF1XTHA4aztdOSY4JTJQSyQpXFtkQFdBVWNIVDI0X29na1IxJ21WVUVfbTdfcldoVC84WHBaOiIkb3FEW0crMFw/bU5SamI2RClUbmpvUDJVKjxiRXEsbnFkbjI3MEJcYXFNYnQnPGJOJWclXF5uIiVGIlk0ajowKmAtWD5kKlxwMmMpJF9fUEFtOjtiWW1PMVtxY1RXY0pAZj8tYytyQVYlU1gzJjBDLlhDXTdmaSVwODMtXGFMKihTYGU+WGQ+ST4jUk1tSipBQS5rYFZDSDcnLWFaUmpWKkdQNWZvKChcJ09pYCxNLUcyZCxdX10xSz5gYnFpPEoyMFRYWCVJYyo/Vjw/M2A8dT0xU2k5cj9wXCFzUTQvRmhBXjc7WHFyJGpyZidOYjxxRl5VMWdBUWduUm0+dDksNXFIX0xSUk9vU1pQbGJaTGRxIjlgUzJnREtbXlE2N0lKYWlEKEppWjFqNVppYjo7dVpQOlNeYWtPRkBybC1sNCQiOFEpX01qMC5yQWNqUnRXImhOMWtXcDAka09jRD9jaThOWWQwMUE2NS4oMUI7TU5KOmpLSiwibE9pP2NtJTFkK08jRFo3Q2lXfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDExMiAwMDAwMCBuIAowMDAwMDAwMjE5IDAwMDAwIG4gCjAwMDAwMDAzMzEgMDAwMDAgbiAKMDAwMDAwMDQ0NiAwMDAwMCBuIAowMDAwMDAwNjM5IDAwMDAwIG4gCjAwMDAwMDA3MDcgMDAwMDAgbiAKMDAwMDAwMDk2OCAwMDAwMCBuIAowMDAwMDAxMDI3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDRmZWIwYjFkZjk2NzdiOWE2ZTVmMzE1MGRmODg5NDI5Pjw0ZmViMGIxZGY5Njc3YjlhNmU1ZjMxNTBkZjg4OTQyOT5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNyAwIFIKL1Jvb3QgNiAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjQxNzcKJSVFT0YK',
    'processor_en': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzAxMQo+PgpzdHJlYW0KR2F1MEY+QkFMaiZxODAxa19KTig0WF1xa0YhJHNOLG01VUYwdWVvZC9sZDFaNis1SDhhOVArQnA9RjYvTiRKS3BKQSY4VVo7a002VmwuOzVIYitQbCtpJiRdSVpJQlclbXRTazdZKjwzaD5lOVlfIWk9KV9gLj9EcjE7ZltSQ1QiUEE+IW5nNEZydGRoQExVUDpmLz46cnJgT14oMUcjJGQ4QzY3aE5ZbltfbW5iZVM0YVYpK0E/YXNwJWlxLzM4LyliSi1pN2cxVzQqRktFR25tJGRNIVU8Jz5xYltRWS8zVm5MWmpEbmozWmhfPXVHOis4KTZYSkNyVjY0ZjhfJCchWVNjKGtWcktIWypnbWd1VXMnRSdmNlA8IV9zYW8kO2NkOyJkay5LIVJJX2NgOmJpR3ROTFAvVWxjXUE2ZV0hPWJRJWZxJ2NMY0FAanMlSDVsUT9PYnQ3Y3U0LSZXLWUlQF46JmNlIU9WYU8wRU4kZiIpcVBCIVNaXy1lY2dNQWhTJixAalpoJ3BkMT9OXERJV200I1RRMSs2RG10NjQuaSU/blxZR0hBU0pcZTA2ckFXVTZgOixWZzVfYDVDcjY9NytRSjRNbldaT2JTaGxnXnQ5dDlbXj1uJjQ9KUZSJERkQzg0NnVXKlkkI1tLI3BZRXE4cyw0aF4iWS0+NVQ/bTA2N247cScpQFNUKTkmTWs0TGI3SGdlSGMpTENaU15ZcCtcIllFVCs9am1zMVw0WSlmYzViMHUtO0s/TC0kNmE5cGVcUU9eJDxOUUpsdS8mWyosLEhlUlNcU2lhcGdkM0QnMmdxJCNPJ0ktZSY4XUkrNy1eT2soZ1dfTzFHQ1IhPk1IQXBIS0JrO2tLM0U2QzxTOUdCOGVhYG9oZy1lVzs8XCYnMls9K3FMYzpkTW1VSVl1aUNfSEAhQz1eXUpiYmgsPi9ZMnNaMDpDYWYvUSZeV1osOk4rYmk0KFZfQClhKzs6KF1yMW46RWprQmJKYWA3J2gkNDsoYDZhKyswRU5QN1tqOmBCU0BmaVlhQD1BYl5ZPkBqcDlnMCc/PSxkLnVrJT5gTCEmN2o+dTVGW04tRSRvZDNjVUQ4OCYiPHJFU0czYmgoQGFLOUovLV5Ua0EyZl1kJDg6cDFDWFpvVypMNEkhUy46JDJFOzRDQmJMK1xRYGk/c2NoLi1wcyhuX3FPJHJjR1VNQWlAZV8pUSQsMWFwRTxxQTcmcTssY1w0S1knJVk4J0JHckZlXWleLj05LEJUQkJKIVg2WSQmVDtUNVMhdUAoMD4zMF5NKS4hWkpHU0VeOkFSazkyOzxuVDJTSXI1NWtPIz5BZiElQGVFaDBWRVs2TjxKX0VmOGNDRzZcajxUJ01DNCgnY0ZaUjxSYzdvXzZUNFRob01lb25nKmdAImc3Njsvby84KnFpSzlyPSwlIl9jcSxbdDNxZzw9V3JsQiQ5YydKcCtUREc+QWhDRTxTUUIsQENTQiNPOy8xOU4wLilyYi9cIWE3KC5hLWg3JD44Tz1TUWQvJz5uUThYLWVBP0BWRllpaUpROUJDS1IjP0lZJEc3ITs4IjlDZEJyKiNUUG07SlcwLmlpKiZwNjVvLilkJWRtXmtnRWAzXEFoPUNsV2VeP1o2cltoaUhnSnFTJCdGaTxJLi5IN1ozSzRvMzQjanRfaihbQztBKC1VQTsjLGhoNltNLlU0JG8iZiFMJEVqaFxTSXVfMTkiODgwMyEtaEoiRlI/IkVdQktGN0ldPEQhYV43aCJDQytVO2Y9RVROQCtbIkNePk0qQCNLMGFFbldMV1YuZGhTIVNDOjAlRXJeIyYlZixuUjRHPlxQdVUyU1g/OSkjajghTm48USNUZmxRQk44cC9dQVYmTUhUJVZrUCxcXVRnXjs0TzBBVmJGRF45YzdCb1RqcyYuOC0rPlU2Oj8sSWVbLml1R1lhKSVkJkNZRC1mTVg+J1k1ckdnPm04JjtJQDdqb1FbLl05XUhMWUU3My5eaGB0N0BjNEBZWmRcJT5CLUoidDddTEc0XjdFW2IxbD0yO0VeKmleLWclcXM5VHEpLmZJMTthLGNJPlw5Si9iMkpqLkgxRTNpcnU8LWZhUjtMQUVkXWgrQUNmVE5zVitdTXJjZCZec0A4PksnTy8xWjhCaEcobDF1MSQnOFgsSE5McmVfWUguUVdVQFpLTC1rP21IIzFbNiJaYFM+ZlBBQmFJQHRsUDUhSl9VNklmUyJEQF1CazA6YEJXPiZKPDFDM1MiOV9lcGhfIWpTaj9KUUY5TTAycEFLNFRtXl9wL2wwQ00xVWZQK0xpa1RRPypQXS1xZDBOXildYVNBVkBWcT0yJzFsa1ZLNlZJMEMkaEpuVjk7JFcjOj9LbC1NTi9oSXEyPlQvMWppRitIIylSZHFyRzNlaVRUJmwrMzM2YGlySklsTDdodF8hSkdzJloqO1dlcG5uUlBbdSleWCFbKWxJIiQ6WWoiXHJkTUcxbCIkKkFSWV8nUyo+W0VFb21OJF4kbDQnMUklOi8oL1JYa2lqKCpPUmErQiNoVTpsMS9xako7PlhKXWtwZ2p1RSMkZy5SX3AuLSJOJjclOSloJlJeal4tbCk7Zj9mNjMrXVU6b0Y1SDssMDpGMG9WXSRSSllfamxeLGdDY147M0hcQDdgKWFWLCxePSY1WkMtQ09XLz9tUDhDQyRGWWhAbFxwNUdyRyxeV1FbTVVVNlYnWGRhNGlvQypERU1vO1JaJlVcIjw2bGEyYWU0LiJPU1FALFk3ZlJWcTRBI2U5ITJYOGVKKV9hZTg3cVduZidyY25yN2FpIlxuPm8pcUZ1XDJgNkVLLmd0XUhOYCtTR0VfczFYZFxaKE4vRExwaCtTNy4+M1xWWGkwZkdmL2FkI1IpR1FFKl9oaUlFXzw2UTpAVEs4XzZqZ1U+Oi4uSGNPZG0kJ3BgaXI8KFc1W1s8Vz1RJkQtL21WPVBrXm9LKSozZGRrImlPa0NkVUQoZmdGPWdDL11APmwtXi5ORkdRb0Q9ODw3WTFRXnE4IU5tcm5oWlxOMjgyIWJgL3IuJj4kTXJpMVJpc08rYCdTdUh1Kj1qYlNEblRbRCxGVCRzVyhXLWVGOTNEayNPKTFZW0paRXFfSTcuPTlJVT9bXHJXJ0ksWnNbXSZxRVlsO1gnQzQ1Pm80UCQ0bUIiOERbYyFyXGZdOVVNZWAxM2QuKSsqTz1vQC1NcGVpXFBgKFl1NFwwb29qRyYnVE5GZDonalJmdTlzMyFWZGRtKGAmXjQ3XFxbZWlFaG9mJmwwTGYlKF4lT0ZLaiRlWkojVj9OTUxEal5uOzcnUU5gQGc4RS8jTUQ4b1QzYWhaQktROUZFODFRTSVHQERWKUEiQygzW0kjVUFzSyUvMmBbLDlWTGxoY0g8cWxgNVg3WzY/RD4/bTdFPGQvXGtvall1WEEkZV44J1A5TkpGPzN1NW90QkxiOGtLXnVxXEFicjAlZGMzZkd1JGxLIWxiMD5SZFFUQCNHPm1fNmlpMVhwMz5ZQVx1PGYlKC4uIiozc2ZTS242UDJXajtDc1tgQWNiTEdZUl8uMGViIilGLWtfTjIjKzgyMS1iOCRmb0ZSJyhkZVxjOFZjWi1oZnVUKGAqZ2YmQCV0JyhXRlFISSNAKl44XEFyR0swKi9RcGQ6OzZcRF5AYVVbUGZyUFdVTEBmZWNqYVpmYFBbX1hrbkIxPSdebE5ETFZUJlRiRGQ3R0k2PTE8TkBiTlEvN3FuU1x0TWJQVmlSQmVtX15COmZXSiVzXlolQDRTRmBaR0Y8KGo8N2heaWdYMExQMF05OT0yI2JXT2FbOSw3PzArcUtzLzFfYFtHME1gbj9dPUhMXGxUbSE5ISheZTc1W2s4Uz1sXXVYNjU7XioqRmZRKkg2UG4pXk5LUWlUTS5cVFRsNkNvcipQVFBeLFMxZSg/cEhPKlsjR1JxUFArRVJlOlJTI1ZRc1FgXlpiNnBjUyxXTXAtLiRyfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDExMiAwMDAwMCBuIAowMDAwMDAwMjE5IDAwMDAwIG4gCjAwMDAwMDAzMzEgMDAwMDAgbiAKMDAwMDAwMDQ0NiAwMDAwMCBuIAowMDAwMDAwNjM5IDAwMDAwIG4gCjAwMDAwMDA3MDcgMDAwMDAgbiAKMDAwMDAwMDk2OCAwMDAwMCBuIAowMDAwMDAxMDI3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDE1M2RhMzViMmNmNTFjMmZmOTUyZDQ2NjNjMGMyNmY1PjwxNTNkYTM1YjJjZjUxYzJmZjk1MmQ0NjYzYzBjMjZmNT5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNyAwIFIKL1Jvb3QgNiAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjQxMjkKJSVFT0YK',
    'processor_es': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzA0MQo+PgpzdHJlYW0KR2F1MEY+QmVlJSg0T1Q1ZkZSNUpCYlItJmdsTTpnLk9IYmciInJOIlhCQmdHWWk5PTMrTmdPJ2tMWHBNTWUnVW9AI2w7SjVxQUlSMClQUD5vbllxZjVMZlduU0hKZEhKSWBoTzpeMyxlNVFxYFJcVkJQNSVLNzFDWFI9c3NnZV0iSTpjTi1SXzpLZGMmL3JxdTsnNXApK3AxNWszK0N1Xy4+L2RdYjJKSWs+XUxoMC0mVnA8LTkxKzVHSiY7Q208NkV1JCtoRW9MY082JiVcVmJwUzpOTixvZjtxNVxKayxucVQ1WDJobyJOaTBfclBCS1luWmg7YlUvWExlK1kkYG5iRlRVa2pUPzByJVZnUjlFMEBvZi07c1o/WmUkKTA/XEpsOTtcPDFKJHJDLj0+YCRfcCwzS0InXSlsPUpiPyRqVmMhM1s4R3NNKF9dOm4+WWM5c2VmOGZjRHVcOVgrTSMnWEo0OD5yWSwhbmlGYDVXJGBtRGNgbFgnVWdMUypPcDswT2M4JT5KaVRMIzFgcGg5aV9rKjVFdTVsITRkJztpKm1qJk0rWy80Zjd0U3IqbDZdNEhPODMwPVQ/VCpuJmVfIVshP1slXiZqT0c1MzIqTV5kPzQ2UipaZVpcbUAiXE8hQGFGNWdUWmB0WU1fX0YjYDVnP1w6azNaMVVmOE4zRFFWYFJYK0xTSkNtXStsUU02KXAnNz1xMCw6WCU0MkUncjZARlBFOUdvMyZSSytGSU41cTJrMnJBaEU2MS1vdTljJmE2bFFAVFhvTkJfNzNwTWRTLVNxJzFsOyZiLSE/QjByUk50RWBObz4tZltlKDpQRWhiTStER2wkLFMpTCdGRDcoPSY5T3BeZ14qPE0wU3MuTV5OVyNTWEpMTSI8Yy4yKXEtNElnSjRZbFlyS0gyWFtzM1cmNTdjSVBAQmEkWFFgbC9nSSFULCxrZF1OYF1bOUQwVmI5ImVqTVdZNXBRUWRyLk4hUEcnNUh1UzosRmZlWlgnWUUjYDtLazxkNGMkJWorMiU2VFJTPlFHPzw5ImwlQDw8NjUzRkdeWVYnc0xmUGREJ1NqR3MzaDIoOyZtW148RXFgVjljQS4uY11ccipsQTtVRDBeUlZPLlVvPmJPUUsqaShXbl9WZiFvSi9SJzl1ODlFI0ZVa0pmSU1TbzQvQz0zIm9JYGRTUHEvJCQ9Z1RzTSNWV2dxcV11XWo4WT1CJ0VyZFZnOWRAZFJfPTZiQnApUzRyO2dsQEE9KHUrTT5dQXA/SG8+VklNRkhgaXRpaVlPRldxRGYjKEQ4OCE0bCVgczxWZERGUV1CX1NAUjxEXj5kJzpUalYkKHFoPXEuN2FgWmU/ZycoRUVEQnFGVzgjLCQmaj9iM3FtUmA9WSRTZ3NEPFRLZEBicVZjOSNgayNjPEltP0dhYWxVYFtZSGNrUjxNRkJAaCkqdVspblk4YkYjUTkxJGZuLWkrIkJNLlxUVkJoQHUmJltkIS00OSdvLlRxUkI1Z1ViNztUTzB1UyRSK1dNZHBnRWp0Zi4ocmQpQElHJWVmOmRzWzReIUJGLVVkISVJSTFWUHIzPUZDc2JuJC5sI21xJi1nWTIrJDNwUSJvSUFfbFAtLCVCMzBJY2JwKWtEQTEoZj9TKltWJFtSYCxJcSdYc3FaT185VT9DNS0qIldkcS5CWlJdaG9LNSpHNz5rJFJpYGpSInBKRFg0MXBtTG5SW1QpTlI4NWplJzkiVitrKFBBVWVgOz44YVYiLGQmK2NAZ2JYI2c3KEVuYEghRl5AaiJfJEZTZWctZ0hMOVZYXjM6VzNIJyJWTVpcIidtZURFNSs2WUNMTE4zSzs2W0dZYWc5SEM3QCpiK3IkMS1FVEMtRzxANDxJSF5nKFcvK2Fib1dbPVovUiZJblM9Mlg0XGNwVSxmcFMoOyk3PWpbOzlSK1xBUDVLNWRaQXAkTzhhSGsvaUcwKnJrJGR0PGdKSis5WVg7MGJCXlhFJTpJQjQ8PjwtblNHQ0BQUjkvT3A+O0JqWjNTSGUhTlBZR04uU28kWkRNK3VhWV4ncG5WS0c2WVZqP1RfaSU/QzxlVCVybENuPzpNOUJgQidHYFpTSGxNRTdwaDBQOjI7PVNHc1AtM1ZSW1hidTNqNlEhbDo/LkpQLXNMViYpYFIhVCdTMEsoM2tPOSU/a1xdLDVJdShNZHBiS29tZGVWcD1QWl4jPWFsXm9cVzE5WnEnXDgoQFZBYSNoRlVPLk5fZFJsJj82ZCdvWGhsamlvL1QsJDc/MThkcSwxWExLRCM5MDY+W0AjKG1UKldcXnFcLVZmJVlIYmtPVT4wPEEiI2cvb0tHPVIyJ0MnalY9Pmt0KkRVPGI1LlMqQ2tcKTwiaVkqXnBAWktDTDR0Oi0tKUlpLTsqN0JULCQ4LilDPUVbbGEpPWslQGgtJzwpbDJgIUVKQmwrVDU5Y0IqYTxDbDQ/I0tpcS1sQTU9Q0dXTFdnJUQ3M2UsbF1ARjVIbmltNGwmPS01NzU2TThvdVxdbSpXLSdsZEBbT1suOU8uXUcmQkJvYFFaMklLSV1iO04/SW5ZL2duPi40XlNiIUFEJjI3PUErJC1tMU1rUCxAQSU2XW1hbkheX2I5IUAyQCdQUWNoIj9QTDQncilJNT5fNyhdVTZUTSdLcGNaOldNZj0hJixaUk9XY2YxXTRdNiVOajtjRVtcJUlDJVI6Wz5kaSksL1BZLmZXbHNvZFBXY2BJclVAWi8iUGgqQUszcWRXQXAidVNWZSErU2w9VCJPW0xtVWlxZWNfcDRCO0M6RCNsJW1Yc24pak9bVjM8Rys6RzpARyY7Vj9lNFQtKSpvLFw9VWlUUSF0YDdDVyVucTpuUEJFJEcpcElTWUlSJEI4XjUpLWNDakxlalRlK3IpVTg4UWMwPC9xL2ZaLWxWWElpQVUoQEojdVttTydJaVtHN2hJPjg3PDglVC90TjNPP3UySFcpcVpARi1DPXAiIywnN1wwXjAkYWdDJDdaNjBDPGRcUU5MWUIrJWVDQE49K19NbjY/ZmpITiZwRmByPGZRcTJZcSpIQjtwKVo1XjRlMjJWYiRtb2xDWmRhWiQjLz9uIi9SWGgvTmdvNVBaPDJyMlt1ZExMaixyWWQqcyM9aTlGdFpwUGVIOixZV2MsaTtBMjBqL2E+ZDdga1A1cTZUTVxOY0YjJ0k+Y3NoaCJraHFwSCkzOCc7KChXbzYzciI0VE5abmYnbmlhTzc5PUcmJEdybEtnPDJgdV9CbSkiPyJpYChMVF43YE1cdCQ6cWIhVTxya1lvci9NSTs/YHNvVlQ8al0rMCltcmsjZG44JkkwRlM5KVFOWCdsWTpWJUw2VEBQYWJkc2ZJKWdIQkJkaCU4KUROcmBeTXRVTD0zKj5uTDkqWihjLWspLDBMU0p1UltsPC0qOTstZmZqNGNTKl5Zb2ZiWis6a2BsNGNzUj5zQmc+QlxaQTBGRTJgXVJnX2cjUlFGJWRtPCw3STlBLzkqVUxcRSJTKFA/RCcqPnVsKiVzIzI5XC1YK04lPFp0YTRcaDljVHQ1KGo5ZGdkLWwqJUwxdDVeaUd0XGRkUl1qUEhWbFMka0NAPmRAcHI+QnFfPU4lW2U8Q0c4YCg0VVwhQSxeKVZIJCZCM2NIQS4yY2pmO2xlM0AsYl5sLD0kNz9ARF5pP3JWXyxcKDhtZT4oJ1NtTilpQGtUdWNGKGVqWk1WWGIhRE5URXUucVtIUW8zZilINyFPdUhma3VbSWMvQ1svMSQzP3E2R01zaTtrM1UvXz1TVSRDJXJYK01zXVhHLF1iTlNWSjI1KEMzJ0onKS1XVitlKU8lKnMtUkYwbCNyVkhdc2hubVNTPkZsQ01CJl4xciR1aUdaLnMqYSxzQjIiTTRXVT0oNU5WbERHLidWZD05a15ZYUFjbDl1JWhRb0BRampoIVk5OEA9NEs1SmZNKC9zSzBLa1kqWHNBXUpFZDNvLW0kam1yJDtqWnFUTE5oZEpHZGdJTWUiX0pzWXIycm9jbkUpQkVPNlBtfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDExMiAwMDAwMCBuIAowMDAwMDAwMjE5IDAwMDAwIG4gCjAwMDAwMDAzMzEgMDAwMDAgbiAKMDAwMDAwMDQ0NiAwMDAwMCBuIAowMDAwMDAwNjM5IDAwMDAwIG4gCjAwMDAwMDA3MDcgMDAwMDAgbiAKMDAwMDAwMDk2OCAwMDAwMCBuIAowMDAwMDAxMDI3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPDgyN2FkNmE5YTBhMjk4ZTRiMmZkZWQ5Y2M0OWQ5NzQ4Pjw4MjdhZDZhOWEwYTI5OGU0YjJmZGVkOWNjNDlkOTc0OD5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNyAwIFIKL1Jvb3QgNiAwIFIKL1NpemUgMTAKPj4Kc3RhcnR4cmVmCjQxNTkKJSVFT0YK',
    'berry_en': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzAzNwo+PgpzdHJlYW0KR2F1MEY+P0JRTSZxODAxVy8nYDJTTGlAYT8qL0JVX1xnQytiW2kpYUtLWFRYQ2RCbW4+PF0/YF8jNCYubVpyTjssaG9RV085PEFsVjdPRDBYMDFfJyJiTCsySVw0Z2I6PDJrcTM8ZFE1SGswMiQhbGNIJU44TlNhcG0iKFY+TSxnJV5kKT4nNEchQT9tbFs5WW8tSlkyPTJMbG44WkIpVkFUSztSbF8pR3A2by1HVUdfL1IoI2s0NT5QbCc1JmpgPjNRJmQnSj44UEZKV2YtRy90TWUtaTM7UFdXI3BkYj8uKjsyI15UME4+WWokLXJMXy9xLCxWcC5iYFZpJCRmPWRcVVI5U3JoXytDSjFGJTc7WFtMXS8ha1A4amRiLF8oJmprXDdHIms0IidaKyY4Il46UXM+c04hb2RSOjlySnA3S1k9NSInZ0FcWl5ma143cTRObiVjTUxATDNJU0s/QE5sSCZgP1gyI0RnQi5zLSo5JUUpOnJ1cDduK0pPJXIzU0tBclpPKiRHblpLTGM5dGNNL1BZSGg3JSZkQDRcPEVuXF50MHRyWURFMVVXPlxCKSMkbmNYXSpNNzcnNj81PXIkaCFHNCopQW9NMkBFN1hbP1JkTEQmSVA9QHBpPixBZ0dUMUhDMFlhRCFfbCdTRVB1JCdxJ0BLajdxMzcqTmFURywjajhXLDVMO1UsR1w3NlpZcyRcWVcqX2E3K1BKYlUuMSdgOCtbJmw5QGJVdVUtNTxDKGcsZTBjIzAsODshZ0c4b25IJ18lXyEsWjY3ZkhGVThTWDc9bz9bcE5FSz1rTzs5WWpPMDFgSC1FXjJkKlFILGkyLShHYCRcNyQ8Xi1BbzY/MT5QWFRCc3VZUDdhalddTVU1YUhLVyIzKWphTyoqUV1VVTBSQl9kbiFiZCVVN2lhRUJRXDNMRT1ocmEoM1pddThFNilONGomLVxRV1U6ME9tU1MnXDA4T1w5LUY3RUUoITlHXj1RJXFnVzl1ZCk9MzQ+KVUsJHRHXHNUXFlUSXIwaUs/Pz8kVkNtVToqc2lcQlp0IjVdcFMxKSpfT04iTDNoPCpzW1MiYiZKSzpack1ATk1dNF5DMU8/Nk0jX2M8JzpoOShGPFdpST9WIzRyZ0lRQzNOaCNXYTBkcG0wcGw/NXMmMGRNYz5iI0FqN2EiVmBBWWZQYSQjPFlIUHNcNzoiamZmVmhuS0JEZiwxLWgyI0ZfTHRRcURXN1J0bmA3Rm9hYj91NGRnSz5qQ1x1NFpOX1Y9ZTlDO3VwWUQzXF41N1hrTCt1bm5MYz5IL04wa01JWlgwSi9XcCEiV0dPLCk9ZzIqVyddVFVnZSk9Sy4rJzNadTIzJFJOPCUxZkctamcidGw5V2RWM2M+cUw+Sz5sailMZTAvSFtaNyEuZy1AKjgxUWRkYy8/JDU/YSg3VE9RMCNdb3E8cFNtI0pqLk4+ZzdqcklXMms5VzRfQ08lcWYwJ2EpLDBvVnIhW2RAU0NfNUlPO0tRSEpWczVpQVJTMkUqRTUkZ1InIyglVkBvUD9TImBwa0A7JSMmX3VSTEJBI2wpT15jWFZDKlRGPGxMX1ZiWT05Tk1zTHQ2a0xqL19pL1A3VU10Ul0iP3Inc1c5czt1ciVxPCVRPEJjKi1jPEdtbElpNFJYUlgrYlhxb1oycTBKUj9BNFwrOEs8S2Q9cGRUZStSMXJJTkRhZDBMPz84VmBONzEtJ1xYKVA7aEhYaCRSRVdXPXJPRU1iSVFsPXVvYiMwc0c5SVBQZVZ0OlYyOmdRak5sQD8iNyhLYzAxI0wqOD5MUVkpTSRlWXMjMHRvZW1QYzkjW2VUJ2U7ZidlKEgnZkJdRmpHcyVtXGljWzNaJmYyLmYkJGFEZDYjPmdiPnFsQ1wjPm9DaHBhXU1TIVE2IilXODIpW0Y4KS5iNDUwL1MzW1MnU1g4X3RbJT8pKFI1WF4/YlslVCJfXlZuPDJhX1s+T0U7X1lCaGJXQV1WRzc1TTJxKlMkW0k/ci1FWmZEX0FzL2xBVS1AO3Esa0NBbWQ7dVU3aSVNMTlgQjVYYmE1bD8wMiowY3IyRF5tRmxbYV5rQEkiNS1IS1ZzbmBpKycmcER0PForZSVOXl1MPERQUG00WWVmJlsrcVA/RCcuODVAUVVpOltZUTpPaUhtUEIwUylCU0FzbUlLLnBHRkInVTFaTnRLcEc6WmM7WVhJaj1MQUtGWHVrcDBEVzgoQGBoSTk5XFhISC5Tc1wqSGdkU1k/MTcpZFgkUzFQZ3A3aSwxTGtyPkhbV2RTO0MwWCRpMj1NLmxLOEpTZz9HKkFSNDMlWEg4QUphSzRIZyQqSUJaPzEzRkM7OlBsKz4hMjoucCIpMXFNSGJBP11pMkJwQjROdT5XPyY9bEFsMFlGNyRjKWVcOSZfUSNoMC8pTkRZaFpnaG1nZV83KHJbdVw6Xy5kVWgybVopQF9HcyVRPiU9YmAsZmJxRWcmdVtVJTE+QW43bkh0VCgsL0whXVNbQSw5JnNrdUFPW3UnVENcVFxpLFYsNi9hZypoXGg/KyciMFM9Qko4K3JLRidZUmhZalI8MTsubl9pPGtfYSM9WWA7aSYpKnE2L1hDcjVURUJgVFdMUCVsYy5FZSwsIkZLOlJCUiFOPXE+XT5TSml1NSckPGJkO0c2RF9uRiUmWF5sLldyMUBbSj1EKzg/UlQxMVo1Jz9lP28na2FWJTkpR11ILWo1I2tTZHJgIkNlJCM3cyI2LFVbYHVvVkwuJ1wxXSU0Kz8mPXQmPk1PW1FGaCxPITEyLE5qXHU0PC5lLkRNXWBta3JNPD1rTkJhaGlTYSJmWHR1ZzFuPUQ+U2FDUj42a0YyZUdLWGBRI0pRWFxnOzpEP0suQyRRX0s+ZSZCYGlaViU+YyssIXBpQXVvQipfUlpKIlBYJ3EpdC0vKj8ua080bjxyOjZuKkcpKUghPSJDQ3MhVzZsJTRwLDBJWj1xa04tRlkxXiduW1xuXi9XWExQIV9YITg4YkpEYD0xVGo5LT1kaV9pPyc9OyswbkJKQTRcYltBZy47RVFxMCFqIltgdCJcWiVBQjhLQ11iZDpcL2lOY2NpXSkrJEIvVlguP0xTYV8kczdrXkMwOmY4JTgkQFx1Z3JwMkY2IkEhZ19PXVhUMUtIdTI6PF8wLHBMYiQ3PTsrPVZaZC9QcGRcWSpBTGFPNENFXiVgI3U1YlA3KXRQJCc3LmFmXVIrYiZGPSxCSGwqTVhhMUwkciNPXCVGdVwmMyhgVj1SblpwSiJianUubCdBVktmaDk+RWJpN0khW19tI2Y4NCwuZUkmKGVqTCtnRFElSUBqZiVDOHM6a111Lis4aUlaMT0obD5kWV87LF0lLz0xX21VJ01bSFVWMG04RmNnXHNAXGVKS15HQzVzamhEQSpESCUyPWgkUylzR0drREdoZ1laSms1dTBbMzxwNyZnajFeK0ZyKkhIWUEpSFNUZXIqUmtgTmE4LT9GNTM8Nk8qXWNtVSwjUSM1QGcwOzNtRys1S0Ina1FwRkBaTmI4Pi9dRVE8WydBLU9WMGZNRVE9JXVjLi5qPTduYls9aSRBNUs6Yl02I0AuWUM9JD4nalghaypaLm1FSnNObygrKGMvLipDcT5LdEg1ZFEjNClkLGxPJEdubGQoMmlqcmNgKiYzZzJgMmJrc01yTXRpMCZoOEFgbk1Pclw4cFxGW3FqRUg5MDdkJCRMSShJOkBkO0o9Z0VvdCQyZHQ9VTA1Wk9VSCREVWZjJ3IuOTlbRDxQK0JCKzNcLTgobjk5XG9jMiZDT0VQImdqbk5KJiVtY21EUjg/c1tNOyMwJFZvQWhYX1hRJypebzQkIk1nKzIoS1dqb2VDVicmRiFwKi8qbjIuUUQ2bigsXlA2Qzc2Jiw7ZCkiRmw6TjxvJ2EhPE5TYF9JYGkxPScoLDlpcjA5bSE9SXQ8KUFlbCtwLjBNTTItQEVLQWg0XlA+Z2JONShfYihhUlhbXFEoMkJvYmo+X2dGZE4wNTBhaiE4ZFlYWUpTI2R+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDEwCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDQ2IDAwMDAwIG4gCjAwMDAwMDA2MzkgMDAwMDAgbiAKMDAwMDAwMDcwNyAwMDAwMCBuIAowMDAwMDAwOTY4IDAwMDAwIG4gCjAwMDAwMDEwMjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8MmE4NjY5NzNhMWE3YzI4MDIzMjE4YTIwZDJmZjJjYTM+PDJhODY2OTczYTFhN2MyODAyMzIxOGEyMGQyZmYyY2EzPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA3IDAgUgovUm9vdCA2IDAgUgovU2l6ZSAxMAo+PgpzdGFydHhyZWYKNDE1NQolJUVPRgo=',
    'avocado_en': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtT2JsaXF1ZSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjMgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyA5IDAgUiAvTWVkaWFCb3ggWyAwIDAgNzkyIDYxMiBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDMwODA1MDY1NyswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMzAyNQo+PgpzdHJlYW0KR2F0bT4/JEchbiZxLyowVy8nJWg0NSV1VXJgIVspUT0vRClgJjlkYi1oM18+LW03OTUibHBtckQiP28kXG0oPHUsSltYPTNKZGZDckRFPUdsRGVgIW5GMmR1XlcvLVxPIUZHW1BRR0RNXGNqUj5KQy1CMVVOY0pGcm9TRm5rLWg2MjBNcENNOloxc0Y0NXN0byxtUFgoQTpYYHQiSzElWVJTK2ZvSlpkXkJrbGh1cC8sXHBnR2crZ0Iyal9qTW0+TWw5QDptRzdkRyRJbyMuLlY9Qi05JyxJMFRgOlNka1JmTXNlJm1eVmY4UihxaGpUamwzWjMuM1BZV0xlKGtaVCoiUDItOkluWyNUL2orTmluWVM/JTdpbCxfcD8xakVFLDE8ZjgvaV8wPG5Ia2wvZkduS2BhOl9DLzFtMzZkZShZcnQyT2w8MyNNNG1RTDcmZ2hUTV9AQ2ZKKi4vJkdUbW1DKTA4IVUqQS5aPEFMPmc2czA4LU9iOyllXkByPClQIW9JJzhhWDlEI2peSSJHYURmQGxXW2NSZE5CSG9ibFlaJEpLbyFDMzJUOlgrYFJvU0tVLFohclFlOmxAJlMlcjB1L0tbL0FJbSwycEY0YHRgYEpoIUtUTm42PjJKS0JRbCE7UzVKZUcxQzhEZV1yb1UvIVYoa3V1al1eQ2g9QWpRVV1pRF1tR0VGXk5HcDsnSCw7Jj8vNE0sTS1sJkpdUiJqVUc5TltsNC5McXItM2llKjVvaD0+UVYhb2ZScUFoY1EuJ1ciayg1J3JmZD8mV2QiNy0/NG1eKXFTLkYpSmtTMUM4akFnNXAvSSxBWGFtPWYpPVokWFxqY1RoLWVTV2VHNi82YD0jIzdvYy1mRmMxOEBpQ0QoQkwiWk9YLV8qbHQiUXFXaCssMGY5OVA2aGRWaGdmPCRAUnNeIWBdQjhzcyE7MyYtdGFtaWFWJjcjaGRAKlExUWhqYTRCXTA0YSNQMW1OYGFBNG5gIUg1Tk4kXycwaHMsUEw2byFQOFgmQ0xwRkxcZFBRRFdxW1VGW1pPQ3BlQT1ZX1g6VGVTJEwyZVwtbiFGRHJhMmpUKj80aCU6Q0wpaDdqKTw4KThORzQpK1RMM0pWUzBpTkQ6PUVSMDZNIXBNI0hFQygrR3RaR289TXNsQTdqV20zZ0VTLF1nWk4tYSEkMEo3cW1uZCgraVJiJGdTMTVcMVM7KV81X0lNNCZrUWlQNEZGa1xGM0EiQzNxXEYqLjxedSFcTFgtWi9qL0Nvb1Azb0JgaFRFP09WaUYsRF1EY2lwaE0qLTVSRmpiViFTIlxhPSRRZU46YTswPWdDcjM5V2BaclIvR0NNa0paYm1wMlEwN3RZNjxpWi1URSVuazkwYChcTldTcE5Na15YPDg2LUdhWiRXb1ZHJGVvK1VXUnMiJUNnJDxEXTBXQ2lYXWVePW1pIiRbY2o4MWcuNV9UIWRtO0w5bEQ6UDMnUWdrYnBpbik/aGBHUT5UVCpLQ1I7LFJeOkM0Kl1YayxNR1k7LSlUXFZZcFhxR0VddUBMKDhwdF05T1VlLVpIViJtMl1XREQ8JTBqTDQ2Kyw/MkBKXXJ1ciQ8VTtvLElMUCdrbTMjai1LbWhjaSxwOVAlW0wvRmVhZFh1Y1FaWk1eTVNdKnI7WUxaZG8hWT4jLytDJC9EMzJTUDRWKzZNVmQmRyVdOiE0Jz1rSSZnRyFPOydccVYrLlQkOVltNlRYU14vMFMlYycxTXV0WFlaSTwlWUVgOSwsT04vTj11N2InYE1aYjBlVS5JJmpyJiFpYDNVRWA0bGBwWkJbc0xpbS9wUGIqSSwwczRmaHVfMllGKFJdckVDTy5gXWU/PjMqajFBcSpqcFA8PTgsJzR0NU5KQDVyL2VbOGZQX2QpbDpObXQxWVJyMmY+Pk01MFdiTnBFJlo/Xl5EQEZEQkdbOUYuMylsQGRxSy4/XENeaGFoOldjK1RmV2E1VF5tSUZHbV1IdXJjYTNUXDkjdWNaQyIiO3JWZ1cjXTYuVmcnaldiWDM/YTFDUSpuZzpST2Jhc0gtS0Q8KCQkNEFBLDdqbWNhQSVZJkRaOHFSOkJtUTkxby8pMkg1L0dTRk5dMC1QRz5uKj1ANmhINFRcXF9fLE5iJk5cOzFHIlBKcVFHL0R0MDJZTWRJRHIwbyVQYjFfZlxxJzdocSw3QU5rMjZiRGQpXzQyWlI/YC48SSJoREpbNXFITEcxSFtKXC1lI0k7MUVPJio8cEReLDJkU2piLFwzWGhqSyRRMGg4ND9SYCwyYzNBSWByUlQ7bjU5cl8rPnEvP1N1PTplb3MlcFpaVmFlUSY8JE1QOGRCTCo+ZSJZTGQpOlZ1VC5MNGQ8VUc4WGhYJFw9NXJtUyo/J2MmJSkzPFBtTl1EPD5PQENVWDA3Yjs2WzRBZElGK1IzVGZxUmgsK1goRCx0VGk3KEtnK2RqXUhOcFJXOjhXbml1MUZicSckPWNpZTBoRkRaMTw/ZidKNyNnQypJVT5sIWJTK142J09PMSdXJzJNVkFxXj5CSSFySkpxdTpZWWExKl5SPjY9WEI7UyghWUQ4WklQW21daS5yZFtLO15LKj9PJS8oXkM1alt0OnRPSjI8RDw0STBKPT1PXl5XQWNHI0hwY1xQTTUsX0Y/TUtJX21xdEtSTGBwMF10SS8tSGtkczNhRyUrbSMiTUZnYy8tYEloRVYlWUR0KmBWVV9VaEtYVk9uR1k7UVovM3FNVzItM1BqaU1fN19zIW8pV3A4XkksQzUpOFxhRHVcZGxAJzRJVVBgRmQscGYuXjtQIm90JTRLKEk/TV50aThLRVJvKC1lWSVvTildIyJRTW0oLkEoPFBUOHU8WkheZyZFQTNPPD8pZC90IiV0JXIhLj8zJj8vNWw2Xk9bWldGKDxJOmchSUtoWERNTC8wTVMlW3BHc0UnTEEnPCZCYThfMlFPdSZncVhMMFJpSHFYbGdgLS9uYTMxVyJQYkhkJ2ptbSkuVj1jUk0lUkUjJUNSYnRpbFVqWS0xRTJsQV4tIkEiRmlaOGsuJG5RK1lBKixZbm5tYiVGQF0jNWFwPmZHKTdyWkVhXVhVP2xHZENxYVFJdWExUSs8VXA1Wjc8UU1rXUA4Kkc5c2M0QkJMczQ8NU11RTc1P0Q6UUFHPD1YYSRYL15KWWc+W21WcThoMzowXFteYG9pR1tRTjFgQEEiKWlSOipccnRiMCliLDJjYjc8ciUmXDRELVc7QGwnR24iYTEoN3EjYFUib1MoLltfck9nazdjMDUhJ0hpW0dkXWhLNEVgVEwiRWJbLGM4bS9gY0I7NUN0SWlZJ1omKDNDJHVnUj8pNCFLUigpbipedC5fXWhcUWgsV1QrKlBoJFU/czJdb1pGY1tVUFcoNHFuSTRVNHFqP0FeSmdGQW9JOyFtJFp0ZCNTSGI8c0RzM1hqMFZaZVNtVUhZaENyRS8/J1NbVChbTzBuP1I4ZWU2V10tO2REa0RtVWMuai1MKylrRTcoMV5CTnFTZk5dZ2ViVDdKWk9QSEVGNlAkZ1NUNT5AK01PNWtkRjRNVnRyQyk+UFYxQ1VGRUpxLzk6Yy1qSmEtXjA5QjhTLTxhTjBNJlZDKGpmJ1ZmUDVncWVWWz1QZj5CRU5WOkYwajFkb2lQVUNyWF1VWmlBUzwpLURoLiRba1kpJTh1L0RZOkpCSFVCLUk8IUFfTSMyIlcvRTFARi1SbjE5bCZURDwyPDcoMlwobE1lLmc2YDlQR2BNbUk9TkEiLyEkVDFSbiktRUdIQzNAMmxxIzNjTmZHVEo8Q2JkS1pPPUpnJ0BZRyx1PSZPJmA7SDVRW1hycEMlXjFeL1c5UVwqKkxFQD0zME9QKVQtdUc1QS9oPlxxbHVNQCtXIm4jTXIoUV4+RjEja3RUSDRTLmBxcyJNKWRESDRKajNLUlpZRzsqb0NaVFFaXTJiJyp0Ty9mKjh1TFtWdVolPDgscFAnL1tbKkA+Sio7XDJyV1toZi1rcEhOTGxlOkB+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDEwCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDQ2IDAwMDAwIG4gCjAwMDAwMDA2MzkgMDAwMDAgbiAKMDAwMDAwMDcwNyAwMDAwMCBuIAowMDAwMDAwOTY4IDAwMDAwIG4gCjAwMDAwMDEwMjcgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8OTFhY2Y4OGFlYWFkYzE2Mjc5MDk1ZDA2NDIwNzJmZjU+PDkxYWNmODhhZWFhZGMxNjI3OTA5NWQwNjQyMDcyZmY1Pl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA3IDAgUgovUm9vdCA2IDAgUgovU2l6ZSAxMAo+PgpzdGFydHhyZWYKNDE0MwolJUVPRgo=',
  };
export const AGRIMAXX_PDFS = [
    { id:'growers_en', label:'Field Growers (EN)', file:'agrimaxx_growers_en.pdf', lang:'EN', cat:'Growers' },
    { id:'growers_es', label:'Productores (ES)', file:'agrimaxx_growers_es.pdf', lang:'ES', cat:'Growers' },
    { id:'dairy_en', label:'Dairy Operations (EN)', file:'agrimaxx_dairy_en.pdf', lang:'EN', cat:'Dairy' },
    { id:'dairy_es', label:'Operaciones Lecheras (ES)', file:'agrimaxx_dairy_es.pdf', lang:'ES', cat:'Dairy' },
    { id:'greenhouse_en', label:'Greenhouse (EN)', file:'agrimaxx_greenhouse_en.pdf', lang:'EN', cat:'Greenhouse' },
    { id:'greenhouse_es', label:'Invernaderos (ES)', file:'agrimaxx_greenhouse_es.pdf', lang:'ES', cat:'Greenhouse' },
    { id:'salad_en', label:'Salad & Produce Packing (EN)', file:'agrimaxx_salad_packing_en.pdf', lang:'EN', cat:'Produce Packing' },
    { id:'salad_es', label:'Empacadoras (ES)', file:'agrimaxx_salad_packing_es.pdf', lang:'ES', cat:'Produce Packing' },
    { id:'processor_en', label:'Food Processors (EN)', file:'agrimaxx_processor_en.pdf', lang:'EN', cat:'Processor' },
    { id:'processor_es', label:'Procesadoras (ES)', file:'agrimaxx_processor_es.pdf', lang:'ES', cat:'Processor' },
    { id:'berry_en', label:'Berry Growers (EN)', file:'agrimaxx_berry_growers_en.pdf', lang:'EN', cat:'Berry' },
    { id:'avocado_en', label:'Avocado & Tree Fruit (EN)', file:'agrimaxx_avocado_treefruit_en.pdf', lang:'EN', cat:'Avocado' },
  ];