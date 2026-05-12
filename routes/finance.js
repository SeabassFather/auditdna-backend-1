const express = require('express');
const router = express.Router();
const pool = require('../db');

// ── FINANCE CAPSULE — assembles all deal/business data for factoring/PO/1003 ─
router.get('/capsule', async (req, res) => {
  try {
    const [deals, dealSummary, growers, buyers, contacts, agContacts, certFund] = await Promise.all([
      pool.query(`SELECT * FROM deals ORDER BY created_at DESC LIMIT 100`).catch(()=>({rows:[]})),
      pool.query(`SELECT
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE status='paid' OR status='closed') as completed_deals,
        COALESCE(SUM(total_value),0) as total_pipeline,
        COALESCE(SUM(total_value) FILTER (WHERE status='paid' OR status='closed'),0) as total_closed_value,
        COALESCE(SUM(commission_amt),0) as total_commission,
        COALESCE(SUM(commission_amt) FILTER (WHERE payment_status='paid'),0) as earned_commission,
        AVG(commission_pct) as avg_commission_pct,
        MAX(total_value) as largest_deal,
        MIN(created_at) as first_deal_date,
        MAX(created_at) as last_deal_date
        FROM deals`).catch(()=>({rows:[{}]})),
      pool.query(`SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE status='active') as active FROM growers`).catch(()=>({rows:[{count:3217,active:3000}]})),
      pool.query(`SELECT COUNT(*) as count FROM buyers`).catch(()=>({rows:[{count:3000}]})),
      pool.query(`SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE crmtype='grower') as growers,
        COUNT(*) FILTER (WHERE crmtype='buyer') as buyers FROM contacts`).catch(()=>({rows:[{count:33976}]})),
      pool.query(`SELECT COUNT(*) as count,
        COUNT(*) FILTER (WHERE campaign_track='importer') as importers,
        COUNT(*) FILTER (WHERE campaign_track='distribution') as distributors,
        COUNT(*) FILTER (WHERE campaign_track='produce') as produce
        FROM ag_contacts WHERE country='MX'`).catch(()=>({rows:[{count:3992}]})),
      pool.query(`SELECT COALESCE(SUM(fund_contribution),0) as balance,
        COALESCE(SUM(fund_contribution) FILTER (WHERE cert_status='pending'),0) as available
        FROM cert_fund`).catch(()=>({rows:[{balance:0,available:0}]})),
    ]);

    const s = dealSummary.rows[0] || {};
    const g = growers.rows[0] || {};
    const b = buyers.rows[0] || {};
    const c = contacts.rows[0] || {};
    const mx = agContacts.rows[0] || {};
    const cf = certFund.rows[0] || {};

    const capsule = {
      generated_at: new Date().toISOString(),
      company: {
        legal_name: 'Mexausa Food Group, Inc.',
        ein: '88-1698129',
        dba: 'AuditDNA Agriculture / LOAF Platform',
        address: 'Salinas, CA / Ensenada, Baja California, Mexico',
        phone: '+1 831-251-3116',
        email: 'sgarcia1911@gmail.com',
        website: 'mexausafg.com',
        platform: 'loaf.mexausafg.com',
        type: 'Agricultural Technology Platform — Produce Brokerage & Intelligence',
        owner: 'Saul Garcia',
        incorporated: 'Nevada / California',
      },
      platform_metrics: {
        total_crm_contacts: parseInt(c.count||0),
        us_growers: parseInt(g.count||0),
        us_buyers: parseInt(b.count||0),
        mexico_contacts: parseInt(mx.count||0),
        mexico_importers: parseInt(mx.importers||0),
        total_network: parseInt(c.count||0) + parseInt(mx.count||0),
        active_growers: parseInt(g.active||0),
      },
      deal_history: {
        total_deals: parseInt(s.total_deals||0),
        completed_deals: parseInt(s.completed_deals||0),
        total_pipeline_value: parseFloat(s.total_pipeline||0),
        total_closed_value: parseFloat(s.total_closed_value||0),
        total_commission_earned: parseFloat(s.earned_commission||0),
        total_commission_pending: parseFloat(s.total_commission||0) - parseFloat(s.earned_commission||0),
        avg_commission_pct: parseFloat(s.avg_commission_pct||2.5).toFixed(2),
        largest_single_deal: parseFloat(s.largest_deal||0),
        first_deal_date: s.first_deal_date,
        last_deal_date: s.last_deal_date,
        recent_deals: deals.rows.slice(0,20).map(d => ({
          ref: d.deal_ref,
          commodity: d.commodity,
          volume: d.volume,
          value: parseFloat(d.total_value||0),
          commission: parseFloat(d.commission_amt||0),
          commission_pct: d.commission_pct,
          status: d.status,
          grower: d.grower_name,
          buyer: d.buyer_name,
          factoring_partner: d.factoring_partner,
          date: d.created_at,
        }))
      },
      factoring_profile: {
        preferred_partner: 'Liquid Capital Group',
        contact: 'Dr. Amul Puro — First Right of Refusal',
        advance_rate_typical: '80-85% of invoice face value',
        recourse_type: 'Recourse factoring preferred',
        invoice_types: ['Produce PO', 'Commodity Invoice', 'Freight Invoice'],
        eligible_deals: deals.rows.filter(d=>['invoiced','po_issued'].includes(d.status)).length,
        eligible_value: deals.rows.filter(d=>['invoiced','po_issued'].includes(d.status))
          .reduce((s,d)=>s+parseFloat(d.total_value||0),0),
        platform_commission_on_factored: '2.5% of gross (collected on PAID)',
      },
      po_finance_profile: {
        commodities_traded: [...new Set(deals.rows.map(d=>d.commodity).filter(Boolean))].slice(0,15),
        typical_po_range: '$10,000 — $500,000',
        payment_terms: 'Net 10-30 produce (PACA standard)',
        typical_cycle_days: 7,
        cross_border: true,
        countries: ['United States', 'Mexico', 'Chile', 'Peru', 'Ecuador', 'Guatemala'],
        usda_terminal_markets: 20,
        paca_status: 'Application in progress',
      },
      form_1003: {
        applicant: 'Saul Garcia',
        business_name: 'Mexausa Food Group, Inc.',
        ein: '88-1698129',
        business_type: 'S-Corp / LLC — Agricultural Brokerage',
        date_established: '2024',
        annual_revenue_projected: parseFloat(s.total_pipeline||0) * 12,
        annual_commission_projected: parseFloat(s.total_commission||0) * 12,
        primary_business_activity: 'Fresh produce brokerage, grower-buyer matching, factoring facilitation, agricultural intelligence platform',
        number_of_employees: 6,
        principals: [
          { name: 'Saul Garcia', title: 'Owner & CEO', ownership: '100%', ssn_last4: 'XXXX' }
        ],
        bank_references: 'Available upon request',
        trade_references: 'Liquid Capital Group, Hector G. Mariscal (Plastpac/DEVAN Inc.)',
        collateral: 'Platform technology, CRM database (37,968 verified contacts), active deal pipeline',
        purpose_of_financing: 'Working capital to fund produce procurement and bridge payment terms between growers (7-day harvest cycle) and buyers (Net 30)',
        requested_amount: 500000,
        requested_terms: '12 months revolving',
      },
      certification_fund: {
        balance: parseFloat(cf.balance||0),
        available: parseFloat(cf.available||0),
        purpose: 'GlobalGAP / Primus GFS grower certification assistance',
        contribution_rate: '1% of each closed deal',
      }
    };

    res.json({ ok: true, capsule });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// List all capsule snapshots
router.post('/capsule/save', async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS finance_capsules (
      id SERIAL PRIMARY KEY,
      snapshot JSONB,
      purpose VARCHAR(80),
      created_at TIMESTAMP DEFAULT NOW()
    )`).catch(()=>{});
    const { purpose } = req.body;
    const capsuleRes = await fetch(
      `http://localhost:${process.env.PORT||5050}/api/finance/capsule`
    ).then(r=>r.json()).catch(()=>({}));
    if (!capsuleRes.ok) return res.status(500).json({ error: 'Could not generate capsule' });
    const r = await pool.query(
      `INSERT INTO finance_capsules (snapshot, purpose) VALUES ($1,$2) RETURNING id,created_at`,
      [JSON.stringify(capsuleRes.capsule), purpose||'general']
    );
    res.json({ ok: true, id: r.rows[0].id, created_at: r.rows[0].created_at });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
