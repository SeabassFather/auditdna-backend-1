import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Bot, Send, X, Zap, Globe, Server, Activity } from 'lucide-react';
import FinancialServicesHub from './modules/FinancialServicesHub';
import { IntelligenceProvider } from './context/IntelligenceEngine';
import { MissionControl } from './modules/MissionControl';
import CommandSphere from './modules/CommandSphere';

// ================================================================================
// AUDITDNA PLATFORM v3.6.0 - ADAPTIVE AI LEARNING EDITION
// 35 AI/SI Cowboys | Auto-Module Generation | Data Capture | Email Reports
// ================================================================================

const CMProductsOmegaIntelligence = React.lazy(() => import('./modules/Cmproductsomegaintelligence'));
const USDAIntelligence = React.lazy(() => import('./modules/USDAIntelligence'));
const GrowerDatabase = React.lazy(() => import('./modules/GrowerDatabase'));
const FinancialServices = React.lazy(() => import('./modules/FinancialServices'));
const Traceability = React.lazy(() => import('./modules/Traceability'));
const Compliance = React.lazy(() => import('./modules/Compliance'));
const WaterTech = React.lazy(() => import('./modules/WaterTech'));
const SoilTech = React.lazy(() => import('./modules/SoilTech'));
const Marketplace = React.lazy(() => import('./modules/Marketplace'));
const LATAMIntelligence = React.lazy(() => import('./modules/LATAMIntelligence'));
const AIAgents = React.lazy(() => import('./modules/AIAgents'));
const GrowerIntelligence = React.lazy(() => import('./modules/Growerintelligence'));
const SeasonalCalendar = React.lazy(() => import('./modules/SeasonalCalendar'));
const BuyerNetwork = React.lazy(() => import('./modules/BuyerNetwork'));
const USDA502RuralHousing = React.lazy(() => import('./modules/USDA502RuralHousing'));
const MexicoRealEstate = React.lazy(() => import('./modules/MexicoRealEstate'));
const Spartan300 = React.lazy(() => import('./modules/Spartan300'));
const Trojan700 = React.lazy(() => import('./modules/Trojan700'));
const Analytics = React.lazy(() => import('./modules/Analytics'));
const LogisticsCenter = React.lazy(() => import('./modules/LogisticsCenter'));
const CustomerPortal = React.lazy(() => import('./modules/CustomerPortal'));
const ReportsCenter = React.lazy(() => import('./modules/ReportsCenter'));
const QualityControl = React.lazy(() => import('./modules/QualityControl'));
const ColdChainMonitoring = React.lazy(() => import('./modules/ColdChainMonitoring'));
const DocumentVault = React.lazy(() => import('./modules/DocumentVault'));
const NotificationsCenter = React.lazy(() => import('./modules/NotificationsCenter'));
const SettingsPreferences = React.lazy(() => import('./modules/SettingsPreferences'));
const CustomerPortalAdvanced = React.lazy(() => import('./modules/CustomerPortalAdvanced'));
const ZadarmaCRM = React.lazy(() => import('./modules/ZadarmaCRM'));
const EmailMarketing = React.lazy(() => import('./modules/EmailMarketing'));
const FieldOperations = React.lazy(() => import('./modules/Fieldoperations'));
const MobileSalesUpload = React.lazy(() => import('./modules/MobileSalesUpload'));
const TraceabilityHub = React.lazy(() => import('./modules/TraceabilityHub'));
const AccountingHub = React.lazy(() => import('./modules/AccountingHub'));
const AgentDashboard = React.lazy(() => import('./components/AgentDashboard'));
const MortgageLoanHub = React.lazy(() => import('./modules/MortgageLoanHub'));
const GrowerManagementHub = React.lazy(() => import('./modules/Growermanagementhub'));
const GrowerMaster = React.lazy(() => import('./modules/GrowerMaster'));
const USDAIntelligenceDashboard = React.lazy(() => import('./modules/USDAIntelligencedashboard'));
const AccessControl = React.lazy(() => import('./modules/Accesscontrol'));
const SecureBuyersIntelligence = React.lazy(() => import('./modules/SecureBuyersIntelligence'));
const SmallGrowerIntelligence = React.lazy(() => import('./modules/SmallGrowerIntelligence'));
const PriceAlertPingSystem = React.lazy(() => import('./modules/PriceAlertPingSystem'));
const UltimateReconEngine = React.lazy(() => import('./modules/ULTIMATE_RECON_ENGINE'));
const AgriculturalIntelligenceMaster = React.lazy(() => import('./modules/Agriculturalintelligencemaster'));
const IntelligenceDashboard = React.lazy(() => import('./modules/INTELLIGENCE_DASHBOARD'));
const TenantAdmin = React.lazy(() => import('./modules/TenantAdmin'));
const SII_MX = React.lazy(() => import('./modules/SII_MX'));
const USDAGrowerSearchEngine = React.lazy(() => import('./pages/usda/USDAGrowerSearchEngine'));
const MultiAIUploadInterface = React.lazy(() => import('./components/MultiAIUploadInterface'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const GrowerRecommendationEngine = React.lazy(() => import('./modules/GrowerRecommendationEngine'));
const FertilizerAnalysis = React.lazy(() => import('./modules/FertilizerAnalysis'));
const SeedGermination = React.lazy(() => import('./modules/SeedGermination'));
const DocumentAnalysisAI = React.lazy(() => import('./modules/DocumentAnalysisAI'));
const AuditDNA_Elite_Analytics = React.lazy(() => import('./modules/Auditdna_elite_analytics'));
const AuditDNA_ELITE_BEAST = React.lazy(() => import('./modules/Auditdna_Elite_Beast'));
const FinanceMasterModule = React.lazy(() => import('./modules/FinanceMasterModule'));
const FinancialDashboard = React.lazy(() => import('./modules/FinancialDashboard'));
const FinanceOperations = React.lazy(() => import('./modules/Financeoperations-complete'));
const TravelProtection = React.lazy(() => import('./modules/TravelProtection'));
// const PredictiveAnalyzer = React.lazy(() => import('./modules/Predictiveanalyzer'));

const ModuleLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '14px', color: '#94a3b0', fontWeight: '600' }}>Loading Module...</div>
    </div>
  </div>
);

// ================================================================================
// AI LEARNING ENGINE - 35 COWBOYS ADAPTIVE SYSTEM
// ================================================================================

