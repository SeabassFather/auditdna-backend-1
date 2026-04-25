// ============================================================================
// AuditDNA - Notification Engine
// Sprint C P13 / 4.25.2026
// Hooks global.brainEmit, matches templates + subscriptions, sends via SMTP/SMS, logs
// Defensive: never blocks the brain emit if sending fails
// ============================================================================

const express = require('express');
const router = express.Router();

// ---- Schema ---------------------------------------------------------------
async function ensureSchema() {
  if (!global.db) return;
  try {
    await global.db.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(80) NOT NULL,
        channel VARCHAR(20) NOT NULL DEFAULT 'email',
        lane_filter VARCHAR(50),
        subject TEXT,
        body_template TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_notif_templates_event ON notification_templates(event_type, active);`);

    await global.db.query(`
      CREATE TABLE IF NOT EXISTS notification_subscriptions (
        id SERIAL PRIMARY KEY,
        recipient_name VARCHAR(200),
        email VARCHAR(200),
        phone VARCHAR(50),
        event_types TEXT,
        lanes TEXT,
        channels TEXT DEFAULT 'email',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await global.db.query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(80),
        template_id INTEGER,
        subscription_id INTEGER,
        channel VARCHAR(20),
        recipient VARCHAR(200),
        subject TEXT,
        body_preview TEXT,
        payload_json JSONB,
        status VARCHAR(20),
        error TEXT,
        sent_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_notif_log_event ON notification_log(event_type, sent_at DESC);`);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_notif_log_status ON notification_log(status);`);

    // Seed default templates if none exist
    const existing = await global.db.query(`SELECT COUNT(*)::int as c FROM notification_templates`);
    if (existing.rows[0].c === 0) {
      await seedDefaultTemplates();
    }

    console.log('[notifications] schema OK');
  } catch (e) {
    console.error('[notifications] schema error:', e.message);
  }
}

async function seedDefaultTemplates() {
  const defaults = [
    {
      event_type: 'BORROWER_ONBOARDED',
      subject: 'New Borrower Onboarded - {{legal_name}}',
      body: `A new borrower entity has been registered in AuditDNA.

Borrower: {{legal_name}}
Role: {{borrower_role}}
EIN: {{ein}}
Borrower ID: {{borrower_id}}

Open AuditDNA -> Borrowers to review or approve KYC.`
    },
    {
      event_type: 'BORROWER_APPROVED',
      subject: 'KYC Approved - {{legal_name}}',
      body: `KYC has been approved for {{legal_name}}.

Borrower ID: {{borrower_id}}
Role: {{borrower_role}}
Approved by: {{approved_by}}

The borrower is now eligible for funding across all 3 lanes.`
    },
    {
      event_type: 'DOCUMENT_UPLOADED',
      subject: 'New Document - Deal #{{deal_id}} ({{lane}})',
      body: `A document was uploaded to deal #{{deal_id}} in {{lane}}.

Filename: {{filename}}
Type: {{doc_type}}
Size: {{size_bytes}} bytes
Document ID: {{doc_id}}

Open AuditDNA -> Deal Documents.`
    },
    {
      event_type: 'LENDER_RESPONSE_RECEIVED',
      subject: 'Lender Response - Deal #{{deal_id}} ({{lane}})',
      body: `A new lender response was received on deal #{{deal_id}}.

Partner: {{partner_name}}
Type: {{response_type}}
Advance Rate: {{advance_rate}}
Factor Rate: {{factor_rate}}
Interest Rate: {{interest_rate}}
Loan Amount: {{loan_amount}}

Open AuditDNA -> Lender Responses to accept or reject.`
    },
    {
      event_type: 'LENDER_RESPONSE_ACCEPTED',
      subject: 'Offer Accepted - Deal #{{deal_id}}',
      body: `An offer was accepted on deal #{{deal_id}}.

Partner: {{partner_name}}
Lane: {{lane}}
Decided by: {{decided_by}}

Generate term sheet in AuditDNA -> Term Sheets.`
    },
    {
      event_type: 'PORTAL_VIEWED',
      subject: 'Portal Viewed - Deal #{{deal_id}}',
      body: `The borrower portal for deal #{{deal_id}} ({{lane}}) was just viewed.

View count: {{view_count}}
Token ID: {{token_id}}`
    },
    {
      event_type: 'MASTER_AGREEMENT_SIGNED',
      subject: 'Master Agreement Signed - {{legal_name}}',
      body: `The master agreement was marked as signed for {{legal_name}}.

Signed date: {{signed_date}}
Borrower ID: {{borrower_id}}`
    },
    {
      event_type: 'BORROWER_BANK_VERIFIED',
      subject: 'Bank Verified - {{legal_name}}',
      body: `Bank account verified for {{legal_name}}.

Bank: {{bank_name}}
Account ending: {{account_last4}}
Borrower ID: {{borrower_id}}`
    },
    {
      event_type: 'DEAL_BORROWER_LINKED',
      subject: 'Borrower Linked - Deal #{{deal_id}}',
      body: `A borrower was linked to deal #{{deal_id}}.

Borrower: {{borrower_name}}
Lane: {{lane}}
Borrower ID: {{borrower_id}}

Risk Center will recompute the DRS automatically.`
    }
  ];

  for (const t of defaults) {
    try {
      await global.db.query(
        `INSERT INTO notification_templates (event_type, channel, subject, body_template) VALUES ($1, 'email', $2, $3)`,
        [t.event_type, t.subject, t.body]
      );
    } catch (e) { console.error('[notifications] seed error:', e.message); }
  }

  // Default subscription: Saul (only if SAUL_EMAIL env set)
  const saulEmail = process.env.SAUL_EMAIL || process.env.OWNER_EMAIL;
  const saulPhone = process.env.SAUL_PHONE || '+18312513116';
  if (saulEmail) {
    try {
      await global.db.query(
        `INSERT INTO notification_subscriptions (recipient_name, email, phone, event_types, channels)
         VALUES ('Saul Garcia', $1, $2, 'ALL', 'email')`,
        [saulEmail, saulPhone]
      );
      console.log('[notifications] seeded default subscription for Saul');
    } catch (e) {}
  }
}
setTimeout(ensureSchema, 2000);

