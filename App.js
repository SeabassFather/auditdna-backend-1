import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Bot, Send, X, Zap, Globe, Server, Activity } from 'lucide-react';
import { IntelligenceProvider } from './context/IntelligenceEngine';
import DevineInc from './components/DevineInc';

// ================================================================================
// AUDITDNA PLATFORM v3.6.0 - ADAPTIVE AI LEARNING EDITION
// 81 Niner Miners | Auto-Module Generation | Data Capture | Email Reports
// ================================================================================

const FinancialServicesHub = React.lazy(() => import('./modules/FinancialServicesHub'));
const MissionControl = React.lazy(() => import('./modules/MissionControl'));
const CommandSphere = React.lazy(() => import('./modules/CommandSphere'));
const MexausaFoodGroupOmegaIntelligence = React.lazy(() => import('./modules/MexausaFoodGroupomegaintelligence'));
const USDAIntelligence = React.lazy(() => import('./modules/USDAIntelligence'));
const GrowerDatabase = React.lazy(() => import('./modules/GrowerDatabase'));
const FinancialServices = React.lazy(() => import('./modules/FinancialServices'));
const Traceability = React.lazy(() => import('./modules/Traceability'));
const Compliance = React.lazy(() => import('./modules/Compliance'));
const WaterTech = React.lazy(() => import('./modules/WaterTech'));
const AgriculturalTestingHub = React.lazy(() => import('./modules/AgriculturalTestingHub'));
const SoilTech = React.lazy(() => import('./modules/SoilTech'));
const Marketplace = React.lazy(() => import('./modules/Marketplace'));
const LATAMIntelligence = React.lazy(() => import('./modules/LATAMIntelligence'));
const AIAgents = React.lazy(() => import('./modules/AIAgents'));
const USDA502RuralHousing = React.lazy(() => import('./modules/USDA502RuralHousing'));
const MexicoRealEstate = React.lazy(() => import('./modules/MexicoRealEstate'));
const Spartan300 = React.lazy(() => import('./modules/Spartan300'));
const Trojan700 = React.lazy(() => import('./modules/Trojan700'));
const Analytics = React.lazy(() => import('./modules/Analytics'));
const LogisticsCenter = React.lazy(() => import('./modules/LogisticsCenter'));
const CustomerPortal = React.lazy(() => import('./modules/CustomerPortal'));
const ReportsCenter = React.lazy(() => import('./modules/ReportsCenter'));
const ProduceIntelCenter    = React.lazy(() => import('./modules/ProduceIntelCenter'));
const GrowerActivationQueue = React.lazy(() => import('./modules/GrowerActivationQueue'));
const ColdChainMonitoring = React.lazy(() => import('./modules/ColdChainMonitoring'));
const DocumentVault = React.lazy(() => import('./modules/DocumentVault'));
const NotificationsCenter = React.lazy(() => import('./modules/NotificationsCenter'));
const SettingsPreferences = React.lazy(() => import('./modules/SettingsPreferences'));
const CustomerPortalAdvanced = React.lazy(() => import('./modules/CustomerPortalAdvanced'));
const ZadarmaCRM = React.lazy(() => import('./modules/ZadarmaCRM'));
const EmailMarketing = React.lazy(() => import('./modules/EmailMarketing'));
const MobileSalesUpload = React.lazy(() => import('./modules/MobileSalesUpload'));
const TraceabilityHub = React.lazy(() => import('./modules/TraceabilityHub'));
const AccountingHub = React.lazy(() => import('./modules/AccountingHub'));
const AgentDashboard = React.lazy(() => import('./components/AgentDashboard'));
const MortgageLoanHub = React.lazy(() => import('./modules/MortgageLoanHub'));
const GrowerManagementHub = React.lazy(() => import('./modules/Growermanagementhub'));
const GrowerMaster = React.lazy(() => import('./modules/GrowerMaster'));
const UnifiedSourcing = React.lazy(() => import('./modules/UnifiedSourcing'));
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
const GmailOAuth = React.lazy(() => import('./components/GmailOAuth'));
const MarketIntelligence = React.lazy(() => import('./modules/MarketIntelligence'));
const PredictiveAnalyzer = React.lazy(() => import('./modules/Predectiveanalyzer'));
const TradeFinance = React.lazy(() => import('./modules/TradeFinance'));
const LenderMarketplace = React.lazy(() => import('./modules/LenderMarketplace'));
const Tariffs = React.lazy(() => import('./modules/Tariffs'));
const OwnerCommandCenter = React.lazy(() => import('./modules/Ownercommandcenter'));
const AgIntelligence = React.lazy(() => import('./modules/AgIntelligence'));
const AgMainPage = React.lazy(() => import('./modules/AgMainPage'));
const Agriculture = React.lazy(() => import('./modules/Agriculture'));
const LatAmProduceBuyers = React.lazy(() => import('./modules/LatAmProduceBuyers'));
const UnifiedCRM = React.lazy(() => import('./modules/UnifiedCRM'));
const ContactIntelHub = React.lazy(() => import('./modules/ContactIntelHub'));
const SaulIntelCRM = React.lazy(() => import('./modules/SaulIntelCRM'));
const WatchDashboard = React.lazy(() => import('./modules/WatchDashboard'));
const CMCreditApplication = React.lazy(() => import('./modules/CMCreditApplication'));
const CallCenter = React.lazy(() => import('./modules/CallCenter'));
const SMSGateway = React.lazy(() => import('./modules/SMSGateway'));
const SecureBuyers = React.lazy(() => import('./modules/SecureBuyers'));
const CRMWorkflow = React.lazy(() => import('./modules/Crmworkflow'));
const GrowerFinancialHub = React.lazy(() => import('./modules/Growerfinancialhub'));
const AgDashboard = React.lazy(() => import('./modules/AgDashboard'));
const AgMain = React.lazy(() => import('./modules/AgMain'));
const GrowerManagement = React.lazy(() => import('./modules/GrowerManagement'));
const USDADashboard = React.lazy(() => import('./modules/USDADashboard'));
const USDAGrowerSearchEngine = React.lazy(() => import('./modules/USDAGrowerSearchEngine'));
const WeatherIntelligence = React.lazy(() => import('./modules/WeatherIntelligence'));
const PortIntelligence = React.lazy(() => import('./modules/PortIntelligence'));
const ColdChain = React.lazy(() => import('./modules/ColdChain'));
const HarvestTracker = React.lazy(() => import('./modules/HarvestTracker'));
const AgIntelMaster = React.lazy(() => import('./modules/AgIntelMaster'));
const PriceAlerts = React.lazy(() => import('./modules/PriceAlerts'));
const ReconEngine = React.lazy(() => import('./modules/ReconEngine'));
const FieldOperations = React.lazy(() => import('./modules/Fieldoperations'));
const ContactsHub = React.lazy(() => import('./modules/ContactsHub'));
const GrowerPortal = React.lazy(() => import('./modules/GrowerPortal'));
const PipelineArchitecture = React.lazy(() => import('./modules/PipelineArchitecture'));
const BuyerPortal = React.lazy(() => import('./modules/BuyerPortal'));
const ProductionDeclaration = React.lazy(() => import('./modules/ProductionDeclaration'));
const FDACompliance = React.lazy(() => import('./modules/FDACompliance'));
const SmallGrowerProgram = React.lazy(() => import('./modules/SmallGrowerProgram'));
const Manifests = React.lazy(() => import('./modules/Manifests'));
const AgCommandCenter = React.lazy(() => import('./modules/AgCommandCenter'));
const CallForTender = React.lazy(() => import('./modules/CallForTender'));
const PriceAnalyzer = React.lazy(() => import('./modules/PriceAnalyzer'));
const ProductSubmission = React.lazy(() => import('./modules/ProductSubmission'));
const ReconBoard = React.lazy(() => import('./modules/admin/ReconBoard'));
const BCI = React.lazy(() => import('./modules/BCI'));
const QualityControl = React.lazy(() => import('./modules/QualityControl'));
const ProduceMarketWeekly = React.lazy(() => import('./modules/ProduceMarketWeekly'));
const SeasonalCalendar = React.lazy(() => import('./modules/SeasonalCalendar'));
const BuyerNetwork = React.lazy(() => import('./modules/BuyerNetwork'));
const AgriTestingHub = React.lazy(() => import('./modules/AgriculturalTestingHub'));
const GrowerActivation = React.lazy(() => import('./modules/GrowerActivation'));
const GrowerHub = React.lazy(() => import('./modules/GrowerHub'));

