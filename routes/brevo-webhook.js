// routes/brevo-webhook.js
// Receives Brevo webhook events: delivered, opened, clicked, bounced, unsubscribed, etc.
// Brevo POSTs to /api/brevo/webhook on every email event
// Docs: https://developers.brevo.com/docs/transactional-webhooks

const express = require('express');
const router = express.Router();
const brain = require('../services/brain-emitter');
let pool;
function setPool(p) { pool = p; brain.setPool(p); }

// Brevo event names normalized
const NORMALIZE = {
  'delivered': 'delivered',
  'request': 'unknown',
  'opened': 'opened',
  'click': 'clicked',
  'soft_bounce': 'soft_bounce',
  'hard_bounce': 'hard_bounce',
  'invalid_email': 'invalid',
  'deferred': 'deferred',
  'spam': 'spam',
  'blocked': 'blocked',
  'unsubscribed': 'unsubscribed',
  'complaint': 'complained'
};

router.post('/webhook', async (req, res) => {
  try {
    const body = req.body || {};
    const rawEvent = (body.event || '').toLowerCase();
    const evt = NORMALIZE[rawEvent] || 'unknown';
    const messageId = body['message-id'] || body.message_id || null;
    const email = body.email || null;

    await pool.query(
      'INSERT INTO email_events (brevo_message_id, recipient_email, event_type, event_data) VALUES ($1, $2, $3, $4)',
      [messageId, email, evt, JSON.stringify(body)]
    );

    // Critical events: emit to Brain so Niner Miners can react
    const critical = ['opened','clicked','hard_bounce','unsubscribed','spam','complained'];
    if (critical.includes(evt)) {
      brain.emit('EMAIL_' + evt.toUpperCase(), {
        message_id: messageId,
        recipient: email,
        timestamp: new Date().toISOString()
      }, { agent_id: 'BREVO_WEBHOOK', severity: evt === 'hard_bounce' || evt === 'spam' ? 2 : 1 });
    }

    // Auto-update opt_out for unsubscribes + hard bounces + spam
    if (email && (evt === 'unsubscribed' || evt === 'hard_bounce' || evt === 'spam' || evt === 'complained')) {
      await pool.query(
        'UPDATE crm_contacts SET opt_out = TRUE, opt_out_reason = $1, opt_out_at = NOW() WHERE email = $2',
        [evt, email]
      ).catch(function(e){ console.error('[brevo-webhook] opt_out update fail:', e.message); });
    }

    res.json({ ok: true, event: evt, recorded: true });
  } catch (e) {
    console.error('[brevo-webhook] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Reply intake endpoint (for Gmail reply parser to POST scraped replies)
router.post('/inbound-reply', async (req, res) => {
  try {
    const { sender, recipient, subject, body_text, body_html, message_id, in_reply_to } = req.body || {};
    if (!sender) return res.status(400).json({ ok: false, error: 'sender required' });
    const scorer = require('../services/reply-intent-scorer');
    const score = scorer.scoreReply(subject, body_text || body_html);
    const ins = await pool.query(
      'INSERT INTO inbound_replies (sender_email, recipient_email, subject, body_text, body_html, message_id, in_reply_to, intent, intent_confidence) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [sender, recipient, subject, body_text, body_html, message_id, in_reply_to, score.intent, score.confidence]
    );
    const replyId = ins.rows[0].id;
    brain.emit('BLAST_REPLY_RECEIVED', {
      reply_id: replyId,
      sender: sender,
      intent: score.intent,
      confidence: score.confidence,
      subject: subject
    }, { agent_id: 'REPLY_SCORER', severity: score.intent === 'HOT' ? 3 : 1 });
    const newHeat = scorer.intentToHeat(score.intent);
    if (newHeat) {
      await pool.query(
        "UPDATE crm_contacts SET heat_tag = $1, opt_out = CASE WHEN $1 = 'cold' AND $2 IN ('UNSUB','BOUNCE') THEN TRUE ELSE COALESCE(opt_out, FALSE) END WHERE email = $3",
        [newHeat, score.intent, sender]
      ).catch(function(e){ console.error('[inbound-reply] heat tag update fail:', e.message); });
    }
    res.json({ ok: true, reply_id: replyId, intent: score.intent, confidence: score.confidence, new_heat: newHeat });
  } catch (e) {
    console.error('[inbound-reply] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/brevo/recent-replies - dashboard view
router.get('/recent-replies', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const r = await pool.query('SELECT id, sender_email, subject, intent, intent_confidence, received_at FROM inbound_replies ORDER BY received_at DESC LIMIT $1', [limit]);
    res.json({ ok: true, replies: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/brevo/event-stats - last 24h email event breakdown
router.get('/event-stats', async (req, res) => {
  try {
    const r = await pool.query("SELECT event_type, COUNT(*) AS c FROM email_events WHERE occurred_at > NOW() - INTERVAL '24 hours' GROUP BY event_type ORDER BY c DESC");
    res.json({ ok: true, stats: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
module.exports.setPool = setPool;