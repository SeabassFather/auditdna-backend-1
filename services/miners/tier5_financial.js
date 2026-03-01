// TIER 5 - FINANCIAL RECONCILIATION (SI)
// Signature: reconcileFinancials(extractedData, loanData)
//   NOTE: audits.js calls tier5.reconcileFinancials NOT analyzeFinancials

const reconcileFinancials = async (extractedData, loanData) => {
  console.log('   [Tier 5] Financial Reconciliation (SI)...');
  const violations = [];
  const loanAmount = extractedData.loanAmount || parseFloat(String(loanData?.loanAmount||0).replace(/[^0-9.]/g,''));
  const rate = extractedData.interestRate || parseFloat(loanData?.interestRate||0);
  const loanType = (loanData?.loanType||'Conventional').toLowerCase();
  const allFees = extractedData.allFees || {};

  if (loanAmount <= 0 || rate <= 0) { console.log('   [Tier 5] Insufficient loan data'); return violations; }

  const monthlyRate = rate/100/12; const termMonths = 360;
  const correctPayment = loanAmount*(monthlyRate*Math.pow(1+monthlyRate,termMonths))/(Math.pow(1+monthlyRate,termMonths)-1);

  // Interest Calculation Verification
  if (extractedData.hasStatements) {
    const stmtDocs = (extractedData.documents||[]).filter(d => d.docType === 'MORTGAGE_STATEMENT');
    let totCharged = 0, totExpected = 0, balance = loanAmount, months = 0;
    for (const doc of stmtDocs) {
      const moneyVals = (doc.extracted?.moneyValues||[]).sort((a,b)=>b-a).filter(v=>v>10&&v<loanAmount);
      if (moneyVals.length >= 2) {
        const expInt = balance*monthlyRate; let best=moneyVals[0], bestD=Infinity;
        for (const val of moneyVals) { const d=Math.abs(val-expInt); if (d<bestD&&val<balance*0.01){bestD=d;best=val;} }
        if (bestD < expInt*0.5) { totCharged+=best; totExpected+=expInt; months++; balance-=(correctPayment-expInt); }
      }
    }
    if (months > 0 && totCharged > totExpected) {
      const over = Math.round(totCharged-totExpected);
      if (over > 25) {
        const mo = over/months; const proj = Math.round(mo*24);
        violations.push({ tier:5, type:'INTEREST_OVERCHARGE', violationType:'Interest Calculation Discrepancy', law:'TILA 15 USC 1639 -- Incorrect interest calculation', description:`Interest overcharge ~$${mo.toFixed(0)}/mo across ${months} statements. Projected 24-month: $${proj.toLocaleString()}.`, recoveryAmount:proj, confidence:85 });
      }
    }
  }

  // Escrow Account Analysis
  if (extractedData.hasEscrow || extractedData.hasStatements) {
    const escDoc = (extractedData.documents||[]).find(d => d.docType === 'ESCROW_ANALYSIS');
    if (escDoc) {
      const text = (escDoc.rawText||'').toLowerCase();
      if (text.includes('surplus')) {
        const m = (escDoc.rawText||'').match(/surplus[:\s]*\$?\s?([\d,]+(?:\.\d{2})?)/i);
        if (m) { const surplus = parseFloat(m[1].replace(/,/g,'')); if (surplus > 50) {
          violations.push({ tier:5, type:'ESCROW_SURPLUS', violationType:'Escrow Surplus Not Refunded', law:'RESPA 12 USC 2609(b) -- Surplus over $50 must be refunded within 30 days', description:`Escrow surplus $${surplus.toLocaleString()} not refunded.`, recoveryAmount:Math.round(surplus), confidence:88 });
        }}
      }
      const cm = (escDoc.rawText||'').match(/cushion[:\s]*\$?\s?([\d,]+(?:\.\d{2})?)/i);
      if (cm) {
        const cushion = parseFloat(cm[1].replace(/,/g,''));
        const moneys = (escDoc.extracted?.moneyValues||[]).filter(v=>v>50&&v<50000);
        const annEst = moneys.length>2 ? moneys.sort((a,b)=>b-a)[0]*12 : loanAmount*0.025;
        const maxC = annEst/6;
        if (cushion > maxC && maxC > 0) {
          violations.push({ tier:5, type:'ESCROW_OVERCHARGE', violationType:'Escrow Cushion Violation', law:'RESPA 12 USC 2609(a) -- Cushion exceeds 2-month max', description:`Cushion $${cushion.toLocaleString()} exceeds max $${Math.round(maxC).toLocaleString()}.`, recoveryAmount:Math.round(cushion-maxC), confidence:84 });
        }
      }
    }

    // Tax Escrow Check
    if (loanAmount > 0) {
      const taxRates = {CA:0.0073,TX:0.018,FL:0.0089,NY:0.0172,AZ:0.0063,NV:0.0053,WA:0.0093,CO:0.005,GA:0.0092,IL:0.0227};
      const st = (loanData?.propertyState||loanData?.state||'CA').toUpperCase();
      const monthlyTax = Math.round(loanAmount*(taxRates[st]||0.011)/12);
      const stmtDocs = (extractedData.documents||[]).filter(d => d.docType === 'MORTGAGE_STATEMENT');
      for (const doc of stmtDocs) {
        const em = (doc.rawText||'').match(/escrow\s*(?:payment|amount|portion)?[:\s]*\$?\s?([\d,]+(?:\.\d{2})?)/i);
        if (em) {
          const escPay = parseFloat(em[1].replace(/,/g,'')); const expEsc = monthlyTax*1.4;
          if (escPay > expEsc*1.5 && escPay > 200) {
            violations.push({ tier:5, type:'ESCROW_TAX_MISCALCULATION', violationType:'Property Tax Escrow Miscalculation', law:'RESPA 12 USC 2609 -- Annual escrow analysis requirements', description:`Monthly escrow $${escPay.toLocaleString()} exceeds est. tax+ins ~$${Math.round(expEsc).toLocaleString()}/mo for ${st}.`, recoveryAmount:Math.round((escPay-expEsc)*12), confidence:76 });
            break;
          }
        }
      }
    }
  }

  // Late Fee / Payment Misapplication
  if (extractedData.hasStatements) {
    for (const doc of (extractedData.documents||[]).filter(d => d.docType === 'MORTGAGE_STATEMENT')) {
      const text = (doc.rawText||'').toLowerCase();
      if (text.includes('late fee') || text.includes('late charge')) {
        const m = (doc.rawText||'').match(/late\s*(?:fee|charge)[:\s]*\$?\s?([\d,]+(?:\.\d{2})?)/i);
        if (m) { const lf = parseFloat(m[1].replace(/,/g,'')); if (lf > 0) {
          violations.push({ tier:5, type:'LATE_FEE_DISPUTE', violationType:'Late Fee -- Potential Misapplication', law:'RESPA 12 USC 2605(k)(1) -- Servicer must credit payment on date received', description:`Late fee $${lf.toLocaleString()} detected. If timely, servicer may have misapplied.`, recoveryAmount:Math.round(lf), confidence:72 });
          break;
        }}
      }
    }
  }

  // FHA MIP Refund
  if (loanType === 'fha') {
    const od = loanData?.originationDate ? new Date(loanData.originationDate) : null;
    if (od && od < new Date('2013-06-03')) {
      const yrs = (Date.now()-od.getTime())/(365.25*24*60*60*1000);
      if (yrs > 5) {
        const mip = Math.round(loanAmount*0.0085/12);
        violations.push({ tier:5, type:'FHA_MIP_CANCELLATION', violationType:'FHA MIP Eligible for Cancellation', law:'HUD Mortgagee Letter 2013-04 -- Pre-June 2013 FHA eligible for MIP cancel', description:`FHA loan ${yrs.toFixed(1)} years old. MIP ~$${mip}/mo may be cancelled.`, recoveryAmount:Math.round(mip*12), confidence:78 });
      }
    }
  }

  console.log(`   [Tier 5] Found ${violations.length} financial violation(s)`);
  return violations;
};

module.exports = { reconcileFinancials };
