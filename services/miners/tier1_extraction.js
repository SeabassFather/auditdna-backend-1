// TIER 1 - DOCUMENT EXTRACTION (SI)
// Signature: extractAllDocuments(documents)
//   documents = req.body.documents (array of strings or objects from frontend)

const extractAllDocuments = async (documents) => {
  console.log('   [Tier 1] Document Extraction (SI)...');
  const docs = Array.isArray(documents) ? documents : [];

  const parsed = docs.map((doc, idx) => {
    if (typeof doc === 'string') {
      return { filename: doc, docType: classifyByName(doc), textLength: 0, rawText: '', extracted: { fees: {}, moneyValues: [], percentages: [], dates: [] } };
    }
    const name    = doc.name || doc.filename || doc.docType || `document_${idx}`;
    const content = doc.content || doc.text || doc.rawText || '';
    const docType = doc.docType || classifyByName(name) || classifyByContent(content);
    return {
      filename: name, docType, textLength: content.length, rawText: content,
      extracted: {
        loanAmount:   extractLoanAmount(content),
        interestRate: extractInterestRate(content),
        servicer:     extractServicerName(content),
        fees:         extractFees(content),
        moneyValues:  extractMoneyValues(content),
        percentages:  extractPercentages(content),
        dates:        extractDates(content)
      }
    };
  });

  const extractedData = {
    documents: parsed, docTypes: parsed.map(d => d.docType),
    hasCD: parsed.some(d => d.docType === 'CLOSING_DISCLOSURE'),
    hasLE: parsed.some(d => d.docType === 'LOAN_ESTIMATE'),
    hasHUD1: parsed.some(d => d.docType === 'HUD1'),
    hasGFE: parsed.some(d => d.docType === 'GFE'),
    hasNote: parsed.some(d => d.docType === 'PROMISSORY_NOTE'),
    hasStatements: parsed.some(d => d.docType === 'MORTGAGE_STATEMENT'),
    hasEscrow: parsed.some(d => d.docType === 'ESCROW_ANALYSIS'),
    hasPMI: parsed.some(d => d.docType === 'PMI_DOCUMENTATION'),
    hasTitle: parsed.some(d => d.docType === 'TITLE_INSURANCE'),
    hasTransfer: parsed.some(d => d.docType === 'TRANSFER_NOTICE'),
    hasAppraisal: parsed.some(d => d.docType === 'APPRAISAL'),
    totalDocs: parsed.length,
    totalTextChars: parsed.reduce((sum, d) => sum + d.textLength, 0),
    allFees: {}, loanAmount: null, interestRate: null, servicer: null,
    allDates: [], allMoney: [], feeComparison: null, cdFees: null, leFees: null
  };

  const priority = ['CLOSING_DISCLOSURE', 'LOAN_ESTIMATE', 'HUD1', 'GFE', 'PROMISSORY_NOTE'];
  const sorted = [...parsed].sort((a, b) => {
    const ai = priority.indexOf(a.docType); const bi = priority.indexOf(b.docType);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  for (const doc of sorted) {
    if (!extractedData.loanAmount && doc.extracted.loanAmount) extractedData.loanAmount = doc.extracted.loanAmount;
    if (!extractedData.interestRate && doc.extracted.interestRate) extractedData.interestRate = doc.extracted.interestRate;
    if (!extractedData.servicer && doc.extracted.servicer) extractedData.servicer = doc.extracted.servicer;
    Object.assign(extractedData.allFees, doc.extracted.fees);
    extractedData.allDates.push(...doc.extracted.dates);
    extractedData.allMoney.push(...doc.extracted.moneyValues);
  }

  const cdDoc = parsed.find(d => d.docType === 'CLOSING_DISCLOSURE');
  const leDoc = parsed.find(d => d.docType === 'LOAN_ESTIMATE');
  if (cdDoc && leDoc && cdDoc.textLength > 0 && leDoc.textLength > 0) {
    extractedData.cdFees = cdDoc.extracted.fees; extractedData.leFees = leDoc.extracted.fees;
    extractedData.feeComparison = {};
    const allFeeNames = new Set([...Object.keys(cdDoc.extracted.fees), ...Object.keys(leDoc.extracted.fees)]);
    for (const name of allFeeNames) {
      const cdVal = cdDoc.extracted.fees[name] || 0; const leVal = leDoc.extracted.fees[name] || 0;
      extractedData.feeComparison[name] = { cd: cdVal, le: leVal, diff: cdVal - leVal };
    }
  }
  const hudDoc = parsed.find(d => d.docType === 'HUD1');
  const gfeDoc = parsed.find(d => d.docType === 'GFE');
  if (hudDoc && gfeDoc && hudDoc.textLength > 0 && gfeDoc.textLength > 0) {
    extractedData.feeComparison = {};
    const allFeeNames = new Set([...Object.keys(hudDoc.extracted.fees), ...Object.keys(gfeDoc.extracted.fees)]);
    for (const name of allFeeNames) {
      const hVal = hudDoc.extracted.fees[name] || 0; const gVal = gfeDoc.extracted.fees[name] || 0;
      extractedData.feeComparison[name] = { cd: hVal, le: gVal, diff: hVal - gVal };
    }
  }

  console.log(`   [Tier 1] Extracted ${parsed.length} docs | ${extractedData.totalTextChars} chars | ${Object.keys(extractedData.allFees).length} fees | CD:${extractedData.hasCD} LE:${extractedData.hasLE} Note:${extractedData.hasNote}`);
  return extractedData;
};

function classifyByName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('closing') || n === 'closingdisclosure' || n.includes(' cd')) return 'CLOSING_DISCLOSURE';
  if (n.includes('loanestimate') || n.includes('loan_estimate') || n.includes(' le')) return 'LOAN_ESTIMATE';
  if (n.includes('hud') || n.includes('hud1') || n.includes('hud-1')) return 'HUD1';
  if (n.includes('gfe') || n.includes('goodfaith') || n.includes('good_faith')) return 'GFE';
  if (n.includes('note') || n.includes('promissory')) return 'PROMISSORY_NOTE';
  if (n.includes('statement') || n.includes('mortgagestatement')) return 'MORTGAGE_STATEMENT';
  if (n.includes('escrow')) return 'ESCROW_ANALYSIS';
  if (n.includes('pmi') || n.includes('mip') || n.includes('mortgageinsurance')) return 'PMI_DOCUMENTATION';
  if (n.includes('title')) return 'TITLE_INSURANCE';
  if (n.includes('transfer') || n.includes('servicer')) return 'TRANSFER_NOTICE';
  if (n.includes('appraisal')) return 'APPRAISAL';
  if (n.includes('correspondence') || n.includes('letter')) return 'CORRESPONDENCE';
  return 'UNKNOWN';
}

