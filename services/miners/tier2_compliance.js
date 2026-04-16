// TIER 2 - FEE COMPLIANCE ANALYSIS (AI)
// Signature: analyzeFeeCompliance(extractedData, loanData)

const ZERO_TOLERANCE_FEES = ['Origination Fee','Processing Fee','Underwriting Fee','Credit Report Fee','Flood Cert Fee','Tax Service Fee','Document Prep Fee'];
const TEN_PCT_TOLERANCE_FEES = ['Title Insurance','Appraisal Fee','Settlement Fee','Recording Fee'];
const FEE_BENCHMARKS = {
  'Origination Fee':{maxPctOfLoan:1.5,maxFlat:6000},'Appraisal Fee':{maxFlat:700},'Credit Report Fee':{maxFlat:65},
  'Title Insurance':{maxPctOfLoan:0.5,maxFlat:3500},'Recording Fee':{maxFlat:250},'Tax Service Fee':{maxFlat:85},
  'Transfer Tax':{maxPctOfLoan:0.5},'Flood Cert Fee':{maxFlat:25},'Settlement Fee':{maxFlat:750},
  'Processing Fee':{maxFlat:550},'Underwriting Fee':{maxFlat:900},'Wire Transfer Fee':{maxFlat:55},
  'Document Prep Fee':{maxFlat:200},'PMI Premium':{maxPctOfLoan:0.15}
};

