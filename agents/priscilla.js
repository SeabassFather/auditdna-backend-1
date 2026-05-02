// ============================================================================
// PRISCILLA - Marketing & Sales Intelligence Agent for LOAF (Mexausa Food Group)
// ============================================================================
// Reports to: Saul Garcia <sgarcia1911@gmail.com>
// Subscribes to: brain_events with topic LIKE 'loaf.%'
// Aggregates: clicks, voice plays, form submissions, hot leads
// Reports: hourly digest by SMTP, on-demand dashboard at GET /api/priscilla/dashboard
// Save to: C:\AuditDNA\backend\agents\priscilla.js
// Wire from server.js: const priscilla = require('./agents/priscilla'); priscilla.init(app, pool, smtp);
// ============================================================================

const SAUL_EMAIL = 'sgarcia1911@gmail.com';
const AGENT_NAME = 'Priscilla';
const AGENT_VERSION = '1.0.0';
const POLL_INTERVAL_MS = 60 * 1000;        // poll every 60s
const DIGEST_INTERVAL_MS = 60 * 60 * 1000; // hourly digest
const HOT_LEAD_TOPICS = ['loaf.mini1003.submitted', 'loaf.finance.click', 'loaf.tuntan.click', 'loaf.precio.click'];

const SPONSOR_LABELS = {
  'plastpac-ecocrate'   : 'EcoCrate by Plastpac (Hector Mariscal)',
  'lions-insurance'     : 'Lions Insurance Agency (Juan F. Leon)',
  'saul-finance'        : 'Saul Garcia / Everwise Home Loans',
  'tuntan-erendira'     : 'TUN TAN Erendira Lots (Saul + Ariel)',
  'precio-del-exito'    : 'Precio del Exito (Rudy Jacinto Jr)',
  'loaf-advertising'    : 'LOAF Advertise / Partner strip',
};

let _state = {
  startedAt: new Date().toISOString(),
  lastPolledEventId: 0,
  lastDigestAt: null,
  events: [],         // ring buffer last 500
  counts: {},         // topic -> count (since startup)
  hotLeads: [],       // last 50 hot leads
  bySponsor: {},      // sponsor_slug -> { clicks, listens, hot_leads, last_seen }
  errors: 0
};

function log(msg) { console.log('[' + AGENT_NAME + '] ' + msg); }

function pushEvent(ev) {
  _state.events.push(ev);
  if (_state.events.length > 500) _state.events.shift();
  _state.counts[ev.topic] = (_state.counts[ev.topic] || 0) + 1;

  const sp = (ev.payload && (ev.payload.sponsor || ev.payload.product_slug)) || 'unknown';
  if (!_state.bySponsor[sp]) _state.bySponsor[sp] = { clicks: 0, listens: 0, hot_leads: 0, opens: 0, last_seen: null };
  const bucket = _state.bySponsor[sp];
  if (/\.click$/.test(ev.topic)) {
    const m = (ev.payload && ev.payload.method) || '';
    if (/^listen-/.test(m))      bucket.listens++;
    else if (m === 'open_detail') bucket.opens++;
    else                          bucket.clicks++;
  }
  if (HOT_LEAD_TOPICS.indexOf(ev.topic) >= 0 && (ev.payload && ev.payload.severity === 'hot_lead')) {
    bucket.hot_leads++;
    _state.hotLeads.push(ev);
    if (_state.hotLeads.length > 50) _state.hotLeads.shift();
  }
  bucket.last_seen = ev.created_at || new Date().toISOString();
}

// --------- POLL the brain_events table ---------
async function pollBrain(pool) {
  try {
    const r = await pool.query(
      "SELECT id, event_type AS topic, actor_id, payload, created_at FROM brain_events " +
      "WHERE id > $1 AND event_type LIKE 'loaf.%' " +
      "ORDER BY id ASC LIMIT 200",
      [_state.lastPolledEventId]
    );
    for (const row of r.rows) {
      pushEvent({
        id: row.id, topic: row.topic, actor_id: row.actor_id,
        payload: row.payload || {}, created_at: row.created_at
      });
      _state.lastPolledEventId = row.id;
    }
    if (r.rows.length > 0) log('polled ' + r.rows.length + ' new event(s) — watermark=' + _state.lastPolledEventId);
  } catch (err) {
    _state.errors++;
    if (_state.errors % 10 === 1) log('poll error: ' + err.message);
  }
}