const DOC_SIGNATURES = [
  { type: 'CLOSING_DISCLOSURE', patterns: ['closing disclosure', 'form h-25', 'closing cost details', 'calculating cash to close'] },
  { type: 'LOAN_ESTIMATE', patterns: ['loan estimate', 'form h-24', 'estimated closing costs', 'projected payments'] },
  { type: 'HUD1', patterns: ['hud-1', 'hud 1', 'settlement statement', 'settlement charges'] },
  { type: 'GFE', patterns: ['good faith estimate', 'summary of your settlement charges'] },
  { type: 'PROMISSORY_NOTE', patterns: ['promissory note', 'promise to pay', 'borrower promises'] },
  { type: 'MORTGAGE_STATEMENT', patterns: ['monthly mortgage statement', 'payment due', 'account activity'] },
  { type: 'ESCROW_ANALYSIS', patterns: ['escrow account', 'escrow analysis', 'escrow disclosure', 'annual escrow'] },
  { type: 'PMI_DOCUMENTATION', patterns: ['private mortgage insurance', 'pmi', 'mortgage insurance premium'] },
  { type: 'TITLE_INSURANCE', patterns: ['title insurance', 'title commitment', 'title policy'] },
  { type: 'TRANSFER_NOTICE', patterns: ['transfer of servicing', 'servicing transfer', 'goodbye letter', 'hello letter'] },
  { type: 'APPRAISAL', patterns: ['appraisal report', 'appraised value', 'uniform residential'] },
  { type: 'CORRESPONDENCE', patterns: ['dear borrower', 'dear homeowner', 'qualified written request'] }
];