const AI_LEARNING_ENGINE = {
  sessionData: {
    sessionId: `SESSION-${Date.now()}`,
    startTime: new Date().toISOString(),
    userQuestions: [],
    identifiedNeeds: [],
    suggestedModules: [],
    generatedWorkflows: [],
    systemInsights: []
  },

  cowboys: {
    priceHawk: { id: 'PH-001', name: 'Price Hawk', domain: 'pricing', learns: ['price_queries', 'market_trends', 'commodity_requests'] },
    marketOracle: { id: 'MO-002', name: 'Market Oracle', domain: 'forecasting', learns: ['forecast_requests', 'trend_analysis', 'predictions'] },
    commodityTracker: { id: 'CT-003', name: 'Commodity Tracker', domain: 'commodities', learns: ['product_searches', 'commodity_gaps', 'new_products'] },
    demandPredictor: { id: 'DP-004', name: 'Demand Predictor', domain: 'demand', learns: ['demand_patterns', 'seasonal_needs', 'buyer_behavior'] },
    seasonalAnalyzer: { id: 'SA-005', name: 'Seasonal Analyzer', domain: 'seasons', learns: ['seasonal_queries', 'harvest_timing', 'weather_impact'] },
    complianceSheriff: { id: 'CS-006', name: 'Compliance Sheriff', domain: 'compliance', learns: ['compliance_questions', 'cert_requests', 'audit_needs'] },
    auditEngine: { id: 'AE-007', name: 'Audit Engine', domain: 'auditing', learns: ['audit_requests', 'document_verification', 'gap_analysis'] },
    certValidator: { id: 'CV-008', name: 'Cert Validator', domain: 'certifications', learns: ['cert_queries', 'validation_needs', 'renewal_tracking'] },
    riskAssessor: { id: 'RA-009', name: 'Risk Assessor', domain: 'risk', learns: ['risk_questions', 'supplier_concerns', 'quality_issues'] },
    recallMonitor: { id: 'RM-010', name: 'Recall Monitor', domain: 'recalls', learns: ['recall_alerts', 'safety_concerns', 'fda_queries'] },
    routeRanger: { id: 'RR-011', name: 'Route Ranger', domain: 'logistics', learns: ['shipping_queries', 'route_requests', 'delivery_needs'] },
    coldChainGuard: { id: 'CC-012', name: 'Cold Chain Guard', domain: 'temperature', learns: ['temp_monitoring', 'cold_chain_gaps', 'storage_needs'] },
    deliveryPredictor: { id: 'DV-013', name: 'Delivery Predictor', domain: 'delivery', learns: ['eta_requests', 'delivery_tracking', 'timing_needs'] },
    freightOptimizer: { id: 'FO-014', name: 'Freight Optimizer', domain: 'freight', learns: ['cost_queries', 'freight_optimization', 'carrier_requests'] },
    borderCrossing: { id: 'BC-015', name: 'Border Crossing', domain: 'customs', learns: ['border_queries', 'customs_needs', 'port_requests'] },
    qualityMarshal: { id: 'QM-016', name: 'Quality Marshal', domain: 'quality', learns: ['quality_questions', 'lab_requests', 'testing_needs'] },
    pesticideScanner: { id: 'PS-017', name: 'Pesticide Scanner', domain: 'pesticides', learns: ['pesticide_queries', 'residue_concerns', 'safety_testing'] },
    waterAnalyzer: { id: 'WA-018', name: 'Water Analyzer', domain: 'water', learns: ['water_queries', 'water_testing', 'irrigation_needs'] },
    soilIntel: { id: 'SI-019', name: 'Soil Intel', domain: 'soil', learns: ['soil_queries', 'soil_testing', 'nutrient_analysis'] },
    microbeDetector: { id: 'MD-020', name: 'Microbe Detector', domain: 'microbiology', learns: ['pathogen_queries', 'micro_testing', 'food_safety'] },
    growerScout: { id: 'GS-021', name: 'Grower Scout', domain: 'growers', learns: ['grower_searches', 'supplier_needs', 'farm_queries'] },
    farmProfiler: { id: 'FP-022', name: 'Farm Profiler', domain: 'farms', learns: ['farm_analysis', 'capability_queries', 'production_needs'] },
    yieldPredictor: { id: 'YP-023', name: 'Yield Predictor', domain: 'yields', learns: ['yield_queries', 'harvest_predictions', 'production_forecasts'] },
    weatherWatcher: { id: 'WW-024', name: 'Weather Watcher', domain: 'weather', learns: ['weather_queries', 'climate_concerns', 'frost_alerts'] },
    stormTracker: { id: 'ST-025', name: 'Storm Tracker', domain: 'storms', learns: ['storm_alerts', 'disaster_prep', 'weather_impact'] },
    cashWrangler: { id: 'CW-026', name: 'Cash Wrangler', domain: 'payments', learns: ['payment_queries', 'financing_needs', 'cash_flow'] },
    invoiceAuditor: { id: 'IA-027', name: 'Invoice Auditor', domain: 'invoices', learns: ['invoice_queries', 'billing_issues', 'payment_tracking'] },
    creditAnalyzer: { id: 'CA-028', name: 'Credit Analyzer', domain: 'credit', learns: ['credit_queries', 'risk_assessment', 'lending_needs'] },
    marginCalculator: { id: 'MC-029', name: 'Margin Calculator', domain: 'margins', learns: ['margin_queries', 'profit_analysis', 'pricing_strategy'] },
    factoringEngine: { id: 'FE-030', name: 'Factoring Engine', domain: 'factoring', learns: ['factoring_queries', 'ar_financing', 'cash_advance'] },
    lotTracker: { id: 'LT-031', name: 'Lot Tracker', domain: 'lots', learns: ['lot_queries', 'tracing_needs', 'origin_tracking'] },
    chainMapper: { id: 'CM-032', name: 'Chain Mapper', domain: 'supply_chain', learns: ['chain_queries', 'visibility_needs', 'mapping_requests'] },
    qrGenerator: { id: 'QR-033', name: 'QR Generator', domain: 'qr_codes', learns: ['qr_requests', 'label_needs', 'tracking_codes'] },
    originVerifier: { id: 'OV-034', name: 'Origin Verifier', domain: 'origin', learns: ['origin_queries', 'verification_needs', 'country_tracking'] },
    blockchainLedger: { id: 'BL-035', name: 'Blockchain Ledger', domain: 'blockchain', learns: ['blockchain_queries', 'immutable_records', 'verification'] }
  },

  analyzeQuestion: function(question) {
    const q = question.toLowerCase();
    const insights = {
      timestamp: new Date().toISOString(),
      question: question,
      identifiedTopics: [],
      suggestedModules: [],
      workflowOpportunities: [],
      assignedCowboys: [],
      priority: 'normal'
    };

    if (q.includes('price') || q.includes('cost') || q.includes('precio') || q.includes('market')) {
      insights.identifiedTopics.push('pricing_intelligence');
      insights.assignedCowboys.push('priceHawk', 'marketOracle', 'commodityTracker');
      if (q.includes('forecast') || q.includes('predict') || q.includes('future')) {
        insights.suggestedModules.push({ name: 'Price Forecasting Dashboard', category: 'CM Products Intelligence', priority: 'high' });
        insights.workflowOpportunities.push('Automated Price Alert System');
      }
      if (q.includes('compare') || q.includes('competitor')) {
        insights.suggestedModules.push({ name: 'Competitor Price Tracker', category: 'Market Intelligence', priority: 'medium' });
      }
    }

    if (q.includes('compliance') || q.includes('fsma') || q.includes('audit') || q.includes('certif')) {
      insights.identifiedTopics.push('compliance_management');
      insights.assignedCowboys.push('complianceSheriff', 'auditEngine', 'certValidator');
      if (q.includes('expire') || q.includes('renew') || q.includes('vence')) {
        insights.suggestedModules.push({ name: 'Certificate Renewal Tracker', category: 'Compliance & Auditing', priority: 'high' });
        insights.workflowOpportunities.push('Auto-Renewal Reminder System');
      }
      if (q.includes('gap') || q.includes('missing')) {
        insights.suggestedModules.push({ name: 'Compliance Gap Analyzer', category: 'Compliance & Auditing', priority: 'high' });
      }
    }

    if (q.includes('ship') || q.includes('transport') || q.includes('deliver') || q.includes('logistics') || q.includes('envio')) {
      insights.identifiedTopics.push('logistics_optimization');
      insights.assignedCowboys.push('routeRanger', 'coldChainGuard', 'deliveryPredictor');
      if (q.includes('track') || q.includes('where') || q.includes('status')) {
        insights.suggestedModules.push({ name: 'Real-Time Shipment Tracker', category: 'Logistics', priority: 'high' });
        insights.workflowOpportunities.push('GPS Shipment Monitoring Workflow');
      }
      if (q.includes('cold') || q.includes('temperature') || q.includes('refriger')) {
        insights.suggestedModules.push({ name: 'Cold Chain Alert System', category: 'Logistics', priority: 'critical' });
      }
    }

    if (q.includes('grower') || q.includes('supplier') || q.includes('productor') || q.includes('farm')) {
      insights.identifiedTopics.push('supplier_management');
      insights.assignedCowboys.push('growerScout', 'farmProfiler', 'yieldPredictor');
      if (q.includes('find') || q.includes('search') || q.includes('buscar')) {
        insights.suggestedModules.push({ name: 'Advanced Grower Search', category: 'Grower Intelligence', priority: 'medium' });
      }
      if (q.includes('new') || q.includes('register') || q.includes('onboard')) {
        insights.suggestedModules.push({ name: 'Grower Onboarding Wizard', category: 'Grower Intelligence', priority: 'high' });
        insights.workflowOpportunities.push('Automated Grower Verification Process');
      }
    }

    if (q.includes('quality') || q.includes('lab') || q.includes('test') || q.includes('calidad')) {
      insights.identifiedTopics.push('quality_control');
      insights.assignedCowboys.push('qualityMarshal', 'pesticideScanner', 'microbeDetector');
      if (q.includes('report') || q.includes('result')) {
        insights.suggestedModules.push({ name: 'Lab Results Dashboard', category: 'Quality Control', priority: 'medium' });
      }
      if (q.includes('fail') || q.includes('reject') || q.includes('problem')) {
        insights.suggestedModules.push({ name: 'Quality Issue Tracker', category: 'Quality Control', priority: 'high' });
        insights.workflowOpportunities.push('Automated Quality Alert System');
        insights.priority = 'high';
      }
    }

    if (q.includes('payment') || q.includes('invoice') || q.includes('financ') || q.includes('pago')) {
      insights.identifiedTopics.push('financial_operations');
      insights.assignedCowboys.push('cashWrangler', 'invoiceAuditor', 'factoringEngine');
    }

    return insights;
  },

  generateModuleSpec: function(mod) {
    return {
      ...mod,
      generatedAt: new Date().toISOString(),
      id: `MOD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  },

  generateWorkflowSpec: function(wf) {
    return {
      name: wf,
      generatedAt: new Date().toISOString(),
      id: `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  },

  saveToLocalStorage: function() {
    try {
      localStorage.setItem('auditdna_learning', JSON.stringify(this.sessionData));
      return true;
    } catch (e) {
      console.error('Failed to save learning data:', e);
      return false;
    }
  },

  exportData: function() {
    return {
      exportedAt: new Date().toISOString(),
      session: this.sessionData,
      summary: {
        totalQuestions: this.sessionData.userQuestions.length,
        identifiedNeeds: this.sessionData.identifiedNeeds.length,
        suggestedModules: this.sessionData.suggestedModules.length,
        generatedWorkflows: this.sessionData.generatedWorkflows.length
      }
    };
  }
};

// ================================================================================
// SECURITY - CLASSIFIED KEYWORDS BLOCK
// ================================================================================

const CLASSIFIED_KEYWORDS = [
  'password', 'pin', 'login', 'credential', 'secret', 'api key', 'database', 'server',
  'backend', 'admin', 'internal', 'workflow', 'process', 'architecture', 'source code',
  'algorithm', 'proprietary', 'margin', 'profit', 'cost structure', 'pricing strategy',
  'commission', 'employee', 'salary', 'payroll', 'financial statement', 'revenue',
  'client list', 'customer data', 'contact list', 'buyer list', 'supplier list',
  'contract', 'agreement', 'nda', 'confidential', 'classified', 'bank account',
  'routing number', 'credit card', 'payment info', 'patent', 'invention', 'trade secret',
  'clave', 'usuario', 'acceso', 'sistema interno', 'proceso interno', 'contrasena'
];

// ================================================================================
// MARKET DATA
// ================================================================================

const MARKET_PRICES = {
  avocado: { price: 42.50, change: '+2.3%', origin: 'Michoacan MX' },
  tomato: { price: 18.75, change: '+0.5%', origin: 'Sinaloa MX' },
  strawberry: { price: 32.00, change: '+4.1%', origin: 'Baja California' },
  romaine: { price: 19.80, change: '-1.2%', origin: 'Salinas CA' },
  lime: { price: 28.50, change: '+3.8%', origin: 'Veracruz MX' },
  mango: { price: 36.00, change: '+0.2%', origin: 'Nayarit MX' },
  cucumber: { price: 14.25, change: '-2.1%', origin: 'Sonora MX' },
  pepper: { price: 22.00, change: '+1.5%', origin: 'Sinaloa MX' },
  grape: { price: 45.00, change: '+5.2%', origin: 'Sonora MX' },
  blueberry: { price: 48.00, change: '+3.2%', origin: 'Jalisco MX' },
  raspberry: { price: 52.00, change: '+2.8%', origin: 'Baja California' },
  onion: { price: 12.50, change: '-1.8%', origin: 'Chihuahua MX' },
  garlic: { price: 35.00, change: '+2.1%', origin: 'Guanajuato MX' },
  jalapeno: { price: 19.00, change: '+1.9%', origin: 'Chihuahua MX' },
  asparagus: { price: 44.20, change: '+3.8%', origin: 'Sonora MX' }
};

// ================================================================================
// INTELLIGENT RESPONSE ENGINE WITH LEARNING
// ================================================================================

const getIntelligentResponse = (question, setActiveModule, onLearningUpdate) => {
  const q = question.toLowerCase().trim();
  const isSpanish = /[\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00bf\u00a1]/.test(question) || q.includes('hola') || q.includes('precio') || q.includes('como') || q.includes('que');

  const insights = AI_LEARNING_ENGINE.analyzeQuestion(question);

  AI_LEARNING_ENGINE.sessionData.userQuestions.push({
    question: question,
    timestamp: new Date().toISOString(),
    language: isSpanish ? 'es' : 'en'
  });

  if (insights.identifiedTopics.length > 0) {
    AI_LEARNING_ENGINE.sessionData.identifiedNeeds.push(...insights.identifiedTopics);
  }

  if (insights.suggestedModules.length > 0) {
    insights.suggestedModules.forEach(mod => {
      const spec = AI_LEARNING_ENGINE.generateModuleSpec(mod);
      AI_LEARNING_ENGINE.sessionData.suggestedModules.push(spec);
    });
  }

  if (insights.workflowOpportunities.length > 0) {
    insights.workflowOpportunities.forEach(wf => {
      const spec = AI_LEARNING_ENGINE.generateWorkflowSpec(wf);
      AI_LEARNING_ENGINE.sessionData.generatedWorkflows.push(spec);
    });
  }

  AI_LEARNING_ENGINE.saveToLocalStorage();

  if (onLearningUpdate) {
    onLearningUpdate(AI_LEARNING_ENGINE.exportData());
  }

  for (const keyword of CLASSIFIED_KEYWORDS) {
    if (q.includes(keyword)) {
      return isSpanish
        ? 'Lo siento, esa informacion es confidencial y requiere acceso de administrador. Puedo ayudarte con precios, envios, o cumplimiento?'
        : 'I\'m sorry, that information is confidential and requires administrator access. Can I help you with pricing, shipping, or compliance instead?';
    }
  }

  let response = '';
  let learningNote = '';

  if (insights.suggestedModules.length > 0) {
    learningNote = isSpanish
      ? `\n\n[AI LEARNING: Detecte necesidad de "${insights.suggestedModules[0].name}" - Agregado a sugerencias de modulos]`
      : `\n\n[AI LEARNING: Detected need for "${insights.suggestedModules[0].name}" - Added to module suggestions]`;
  }

  if (q.match(/^(hi|hello|hey|hola|buenos|buenas|saludos|que tal)/)) {
    response = isSpanish
      ? 'Hola! Bienvenido a AuditDNA - La Plataforma Premier de Inteligencia Agricola. Tengo 35 Cowboys AI aprendiendo de cada conversacion para mejorar tu experiencia. Puedo ayudarte con: Precios de productos, Cumplimiento FSMA, Envios y logistica, Base de datos de productores. Que te gustaria saber?'
      : 'Hello! Welcome to AuditDNA - The Premier Agricultural Intelligence Platform. I have 35 AI Cowboys learning from every conversation to improve your experience. I can help you with: Product pricing, FSMA Compliance, Shipping & logistics, Grower database. What would you like to know?';
    return response;
  }

  if (q.includes('price') || q.includes('precio') || q.includes('cost') || q.includes('costo') || q.includes('how much') || q.includes('cuanto')) {
    for (const [product, data] of Object.entries(MARKET_PRICES)) {
      if (q.includes(product)) {
        response = isSpanish
          ? `PRECIO ${product.toUpperCase()} (via Price Hawk AI): $${data.price}/caja | Cambio: ${data.change} | Origen: ${data.origin}. Para analisis completo, visite CM Products Intelligence.`
          : `${product.toUpperCase()} PRICING (via Price Hawk AI): $${data.price}/case | Change: ${data.change} | Origin: ${data.origin}. For complete analysis, visit CM Products Intelligence.`;
        return response + learningNote;
      }
    }
    response = isSpanish
      ? 'PRECIOS HOY (via Price Hawk AI): Aguacate: $42.50, Tomate: $18.75, Fresa: $32.00, Lechuga: $19.80, Limon: $28.50. AuditDNA rastrea 200+ productos. Modulo recomendado: CM Products Intelligence.'
      : 'TODAY\'S PRICES (via Price Hawk AI): Avocado: $42.50, Tomato: $18.75, Strawberry: $32.00, Romaine: $19.80, Lime: $28.50. AuditDNA tracks 200+ commodities. Recommended module: CM Products Intelligence.';
    return response + learningNote;
  }

  if (q.includes('ship') || q.includes('envio') || q.includes('transport') || q.includes('logistics') || q.includes('logistica') || q.includes('border') || q.includes('frontera') || q.includes('port')) {
    response = isSpanish
      ? 'ESTADO LOGISTICO (via Route Ranger AI): Otay Mesa: 2-3 hrs espera | Nogales: 1-2 hrs | Pharr: 3-4 hrs. Tarifas: Mexico-LA $2.85/milla, Mexico-Texas $2.45/milla. Monitoreo de cadena de frio disponible. Modulo: Logistics Center.'
      : 'LOGISTICS STATUS (via Route Ranger AI): Otay Mesa: 2-3 hrs wait | Nogales: 1-2 hrs | Pharr: 3-4 hrs. Rates: Mexico-LA $2.85/mile, Mexico-TX $2.45/mile. Cold chain monitoring available. Module: Logistics Center.';
    return response + learningNote;
  }

  if (q.includes('compliance') || q.includes('cumplimiento') || q.includes('fsma') || q.includes('certif') || q.includes('audit') || q.includes('fda')) {
    response = isSpanish
      ? 'CUMPLIMIENTO (via Compliance Sheriff AI): Certificaciones: FSMA 204 (Obligatorio 2026), PrimusGFS, GlobalGAP, SENASICA. Nuestros Cowboys AI monitorean vencimientos y alertas FDA. Modulo: Compliance Hub.'
      : 'COMPLIANCE STATUS (via Compliance Sheriff AI): Certifications: FSMA 204 (Mandatory 2026), PrimusGFS, GlobalGAP, SENASICA. Our AI Cowboys monitor expirations & FDA alerts. Module: Compliance Hub.';
    return response + learningNote;
  }

  if (q.includes('grower') || q.includes('productor') || q.includes('supplier') || q.includes('proveedor') || q.includes('farm')) {
    response = isSpanish
      ? 'BASE DE PRODUCTORES (via Grower Scout AI): 5,001 productores verificados, 12 regiones de Mexico, 200+ productos. Regiones: Michoacan (aguacate), Sinaloa (tomate), Baja (fresa), Sonora (uva). Modulo: Grower Database.'
      : 'GROWER DATABASE (via Grower Scout AI): 5,001 verified growers, 12 Mexican regions, 200+ products. Regions: Michoacan (avocado), Sinaloa (tomato), Baja (strawberry), Sonora (grape). Module: Grower Database.';
    return response + learningNote;
  }

  if (q.includes('quality') || q.includes('calidad') || q.includes('lab') || q.includes('test') || q.includes('pesticide')) {
    response = isSpanish
      ? 'CONTROL DE CALIDAD (via Quality Marshal AI): Pruebas disponibles: Residuos de pesticidas, Microbiologia, Calidad de agua, Composicion del suelo. Cowboys activos: Pesticide Scanner, Water Analyzer, Microbe Detector. Modulo: Quality Control.'
      : 'QUALITY CONTROL (via Quality Marshal AI): Available tests: Pesticide residue, Microbiology, Water quality, Soil composition. Active cowboys: Pesticide Scanner, Water Analyzer, Microbe Detector. Module: Quality Control.';
    return response + learningNote;
  }

  if (q.includes('trace') || q.includes('trazab') || q.includes('lot') || q.includes('lote') || q.includes('track') || q.includes('fsma 204')) {
    response = isSpanish
      ? 'TRAZABILIDAD (via Lot Tracker AI): Cumplimiento FSMA 204 completo. Capacidades: Trazabilidad campo-mesa, Numeros de lote unicos, Codigos QR, Registros blockchain. Modulo: Traceability Hub.'
      : 'TRACEABILITY (via Lot Tracker AI): Full FSMA 204 compliance. Capabilities: Farm-to-table tracing, Unique lot numbers, QR codes, Blockchain records. Module: Traceability Hub.';
    return response + learningNote;
  }

  if (q.includes('feature') || q.includes('module') || q.includes('what can') || q.includes('help') || q.includes('ayuda')) {
    response = isSpanish
      ? 'PLATAFORMA AUDITDNA - 230+ Modulos: CM Products Intelligence (19), Agricultura (50), Productores (17), Finanzas (28), Marketplace (15), Cumplimiento (20), Logistica (18), Trazabilidad (12). 35 Cowboys AI/SI activos 24/7 aprendiendo de tus necesidades.'
      : 'AUDITDNA PLATFORM - 230+ Modules: CM Products Intelligence (19), Agriculture (50), Growers (17), Finance (28), Marketplace (15), Compliance (20), Logistics (18), Traceability (12). 35 AI/SI Cowboys active 24/7 learning from your needs.';
    return response + learningNote;
  }

  if (q.includes('cowboy') || q.includes('ai') || q.includes('agent') || q.includes('robot') || q.includes('learn')) {
    response = isSpanish
      ? 'COWBOYS AI/SI ACTIVOS (35 desplegados): Price Hawk (precios), Compliance Sheriff (cumplimiento), Route Ranger (logistica), Quality Marshal (calidad), Grower Scout (productores), Cash Wrangler (finanzas), Lot Tracker (trazabilidad), Weather Watcher (clima). Cada cowboy aprende de tus preguntas para generar nuevos modulos y flujos de trabajo automaticamente.'
      : 'ACTIVE AI/SI COWBOYS (35 deployed): Price Hawk (pricing), Compliance Sheriff (compliance), Route Ranger (logistics), Quality Marshal (quality), Grower Scout (growers), Cash Wrangler (finance), Lot Tracker (traceability), Weather Watcher (weather). Each cowboy learns from your questions to auto-generate new modules and workflows.';
    return response + learningNote;
  }

  if (q.includes('weather') || q.includes('clima') || q.includes('frost') || q.includes('helada') || q.includes('storm')) {
    response = isSpanish
      ? 'ALERTAS CLIMATICAS (via Weather Watcher AI): Michoacan: Despejado 72F, Sinaloa: Parcialmente nublado 78F, Baja California: Alerta de helada esta noche, Sonora: Despejado 85F. Modulo: Weather Intelligence.'
      : 'WEATHER ALERTS (via Weather Watcher AI): Michoacan: Clear 72F, Sinaloa: Partly cloudy 78F, Baja California: Frost warning tonight, Sonora: Clear 85F. Module: Weather Intelligence.';
    return response + learningNote;
  }

  if (q.includes('financ') || q.includes('payment') || q.includes('pago') || q.includes('invoice') || q.includes('factura') || q.includes('factor')) {
    response = isSpanish
      ? 'SERVICIOS FINANCIEROS (via Cash Wrangler AI): Factoraje (hasta 90% adelanto), Financiamiento PO, Cartas de credito, Seguros de carga, Pagos ACH/Wire. Programa Pequeno Productor disponible. Modulo: Finance Center.'
      : 'FINANCIAL SERVICES (via Cash Wrangler AI): Invoice factoring (up to 90% advance), PO financing, Letters of credit, Cargo insurance, ACH/Wire payments. Small Grower Program available. Module: Finance Center.';
    return response + learningNote;
  }

  if (q.includes('crm') || q.includes('email') || q.includes('contact') || q.includes('contacto') || q.includes('call')) {
    response = isSpanish
      ? 'CRM Y COMUNICACIONES: Zadarma CRM con 23,000+ contactos, Email Marketing, SMS Gateway, Call Center integrado. Contacto: Saul@mexausafg.com. Modulo: Saul Intel CRM.'
      : 'CRM & COMMUNICATIONS: Zadarma CRM with 23,000+ contacts, Email Marketing, SMS Gateway, integrated Call Center. Contact: Saul@mexausafg.com. Module: Saul Intel CRM.';
    return response + learningNote;
  }

  if (q.includes('register') || q.includes('registr') || q.includes('signup') || q.includes('inscrib') || q.includes('join')) {
    response = isSpanish
      ? 'REGISTRO DE PRODUCTORES: 1) Ir a Grower Database, 2) Clic en "Add Grower", 3) Completar: Nombre, Ubicacion, Productos, Contacto, 4) Subir certificaciones. Programa Pequeno Productor: Tier 0-3 disponible. Modulo: Grower Management.'
      : 'GROWER REGISTRATION: 1) Go to Grower Database, 2) Click "Add Grower", 3) Complete: Name, Location, Products, Contact, 4) Upload certifications. Small Grower Program: Tier 0-3 available. Module: Grower Management.';
    return response + learningNote;
  }

  response = isSpanish
    ? 'Gracias por tu pregunta. AuditDNA puede ayudarte con: Precios de 200+ productos, Cumplimiento FSMA, Logistica, 5,000+ productores, Trazabilidad, Finanzas. Mis 35 Cowboys AI estan aprendiendo de tu pregunta para mejorar la plataforma. Intenta preguntar: "precio de aguacate", "estado de cumplimiento", "informacion de envios". Como puedo ayudarte?'
    : 'Thanks for your question. AuditDNA can help you with: Pricing for 200+ products, FSMA Compliance, Logistics, 5,000+ growers, Traceability, Finance. My 35 AI Cowboys are learning from your question to improve the platform. Try asking: "avocado price", "compliance status", "shipping info". How can I help you?';
  return response + learningNote;
};

// ================================================================================
// EMAIL DATA FUNCTION
// ================================================================================

const sendLearningDataEmail = async (data) => {
  try {
    const emailData = {
      to: 'Saul@mexausafg.com',
      subject: `AuditDNA AI Learning Report - ${new Date().toLocaleDateString()}`,
      body: JSON.stringify(data, null, 2)
    };

    await fetch('http://localhost:5050/api/email/send-learning-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    }).catch(() => {
      console.log('Backend not available - data saved locally');
    });

    return true;
  } catch (e) {
    console.error('Email send failed:', e);
    return false;
  }
};