// --------- BUILD the digest ---------
function buildDigest() {
  const now = new Date();
  const lines = [];
  lines.push('Priscilla LOAF Marketing Digest');
  lines.push('Generated: ' + now.toISOString());
  lines.push('Agent uptime: started ' + _state.startedAt);
  lines.push('');
  lines.push('=== EVENTS (since startup) ===');
  const topics = Object.keys(_state.counts).sort();
  if (topics.length === 0) {
    lines.push('  (no events yet)');
  } else {
    topics.forEach(t => lines.push('  ' + t.padEnd(36) + ' = ' + _state.counts[t]));
  }
  lines.push('');
  lines.push('=== BY SPONSOR ===');
  const sponsors = Object.keys(_state.bySponsor).sort();
  if (sponsors.length === 0) {
    lines.push('  (no sponsor activity yet)');
  } else {
    sponsors.forEach(s => {
      const b = _state.bySponsor[s];
      const label = SPONSOR_LABELS[s] || s;
      lines.push('  ' + label);
      lines.push('    detail opens : ' + (b.opens||0));
      lines.push('    contact clicks: ' + (b.clicks||0));
      lines.push('    voice listens: ' + (b.listens||0));
      lines.push('    HOT LEADS    : ' + (b.hot_leads||0));
      lines.push('    last seen    : ' + (b.last_seen||'never'));
      lines.push('');
    });
  }
  if (_state.hotLeads.length > 0) {
    lines.push('=== RECENT HOT LEADS (last ' + Math.min(_state.hotLeads.length, 10) + ') ===');
    _state.hotLeads.slice(-10).reverse().forEach(ev => {
      const p = ev.payload || {};
      lines.push('  [' + ev.topic + '] ' + (ev.created_at || '') +
                 ' | ' + (p.borrower || p.contact_name || 'anon') +
                 ' | ' + (p.email || '-') +
                 ' | ' + (p.phone || '-') +
                 ' | sponsor=' + (p.sponsor || '-'));
    });
  }
  lines.push('');
  lines.push('-- Priscilla v' + AGENT_VERSION + ', LOAF Marketing & Sales AI agent --');
  return lines.join('\n');
}

// --------- SEND digest via existing SMTP ---------
async function sendDigest(smtp) {
  if (!smtp || typeof smtp.sendMail !== 'function') {
    log('SMTP not provided to Priscilla; skipping digest');
    return;
  }
  const text = buildDigest();
  try {
    await smtp.sendMail({
      from: '"Priscilla LOAF Agent" <sgarcia1911@gmail.com>',
      to: SAUL_EMAIL,
      subject: '[Priscilla] LOAF marketing digest - ' + new Date().toISOString().slice(0,16),
      text: text
    });
    _state.lastDigestAt = new Date().toISOString();
    log('digest sent to ' + SAUL_EMAIL);
  } catch (err) {
    _state.errors++;
    log('digest send failed: ' + err.message);
  }
}

// --------- ROUTES ---------
function registerRoutes(app) {
  app.get('/api/priscilla/health', (req, res) => {
    res.json({
      ok: true, agent: AGENT_NAME, version: AGENT_VERSION,
      startedAt: _state.startedAt,
      lastPolledEventId: _state.lastPolledEventId,
      lastDigestAt: _state.lastDigestAt,
      events_in_buffer: _state.events.length,
      errors: _state.errors
    });
  });

  app.get('/api/priscilla/dashboard', (req, res) => {
    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      counts: _state.counts,
      bySponsor: _state.bySponsor,
      hotLeads: _state.hotLeads.slice(-20),
      recentEvents: _state.events.slice(-50)
    });
  });

  app.post('/api/priscilla/digest/now', async (req, res) => {
    if (!app.locals.smtp) return res.status(503).json({ ok: false, error: 'smtp not wired' });
    await sendDigest(app.locals.smtp);
    res.json({ ok: true, lastDigestAt: _state.lastDigestAt });
  });
}

// --------- INIT ---------
function init(app, pool, smtp) {
  if (!app || !pool) {
    console.error('[' + AGENT_NAME + '] init requires (app, pool, smtp)');
    return;
  }
  app.locals.smtp = smtp;
  registerRoutes(app);

  // initial watermark seed - start from latest existing event so we don't replay history
  pool.query("SELECT COALESCE(MAX(id),0) AS max_id FROM brain_events WHERE event_type LIKE 'loaf.%'")
    .then(r => {
      _state.lastPolledEventId = (r.rows[0] && r.rows[0].max_id) || 0;
      log('watermark seeded at event_id=' + _state.lastPolledEventId);
    })
    .catch(err => log('watermark seed failed: ' + err.message));

  // Start polling
  setInterval(() => pollBrain(pool), POLL_INTERVAL_MS);
  // Hourly digest
  setInterval(() => sendDigest(smtp), DIGEST_INTERVAL_MS);

  log('ONLINE - polling every ' + (POLL_INTERVAL_MS/1000) + 's, digest every ' + (DIGEST_INTERVAL_MS/60000) + 'min');
}

module.exports = { init, buildDigest, _state };
