// C:\AuditDNA\backend\routes\ai.js
// Anthropic AI proxy — routes all Claude API calls from frontend through backend
// Auto-loaded by server.js

const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
// API key read inside handler to ensure dotenv is loaded first

// POST /api/ai/generate
// Body: { model, max_tokens, messages, tools? }
router.post('/generate', async (req, res) => {
  try {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
    }

    const { model, max_tokens, messages, tools, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const payload = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 1200,
      messages,
    };
    if (tools && Array.isArray(tools)) payload.tools = tools;
    if (system) payload.system = system;

    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[AI proxy] Anthropic error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error', detail: data });
    }

    res.json(data);
  } catch (err) {
    console.error('[AI proxy] fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;