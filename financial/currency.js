// currency.js - Currency Exchange API Router
// Save to: backend/financial/currency.js

import express from 'express';
const router = express.Router();

// Exchange rates (would normally come from API)
const CURRENCY_RATES = {
  USD: 1.0,
  MXN: 17.2,
  COP: 4100.0,
  PEN: 3.75,
  CLP: 920.0,
  EUR: 0.92,
  CAD: 1.35
};

// GET /api/financial/currency/rates - Get current exchange rates
router.get('/rates', (req, res) => {
  const { base = 'USD' } = req.query;
  
  const baseRate = CURRENCY_RATES[base] || 1.0;
  const rates = {};
  
  Object.keys(CURRENCY_RATES).forEach(currency => {
    rates[currency] = parseFloat((CURRENCY_RATES[currency] / baseRate).toFixed(4));
  });
  
  res.json({
    success: true,
    base,
    rates,
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  });
});

// GET /api/financial/currency/supported - Get list of supported currencies
router.get('/supported', (req, res) => {
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'COP', name: 'Colombian Peso', symbol: '$' },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' }
  ];
  
  res.json({
    success: true,
    currencies,
    count: currencies.length,
    timestamp: new Date().toISOString()
  });
});

// POST /api/financial/currency/convert - Convert between currencies
router.post('/convert', (req, res) => {
  const { amount, from, to } = req.body;
  
  if (!amount || !from || !to) {
    return res.status(400).json({
      success: false,
      error: 'amount, from, and to currencies are required'
    });
  }
  
  const fromRate = CURRENCY_RATES[from];
  const toRate = CURRENCY_RATES[to];
  
  if (!fromRate || !toRate) {
    return res.status(400).json({
      success: false,
      error: 'Invalid currency code'
    });
  }
  
  const convertedAmount = (amount / fromRate) * toRate;
  const rate = toRate / fromRate;
  
  res.json({
    success: true,
    conversion: {
      amount,
      from,
      to,
      convertedAmount: parseFloat(convertedAmount.toFixed(2)),
      rate: parseFloat(rate.toFixed(4)),
      calculation: `${amount} ${from} = ${convertedAmount.toFixed(2)} ${to}`
    },
    timestamp: new Date().toISOString()
  });
});

// POST /api/financial/currency/batch-convert - Convert multiple amounts
router.post('/batch-convert', (req, res) => {
  const { conversions } = req.body;
  
  if (!conversions || !Array.isArray(conversions)) {
    return res.status(400).json({
      success: false,
      error: 'conversions array is required'
    });
  }
  
  const results = conversions.map((conv, index) => {
    const { amount, from, to } = conv;
    const fromRate = CURRENCY_RATES[from];
    const toRate = CURRENCY_RATES[to];
    
    if (!fromRate || !toRate) {
      return {
        index,
        success: false,
        error: 'Invalid currency code'
      };
    }
    
    const convertedAmount = (amount / fromRate) * toRate;
    const rate = toRate / fromRate;
    
    return {
      index,
      success: true,
      amount,
      from,
      to,
      convertedAmount: parseFloat(convertedAmount.toFixed(2)),
      rate: parseFloat(rate.toFixed(4))
    };
  });
  
  const totalConverted = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.convertedAmount, 0);
  
  res.json({
    success: true,
    results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalConverted: parseFloat(totalConverted.toFixed(2))
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/financial/currency/historical - Get historical rates (placeholder)
router.get('/historical', (req, res) => {
  const { from = 'USD', to = 'MXN', days = 30 } = req.query;
  
  // Generate mock historical data
  const historical = [];
  const baseRate = CURRENCY_RATES[to] / CURRENCY_RATES[from];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variance = (Math.random() - 0.5) * 0.1;
    const rate = baseRate * (1 + variance);
    
    historical.push({
      date: date.toISOString().split('T')[0],
      rate: parseFloat(rate.toFixed(4))
    });
  }
  
  res.json({
    success: true,
    from,
    to,
    period: `${days} days`,
    historical,
    currentRate: parseFloat(baseRate.toFixed(4)),
    timestamp: new Date().toISOString()
  });
});

// POST /api/financial/currency/risk-exposure - Calculate currency risk exposure
router.post('/risk-exposure', (req, res) => {
  const { positions } = req.body;
  
  if (!positions || !Array.isArray(positions)) {
    return res.status(400).json({
      success: false,
      error: 'positions array is required (each with currency and amount)'
    });
  }
  
  let totalUSD = 0;
  const exposures = positions.map(pos => {
    const { currency, amount } = pos;
    const rate = CURRENCY_RATES[currency];
    const usdValue = amount / rate;
    totalUSD += usdValue;
    
    return {
      currency,
      amount,
      usdValue: parseFloat(usdValue.toFixed(2)),
      rate: parseFloat(rate.toFixed(4))
    };
  });
  
  const percentages = exposures.map(exp => ({
    ...exp,
    percentage: parseFloat(((exp.usdValue / totalUSD) * 100).toFixed(2))
  }));
  
  res.json({
    success: true,
    exposure: {
      positions: percentages,
      totalUSD: parseFloat(totalUSD.toFixed(2)),
      diversification: percentages.length,
      largestExposure: Math.max(...percentages.map(p => p.percentage))
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
