// services/reply-intent-scorer.js
// Niner Miner #1 - classifies inbound email replies
// HOT: explicit interest, asking questions, wants pricing
// WARM: neutral acknowledgment, will think about it
// UNSUB: unsubscribe / remove / stop
// BOUNCE: bounce / undelivered / mailer-daemon
// OOO: out of office / vacation / auto-reply
// SPAM: keywords matching common spam patterns

const PATTERNS = {
  HOT: [
    /\b(interested|interesado|interesada|please send|envien|cotiza|cotizaci[oó]n|quote|pricing|precio|price list|lista de precios|let's talk|hablemos|call me|llamame|let me know more|send more info|m[aá]s informaci[oó]n|when can|cuando podemos|set up a call|agendar|schedule)\b/i,
    /\b(yes|si|s[ií]|sounds good|me interesa|excelente|perfect|perfecto|great|right away|inmediatamente)\b/i
  ],
  WARM: [
    /\b(thanks|gracias|thank you|received|recibido|got it|noted|tomo nota|will review|revisar[eé]|let me check|d[eé]jame|talk soon|en contacto|stay in touch)\b/i
  ],
  UNSUB: [
    /\b(unsubscribe|remove me|do not email|stop|baja|dar de baja|no me env[ií]e|quitame|no contact|do not contact|not interested|no me interesa|opt out|opt-out)\b/i
  ],
  BOUNCE: [
    /\b(mail delivery failed|undeliverable|delivery status notification|mailer-daemon|postmaster|user unknown|address not found|address rejected|no such user|recipient rejected)\b/i
  ],
  OOO: [
    /\b(out of office|out of the office|fuera de la oficina|vacation|vacaciones|auto[- ]?reply|automatic reply|respuesta autom[aá]tica|will be back|estar[eé] de regreso|currently away|fuera hasta)\b/i
  ],
  SPAM: [
    /\b(viagra|crypto|bitcoin loan|nigerian prince|click here urgent|congratulations you have won|act now)\b/i
  ]
};

function scoreReply(subject, body) {
  const text = ((subject || '') + ' ' + (body || '')).slice(0, 5000);
  // BOUNCE first - most reliable
  if (PATTERNS.BOUNCE.some(function(r){return r.test(text);})) return { intent: 'BOUNCE', confidence: 0.95 };
  if (PATTERNS.OOO.some(function(r){return r.test(text);})) return { intent: 'OOO', confidence: 0.85 };
  if (PATTERNS.UNSUB.some(function(r){return r.test(text);})) return { intent: 'UNSUB', confidence: 0.90 };
  if (PATTERNS.SPAM.some(function(r){return r.test(text);})) return { intent: 'SPAM', confidence: 0.80 };
  if (PATTERNS.HOT.some(function(r){return r.test(text);})) return { intent: 'HOT', confidence: 0.75 };
  if (PATTERNS.WARM.some(function(r){return r.test(text);})) return { intent: 'WARM', confidence: 0.60 };
  return { intent: 'UNKNOWN', confidence: 0.10 };
}

function intentToHeat(intent) {
  if (intent === 'HOT') return 'hot';
  if (intent === 'WARM') return 'warm';
  if (intent === 'UNSUB' || intent === 'BOUNCE') return 'cold';
  return null; // OOO / UNKNOWN / SPAM - no change
}

module.exports = { scoreReply, intentToHeat };