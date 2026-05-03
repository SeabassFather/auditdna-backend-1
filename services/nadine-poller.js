// ============================================================================
// nadine-poller.js - Railway -> local PM2 sponsor apply autonomy
// Save to: C:\AuditDNA\backend\services\nadine-poller.js
// ============================================================================
// Polls Railway /api/nadine/sponsor/queue for paid_apply_failed rows,
// pulls intake_json via /api/nadine/sponsor/intake, applies locally via
// /api/nadine/sponsor/apply, then marks Railway 'applied' via /mark-applied.
//
// Disabled automatically when running on Railway (avoids self-poll loop).
// Enable locally by setting NADINE_POLLER_RAILWAY_URL env var.
// ============================================================================

'use strict';

const fs = require('fs');

const _state = {
  railwayUrl: null,
  selfBaseUrl: null,
  loafHtmlPath: null,
  intervalMs: 60000,
  failureCount: new Map(),
  maxFailures: 3,
  timer: null,
  enabled: false,
  isPolling: false,
  lastTickAt: null,
  stats: { ticks: 0, seen: 0, applied: 0, alreadyApplied: 0, failures: 0, errors: 0 }
};

async function fetchJson(url, opts) {
  try {
    const res = await fetch(url, opts);
    let body = null;
    try { body = await res.json(); } catch (e) { /* non-JSON */ }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: null, error: err.message };
  }
}

async function tick() {
  if (_state.isPolling) return;
  _state.isPolling = true;
  _state.lastTickAt = Date.now();
  _state.stats.ticks++;

  try {
    // 1. Fetch queue from Railway
    const q = await fetchJson(_state.railwayUrl + '/api/nadine/sponsor/queue');
    if (!q.ok || !q.body || !q.body.items) {
      _state.stats.errors++;
      console.error('[NADINE-POLLER] queue fetch failed status=' + q.status + ' err=' + (q.error || ''));
      return;
    }

    const targets = q.body.items.filter(r =>
      r.status === 'paid_apply_failed' || (r.status === 'paid' && !r.applied_at)
    );
    if (targets.length === 0) return;

    _state.stats.seen += targets.length;
    console.log('[NADINE-POLLER] tick ' + _state.stats.ticks + ': ' + targets.length + ' item(s) need local apply');

    for (const target of targets) {
      const failCount = _state.failureCount.get(target.token) || 0;
      if (failCount >= _state.maxFailures) {
        console.warn('[NADINE-POLLER] skip ' + target.slug + ' (token=' + target.token + ') - ' + failCount + ' failures, max reached');
        continue;
      }

      try {
        // Pre-check: is this slug already in local file? (avoids duplicate slot)
        if (_state.loafHtmlPath && fs.existsSync(_state.loafHtmlPath)) {
          const html = fs.readFileSync(_state.loafHtmlPath, 'utf8');
          if (html.indexOf('data-sponsor="' + target.slug + '"') >= 0) {
            console.log('[NADINE-POLLER] ' + target.slug + ' already in local file - marking Railway applied only');
            const m = await fetchJson(_state.railwayUrl + '/api/nadine/sponsor/mark-applied', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: target.token })
            });
            if (m.ok) _state.stats.alreadyApplied++;
            else console.warn('[NADINE-POLLER] mark-applied failed for already-applied ' + target.slug + ': ' + m.status);
            continue;
          }
        }

        // Pull intake
        const intakeRes = await fetchJson(_state.railwayUrl + '/api/nadine/sponsor/intake?token=' + target.token);
        if (!intakeRes.ok || !intakeRes.body || !intakeRes.body.intake) {
          console.error('[NADINE-POLLER] intake fetch failed token=' + target.token + ' status=' + intakeRes.status);
          _state.failureCount.set(target.token, failCount + 1);
          _state.stats.failures++;
          continue;
        }
        const intake = intakeRes.body.intake;

        // Apply locally
        const applyRes = await fetchJson(_state.selfBaseUrl + '/api/nadine/sponsor/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(intake)
        });
        if (!applyRes.ok || !applyRes.body || applyRes.body.ok === false) {
          const errInfo = (applyRes.body && (applyRes.body.error || JSON.stringify(applyRes.body.errors))) || applyRes.error || 'unknown';
          console.error('[NADINE-POLLER] apply FAILED token=' + target.token + ' slug=' + target.slug + ' err=' + errInfo);
          _state.failureCount.set(target.token, failCount + 1);
          _state.stats.failures++;
          continue;
        }

        // Mark applied on Railway
        const markRes = await fetchJson(_state.railwayUrl + '/api/nadine/sponsor/mark-applied', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: target.token })
        });
        if (!markRes.ok) {
          console.warn('[NADINE-POLLER] LOCAL APPLIED but Railway mark-applied failed token=' + target.token + ' status=' + markRes.status + ' - will retry next tick (idempotency safeguard prevents duplicate)');
          continue;
        }

        _state.stats.applied++;
        _state.failureCount.delete(target.token);
        console.log('[NADINE-POLLER] APPLIED ' + target.slug + ' (token=' + target.token + ', slot_index=' + applyRes.body.slot_index + ')');
        console.log('[NADINE-POLLER] -> Commit + push frontend manually:');
        console.log('  cd C:\\AuditDNA\\frontend');
        console.log('  git add public/mfginc-loaf.html');
        console.log('  git commit -m "feat(loaf): paid sponsor ' + target.slug + ' (' + target.tier + ')"');
        console.log('  git push origin main');
      } catch (err) {
        console.error('[NADINE-POLLER] tick error for token=' + target.token + ': ' + err.message);
        _state.failureCount.set(target.token, failCount + 1);
        _state.stats.failures++;
      }
    }
  } finally {
    _state.isPolling = false;
  }
}