const analyzeFeeCompliance = async (extractedData, loanData) => {
  console.log('   [Tier 2] Fee Compliance Analysis (AI)...');
  const violations = [];
  const loanAmount = extractedData.loanAmount || parseFloat(String(loanData?.loanAmount || 0).replace(/[^0-9.]/g, ''));
  const rate = extractedData.interestRate || parseFloat(loanData?.interestRate || 0);
  const loanType = (loanData?.loanType || 'Conventional').toLowerCase();

  // CD vs LE Fee Tolerance Violations (TRID)
  if (extractedData.feeComparison) {
    for (const [feeName, comp] of Object.entries(extractedData.feeComparison)) {
      const diff = comp.diff; if (diff <= 0) continue;
      const isZeroTol = ZERO_TOLERANCE_FEES.some(f => feeName.toLowerCase().includes(f.toLowerCase()));
      const isTenPct = TEN_PCT_TOLERANCE_FEES.some(f => feeName.toLowerCase().includes(f.toLowerCase()));
      if (isZeroTol && diff > 0) {
        violations.push({ tier:2, type:'ZERO_TOLERANCE', violationType:`${feeName} -- Zero Tolerance Violation`, law:'TRID 12 CFR 1026.19(e)(3)(i) -- Zero-tolerance fee increase without valid changed circumstance', description:`${feeName} increased from $${comp.le.toLocaleString()} (LE) to $${comp.cd.toLocaleString()} (CD). Overcharge of $${diff.toLocaleString()}.`, recoveryAmount:Math.round(diff), confidence:94 });
      } else if (isTenPct && comp.le > 0 && (diff/comp.le) > 0.10) {
        const pctOver = ((diff/comp.le)*100).toFixed(1);
        violations.push({ tier:2, type:'FEE_TOLERANCE', violationType:`${feeName} -- 10% Tolerance Violation`, law:'TRID 12 CFR 1026.19(e)(3)(ii) -- Fee increased beyond 10% tolerance bucket', description:`${feeName} exceeded 10% tolerance: $${comp.le.toLocaleString()} (LE) to $${comp.cd.toLocaleString()} (CD). ${pctOver}% increase.`, recoveryAmount:Math.round(diff-(comp.le*0.10)), confidence:91 });
      } else if (!isZeroTol && !isTenPct && diff > 50) {
        violations.push({ tier:2, type:'FEE_OVERCHARGE', violationType:`${feeName} -- Overcharge`, law:'RESPA 12 USC 2607 -- Unearned fee / fee markup', description:`${feeName} charged $${comp.cd.toLocaleString()} versus estimated $${comp.le.toLocaleString()}.`, recoveryAmount:Math.round(diff), confidence:78 });
      }
    }
  }

  // Fee Benchmark Analysis
  const allFees = extractedData.allFees || {};
  for (const [feeName, amount] of Object.entries(allFees)) {
    const bench = FEE_BENCHMARKS[feeName]; if (!bench) continue;
    let overcharge = 0, law = '', desc = '';
    if (bench.maxFlat && amount > bench.maxFlat) {
      overcharge = Math.round(amount - bench.maxFlat);
      law = 'RESPA 12 USC 2607(b) -- Fee exceeds reasonable third-party cost';
      desc = `${feeName} at $${amount.toLocaleString()} exceeds benchmark of $${bench.maxFlat.toLocaleString()}.`;
    } else if (bench.maxPctOfLoan && loanAmount > 0 && amount > (loanAmount*bench.maxPctOfLoan/100)) {
      const maxAmt = Math.round(loanAmount*bench.maxPctOfLoan/100); overcharge = Math.round(amount - maxAmt);
      law = `RESPA 8 -- ${feeName} exceeds ${bench.maxPctOfLoan}% of loan`; desc = `${feeName} of $${amount.toLocaleString()} exceeds ${bench.maxPctOfLoan}% ($${maxAmt.toLocaleString()}).`;
    }
    if (overcharge > 25 && !violations.some(v => v.violationType.includes(feeName))) {
      violations.push({ tier:2, type:'FEE_OVERCHARGE', violationType:`${feeName} Overcharge`, law, description:desc, recoveryAmount:overcharge, confidence:85 });
    }
  }

  // PMI Violation
  if (loanAmount > 0 && rate > 0) {
    const originDate = loanData?.originationDate ? new Date(loanData.originationDate) : null;
    const monthsOwned = originDate ? Math.max(1, Math.round((Date.now()-originDate.getTime())/(30.44*24*60*60*1000))) : 60;
    const monthlyRate = rate/100/12; const termMonths = 360;
    const payment = loanAmount*(monthlyRate*Math.pow(1+monthlyRate,termMonths))/(Math.pow(1+monthlyRate,termMonths)-1);
    let balance = loanAmount;
    for (let i=0; i<monthsOwned; i++) { balance -= (payment - balance*monthlyRate); }
    const estimatedLTV = (balance/loanAmount)*100;
    if (estimatedLTV < 80 && loanType !== 'fha') {
      const pmiMonthly = allFees['PMI Premium'] || Math.round(loanAmount*0.005/12);
      const monthsOver = Math.max(1, Math.round((80-estimatedLTV)/0.3));
      const pmiRecovery = Math.round(pmiMonthly*monthsOver);
      if (pmiRecovery > 50) {
        violations.push({ tier:2, type:'PMI_VIOLATION', violationType:'PMI Not Cancelled at 80% LTV', law:'HPA 12 USC 4902 -- Automatic PMI termination at 78% LTV / consumer-requested at 80% LTV', description:`Estimated LTV: ${estimatedLTV.toFixed(1)}%. PMI should be cancelled. Est. ${monthsOver} months overcharged at ~$${pmiMonthly}/mo.`, recoveryAmount:pmiRecovery, confidence:estimatedLTV<78?90:82 });
      }
    }
  }

  // Title Insurance Overcharge
  if (extractedData.hasTitle && loanAmount > 0) {
    const titleFee = allFees['Title Insurance'] || 0;
    const titleDoc = (extractedData.documents||[]).find(d => d.docType === 'TITLE_INSURANCE');
    if (titleDoc && titleFee > 0) {
      const text = (titleDoc.rawText||'').toLowerCase();
      if ((text.includes("owner's")||text.includes('owners policy')) && (text.includes("lender's")||text.includes('lenders policy')) && !text.includes('simultaneous') && !text.includes('discount')) {
        const disc = Math.round(titleFee*0.4);
        violations.push({ tier:2, type:'TITLE_OVERCHARGE', violationType:'Title Insurance -- Missing Simultaneous Issue Discount', law:'RESPA 12 USC 2607(b) -- Simultaneous issue discount not applied', description:`Both owner and lender title policies present, no simultaneous discount. Expected: ~$${disc.toLocaleString()}.`, recoveryAmount:disc, confidence:79 });
      }
    }
  }

  console.log(`   [Tier 2] Found ${violations.length} fee compliance violation(s)`);
  return violations;
};

module.exports = { analyzeFeeCompliance };
