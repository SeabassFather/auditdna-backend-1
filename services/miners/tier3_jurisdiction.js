// TIER 3 - MULTI-JURISDICTION REVIEW (SI)
// Signature: analyzeJurisdiction(extractedData, state, zip)

const STATE_RULES = {
  CA:{name:'California',maxOrigPct:2.0,lateFee:6,titleReg:true,prepayBan:true,laws:[{code:'CA Civ. Code 2954.8',rule:'Escrow interest on impound accounts',check:'escrow_interest'}]},
  TX:{name:'Texas',maxOrigPct:3.0,lateFee:5,titleReg:true,maxFeesPct:3.0,laws:[{code:'TX Const. Art. XVI s50',rule:'Total fees 3% cap for home equity',check:'total_fee_cap'}]},
  FL:{name:'Florida',maxOrigPct:2.5,lateFee:5,titleReg:true,laws:[]},NY:{name:'New York',maxOrigPct:2.0,lateFee:5,laws:[]},
  AZ:{name:'Arizona',maxOrigPct:2.5,lateFee:5,titleReg:true,laws:[]},NV:{name:'Nevada',maxOrigPct:2.5,lateFee:5,laws:[]},
  WA:{name:'Washington',maxOrigPct:2.0,lateFee:5,laws:[]},OR:{name:'Oregon',maxOrigPct:2.0,lateFee:5,laws:[]},
  CO:{name:'Colorado',maxOrigPct:2.0,lateFee:5,laws:[]},GA:{name:'Georgia',maxOrigPct:3.0,lateFee:5,laws:[]},
  NC:{name:'North Carolina',maxOrigPct:2.0,lateFee:4,laws:[]},VA:{name:'Virginia',maxOrigPct:2.0,lateFee:5,laws:[]},
  OH:{name:'Ohio',maxOrigPct:2.5,lateFee:5,laws:[]},PA:{name:'Pennsylvania',maxOrigPct:2.0,lateFee:5,laws:[]},
  MA:{name:'Massachusetts',maxOrigPct:2.0,lateFee:3,laws:[]},MI:{name:'Michigan',maxOrigPct:2.5,lateFee:5,laws:[]},
  IL:{name:'Illinois',maxOrigPct:2.0,lateFee:5,laws:[]},MN:{name:'Minnesota',maxOrigPct:2.0,lateFee:5,laws:[]},
  MO:{name:'Missouri',maxOrigPct:2.5,lateFee:5,laws:[]},UT:{name:'Utah',maxOrigPct:2.0,lateFee:5,laws:[]}
};
const DEFAULT_RULES = {name:'Default',maxOrigPct:3.0,lateFee:5,laws:[]};

const analyzeJurisdiction = async (extractedData, state, zip) => {
  console.log('   [Tier 3] Multi-Jurisdiction Review (SI)...');
  const violations = []; const st = (state||'CA').toUpperCase();
  const rules = STATE_RULES[st] || DEFAULT_RULES;
  const loanAmount = extractedData.loanAmount || 0; const allFees = extractedData.allFees || {};

  // State Origination Fee Cap
  const origFee = allFees['Origination Fee'] || allFees['Processing Fee'] || 0;
  if (origFee > 0 && loanAmount > 0 && rules.maxOrigPct) {
    const maxAllowed = Math.round(loanAmount*rules.maxOrigPct/100);
    if (origFee > maxAllowed) {
      violations.push({ tier:3, type:'STATE_FEE_CAP', violationType:`Origination Fee Exceeds ${st} State Cap`, law:`${st} state law -- Origination exceeds ${rules.maxOrigPct}% cap`, description:`Origination fee $${origFee.toLocaleString()} exceeds ${rules.name} max of ${rules.maxOrigPct}% ($${maxAllowed.toLocaleString()}).`, recoveryAmount:Math.round(origFee-maxAllowed), confidence:88 });
    }
  }

  // Total Fee Cap (TX)
  if (rules.maxFeesPct && loanAmount > 0) {
    const totalFees = Object.values(allFees).reduce((s,v)=>s+v,0);
    const maxTotal = Math.round(loanAmount*rules.maxFeesPct/100);
    if (totalFees > maxTotal) {
      violations.push({ tier:3, type:'STATE_TOTAL_FEE_CAP', violationType:`Total Fees Exceed ${st} ${rules.maxFeesPct}% Cap`, law:`${st} -- Total fees exceed ${rules.maxFeesPct}% statutory max`, description:`Total fees $${totalFees.toLocaleString()} exceed ${rules.name} cap ($${maxTotal.toLocaleString()}).`, recoveryAmount:Math.round(totalFees-maxTotal), confidence:90 });
    }
  }

  // Title Insurance Regulated Rate
  if (rules.titleReg && (allFees['Title Insurance']||0) > 0 && loanAmount > 0) {
    const titleFee = allFees['Title Insurance']; const maxRate = loanAmount*0.006;
    if (titleFee > maxRate) {
      violations.push({ tier:3, type:'STATE_TITLE_RATE', violationType:`Title Insurance Exceeds ${st} Filed Rate`, law:`${st} DOI -- Title premium exceeds filed rate`, description:`Title $${titleFee.toLocaleString()} may exceed ${rules.name} DOI filed rate for $${loanAmount.toLocaleString()} loan.`, recoveryAmount:Math.round(titleFee-maxRate), confidence:75 });
    }
  }

  // Prepayment Penalty Ban
  if (rules.prepayBan && extractedData.hasNote) {
    const noteDoc = (extractedData.documents||[]).find(d => d.docType === 'PROMISSORY_NOTE');
    if (noteDoc) {
      const text = (noteDoc.rawText||'').toLowerCase();
      if (text.includes('prepayment penalty') || text.includes('prepayment premium') || text.includes('prepayment charge')) {
        violations.push({ tier:3, type:'STATE_PREPAYMENT_BAN', violationType:`Prohibited Prepayment Penalty (${st})`, law:`${st} -- Prepayment penalties prohibited`, description:`Note contains prepayment penalty language. ${rules.name} prohibits this.`, recoveryAmount:Math.round(loanAmount*0.02), confidence:85 });
      }
    }
  }

  // State-Specific Escrow Interest (CA)
  for (const law of (rules.laws||[])) {
    if (law.check === 'escrow_interest' && extractedData.hasEscrow) {
      const escDoc = (extractedData.documents||[]).find(d => d.docType === 'ESCROW_ANALYSIS');
      if (escDoc && !(escDoc.rawText||'').toLowerCase().includes('interest')) {
        violations.push({ tier:3, type:'STATE_ESCROW_INTEREST', violationType:`${st} Escrow Interest Not Paid`, law:law.code+' -- '+law.rule, description:`${rules.name} requires interest on escrow. None found.`, recoveryAmount:Math.round(loanAmount*0.001), confidence:72 });
      }
    }
  }

  console.log(`   [Tier 3] Found ${violations.length} jurisdiction violation(s) [${rules.name}]`);
  return violations;
};

module.exports = { analyzeJurisdiction };
