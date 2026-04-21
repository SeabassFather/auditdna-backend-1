// ============================================================
// financing.js — Express route, mounted at /api/financing
// Endpoints:
//   POST /submit-deal                    — creates deal, auto-routes to primary
//   POST /deal/:id/decision              — records partner decision (auth-required)
//   GET  /deal/:id/status                — masked status, no identity
//   GET  /deal/:id/partner-identity      — gated, only at PARTY_DISCLOSURE
//   GET  /decision-link?token=...        — one-click from partner email
//   GET  /admin/dashboard                — all deals + decisions (owner-only)
// ============================================================
'use strict';

const express = require('express');
const router = express.Router();

const waterfall = require('../services/financing-waterfall');
const mailer    = require('../services/financing-mailer');

function getDB() {
  if (global.db && typeof global.db.query === 'function') return global.db;
  throw new Error('[financing] global.db not available');
}

// ------------------------------------------------------------
// POST /submit-deal
// Body: { client_id, client_type, client_company_name, client_contact_name,
//         client_email, commodity, amount_requested, advance_percent,
//         term_days, invoice_reference, notes, submitted_by }
// ------------------------------------------------------------
router.post('/submit-deal', async (req, res) => {
  try {
    const dealId = await waterfall.createDeal(req.body || {});
    const partner = await waterfall.routeToNextPartner(dealId);

    if (!partner) {
      return res.status(200).json({
        success: true,
        dealId,
        stage: 'NO_FINANCING_AVAILABLE',
        financing_partner_label: 'Mexausa Food Group financing partner',
        message: 'Deal submitted but no active financing partners are available.'
      });
    }

    // Fetch the full deal record for the email
    const { rows } = await getDB().query(`SELECT * FROM financing_deals WHERE id = $1`, [dealId]);
    const deal = rows[0];

    // Fire the email — partner identity stays server-side
    let emailResult = null;
    try {
      emailResult = await mailer.sendPartnerNotification(deal, partner);
    } catch (mailErr) {
      console.error('[financing] email send failed:', mailErr.message);
      await waterfall.logEvent(dealId, 'email_failed', null, null, partner.id, 'system',
        { error: mailErr.message });
    }

    // Response contains ZERO partner identity
    res.status(201).json({
      success: true,
      dealId,
      stage: partner.role === 'primary' ? 'PRIMARY_REVIEW' : 'SECONDARY_REVIEW',
      financing_partner_label: partner.public_label || 'Mexausa Food Group financing partner',
      estimated_response: '48 hours',
      email_sent: !!emailResult
    });
  } catch (err) {
    console.error('[financing] /submit-deal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------------------------
// POST /deal/:id/decision
// Body: { partnerId, decision: 'accepted'|'passed'|'expired', notes, decidedBy }
// Typically called internally (admin) or via decision-link handler.
// ------------------------------------------------------------
router.post('/deal/:id/decision', async (req, res) => {
  try {
    const { partnerId, decision, notes = '', decidedBy = 'manual' } = req.body || {};
    if (!partnerId || !decision) {
      return res.status(400).json({ success: false, error: 'partnerId and decision required' });
    }

    const nextAction = await waterfall.recordDecision(
      req.params.id, partnerId, decision, notes, decidedBy
    );

    // If the waterfall routed to the next partner, email them too
    if (nextAction && nextAction.type === 'ROUTED_TO_NEXT') {
      const { rows } = await getDB().query(`SELECT * FROM financing_deals WHERE id = $1`, [req.params.id]);
      const { rows: prows } = await getDB().query(
        `SELECT * FROM financing_partner_registry WHERE id = $1`, [nextAction.partnerId]
      );
      if (rows[0] && prows[0]) {
        try {
          await mailer.sendPartnerNotification(rows[0], prows[0]);
        } catch (e) {
          console.error('[financing] waterfall email failed:', e.message);
        }
      }
    }

    // If nobody accepted, alert Saul
    if (nextAction && nextAction.type === 'NO_FINANCING_AVAILABLE') {
      try {
        await mailer.sendSaulAlert(
          `No financing available for ${req.params.id}`,
          `All configured factoring partners have passed or expired on deal ${req.params.id}. Review in Admin Dashboard.`
        );
      } catch {}
    }

    res.json({ success: true, nextAction });
  } catch (err) {
    console.error('[financing] /decision error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------------------------
// GET /deal/:id/status  —  PUBLIC-SAFE, no identity
// ------------------------------------------------------------
router.get('/deal/:id/status', async (req, res) => {
  try {
    const status = await waterfall.getPublicStatus(req.params.id);
    if (!status) return res.status(404).json({ success: false, error: 'Deal not found' });
    res.json({ success: true, ...status });
  } catch (err) {
    console.error('[financing] /status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------------------------
// GET /deal/:id/partner-identity  —  GATED
// ------------------------------------------------------------
router.get('/deal/:id/partner-identity', async (req, res) => {
  try {
    const requestedBy = req.headers['x-user-email'] || 'unknown';
    const identity = await waterfall.getPartnerIdentityForDeal(req.params.id, requestedBy);
    if (!identity) return res.status(404).json({ success: false, error: 'Deal not found' });
    res.json({ success: true, ...identity });
  } catch (err) {
    console.error('[financing] /partner-identity error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------------------------
// GET /decision-link?token=...  —  ONE-CLICK FROM EMAIL
// Partner clicks link from their email → we verify signed token → record decision
// Returns a simple HTML confirmation (no login required)
// ------------------------------------------------------------
router.get('/decision-link', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send(renderConfirm('Missing token', null, 'error'));

  const parsed = mailer.verifyDecisionToken(token);
  if (!parsed) return res.status(401).send(renderConfirm('Invalid or tampered link', null, 'error'));
  if (parsed.expired) return res.status(410).send(renderConfirm('This link has expired (14 days)', null, 'error'));

  try {
    const nextAction = await waterfall.recordDecision(
      parsed.dealId, parsed.partnerId, parsed.decision,
      '', `partner_email_link`
    );

    // Waterfall email to next partner on pass
    if (nextAction && nextAction.type === 'ROUTED_TO_NEXT') {
      const { rows } = await getDB().query(`SELECT * FROM financing_deals WHERE id = $1`, [parsed.dealId]);
      const { rows: prows } = await getDB().query(
        `SELECT * FROM financing_partner_registry WHERE id = $1`, [nextAction.partnerId]
      );
      if (rows[0] && prows[0]) {
        try { await mailer.sendPartnerNotification(rows[0], prows[0]); } catch {}
      }
    }
    if (nextAction && nextAction.type === 'NO_FINANCING_AVAILABLE') {
      try {
        await mailer.sendSaulAlert(
          `No financing available for ${parsed.dealId}`,
          `All factoring partners have passed on deal ${parsed.dealId}.`
        );
      } catch {}
    }

    const verb = parsed.decision === 'accepted' ? 'accepted' : 'passed on';
    res.send(renderConfirm(
      `Thank you — your response (${verb}) has been recorded.`,
      `Deal ${parsed.dealId}`,
      'ok'
    ));
  } catch (err) {
    console.error('[financing] /decision-link error:', err);
    res.status(500).send(renderConfirm('Internal error recording decision', null, 'error'));
  }
});

function renderConfirm(message, sub, kind) {
  const color = kind === 'ok' ? '#16a34a' : '#dc2626';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Decision Recorded</title>
<style>
  body{margin:0;background:#0f172a;color:#f1f5f9;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .card{max-width:520px;padding:40px;background:#1e293b;border:1px solid #334155;border-radius:4px;text-align:center;}
  .badge{display:inline-block;padding:6px 14px;background:${color};color:#fff;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;border-radius:3px;margin-bottom:18px;}
  h1{font-size:20px;margin:0 0 10px;color:#cba658;}
  p{font-size:14px;line-height:1.6;color:#cbd5e1;}
  .foot{margin-top:22px;padding-top:16px;border-top:1px solid #334155;font-size:11px;color:#64748b;}
</style></head>
<body><div class="card">
  <div class="badge">${kind === 'ok' ? 'Confirmed' : 'Error'}</div>
  <h1>${message}</h1>
  ${sub ? `<p>${sub}</p>` : ''}
  <div class="foot">Mexausa Food Group, Inc. &nbsp;|&nbsp; PACA #20241168</div>
</div></body></html>`;
}

// ------------------------------------------------------------
// GET /admin/dashboard  —  OWNER-ONLY summary of all deals
// ------------------------------------------------------------
router.get('/admin/dashboard', async (req, res) => {
  try {
    const role = req.headers['x-access-level'] || '';
    if (role !== 'owner' && role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const { rows } = await getDB().query(`
      SELECT d.id, d.commodity, d.amount_requested, d.stage,
             d.client_company_name, d.submitted_at, d.last_stage_change_at,
             r.id AS partner_id, r.legal_name AS partner_legal_name,
             r.contact_name AS partner_contact, r.contact_email AS partner_email,
             r.role AS partner_role
        FROM financing_deals d
        LEFT JOIN financing_partner_registry r ON r.id = d.current_partner_id
       ORDER BY d.submitted_at DESC
       LIMIT 200
    `);
    res.json({ success: true, deals: rows });
  } catch (err) {
    console.error('[financing] /admin/dashboard error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;