// ---- Template rendering ---------------------------------------------------
function renderTemplate(template, payload) {
  if (!template) return '';
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = payload && payload[k];
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
  });
}

// ---- SMTP send (via existing nodemailer if available, else log only) ------
let mailer = null;
function getMailer() {
  if (mailer !== null) return mailer;
  try {
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      mailer = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      console.log('[notifications] mailer ready: ' + process.env.SMTP_HOST);
    } else {
      mailer = false;
      console.warn('[notifications] SMTP env vars missing - emails will be logged only');
    }
  } catch (e) {
    mailer = false;
    console.warn('[notifications] nodemailer not available - emails will be logged only');
  }
  return mailer;
}

async function sendEmail({ to, subject, body, fromName }) {
  const m = getMailer();
  if (!m) return { ok: false, error: 'mailer not configured (logged only)' };
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    await m.sendMail({
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to,
      subject,
      text: body
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---- SMS send (via Zadarma if env set, else log only) --------------------
async function sendSMS({ to, body }) {
  if (!process.env.ZADARMA_KEY || !process.env.ZADARMA_SECRET) {
    return { ok: false, error: 'Zadarma env not set (logged only)' };
  }
  // Zadarma SMS API - signature based; defer to existing helper if present
  if (typeof global.zadarmaSendSMS === 'function') {
    try {
      const r = await global.zadarmaSendSMS(to, body);
      return { ok: true, response: r };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  return { ok: false, error: 'zadarmaSendSMS helper not available' };
}

// ---- Match subscribers for an event ---------------------------------------
async function findSubscribers(eventType, payload) {
  if (!global.db) return [];
  try {
    const r = await global.db.query(
      `SELECT * FROM notification_subscriptions WHERE active = true`
    );
    return r.rows.filter(s => {
      if (s.event_types) {
        const types = s.event_types.split(',').map(t => t.trim().toUpperCase());
        if (!types.includes('ALL') && !types.includes(eventType.toUpperCase())) return false;
      }
      if (s.lanes && payload.lane) {
        const lanes = s.lanes.split(',').map(l => l.trim().toLowerCase());
        if (!lanes.includes('all') && !lanes.includes(String(payload.lane).toLowerCase())) return false;
      }
      return true;
    });
  } catch (e) { return []; }
}

// ---- Find templates for an event ------------------------------------------
async function findTemplates(eventType, lane) {
  if (!global.db) return [];
  try {
    const r = await global.db.query(
      `SELECT * FROM notification_templates
       WHERE event_type = $1 AND active = true
         AND (lane_filter IS NULL OR lane_filter = $2)`,
      [eventType, lane || null]
    );
    return r.rows;
  } catch (e) { return []; }
}

// ---- Log a notification ---------------------------------------------------
async function logNotification(rec) {
  if (!global.db) return;
  try {
    await global.db.query(
      `INSERT INTO notification_log
         (event_type, template_id, subscription_id, channel, recipient, subject, body_preview, payload_json, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        rec.event_type, rec.template_id || null, rec.subscription_id || null,
        rec.channel, rec.recipient,
        rec.subject ? String(rec.subject).substring(0, 500) : null,
        rec.body ? String(rec.body).substring(0, 500) : null,
        rec.payload ? JSON.stringify(rec.payload) : null,
        rec.status, rec.error || null
      ]
    );
  } catch (e) { console.error('[notifications] log error:', e.message); }
}

// ---- The main dispatch ----------------------------------------------------
async function dispatchEvent(eventType, payload) {
  payload = payload || {};
  try {
    const templates = await findTemplates(eventType, payload.lane);
    if (templates.length === 0) return; // no template = silent

    const subscribers = await findSubscribers(eventType, payload);
    if (subscribers.length === 0) return;

    for (const tmpl of templates) {
      const subject = renderTemplate(tmpl.subject || `AuditDNA - ${eventType}`, payload);
      const body = renderTemplate(tmpl.body_template, payload);

      for (const sub of subscribers) {
        const channels = (sub.channels || 'email').split(',').map(c => c.trim().toLowerCase());

        if ((tmpl.channel === 'email' || tmpl.channel === 'any') && channels.includes('email') && sub.email) {
          const r = await sendEmail({ to: sub.email, subject, body, fromName: 'AuditDNA / Mexausa Food Group' });
          await logNotification({
            event_type: eventType, template_id: tmpl.id, subscription_id: sub.id,
            channel: 'email', recipient: sub.email, subject, body,
            payload, status: r.ok ? 'sent' : 'failed', error: r.error
          });
        }
        if ((tmpl.channel === 'sms' || tmpl.channel === 'any') && channels.includes('sms') && sub.phone) {
          const smsBody = `${subject}\n\n${body}`.substring(0, 320);
          const r = await sendSMS({ to: sub.phone, body: smsBody });
          await logNotification({
            event_type: eventType, template_id: tmpl.id, subscription_id: sub.id,
            channel: 'sms', recipient: sub.phone, subject, body: smsBody,
            payload, status: r.ok ? 'sent' : 'failed', error: r.error
          });
        }
      }
    }
  } catch (e) {
    console.error('[notifications] dispatch error:', e.message);
  }
}

// ---- Hook global.brainEmit -----------------------------------------------
// We wrap, not replace - if other code already wraps it, we chain.
function installBrainHook() {
  const original = global.brainEmit;
  global.brainEmit = function(eventType, payload) {
    // Call original first (don't block existing flow)
    try { if (typeof original === 'function') original(eventType, payload); } catch (e) {}
    // Fire-and-forget notification dispatch (never block brain)
    setImmediate(() => { dispatchEvent(eventType, payload).catch(e => console.error('[notifications] async error:', e.message)); });
  };
  console.log('[notifications] installed brainEmit hook');
}
setTimeout(installBrainHook, 3000);

// ============================================================================
// REST routes
// ============================================================================
const heavyJson = express.json({ limit: '1mb' });

// Templates
router.get('/api/notifications/templates', async (req, res) => {
  try {
    const r = await global.db.query(`SELECT * FROM notification_templates ORDER BY event_type, channel`);
    res.json({ templates: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/notifications/templates', heavyJson, async (req, res) => {
  const b = req.body || {};
  if (!b.event_type || !b.body_template) return res.status(400).json({ error: 'event_type and body_template required' });
  try {
    const r = await global.db.query(
      `INSERT INTO notification_templates (event_type, channel, lane_filter, subject, body_template, active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [b.event_type, b.channel || 'email', b.lane_filter || null, b.subject || null, b.body_template, b.active !== false]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/notifications/templates/:id', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const sets = []; const params = []; let pidx = 1;
  ['event_type','channel','lane_filter','subject','body_template','active'].forEach(f => {
    if (b[f] !== undefined) { sets.push(`${f} = $${pidx++}`); params.push(b[f]); }
  });
  if (sets.length === 0) return res.json({ ok: true, no_changes: true });
  sets.push(`updated_at = NOW()`); params.push(id);
  try {
    const r = await global.db.query(
      `UPDATE notification_templates SET ${sets.join(', ')} WHERE id = $${pidx} RETURNING id`,
      params
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/notifications/templates/:id', async (req, res) => {
  try {
    await global.db.query(`DELETE FROM notification_templates WHERE id = $1`, [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Subscriptions
router.get('/api/notifications/subscriptions', async (req, res) => {
  try {
    const r = await global.db.query(`SELECT * FROM notification_subscriptions ORDER BY created_at DESC`);
    res.json({ subscriptions: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/notifications/subscriptions', heavyJson, async (req, res) => {
  const b = req.body || {};
  if (!b.email && !b.phone) return res.status(400).json({ error: 'email or phone required' });
  try {
    const r = await global.db.query(
      `INSERT INTO notification_subscriptions (recipient_name, email, phone, event_types, lanes, channels, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        b.recipient_name || null, b.email || null, b.phone || null,
        b.event_types || 'ALL', b.lanes || null, b.channels || 'email',
        b.active !== false
      ]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/notifications/subscriptions/:id', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const sets = []; const params = []; let pidx = 1;
  ['recipient_name','email','phone','event_types','lanes','channels','active'].forEach(f => {
    if (b[f] !== undefined) { sets.push(`${f} = $${pidx++}`); params.push(b[f]); }
  });
  if (sets.length === 0) return res.json({ ok: true });
  params.push(id);
  try {
    await global.db.query(`UPDATE notification_subscriptions SET ${sets.join(', ')} WHERE id = $${pidx}`, params);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/notifications/subscriptions/:id', async (req, res) => {
  try {
    await global.db.query(`DELETE FROM notification_subscriptions WHERE id = $1`, [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Log
router.get('/api/notifications/log', async (req, res) => {
  const { event_type, status, limit } = req.query;
  const conditions = []; const params = []; let pidx = 1;
  if (event_type) { conditions.push(`event_type = $${pidx++}`); params.push(event_type); }
  if (status) { conditions.push(`status = $${pidx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '200', 10), 1000);
  try {
    const r = await global.db.query(
      `SELECT id, event_type, template_id, channel, recipient, subject, body_preview, status, error, sent_at
       FROM notification_log ${where}
       ORDER BY sent_at DESC LIMIT ${lim}`,
      params
    );
    res.json({ log: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get('/api/notifications/stats', async (req, res) => {
  try {
    const r = await global.db.query(`
      SELECT
        COUNT(*)::int as total,
        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END)::int as sent,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END)::int as failed,
        COUNT(DISTINCT event_type)::int as event_types
      FROM notification_log
      WHERE sent_at > NOW() - INTERVAL '30 days'
    `);
    const byEvent = await global.db.query(`
      SELECT event_type, COUNT(*)::int as count
      FROM notification_log
      WHERE sent_at > NOW() - INTERVAL '30 days'
      GROUP BY event_type ORDER BY count DESC LIMIT 20
    `);
    res.json({ summary: r.rows[0], by_event: byEvent.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Test send
router.post('/api/notifications/test', heavyJson, async (req, res) => {
  const { event_type, payload, override_email } = req.body || {};
  if (!event_type) return res.status(400).json({ error: 'event_type required' });
  try {
    if (override_email) {
      // Direct test send to specified email
      const templates = await findTemplates(event_type, payload?.lane);
      if (templates.length === 0) return res.status(404).json({ error: 'no template for event_type' });
      const tmpl = templates[0];
      const subject = renderTemplate(tmpl.subject || `Test - ${event_type}`, payload || {});
      const body = renderTemplate(tmpl.body_template, payload || {});
      const r = await sendEmail({ to: override_email, subject, body, fromName: 'AuditDNA Test' });
      await logNotification({
        event_type, template_id: tmpl.id, channel: 'email', recipient: override_email,
        subject, body, payload, status: r.ok ? 'sent' : 'failed', error: r.error
      });
      res.json({ ok: r.ok, error: r.error });
    } else {
      // Trigger the full pipeline as if it was a real event
      await dispatchEvent(event_type, payload || {});
      res.json({ ok: true, dispatched: true });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Available event types (for dropdowns)
router.get('/api/notifications/event-types', (req, res) => {
  res.json({
    event_types: [
      'BORROWER_ONBOARDED','BORROWER_APPROVED','MASTER_AGREEMENT_SIGNED','BORROWER_BANK_VERIFIED','BENEFICIAL_OWNER_ADDED',
      'DOCUMENT_UPLOADED','DOCUMENT_DELETED',
      'LENDER_RESPONSE_RECEIVED','LENDER_RESPONSE_ACCEPTED','LENDER_RESPONSE_REJECTED',
      'PORTAL_TOKEN_CREATED','PORTAL_VIEWED','PORTAL_TOKEN_REVOKED',
      'DEAL_BORROWER_LINKED',
      'DEAL_SCORED','DEAL_DRAFTED','DEAL_SENT','LOI_RECEIVED','FUNDED'
    ]
  });
});

module.exports = router;