// PredictiveAnalyzer is now loaded above as Predectiveanalyzer

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

  ninerMiners: {
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
      assignedMiners: [],
      priority: 'normal'
    };

    if (q.includes('price') || q.includes('cost') || q.includes('precio') || q.includes('market')) {
      insights.identifiedTopics.push('pricing_intelligence');
      insights.assignedMiners.push('priceHawk', 'marketOracle', 'commodityTracker');
      if (q.includes('forecast') || q.includes('predict') || q.includes('future')) {
        insights.suggestedModules.push({ name: 'Price Forecasting Dashboard', category: 'Mexausa Food Group Intell', priority: 'high' });
        insights.workflowOpportunities.push('Automated Price Alert System');
      }
      if (q.includes('compare') || q.includes('competitor')) {
        insights.suggestedModules.push({ name: 'Competitor Price Tracker', category: 'Market Intelligence', priority: 'medium' });
      }
    }

    if (q.includes('compliance') || q.includes('fsma') || q.includes('audit') || q.includes('certif')) {
      insights.identifiedTopics.push('compliance_management');
      insights.assignedMiners.push('complianceSheriff', 'auditEngine', 'certValidator');
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
      insights.assignedMiners.push('routeRanger', 'coldChainGuard', 'deliveryPredictor');
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
      insights.assignedMiners.push('growerScout', 'farmProfiler', 'yieldPredictor');
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
      insights.assignedMiners.push('qualityMarshal', 'pesticideScanner', 'microbeDetector');
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
      insights.assignedMiners.push('cashWrangler', 'invoiceAuditor', 'factoringEngine');
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
      ? 'Hola! Bienvenido a AuditDNA - La Plataforma Premier de Inteligencia Agricola. Tengo 81 Niner Miners AI aprendiendo de cada conversacion para mejorar tu experiencia. Puedo ayudarte con: Precios de productos, Cumplimiento FSMA, Envios y logistica, Base de datos de productores. Que te gustaria saber?'
      : 'Hello! Welcome to AuditDNA - The Premier Agricultural Intelligence Platform. I have 81 Niner Miners learning from every conversation to improve your experience. I can help you with: Product pricing, FSMA Compliance, Shipping & logistics, Grower database. What would you like to know?';
    return response;
  }

  if (q.includes('price') || q.includes('precio') || q.includes('cost') || q.includes('costo') || q.includes('how much') || q.includes('cuanto')) {
    for (const [product, data] of Object.entries(MARKET_PRICES)) {
      if (q.includes(product)) {
        response = isSpanish
          ? `PRECIO ${product.toUpperCase()} (via Price Hawk AI): $${data.price}/caja | Cambio: ${data.change} | Origen: ${data.origin}. Para analisis completo, visite Mexausa Food Group Intell.`
          : `${product.toUpperCase()} PRICING (via Price Hawk AI): $${data.price}/case | Change: ${data.change} | Origin: ${data.origin}. For complete analysis, visit Mexausa Food Group Intell.`;
        return response + learningNote;
      }
    }
    response = isSpanish
      ? 'PRECIOS HOY (via Price Hawk AI): Aguacate: $42.50, Tomate: $18.75, Fresa: $32.00, Lechuga: $19.80, Limon: $28.50. AuditDNA rastrea 200+ productos. Modulo recomendado: Mexausa Food Group Intell.'
      : 'TODAY\'S PRICES (via Price Hawk AI): Avocado: $42.50, Tomato: $18.75, Strawberry: $32.00, Romaine: $19.80, Lime: $28.50. AuditDNA tracks 200+ commodities. Recommended module: Mexausa Food Group Intell.';
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
      ? 'CUMPLIMIENTO (via Compliance Sheriff AI): Certificaciones: FSMA 204 (Obligatorio 2026), PrimusGFS, GlobalGAP, SENASICA. Nuestros Niner Miners AI monitorean vencimientos y alertas FDA. Modulo: Compliance Hub.'
      : 'COMPLIANCE STATUS (via Compliance Sheriff AI): Certifications: FSMA 204 (Mandatory 2026), PrimusGFS, GlobalGAP, SENASICA. Our Niner Miners monitor expirations & FDA alerts. Module: Compliance Hub.';
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
      ? 'CONTROL DE CALIDAD (via Quality Marshal AI): Pruebas disponibles: Residuos de pesticidas, Microbiologia, Calidad de agua, Composicion del suelo. Niner Miners activos: Pesticide Scanner, Water Analyzer, Microbe Detector. Modulo: Quality Control.'
      : 'QUALITY CONTROL (via Quality Marshal AI): Available tests: Pesticide residue, Microbiology, Water quality, Soil composition. Active ninerMiners: Pesticide Scanner, Water Analyzer, Microbe Detector. Module: Quality Control.';
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
      ? 'PLATAFORMA AUDITDNA - 230+ Modulos: Mexausa Food Group Intell (19), Agricultura (50), Productores (17), Finanzas (28), Marketplace (15), Cumplimiento (20), Logistica (18), Trazabilidad (12). 81 Niner Miners AI/SI activos 24/7 aprendiendo de tus necesidades.'
      : 'AUDITDNA PLATFORM - 230+ Modules: Mexausa Food Group Intell (19), Agriculture (50), Growers (17), Finance (28), Marketplace (15), Compliance (20), Logistics (18), Traceability (12). 81 Niner Miners active 24/7 learning from your needs.';
    return response + learningNote;
  }

  if (q.includes('miner') || q.includes('ai') || q.includes('agent') || q.includes('robot') || q.includes('learn')) {
    response = isSpanish
      ? 'NINER MINERS AI/SI ACTIVOS (81 desplegados): Price Hawk (precios), Compliance Sheriff (cumplimiento), Route Ranger (logistica), Quality Marshal (calidad), Grower Scout (productores), Cash Wrangler (finanzas), Lot Tracker (trazabilidad), Weather Watcher (clima). Cada Niner Miner aprende de tus preguntas para generar nuevos modulos y flujos de trabajo automaticamente.'
      : 'ACTIVE NINER MINERS (81 deployed): Price Hawk (pricing), Compliance Sheriff (compliance), Route Ranger (logistics), Quality Marshal (quality), Grower Scout (growers), Cash Wrangler (finance), Lot Tracker (traceability), Weather Watcher (weather). Each Niner Miner learns from your questions to auto-generate new modules and workflows.';
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
    ? 'Gracias por tu pregunta. AuditDNA puede ayudarte con: Precios de 200+ productos, Cumplimiento FSMA, Logistica, 5,000+ productores, Trazabilidad, Finanzas. Mis 81 Niner Miners AI estan aprendiendo de tu pregunta para mejorar la plataforma. Intenta preguntar: "precio de aguacate", "estado de cumplimiento", "informacion de envios". Como puedo ayudarte?'
    : 'Thanks for your question. AuditDNA can help you with: Pricing for 200+ products, FSMA Compliance, Logistics, 5,000+ growers, Traceability, Finance. My 81 Niner Miners are learning from your question to improve the platform. Try asking: "avocado price", "compliance status", "shipping info". How can I help you?';
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

    await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5050'}/api/email/send-learning-report`, {
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
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [loginPass, setLoginPass] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showInfoCard, setShowInfoCard] = useState(true);
  const [loginTab,    setLoginTab]    = useState('admin');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPass,  setTenantPass]  = useState('');
  const [regStep,     setRegStep]     = useState(1);
  const [regData,     setRegData]     = useState({ entityType:'', companyLegal:'', ein:'', state:'', city:'', pacaNum:'', gapCert:false, globalGap:false, sqf:false, brc:false, fsmaTeir:'1', waterTests:false, soilTests:false, traceability:false, contactName:'', contactEmail:'', contactPhone:'', notes:'' });
  const [regLoading, setRegLoading] = useState(false);
  const [regError,   setRegError]   = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

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

  // ── AuditDNA Global Intel Bus ─────────────────────────────────────────────
  useEffect(() => {
    const onCommodityIntel = (e) => {
      window.__AuditDNA_Intel = window.__AuditDNA_Intel || {};
      window.__AuditDNA_Intel.latestCommodity = e.detail;
      window.__AuditDNA_Intel.campaigns = window.__AuditDNA_Intel.campaigns || [];
      if (e.detail?.campaign) window.__AuditDNA_Intel.campaigns.unshift(e.detail.campaign);
    };
    const onEmailQueued = (e) => { window.__AuditDNA_Intel = window.__AuditDNA_Intel || {}; (window.__AuditDNA_Intel.emailQueue = window.__AuditDNA_Intel.emailQueue||[]).unshift(e.detail); };
    const onCRMStage    = (e) => { window.__AuditDNA_Intel = window.__AuditDNA_Intel || {}; (window.__AuditDNA_Intel.crmStaged = window.__AuditDNA_Intel.crmStaged||[]).unshift(e.detail); };
    const onGrowerAct   = (e) => { window.__AuditDNA_Intel = window.__AuditDNA_Intel || {}; (window.__AuditDNA_Intel.activeGrowers = window.__AuditDNA_Intel.activeGrowers||[]).unshift(e.detail); };
    window.addEventListener('auditdna:commodity-intel',       onCommodityIntel);
    window.addEventListener('auditdna:email-campaign-queued', onEmailQueued);
    window.addEventListener('auditdna:crm-buyer-stage',       onCRMStage);
    window.addEventListener('auditdna:grower-activated',      onGrowerAct);
    return () => {
      window.removeEventListener('auditdna:commodity-intel',       onCommodityIntel);
      window.removeEventListener('auditdna:email-campaign-queued', onEmailQueued);
      window.removeEventListener('auditdna:crm-buyer-stage',       onCRMStage);
      window.removeEventListener('auditdna:grower-activated',      onGrowerAct);
    };
  }, []);

  const pingBrain = (type, payload) => { try { fetch(`${API_BASE}/api/brain/events`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ events: [{ type, payload, timestamp: Date.now() }] }) }).catch(()=>{}); } catch {} };

  const handleClientLogin = async () => {
    if (!tenantEmail || !tenantPass) { setLoginError('Email and password required'); return; }
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: tenantEmail, password: tenantPass }) });
      const data = await res.json();
      if (data.success || data.authenticated) {
        localStorage.setItem('mfg_token', data.token); setIsAuthenticated(true); setAuthUser(data.user); setLoginError('');
        pingBrain('CLIENT_LOGIN', { email: tenantEmail, role: data.user?.role });
        const role = data.user?.role?.toLowerCase();
        if      (role==='grower')     setActiveModule('Grower Intelligence');
        else if (role==='buyer')      setActiveModule('Grower Intelligence');
        else if (role==='sales')      setActiveModule('Saul Intel CRM');
        else if (role==='compliance') setActiveModule('Compliance Hub');
        else if (role==='importer')   setActiveModule('Grower Intelligence');
        try { window.dispatchEvent(new CustomEvent('auditdna:user-login', { detail: { email: tenantEmail, role, user: data.user } })); } catch {}
      }
      else { setLoginError(data.error || 'Authentication failed'); setTenantPass(''); }
    } catch { setLoginError('Server unreachable. Check backend connection.'); }
    setLoginLoading(false);
  };

  const handleRegistrationSubmit = async () => {
    if (!regData.entityType || !regData.companyLegal || !regData.contactEmail) { setRegError('Company name, entity type, and contact email are required'); return; }
    setRegLoading(true); setRegError('');
    try {
      const regPayload = { entityType:regData.entityType, companyLegal:regData.companyLegal, ein:regData.ein, state:regData.state, city:regData.city, gapCert:regData.gapCert, globalGap:regData.globalGap, sqf:regData.sqf, brc:regData.brc, fsmaTeir:regData.fsmaTeir, waterTests:regData.waterTests, soilTests:regData.soilTests, traceability:regData.traceability, contactName:regData.contactName, contactEmail:regData.contactEmail, contactPhone:regData.contactPhone, notes:regData.notes };
      await fetch(`${API_BASE}/api/growers/register-public`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(regPayload) }).catch(()=>{});
      await fetch(`${API_BASE}/api/auth/register-request`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(regPayload) }).catch(()=>{});
      pingBrain('REGISTRATION_REQUEST', { company: regData.companyLegal, email: regData.contactEmail });
      try { window.dispatchEvent(new CustomEvent('auditdna:grower-registered', { detail: { company: regData.companyLegal, email: regData.contactEmail, entityType: regData.entityType } })); } catch {}
      setRegSuccess(true);
    }
    catch { setRegSuccess(true); }
    setRegLoading(false);
  };

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' }); } catch {}
    localStorage.removeItem('mfg_token');
    setIsAuthenticated(false);
    setAuthUser(null);
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeModule, setActiveModule] = useState('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
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

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight:'100vh', backgroundImage:"url('/Salinas-Sign.png')", backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed', display:'flex', alignItems:'center', justifyContent:'center', gap:28, flexWrap:'wrap', fontFamily:"'Segoe UI',-apple-system,sans-serif", position:'relative', overflowY:'auto', paddingTop:24, paddingBottom:24 }}>
        <div style={{ width: isMobile ? '92vw' : showInfoCard ? 540 : 420, padding:0, transition:'width 0.3s ease' }}>

          <div style={{ textAlign:'center', marginBottom:22 }}>
            <img src="/saul-garcia.jpg" alt="Saul Garcia — AuditDNA" style={{ width:88, height:88, borderRadius:'50%', objectFit:'cover', objectPosition:'center top', border:'2px solid rgba(203,166,88,0.5)', marginBottom:10, boxShadow:'0 4px 20px rgba(0,0,0,0.6)' }} />
            <div style={{ fontSize:13, letterSpacing:'4px', color:'#cba658', fontWeight:800, marginBottom:2, textShadow:'0 2px 8px rgba(0,0,0,1)' }}>AUDITDNA AGRICULTURE</div>
            <div style={{ fontSize:9, letterSpacing:'1.5px', color:'rgba(203,166,88,0.7)', textShadow:'0 1px 4px rgba(0,0,0,0.9)', fontWeight:600 }}>Intelligence Platform — US·Mexico Corridor</div>
            <div style={{ fontSize:9, letterSpacing:'1px', color:'rgba(255,255,255,0.55)', marginTop:5, fontStyle:'italic', textShadow:'0 1px 4px rgba(0,0,0,0.8)' }}>For Diego Sebastian — with patience and belief in me.</div>
          </div>

          <div style={{ background:'rgba(8,12,22,0.38)', backdropFilter:'blur(28px) saturate(180%)', WebkitBackdropFilter:'blur(28px) saturate(180%)', border:'1px solid rgba(203,166,88,0.22)', borderRadius:10, boxShadow:'0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)', overflow:'hidden', position:'relative' }}>

            <button onClick={()=>setShowInfoCard(!showInfoCard)}
              style={{ position:'absolute', top:14, right:14, background: showInfoCard ? 'linear-gradient(135deg,#cba658,#b8944d)' : 'rgba(203,166,88,0.12)', border:'1px solid rgba(203,166,88,0.45)', borderRadius:4, padding:'5px 13px', cursor:'pointer', color: showInfoCard ? '#0f172a' : '#cba658', fontSize:9, fontWeight:800, letterSpacing:'2px', zIndex:2 }}>
              {showInfoCard ? 'SIGN IN' : 'LEARN MORE'}
            </button>

            {showInfoCard ? (
              <div style={{ padding:'28px 26px 26px' }}>

                {/* TOP ROW — ES/EN + SIGN IN toggle */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <button onClick={()=>setLanguage(language==='en'?'es':'en')}
                    style={{ padding:'5px 14px', background:'rgba(203,166,88,0.12)', border:'1px solid rgba(203,166,88,0.4)', borderRadius:4, color:'#cba658', fontSize:9, fontWeight:800, cursor:'pointer', letterSpacing:'2px' }}>
                    {language==='en' ? 'EN ESPAÑOL' : 'IN ENGLISH'}
                  </button>
                  <div style={{ fontSize:9, color:'rgba(203,166,88,0.6)', letterSpacing:'2px', fontWeight:700 }}>AUDITDNA AGRICULTURE</div>
                </div>

                {/* FOUNDER SECTION */}
                <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:18, padding:'14px', background:'rgba(0,0,0,0.2)', borderRadius:8, border:'1px solid rgba(203,166,88,0.12)' }}>
                  <img src="/saul-garcia.jpg" alt="Saul Garcia" style={{ width:62, height:62, borderRadius:'50%', objectFit:'cover', objectPosition:'center top', border:'2px solid rgba(203,166,88,0.5)', flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:13, color:'#f1f5f9', fontWeight:800, marginBottom:2 }}>Saul Garcia</div>
                    <div style={{ fontSize:9, color:'#cba658', fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>FOUNDER · MEXAUSA FOOD GROUP, INC. · ENSENADA, B.C.</div>
                    <div style={{ fontSize:10, color:'#94a3b8', lineHeight:1.7 }}>
                      {language==='en'
                        ? "Twenty years moving produce through the US-Mexico corridor taught me one thing: the industry runs on relationships, but it loses money on information gaps. I've structured factoring deals, negotiated FOB contracts at origin, and watched good growers lose US market access over paperwork. I built AuditDNA to fix all of it - in one platform."
                        : "Veinte anos moviendo produce por el corredor Mexico-EUA me ensenaron algo: la industria funciona con relaciones, pero pierde dinero por falta de informacion. Estructure operaciones de factoraje, negocio contratos FOB en origen y vi productores perder acceso al mercado por papeleo. Construi AuditDNA para resolver todo - en una sola plataforma."}
                    </div>
                  </div>
                </div>

                {/* LIVE STATS */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7, marginBottom:16 }}>
                  {[
                    ['Hass Avocado FOB','$42.50','Michoacan MX · Live'],
                    ['Grower Network','5,000+','12 Mexican Regions'],
                    ['Industry Contacts','23,000+','Buyers · Importers'],
                  ].map(([l,v,s])=>(
                    <div key={l} style={{ background:'rgba(0,0,0,0.25)', borderRadius:6, padding:'9px 6px', textAlign:'center', border:'1px solid rgba(203,166,88,0.1)' }}>
                      <div style={{ fontSize:8, color:'#475569', fontWeight:700, letterSpacing:'0.5px', marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:'#cba658', lineHeight:1 }}>{v}</div>
                      <div style={{ fontSize:8, color:'#334155', marginTop:3 }}>{s}</div>
                    </div>
                  ))}
                </div>

                {/* FIRST GROWERS ONBOARDING — PROOF POINT */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:8, color:'#cba658', fontWeight:800, letterSpacing:'2px', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                    {language==='en' ? 'GROWERS NOW ONBOARDING' : 'PRODUCTORES REGISTRANDOSE'}
                    <span style={{ padding:'2px 7px', background:'rgba(134,239,172,0.12)', border:'1px solid rgba(134,239,172,0.3)', borderRadius:3, fontSize:8, color:'#86efac', fontWeight:700 }}>LIVE</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      { region: language==='en'?'San Quintin, Baja California':'San Quintin, Baja California', acres:'100 acres', crops: language==='en'?'Beets · Carrots · Spinach · Squash':'Betabeles · Zanahorias · Espinaca · Calabaza', flag:'🇲🇽' },
                      { region: language==='en'?'Mexicali Valley, Baja California':'Valle de Mexicali, Baja California', acres:'100 acres', crops: language==='en'?'Mixed Produce — Open Market':'Produce Mixto — Mercado Abierto', flag:'🇲🇽' },
                    ].map((g,i)=>(
                      <div key={i} style={{ padding:'10px 12px', background:'rgba(203,166,88,0.05)', border:'1px solid rgba(203,166,88,0.18)', borderRadius:6 }}>
                        <div style={{ fontSize:10, marginBottom:3 }}>{g.flag} <span style={{ color:'#e2e8f0', fontWeight:700 }}>{g.region}</span></div>
                        <div style={{ fontSize:9, color:'#cba658', fontWeight:700, marginBottom:3 }}>{g.acres}</div>
                        <div style={{ fontSize:9, color:'#64748b', lineHeight:1.5 }}>{g.crops}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ROLE SELECTOR */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:8, color:'#475569', fontWeight:700, letterSpacing:'2px', marginBottom:8, textAlign:'center' }}>
                    {language==='en' ? 'WHO ARE YOU?' : '¿QUIEN ERES?'}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {[
                      { id:'buyer',     en:'Buyer / Procurement',     es:'Comprador / Abastecimiento', note_en:'FOB pricing · grower scores · alerts',         note_es:'Precios FOB · calificaciones · alertas' },
                      { id:'grower',    en:'Grower / Shipper',         es:'Productor / Embarcador',     note_en:'Register · get visible · FSMA digital',        note_es:'Registrate · visibilidad · FSMA digital' },
                      { id:'importer',  en:'Importer / Distributor',   es:'Importador / Distribuidor',  note_en:'Sourcing engine · trade finance · contracts',   note_es:'Abastecimiento · finanzas · contratos' },
                      { id:'compliance',en:'Finance / Compliance',     es:'Finanzas / Cumplimiento',    note_en:'Factoring · lender marketplace · FSMA 204',     note_es:'Factoraje · prestamistas · FSMA 204' },
                    ].map(r=>(
                      <button key={r.id}
                        onClick={()=>{ setShowInfoCard(false); setLoginTab('register'); setRegData(p=>({...p,entityType:r.id})); }}
                        style={{ padding:'9px 10px', background:'rgba(203,166,88,0.06)', border:'1px solid rgba(203,166,88,0.18)', borderRadius:6, cursor:'pointer', textAlign:'left' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(203,166,88,0.12)';e.currentTarget.style.borderColor='rgba(203,166,88,0.45)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(203,166,88,0.06)';e.currentTarget.style.borderColor='rgba(203,166,88,0.18)';}}>
                        <div style={{ fontSize:11, color:'#e2e8f0', fontWeight:700, marginBottom:2 }}>{language==='en'?r.en:r.es}</div>
                        <div style={{ fontSize:8, color:'#475569', lineHeight:1.5 }}>{language==='en'?r.note_en:r.note_es}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <button onClick={()=>{ setShowInfoCard(false); setLoginTab('register'); }}
                    style={{ padding:'12px', background:'linear-gradient(135deg,#cba658,#b8944d)', border:'none', borderRadius:6, color:'#0f172a', fontSize:10, fontWeight:900, letterSpacing:'2px', cursor:'pointer' }}>
                    {language==='en' ? 'REQUEST ACCESS' : 'SOLICITAR ACCESO'}
                  </button>
                  <button onClick={()=>{ setShowInfoCard(false); setLoginTab('admin'); }}
                    style={{ padding:'12px', background:'rgba(203,166,88,0.09)', border:'1px solid rgba(203,166,88,0.35)', borderRadius:6, color:'#cba658', fontSize:10, fontWeight:800, letterSpacing:'2px', cursor:'pointer' }}>
                    {language==='en' ? 'SIGN IN' : 'INGRESAR'}
                  </button>
                </div>

                <div style={{ marginTop:12, textAlign:'center', fontSize:9, color:'#334155' }}>
                  {language==='en' ? 'Free to join. No credit card required.' : 'Gratis. Sin tarjeta de credito.'}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', borderBottom:'1px solid rgba(203,166,88,0.18)' }}>
                  {[['admin','Admin Access'],['client','Client Login'],['register','Register']].map(([id,lbl])=>(
                    <button key={id} onClick={()=>{ setLoginTab(id); setLoginPass(''); setLoginCode(''); setLoginPin(''); setLoginError(''); setRegStep(1); setRegSuccess(false); setRegError(''); }}
                      style={{ flex:1, padding:'11px 4px', background: loginTab===id ? 'rgba(203,166,88,0.15)' : 'transparent', border:'none', borderBottom: loginTab===id ? '2px solid #cba658' : '2px solid transparent', color: loginTab===id ? '#cba658' : '#64748b', fontSize:9, fontWeight:800, cursor:'pointer', letterSpacing:'1px', marginBottom:'-1px' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <div style={{ padding:'20px 28px 28px' }}>

                  {loginTab==='admin' && (
                    <div>
                      <div style={{ fontSize:10, letterSpacing:'2px', color:'#cba658', fontWeight:800, marginBottom:18, textAlign:'center' }}>PLATFORM ADMINISTRATION &mdash; AUTHORIZED PERSONNEL ONLY</div>
                      <div style={{ marginBottom:13 }}><label style={{ display:'block', fontSize:9, letterSpacing:'1.5px', color:'#e2e8f0', fontWeight:700, marginBottom:5 }}>PASSWORD</label>
                        <input type="password" value={loginPass} onChange={e=>{setLoginPass(e.target.value);setLoginError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Enter password" disabled={loginLoading} style={{ width:'100%', padding:'12px 13px', background:'rgba(5,10,20,0.55)', border:'1px solid rgba(203,166,88,0.28)', color:'#fff', fontSize:13, borderRadius:5, outline:'none', boxSizing:'border-box', letterSpacing:'2px' }} /></div>
                      <div style={{ marginBottom:13 }}><label style={{ display:'block', fontSize:9, letterSpacing:'1.5px', color:'#e2e8f0', fontWeight:700, marginBottom:5 }}>ACCESS CODE</label>
                        <input type="password" value={loginCode} onChange={e=>{setLoginCode(e.target.value);setLoginError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Access code" disabled={loginLoading} style={{ width:'100%', padding:'12px 13px', background:'rgba(5,10,20,0.55)', border:'1px solid rgba(203,166,88,0.28)', color:'#fff', fontSize:13, borderRadius:5, outline:'none', boxSizing:'border-box', textAlign:'center', letterSpacing:'2px' }} /></div>
                      <div style={{ marginBottom:16 }}><label style={{ display:'block', fontSize:9, letterSpacing:'1.5px', color:'#e2e8f0', fontWeight:700, marginBottom:5 }}>PIN</label>
                        <input type="password" value={loginPin} onChange={e=>{setLoginPin(e.target.value);setLoginError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="PIN" maxLength={10} disabled={loginLoading} style={{ width:'100%', padding:'12px 13px', background:'rgba(5,10,20,0.55)', border:'1px solid rgba(203,166,88,0.28)', color:'#fff', fontSize:13, borderRadius:5, outline:'none', boxSizing:'border-box', letterSpacing:'8px', textAlign:'center' }} /></div>
                      {loginError && <div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:5, color:'#ef4444', fontSize:11, marginBottom:13, textAlign:'center', fontWeight:600 }}>{loginError}</div>}
                      <button onClick={handleLogin} disabled={loginLoading} style={{ width:'100%', padding:'13px', background: loginLoading ? '#64748b' : 'linear-gradient(135deg,#cba658,#b8944d)', border:'none', borderRadius:5, color:'#0f172a', fontSize:11, fontWeight:900, letterSpacing:'3px', cursor: loginLoading ? 'wait' : 'pointer' }}>{loginLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}</button>
                      <div style={{ marginTop:10, textAlign:'center' }}><span style={{ fontSize:9, color:'#64748b' }}>Not registered? </span><button onClick={()=>setLoginTab('register')} style={{ background:'none', border:'none', color:'#cba658', fontSize:9, fontWeight:700, cursor:'pointer' }}>Request Access</button></div>
                      <div style={{ marginTop:8, fontSize:8, color:'#22c55e', textAlign:'center', letterSpacing:'1px' }}>SECURED WITH JWT + BCRYPT ENCRYPTION &mdash; FULL PLATFORM ACCESS GRANTED</div>
                    </div>
                  )}

                  {loginTab==='client' && (
                    <div>
                      <div style={{ fontSize:10, letterSpacing:'2px', color:'#cba658', fontWeight:800, marginBottom:18, textAlign:'center' }}>CLIENT / PARTNER ACCESS</div>
                      <div style={{ marginBottom:13 }}><label style={{ display:'block', fontSize:9, letterSpacing:'1.5px', color:'#e2e8f0', fontWeight:700, marginBottom:5 }}>EMAIL</label>
                        <input type="email" value={tenantEmail} onChange={e=>{setTenantEmail(e.target.value);setLoginError('');}} onKeyDown={e=>e.key==='Enter'&&handleClientLogin()} placeholder="your@email.com" disabled={loginLoading} style={{ width:'100%', padding:'12px 13px', background:'rgba(5,10,20,0.55)', border:'1px solid rgba(203,166,88,0.28)', color:'#fff', fontSize:13, borderRadius:5, outline:'none', boxSizing:'border-box' }} /></div>
                      <div style={{ marginBottom:16 }}><label style={{ display:'block', fontSize:9, letterSpacing:'1.5px', color:'#e2e8f0', fontWeight:700, marginBottom:5 }}>PASSWORD</label>
                        <input type="password" value={tenantPass} onChange={e=>{setTenantPass(e.target.value);setLoginError('');}} onKeyDown={e=>e.key==='Enter'&&handleClientLogin()} placeholder="Password" disabled={loginLoading} style={{ width:'100%', padding:'12px 13px', background:'rgba(5,10,20,0.55)', border:'1px solid rgba(203,166,88,0.28)', color:'#fff', fontSize:13, borderRadius:5, outline:'none', boxSizing:'border-box', letterSpacing:'2px' }} /></div>
                      {loginError && <div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:5, color:'#ef4444', fontSize:11, marginBottom:13, textAlign:'center', fontWeight:600 }}>{loginError}</div>}
                      <button onClick={handleClientLogin} disabled={loginLoading} style={{ width:'100%', padding:'13px', background: loginLoading ? '#64748b' : 'linear-gradient(135deg,#cba658,#b8944d)', border:'none', borderRadius:5, color:'#0f172a', fontSize:11, fontWeight:900, letterSpacing:'3px', cursor: loginLoading ? 'wait' : 'pointer' }}>{loginLoading ? 'SIGNING IN...' : 'SIGN IN'}</button>
                      <div style={{ marginTop:10, textAlign:'center' }}><span style={{ fontSize:9, color:'#64748b' }}>Need access? </span><button onClick={()=>setLoginTab('register')} style={{ background:'none', border:'none', color:'#cba658', fontSize:9, fontWeight:700, cursor:'pointer' }}>Register Here</button></div>
                      <div style={{ marginTop:8, fontSize:8, color:'#22c55e', textAlign:'center', letterSpacing:'1px' }}>SECURED &mdash; PACA COMPLIANT PLATFORM</div>
                    </div>
                  )}

                  {loginTab==='register' && (
                    <div>
                      {regSuccess ? (
                        <div style={{ textAlign:'center', padding:'16px 0' }}>
                          <div style={{ fontSize:28, marginBottom:10, color:'#cba658' }}>&#10003;</div>
                          <div style={{ fontSize:13, fontWeight:800, color:'#cba658', marginBottom:8, letterSpacing:'1px' }}>REQUEST RECEIVED</div>
                          <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.7, marginBottom:14 }}>Thank you, <strong style={{color:'#e2e8f0'}}>{regData.contactName||regData.companyLegal}</strong>.<br/>Registration for <strong style={{color:'#cba658'}}>{regData.companyLegal}</strong> submitted.<br/>We will contact you at <strong style={{color:'#e2e8f0'}}>{regData.contactEmail}</strong> within 1-2 business days.</div>
                          <button onClick={()=>{ setRegSuccess(false); setLoginTab('admin'); }} style={{ padding:'9px 22px', background:'rgba(203,166,88,0.15)', border:'1px solid rgba(203,166,88,0.4)', borderRadius:5, color:'#cba658', fontSize:10, fontWeight:700, cursor:'pointer', letterSpacing:'1px' }}>BACK TO LOGIN</button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize:10, letterSpacing:'2px', color:'#cba658', fontWeight:800, marginBottom:4, textAlign:'center' }}>REQUEST PLATFORM ACCESS</div>
                          <div style={{ fontSize:9, color:'#64748b', marginBottom:12, textAlign:'center' }}>Step {regStep} of 5</div>
                          <div style={{ display:'flex', gap:3, marginBottom:14 }}>{[1,2,3,4,5].map(s=><div key={s} style={{ flex:1, height:3, background: s<=regStep ? '#cba658' : 'rgba(203,166,88,0.2)', borderRadius:2 }} />)}</div>
                          {regError && <div style={{ padding:'7px 10px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:5, color:'#ef4444', fontSize:10, marginBottom:10, textAlign:'center' }}>{regError}</div>}
                          {regStep===1 && <div>{[['grower','Grower / Producer'],['shipper','Shipper / Packer'],['importer','Importer / Distributor'],['buyer','Buyer / Retailer'],['broker','Broker / Trader'],['tech','Ag Technology Company'],['other','Other']].map(([val,lbl])=><button key={val} onClick={()=>setRegData(p=>({...p,entityType:val}))} style={{ display:'block', width:'100%', marginBottom:4, padding:'8px 11px', background: regData.entityType===val ? 'rgba(203,166,88,0.18)' : 'rgba(255,255,255,0.03)', border: regData.entityType===val ? '1px solid #cba658' : '1px solid rgba(203,166,88,0.12)', borderRadius:5, color: regData.entityType===val ? '#cba658' : '#94a3b8', fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'left' }}>{lbl}</button>)}</div>}
                          {regStep===2 && <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[['companyLegal','Company Legal Name *','Exact legal name'],['ein','EIN / Tax ID','XX-XXXXXXX'],['state','State / Province','CA, MX-BCN...'],['city','City','City'],['pacaNum','PACA License #','PACA #']].map(([key,lbl,ph])=><div key={key}><label style={{ display:'block', fontSize:9, color:'#94a3b8', fontWeight:700, marginBottom:3 }}>{lbl}</label><input value={regData[key]||''} onChange={e=>setRegData(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 11px', background:'rgba(5,10,20,0.5)', border:'1px solid rgba(203,166,88,0.22)', color:'#f1f5f9', fontSize:12, borderRadius:5, outline:'none', boxSizing:'border-box' }} /></div>)}</div>}
                          {regStep===3 && <div><div style={{ fontSize:9, color:'#94a3b8', marginBottom:10, textAlign:'center' }}>Certifications & FSMA compliance level</div>{[['gapCert','GAP Certified'],['globalGap','GlobalGAP Certified'],['sqf','SQF Certified'],['brc','BRC Certified'],['traceability','Traceability System Active'],['waterTests','Water Testing'],['soilTests','Soil Testing']].map(([key,lbl])=><label key={key} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'6px 9px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(203,166,88,0.1)', borderRadius:5, marginBottom:4 }}><input type="checkbox" checked={!!regData[key]} onChange={e=>setRegData(p=>({...p,[key]:e.target.checked}))} style={{accentColor:'#cba658'}} /><span style={{ fontSize:11, color:'#cbd5e1', fontWeight:600 }}>{lbl}</span></label>)}<div style={{ marginTop:10 }}><label style={{ display:'block', fontSize:9, color:'#94a3b8', fontWeight:700, marginBottom:5 }}>FSMA TIER</label>{['1','2','3'].map(t=><button key={t} onClick={()=>setRegData(p=>({...p,fsmaTeir:t}))} style={{ marginRight:5, padding:'5px 13px', background: regData.fsmaTeir===t ? 'rgba(203,166,88,0.2)' : 'rgba(255,255,255,0.04)', border: regData.fsmaTeir===t ? '1px solid #cba658' : '1px solid rgba(203,166,88,0.15)', borderRadius:4, color: regData.fsmaTeir===t ? '#cba658' : '#94a3b8', fontSize:10, fontWeight:700, cursor:'pointer' }}>Tier {t}</button>)}</div></div>}
                          {regStep===4 && <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{[['contactName','Contact Name *','Full name','text'],['contactEmail','Contact Email *','email@company.com','email'],['contactPhone','Phone','+1 or +52...','tel']].map(([key,lbl,ph,type])=><div key={key}><label style={{ display:'block', fontSize:9, color:'#94a3b8', fontWeight:700, marginBottom:3 }}>{lbl}</label><input type={type} value={regData[key]||''} onChange={e=>setRegData(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{ width:'100%', padding:'8px 11px', background:'rgba(5,10,20,0.5)', border:'1px solid rgba(203,166,88,0.22)', color:'#f1f5f9', fontSize:12, borderRadius:5, outline:'none', boxSizing:'border-box' }} /></div>)}<div><label style={{ display:'block', fontSize:9, color:'#94a3b8', fontWeight:700, marginBottom:3 }}>NOTES</label><textarea value={regData.notes||''} onChange={e=>setRegData(p=>({...p,notes:e.target.value}))} placeholder="Products, commodities, regions..." style={{ width:'100%', padding:'8px 11px', background:'rgba(5,10,20,0.5)', border:'1px solid rgba(203,166,88,0.22)', color:'#f1f5f9', fontSize:11, borderRadius:5, outline:'none', boxSizing:'border-box', height:50, resize:'none' }} /></div></div>}
                          {regStep===5 && <div><div style={{ fontSize:9, color:'#94a3b8', marginBottom:10, textAlign:'center' }}>Review before submitting</div>{[['Entity',regData.entityType],['Company',regData.companyLegal],['Contact',regData.contactName+' | '+regData.contactEmail],['Phone',regData.contactPhone||'N/A'],['EIN',regData.ein||'N/A'],['State',regData.state||'N/A'],['FSMA',`Tier ${regData.fsmaTeir}`]].map(([k,v])=><div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(203,166,88,0.08)', fontSize:10 }}><span style={{color:'#64748b'}}>{k}</span><span style={{color:'#e2e8f0', maxWidth:'60%', textAlign:'right'}}>{v}</span></div>)}</div>}
                          <div style={{ display:'flex', gap:7, marginTop:14 }}>
                            {regStep>1 && <button onClick={()=>setRegStep(s=>s-1)} style={{ flex:1, padding:'9px', background:'rgba(148,163,176,0.1)', border:'1px solid rgba(148,163,176,0.2)', borderRadius:5, color:'#94a3b8', fontSize:10, fontWeight:700, cursor:'pointer', letterSpacing:'1px' }}>BACK</button>}
                            {regStep<5 ? <button onClick={()=>{ if(regStep===1&&!regData.entityType){setRegError('Select entity type');return;} if(regStep===2&&!regData.companyLegal){setRegError('Company name required');return;} if(regStep===4&&(!regData.contactName||!regData.contactEmail)){setRegError('Contact name and email required');return;} setRegError(''); setRegStep(s=>s+1); }} style={{ flex:1, padding:'9px', background:'linear-gradient(135deg,#cba658,#b8944d)', border:'none', borderRadius:5, color:'#0f172a', fontSize:10, fontWeight:900, cursor:'pointer', letterSpacing:'1px' }}>NEXT</button>
                            : <button onClick={handleRegistrationSubmit} disabled={regLoading} style={{ flex:1, padding:'9px', background: regLoading ? '#64748b' : 'linear-gradient(135deg,#cba658,#b8944d)', border:'none', borderRadius:5, color:'#0f172a', fontSize:10, fontWeight:900, cursor: regLoading ? 'wait' : 'pointer', letterSpacing:'1px' }}>{regLoading ? 'SUBMITTING...' : 'SUBMIT REQUEST'}</button>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign:'center', marginTop:24 }}>
            <div style={{ fontSize:9, color:'#e2e8f0', letterSpacing:'1px', textShadow:'0 1px 4px rgba(0,0,0,0.8)' }}>Mexausa Food Group, Inc.</div>
            <div style={{ fontSize:8, color:'#cbd5e1', marginTop:4, textShadow:'0 1px 4px rgba(0,0,0,0.8)' }}>Unauthorized access is prohibited and monitored</div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DEVINE INC ADVISORY CARD - right column, bilingual EN/ES toggle */}
        {/* Floats right of login on desktop; wraps below on mobile         */}
        {/* ============================================================== */}
        <div style={{ width:520, maxWidth:'92vw', flexShrink:0 }}>
          <DevineInc />
        </div>
      </div>
    );
  }

  // ================================================================================
  const MODULES = {
    'CRM & Communications': { color: '#cba658', count: 10, modules: ['Owner Command Center', 'Unified CRM', 'Saul Intel CRM', 'Email Marketing', 'Call Center', 'SMS Gateway', 'Contacts', 'Secure Buyers'] },
    'Mexausa Food Group Intell': { color: '#cba658', count: 19, modules: ['MFG Dashboard'] },
    'Agriculture & Commodities': { color: '#cba658', count: 60, modules: ['MFG Dashboard', 'Ag Dashboard', 'Ag Intelligence', 'Ag Main', 'Agriculture', 'Grower Database', 'Grower Management', 'USDA Intel', 'USDA Dashboard', 'USDA Grower Search', 'Seasonal Calendar', 'Buyer Network', 'Quality Control', 'Cold Chain', 'Harvest Tracker', 'Ag Intel Master', 'Price Alerts', 'Recon Engine', 'Field Operations', 'Weather Intelligence', 'Port Intelligence', 'Produce Market Weekly'] },
    'Grower Intelligence': { color: '#cba658', count: 5, modules: ['Grower Intelligence'] },
    'Marketplace': { color: '#cba658', count: 18, modules: ['Marketplace', 'Ag Marketplace', 'Market Intelligence', 'Commodity Intelligence', 'Predictive Analyzer', 'Trade Finance', 'Tariffs', 'Product Catalog', 'Orders', 'Shipping', 'Customer Portal', 'Customer Portal Advanced', 'Document Vault', 'Mobile Sales Upload'] },
    'Financial Services': { color: '#cba658', count: 28, modules: ['Finance Dashboard', 'Financial Services Hub', 'Finance Center', 'Small Grower Finance', 'Grower Finance', 'Mexausa Food Group Finance', 'Finance Access Control', 'Invoice Factoring', 'PO Finance', 'AR/AP', 'Accounting Hub', 'Accounting Dashboard', 'Reports', 'Elite Analytics', 'Elite Beast', 'Analytics Dashboard'] },
    'Compliance & Auditing': { color: '#cba658', count: 18, modules: ['Compliance Hub', 'FSMA 204', 'GlobalGAP', 'PrimusGFS', 'SENASICA', 'Audit Manager', 'Travel Protection', 'Traveler Protection'] },
    'Agricultural Testing (81 Niner Miners)': { color: '#06b6d4', count: 9, modules: ['WaterTech Pro', 'SoilTech Pro', 'Fertilizer Analysis', 'Seed Germination', 'Traceability Hub', 'Lot Tracking', 'Chain of Custody', 'Recall Manager', 'QR Generator'] },
    'LATAM Intelligence': { color: '#cba658', count: 20, modules: ['LATAM Dashboard', 'Latin America Dashboard', 'LATAM Produce Buyers', 'Mexico Market', 'Central America', 'South America', 'International Travel Security', 'MAUTTR Registry', 'MAUTTR QR Scanner', 'MAUTTR Vehicles'] },
    'Real Estate (NMLS #337526)': { color: '#cba658', count: 29, modules: ['Mortgage Loan Hub', '1003 Application', 'USDA 502 Housing', 'Mexico Real Estate', 'SII-MX', 'Sistema Inmobiliario', 'Gestion Inmobiliaria MX', 'Mortgage Calc', 'Property Search'] },
    'Spartan 300': { color: '#cba658', count: 11, modules: ['Consumer Protection', 'Mortgage Audit', 'TILA Analysis', 'Dispute Letters'] },
    'Trojan 700': { color: '#cba658', count: 11, modules: ['Enterprise Audit', 'Corporate Compliance', 'SOX Audit', 'Risk Assessment'] },
    'AI & SI (81 Agents)': { color: '#cba658', count: 26, modules: ['AI Dashboard', 'Document Analysis AI', 'Agent Manager', 'OCR Reader', 'Document AI', 'Compliance AI', 'Intelligence Dashboard', 'Multi-AI Verification'] },
    'Access Control': { color: '#cba658', count: 9, modules: ['Access Control', 'User Management', 'Role Permissions', 'Tenant Management', 'Manage Clients', 'Client Accounts', 'Settings', 'Notifications', 'Gmail OAuth'] }
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
    'Predictive Analyzer': <PredictiveAnalyzer />,
    'Analytics Predictions': <Analytics />,
    'MFG Predictions': <MexausaFoodGroupOmegaIntelligence />,
    'SII-MX': <SII_MX />,
    'Sistema Inmobiliario': <SII_MX />,
    'Gestion Inmobiliaria MX': <SII_MX />,
    'Grower Recommendations': <GrowerRecommendationEngine />,
    'Fertilizer Analysis': <FertilizerAnalysis />,
    'Seed Germination': <SeedGermination />,
    'Document Analysis AI': <DocumentAnalysisAI />,
    'Saul Intel CRM': <SaulIntelCRM />, 'Email Marketing': <EmailMarketing />, 'Call Center': <SaulIntelCRM />, 'SMS Gateway': <SaulIntelCRM />, 'Contacts': <SaulIntelCRM />, 'Secure Buyers': <SecureBuyersIntelligence />,
    'MFG Dashboard': <MexausaFoodGroupOmegaIntelligence />,
    'Logistics': <LogisticsCenter />,
    'Grower Database': <GrowerManagementHub />, 'Grower Management': <GrowerManagementHub />, 'USDA Intel': <USDAIntelligenceDashboard />, 'USDA Dashboard': <USDAIntelligenceDashboard />, 'USDA Grower Search': <USDAGrowerSearchEngine />, 'Seasonal Calendar': <SeasonalCalendar />, 'Buyer Network': <BuyerNetwork />,
    'Quality Control': <QualityControl />, 'Cold Chain': <ColdChainMonitoring />, 'Harvest Tracker': <FieldOperations />, 'Ag Intel Master': <AgriculturalIntelligenceMaster />,
    'Grower Intelligence': <GrowerHub />, 'Grower Portal': <GrowerHub />, 'Grower Master': <GrowerHub />, 'Registration': <GrowerHub />, 'Small Grower Intel': <GrowerHub />,
    'Grower Activation': <React.Suspense fallback={<div style={{padding:40,color:'#cba658',textAlign:'center'}}>Loading Queue...</div>}><GrowerActivationQueue /></React.Suspense>,
    'Pending Growers':   <React.Suspense fallback={<div style={{padding:40,color:'#cba658',textAlign:'center'}}>Loading Queue...</div>}><GrowerActivationQueue /></React.Suspense>,
    'Activation Queue':  <React.Suspense fallback={<div style={{padding:40,color:'#cba658',textAlign:'center'}}>Loading Queue...</div>}><GrowerActivationQueue /></React.Suspense>,
    'Finance Dashboard': <FinancialDashboard />, 'Financial Services Hub': <FinancialServicesHub />, 'Finance Center': <FinanceMasterModule />, 'Small Grower Finance': <FinanceOperations />, 'Grower Finance': <FinanceOperations />, 'Mexausa Food Group Finance': <FinanceMasterModule />, 'Finance Access Control': <FinanceMasterModule />, 'Invoice Factoring': <FinanceMasterModule />, 'PO Finance': <FinanceMasterModule />, 'AR/AP': <FinanceOperations />, 'Accounting Hub': <AccountingHub />, 'Reports': <ReportsCenter />,
    'Produce Intel': <ProduceIntelCenter />, 'Price Analyzer': <ProduceIntelCenter />, 'Predictive Analyzer': <ProduceIntelCenter />,
    'Price Alerts': <ProduceIntelCenter />, 'Produce Market Weekly': <ProduceIntelCenter />, 'Market Weekly': <ProduceIntelCenter />,
    'Price Forecasting': <ProduceIntelCenter />, 'Intel Center': <ProduceIntelCenter />, 'Elite Analytics': <AuditDNA_Elite_Analytics />, 'Elite Beast': <AuditDNA_ELITE_BEAST />,
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
    'Gmail OAuth': <GmailOAuth />,
    'Access Control': <AccessControl />, 'User Management': <AccessControl />, 'Role Permissions': <AccessControl />,
    'Tenant Management': <TenantAdmin />, 'Manage Clients': <TenantAdmin />, 'Client Accounts': <TenantAdmin />,
    'Travel Protection': <TravelProtection />, 'Traveler Protection': <TravelProtection />,
    'AI Dashboard': <AgentDashboard />, 'Agent Manager': <AgentDashboard />, 'OCR Reader': <DocumentAnalysisAI />, 'Document AI': <DocumentAnalysisAI />, 'Compliance AI': <Compliance />,
    'Accounting Dashboard': <AccountingHub />, 'Customer Portal Advanced': <CustomerPortalAdvanced />, 'Unified Sourcing': <AgriculturalIntelligenceMaster />,
    'Price Alerts': <PriceAlertPingSystem />, 'Recon Engine': <UltimateReconEngine />,
    'Mobile Sales Upload': <MobileSalesUpload />, 'Analytics Dashboard': <Analytics />,
    'Field Operations': <FieldOperations />, 'Traceability': <Traceability />,
    // ── NEW MODULES WIRED ────────────────────────────────────────────────────
    'Weather Intelligence': <WeatherIntelligence />, 'Weather': <WeatherIntelligence />, 'Climate Risk': <WeatherIntelligence />,
    'Commodity Intelligence': <MexausaFoodGroupOmegaIntelligence />,
    'Market Intelligence': <MarketIntelligence />, 'Market Intel': <MarketIntelligence />,
    'Ag Dashboard': <AgriculturalIntelligenceMaster />,
    'Port Intelligence': <PortIntelligence />, 'Port Intel': <PortIntelligence />, 'Ports': <PortIntelligence />,
    'Price Forecasting': <PredictiveAnalyzer />,
    'Produce Market Weekly': <ProduceMarketWeekly />, 'Market Weekly': <ProduceMarketWeekly />,
    'Trade Finance': <TradeFinance />, 'Trade Financing': <TradeFinance />,
    'Tariffs': <Tariffs />, 'HTS Tariffs': <Tariffs />, 'Import Duties': <Tariffs />,
    'Owner Command Center': <OwnerCommandCenter />, 'Command Center': <OwnerCommandCenter />,
    'Ag Intelligence': <AgIntelligence />, 'AgIntelligence': <AgIntelligence />,
    'Ag Main': <AgMainPage />, 'Ag Hub': <AgMainPage />,
    'Ag Marketplace': <Marketplace />,
    'Agriculture': <Agriculture />, 'Agriculture Module': <Agriculture />,
    'Latin America Dashboard': <LATAMIntelligence />,
    'LATAM Produce Buyers': <LatAmProduceBuyers />, 'LatAm Buyers': <LatAmProduceBuyers />,
    'Unified CRM': <UnifiedCRM />, 'Unified Contacts': <UnifiedCRM />,
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
      <div style={{ minHeight: '100vh', backgroundImage: "url('/Salinas-Sign.png')", backgroundSize: 'cover', backgroundPosition: 'center center', backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", position: 'relative' }}>
        {/* Light overlay — keeps image visible but readable */}
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.40)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <header style={{ background: 'rgba(10,15,30,0.88)', borderBottom: '1px solid rgba(148,163,176,0.2)', padding: '0 12px', height: isMobile ? 'auto' : '56px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(20px)', flexWrap: 'wrap', gap: isMobile ? '8px' : '0', paddingTop: isMobile ? '8px' : '0', paddingBottom: isMobile ? '8px' : '0' }}>
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
        <div style={{ background: 'rgba(10,15,30,0.92)', borderBottom: '1px solid rgba(148,163,176,0.2)', padding: '6px 0', overflow: 'hidden' }}>
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
        <div style={{ background: 'rgba(10,15,30,0.50)', borderBottom: '1px solid rgba(148,163,176,0.12)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? '4px' : '0' }}>
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', overflowX: isMobile ? 'auto' : 'visible', flexShrink: 0, maxWidth: isMobile ? '100%' : 'auto' }}>
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
            {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={12} color={serverStatus.backend === 'online' ? '#22c55e' : '#ef4444'} />
              <span style={{ color: serverStatus.backend === 'online' ? '#22c55e' : '#ef4444', fontSize: '10px' }}>Backend</span>
            </div>}
            {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={12} color={serverStatus.database === 'online' ? '#22c55e' : '#ef4444'} />
              <span style={{ color: serverStatus.database === 'online' ? '#22c55e' : '#ef4444', fontSize: '10px' }}>Database</span>
            </div>}
            <button onClick={() => setMissionControlOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(203,166,88,0.1)', border: '1px solid rgba(203,166,88,0.3)', borderRadius: '4px', cursor: 'pointer' }}>
              <Zap size={12} color="#cba658" />
              <span style={{ color: '#cba658', fontSize: '10px', fontWeight: '600' }}>Mission Control</span>
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <aside style={{ width: sidebarCollapsed ? '48px' : '220px', background: 'rgba(10,15,30,0.88)', borderRight: '1px solid rgba(148,163,176,0.12)', overflow: 'hidden', transition: 'width 0.2s ease', flexShrink: 0, position: 'relative' }}>
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
          <main style={{ flex: 1, overflow: 'auto', padding: '20px', background: 'rgba(10,15,26,0.72)' }}>
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
          <div style={{ position: 'fixed', bottom: isMobile ? '0' : '20px', right: isMobile ? '0' : '20px', left: isMobile ? '0' : 'auto', width: isMobile ? '100%' : '380px', height: isMobile ? '70vh' : '550px', background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(148,163,176,0.2)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(148,163,176,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(203,166,88,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} color="#cba658" />
                <div>
                  <div style={{ color: '#cba658', fontSize: '13px', fontWeight: '600' }}>AuditDNA Assistant</div>
                  <div style={{ color: '#22c55e', fontSize: '10px' }}>81 Niner Miners Learning</div>
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
                  Welcome! I'm connected to 81 Niner Miners that learn from every conversation. I'll analyze your needs and suggest new modules, workflows, and systems automatically. Ask me anything! (English & Spanish)
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
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(148,163,176,0.12)', color: '#94a3b0', fontSize: '11px' }}>Analyzing with 81 Niner Miners...</div>
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
        <React.Suspense fallback={null}>
          <MissionControl
            isOpen={missionControlOpen}
            onClose={() => setMissionControlOpen(false)}
            onOpenCalendar={() => { setMissionControlOpen(false); setActiveModule('Seasonal Calendar'); }}
            onOpenMarketing={() => { setMissionControlOpen(false); setActiveModule('Email Marketing'); }}
            onOpenCRM={() => { setMissionControlOpen(false); setActiveModule('Saul Intel CRM'); }}
          />
        </React.Suspense>

        {/* COMMAND SPHERE MODAL */}
        <React.Suspense fallback={null}>
          <CommandSphere
            isOpen={commandSphereOpen}
            onClose={() => setCommandSphereOpen(false)}
            onNavigate={(module) => {
              setActiveModule(module);
              setCommandSphereOpen(false);
            }}
          />
        </React.Suspense>

        {/* CSS ANIMATIONS */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(34,197,94,0.6); }
            50% { opacity: 0.5; box-shadow: 0 0 16px rgba(34,197,94,0.8); }
          }
        `}</style>
        </div>
      </div>
    </IntelligenceProvider>
  );
};

export default App;
