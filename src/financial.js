// financial.js - AI-Powered Receivables Factoring Platform
// Path: C:\AuditDNA\AUDIT_DNA_Frontend_Final\backend\financial.js

export const FACTORING_TIERS = {
  premium: {
    name: 'Premium Tier',
    feeRange: '1.5% - 2.5%',
    baseFee: 2.0,
    requirements: 'Annual revenue $10M+, Strong credit (700+)',
    turnaround: '24 hours',
    maxAdvance: 90
  },
  standard: {
    name: 'Standard Tier',
    feeRange: '2.5% - 4.0%',
    baseFee: 3.25,
    requirements: 'Annual revenue $2M-$10M, Good credit (650+)',
    turnaround: '48 hours',
    maxAdvance: 85
  },
  developing: {
    name: 'Developing Tier',
    feeRange: '4.0% - 6.0%',
    baseFee: 5.0,
    requirements: 'Annual revenue $500K-$2M, Fair credit (600+)',
    turnaround: '72 hours',
    maxAdvance: 80
  },
  startup: {
    name: 'Startup Tier',
    feeRange: '6.0% - 8.0%',
    baseFee: 7.0,
    requirements: 'New business, Limited credit history',
    turnaround: '5-7 days',
    maxAdvance: 75
  }
};

export const PAYMENT_TERMS = {
  net15: { days: 15, description: 'Payment due in 15 days', discount: 0 },
  net30: { days: 30, description: 'Payment due in 30 days', discount: 0 },
  net45: { days: 45, description: 'Payment due in 45 days', discount: 0 },
  net60: { days: 60, description: 'Payment due in 60 days', discount: 0 },
  net90: { days: 90, description: 'Payment due in 90 days', discount: 0 },
  '2/10net30': { days: 30, description: '2% discount if paid within 10 days', discount: 2, earlyDays: 10 },
  '1/15net45': { days: 45, description: '1% discount if paid within 15 days', discount: 1, earlyDays: 15 }
};

export const CURRENCY_RATES = {
  USD: { symbol: '$', name: 'US Dollar', rate: 1.0 },
  MXN: { symbol: '$', name: 'Mexican Peso', rate: 17.25 },
  COP: { symbol: '$', name: 'Colombian Peso', rate: 4150.00 },
  PEN: { symbol: 'S/', name: 'Peruvian Sol', rate: 3.75 },
  CLP: { symbol: '$', name: 'Chilean Peso', rate: 920.00 },
  EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
  CAD: { symbol: '$', name: 'Canadian Dollar', rate: 1.36 }
};

// ============================================================================
// 🚀 NEW: AI-POWERED RECEIVABLES UPLOAD & ANALYSIS ENGINE
// ============================================================================

/**
 * RECEIVABLE UPLOAD ANALYZER
 * Processes uploaded invoices and extracts key data
 */
export function analyzeUploadedReceivables(fileData, fileType = 'csv') {
  const receivables = [];
  let totalAmount = 0;
  let issues = [];
  
  try {
    // Parse based on file type
    let parsedData;
    
    if (fileType === 'csv') {
      parsedData = parseCSVReceivables(fileData);
    } else if (fileType === 'excel') {
      parsedData = parseExcelReceivables(fileData);
    } else if (fileType === 'json') {
      parsedData = JSON.parse(fileData);
    }
    
    // Process each receivable
    parsedData.forEach((record, index) => {
      const receivable = {
        id: `INV-${Date.now()}-${index}`,
        invoiceNumber: record.invoiceNumber || record.invoice_number || `INV-${index + 1}`,
        buyerName: record.buyerName || record.buyer_name || record.customer || 'Unknown',
        buyerTaxId: record.buyerTaxId || record.tax_id || '',
        amount: parseFloat(record.amount || 0),
        currency: record.currency || 'USD',
        invoiceDate: record.invoiceDate || record.invoice_date || new Date().toISOString(),
        dueDate: record.dueDate || record.due_date || '',
        paymentTerms: record.paymentTerms || record.payment_terms || 'net30',
        product: record.product || record.products || '',
        status: 'pending_analysis',
        uploadDate: new Date().toISOString()
      };
      
      // Validation
      if (!receivable.buyerName || receivable.buyerName === 'Unknown') {
        issues.push({
          receivableId: receivable.id,
          issue: 'Missing buyer name',
          severity: 'high'
        });
      }
      
      if (receivable.amount <= 0) {
        issues.push({
          receivableId: receivable.id,
          issue: 'Invalid amount',
          severity: 'critical'
        });
      }
      
      if (!receivable.dueDate) {
        // Calculate due date based on payment terms
        const daysToAdd = PAYMENT_TERMS[receivable.paymentTerms]?.days || 30;
        const due = new Date(receivable.invoiceDate);
        due.setDate(due.getDate() + daysToAdd);
        receivable.dueDate = due.toISOString();
      }
      
      totalAmount += receivable.amount;
      receivables.push(receivable);
    });
    
    return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    targetCurrency: toCurrency,
    exchangeRate: to.rate / from.rate,
    timestamp: new Date().toISOString()
  };
}

