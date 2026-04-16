// TIER 6 - LEGAL COMPLIANCE ANALYSIS (AI)
// Signature: analyzeLegalCompliance(extractedData, loanData, state)
// Returns: { violations: [...], documents: {...} }

const analyzeLegalCompliance = async (extractedData, loanData, state) => {
  console.log('   [Tier 6] Legal Compliance Analysis (AI)...');
  const violations = [];
  const loanAmount = extractedData.loanAmount || parseFloat(String(loanData?.loanAmount||0).replace(/[^0-9.]/g,''));
  const rate = extractedData.interestRate || parseFloat(loanData?.interestRate||0);
  const loanType = (loanData?.loanType||'Conventional').toLowerCase();
  const st = (state||loanData?.propertyState||'CA').toUpperCase();

  // TRID Timing Violations
  if (extractedData.hasCD && extractedData.hasLE) {
    const cdDoc = (extractedData.documents||[]).find(d => d.docType === 'CLOSING_DISCLOSURE');
    const leDoc = (extractedData.documents||[]).find(d => d.docType === 'LOAN_ESTIMATE');
    if (cdDoc && leDoc) {
      const leText = (leDoc.rawText||'').toLowerCase();
      if (leText.includes('revised') || leText.includes('corrected')) {
        violations.push({ tier:6, type:'TRID_REVISED_LE', violationType:'Revised Loan Estimate -- Validity Check', law:'TRID 12 CFR 1026.19(e)(4) -- Revised LE only valid for specific changed circumstances', description:'Revised LE detected. If no documented changed circumstance, original LE estimates bind the lender.', recoveryAmount:0, confidence:75 });
      }
      const cdRate = cdDoc.extracted?.interestRate; const leRate = leDoc.extracted?.interestRate;
      if (cdRate && leRate && cdRate > leRate) {
        const aprDiff = cdRate - leRate;
        const maxTol = (loanType==='arm'||loanType==='variable') ? 0.25 : 0.125;
        if (aprDiff > maxTol) {
          violations.push({ tier:6, type:'APR_TOLERANCE', violationType:'APR Tolerance Violation', law:'TILA 15 USC 1606 -- APR exceeds tolerance', description:`APR: ${leRate}% (LE) to ${cdRate}% (CD). Diff ${aprDiff.toFixed(3)}% exceeds ${maxTol}% tolerance. Material TILA violation.`, recoveryAmount:Math.round(loanAmount*aprDiff/100*3), confidence:90 });
        }
      }
    }
  }

  // RESPA Section 8 Kickback Detection
  if (extractedData.allFees) {
    const sus = [];
    for (const [name, amount] of Object.entries(extractedData.allFees)) {
      const ln = name.toLowerCase();
      if ((ln.includes('admin')||ln.includes('processing')||ln.includes('warehouse')||ln.includes('funding')) && amount > 300) sus.push({name,amount});
    }
    if (sus.length >= 2) {
      const tot = sus.reduce((s,f)=>s+f.amount,0);
      violations.push({ tier:6, type:'RESPA_SECTION_8', violationType:'Potential RESPA s8 Unearned Fee Violations', law:'RESPA 12 USC 2607 -- Prohibition against kickbacks and unearned fees', description:`${sus.length} fees totaling $${tot.toLocaleString()} may be unearned: ${sus.map(f=>`${f.name} ($${f.amount})`).join(', ')}.`, recoveryAmount:Math.round(tot*0.5), confidence:70 });
    }
  }

  // HOEPA High-Cost Mortgage
  if (loanAmount > 0 && rate > 0) {
    const apor = 6.5;
    if (rate > apor + 6.5) {
      violations.push({ tier:6, type:'HOEPA_HIGH_COST', violationType:'High-Cost Mortgage (HOEPA) Trigger', law:'HOEPA 15 USC 1639 -- High-cost mortgage protections', description:`Rate ${rate}% exceeds HOEPA threshold (~${(apor+6.5).toFixed(1)}%).`, recoveryAmount:0, confidence:85 });
    }
    const totalFees = Object.values(extractedData.allFees||{}).reduce((s,v)=>s+v,0);
    if (totalFees > loanAmount*0.05) {
      violations.push({ tier:6, type:'HOEPA_FEE_TRIGGER', violationType:'High-Cost Mortgage -- Fee Trigger', law:'HOEPA 15 USC 1639(a)(2) -- Points/fees exceed 5%', description:`Total fees $${totalFees.toLocaleString()} (${(totalFees/loanAmount*100).toFixed(1)}%) exceed HOEPA 5% threshold.`, recoveryAmount:Math.round(totalFees-loanAmount*0.05), confidence:83 });
    }
  }

  // QWR Compliance
  for (const doc of (extractedData.documents||[]).filter(d => d.docType === 'CORRESPONDENCE')) {
    const text = (doc.rawText||'').toLowerCase();
    if ((text.includes('qualified written request')||text.includes('qwr')) && !text.includes('acknowledge') && !text.includes('receipt')) {
      violations.push({ tier:6, type:'QWR_NONCOMPLIANCE', violationType:'QWR Response Failure', law:'RESPA 12 USC 2605(e) -- Must acknowledge QWR within 5 business days', description:'QWR found but no servicer acknowledgment within required 5 business days.', recoveryAmount:Math.round(Math.min(loanAmount*0.005,2000)), confidence:74 });
    }
    if ((text.includes('loss mitigation')||text.includes('forbearance')||text.includes('modification')) && (text.includes('denied')||text.includes('rejection'))) {
      violations.push({ tier:6, type:'LOSS_MITIGATION_REVIEW', violationType:'Loss Mitigation Denial -- Review Recommended', law:'RESPA 12 USC 2605(k) -- Loss mitigation procedural requirements', description:'Loss mitigation denial detected. Servicer must follow Reg X procedures.', recoveryAmount:0, confidence:65 });
    }
  }

  // Generate legal documents
  const totalRecovery = violations.reduce((s,v)=>s+(v.recoveryAmount||0),0);
  const servicer = loanData?.currentServicer || 'Current Servicer';
  const now = new Date().toISOString().split('T')[0];
  const documents = {
    cfpbComplaint: { type:'CFPB Complaint Template', target:servicer, state:st, violations:violations.filter(v=>v.confidence>=75).length, amount:totalRecovery, generatedAt:now },
    demandLetter: { type:'Demand Letter Template', to:servicer, totalDemand:totalRecovery, violationCount:violations.length, deadline:'30 days from receipt', generatedAt:now },
    authorization: { type:'Consumer Authorization', scope:'Authorized to act on behalf of consumer for mortgage audit recovery', generatedAt:now }
  };

  console.log(`   [Tier 6] Found ${violations.length} legal compliance violation(s)`);
  return { violations, documents };
};

module.exports = { analyzeLegalCompliance };