// ================================================================================
// MAIN APP COMPONENT
// ================================================================================

const App = () => {
  // AUTHENTICATION GATE - Backend JWT + bcrypt
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  localStorage.removeItem('mfg_token');
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [loginPass, setLoginPass] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';

  useEffect(() => {
    const token = localStorage.getItem('mfg_token');
    if (!token) { setAuthLoading(false); return; }
    fetch(`${API_BASE}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) { setIsAuthenticated(true); setAuthUser(data.user); }
        else { localStorage.removeItem('mfg_token'); }
      })
      .catch(() => { localStorage.removeItem('mfg_token'); })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogin = async () => {
    if (!loginPass || !loginCode || !loginPin) { setLoginError('Password, access code, and PIN required'); return; }
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPass, accessCode: loginCode, pin: loginPin }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('mfg_token', data.token);
        setIsAuthenticated(true);
        setAuthUser(data.user);
        setLoginError('');
      } else {
        setLoginError(data.error || 'Authentication failed');
        setLoginPass(''); setLoginCode(''); setLoginPin('');
      }
    } catch (err) {
      setLoginError('Server unreachable. Check backend connection.');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' }); } catch {}
    localStorage.removeItem('mfg_token');
    setIsAuthenticated(false);
    setAuthUser(null);
  };

  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeModule, setActiveModule] = useState('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState('en');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tickerOffset, setTickerOffset] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [learningData, setLearningData] = useState(null);
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const chatEndRef = useRef(null);
  const [missionControlOpen, setMissionControlOpen] = useState(false);
  const [commandSphereOpen, setCommandSphereOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState({ backend: 'checking', database: 'checking' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let animationFrameId;
    let offset = 0;
    const animate = () => {
      offset -= 0.8;
      if (offset < -8000) offset = 0;
      setTickerOffset(offset);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const checkServers = async () => {
      try {
        const response = await fetch('http://localhost:5050/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          setServerStatus({ backend: 'online', database: 'online' });
        } else {
          setServerStatus({ backend: 'offline', database: 'offline' });
        }
      } catch (e) {
        setServerStatus({ backend: 'offline', database: 'offline' });
      }
    };
    checkServers();
    const interval = setInterval(checkServers, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (learningData && learningData.summary.totalQuestions > 0 && learningData.summary.totalQuestions % 10 === 0) {
      sendLearningDataEmail(learningData);
    }
  }, [learningData]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundImage: "url('/Salinas-Sign.png')", backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #334155', borderTop: '3px solid #cba658', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: '#94a3b8', fontSize: 11, letterSpacing: '3px' }}>AUTHENTICATING...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundImage: "url('/Salinas-Sign.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', -apple-system, sans-serif", position: 'relative' }}>
        <div style={{ width: 400, padding: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/seabass2.jpg" alt="MexaUSA Food Group" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(203,166,88,0.4)', marginBottom: 16 }} />
            <div style={{ fontSize: 15, letterSpacing: '6px', color: '#cba658', fontWeight: 800, marginBottom: 4 }}>MEXAUSA FOOD GROUP, INC.</div>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, #cba658, transparent)', margin: '10px auto' }} />
            <div style={{ fontSize: 9, letterSpacing: '2px', color: '#e2e8f0' }}>Proprietary Software Designed by Saul Garcia</div>
            <div style={{ fontSize: 9, letterSpacing: '1px', color: '#cbd5e1', marginTop: 6, fontStyle: 'italic' }}>For my beautiful Son, Diego Sebastian, for your patience and belief in me.</div>
          </div>

          <div style={{ background: 'rgba(10,15,26,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(203,166,88,0.25)', borderRadius: 8, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ fontSize: 10, letterSpacing: '2px', color: '#cba658', fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>SAUL GARCIA -- ACCESS ONLY</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '1.5px', color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>PASSWORD</label>
              <input type="password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Enter password"
                disabled={loginLoading}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(203,166,88,0.3)', color: '#ffffff', fontSize: 14, borderRadius: 6, outline: 'none', boxSizing: 'border-box', letterSpacing: '2px' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '1.5px', color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>ACCESS CODE</label>
              <input type="password" value={loginCode} onChange={e => { setLoginCode(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Access code"
                disabled={loginLoading}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(203,166,88,0.3)', color: '#ffffff', fontSize: 14, borderRadius: 6, outline: 'none', boxSizing: 'border-box', letterSpacing: '2px', textAlign: 'center' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '1.5px', color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>PIN</label>
              <input type="password" value={loginPin} onChange={e => { setLoginPin(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="PIN"
                maxLength={10}
                disabled={loginLoading}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(203,166,88,0.3)', color: '#ffffff', fontSize: 14, borderRadius: 6, outline: 'none', boxSizing: 'border-box', letterSpacing: '8px', textAlign: 'center' }} />
            </div>

            {loginError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 11, marginBottom: 16, textAlign: 'center', fontWeight: 600 }}>{loginError}</div>
            )}

            <button onClick={handleLogin} disabled={loginLoading}
              style={{ width: '100%', padding: '14px', background: loginLoading ? '#64748b' : 'linear-gradient(135deg, #cba658, #b8944d)', border: 'none', borderRadius: 6, color: '#0f172a', fontSize: 12, fontWeight: 800, letterSpacing: '3px', cursor: loginLoading ? 'wait' : 'pointer' }}>
              {loginLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
            </button>

            <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontSize: 8, letterSpacing: '1px', fontWeight: 600 }}>SECURED WITH JWT + BCRYPT ENCRYPTION</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <div style={{ fontSize: 9, color: '#e2e8f0', letterSpacing: '1px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Mexausa Food Group, Inc.</div>
            <div style={{ fontSize: 8, color: '#cbd5e1', marginTop: 4, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Unauthorized access is prohibited and monitored</div>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================================
  const MODULES = {
    'CRM & Communications': { color: '#cba658', count: 8, modules: ['Saul Intel CRM', 'Email Marketing', 'Call Center', 'SMS Gateway', 'Contacts', 'Secure Buyers'] },
    'CM Products Intelligence': { color: '#cba658', count: 19, modules: ['CM Dashboard'] },
    'Agriculture & Commodities': { color: '#cba658', count: 50, modules: ['Grower Database', 'Grower Management', 'USDA Intel', 'USDA Dashboard', 'USDA Grower Search', 'Seasonal Calendar', 'Buyer Network', 'Quality Control', 'Cold Chain', 'Harvest Tracker', 'Ag Intel Master', 'Price Alerts', 'Recon Engine', 'Field Operations'] },
    'Grower Intelligence': { color: '#cba658', count: 11, modules: ['Grower Portal', 'Grower Intelligence', 'Grower Master', 'Grower Recommendations', 'Registration', 'Product Listing', 'Compliance Assist', 'Unified Sourcing', 'Small Grower Intel'] },
    'Marketplace': { color: '#cba658', count: 15, modules: ['Marketplace', 'Product Catalog', 'Orders', 'Shipping', 'Customer Portal', 'Customer Portal Advanced', 'Document Vault', 'Mobile Sales Upload'] },
    'Financial Services': { color: '#cba658', count: 28, modules: ['Finance Dashboard', 'Financial Services Hub', 'Finance Center', 'Small Grower Finance', 'Grower Finance', 'CM Products Finance', 'Finance Access Control', 'Invoice Factoring', 'PO Finance', 'AR/AP', 'Accounting Hub', 'Accounting Dashboard', 'Reports', 'Elite Analytics', 'Elite Beast', 'Analytics Dashboard'] },
    'Compliance & Auditing': { color: '#cba658', count: 18, modules: ['Compliance Hub', 'FSMA 204', 'GlobalGAP', 'PrimusGFS', 'SENASICA', 'Audit Manager', 'Travel Protection', 'Traveler Protection'] },
    'Agricultural Testing (81 AI)': { color: '#06b6d4', count: 9, modules: ['WaterTech Pro', 'SoilTech Pro', 'Fertilizer Analysis', 'Seed Germination', 'Traceability Hub', 'Lot Tracking', 'Chain of Custody', 'Recall Manager', 'QR Generator'] },
    'LATAM Intelligence': { color: '#cba658', count: 17, modules: ['LATAM Dashboard', 'Mexico Market', 'Central America', 'South America', 'International Travel Security', 'MAUTTR Registry', 'MAUTTR QR Scanner', 'MAUTTR Vehicles'] },
    'Real Estate (NMLS #337526)': { color: '#cba658', count: 29, modules: ['Mortgage Loan Hub', '1003 Application', 'USDA 502 Housing', 'Mexico Real Estate', 'SII-MX', 'Sistema Inmobiliario', 'Gestion Inmobiliaria MX', 'Mortgage Calc', 'Property Search'] },
    'Spartan 300': { color: '#cba658', count: 11, modules: ['Consumer Protection', 'Mortgage Audit', 'TILA Analysis', 'Dispute Letters'] },
    'Trojan 700': { color: '#cba658', count: 11, modules: ['Enterprise Audit', 'Corporate Compliance', 'SOX Audit', 'Risk Assessment'] },
    'AI & SI (81 Agents)': { color: '#cba658', count: 26, modules: ['AI Dashboard', 'Document Analysis AI', 'Agent Manager', 'OCR Reader', 'Document AI', 'Compliance AI', 'Intelligence Dashboard', 'Multi-AI Verification'] },
    'Access Control': { color: '#cba658', count: 8, modules: ['Access Control', 'User Management', 'Role Permissions', 'Tenant Management', 'Manage Clients', 'Client Accounts', 'Settings', 'Notifications'] }
  };

  const worldClocks = [
    { city: 'LA', offset: -8 }, { city: 'ENSENADA', offset: -8 }, { city: 'CDMX', offset: -6 },
    { city: 'YUMA', offset: -7 }, { city: 'SALINAS', offset: -8 }, { city: 'NY', offset: -5 },
    { city: 'MIAMI', offset: -5 }, { city: 'LONDON', offset: 0 }, { city: 'TOKYO', offset: 9 }, { city: 'SYDNEY', offset: 11 }
  ];

  const getTimeForZone = (offset) => {
    const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * offset)).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  const marketData = [
    { name: 'Hass Avocado 48ct', price: 42.50, change: 2.9, location: 'Michoacan MX' },
    { name: 'Strawberries 8x1lb', price: 32.10, change: -1.2, location: 'Baja CA MX' },
    { name: 'Blueberries 12x6oz', price: 28.50, change: 2.1, location: 'Baja CA MX' },
    { name: 'Tomato Roma 25lb', price: 21.90, change: 1.2, location: 'Sinaloa MX' },
    { name: 'Bell Pepper Red', price: 23.70, change: 1.9, location: 'Sinaloa MX' },
    { name: 'Romaine 24ct', price: 18.76, change: 1.5, location: 'Salinas CA' },
    { name: 'Asparagus 11lb', price: 44.20, change: 3.8, location: 'Sonora MX' },
    { name: 'Cucumber 1 1/9bu', price: 19.50, change: 0.8, location: 'Sonora MX' },
    { name: 'Cantaloupe 9ct', price: 16.80, change: -0.5, location: 'Sonora MX' },
    { name: 'Watermelon Mini', price: 12.40, change: 1.1, location: 'Sonora MX' },
    { name: 'S&P 500', price: 5850, change: 0.4, location: 'NYSE' },
    { name: 'NASDAQ', price: 18420, change: 0.6, location: 'NASDAQ' },
    { name: 'DOW', price: 43180, change: 0.3, location: 'NYSE' }
  ];

  const moduleMap = {
    'Predictive Analyzer': <div style={{padding:'40px',color:'#94a3b8',textAlign:'center'}}>Predictive Analyzer - Coming Soon</div>,
    'Analytics Predictions': <div style={{padding:'40px',color:'#94a3b8',textAlign:'center'}}>Analytics Predictions - Coming Soon</div>,
    'CM Predictions': <div style={{padding:'40px',color:'#94a3b8',textAlign:'center'}}>CM Predictions - Coming Soon</div>,
    'SII-MX': <SII_MX />,
    'Sistema Inmobiliario': <SII_MX />,
    'Gestion Inmobiliaria MX': <SII_MX />,
    'Grower Recommendations': <GrowerRecommendationEngine />,
    'Fertilizer Analysis': <FertilizerAnalysis />,
    'Seed Germination': <SeedGermination />,
    'Document Analysis AI': <DocumentAnalysisAI />,
    'Saul Intel CRM': <ZadarmaCRM />, 'Email Marketing': <EmailMarketing />, 'Call Center': <ZadarmaCRM />, 'SMS Gateway': <ZadarmaCRM />, 'Contacts': <ZadarmaCRM />, 'Secure Buyers': <SecureBuyersIntelligence />,
    'CM Dashboard': <CMProductsOmegaIntelligence />,
    'Logistics': <LogisticsCenter />,
    'Grower Database': <GrowerManagementHub />, 'Grower Management': <GrowerManagementHub />, 'USDA Intel': <USDAIntelligenceDashboard />, 'USDA Dashboard': <USDAIntelligenceDashboard />, 'USDA Grower Search': <USDAGrowerSearchEngine />, 'Seasonal Calendar': <SeasonalCalendar />, 'Buyer Network': <BuyerNetwork />,
    'Quality Control': <QualityControl />, 'Cold Chain': <ColdChainMonitoring />, 'Harvest Tracker': <FieldOperations />, 'Ag Intel Master': <AgriculturalIntelligenceMaster />,
    'Grower Portal': <GrowerIntelligence />, 'Grower Intelligence': <GrowerIntelligence />, 'Grower Master': <GrowerMaster />, 'Registration': <GrowerIntelligence />, 'Product Listing': <GrowerIntelligence />, 'Compliance Assist': <GrowerIntelligence />, 'Small Grower Intel': <SmallGrowerIntelligence />,
    'Finance Dashboard': <FinancialDashboard />, 'Financial Services Hub': <FinancialServicesHub />, 'Finance Center': <FinanceMasterModule />, 'Small Grower Finance': <FinanceOperations />, 'Grower Finance': <FinanceOperations />, 'CM Products Finance': <FinanceMasterModule />, 'Finance Access Control': <FinanceMasterModule />, 'Invoice Factoring': <FinanceMasterModule />, 'PO Finance': <FinanceMasterModule />, 'AR/AP': <FinanceOperations />, 'Accounting Hub': <AccountingHub />, 'Reports': <ReportsCenter />, 'Elite Analytics': <AuditDNA_Elite_Analytics />, 'Elite Beast': <AuditDNA_ELITE_BEAST />,
    'Compliance Hub': <Compliance />, 'FSMA 204': <Compliance />, 'GlobalGAP': <Compliance />, 'PrimusGFS': <Compliance />, 'SENASICA': <Compliance />, 'Audit Manager': <Compliance />,
    'Traceability Hub': <TraceabilityHub />, 'Lot Tracking': <TraceabilityHub />, 'Chain of Custody': <TraceabilityHub />, 'Recall Manager': <TraceabilityHub />, 'QR Generator': <TraceabilityHub />,
    'WaterTech Pro': <WaterTech />,
    'SoilTech Pro': <SoilTech />,
    'Marketplace': <Marketplace />, 'Product Catalog': <Marketplace />, 'Orders': <Marketplace />, 'Shipping': <LogisticsCenter />,
    'LATAM Dashboard': <LATAMIntelligence />, 'Mexico Market': <LATAMIntelligence />, 'Central America': <LATAMIntelligence />, 'South America': <LATAMIntelligence />, 'International Travel Security': <TravelProtection />, 'MAUTTR Registry': <TravelProtection />, 'MAUTTR QR Scanner': <TravelProtection />, 'MAUTTR Vehicles': <TravelProtection />,
    'Mortgage Loan Hub': <MortgageLoanHub />, '1003 Application': <MortgageLoanHub />, 'USDA 502 Housing': <USDA502RuralHousing />, 'Mexico Real Estate': <SII_MX />, 'Mortgage Calc': <MortgageLoanHub />, 'Property Search': <MexicoRealEstate />,
    'Consumer Protection': <Spartan300 />, 'Mortgage Audit': <Spartan300 />, 'TILA Analysis': <Spartan300 />, 'Dispute Letters': <Spartan300 />,
    'Enterprise Audit': <Trojan700 />, 'Corporate Compliance': <Trojan700 />, 'SOX Audit': <Trojan700 />, 'Risk Assessment': <Trojan700 />,
    'Intelligence Dashboard': <IntelligenceDashboard />, 'Master Dashboard': <IntelligenceDashboard />, 'AI Command Center': <IntelligenceDashboard />,
    'Multi-AI Verification': <MultiAIUploadInterface />,
    'Settings': <SettingsPreferences />, 'Notifications': <NotificationsCenter />, 'Customer Portal': <CustomerPortal />, 'Document Vault': <DocumentVault />,
    'Access Control': <AccessControl />, 'User Management': <AccessControl />, 'Role Permissions': <AccessControl />,
    'Tenant Management': <TenantAdmin />, 'Manage Clients': <TenantAdmin />, 'Client Accounts': <TenantAdmin />,
    'Travel Protection': <TravelProtection />, 'Traveler Protection': <TravelProtection />,
    'AI Dashboard': <AgentDashboard />, 'Agent Manager': <AgentDashboard />, 'OCR Reader': <DocumentAnalysisAI />, 'Document AI': <DocumentAnalysisAI />, 'Compliance AI': <Compliance />,
    'Accounting Dashboard': <AccountingHub />, 'Customer Portal Advanced': <CustomerPortalAdvanced />, 'Unified Sourcing': <AgriculturalIntelligenceMaster />,
    'Price Alerts': <PriceAlertPingSystem />, 'Recon Engine': <UltimateReconEngine />,
    'Mobile Sales Upload': <MobileSalesUpload />, 'Analytics Dashboard': <Analytics />,
    'Field Operations': <FieldOperations />, 'Traceability': <Traceability />
  };

  const renderModule = () => {
    if (moduleMap[activeModule]) {
      return <React.Suspense fallback={<ModuleLoader />}>{moduleMap[activeModule]}</React.Suspense>;
    }
    if (activeModule === 'Dashboard') {
      return <Dashboard setActiveModule={setActiveModule} />;
    }
    return (
      <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#cba658', fontSize: '24px', marginBottom: '8px' }}>{activeModule}</h1>
        <p style={{ color: '#94a3b0', fontSize: '16px' }}>Module loading...</p>
        <button onClick={() => setActiveModule('Dashboard')} style={{ marginTop: '16px', padding: '10px 20px', background: '#cba658', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Back to Dashboard</button>
      </div>
    );
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { type: 'user', text: chatInput }]);
    const userQuestion = chatInput;
    setChatInput('');
    setIsTyping(true);
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      setIsTyping(false);
      const response = getIntelligentResponse(userQuestion, setActiveModule, setLearningData);
      setChatMessages(prev => [...prev, { type: 'bot', text: response }]);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 800);
  };

  const downloadLearningData = () => {
    const data = AI_LEARNING_ENGINE.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditdna_ai_learning_${Date.now()}.json`;
    a.click();
  };

  return (
    <IntelligenceProvider>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        {/* HEADER */}
        <header style={{ background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(148,163,176,0.15)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #cba658 0%, #b8944d 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="#0f172a" />
            </div>
            <div>
              <div style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '700', letterSpacing: '-0.5px' }}>AuditDNA</div>
              <div style={{ color: '#94a3b0', fontSize: '10px' }}>An AI & SI Agriculture Platform Designed by Saul Garcia</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(148,163,176,0.1)', border: '1px solid rgba(148,163,176,0.2)', borderRadius: '6px', cursor: 'pointer' }}>
              <Globe size={14} color="#cba658" />
              <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600' }}>{language.toUpperCase()}</span>
            </button>
            <button onClick={() => setCommandSphereOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <span style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '600' }}>Command Sphere</span>
            </button>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}>
              <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>LOGOUT</span>
            </button>
          </div>
        </header>

        {/* MARKET TICKER */}
        <div style={{ background: 'linear-gradient(90deg, rgba(254,248,231,0.03) 0%, rgba(247,241,218,0.05) 50%, rgba(254,248,231,0.03) 100%)', borderBottom: '1px solid rgba(148,163,176,0.1)', padding: '6px 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '40px', transform: `translateX(${tickerOffset}px)`, whiteSpace: 'nowrap' }}>
            {[...marketData, ...marketData].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#94a3b0', fontSize: '11px', fontWeight: '600' }}>{item.name}</span>
                <span style={{ color: '#cba658', fontSize: '11px', fontWeight: '700' }}>${item.price.toLocaleString()}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: item.change >= 0 ? '#86efac' : '#fca5a5', fontSize: '10px' }}>
                  {item.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </span>
                <span style={{ color: '#64748b', fontSize: '9px' }}>{item.location}</span>
              </div>
            ))}
          </div>
        </div>

        {/* WORLD CLOCKS */}
        <div style={{ background: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(148,163,176,0.1)', padding: '6px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {worldClocks.map((clock, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#64748b', fontSize: '9px' }}>{clock.city}</span>
                <span style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: '600' }}>{getTimeForZone(clock.offset)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)', animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: '700' }}>LIVE</span>
              <div style={{ width: '1px', height: '12px', background: 'rgba(34,197,94,0.3)' }} />
              <span style={{ color: '#94a3b0', fontSize: '10px', fontWeight: '600', fontFamily: 'monospace' }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span style={{ color: '#cba658', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' }}>
                {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={12} color={serverStatus.backend === 'online' ? '#22c55e' : '#ef4444'} />
              <span style={{ color: serverStatus.backend === 'online' ? '#22c55e' : '#ef4444', fontSize: '10px' }}>Backend</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={12} color={serverStatus.database === 'online' ? '#22c55e' : '#ef4444'} />
              <span style={{ color: serverStatus.database === 'online' ? '#22c55e' : '#ef4444', fontSize: '10px' }}>Database</span>
            </div>
            <button onClick={() => setMissionControlOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(203,166,88,0.1)', border: '1px solid rgba(203,166,88,0.3)', borderRadius: '4px', cursor: 'pointer' }}>
              <Zap size={12} color="#cba658" />
              <span style={{ color: '#cba658', fontSize: '10px', fontWeight: '600' }}>Mission Control</span>
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <aside style={{ width: sidebarCollapsed ? '48px' : '220px', background: 'rgba(15,23,42,0.95)', borderRight: '1px solid rgba(148,163,176,0.1)', overflow: 'hidden', transition: 'width 0.2s ease', flexShrink: 0, position: 'relative' }}>
            {/* COLLAPSE TOGGLE */}
            <button onClick={() => setSidebarCollapsed(c => !c)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ position: 'absolute', top: 8, right: 6, zIndex: 10, width: 24, height: 24, background: 'rgba(203,166,88,0.12)', border: '1px solid rgba(203,166,88,0.25)', borderRadius: 4, color: '#cba658', fontSize: 10, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              {sidebarCollapsed ? '>' : '<'}
            </button>
            {!sidebarCollapsed && (
              <div style={{ overflowY: 'auto', height: '100%' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(148,163,176,0.1)', paddingRight: 36 }}>
                  <div style={{ color: '#cba658', fontSize: '12px', fontWeight: '700' }}>{language === 'en' ? 'CLIENT MODULES' : 'MODULOS DEL CLIENTE'}</div>
                  <div style={{ color: '#6b7280', fontSize: '11px' }}>230 Total</div>
                </div>
                <button onClick={() => setActiveModule('Dashboard')} style={{ width: '100%', padding: '10px 14px', background: activeModule === 'Dashboard' ? 'rgba(203,166,88,0.15)' : 'transparent', border: 'none', borderLeft: activeModule === 'Dashboard' ? '3px solid #cba658' : '3px solid transparent', textAlign: 'left', color: activeModule === 'Dashboard' ? '#cba658' : '#e2e8f0', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{language === 'en' ? 'Dashboard' : 'Panel Principal'}</button>
                {Object.entries(MODULES).map(([cat, data]) => (
                  <div key={cat}>
                    <button onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))} style={{ width: '100%', padding: '10px 14px', background: expandedCategories[cat] ? 'rgba(148,163,176,0.08)' : 'transparent', border: 'none', borderLeft: expandedCategories[cat] ? `3px solid ${data.color}` : '3px solid transparent', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ color: '#cba658', fontSize: '12px', fontWeight: '600' }}>{cat}</div>
                        <div style={{ color: '#6b7280', fontSize: '10px' }}>{data.count} {language === 'en' ? 'modules' : 'modulos'}</div>
                      </div>
                      {expandedCategories[cat] ? <ChevronDown size={12} style={{ color: '#6b7280' }} /> : <ChevronRight size={12} style={{ color: '#6b7280' }} />}
                    </button>
                    {expandedCategories[cat] && data.modules.map((mod, i) => (
                      <button key={i} onClick={() => setActiveModule(mod)} style={{ width: '100%', padding: '8px 14px 8px 24px', background: activeModule === mod ? 'rgba(203,166,88,0.12)' : 'transparent', border: 'none', textAlign: 'left', color: activeModule === mod ? '#cba658' : '#9ca3af', fontSize: '11px', cursor: 'pointer' }}>{mod}</button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {sidebarCollapsed && (
              <div style={{ paddingTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div onClick={() => setActiveModule('Dashboard')} title="Dashboard"
                  style={{ width: 28, height: 28, borderRadius: 4, background: activeModule === 'Dashboard' ? 'rgba(203,166,88,0.2)' : 'rgba(148,163,176,0.06)', border: `1px solid ${activeModule === 'Dashboard' ? '#cba658' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: '#cba658', fontWeight: 800 }}>DB</span>
                </div>
                {Object.entries(MODULES).map(([cat, data]) => (
                  <div key={cat} title={cat}
                    style={{ width: 28, height: 28, borderRadius: 4, background: data.modules.includes(activeModule) ? 'rgba(203,166,88,0.15)' : 'rgba(148,163,176,0.06)', border: `2px solid ${data.modules.includes(activeModule) ? data.color : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => { setExpandedCategories(p => ({ ...p, [cat]: true })); setSidebarCollapsed(false); }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: data.color }} />
                  </div>
                ))}
              </div>
            )}
          </aside>
          <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            <React.Suspense fallback={<ModuleLoader />}>
              {renderModule()}
            </React.Suspense>
          </main>
        </div>

        {/* CHAT BOT BUTTON */}
        {!chatOpen && (
          <button onClick={() => setChatOpen(true)} style={{ position: 'fixed', bottom: '20px', right: '20px', width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #cba658 0%, #b8944d 100%)', border: '1px solid rgba(203,166,88,0.3)', boxShadow: '0 4px 12px rgba(203,166,88,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', backdropFilter: 'blur(10px)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <Bot size={24} color="#0f172a" />
          </button>
        )}

        {/* CHAT BOT PANEL */}
        {chatOpen && (
          <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '380px', height: '550px', background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(148,163,176,0.2)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(148,163,176,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(203,166,88,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} color="#cba658" />
                <div>
                  <div style={{ color: '#cba658', fontSize: '13px', fontWeight: '600' }}>AuditDNA Assistant</div>
                  <div style={{ color: '#22c55e', fontSize: '10px' }}>35 AI Cowboys Learning</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowLearningPanel(!showLearningPanel)} style={{ background: 'rgba(203,166,88,0.2)', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', color: '#cba658', fontSize: '10px' }}>
                  {learningData ? `${learningData.summary.totalQuestions}Q` : '0Q'}
                </button>
                <button onClick={downloadLearningData} style={{ background: 'rgba(34,197,94,0.2)', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', color: '#22c55e', fontSize: '10px' }}>
                  Export
                </button>
                <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={16} color="#6b7280" />
                </button>
              </div>
            </div>

            {showLearningPanel && learningData && (
              <div style={{ padding: '12px', background: 'rgba(203,166,88,0.05)', borderBottom: '1px solid rgba(148,163,176,0.1)', fontSize: '10px' }}>
                <div style={{ color: '#cba658', fontWeight: '600', marginBottom: '8px' }}>AI LEARNING STATUS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ color: '#94a3b8' }}>Questions: <span style={{ color: '#f1f5f9' }}>{learningData.summary.totalQuestions}</span></div>
                  <div style={{ color: '#94a3b8' }}>Needs ID: <span style={{ color: '#f1f5f9' }}>{learningData.summary.identifiedNeeds}</span></div>
                  <div style={{ color: '#94a3b8' }}>Modules: <span style={{ color: '#22c55e' }}>{learningData.summary.suggestedModules}</span></div>
                  <div style={{ color: '#94a3b8' }}>Workflows: <span style={{ color: '#22c55e' }}>{learningData.summary.generatedWorkflows}</span></div>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.length === 0 && (
                <div style={{ padding: '12px', background: 'rgba(148,163,176,0.12)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}>
                  Welcome! I'm connected to 35 AI/SI Cowboys that learn from every conversation. I'll analyze your needs and suggest new modules, workflows, and systems automatically. Ask me anything! (English & Spanish)
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: msg.type === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: msg.type === 'user' ? 'rgba(203,166,88,0.2)' : 'rgba(148,163,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', color: msg.type === 'user' ? '#cba658' : '#94a3b0', fontWeight: '600' }}>
                    {msg.type === 'user' ? 'U' : 'AI'}
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: msg.type === 'user' ? 'rgba(203,166,88,0.12)' : 'rgba(148,163,176,0.12)', color: '#e2e8f0', fontSize: '11px', maxWidth: '80%', lineHeight: '1.5' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(148,163,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b0', fontWeight: '600' }}>AI</div>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(148,163,176,0.12)', color: '#94a3b0', fontSize: '11px' }}>Analyzing with 35 AI Cowboys...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '12px', borderTop: '1px solid rgba(148,163,176,0.15)', display: 'flex', gap: '8px' }}>
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} placeholder="Ask anything - I'm learning from you..." style={{ flex: 1, padding: '10px 12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,176,0.2)', borderRadius: '6px', color: '#e2e8f0', fontSize: '12px', outline: 'none' }} />
              <button onClick={handleChatSend} style={{ padding: '10px 14px', background: '#cba658', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={14} color="#0f172a" />
              </button>
            </div>
          </div>
        )}

        {/* MISSION CONTROL MODAL */}
        <MissionControl
          isOpen={missionControlOpen}
          onClose={() => setMissionControlOpen(false)}
          onOpenCalendar={() => { setMissionControlOpen(false); setActiveModule('Seasonal Calendar'); }}
          onOpenMarketing={() => { setMissionControlOpen(false); setActiveModule('Email Marketing'); }}
          onOpenCRM={() => { setMissionControlOpen(false); setActiveModule('Saul Intel CRM'); }}
        />

        {/* COMMAND SPHERE MODAL */}
        <CommandSphere
          isOpen={commandSphereOpen}
          onClose={() => setCommandSphereOpen(false)}
          onNavigate={(module) => {
            setActiveModule(module);
            setCommandSphereOpen(false);
          }}
        />

        {/* CSS ANIMATIONS */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(34,197,94,0.6); }
            50% { opacity: 0.5; box-shadow: 0 0 16px rgba(34,197,94,0.8); }
          }
        `}</style>
      </div>
    </IntelligenceProvider>
  );
};

export default App;