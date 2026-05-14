// we-link-contract.js — WE LINK Partnership Agreement Generator
// Mexausa Food Group Inc — AuditDNA Agriculture Platform
// Innovations: Harvest Performance Bond, Dynamic Split Adjustment,
//   Climate Force Majeure AI, Buyer Pre-Assignment, LOAF Exclusivity Hash,
//   Yield Bonus Trigger, Corporate CPI Escalator
// Save to: C:\AuditDNA\backend\routes\we-link-contract.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

// ── GENERATE CONTRACT HTML ────────────────────────────────────────────────────
function buildContractHTML(deal, land, grower, opts = {}) {
  const now       = new Date();
  const dateStr   = now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const contractId= 'MFG-WL-' + deal.id + '-' + now.getFullYear();
  const loafHash  = crypto.createHash('sha256').update(contractId + deal.land_profile_id + deal.grower_profile_id).digest('hex').slice(0,16).toUpperCase();
  const split     = deal.split_percent || 50;
  const landSplit = 100 - split;
  const term      = opts.term || '1 year';
  const maxDist   = opts.max_distance_miles || 50;
  const perfBond  = opts.performance_bond_pct || 10;
  const yieldBonus= opts.yield_bonus_pct || 5;
  const commRate  = deal.commission_rate || 3;
  const isCorp    = opts.partnership_type === 'corporate_lease';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>WE LINK Partnership Agreement — ${contractId}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Times New Roman',Times,serif;font-size:11pt;color:#0F1419;background:#fff;padding:40px 60px;max-width:850px;margin:0 auto;line-height:1.6}
.header{text-align:center;border-bottom:3px solid #0F1419;padding-bottom:20px;margin-bottom:28px}
.logo-line{font-family:Arial,sans-serif;font-size:22pt;font-weight:900;color:#0F1419;letter-spacing:-1px}
.logo-line span{color:#0F7B41}
.sub-line{font-size:10pt;color:#475569;margin-top:4px;letter-spacing:1px;text-transform:uppercase}
.contract-title{font-size:16pt;font-weight:bold;margin:16px 0 4px;text-transform:uppercase;letter-spacing:1px}
.contract-id{font-size:9pt;color:#475569;font-family:Arial,sans-serif}
.loaf-hash{font-family:'Courier New',monospace;font-size:8pt;color:#0F7B41;margin-top:4px}
h2{font-size:12pt;font-weight:bold;text-transform:uppercase;border-bottom:1px solid #0F1419;padding-bottom:4px;margin:24px 0 10px;letter-spacing:0.5px}
h3{font-size:11pt;font-weight:bold;margin:14px 0 6px}
p{margin-bottom:8px;text-align:justify}
.section{margin-bottom:20px}
.parties-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:12px 0}
.party-box{border:1px solid #0F1419;padding:14px;border-radius:4px}
.party-label{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#475569;margin-bottom:6px}
.party-id{font-size:13pt;font-weight:bold;color:#0F7B41;font-family:Arial,sans-serif}
.party-detail{font-size:9pt;color:#475569;margin-top:4px}
.terms-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10pt}
.terms-table th{background:#0F1419;color:#fff;padding:7px 10px;text-align:left;font-size:9pt}
.terms-table td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
.terms-table tr:nth-child(even) td{background:#f8fafc}
.innovation-box{border-left:4px solid #C9A55C;background:#fefce8;padding:14px 16px;margin:12px 0;border-radius:0 6px 6px 0}
.innovation-title{font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:4px}
.innovation-text{font-size:10pt;color:#0F1419}
.exclusivity-box{border:2px solid #0F7B41;padding:16px;margin:12px 0;border-radius:4px;background:#f0fdf4}
.exclusivity-title{font-size:10pt;font-weight:bold;color:#0F7B41;text-transform:uppercase;margin-bottom:6px}
.sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:16px}
.sig-box{border-top:1px solid #0F1419;padding-top:8px}
.sig-label{font-size:8pt;color:#475569;text-transform:uppercase;letter-spacing:0.5px}
.sig-field{height:40px;border-bottom:1px solid #0F1419;margin:8px 0 4px}
.sig-name{font-size:9pt}
.footer-bar{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:8pt;color:#64748b;display:flex;justify-content:space-between}
.page-break{page-break-before:always}
.highlight{background:#fff3cd;padding:2px 4px;border-radius:2px}
@media print{body{padding:20px 40px}.innovation-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}.exclusivity-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>

<div class="header">
  <div class="logo-line">MEXAUSA<span>FG</span> &nbsp;|&nbsp; WE LINK</div>
  <div class="sub-line">Agricultural Partnership Agreement</div>
  <div class="contract-title">Land + Grower Partnership Agreement</div>
  <div class="contract-id">Contract ID: ${contractId} &nbsp;&bull;&nbsp; Date: ${dateStr}</div>
  <div class="loaf-hash">LOAF Exclusivity Hash: ${loafHash} (immutable — recorded on AuditDNA blockchain ledger)</div>
</div>

<div class="section">
<h2>Article 1 — Parties</h2>
<div class="parties-grid">
  <div class="party-box">
    <div class="party-label">Land Owner</div>
    <div class="party-id">${land.blind_id}</div>
    <div class="party-detail">Region: ${land.region || '—'}<br/>Hectares: ${land.hectares || '—'} ha<br/>Water: ${land.water_source || '—'}<br/>State: ${land.state || '—'}</div>
    <div class="party-detail" style="margin-top:8px;font-style:italic;font-size:8pt;">Identity disclosed upon execution at Disclosure Stage per LOI→NDA→Term Sheet→Disclosure sequence.</div>
  </div>
  <div class="party-box">
    <div class="party-label">Grower / Operator</div>
    <div class="party-id">${grower.blind_id}</div>
    <div class="party-detail">Region: ${grower.region || '—'}<br/>Capacity: ${grower.hectares || '—'} ha<br/>Commodities: ${(grower.commodities||[]).join(', ') || '—'}<br/>State: ${grower.state || '—'}</div>
    <div class="party-detail" style="margin-top:8px;font-style:italic;font-size:8pt;">Identity disclosed upon execution at Disclosure Stage.</div>
  </div>
</div>
<p>Mexausa Food Group, Inc. (EIN: 88-1698129), hereinafter "MFG" or "Platform Manager," acts as exclusive broker, platform operator, and transaction facilitator for this Partnership.</p>
</div>

<div class="section">
<h2>Article 2 — Partnership Terms</h2>
<table class="terms-table">
  <tr><th>Term</th><th>Value</th></tr>
  <tr><td>Partnership Type</td><td>${isCorp ? 'Corporate Land Lease' : 'Land + Grower Co-Operation'}</td></tr>
  <tr><td>Land Area</td><td>${land.hectares || '—'} hectares</td></tr>
  <tr><td>Duration</td><td>${term} (auto-renewable with 60-day written notice)</td></tr>
  <tr><td>Revenue Split</td><td>Grower: ${split}% &nbsp;|&nbsp; Land Owner: ${landSplit}%</td></tr>
  <tr><td>MFG Platform Commission</td><td>${commRate}% of gross harvest revenue per transaction</td></tr>
  <tr><td>Maximum Distance</td><td>${maxDist} miles between grower base and land</td></tr>
  <tr><td>Harvest Commitment</td><td>100% of production routed through AuditDNA / LOAF platform</td></tr>
  <tr><td>Governing Law</td><td>State of California (USA operations) / Baja California (MX operations)</td></tr>
</table>
</div>

<div class="section">
<h2>Article 3 — Cost &amp; Responsibility Matrix</h2>
<table class="terms-table">
  <tr><th>Item</th><th>Land Owner</th><th>Grower</th></tr>
  <tr><td>Property taxes &amp; land fees</td><td>100%</td><td>—</td></tr>
  <tr><td>Water rights / district fees</td><td>100%</td><td>—</td></tr>
  <tr><td>Permanent infrastructure (wells, roads, drainage)</td><td>100%</td><td>—</td></tr>
  <tr><td>Seeds &amp; planting materials</td><td>—</td><td>100%</td></tr>
  <tr><td>Fertilizer &amp; agrochemicals</td><td>—</td><td>100%</td></tr>
  <tr><td>Labor (planting, cultivation, harvest)</td><td>—</td><td>100%</td></tr>
  <tr><td>Equipment &amp; machinery</td><td>—</td><td>100%</td></tr>
  <tr><td>Harvest &amp; post-harvest handling</td><td>—</td><td>100%</td></tr>
  <tr><td>FSMA compliance &amp; food safety</td><td>Shared 50/50</td><td>Shared 50/50</td></tr>
  <tr><td>MFG Platform Commission (${commRate}%)</td><td>Shared pro-rata</td><td>Shared pro-rata</td></tr>
  <tr><td>Crop insurance (recommended)</td><td>Optional</td><td>Recommended</td></tr>
</table>
</div>

<div class="section">
<h2>Article 4 — LOAF Platform Exclusivity</h2>
<div class="exclusivity-box">
  <div class="exclusivity-title">Binding Exclusivity Clause — LOAF Hash: ${loafHash}</div>
  <p><strong>All produce originating from the Partnership Land defined in this Agreement shall be exclusively marketed, offered, factored, financed, and distributed through Mexausa Food Group Inc. and the AuditDNA / LOAF Agriculture Platform for the full duration of this Agreement and any renewal thereof.</strong></p>
  <p>Any direct sale, barter, consignment, or transfer of produce bypassing the Platform — whether to existing buyers, new contacts, or related parties — constitutes a material breach of this Agreement and triggers the Breach Penalty defined in Article 9.</p>
  <p>The LOAF Exclusivity Hash (${loafHash}) is recorded immutably on the AuditDNA ledger and embedded in all Platform transactions originating from this land parcel. This hash serves as cryptographic proof of exclusivity in any dispute proceeding.</p>
</div>
</div>

<div class="section">
<h2>Article 5 — Innovative Protections (MFG Patent Pending)</h2>

<div class="innovation-box">
  <div class="innovation-title">5.1 Harvest Performance Bond</div>
  <div class="innovation-text">Grower agrees to a Performance Bond equal to <strong>${perfBond}% of the estimated first-season harvest value</strong>, funded automatically from the first LOAF factoring advance. If actual delivered yield falls more than 15% below the committed forecast without a qualifying Force Majeure event (Article 7), the bond is forfeited pro-rata to the Land Owner. Bond is returned in full upon delivery of forecasted yield. No other agricultural platform in North America offers this protection to land owners.</div>
</div>

<div class="innovation-box">
  <div class="innovation-title">5.2 Dynamic Split Adjustment — Market Protection Clause</div>
  <div class="innovation-text">If the USDA AMS terminal market price for the primary commodity drops more than <strong>20% below the 90-day rolling average</strong> (as tracked by the AuditDNA LOAF pricing engine in real time), the revenue split for that affected harvest shall automatically adjust by +5% in the Grower's favor for that specific lot. This protects the Grower from catastrophic price collapse on land they do not own. Adjustments are calculated automatically by the Platform and reflected in the LOAF transaction ledger. Land Owner acknowledges this clause as fair market protection.</div>
</div>

<div class="innovation-box">
  <div class="innovation-title">5.3 Yield Bonus Trigger — Land Owner Upside</div>
  <div class="innovation-text">If the Grower delivers a yield exceeding the committed forecast by more than <strong>10%</strong> in any given season, the Land Owner receives a bonus of <strong>${yieldBonus}% of the excess revenue</strong> above forecast. This bonus is calculated automatically by the LOAF platform from verified transaction data and disbursed within 15 business days of the final harvest lot closing. Land Owners who accept lower base rents in exchange for yield participation benefit from this clause.</div>
</div>

<div class="innovation-box">
  <div class="innovation-title">5.4 Climate Force Majeure AI Trigger</div>
  <div class="innovation-text">Force Majeure is automatically triggered — without manual filing — if the land parcel's GPS coordinates fall within a USDA Drought Monitor D3 (Extreme) or D4 (Exceptional) drought designation for 21 or more consecutive days, or if NOAA issues a Freeze Warning covering the land coordinates for 3 or more consecutive nights during active growing season. The AuditDNA Brain monitors USDA and NOAA APIs in real time. Upon trigger, both parties are notified via WhatsApp (OpenClaw) and email within 2 hours. No other agricultural contract in the Americas automates this clause.</div>
</div>

<div class="innovation-box">
  <div class="innovation-title">5.5 Buyer Pre-Assignment &amp; Price Lock</div>
  <div class="innovation-text">Prior to planting, MFG may broker a Buyer Pre-Assignment — a committed purchase order from a verified LOAF buyer at a locked FOB price for a specified volume of the upcoming harvest. If a Buyer Pre-Assignment is executed, it becomes an addendum to this Agreement. The Grower commits to delivering the pre-assigned volume first. The locked price is protected from downward USDA market movement. This clause gives Land Owners and Growers revenue certainty before a seed goes in the ground — a capability unique to the AuditDNA platform.</div>
</div>

${isCorp ? `<div class="innovation-box">
  <div class="innovation-title">5.6 Corporate Lease CPI Escalator</div>
  <div class="innovation-text">For corporate lessees, the annual lease rate per hectare shall escalate each year by the greater of (a) 3% or (b) the US Bureau of Labor Statistics CPI-U annual rate as of January 1 of the renewal year, tracked automatically by the AuditDNA platform. This protects the small land owner from inflation erosion on long-term corporate leases — a protection rarely included in standard agricultural lease forms.</div>
</div>` : ''}

<div class="innovation-box">
  <div class="innovation-title">${isCorp ? '5.7' : '5.6'} Distance-Verified Opportunity Matching</div>
  <div class="innovation-text">This Partnership was formed within the MFG-verified <strong>${maxDist}-mile operational radius</strong> between the Grower's base of operations and the Partnership Land. Distance is calculated using GPS coordinates verified at registration. Partnerships formed outside this radius require written approval from MFG and a logistics cost adjustment addendum. This ensures all partnerships are operationally viable — not just financially attractive on paper.</div>
</div>
</div>

<div class="section">
<h2>Article 6 — Buyer Connection &amp; LOAF Pipeline</h2>
<p>Upon execution of this Agreement, MFG shall actively market the Partnership's production capacity to verified buyers in the AuditDNA / LOAF network (currently ${'>'}33,000 contacts across growers, buyers, shippers, and packers in the US-Mexico corridor).</p>
<p>The Grower shall post all harvest inventory, volumes, pricing, and availability exclusively through the LOAF platform. MFG shall match posted inventory to active buyers, issue Purchase Orders, and manage the factoring advance pipeline per the standard LOAF workflow: ORIGIN → OFFER → FACTOR → PO ISSUED → DELIVERED → PAID.</p>
<p>Both parties authorize MFG to negotiate buyer terms on their behalf within the parameters set in the active LOAF offer. Final buyer identity shall be disclosed to Grower only upon PO issuance.</p>
</div>

<div class="section">
<h2>Article 7 — Force Majeure</h2>
<p>Force Majeure events include: (a) USDA Drought Monitor D3/D4 designation per Article 5.4 AI Trigger; (b) NOAA-verified freeze events per Article 5.4; (c) SENASICA or USDA-APHIS phytosanitary quarantine affecting the land parcel; (d) documented flooding, earthquake, or fire; (e) US or Mexican government-imposed trade embargo on the primary commodity. In all cases, the AuditDNA Brain shall serve as the primary monitoring and notification system. Manual force majeure claims must be supported by official government documentation.</p>
</div>

<div class="section">
<h2>Article 8 — Financial Flow &amp; Escrow</h2>
<p>All harvest revenue shall flow through the MFG Escrow Account before distribution to the parties. Distribution shall occur within 5 business days of buyer payment confirmation in the LOAF platform. MFG shall deduct its commission (${commRate}%) and any Performance Bond adjustments prior to split distribution. A digital transaction receipt is issued to both parties via the AuditDNA platform within 24 hours of each distribution.</p>
<p>MFG may offer factoring advances to the Grower against confirmed purchase orders. Factoring terms are governed by the separate LOAF Factoring Disclosure Agreement. Land Owners are not liable for Grower factoring obligations.</p>
</div>

<div class="section">
<h2>Article 9 — Breach &amp; Penalties</h2>
<p><strong>Exclusivity Breach:</strong> Any produce sale, transfer, or disposition outside the LOAF platform constitutes a material breach. Penalty: <strong>20% of the estimated annual partnership revenue</strong> due to MFG immediately, plus the aggrieved party's actual damages. The LOAF Exclusivity Hash (${loafHash}) shall serve as prima facie evidence of the agreement in any proceeding.</p>
<p><strong>Grower Abandonment:</strong> If the Grower abandons the land during an active growing season, the Performance Bond is fully forfeited to the Land Owner, and MFG may immediately assign a replacement operator from the WE LINK network.</p>
<p><strong>Land Owner Interference:</strong> Land Owner may not enter into parallel agreements with competing operators on the same parcel during the term. Violation triggers a penalty equal to one full season's projected revenue to the Grower.</p>
</div>

<div class="section">
<h2>Article 10 — Dispute Resolution</h2>
<p>Parties agree to binding arbitration administered by JAMS (USA) or CANACO (Mexico) depending on where the primary dispute arises. Arbitration shall be conducted in English and Spanish simultaneously. The AuditDNA platform transaction ledger, LOAF hash records, and Brain event logs shall be admissible as digital evidence in any arbitration or legal proceeding. Each party bears its own legal fees unless the arbitrator awards otherwise.</p>
</div>

<div class="section">
<h2>Article 11 — Digital Signatures &amp; Execution</h2>
<p>This Agreement is executed digitally. Each party's typed name, WE LINK Blind ID, timestamp, and IP address constitute a legally binding digital signature under California Electronic Signatures in Global and National Commerce Act (E-SIGN) and Mexico's Codigo de Comercio (Article 89). Physical signatures are optional and do not supersede digital execution.</p>

<div class="sig-grid">
  <div class="sig-box">
    <div class="sig-label">Land Owner (${land.blind_id})</div>
    <div class="sig-field" id="sig-land"></div>
    <div class="sig-name">Signature / Date</div>
  </div>
  <div class="sig-box">
    <div class="sig-label">Grower / Operator (${grower.blind_id})</div>
    <div class="sig-field" id="sig-grower"></div>
    <div class="sig-name">Signature / Date</div>
  </div>
  <div class="sig-box">
    <div class="sig-label">Mexausa Food Group, Inc.</div>
    <div class="sig-field"></div>
    <div class="sig-name">Saul Garcia, Owner &nbsp;|&nbsp; ${dateStr}</div>
  </div>
</div>
</div>

<div class="footer-bar">
  <span>Mexausa Food Group, Inc. &nbsp;|&nbsp; EIN: 88-1698129 &nbsp;|&nbsp; loaf.mexausafg.com &nbsp;|&nbsp; we-link.html</span>
  <span>Contract: ${contractId} &nbsp;|&nbsp; LOAF Hash: ${loafHash}</span>
</div>

</body>
</html>`;
}

// ── GET CONTRACT HTML ────────────────────────────────────────────────────────
router.get('/:match_id', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const match = await pool.query('SELECT * FROM we_link_matches WHERE id = $1', [req.params.match_id]);
    if (!match.rows.length) return res.status(404).json({ error: 'Match not found' });
    const deal = match.rows[0];

    const [land, grower] = await Promise.all([
      pool.query('SELECT * FROM we_link_profiles WHERE id = $1', [deal.land_profile_id]),
      pool.query('SELECT * FROM we_link_profiles WHERE id = $1', [deal.grower_profile_id]),
    ]);

    const html = buildContractHTML(deal, land.rows[0] || {}, grower.rows[0] || {}, {
      term: req.query.term || '1 year',
      max_distance_miles: parseInt(req.query.distance) || 50,
      performance_bond_pct: parseInt(req.query.bond) || 10,
      yield_bonus_pct: parseInt(req.query.yield_bonus) || 5,
      partnership_type: deal.partnership_type,
    });

    if (req.query.format === 'json') {
      return res.json({ ok: true, contract_id: 'MFG-WL-' + deal.id + '-' + new Date().getFullYear(), html });
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SIGN CONTRACT ─────────────────────────────────────────────────────────────
router.post('/:match_id/sign', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  const { party, signature_name, ip } = req.body;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS we_link_signatures (
        id SERIAL PRIMARY KEY, match_id INTEGER, party VARCHAR(20),
        blind_id VARCHAR(30), signature_name VARCHAR(255), ip VARCHAR(50),
        signed_at TIMESTAMPTZ DEFAULT NOW(), loaf_hash VARCHAR(32)
      )
    `).catch(()=>{});

    const match = await pool.query('SELECT * FROM we_link_matches WHERE id = $1', [req.params.match_id]);
    if (!match.rows.length) return res.status(404).json({ error: 'Match not found' });
    const deal = match.rows[0];
    const loafHash = require('crypto').createHash('sha256')
      .update('MFG-WL-' + deal.id + '-' + new Date().getFullYear() + deal.land_profile_id + deal.grower_profile_id)
      .digest('hex').slice(0,16).toUpperCase();

    const profId = party === 'land' ? deal.land_profile_id : deal.grower_profile_id;
    const prof = await pool.query('SELECT blind_id FROM we_link_profiles WHERE id = $1', [profId]);

    await pool.query(
      'INSERT INTO we_link_signatures (match_id,party,blind_id,signature_name,ip,loaf_hash) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.match_id, party, prof.rows[0]?.blind_id, signature_name, ip, loafHash]
    );

    // Check if both parties signed — if so, advance deal to term_sheet
    const sigs = await pool.query('SELECT party FROM we_link_signatures WHERE match_id = $1', [req.params.match_id]);
    const parties = sigs.rows.map(s => s.party);
    const bothSigned = parties.includes('land') && parties.includes('grower');
    if (bothSigned && deal.status === 'nda_signed') {
      await pool.query("UPDATE we_link_matches SET status = 'term_sheet', term_sheet_at = NOW() WHERE id = $1", [req.params.match_id]);
    }

    res.json({ ok: true, signed: true, loaf_hash: loafHash, both_signed: bothSigned });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET SIGNATURES ────────────────────────────────────────────────────────────
router.get('/:match_id/signatures', async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!pool) return res.status(500).json({ error: 'No DB pool' });
  try {
    const r = await pool.query('SELECT party, blind_id, signature_name, signed_at, loaf_hash FROM we_link_signatures WHERE match_id = $1 ORDER BY signed_at', [req.params.match_id]);
    res.json({ ok: true, signatures: r.rows, count: r.rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
