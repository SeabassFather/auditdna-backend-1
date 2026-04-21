// ============================================
// SENASICA EMAIL FINDER
// Searches for company emails via web
// Run: node scrape_senasica_emails.js
// ============================================

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load SENASICA contacts
const dataPath = process.argv[2] || 'unified_contacts.json';
let contacts = [];

try {
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  contacts = raw.contacts || raw;
  console.log(`âœ… Loaded ${contacts.length} SENASICA contacts\n`);
} catch (err) {
  console.error('âŒ Could not load unified_contacts.json');
  console.error('   Usage: node scrape_senasica_emails.js <path_to_unified_contacts.json>');
  process.exit(1);
}

// Common Mexican business email patterns
const EMAIL_PATTERNS = [
  'info@{domain}',
  'contacto@{domain}',
  'ventas@{domain}',
  'administracion@{domain}',
  'gerencia@{domain}',
  'compras@{domain}',
  'recepcion@{domain}'
];

// Clean company name for domain search
function cleanCompanyName(name) {
  return name
    .toLowerCase()
    .replace(/\s*(sa|s\.a\.|de|cv|c\.v\.|s\.?p\.?r\.?|r\.?l\.?|s\.?c\.?|ltd|inc|corp)\s*/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ');
}

// Generate possible domains from company name
function generateDomains(companyName) {
  const clean = cleanCompanyName(companyName);
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  
  const domains = [];
  
  // Full name variations
  if (words.length > 0) {
    domains.push(words.join('') + '.com.mx');
    domains.push(words.join('') + '.mx');
    domains.push(words.join('') + '.com');
    domains.push(words.join('-') + '.com.mx');
    
    // First word only
    domains.push(words[0] + '.com.mx');
    domains.push(words[0] + '.mx');
    
    // Initials
    if (words.length >= 2) {
      const initials = words.map(w => w[0]).join('');
      domains.push(initials + '.com.mx');
    }
  }
  
  return [...new Set(domains)];
}

// Generate email candidates
function generateEmails(companyName) {
  const domains = generateDomains(companyName);
  const emails = [];
  
  for (const domain of domains.slice(0, 3)) { // Top 3 domains
    for (const pattern of EMAIL_PATTERNS.slice(0, 4)) { // Top 4 patterns
      emails.push(pattern.replace('{domain}', domain));
    }
  }
  
  return emails;
}

// Process contacts and generate email candidates
console.log('â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
console.log('â•‘  GENERATING EMAIL CANDIDATES FOR SENASICA CONTACTS           â•‘');
console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

const results = [];
const byState = {};
const byCampaign = {};

for (const contact of contacts) {
  const companyName = contact.company_name || '';
  const state = contact.state || 'Unknown';
  const campaign = contact.campaign_id || 'unknown';
  
  // Skip if no company name
  if (!companyName || companyName.length < 3) continue;
  
  // Generate email candidates
  const emailCandidates = generateEmails(companyName);
  
  results.push({
    senasica_id: contact.senasica_id || contact.id,
    company_name: companyName,
    state: state,
    city: contact.municipality || contact.city || '',
    campaign_id: campaign,
    activities: (contact.activities || []).join('; '),
    email_candidates: emailCandidates.slice(0, 5).join('; '),
    primary_email: emailCandidates[0] || '',
    domains_checked: generateDomains(companyName).slice(0, 3).join('; ')
  });
  
  // Stats
  byState[state] = (byState[state] || 0) + 1;
  byCampaign[campaign] = (byCampaign[campaign] || 0) + 1;
}

console.log(`ðŸ“Š Processed ${results.length} companies\n`);

// Save to CSV
const csvPath = 'senasica_email_candidates.csv';
const headers = Object.keys(results[0]).join(',');
const rows = results.map(r => 
  Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
);
fs.writeFileSync(csvPath, headers + '\n' + rows.join('\n'));
console.log(`âœ… Saved: ${csvPath}\n`);

// Save JSON for import
const jsonPath = 'senasica_with_emails.json';
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
console.log(`âœ… Saved: ${jsonPath}\n`);

// Stats
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('ðŸ“Š BY STATE (Top 10)');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
Object.entries(byState)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([state, count]) => console.log(`   ${state}: ${count}`));

console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('ðŸ“Š BY CAMPAIGN');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
Object.entries(byCampaign)
  .sort((a, b) => b[1] - a[1])
  .forEach(([campaign, count]) => console.log(`   ${campaign}: ${count}`));

console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('ðŸ“§ SAMPLE EMAIL CANDIDATES');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
results.slice(0, 5).forEach(r => {
  console.log(`\n   ${r.company_name}`);
  console.log(`   â†’ ${r.primary_email}`);
  console.log(`   â†’ Alternatives: ${r.email_candidates.split('; ').slice(1, 3).join(', ')}`);
});

console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('âœ… NEXT STEPS:');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('1. Open senasica_email_candidates.csv in Excel');
console.log('2. Review/verify email candidates');
console.log('3. Use email verification service (hunter.io, neverbounce)');
console.log('4. Import verified emails to CRM');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

