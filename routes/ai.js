// C:\AuditDNA\backend\routes\ai.js
// Anthropic AI proxy — ALL Claude API calls go through here
// Auto-mounted by server.js at /api/ai
// Endpoints:
//   POST /api/ai/generate      — general email/content generation
//   POST /api/ai/generate-doc  — long-form docs (8000 tokens)
//   GET  /api/ai/health        — route health check

const express = require('express');
const router  = express.Router();

const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL     = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

// Lazy node-fetch (Node 18+ has global fetch; fall back if needed)
const doFetch = async (url, opts) => {
  if (typeof fetch === 'function') return fetch(url, opts);
  const nf = (await import('node-fetch')).default;
  return nf(url, opts);
};

async function callClaude({ prompt, system, max_tokens, model, messages }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !key.startsWith('sk-ant-')) {
    const err = new Error('ANTHROPIC_API_KEY missing or malformed in process env');
    err.status = 500;
    throw err;
  }

  const body = {
    model:      model      || DEFAULT_MODEL,
    max_tokens: max_tokens || 1500,
    system:     system || 'You are AuditDNA AI for Mexausa Food Group (US-Mexico produce corridor) and EnjoyBaja (real estate/mortgage). Professional, bilingual EN/ES when relevant. .',
    messages:   messages || [{ role: 'user', content: prompt }],
  };

  const resp = await doFetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type':     'application/json',
      'x-api-key':        key,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  const raw = await resp.text();
  if (!resp.ok) {
    const err = new Error(`Anthropic ${resp.status}: ${raw.substring(0, 400)}`);
    err.status = resp.status;
    throw err;
  }

  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error('Anthropic returned non-JSON: ' + raw.substring(0, 200)); }

  const text = (data.content || []).map(c => c.text || '').join('');
  return { text, raw: data };
}

// Parse "Subject: X\n\nBody..." pattern
function splitSubjectBody(text) {
  const m = text.match(/^\s*Subject:\s*(.+)\r?\n+/i);
  if (m) return { subject: m[1].trim(), body: text.slice(m[0].length).trim() };
  return { subject: null, body: text };
}

// ─── POST /generate ───────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { prompt, system, max_tokens, model } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, error: 'prompt required' });
    }
    const { text, raw } = await callClaude({ prompt, system, max_tokens, model });
    const { subject, body } = splitSubjectBody(text);
    res.json({ success: true, subject, body, content: body, text, raw_model: raw.model, usage: raw.usage });
  } catch (err) {
    console.error('[AI] /generate error:', err.message);
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ─── POST /generate-doc (long-form) ───────────────────────────────
router.post('/generate-doc', async (req, res) => {
  try {
    const { prompt, system, max_tokens, model } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, error: 'prompt required' });
    }
    const cap = Math.min(parseInt(max_tokens) || 8000, 8000);
    const { text, raw } = await callClaude({ prompt, system, max_tokens: cap, model });
    res.json({ success: true, content: text, text, usage: raw.usage });
  } catch (err) {
    console.error('[AI] /generate-doc error:', err.message);
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ─── GET /health ──────────────────────────────────────────────────
router.get('/health', (req, res) => {
  const k = process.env.ANTHROPIC_API_KEY || '';
  res.json({
    success:   true,
    hasKey:    !!k,
    keyPrefix: k ? k.substring(0, 12) + '...' : null,
    model:     DEFAULT_MODEL,
  });
});

module.exports = router;