export function calculatePaymentTerms(invoiceAmount, terms, earlyPaymentDate = null) {
  const termData = PAYMENT_TERMS[terms];
  if (!termData) throw new Error('Invalid payment terms');
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + termData.days);
  
  let discountAvailable = 0;
  let discountDeadline = null;
  let amountDue = invoiceAmount;
  
  if (termData.discount && termData.earlyDays) {
    discountAvailable = invoiceAmount * (termData.discount / 100);
    discountDeadline = new Date();
    discountDeadline.setDate(discountDeadline.getDate() + termData.earlyDays);
    
    if (earlyPaymentDate && new Date(earlyPaymentDate) <= discountDeadline) {
      amountDue = invoiceAmount - discountAvailable;
    }
  }
  
  return {
    invoiceAmount, terms, termDescription: termData.description,
    dueDate: dueDate.toISOString().split('T')[0],
    daysToPay: termData.days, discountAvailable,
    discountDeadline: discountDeadline ? discountDeadline.toISOString().split('T')[0] : null,
    amountDue, savings: invoiceAmount - amountDue
  };
}

export function generateFinancialReport(transactions, period = 'monthly') {
  const report = {
    period, totalInvoices: transactions.length, totalRevenue: 0,
    totalFactored: 0, totalFees: 0, averageInvoice: 0,
    averageDaysToPay: 0, byBuyer: {}, byProduct: {}, byRegion: {}, cashFlow: []
  };
  
  transactions.forEach(tx => {
    report.totalRevenue += tx.amount || 0;
    report.totalFactored += tx.factoredAmount || 0;
    report.totalFees += tx.fees || 0;
    
    if (tx.buyer) {
      if (!report.byBuyer[tx.buyer]) report.byBuyer[tx.buyer] = { count: 0, total: 0 };
      report.byBuyer[tx.buyer].count++;
      report.byBuyer[tx.buyer].total += tx.amount;
    }
    
    if (tx.product) {
      if (!report.byProduct[tx.product]) report.byProduct[tx.product] = { count: 0, total: 0 };
      report.byProduct[tx.product].count++;
      report.byProduct[tx.product].total += tx.amount;
    }
    
    if (tx.region) {
      if (!report.byRegion[tx.region]) report.byRegion[tx.region] = { count: 0, total: 0 };
      report.byRegion[tx.region].count++;
      report.byRegion[tx.region].total += tx.amount;
    }
  });
  
  report.averageInvoice = report.totalInvoices > 0 ? report.totalRevenue / report.totalInvoices : 0;
  report.netRevenue = report.totalRevenue - report.totalFees;
  report.feePercentage = report.totalRevenue > 0 ? (report.totalFees / report.totalRevenue) * 100 : 0;
  
  return report;
}

