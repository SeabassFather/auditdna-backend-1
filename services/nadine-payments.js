// ============================================================================
// nadine-payments.js v2 - LOAF Sponsor Payment + Apply Pipeline
// Save to: C:\AuditDNA\backend\routes\nadine-payments.js
// ============================================================================
// Routes registered on host app:
//   POST /api/nadine/sponsor/checkout     - creates Stripe Checkout Session
//   GET  /api/nadine/sponsor/status?token - returns status of a pending sponsor
//   POST /api/nadine/sponsor/retry-apply  - manually retry apply for a paid sponsor
//
// Plus webhookHandler exported for raw-body mounting in server.js (BEFORE express.json):
//   POST /api/nadine/stripe/webhook
//
// Design notes:
//   - Decoupled from Nadine internals: validates/applies via internal HTTP to
//     existing /api/nadine/sponsor + /api/nadine/sponsor/apply endpoints.
//   - Customer always receives email confirmation when payment lands, even if
//     the apply step fails (payment IS the contract).
//   - If apply fails (e.g. file path mismatch on Railway), status is marked
//     'paid_apply_failed' and Saul gets a manual-fix email with the intake JSON.
// ============================================================================

'use strict';

const crypto = require('crypto');

const PRICING = {
  STARTER:  { setup:250, monthly:149, quarterly:399, annual:1490 },
  FEATURED: { setup:400, monthly:349, quarterly:939, annual:3490 },
  PREMIUM:  { setup:500, monthly:799, quarterly:2199, annual:7990 }
};

const TIER_RIBBON = { STARTER:null, FEATURED:'FEATURED', PREMIUM:'PREMIUM' };

let _state = {
  pool: null,
  stripe: null,
  selfBaseUrl: null,
  loafHtmlPath: null,
  publicSiteUrl: null,
  alertEmail: null,
  gmailApiSend: null
};

function calcAmount(tier, billing) {
  const p = PRICING[tier];
  if (!p) return null;
  const setup = (billing === 'annual') ? 0 : p.setup;
  let period;
  if      (billing === 'annual')    period = p.annual;
  else if (billing === 'quarterly') period = p.quarterly;
  else                              period = p.monthly;
  return { setup, period, total: setup + period };
}