function start() {
  if (_state.timer) return;
  _state.timer = setInterval(() => {
    tick().catch(e => console.error('[NADINE-POLLER] uncaught: ' + e.message));
  }, _state.intervalMs);
  console.log('[NADINE-POLLER] started: polling ' + _state.railwayUrl + ' every ' + (_state.intervalMs / 1000) + 's');
  setTimeout(() => tick().catch(() => {}), 3000);
}

function stop() {
  if (_state.timer) {
    clearInterval(_state.timer);
    _state.timer = null;
    console.log('[NADINE-POLLER] stopped');
  }
}

function status() {
  return {
    enabled: _state.enabled,
    running: !!_state.timer,
    railwayUrl: _state.railwayUrl,
    selfBaseUrl: _state.selfBaseUrl,
    loafHtmlPath: _state.loafHtmlPath,
    intervalMs: _state.intervalMs,
    isPolling: _state.isPolling,
    lastTickAt: _state.lastTickAt,
    stats: _state.stats,
    failuresPerToken: Array.from(_state.failureCount.entries()).map(([t, c]) => ({ token: t, count: c }))
  };
}

function init(app, opts) {
  opts = opts || {};
  _state.railwayUrl   = opts.railwayUrl   || process.env.NADINE_POLLER_RAILWAY_URL || null;
  _state.selfBaseUrl  = opts.selfBaseUrl  || process.env.NADINE_SELF_URL || ('http://127.0.0.1:' + (process.env.PORT || 5050));
  _state.loafHtmlPath = opts.loafHtmlPath || process.env.LOAF_HTML_PATH || 'C:\\AuditDNA\\frontend\\public\\mfginc-loaf.html';
  _state.intervalMs   = opts.intervalMs   || parseInt(process.env.NADINE_POLLER_INTERVAL_MS, 10) || 60000;

  if (app) {
    app.get('/api/nadine/poller/status', (req, res) => res.json({ ok: true, status: status() }));
    app.post('/api/nadine/poller/tick',   (req, res) => { tick().catch(e => console.error('[NADINE-POLLER] manual tick error:', e.message)); res.json({ ok: true, message: 'tick triggered' }); });
    app.post('/api/nadine/poller/start',  (req, res) => { start(); res.json({ ok: true, status: status() }); });
    app.post('/api/nadine/poller/stop',   (req, res) => { stop(); res.json({ ok: true, status: status() }); });
  }

  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_NAME) {
    console.log('[NADINE-POLLER] disabled (running on Railway)');
    return;
  }
  if (!_state.railwayUrl) {
    console.log('[NADINE-POLLER] disabled (NADINE_POLLER_RAILWAY_URL not set)');
    return;
  }

  _state.enabled = true;
  start();
}

module.exports = { init, start, stop, tick, status };