export function projectCashFlow(currentCash, projectedInvoices, projectedExpenses, months = 12) {
  const projection = [];
  let runningBalance = currentCash;
  
  for (let i = 0; i < months; i++) {
    const monthInvoices = projectedInvoices[i] || 0;
    const monthExpenses = projectedExpenses[i] || 0;
    const netCashFlow = monthInvoices - monthExpenses;
    runningBalance += netCashFlow;
    
    projection.push({
      month: i + 1,
      monthName: new Date(2025, i, 1).toLocaleString('default', { month: 'short' }),
      inflow: monthInvoices, outflow: monthExpenses, netCashFlow,
      endingBalance: runningBalance, isPositive: runningBalance > 0
    });
  }
  
  return {
    projection,
    summary: {
      startingBalance: currentCash,
      endingBalance: runningBalance,
      totalInflow: projection.reduce((sum, m) => sum + m.inflow, 0),
      totalOutflow: projection.reduce((sum, m) => sum + m.outflow, 0),
      netChange: runningBalance - currentCash,
      lowestBalance: Math.min(...projection.map(m => m.endingBalance)),
      highestBalance: Math.max(...projection.map(m => m.endingBalance))
    }
  };
}

// EXPORT ALL FUNCTIONS
export default {
  FACTORING_TIERS,
  PAYMENT_TERMS,
  CURRENCY_RATES,
  calculateFactoring,
  analyzeWorkingCapital,
  assessCreditRisk,
  convertCurrency,
  calculatePaymentTerms,
  generateFinancialReport,
  projectCashFlow,
  // NEW AI-POWERED FUNCTIONS
  analyzeUploadedReceivables,
  analyzeBuyerCredit,
  analyzePortfolioRisk,
  generateFactoringQuote,
  generateLOI
};
      success: true,
      receivables,
      summary: {
        totalReceivables: receivables.length,
        totalAmount,
        currency: receivables[0]?.currency || 'USD',
        validReceivables: receivables.length - issues.filter(i => i.severity === 'critical').length,
        issues
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      receivables: [],
      issues: [{ issue: 'File parsing failed', severity: 'critical', details: error.message }]
    };
  }
}

/**
 * AI BUYER CREDIT ANALYSIS
 * Cross-references buyers against internal database and external data
 */
export function analyzeBuyerCredit(buyerName, buyerTaxId = null) {
  // Simulate AI credit search across databases
  const knownBuyers = [
    { name: 'Sysco Corporation', taxId: '12-3456789', creditScore: 780, revenue: 68000000000, rating: 'AAA' },
    { name: 'US Foods', taxId: '98-7654321', creditScore: 765, revenue: 29000000000, rating: 'AA+' },
    { name: 'Dole Food Company', taxId: '45-6789012', creditScore: 745, revenue: 9000000000, rating: 'AA' },
    { name: 'Fresh Del Monte', taxId: '23-4567890', creditScore: 730, revenue: 4500000000, rating: 'AA-' },
    { name: 'Mission Produce', taxId: '67-8901234', creditScore: 710, revenue: 1200000000, rating: 'A+' }
  ];
  
  // Fuzzy match buyer name
  let match = knownBuyers.find(b => 
    b.name.toLowerCase().includes(buyerName.toLowerCase()) ||
    buyerName.toLowerCase().includes(b.name.toLowerCase()) ||
    (buyerTaxId && b.taxId === buyerTaxId)
  );
  
  if (!match) {
    // Unknown buyer - assign conservative estimates
    match = {
      name: buyerName,
      taxId: buyerTaxId || 'Unknown',
      creditScore: 600,
      revenue: 0,
      rating: 'Not Rated',
      isUnknown: true,
      riskNote: 'Buyer not found in database - additional verification required'
    };
  }
  
  // Calculate risk metrics
  const riskAssessment = assessCreditRisk({
    creditScore: match.creditScore,
    annualRevenue: match.revenue,
    yearsInBusiness: match.isUnknown ? 0 : 10,
    paymentHistory: [],
    outstandingDebt: 0,
    industry: 'Food Distribution'
  });
  
  return {
    buyer: match,
    creditScore: match.creditScore,
    rating: match.rating,
    riskLevel: riskAssessment.riskLevel,
    riskScore: riskAssessment.riskScore,
    recommendedTerms: riskAssessment.recommendedTerms,
    creditLimit: riskAssessment.creditLimit,
    verified: !match.isUnknown,
    notes: match.riskNote || ''
  };
}

/**
 * PORTFOLIO RISK ANALYZER
 * Analyzes entire portfolio of receivables for concentration risk
 */
