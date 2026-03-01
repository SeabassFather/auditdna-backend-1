// =============================================================================
// AI GENERATION ROUTE - Proxies to Anthropic API
// =============================================================================
// Handles: Email generation, letter generation, social content, SMS
// Used by: EmailMarketing.jsx, ZadarmaCRM.jsx
// Endpoint: POST /api/ai/generate
// =============================================================================

const express = require('express');
const router = express.Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

// =============================================================================
// POST /api/ai/generate
// Body: { system, prompt, max_tokens }
// Returns: { subject, body, sms, social, raw }
// =============================================================================
router.post('/generate', async (req, res) => {
  const { system, prompt, max_tokens = 1200 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('[AI Route] ANTHROPIC_API_KEY not set in .env');
    return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY to your .env file.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens,
        system: system || 'You are a professional business assistant for CM Products International.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI Route] Anthropic API error:', response.status, errText);
      return res.status(response.status).json({ error: `Anthropic API returned ${response.status}`, detail: errText });
    }

    const data = await response.json();
    const rawText = (data.content || []).map(c => c.text || '').join('');

    // Try to parse structured JSON from the response
    let parsed = null;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try regex extraction
      const subMatch = rawText.match(/"subject"\s*:\s*"([^"]+)"/);
      const bodyMatch = rawText.match(/"body"\s*:\s*"([\s\S]+?)"\s*[,}]/);
      if (subMatch || bodyMatch) {
        parsed = {
          subject: subMatch ? subMatch[1] : '',
          body: bodyMatch ? bodyMatch[1].replace(/\\n/g, '\n') : rawText,
        };
      }
    }

    res.json({
      subject: parsed?.subject || '',
      body: parsed?.body?.replace(/\\n/g, '\n') || '',
      content: parsed?.content || parsed?.body?.replace(/\\n/g, '\n') || rawText,
      sms: parsed?.sms || '',
      social: parsed?.social || '',
      raw: rawText,
      model: ANTHROPIC_MODEL,
      usage: data.usage || {},
    });

  } catch (err) {
    console.error('[AI Route] Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to reach Anthropic API', detail: err.message });
  }
});

// =============================================================================
// POST /api/ai/ai-generate  (legacy endpoint for ZadarmaCRM compatibility)
// =============================================================================
router.post('/ai-generate', async (req, res) => {
  const { prompt, cowboy, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const systemPrompt = `You are the SI Intelligence Engine for CM Products International (NMLS #337526), run by Saul Garcia. You generate professional produce sales content.
RULES:
- Respond ONLY in JSON: {"content": "..."}
- NO markdown backticks or preamble
- Be professional but direct - wholesale produce trading
- Sign as: Saul Garcia, CEO/Sales Director, CM Products International`;

  const userMsg = `Generate ${cowboy || 'email'} content for: "${prompt}"
${context?.subject ? `Subject context: ${context.subject}` : ''}
${context?.selectedChannels ? `Channels: ${context.selectedChannels.join(', ')}` : ''}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    const data = await response.json();
    const rawText = (data.content || []).map(c => c.text || '').join('');

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { content: rawText };
    }

    res.json({ content: parsed.content || rawText });
  } catch (err) {
    res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }
});

module.exports = router;