function classifyByContent(text) {
  const lower = (text || '').toLowerCase();
  let best = { type: 'UNKNOWN', score: 0 };
  for (const sig of DOC_SIGNATURES) {
    let score = 0;
    for (const pat of sig.patterns) { if (lower.includes(pat)) score += 10; }
    if (score > best.score) best = { type: sig.type, score };
  }
  return best.type;
}

function extractMoneyValues(text) {
  if (!text) return []; const vals = []; const re = /\$\s?([\d,]+(?:\.\d{1,2})?)/g;
  let m; while ((m = re.exec(text)) !== null) vals.push(parseFloat(m[1].replace(/,/g, ''))); return vals;
}
function extractPercentages(text) {
  if (!text) return []; const vals = []; const re = /([\d]+\.[\d]{1,4})\s*%/g;
  let m; while ((m = re.exec(text)) !== null) vals.push(parseFloat(m[1])); return vals;
}
function extractDates(text) {
  if (!text) return []; const vals = []; const re = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  let m; while ((m = re.exec(text)) !== null) vals.push(m[1]); return vals;
}
function extractLoanAmount(text) {
  if (!text) return null;
  for (const pat of [/loan\s*amount[:\s]*\$\s?([\d,]+)/i, /principal\s*balance[:\s]*\$\s?([\d,]+)/i, /original\s*(?:loan|balance)[:\s]*\$\s?([\d,]+)/i, /amount\s*financed[:\s]*\$\s?([\d,]+)/i]) {
    const m = text.match(pat); if (m) return parseFloat(m[1].replace(/,/g, ''));
  } return null;
}
function extractInterestRate(text) {
  if (!text) return null;
  for (const pat of [/(?:interest|note)\s*rate[:\s]*([\d]+\.[\d]{1,4})\s*%/i, /(?:initial|fixed)\s*rate[:\s]*([\d]+\.[\d]{1,4})\s*%/i]) {
    const m = text.match(pat); if (m) return parseFloat(m[1]);
  } return null;
}
function extractServicerName(text) {
  if (!text) return null;
  for (const pat of [/(?:current\s*)?servicer[:\s]*([A-Z][A-Za-z\s&]+(?:LLC|Inc|Corp|Bank|Mortgage|Financial|Services)?)/i]) {
    const m = text.match(pat); if (m) return m[1].trim().substring(0, 60);
  } return null;
}
function extractFees(text) {
  if (!text) return {};
  const feePatterns = [
    { name: 'Origination Fee', pattern: /origination\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Appraisal Fee', pattern: /appraisal\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Credit Report Fee', pattern: /credit\s*report\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Title Insurance', pattern: /title\s*(?:insurance|premium)\s*(?:fee)?[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Recording Fee', pattern: /recording\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Tax Service Fee', pattern: /tax\s*service\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Settlement Fee', pattern: /settlement\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Processing Fee', pattern: /processing\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Underwriting Fee', pattern: /underwriting\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'PMI Premium', pattern: /(?:pmi|mortgage\s*insurance)\s*(?:premium|fee)?[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Wire Transfer Fee', pattern: /wire\s*(?:transfer)?\s*(?:fee|charge)[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Document Prep Fee', pattern: /document?\s*(?:prep|preparation)\s*(?:fee)?[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Flood Cert Fee', pattern: /flood\s*(?:cert|determination)\s*(?:fee)?[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i },
    { name: 'Transfer Tax', pattern: /transfer\s*tax[:\s]*\$\s?([\d,]+(?:\.\d{2})?)/i }
  ];
  const fees = {};
  for (const { name, pattern } of feePatterns) { const m = text.match(pattern); if (m) fees[name] = parseFloat(m[1].replace(/,/g, '')); }
  return fees;
}

module.exports = { extractAllDocuments };