export function analyzePortfolioRisk(receivables) {
  const portfolio = {
    totalAmount: 0,
    byBuyer: {},
    byRiskLevel: { low: 0, moderate: 0, elevated: 0, high: 0 },
    concentrationRisk: 'Low',
    diversificationScore: 0,
    recommendations: []
  };
  
  // Analyze each receivable
  receivables.forEach(rec => {
    portfolio.totalAmount += rec.amount;
    
    // Group by buyer
    if (!portfolio.byBuyer[rec.buyerName]) {
      portfolio.byBuyer[rec.buyerName] = {
        count: 0,
        totalAmount: 0,
        creditAnalysis: null
      };
    }
    portfolio.byBuyer[rec.buyerName].count++;
    portfolio.byBuyer[rec.buyerName].totalAmount += rec.amount;
  });
  
  // Analyze buyer credit and risk
  Object.keys(portfolio.byBuyer).forEach(buyerName => {
    const buyerData = portfolio.byBuyer[buyerName];
    const creditAnalysis = analyzeBuyerCredit(buyerName);
    buyerData.creditAnalysis = creditAnalysis;
    buyerData.percentOfPortfolio = (buyerData.totalAmount / portfolio.totalAmount) * 100;
    
    // Risk categorization
    const riskLevel = creditAnalysis.riskLevel.toLowerCase().replace(' risk', '');
    portfolio.byRiskLevel[riskLevel] = (portfolio.byRiskLevel[riskLevel] || 0) + buyerData.totalAmount;
    
    // Concentration risk check
    if (buyerData.percentOfPortfolio > 40) {
      portfolio.concentrationRisk = 'Critical';
      portfolio.recommendations.push(`High concentration: ${buyerName} represents ${buyerData.percentOfPortfolio.toFixed(1)}% of portfolio`);
    } else if (buyerData.percentOfPortfolio > 25) {
      portfolio.concentrationRisk = 'High';
      portfolio.recommendations.push(`Elevated concentration: ${buyerName} represents ${buyerData.percentOfPortfolio.toFixed(1)}% of portfolio`);
    }
  });
  
  // Calculate diversification score (0-100)
  const buyerCount = Object.keys(portfolio.byBuyer).length;
  const herfindahl = Object.values(portfolio.byBuyer).reduce((sum, buyer) => {
    const marketShare = buyer.totalAmount / portfolio.totalAmount;
    return sum + (marketShare * marketShare);
  }, 0);
  
  portfolio.diversificationScore = Math.round((1 - herfindahl) * 100);
  
  if (portfolio.diversificationScore < 30) {
    portfolio.recommendations.push('Portfolio is highly concentrated - consider diversifying buyer base');
  }
  
  return portfolio;
}

/**
 * FACTORING QUOTE GENERATOR
 * Generates customized factoring quotes based on portfolio analysis
 */