function periodLabel(billing, lang) {
  const es = (lang === 'es');
  if (billing === 'annual')    return es ? '12 meses (anual)' : '12 months (annual)';
  if (billing === 'quarterly') return es ? '3 meses (trimestral)' : '3 months (quarterly)';
  return es ? '1 mes' : '1 month';
}

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_sponsors (
      id              SERIAL PRIMARY KEY,
      token           VARCHAR(64) UNIQUE NOT NULL,
      stripe_session_id VARCHAR(200),
      intake_json     JSONB NOT NULL,
      tier            VARCHAR(20) NOT NULL,
      billing_period  VARCHAR(20) NOT NULL,
      amount_cents    INTEGER NOT NULL,
      status          VARCHAR(30) NOT NULL DEFAULT 'pending',
      owner_email     VARCHAR(200),
      slug            VARCHAR(100),
      lang            VARCHAR(2) DEFAULT 'en',
      last_error      TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      paid_at         TIMESTAMPTZ,
      applied_at      TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_ps_status ON pending_sponsors(status);
    CREATE INDEX IF NOT EXISTS idx_ps_session ON pending_sponsors(stripe_session_id);
  `);
}

async function callInternal(path, method, body) {
  try {
    const url = _state.selfBaseUrl + path;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    let json;
    try { json = await res.json(); } catch (e) { json = { ok: false, error: 'non-JSON response' }; }
    return { ok: res.ok && json && json.ok !== false, status: res.status, json };
  } catch (err) {
    return { ok: false, status: 0, json: { ok: false, error: err.message } };
  }
}

function registerRoutes(app) {

  app.post('/api/nadine/sponsor/checkout', async (req, res) => {
    try {
      const { intake, tier, billing, lang } = req.body || {};
      if (!intake || !tier || !billing) {
        return res.status(400).json({ ok: false, error: 'intake, tier, billing required' });
      }
      if (!PRICING[tier]) return res.status(400).json({ ok: false, error: 'Invalid tier' });
      if (!['monthly','quarterly','annual'].includes(billing)) {
        return res.status(400).json({ ok: false, error: 'Invalid billing period' });
      }

      // Apply tier-driven ribbon BEFORE validation
      if (TIER_RIBBON[tier]) intake.ribbon = TIER_RIBBON[tier];

      // Validate via internal HTTP to existing Nadine preview endpoint
      const validate = await callInternal('/api/nadine/sponsor', 'POST', intake);
      if (!validate.ok) {
        return res.status(400).json({
          ok: false,
          errors: (validate.json && validate.json.errors) || [(validate.json && validate.json.error) || 'Validation failed']
        });
      }

      if (!_state.stripe) {
        return res.status(503).json({
          ok: false,
          error: 'Payment not configured. Contact sales@mfginc.com or call +1-831-251-3116.'
        });
      }

      const amt = calcAmount(tier, billing);
      const useLang = (lang === 'es') ? 'es' : 'en';
      const ownerEmail = (intake.owner && intake.owner.email) || null;
      const token = crypto.randomBytes(16).toString('hex');
      const amount_cents = amt.total * 100;

      await _state.pool.query(
        `INSERT INTO pending_sponsors
           (token, intake_json, tier, billing_period, amount_cents, status, owner_email, slug, lang)
         VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8)`,
        [token, JSON.stringify(intake), tier, billing, amount_cents, ownerEmail, intake.slug, useLang]
      );

      const baseUrl = _state.publicSiteUrl;
      const successUrl = baseUrl + '/sponsor-intake.html?success=1&token=' + token;
      const cancelUrl  = baseUrl + '/sponsor-intake.html?canceled=1';

      const productLabel = `LOAF ${tier} - ${intake.title || intake.slug} (${periodLabel(billing, useLang)})`;
      const description  = (useLang === 'es')
        ? `Cuota inicial $${amt.setup.toFixed(2)} + Periodo $${amt.period.toFixed(2)}`
        : `Setup $${amt.setup.toFixed(2)} + Period $${amt.period.toFixed(2)}`;

      const session = await _state.stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: productLabel, description },
            unit_amount: amount_cents
          },
          quantity: 1
        }],
        customer_email: ownerEmail || undefined,
        client_reference_id: token,
        metadata: { token, slug: intake.slug || '', tier, billing, lang: useLang },
        success_url: successUrl,
        cancel_url:  cancelUrl,
        locale: useLang
      });

      await _state.pool.query(
        `UPDATE pending_sponsors SET stripe_session_id=$1 WHERE token=$2`,
        [session.id, token]
      );

      console.log(`[NADINE-PAY] checkout.session.created token=${token} tier=${tier} billing=${billing} amount=${amount_cents}`);
      res.json({ ok: true, checkout_url: session.url, token });

    } catch (err) {
      console.error('[NADINE-PAY] checkout error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/nadine/sponsor/status', async (req, res) => {
    try {
      const token = String(req.query.token || '').replace(/[^a-f0-9]/gi, '');
      if (!token) return res.status(400).json({ ok: false, error: 'token required' });
      const r = await _state.pool.query(
        `SELECT token, status, tier, billing_period, amount_cents, slug,
                created_at, paid_at, applied_at, last_error
         FROM pending_sponsors WHERE token=$1`, [token]);
      if (!r.rows.length) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, sponsor: r.rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Manually retry apply (e.g. after fixing file path or running on local PM2)
  app.post('/api/nadine/sponsor/retry-apply', async (req, res) => {
    try {
      const token = String((req.body && req.body.token) || req.query.token || '').replace(/[^a-f0-9]/gi, '');
      if (!token) return res.status(400).json({ ok: false, error: 'token required' });
      const r = await _state.pool.query(`SELECT * FROM pending_sponsors WHERE token=$1`, [token]);
      if (!r.rows.length) return res.status(404).json({ ok: false, error: 'not found' });
      const row = r.rows[0];
      if (row.status === 'applied') return res.json({ ok: true, message: 'already applied' });
      if (!['paid','paid_apply_failed'].includes(row.status)) {
        return res.status(400).json({ ok: false, error: `cannot retry from status=${row.status}` });
      }
      const intake = (typeof row.intake_json === 'string') ? JSON.parse(row.intake_json) : row.intake_json;
      const apply = await callInternal('/api/nadine/sponsor/apply', 'POST', intake);
      if (!apply.ok) {
        await _state.pool.query(
          `UPDATE pending_sponsors SET status='paid_apply_failed', last_error=$1 WHERE token=$2`,
          [JSON.stringify(apply.json), token]);
        return res.status(500).json({ ok: false, error: 'apply failed', detail: apply.json });
      }
      await _state.pool.query(
        `UPDATE pending_sponsors SET status='applied', applied_at=NOW(), last_error=NULL WHERE token=$1`, [token]);
      res.json({ ok: true, applied: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Lightweight admin list (paid_apply_failed first)
  app.get('/api/nadine/sponsor/queue', async (req, res) => {
    try {
      const r = await _state.pool.query(`
        SELECT token, status, tier, billing_period, amount_cents, slug, owner_email,
               created_at, paid_at, applied_at, last_error
        FROM pending_sponsors
        ORDER BY
          CASE status
            WHEN 'paid_apply_failed' THEN 1
            WHEN 'paid' THEN 2
            WHEN 'pending' THEN 3
            WHEN 'applied' THEN 4
            ELSE 5
          END,
          created_at DESC
        LIMIT 100`);
      res.json({ ok: true, count: r.rows.length, items: r.rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
}

async function safeEmail(opts) {
  try {
    if (!_state.gmailApiSend) return false;
    await _state.gmailApiSend(opts);
    return true;
  } catch (err) {
    console.error('[NADINE-PAY] email failed:', err.message);
    return false;
  }
}

async function webhookHandler(req, res) {
  if (!_state.stripe) return res.status(503).send('Stripe not configured');
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[NADINE-PAY] webhook secret missing');
    return res.status(500).send('Webhook secret not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = _state.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[NADINE-PAY] webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const token = (session.metadata && session.metadata.token) || session.client_reference_id;
      if (!token) {
        console.warn('[NADINE-PAY] webhook session has no token');
        return res.json({ received: true });
      }

      const r = await _state.pool.query(`SELECT * FROM pending_sponsors WHERE token=$1`, [token]);
      if (!r.rows.length) {
        console.warn(`[NADINE-PAY] webhook token not found: ${token}`);
        return res.json({ received: true });
      }
      const row = r.rows[0];
      if (row.status === 'applied') return res.json({ received: true, already_applied: true });

      const intake = (typeof row.intake_json === 'string') ? JSON.parse(row.intake_json) : row.intake_json;
      const lang = row.lang || 'en';
      const amountUSD = (row.amount_cents / 100).toFixed(2);

      // 1. Mark paid
      await _state.pool.query(
        `UPDATE pending_sponsors SET status='paid', paid_at=NOW() WHERE token=$1`, [token]
      );
      console.log(`[NADINE-PAY] sponsor paid: ${intake.slug} tier=${row.tier} amount=${amountUSD}`);

      // 2. Email sponsor confirmation (always - payment IS the contract)
      if (intake.owner && intake.owner.email) {
        const greeting = lang === 'es' ? `Hola ${intake.owner.name}` : `Hi ${intake.owner.name}`;
        const body = (lang === 'es')
          ? `${greeting},\n\nGracias por su pago. Su tarjeta de patrocinador LOAF estara activa en breve.\n\nNivel:        ${row.tier}\nFacturacion:  ${row.billing_period}\nMonto pagado: $${amountUSD}\nID:           ${token}\n\nUn representante se comunicara con usted en 24 horas para finalizar la configuracion.\n\nMexausa Food Group, Inc.\nSaul Garcia\nUS +1-831-251-3116 | MX +52-646-340-2686\nsales@mfginc.com\nhttps://loaf.mexausafg.com\n`
          : `${greeting},\n\nThank you for your payment. Your LOAF sponsor card will go live shortly.\n\nTier:        ${row.tier}\nBilling:     ${row.billing_period}\nAmount paid: $${amountUSD}\nID:          ${token}\n\nA representative will contact you within 24 hours to finalize setup.\n\nMexausa Food Group, Inc.\nSaul Garcia\nUS +1-831-251-3116 | MX +52-646-340-2686\nsales@mfginc.com\nhttps://loaf.mexausafg.com\n`;
        await safeEmail({
          to: intake.owner.email,
          subject: lang === 'es' ? 'Pago recibido - LOAF Patrocinador' : 'Payment received - LOAF Sponsor',
          text: body
        });
      }

      // 3. Try to apply card via internal HTTP to existing /api/nadine/sponsor/apply
      let applyOK = false;
      let applyErr = null;
      try {
        const apply = await callInternal('/api/nadine/sponsor/apply', 'POST', intake);
        if (apply.ok) {
          applyOK = true;
          await _state.pool.query(
            `UPDATE pending_sponsors SET status='applied', applied_at=NOW(), last_error=NULL WHERE token=$1`, [token]
          );
        } else {
          applyErr = JSON.stringify(apply.json);
        }
      } catch (err) {
        applyErr = err.message;
      }

      if (!applyOK) {
        await _state.pool.query(
          `UPDATE pending_sponsors SET status='paid_apply_failed', last_error=$1 WHERE token=$2`,
          [applyErr || 'unknown', token]
        );
      }

      // 4. Email Saul (paid summary, with apply status + intake JSON if failed)
      const saulSubject = applyOK
        ? `[LOAF] New sponsor LIVE: ${intake.title} - $${amountUSD}`
        : `[LOAF] PAID but APPLY FAILED: ${intake.title} - $${amountUSD} - manual fix needed`;

      let saulBody =
        `Sponsor:    ${intake.title}\n` +
        `Slug:       ${intake.slug}\n` +
        `Tier:       ${row.tier}\n` +
        `Billing:    ${row.billing_period}\n` +
        `Amount:     $${amountUSD}\n` +
        `Owner:      ${intake.owner.name} <${intake.owner.email}>\n` +
        `Phone US:   ${intake.owner.phone_us || '-'}\n` +
        `Phone MX:   ${intake.owner.phone_mx || '-'}\n` +
        `Token:      ${token}\n` +
        `Stripe:     ${session.id}\n` +
        `Apply:      ${applyOK ? 'SUCCESS - card live' : 'FAILED - see error below'}\n`;

      if (!applyOK) {
        saulBody += `\nApply error:\n${applyErr}\n`;
        saulBody += `\nTo retry apply on local PM2 (Windows):\n`;
        saulBody += `Invoke-RestMethod http://localhost:5050/api/nadine/sponsor/retry-apply -Method POST -ContentType application/json -Body '{"token":"${token}"}'\n`;
        saulBody += `\nFull intake JSON:\n${JSON.stringify(intake, null, 2)}\n`;
      }

      await safeEmail({
        to: _state.alertEmail,
        subject: saulSubject,
        text: saulBody
      });

      // 5. Brain emit
      try {
        if (typeof global.brainEmit === 'function') {
          global.brainEmit(applyOK ? 'sponsor.paid_and_applied' : 'sponsor.paid_apply_failed', {
            slug: intake.slug, tier: row.tier, billing: row.billing_period,
            amount_cents: row.amount_cents, owner_email: intake.owner.email,
            token, apply_error: applyErr
          });
        }
      } catch (e) { /* non-fatal */ }
    }
  } catch (err) {
    console.error('[NADINE-PAY] webhook handler error:', err.message);
  }

  res.json({ received: true });
}

