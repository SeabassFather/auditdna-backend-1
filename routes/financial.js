// financial.js - Main Financial Router
// Path: C:\AuditDNA\AUDIT_DNA_Frontend_Final\backend\financial.js

const express = require('express');
const router = express.Router();

// Import all financial modules
const factoringRouter = require('./financial/factoring');
const paymentTermsRouter = require('./financial/payment-terms');
const creditRiskRouter = require('./financial/credit-risk');
const workingCapitalRouter = require('./financial/working-capital');
const currencyRouter = require('./financial/currency');
const reportsRouter = require('./financial/reports');

// Mount all sub-routers
router.use('/factoring', factoringRouter);
router.use('/payment-terms', paymentTermsRouter);
router.use('/credit-risk', creditRiskRouter);
router.use('/working-capital', workingCapitalRouter);
router.use('/currency', currencyRouter);
router.use('/reports', reportsRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Financial API is running',
    timestamp: new Date().toISOString(),
    modules: [
      { name: 'Invoice Factoring', status: 'active', endpoint: '/api/financial/factoring' },
      { name: 'Payment Terms', status: 'active', endpoint: '/api/financial/payment-terms' },
      { name: 'Credit Risk', status: 'active', endpoint: '/api/financial/credit-risk' },
      { name: 'Working Capital', status: 'active', endpoint: '/api/financial/working-capital' },
      { name: 'Currency Exchange', status: 'active', endpoint: '/api/financial/currency' },
      { name: 'Financial Reports', status: 'active', endpoint: '/api/financial/reports' }
    ]
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    documentation: {
      factoring: {
        calculate: 'POST /api/financial/factoring/calculate',
        tiers: 'GET /api/financial/factoring/tiers',
        batch: 'POST /api/financial/factoring/batch'
      },
      paymentTerms: {
        standard: 'GET /api/financial/payment-terms/standard',
        discountAnalysis: 'POST /api/financial/payment-terms/discount-analysis',
        compare: 'POST /api/financial/payment-terms/compare',
        aging: 'POST /api/financial/payment-terms/aging'
      },
      creditRisk: {
        score: 'POST /api/financial/credit-risk/score',
        assess: 'POST /api/financial/credit-risk/assess',
        tiers: 'GET /api/financial/credit-risk/tiers'
      },
      workingCapital: {
        calculate: 'POST /api/financial/working-capital/calculate',
        cashFlowProjection: 'POST /api/financial/working-capital/cash-flow-projection',
        dso: 'POST /api/financial/working-capital/dso',
        cashConversionCycle: 'POST /api/financial/working-capital/cash-conversion-cycle'
      },
      currency: {
        rates: 'GET /api/financial/currency/rates',
        convert: 'POST /api/financial/currency/convert',
        batchConvert: 'POST /api/financial/currency/batch-convert',
        historical: 'GET /api/financial/currency/historical',
        supported: 'GET /api/financial/currency/supported',
        riskExposure: 'POST /api/financial/currency/risk-exposure'
      },
      reports: {
        summary: 'POST /api/financial/reports/summary',
        arAging: 'POST /api/financial/reports/ar-aging',
        profitability: 'POST /api/financial/reports/profitability',
        cashFlow: 'POST /api/financial/reports/cash-flow',
        dashboard: 'GET /api/financial/reports/dashboard'
      }
    }
  });
});

module.exports = router;