export function generateFactoringQuote(receivables, clientData = {}) {
  const portfolioAnalysis = analyzePortfolioRisk(receivables);
  const totalInvoiceValue = portfolioAnalysis.totalAmount;
  
  // Determine appropriate tier based on portfolio quality
  let recommendedTier = 'standard';
  const lowRiskPercent = (portfolioAnalysis.byRiskLevel.low / totalInvoiceValue) * 100;
  const highRiskPercent = (portfolioAnalysis.byRiskLevel.high / totalInvoiceValue) * 100;
  
  if (lowRiskPercent > 70 && portfolioAnalysis.concentrationRisk !== 'Critical') {
    recommendedTier = 'premium';
  } else if (highRiskPercent > 30 || portfolioAnalysis.concentrationRisk === 'Critical') {
    recommendedTier = 'developing';
  } else if (totalInvoiceValue < 100000) {
    recommendedTier = 'startup';
  }
  
  const tier = FACTORING_TIERS[recommendedTier];
  
  // Calculate quote details
  const advanceRate = tier.maxAdvance;
  const advanceAmount = totalInvoiceValue * (advanceRate / 100);
  const estimatedFees = totalInvoiceValue * (tier.baseFee / 100);
  const netAmount = advanceAmount - estimatedFees;
  
  // Generate receivable-by-receivable breakdown
  const receivableBreakdown = receivables.map(rec => {
    const creditAnalysis = analyzeBuyerCredit(rec.buyerName, rec.buyerTaxId);
    const recAdvance = rec.amount * (advanceRate / 100);
    const recFee = rec.amount * (tier.baseFee / 100);
    
    return {
      invoiceNumber: rec.invoiceNumber,
      buyer: rec.buyerName,
      amount: rec.amount,
      buyerRating: creditAnalysis.rating,
      riskLevel: creditAnalysis.riskLevel,
      advanceAmount: recAdvance,
      factoringFee: recFee,
      netProceeds: recAdvance - recFee,
      status: creditAnalysis.verified ? 'approved' : 'requires_verification'
    };
  });
  
  const approvedReceivables = receivableBreakdown.filter(r => r.status === 'approved');
  const pendingReceivables = receivableBreakdown.filter(r => r.status !== 'approved');
  
  return {
    quoteId: `QT-${Date.now()}`,
    quoteDate: new Date().toISOString(),
    expiresIn: '7 days',
    client: clientData,
    portfolio: {
      totalReceivables: receivables.length,
      totalValue: totalInvoiceValue,
      approvedCount: approvedReceivables.length,
      approvedValue: approvedReceivables.reduce((sum, r) => sum + r.amount, 0),
      pendingCount: pendingReceivables.length,
      pendingValue: pendingReceivables.reduce((sum, r) => sum + r.amount, 0)
    },
    terms: {
      tier: recommendedTier,
      tierName: tier.name,
      advanceRate: `${advanceRate}%`,
      feeRate: `${tier.baseFee}%`,
      turnaround: tier.turnaround
    },
    financials: {
      totalInvoiceValue,
      advanceAmount,
      estimatedFees,
      netAmount,
      reserveAmount: totalInvoiceValue - advanceAmount
    },
    receivableBreakdown,
    portfolioAnalysis,
    status: pendingReceivables.length === 0 ? 'ready_for_loi' : 'requires_verification',
    nextSteps: pendingReceivables.length > 0 
      ? [`Verify ${pendingReceivables.length} buyers before LOI generation`]
      : ['Review quote', 'Generate LOI', 'Sign agreement', 'Receive funds']
  };
}

/**
 * LOI (LETTER OF INTENT) GENERATOR
 * Creates formal LOI document based on approved quote
 */
export function generateLOI(quote, clientCompanyName, clientSignatory) {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const loi = {
    loiNumber: `LOI-${Date.now()}`,
    issueDate: today,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    parties: {
      factor: {
        name: 'AuditDNA Financial Services',
        address: '123 Finance Street, New York, NY 10001',
        contact: 'factoring@auditdna.com',
        phone: '+1 (555) 123-4567'
      },
      client: {
        name: clientCompanyName,
        signatory: clientSignatory,
        quoteId: quote.quoteId
      }
    },
    terms: {
      facilityAmount: quote.portfolio.approvedValue,
      advanceRate: quote.terms.advanceRate,
      factoringFee: quote.terms.feeRate,
      tier: quote.terms.tierName,
      turnaround: quote.terms.turnaround,
      minimumVolume: '$50,000 per month',
      termLength: '12 months (renewable)'
    },
    approvedReceivables: {
      count: quote.portfolio.approvedCount,
      totalValue: quote.portfolio.approvedValue,
      buyerList: [...new Set(quote.receivableBreakdown.map(r => r.buyer))]
    },
    conditions: [
      'All invoices must be verified and approved by AuditDNA',
      'Buyer creditworthiness must meet minimum standards',
      'No liens or encumbrances on receivables',
      'Client maintains accurate financial records',
      'Monthly reporting of aged receivables required'
    ],
    benefits: [
      `Immediate cash advance of ${quote.terms.advanceRate} of invoice value`,
      `Fast funding within ${quote.terms.turnaround}`,
      'No debt on balance sheet',
      'Professional collections management',
      'Credit protection on approved buyers'
    ],
    documentText: `
LETTER OF INTENT FOR INVOICE FACTORING SERVICES

Date: ${today}
LOI Number: ${`LOI-${Date.now()}`}
Valid Until: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')}

FROM: AuditDNA Financial Services
TO: ${clientCompanyName}

Dear ${clientSignatory},

This Letter of Intent ("LOI") outlines the proposed terms for invoice factoring services to be provided by AuditDNA Financial Services ("Factor") to ${clientCompanyName} ("Client").

PROPOSED TERMS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Facility Amount: $${quote.portfolio.approvedValue.toLocaleString()}
Advance Rate: ${quote.terms.advanceRate} of invoice face value
Factoring Fee: ${quote.terms.feeRate} of invoice value
Service Tier: ${quote.terms.tierName}
Funding Turnaround: ${quote.terms.turnaround}
Term Length: 12 months (automatically renewable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPROVED RECEIVABLES:
Total Receivables: ${quote.portfolio.approvedCount}
Total Value: $${quote.portfolio.approvedValue.toLocaleString()}
Approved Buyers: ${quote.approvedReceivables.buyerList.join(', ')}

ESTIMATED PROCEEDS:
Total Invoice Value: $${quote.financials.totalInvoiceValue.toLocaleString()}
Immediate Advance (${quote.terms.advanceRate}): $${quote.financials.advanceAmount.toLocaleString()}
Estimated Fees (${quote.terms.feeRate}): $${quote.financials.estimatedFees.toLocaleString()}
Net Proceeds: $${quote.financials.netAmount.toLocaleString()}

This LOI represents our commitment to provide factoring services under the terms outlined above, subject to final due diligence, documentation, and mutual agreement on the definitive factoring agreement.

This LOI is non-binding and expires on ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')}.

For AuditDNA Financial Services,
_______________________________
Authorized Signatory

Acknowledged and Accepted by ${clientCompanyName},
_______________________________
${clientSignatory}
Date: _______________
    `,
    status: 'draft',
    requiresSignature: true
  };
  
  return loi;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseCSVReceivables(csvData) {
  const lines = csvData.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || '';
    });
    data.push(record);
  }
  
  return data;
}

