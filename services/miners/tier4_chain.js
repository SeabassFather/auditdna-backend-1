// TIER 4 - CHAIN OF COMMAND TRACKING (AI)
// Signature: analyzeChainOfCommand(extractedData, loanData)

const analyzeChainOfCommand = async (extractedData, loanData) => {
  console.log('   [Tier 4] Chain of Command Tracking (AI)...');
  const violations = [];
  const loanAmount = extractedData.loanAmount || parseFloat(String(loanData?.loanAmount||0).replace(/[^0-9.]/g,''));
  const origLender = (loanData?.originalLender||'').trim();
  const curServicer = (extractedData.servicer || loanData?.currentServicer||'').trim();
  const transferred = loanData?.hasBeenTransferred;

  // Transfer Notice Compliance (RESPA s6)
  if (transferred || (origLender && curServicer && origLender.toLowerCase() !== curServicer.toLowerCase())) {
    if (!extractedData.hasTransfer) {
      violations.push({ tier:4, type:'MISSING_TRANSFER_NOTICE', violationType:'RESPA s6 Transfer Notice Missing', law:'RESPA 12 USC 2605(b)(c) -- Servicer transfer notices required within 15 days', description:`Loan transferred from ${origLender||'original lender'} to ${curServicer||'current servicer'} but no transfer notices provided.`, recoveryAmount:Math.round(Math.min(loanAmount*0.005,2000)), confidence:80 });
    }
    if (extractedData.hasTransfer) {
      const tDoc = (extractedData.documents||[]).find(d => d.docType === 'TRANSFER_NOTICE');
      if (tDoc) {
        const text = (tDoc.rawText||'').toLowerCase();
        const hasDate = text.includes('effective date') || text.includes('transfer date');
        const hasPay = text.includes('payment') && (text.includes('address') || text.includes('send'));
        const has60 = text.includes('60 day') || text.includes('60-day') || text.includes('sixty day');
        if (!hasDate || !hasPay) {
          violations.push({ tier:4, type:'DEFICIENT_TRANSFER_NOTICE', violationType:'Deficient Servicer Transfer Notice', law:'RESPA 12 USC 2605(b)(2) -- Transfer notice must include effective date and payment instructions', description:`Transfer notice missing: ${!hasDate?'effective date':''}${!hasDate&&!hasPay?', ':''}${!hasPay?'payment instructions':''}.`, recoveryAmount:Math.round(Math.min(loanAmount*0.003,1500)), confidence:76 });
        }
        if (!has60) {
          violations.push({ tier:4, type:'MISSING_60DAY_PROTECTION', violationType:'60-Day Payment Protection Notice Missing', law:'RESPA 12 USC 2605(d) -- Consumer must be informed of 60-day protection', description:'Transfer notice missing 60-day payment protection disclosure.', recoveryAmount:0, confidence:74 });
        }
      }
    }
  }

  // Promissory Note Chain Verification
  if (extractedData.hasNote && origLender) {
    const noteDoc = (extractedData.documents||[]).find(d => d.docType === 'PROMISSORY_NOTE');
    if (noteDoc) {
      const text = (noteDoc.rawText||'').toLowerCase();
      const found = origLender.toLowerCase().split(' ').some(w => w.length > 3 && text.includes(w));
      if (!found && origLender.length > 3) {
        violations.push({ tier:4, type:'CHAIN_MISMATCH', violationType:'Lender Mismatch -- Note vs Reported', law:'UCC Article 3 -- Holder in due course chain must be verifiable', description:`Original lender "${origLender}" not found in promissory note. Chain may be broken.`, recoveryAmount:0, confidence:68 });
      }
    }
  }

  // Multiple Servicer Changes
  if (extractedData.hasStatements) {
    const stmtDocs = (extractedData.documents||[]).filter(d => d.docType === 'MORTGAGE_STATEMENT');
    const servicers = new Set();
    for (const doc of stmtDocs) { const svc = doc.extracted?.servicer; if (svc) servicers.add(svc.toLowerCase()); }
    if (servicers.size > 1) {
      violations.push({ tier:4, type:'MULTIPLE_TRANSFERS', violationType:'Multiple Servicer Changes Detected', law:'RESPA 12 USC 2605 -- Each transfer requires compliant notice', description:`${servicers.size} servicers detected: ${[...servicers].join(', ')}.`, recoveryAmount:Math.round(Math.min(servicers.size*1000,3000)), confidence:77 });
    }
  }

  console.log(`   [Tier 4] Found ${violations.length} chain-of-command violation(s)`);
  return violations;
};

module.exports = { analyzeChainOfCommand };
