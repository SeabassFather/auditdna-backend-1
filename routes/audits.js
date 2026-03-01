// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Mexausa Food Group, Inc.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ALL FEATURES MERGED | LUXURY ROBB REPORT STYLE
// 27K Contacts | Email Marketing | AI Cowboys | Video | Voice
// Conference | Files | Buyers USA/Mexico | Commodity Search
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import {
  Mail, Video, Upload, Send, Save, UserPlus, Volume2, VolumeX, MonitorPlay, Square, Play, Download, Trash2, X,
  Users, List, Paperclip, Image as ImageIcon, Mic, BarChart as BarChartIcon, UserX, Eye, Plus, Calendar, Clock, Globe,
  ExternalLink, Bell, Repeat, FileText, Copy, Check, ChevronLeft, ChevronRight, Settings, Brain,
  Sparkles, Circle, Volume, Smartphone, Youtube, Facebook, Instagram, Twitter, Linkedin, QrCode,
  Printer, MapPin, CalendarDays, CalendarPlus, CalendarCheck, MicOff, VideoOff, Layout, Search,
  Edit3, Layers, Zap, Package, Shield, Truck, AlertTriangle, DollarSign, TrendingUp, Filter
} from 'lucide-react';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LUXURY COLOR SCHEME - ROBB REPORT / DUPONT REGISTRY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const C = {
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

const API = {
  base: 'http://localhost:5050',
  zadarma: 'http://localhost:5050/api/zadarma',
  email: 'http://localhost:5050/api/email',
  files: 'http://localhost:5050/api/files',
  crm: 'http://localhost:5050/api'
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 81 MINER NINERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const COWBOYS = [
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
const CONTENT_COWBOYS = [
  { id: 'content', name: 'Content Cowboy', emoji: 'ðŸ“', skill: 'Email & content' },
  { id: 'subject', name: 'Subject Sniper', emoji: 'ðŸŽ¯', skill: 'Subject lines' },
  { id: 'social', name: 'Social Scout', emoji: 'ðŸ“±', skill: 'Social posts' },
  { id: 'sms', name: 'SMS Sniper', emoji: 'ðŸ’¬', skill: 'SMS campaigns' }
];

// SOCIAL PLATFORMS
const SOCIAL_PLATFORMS = [
  { id: 'email', name: 'Email', icon: Mail, color: C.gold },
  { id: 'sms', name: 'SMS', icon: Smartphone, color: C.sms },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: C.youtube },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: C.facebook },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: C.instagram },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: C.twitter },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: C.linkedin }
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function ZadarmaCRM() {
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Authentication
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [voiceLoginActive, setVoiceLoginActive] = useState(false);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Main Navigation
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [panel, setPanel] = useState('dashboard');
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Contacts & CRM Data
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [growers, setGrowers] = useState([]);
  const [buyersUSA, setBuyersUSA] = useState([]);
  const [buyersMexico, setBuyersMexico] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Total counts from API
  const [totalGrowers, setTotalGrowers] = useState(0);
  const [totalBuyers, setTotalBuyers] = useState(0);
  const [totalShippers, setTotalShippers] = useState(0);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Filters & Search
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [searchTerm, setSearchTerm] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [packagingFilter, setPackagingFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [certFilter, setCertFilter] = useState('');
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Contact Selection
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Email Marketing
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [emailTab, setEmailTab] = useState('compose');
  const [groups, setGroups] = useState([]);
  const [lists, setLists] = useState([]);
  const [optedOut, setOptedOut] = useState([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [sending, setSending] = useState(false);
  
  // Multi-Channel
  const [selectedChannels, setSelectedChannels] = useState(['email']);
  const [smsContent, setSmsContent] = useState('');
  const [socialCaption, setSocialCaption] = useState('');
  const [hashtags, setHashtags] = useState(['CMProducts', 'FreshProduce']);
  
  // Video/Voice
  const [videoRecordings, setVideoRecordings] = useState([]);
  const [voiceRecordings, setVoiceRecordings] = useState([]);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // AI Cowboys
  const [selectedCowboy, setSelectedCowboy] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  
  // Groups/Lists
  const [newGroupName, setNewGroupName] = useState('');
  const [newListName, setNewListName] = useState('');
  
  // Analytics
  const [analytics, setAnalytics] = useState({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0
  });
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Conference
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [confActive, setConfActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [confId, setConfId] = useState('');
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Files
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATE - Cowboys & UI
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const [cowboys, setCowboys] = useState(COWBOYS);
  const [showCowboys, setShowCowboys] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // REFS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const videoRef = useRef(null);
  const confVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // AUTHENTICATION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === '1776') {
      setCurrentUser({ name: 'Saul Garcia', role: 'super_admin' });
      setIsLoggedIn(true);
      setPinInput('');
      
      const savedKey = localStorage.getItem('claude_api_key');
      if (savedKey) setClaudeApiKey(savedKey);
      
      const utterance = new SpeechSynthesisUtterance('Access granted');
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Invalid PIN');
    }
  };

  const handleVoiceLogin = () => {
    setVoiceLoginActive(true);
    const utterance = new SpeechSynthesisUtterance('Voice authentication required');
    window.speechSynthesis.speak(utterance);
    
    setTimeout(() => {
      setCurrentUser({ name: 'Saul Garcia', role: 'super_admin' });
      setIsLoggedIn(true);
      setVoiceLoginActive(false);
    }, 2000);
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LOAD DATA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const loadContacts = async () => {
    setLoading(true);
    try {
      const [growersRes, buyersRes, shippersRes] = await Promise.all([
        fetch(`${API.base}/api/growers`),
        fetch(`${API.base}/api/buyers`),
        fetch(`${API.base}/api/shippers`)
      ]);

      const growersData = await growersRes.json();
      const buyersData = await buyersRes.json();
      const shippersData = await shippersRes.json();

      setGrowers(growersData.data || []);
      setTotalGrowers(growersData.total || 0);
      
      const allBuyers = buyersData.data || [];
      setBuyersUSA(allBuyers.filter(b => b.country === 'USA'));
      setBuyersMexico(allBuyers.filter(b => b.country === 'Mexico'));
      setTotalBuyers(buyersData.total || 0);
      
      setShippers(shippersData.data || []);
      setTotalShippers(shippersData.total || 0);
      
      // Combine for email contacts
      setAllContacts([...growersData.data || [], ...buyersData.data || [], ...shippersData.data || []]);

    } catch (error) {
      console.error('Error loading contacts:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadContacts();
      
      // Initialize Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognitionRef.current = new SpeechRecognition();
        speechRecognitionRef.current.continuous = true;
        speechRecognitionRef.current.interimResults = true;
        
        speechRecognitionRef.current.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setLiveTranscript(transcript);
        };
      }
    }
  }, [isLoggedIn]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // BUYER FILTERING
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const filterBuyers = (buyers) => {
    return buyers.filter(buyer => {
      const textMatch = !searchTerm || 
        buyer.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buyer.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        buyer.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const commodityMatch = !commodityFilter ||
        buyer.commodities_purchased?.includes(commodityFilter);

      const packagingMatch = !packagingFilter ||
        buyer.packaging_types?.includes(packagingFilter);

      const weightMatch = !weightFilter ||
        buyer.weight_ranges?.includes(weightFilter);

      const certMatch = !certFilter ||
        buyer.certifications_required?.includes(certFilter);

      return textMatch && commodityMatch && packagingMatch && weightMatch && certMatch;
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCommodityFilter('');
    setPackagingFilter('');
    setWeightFilter('');
    setCertFilter('');
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CONTACT SELECTION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const toggleContact = (contact) => {
    if (selectedContacts.find(c => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const selectAll = (buyers) => {
    const filtered = filterBuyers(buyers);
    setSelectedContacts([...new Set([...selectedContacts, ...filtered])]);
  };

  const deselectAll = () => {
    setSelectedContacts([]);
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // VIDEO/VOICE RECORDING
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoRecordings(prev => [...prev, { id: Date.now(), url, name: `video_${Date.now()}.webm`, blob }]);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecordingVideo(true);
    } catch (err) {
      alert('Camera access denied');
    }
  };
  
  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };
  
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setVoiceRecordings(prev => [...prev, { id: Date.now(), url, name: `voice_${Date.now()}.webm`, blob }]);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecordingVoice(true);
      
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.start();
        setIsTranscribing(true);
      }
    } catch (err) {
      alert('Microphone access denied');
    }
  };
  
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
    
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsTranscribing(false);
      if (liveTranscript) {
        setEmailContent(prev => prev + '\n\n' + liveTranscript);
        setLiveTranscript('');
      }
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // AI GENERATION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const generateWithAI = async () => {
    if (!aiPrompt || !selectedCowboy) {
      alert('Select a cowboy and enter a prompt');
      return;
    }
    
    setAiGenerating(true);
    try {
      const res = await fetch(`${API.email}/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          cowboy: selectedCowboy,
          context: { subject: emailSubject, selectedChannels, hashtags }
        })
      });
      
      const data = await res.json();
      
      if (selectedCowboy === 'content') {
        setEmailContent(data.content);
      } else if (selectedCowboy === 'subject') {
        setEmailSubject(data.content);
      } else if (selectedCowboy === 'social') {
        setSocialCaption(data.content);
      } else if (selectedCowboy === 'sms') {
        setSmsContent(data.content);
      }
      
      alert('âœ… Content generated!');
    } catch (err) {
      alert('AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SEND EMAIL CAMPAIGN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const sendCampaign = async () => {
    if (selectedContacts.length === 0) {
      alert('âš ï¸ Select recipients');
      return;
    }
    
    setSending(true);
    const formData = new FormData();
    formData.append('subject', emailSubject);
    formData.append('body', emailContent);
    formData.append('recipients', JSON.stringify(selectedContacts));
    formData.append('channels', JSON.stringify(selectedChannels));
    
    uploadedImages.forEach(img => formData.append('images', img.file));
    attachments.forEach(att => formData.append('attachments', att.file));
    videoRecordings.forEach(vid => formData.append('videos', vid.blob, vid.name));
    voiceRecordings.forEach(voice => formData.append('voices', voice.blob, voice.name));
    
    try {
      const res = await fetch(`${API.email}/send-campaign`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      alert(`âœ… Sent to ${selectedChannels.length} channels\nðŸ“§ Email: ${data.sent}\nâŒ Failed: ${data.failed}`);
      
      setEmailSubject('');
      setEmailContent('');
      setUploadedImages([]);
      setAttachments([]);
      setVideoRecordings([]);
      setVoiceRecordings([]);
      setSelectedContacts([]);
    } catch (err) {
      alert('âŒ Failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const stats = {
    total: totalGrowers + totalBuyers + totalShippers,
    growers: totalGrowers,
    buyersUSA: buyersUSA.length,
    buyersMexico: buyersMexico.length,
    shippers: totalShippers,
    selected: selectedContacts.length
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER - LOGIN SCREEN
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (!isLoggedIn) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundImage: 'url(https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)'
        }} />
        
        <div style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(20, 20, 20, 0.92)',
          border: `2px solid ${C.goldDark}`,
          padding: '2rem',
          width: '350px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: `2px solid ${C.goldDark}`
          }}>
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 'bold', 
              color: C.gold, 
              margin: 0,
              letterSpacing: '2px'
            }}>
              ZADARMA CRM
            </h1>
            <div style={{ 
              color: '#8B7355', 
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginTop: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Ultimate Edition
            </div>
          </div>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ 
                display: 'block', 
                color: C.gold, 
                marginBottom: '0.5rem', 
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Security PIN
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(40, 30, 25, 0.5)',
                  border: `2px solid ${C.goldDark}`,
                  color: C.gold,
                  fontSize: '1.75rem',
                  textAlign: 'center',
                  letterSpacing: '0.75rem',
                  transition: 'all 0.3s'
                }}
                maxLength={4}
                autoFocus
                placeholder="â€¢â€¢â€¢â€¢"
                onFocus={(e) => e.target.style.borderColor = C.gold}
                onBlur={(e) => e.target.style.borderColor = C.goldDark}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '1rem',
                background: '#8B4513',
                border: `2px solid ${C.goldDark}`,
                color: C.gold,
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.background = '#704214';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = '#8B4513';
              }}
            >
              Access CRM
            </button>
          </form>

          <div style={{ 
            marginTop: '1.25rem', 
            textAlign: 'center',
            paddingTop: '1rem',
            borderTop: `1px solid rgba(184, 148, 77, 0.3)`
          }}>
            <button
              onClick={handleVoiceLogin}
              disabled={voiceLoginActive}
              style={{
                padding: '0.625rem 1.25rem',
                background: voiceLoginActive 
                  ? 'rgba(100, 100, 100, 0.3)' 
                  : `rgba(${C.gold}, 0.2)`,
                border: `2px solid ${voiceLoginActive ? '#666' : C.goldDark}`,
                color: voiceLoginActive ? '#999' : C.gold,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: voiceLoginActive ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s'
              }}
            >
              {voiceLoginActive ? (
                <>
                  <Volume2 size={14} />
                  Listening...
                </>
              ) : (
                <>
                  <Mic size={14} />
                  Voice Login
                </>
              )}
            </button>
          </div>

          <div style={{
            marginTop: '1.25rem',
            padding: '0.75rem',
            background: 'rgba(139, 69, 19, 0.2)',
            border: `1px solid rgba(184, 148, 77, 0.3)`,
            fontSize: '0.7rem',
            color: C.goldDark,
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            <div>
              <strong>PIN:</strong> **** | <strong>VOICE:</strong> Enabled
            </div>
          </div>
        </div>
      </div>
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER - MAIN DASHBOARD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const currentBuyers = panel === 'buyers-usa' ? buyersUSA : 
                        panel === 'buyers-mexico' ? buyersMexico : [];
  const filteredBuyers = filterBuyers(currentBuyers);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundImage: panel === 'email' 
        ? 'none'
        : 'url(https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1920&q=80)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      background: panel === 'email' ? C.whiteBg : undefined,
      color: panel === 'email' ? C.whiteText : C.white, 
      padding: '2rem',
      position: 'relative'
    }}>
      {panel !== 'email' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 0
        }} />
      )}
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* HEADER */}
        <div style={{ 
          background: panel === 'email' ? C.whiteCard : C.panel,
          backdropFilter: 'blur(20px)',
          border: `2px solid ${panel === 'email' ? C.whiteBorder : C.borderGold}`,
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: panel === 'email' ? C.whiteText : C.gold, 
              margin: 0
            }}>
              Mexausa Food Group, Inc.
            </h1>
            <div style={{ color: panel === 'email' ? C.whiteTextSec : C.silver, fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {currentUser?.name} | {stats.total.toLocaleString()} Contacts | 
              {stats.selected > 0 && ` ${stats.selected} Selected`} | 
              {cowboys.filter(c => c.status === 'ACTIVE').length}/Miner Niners
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowCowboys(!showCowboys)}
              style={{
                padding: '0.75rem 1.5rem',
                background: showCowboys ? C.success : C.warning,
                border: 'none',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <Zap size={18} />
              {showCowboys ? 'Hide' : 'Show'} Cowboys
            </button>
            
            <button
              onClick={() => setIsLoggedIn(false)}
              style={{
                padding: '0.75rem 1.5rem',
                background: C.danger,
                border: 'none',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* COWBOYS PANEL */}
        {showCowboys && (
          <div style={{ 
            background: panel === 'email' ? C.whiteCard : C.panel,
            backdropFilter: 'blur(20px)',
            border: `2px solid ${panel === 'email' ? C.whiteBorder : C.borderGold}`,
            padding: '1.5rem',
            marginBottom: '2rem',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <h3 style={{ color: panel === 'email' ? C.whiteText : C.gold, marginBottom: '1rem', fontSize: '1.25rem' }}>
              MINER NINERS - {cowboys.filter(c => c.status === 'ACTIVE').length} Active
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {cowboys.map((cowboy, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem',
                    background: cowboy.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${cowboy.status === 'ACTIVE' ? C.success : C.danger}`
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: panel === 'email' ? C.whiteText : C.gold, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {cowboy.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: panel === 'email' ? C.whiteTextSec : C.silver }}>{cowboy.action}</div>
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.25rem 0.5rem', 
                    background: cowboy.status === 'ACTIVE' ? C.success : C.danger,
                    color: '#fff',
                    fontSize: '0.625rem',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {cowboy.status} | Tier {cowboy.tier}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total', value: stats.total, color: C.gold, icon: Users },
            { label: 'Growers', value: stats.growers, color: C.success, icon: null },
            { label: 'Buyers USA', value: stats.buyersUSA, color: C.info, icon: null },
            { label: 'Buyers Mexico', value: stats.buyersMexico, color: C.warning, icon: null },
            { label: 'Shippers', value: stats.shippers, color: C.silver, icon: Truck },
            { label: 'Selected', value: stats.selected, color: C.danger, icon: Check }
          ].map((stat, i) => (
            <div key={i} style={{ 
              border: `2px solid ${stat.color}`, 
              padding: '1rem', 
              background: panel === 'email' ? C.whiteCard : C.panel, 
              position: 'relative',
              overflow: 'hidden'
            }}>
              {stat.icon && (
                <div style={{ 
                  position: 'absolute', 
                  top: '0.5rem', 
                  right: '0.5rem',
                  opacity: 0.2
                }}>
                  {React.createElement(stat.icon, { size: 24, color: stat.color })}
                </div>
              )}
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: stat.color }}>
                {stat.value.toLocaleString()}
              </div>
              <div style={{ color: panel === 'email' ? C.whiteTextSec : C.silver, textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '2rem', 
          borderBottom: `2px solid ${panel === 'email' ? C.whiteBorder : C.borderGold}`,
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: null },
            { id: 'buyers-usa', label: 'Buyers USA', icon: null },
            { id: 'buyers-mexico', label: 'Buyers Mexico', icon: null },
            { id: 'email', label: 'Email Marketing', icon: Mail },
            { id: 'conference', label: 'Conference', icon: Video },
            { id: 'files', label: 'Files', icon: Upload }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setPanel(tab.id); resetFilters(); deselectAll(); }}
              style={{
                padding: '1rem 1.5rem',
                background: panel === tab.id ? (tab.id === 'email' ? C.whiteCard : C.gold) : 'transparent',
                border: 'none',
                borderBottom: panel === tab.id ? `3px solid ${tab.id === 'email' ? C.gold : C.gold}` : '3px solid transparent',
                color: panel === tab.id ? (tab.id === 'email' ? C.whiteText : '#000') : (panel === 'email' ? C.whiteTextSec : C.silver),
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s'
              }}
            >
              {tab.icon && React.createElement(tab.icon, { size: 16 })}
              {tab.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {panel === 'dashboard' && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2 style={{ color: C.gold, fontSize: '2.5rem', marginBottom: '1rem' }}>
              Welcome to Mexausa Food Group, Inc.
            </h2>
            <p style={{ color: C.silver, fontSize: '1.125rem', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
              {stats.total.toLocaleString()} contacts | AI-powered | Multi-channel | Video | Voice | Miner Niners
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
              {[
                { icon: Brain, label: 'AI Generation', desc: 'Claude-powered content for all channels' },
                { icon: Mail, label: 'Email Marketing', desc: 'Multi-channel campaigns with analytics' },
                { icon: Video, label: 'Video Conference', desc: 'Up to 25 participants with recording' },
                { icon: Mic, label: 'Speech-to-Text', desc: 'Live transcription for all content' },
                { icon: Search, label: 'Commodity Search', desc: 'Advanced filtering by commodity, packaging' },
                { icon: Zap, label: 'Miner Niners', desc: 'Automated monitoring across 8 tiers' }
              ].map((feature, i) => {
                const panelMap = {
                  'AI Generation': 'email',
                  'Email Marketing': 'email',
                  'Video Conference': 'conference',
                  'Speech-to-Text': 'email',
                  'Commodity Search': 'buyers-usa',
                  'Miner Niners': 'dashboard'
                };
                return (
                <div 
                  key={i} 
                  onClick={() => {
                    const targetPanel = panelMap[feature.label];
                    if (targetPanel && targetPanel !== 'dashboard') {
                      setPanel(targetPanel);
                    } else if (feature.label === 'Miner Niners') {
                      setShowCowboys(true);
                    }
                  }}
                  style={{ 
                    padding: '2rem', 
                    border: `2px solid ${C.gold}`, 
                    background: 'rgba(203,166,88,0.05)',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(203,166,88,0.15)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(203,166,88,0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {React.createElement(feature.icon, { size: 48, color: C.gold, style: { marginBottom: '1rem' } })}
                  <h3 style={{ color: C.gold, marginBottom: '0.5rem', fontSize: '1.125rem' }}>{feature.label}</h3>
                  <p style={{ color: C.silver, fontSize: '0.875rem', lineHeight: '1.4' }}>{feature.desc}</p>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BUYERS USA/MEXICO TABS */}
        {(panel === 'buyers-usa' || panel === 'buyers-mexico') && (
          <div>
            {/* COMMODITY SEARCH */}
            <div style={{ 
              background: C.panel,
              backdropFilter: 'blur(20px)',
              border: `2px solid ${C.borderGold}`,
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: C.gold, fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={20} />
                  COMMODITY SEARCH ENGINE
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => selectAll(currentBuyers)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: C.success,
                      border: 'none',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Select All ({filteredBuyers.length})
                  </button>
                  <button
                    onClick={deselectAll}
                    style={{
                      padding: '0.5rem 1rem',
                      background: C.danger,
                      border: 'none',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Clear ({stats.selected})
                  </button>
                  <button
                    onClick={() => setPanel('email')}
                    disabled={selectedContacts.length === 0}
                    style={{
                      padding: '0.5rem 1rem',
                      background: selectedContacts.length > 0 ? C.gold : C.silverDark,
                      border: 'none',
                      color: selectedContacts.length > 0 ? '#000' : '#fff',
                      fontWeight: 'bold',
                      cursor: selectedContacts.length > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Mail size={14} />
                    Email Marketing
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Search buyer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${C.silver}`,
                    color: C.white,
                    fontSize: '0.875rem'
                  }}
                />

                <select
                  value={commodityFilter}
                  onChange={(e) => setCommodityFilter(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${C.silver}`,
                    color: C.white,
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">All Commodities</option>
                  <option value="Avocados">Avocados</option>
                  <option value="Berries">Berries</option>
                  <option value="Tomatoes">Tomatoes</option>
                  <option value="Peppers">Peppers</option>
                  <option value="Limes">Limes</option>
                  <option value="Mangoes">Mangoes</option>
                </select>

                <select
                  value={packagingFilter}
                  onChange={(e) => setPackagingFilter(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${C.silver}`,
                    color: C.white,
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">All Packaging</option>
                  <option value="Bulk Bins">Bulk Bins</option>
                  <option value="Boxes - 25lb">Boxes - 25lb</option>
                  <option value="Clamshells">Clamshells</option>
                  <option value="Cartons">Cartons</option>
                </select>

                <select
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${C.silver}`,
                    color: C.white,
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">All Weights</option>
                  <option value="5-10 lbs">5-10 lbs</option>
                  <option value="10-25 lbs">10-25 lbs</option>
                  <option value="Full Truckload">Full Truckload</option>
                </select>

                <select
                  value={certFilter}
                  onChange={(e) => setCertFilter(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${C.silver}`,
                    color: C.white,
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">All Certifications</option>
                  <option value="USDA Organic">USDA Organic</option>
                  <option value="GlobalGAP">GlobalGAP</option>
                  <option value="FSMA 204">FSMA 204</option>
                </select>
              </div>
            </div>

            {/* BUYERS TABLE */}
            <div style={{ 
              background: C.panel,
              backdropFilter: 'blur(20px)',
              border: `2px solid ${C.borderGold}`,
              padding: '1.5rem'
            }}>
              <h3 style={{ color: C.gold, marginBottom: '1rem', fontSize: '1.5rem' }}>
                {panel === 'buyers-usa' ? 'USA' : 'Mexico'} Buyers 
                ({filteredBuyers.length.toLocaleString()})
              </h3>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '600px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: C.bgLight, zIndex: 1 }}>
                    <tr style={{ borderBottom: `2px solid ${C.borderGold}` }}>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>
                        <input 
                          type="checkbox"
                          checked={filteredBuyers.length > 0 && filteredBuyers.every(b => selectedContacts.find(c => c.id === b.id))}
                          onChange={(e) => e.target.checked ? selectAll(currentBuyers) : deselectAll()}
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        />
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: C.gold, fontSize: '0.75rem', fontWeight: 'bold' }}>COMPANY</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: C.gold, fontSize: '0.75rem', fontWeight: 'bold' }}>LOCATION</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: C.gold, fontSize: '0.75rem', fontWeight: 'bold' }}>COMMODITIES</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: C.gold, fontSize: '0.75rem', fontWeight: 'bold' }}>PACKAGING</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: C.gold, fontSize: '0.75rem', fontWeight: 'bold' }}>CONTACT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuyers.map((buyer, i) => (
                      <tr 
                        key={i} 
                        style={{ 
                          borderBottom: `1px solid ${C.border}`,
                          background: selectedContacts.find(c => c.id === buyer.id) ? 'rgba(203,166,88,0.1)' : 'transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <input
                            type="checkbox"
                            checked={!!selectedContacts.find(c => c.id === buyer.id)}
                            onChange={() => toggleContact(buyer)}
                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                          />
                        </td>
                        <td style={{ padding: '1rem', color: C.white, fontWeight: 'bold', fontSize: '0.875rem' }}>
                          {buyer.legal_name}
                        </td>
                        <td style={{ padding: '1rem', color: C.silver, fontSize: '0.875rem' }}>
                          {buyer.city}, {buyer.state_region}
                        </td>
                        <td style={{ padding: '1rem', color: C.success, fontSize: '0.875rem' }}>
                          {buyer.commodities_purchased?.join(', ')}
                        </td>
                        <td style={{ padding: '1rem', color: C.info, fontSize: '0.875rem' }}>
                          {buyer.packaging_types?.join(', ')}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.75rem', color: C.silver }}>
                          {buyer.email && <div>{buyer.email}</div>}
                          {buyer.phone && <div>{buyer.phone}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EMAIL MARKETING PANEL */}
        {panel === 'email' && (
          <div style={{ background: C.whiteCard, border: `1px solid ${C.whiteBorder}`, padding: '20px' }}>
            {/* Email Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: `2px solid ${C.whiteBorder}`, paddingBottom: '8px' }}>
              {[
                { id: 'compose', icon: Mail, label: 'Compose' },
                { id: 'multichannel', icon: Globe, label: 'Multi-Channel' },
                { id: 'analytics', icon: BarChartIcon, label: 'Analytics' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setEmailTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: emailTab === tab.id ? C.gold : C.whiteBg,
                    border: 'none',
                    color: emailTab === tab.id ? '#fff' : C.whiteTextSec,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* COMPOSE TAB */}
            {emailTab === 'compose' && (
              <div>
                {/* Recipients */}
                <div style={{ background: C.whiteBg, border: `1px solid ${C.whiteBorder}`, padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.whiteText, marginBottom: '12px' }}>
                    RECIPIENTS
                  </div>
                  <div style={{ fontSize: '12px', color: C.whiteTextSec }}>
                    {selectedContacts.length} contacts selected from Buyers tab
                  </div>
                </div>

                {/* AI Cowboys */}
                <div style={{ background: C.whiteBg, border: `1px solid ${C.whiteBorder}`, padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.whiteText, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Brain size={16} color={C.gold} />
                    AI CONTENT COWBOYS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                    {CONTENT_COWBOYS.map(cowboy => (
                      <button
                        key={cowboy.id}
                        onClick={() => setSelectedCowboy(cowboy.id)}
                        style={{
                          padding: '12px',
                          background: selectedCowboy === cowboy.id ? C.gold : C.whiteCard,
                          border: `2px solid ${selectedCowboy === cowboy.id ? C.gold : C.whiteBorder}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: selectedCowboy === cowboy.id ? '#fff' : C.whiteText
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{cowboy.emoji}</div>
                        <div style={{ fontSize: '11px', fontWeight: '600' }}>{cowboy.name}</div>
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="AI Prompt..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: C.whiteCard,
                      border: `1px solid ${C.whiteBorder}`,
                      fontSize: '13px',
                      marginBottom: '8px'
                    }}
                  />
                  <button
                    onClick={generateWithAI}
                    disabled={aiGenerating || !selectedCowboy || !aiPrompt}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: aiGenerating ? C.whiteGrey : C.gold,
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: aiGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {aiGenerating ? 'Generating...' : <><Sparkles size={16} />Generate with AI</>}
                  </button>
                </div>

                {/* Message */}
                <div style={{ background: C.whiteBg, border: `1px solid ${C.whiteBorder}`, padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.whiteText, marginBottom: '12px' }}>
                    MESSAGE
                  </div>
                  <input
                    type="text"
                    placeholder="Subject..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: C.whiteCard,
                      border: `1px solid ${C.whiteBorder}`,
                      fontSize: '13px',
                      marginBottom: '12px'
                    }}
                  />
                  <textarea
                    placeholder="Message body..."
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '10px',
                      background: C.whiteCard,
                      border: `1px solid ${C.whiteBorder}`,
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                  {liveTranscript && (
                    <div style={{ marginTop: '12px', padding: '10px', background: '#dbeafe', border: `1px solid ${C.info}`, fontSize: '12px', color: C.info }}>
                      <strong>Live Transcript:</strong> {liveTranscript}
                    </div>
                  )}
                </div>

                {/* Video/Voice */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ background: C.whiteBg, border: `1px solid ${C.whiteBorder}`, padding: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.whiteText, marginBottom: '12px' }}>
                      VIDEO ({videoRecordings.length})
                    </div>
                    {!isRecordingVideo ? (
                      <button
                        onClick={startVideoRecording}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: C.success,
                          border: 'none',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Video size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Record
                      </button>
                    ) : (
                      <button
                        onClick={stopVideoRecording}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: C.danger,
                          border: 'none',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Square size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Stop
                      </button>
                    )}
                    <video ref={videoRef} style={{ width: '100%', marginTop: '12px', display: isRecordingVideo ? 'block' : 'none' }} />
                  </div>

                  <div style={{ background: C.whiteBg, border: `1px solid ${C.whiteBorder}`, padding: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.whiteText, marginBottom: '12px' }}>
                      VOICE ({voiceRecordings.length})
                    </div>
                    {!isRecordingVoice ? (
                      <button
                        onClick={startVoiceRecording}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: C.success,
                          border: 'none',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Mic size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Record
                      </button>
                    ) : (
                      <button
                        onClick={stopVoiceRecording}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: C.danger,
                          border: 'none',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Square size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Stop
                      </button>
                    )}
                    {isTranscribing && <div style={{ marginTop: '12px', fontSize: '11px', color: C.success }}>Transcribing...</div>}
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={sendCampaign}
                  disabled={sending || selectedContacts.length === 0}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: sending ? C.whiteGrey : C.success,
                    border: 'none',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {sending ? 'Sending...' : <><Send size={20} />Send Campaign to {selectedContacts.length} contacts</>}
                </button>
              </div>
            )}

            {/* MULTI-CHANNEL TAB */}
            {emailTab === 'multichannel' && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: C.whiteText, marginBottom: '16px' }}>
                  Multi-Channel Distribution
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {SOCIAL_PLATFORMS.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => {
                        setSelectedChannels(prev => prev.includes(platform.id) ? prev.filter(c => c !== platform.id) : [...prev, platform.id]);
                      }}
                      style={{
                        padding: '16px',
                        background: selectedChannels.includes(platform.id) ? platform.color : C.whiteBg,
                        border: `2px solid ${selectedChannels.includes(platform.id) ? platform.color : C.whiteBorder}`,
                        color: selectedChannels.includes(platform.id) ? '#fff' : C.whiteText,
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <platform.icon size={24} />
                      {platform.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ANALYTICS TAB */}
            {emailTab === 'analytics' && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: C.whiteText, marginBottom: '16px' }}>
                  Campaign Analytics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Total Sent', value: analytics.totalSent, color: C.gold },
                    { label: 'Delivered', value: analytics.delivered, color: C.success },
                    { label: 'Opened', value: analytics.opened, color: C.info },
                    { label: 'Clicked', value: analytics.clicked, color: C.cyan }
                  ].map((stat, i) => (
                    <div key={i} style={{ padding: '20px', background: C.whiteBg, border: `1px solid ${C.whiteBorder}` }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: C.whiteTextSec, marginBottom: '8px' }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: stat.color }}>
                        {stat.value?.toLocaleString() || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONFERENCE TAB */}
        {panel === 'conference' && (
          <div style={{ background: C.panel, backdropFilter: 'blur(20px)', border: `2px solid ${C.borderGold}`, padding: '2rem' }}>
            <h2 style={{ color: C.gold, fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={24} />
              VIDEO CONFERENCE - Zadarma Integration
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
              {/* Conference Controls */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', border: `1px solid ${C.borderGold}` }}>
                <h3 style={{ color: C.gold, fontSize: '1.125rem', marginBottom: '1rem' }}>Conference Controls</h3>
                
                {!conferenceActive ? (
                  <button
                    onClick={() => setConferenceActive(true)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: C.success,
                      border: 'none',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Video size={20} />
                    Start Conference
                  </button>
                ) : (
                  <>
                    <div style={{ background: C.danger, padding: '1rem', marginBottom: '1rem', textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>
                      ðŸ”´ LIVE - {conferenceDuration}s
                    </div>
                    <button
                      onClick={() => setConferenceActive(false)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: C.danger,
                        border: 'none',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        marginBottom: '1rem'
                      }}
                    >
                      End Conference
                    </button>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <button
                    onClick={() => setMuted(!muted)}
                    style={{
                      padding: '0.75rem',
                      background: muted ? C.danger : C.panel,
                      border: `1px solid ${C.borderGold}`,
                      color: muted ? '#fff' : C.gold,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {muted ? <MicOff size={20} /> : <Mic size={20} />}
                    {muted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    onClick={() => setVideoOff(!videoOff)}
                    style={{
                      padding: '0.75rem',
                      background: videoOff ? C.danger : C.panel,
                      border: `1px solid ${C.borderGold}`,
                      color: videoOff ? '#fff' : C.gold,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    {videoOff ? 'Camera On' : 'Camera Off'}
                  </button>
                  <button
                    style={{
                      padding: '0.75rem',
                      background: C.panel,
                      border: `1px solid ${C.borderGold}`,
                      color: C.gold,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    <MonitorPlay size={20} />
                    Share Screen
                  </button>
                </div>
              </div>

              {/* Participants */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', border: `1px solid ${C.borderGold}` }}>
                <h3 style={{ color: C.gold, fontSize: '1.125rem', marginBottom: '1rem' }}>Participants (3/25)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {['Saul Garcia (You)', 'John Smith', 'Maria Lopez'].map((name, i) => (
                    <div key={i} style={{ 
                      background: C.panel, 
                      padding: '0.75rem', 
                      border: `1px solid ${C.borderGold}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ color: C.silver, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} />
                        {name}
                      </div>
                      {i === 0 && <div style={{ color: C.success, fontSize: '0.75rem', fontWeight: 'bold' }}>HOST</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Conference Stats */}
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Duration', value: `${conferenceDuration}s`, icon: Clock },
                { label: 'Participants', value: '3/25', icon: Users },
                { label: 'Quality', value: 'HD', icon: Video },
                { label: 'Status', value: conferenceActive ? 'LIVE' : 'Ready', icon: Circle }
              ].map((stat, i) => (
                <div key={i} style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '1rem', 
                  border: `1px solid ${C.borderGold}`,
                  textAlign: 'center'
                }}>
                  <div style={{ color: C.gold, marginBottom: '0.5rem' }}>
                    {React.createElement(stat.icon, { size: 20 })}
                  </div>
                  <div style={{ color: C.silver, fontSize: '0.75rem', marginBottom: '0.25rem' }}>{stat.label}</div>
                  <div style={{ color: C.gold, fontSize: '1.25rem', fontWeight: 'bold' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILES TAB */}
        {panel === 'files' && (
          <div style={{ background: C.panel, backdropFilter: 'blur(20px)', border: `2px solid ${C.borderGold}`, padding: '2rem' }}>
            <h2 style={{ color: C.gold, fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={24} />
              FILE MANAGEMENT
            </h2>

            {/* Upload Area */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: `2px dashed ${C.borderGold}`,
              padding: '3rem',
              textAlign: 'center',
              marginBottom: '2rem',
              cursor: 'pointer'
            }}>
              <Upload size={48} color={C.gold} style={{ marginBottom: '1rem' }} />
              <div style={{ color: C.gold, fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Drag & Drop Files Here
              </div>
              <div style={{ color: C.silver, fontSize: '0.875rem' }}>
                or click to browse
              </div>
            </div>

            {/* File List */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', border: `1px solid ${C.borderGold}` }}>
              <h3 style={{ color: C.gold, fontSize: '1.125rem', marginBottom: '1rem' }}>Recent Files</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { name: 'Q4_Sales_Report.pdf', size: '2.4 MB', date: '2026-02-07' },
                  { name: 'Grower_Contracts.docx', size: '856 KB', date: '2026-02-06' },
                  { name: 'Product_Photos.zip', size: '15.2 MB', date: '2026-02-05' }
                ].map((file, i) => (
                  <div key={i} style={{
                    background: C.panel,
                    padding: '1rem',
                    border: `1px solid ${C.borderGold}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={20} color={C.gold} />
                      <div>
                        <div style={{ color: C.gold, fontSize: '0.875rem', fontWeight: 'bold' }}>{file.name}</div>
                        <div style={{ color: C.silver, fontSize: '0.75rem' }}>{file.size} â€¢ {file.date}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={{ padding: '0.5rem', background: C.info, border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <Download size={16} />
                      </button>
                      <button style={{ padding: '0.5rem', background: C.danger, border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}