function parseExcelReceivables(excelData) {
  // Placeholder for Excel parsing (would use library like xlsx)
  return JSON.parse(excelData);
}

// ============================================================================
// EXISTING FUNCTIONS (from original financial.js)
// ============================================================================

export function calculateFactoring(invoiceAmount, advancePercent, tier, paymentDays = 30) {
  const tierData = FACTORING_TIERS[tier] || FACTORING_TIERS.standard;
  const maxAdvance = tierData.maxAdvance;
  const actualAdvance = Math.min(advancePercent, maxAdvance);
  const advanceAmount = invoiceAmount * (actualAdvance / 100);
  const reserveAmount = invoiceAmount - advanceAmount;
  const dailyRate = tierData.baseFee / 30;
  const factoringFee = invoiceAmount * (dailyRate * paymentDays / 100);
  const totalDue = invoiceAmount - factoringFee;
  const reserveRelease = reserveAmount - factoringFee;
  const effectiveAPR = (factoringFee / advanceAmount) * (365 / paymentDays) * 100;
  
  return {
    invoiceAmount, advancePercent: actualAdvance, advanceAmount, reserveAmount,
    factoringFee, totalDue, reserveRelease, effectiveAPR,
    tier: tierData.name, feeRate: tierData.baseFee,
    turnaround: tierData.turnaround, paymentDays
  };
}

export function analyzeWorkingCapital(data) {
  const { currentAssets = 0, currentLiabilities = 0, inventory = 0,
    accountsReceivable = 0, accountsPayable = 0, cash = 0 } = data;
  
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
  const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0;
  const daysInventory = inventory > 0 ? (inventory / (currentAssets / 365)) : 0;
  const daysReceivable = accountsReceivable > 0 ? (accountsReceivable / (currentAssets / 365)) : 0;
  const daysPayable = accountsPayable > 0 ? (accountsPayable / (currentLiabilities / 365)) : 0;
  const cashConversionCycle = daysInventory + daysReceivable - daysPayable;
  
  return {
    workingCapital, currentRatio, quickRatio, cashRatio,
    daysInventory: Math.round(daysInventory),
    daysReceivable: Math.round(daysReceivable),
    daysPayable: Math.round(daysPayable),
    cashConversionCycle: Math.round(cashConversionCycle),
    healthScore: calculateHealthScore({ currentRatio, quickRatio, cashRatio })
  };
}

