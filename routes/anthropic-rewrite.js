// ============================================================================
// ANTHROPIC REWRITE ROUTE - MEXAUSA FOOD GROUP, INC.
// ============================================================================
// File: C:\AuditDNA\backend\routes\anthropic-rewrite.js
// Mounted in server.js: app.use('/api/anthropic', require('./routes/anthropic-rewrite'));
// Env required: ANTHROPIC_API_KEY (already rotated AuditDNA-Railway-Apr2026)
// ============================================================================

const express = require('express');
const router = express.Router();

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const ANTHROPIC_VERSION = '2023-06-01';

router.post('/rewrite', async (req, res) => {
  const { system, original, instruction, field, language, tone, templateId } = req.body || {};

  if (!original || !instruction) {
    return res.status(400).json({ success: false, error: 'Missing original or instruction' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY not configured' });
  }

  const userMsg = `ORIGINAL ${field || 'TEXT'}:\n${original}\n\nINSTRUCTION:\n${instruction}\n\nRewrite now. Output only the rewritten ${field || 'text'}.`;

  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        system: system || `You are an email copywriter. Rewrite the provided text based on the instruction. Output only the rewritten text, no preamble.`,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[anthropic-rewrite] API error:', resp.status, errText);
      return res.status(502).json({ success: false, error: `Anthropic API ${resp.status}` });
    }

    const data = await resp.json();
    const rewritten = (data.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')
      .trim();

    if (!rewritten) {
      return res.status(502).json({ success: false, error: 'Empty response from Anthropic' });
    }

    // Log usage to brain_events for audit trail
    try {
      const { Pool } = require('pg');
      const pool = req.app.get('db') || new Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query(
        `INSERT INTO brain_events (event_type, module, payload, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          'ai_rewrite',
          'EmailMarketing',
          JSON.stringify({ templateId, field, language, tone, instruction: instruction.slice(0, 200) })
        ]
      ).catch(e => console.warn('[anthropic-rewrite] log skip:', e.message));
    } catch (logErr) {
      // Non-fatal
    }

    return res.json({
      success: true,
      rewritten,
      field,
      language,
      templateId,
      model: ANTHROPIC_MODEL
    });
  } catch (err) {
    console.error('[anthropic-rewrite] fatal:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
