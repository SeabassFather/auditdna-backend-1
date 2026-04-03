// C:\AuditDNA\backend\routes\ai.js
// Anthropic AI proxy — routes all Claude API calls from frontend through backend
// Auto-loaded by server.js via: app.use('/api/ai', require('./routes/ai'));
//
// FIX LOG:
//  1. node-fetch resolved once at module load (not per-request) — prevents Windows/CJS latency spikes
//  2. anthropic-beta web-search header is now CONDITIONAL — only sent when tools include web_search
//  3. Default max_tokens raised to 4000 for document generation (was 1200 — cut letters mid-sentence)
//  4. Added /generate-doc endpoint (8000 token ceiling) for Factoring / PO Finance / LOC / SBA apps

const express = require('express');
const router = express.Router();

// Resolve node-fetch ONCE at startup — avoids dynamic import overhead on every request
let _fetch;
(async () => { _fetch = (await import('node-fetch')).default; })();
const getFetch = () => _fetch;

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const WEB_SEARCH_BETA   = 'web-search-2025-03-05';
const DEFAULT_MODEL     = 'claude-sonnet-4-20250514';

// ─── Shared call helper ───────────────────────────────────────────────────────
async function callAnthropic({ model, max_tokens, messages, tools, system }) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set in .env');

  const payload = {
    model:      model      || DEFAULT_MODEL,
    max_tokens: max_tokens || 4000,           // FIX #3: was 1200
    messages,
  };
  if (tools  && Array.isArray(tools))  payload.tools  = tools;
  if (system)                           payload.system = system;

  // FIX #1: use pre-resolved fetch
  const fetch = getFetch();
  if (!fetch) throw new Error('node-fetch not yet initialized — retry in 1 second');

  // FIX #2: only send web-search beta header when tools actually include a web_search tool
  const hasWebSearch = Array.isArray(tools) &&
    tools.some(t => t.type === 'web_search_20250305' || t.name === 'web_search');

  const headers = {
    'Content-Type':      'application/json',
    'x-api-key':         ANTHROPIC_KEY,
    'anthropic-version': ANTHROPIC_VERSION,
  };
  if (hasWebSearch) headers['anthropic-beta'] = WEB_SEARCH_BETA;

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || 'Anthropic API error';
    console.error('[AI proxy] Anthropic error:', data);
    const err = new Error(msg);
    err.status = response.status;
    err.detail = data;
    throw err;
  }

  return data;
}

// ─── POST /api/ai/generate ────────────────────────────────────────────────────
// General-purpose AI call (Brain events, email generation, CRM tasks)
// Body: { model?, max_tokens?, messages, system?, tools? }
router.post('/generate', async (req, res) => {
  try {
    const { model, max_tokens, messages, tools, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const data = await callAnthropic({ model, max_tokens, messages, tools, system });
    res.json(data);

  } catch (err) {
    console.error('[AI proxy /generate] error:', err.message);
    res.status(err.status || 500).json({
      error:  err.message,
      detail: err.detail || null,
    });
  }
});

// ─── POST /api/ai/generate-doc ────────────────────────────────────────────────
// FIX #4: High-token endpoint for long-form document generation
// Used by: SaulIntelCRM FILES tab → Factoring / PO Finance / LOC / SBA app generators
// Body: { docType, clientData, messages?, system? }
router.post('/generate-doc', async (req, res) => {
  try {
    const { docType, clientData, messages, system } = req.body;

    // Build messages from clientData if raw messages not provided
    const finalMessages = messages || [
      {
        role: 'user',
        content: `Generate a complete, professional ${docType} application letter for the following client:\n\n${JSON.stringify(clientData, null, 2)}\n\nWrite the full letter — no placeholders, no summaries. Include all sections: executive overview, business description, financing purpose, repayment plan, and supporting details. Sign as Saul Garcia, CEO, Mexausa Food Group, Inc..`,
      },
    ];

    const finalSystem = system ||
      `You are a senior commercial finance writer for Mexausa Food Group, Inc., a PACA-licensed fresh produce wholesale import/export company based in Ensenada, Baja California. You write complete, professional ${docType} application documents in English. Be direct, specific, and compelling. Output the full letter only — no preamble, no markdown fences.`;

    const data = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 8000,   // Full application letters need room
      messages:   finalMessages,
      system:     finalSystem,
    });

    // Extract text content for easy consumption by the frontend
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    res.json({ content: text, raw: data });

  } catch (err) {
    console.error('[AI proxy /generate-doc] error:', err.message);
    res.status(err.status || 500).json({
      error:  err.message,
      detail: err.detail || null,
    });
  }
});

// ─── GET /api/ai/health ───────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    ok:       !!key,
    keySet:   !!key,
    keyHint:  key ? `...${key.slice(-6)}` : 'NOT SET',
    fetchReady: !!_fetch,
    model:    DEFAULT_MODEL,
  });
});

module.exports = router;