function calculateHealthScore(ratios) {
  let score = 0;
  if (ratios.currentRatio >= 2.0) score += 40;
  else if (ratios.currentRatio >= 1.5) score += 30;
  else if (ratios.currentRatio >= 1.0) score += 20;
  else score += 10;
  
  if (ratios.quickRatio >= 1.5) score += 35;
  else if (ratios.quickRatio >= 1.0) score += 25;
  else if (ratios.quickRatio >= 0.75) score += 15;
  else score += 5;
  
  if (ratios.cashRatio >= 0.5) score += 25;
  else if (ratios.cashRatio >= 0.3) score += 15;
  else if (ratios.cashRatio >= 0.1) score += 10;
  else score += 5;
  
  return score;
}

export function assessCreditRisk(buyerData) {
  const { creditScore = 0, annualRevenue = 0, yearsInBusiness = 0,
    paymentHistory = [], outstandingDebt = 0, industry = '' } = buyerData;
  
  let riskScore = 0;
  let riskFactors = [];
  
  if (creditScore >= 750) riskScore += 40;
  else if (creditScore >= 700) riskScore += 35;
  else if (creditScore >= 650) riskScore += 25;
  else if (creditScore >= 600) { riskScore += 15; riskFactors.push('Below average credit score'); }
  else { riskScore += 5; riskFactors.push('Poor credit score'); }
  
  if (annualRevenue >= 10000000) riskScore += 25;
  else if (annualRevenue >= 5000000) riskScore += 20;
  else if (annualRevenue >= 1000000) riskScore += 15;
  else if (annualRevenue >= 500000) { riskScore += 10; riskFactors.push('Limited annual revenue'); }
  else { riskScore += 5; riskFactors.push('Low annual revenue'); }
  
  if (yearsInBusiness >= 10) riskScore += 20;
  else if (yearsInBusiness >= 5) riskScore += 15;
  else if (yearsInBusiness >= 3) riskScore += 10;
  else if (yearsInBusiness >= 1) { riskScore += 5; riskFactors.push('Limited business history'); }
  else { riskScore += 2; riskFactors.push('Startup/New business'); }
  
  if (paymentHistory.length > 0) {
    const onTimePayments = paymentHistory.filter(p => p.onTime).length;
    const onTimeRate = onTimePayments / paymentHistory.length;
    if (onTimeRate >= 0.95) riskScore += 15;
    else if (onTimeRate >= 0.85) riskScore += 12;
    else if (onTimeRate >= 0.75) { riskScore += 8; riskFactors.push('Some late payments'); }
    else { riskScore += 3; riskFactors.push('Frequent late payments'); }
  } else {
    riskScore += 7;
    riskFactors.push('No payment history available');
  }
  
  let riskLevel, creditLimit, recommendedTerms, approvalStatus;
  
  if (riskScore >= 85) {
    riskLevel = 'Low Risk';
    creditLimit = annualRevenue * 0.15;
    recommendedTerms = 'net60';
    approvalStatus = 'Auto-Approved';
  } else if (riskScore >= 70) {
    riskLevel = 'Moderate Risk';
    creditLimit = annualRevenue * 0.10;
    recommendedTerms = 'net45';
    approvalStatus = 'Approved with Conditions';
  } else if (riskScore >= 50) {
    riskLevel = 'Elevated Risk';
    creditLimit = annualRevenue * 0.05;
    recommendedTerms = 'net30';
    approvalStatus = 'Manual Review Required';
  } else {
    riskLevel = 'High Risk';
    creditLimit = annualRevenue * 0.02;
    recommendedTerms = 'net15';
    approvalStatus = 'Requires Guarantee/COD';
  }
  
  return {
    riskScore, riskLevel, creditLimit, recommendedTerms, approvalStatus, riskFactors,
    analysis: { creditScore, annualRevenue, yearsInBusiness, paymentRecords: paymentHistory.length }
  };
}

export function convertCurrency(amount, fromCurrency, toCurrency) {
  const from = CURRENCY_RATES[fromCurrency];
  const to = CURRENCY_RATES[toCurrency];
  if (!from || !to) throw new Error('Invalid currency code');
  const usdAmount = amount / from.rate;
  const convertedAmount = usdAmount * to.rate;
  return {