function init(app, opts) {
  opts = opts || {};
  _state.pool          = opts.pool;
  _state.loafHtmlPath  = opts.loafHtmlPath || process.env.LOAF_HTML_PATH || null;
  _state.publicSiteUrl = opts.publicSiteUrl || process.env.LOAF_PUBLIC_URL || 'https://loaf.mexausafg.com';
  _state.alertEmail    = opts.alertEmail    || process.env.NADINE_ALERT_EMAIL || 'sgarcia1911@gmail.com';
  _state.gmailApiSend  = opts.gmailApiSend  || null;
  _state.selfBaseUrl   = opts.selfBaseUrl   || process.env.NADINE_SELF_URL || `http://127.0.0.1:${process.env.PORT || 5050}`;

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = require('stripe');
      _state.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      console.log('[NADINE-PAY] Stripe initialized');
    } catch (err) {
      console.error('[NADINE-PAY] Stripe init failed:', err.message);
    }
  } else {
    console.warn('[NADINE-PAY] STRIPE_SECRET_KEY missing - checkout disabled');
  }

  ensureTable(_state.pool).catch(err => console.error('[NADINE-PAY] table init error:', err.message));
  registerRoutes(app);
  console.log('[NADINE-PAY] checkout + status + retry + queue routes mounted');
}

module.exports = {
  init,
  webhookHandler,
  PRICING,
  calcAmount
};
