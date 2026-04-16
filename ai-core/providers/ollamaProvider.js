// ══════════════════════════════════════════════════════════════════════════
//  OLLAMA LOCAL AI PROVIDER
//  File: C:\AuditDNA\backend\ai-core\providers\ollamaProvider.js
//
//  Wraps the local Ollama REST API (runs on http://localhost:11434)
//  Zero cost. Zero latency. Fully offline capable.
//
//  Recommended models (run once in terminal to pull):
//    ollama pull llama3.2        <-- fast, general, 2GB
//    ollama pull mistral         <-- strong reasoning, 4GB
//    ollama pull codellama       <-- code repair, 4GB
//    ollama pull nomic-embed-text <-- embeddings for memory
// ══════════════════════════════════════════════════════════════════════════

'use strict';

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_TIMEOUT  = parseInt(process.env.OLLAMA_TIMEOUT || '30000');

// ── Check if Ollama is running ────────────────────────────────────────────
async function isOllamaOnline() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── List available local models ───────────────────────────────────────────
async function listModels() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const data = await res.json();
    return (data.models || []).map(m => m.name);
  } catch {
    return [];
  }
}

// ── Core: run a prompt against Ollama ────────────────────────────────────
async function chat(prompt, options = {}) {
  const model   = options.model   || OLLAMA_MODEL;
  const system  = options.system  || 'You are AuditDNA AI. Respond in valid JSON only. No prose, no markdown.';
  const format  = options.format  || null;  // don't force format - breaks llama3.2
  const timeout = options.timeout || OLLAMA_TIMEOUT;

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: prompt },
    ],
    stream: false,
    ...(format ? { format } : {}),
    options: {
      temperature:  options.temperature  || 0.1,
      num_predict:  options.max_tokens   || 1024,
      top_p:        options.top_p        || 0.9,
    },
  };

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.message?.content || '';
}

// ── runAgent: matches claudeProvider interface exactly ───────────────────
async function runAgent(agentId, payload) {
  const prompt = buildPrompt(agentId, payload);

  let raw = '';
  let parsed = null;
  let confidence = 0.80;

  try {
    raw = await chat(prompt, {
      system: `You are the ${agentId} AI agent inside AuditDNA. 
You are an expert in produce trading, agricultural compliance, real estate, and mortgage auditing.
Always respond with valid JSON only. No preamble. No markdown fences.`,
    });

    // Parse JSON response
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
    confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.80;

  } catch (parseErr) {
    // Try to extract JSON from anywhere in the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.78;
      } catch {
        parsed = { analysis: raw || 'No response from model', action: 'review', confidence: 0.78 };
        confidence = 0.78;
      }
    } else {
      parsed = { analysis: raw || 'No response from model', action: 'review', confidence: 0.78 };
      confidence = 0.78;
    }
  }

  return {
    agentId,
    provider: 'ollama',
    model:    OLLAMA_MODEL,
    output:   parsed,
    rawText:  raw,
    confidence,
  };
}

// ── Streaming version (for real-time chat UI) ────────────────────────────
async function* stream(prompt, options = {}) {
  const model  = options.model  || OLLAMA_MODEL;
  const system = options.system || 'You are AuditDNA AI.';

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: prompt },
    ],
    stream: true,
  };

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`Ollama stream error ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        if (chunk.message?.content) yield chunk.message.content;
        if (chunk.done) return;
      } catch {
        // skip malformed chunk
      }
    }
  }
}

// ── Generate embeddings (for vector memory) ──────────────────────────────
async function embed(text, model = 'nomic-embed-text') {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model, input: text }),
  });

  if (!res.ok) throw new Error(`Ollama embed error ${res.status}`);
  const data = await res.json();
  return data.embeddings?.[0] || data.embedding || null;
}

// ── Prompt builder ────────────────────────────────────────────────────────
function buildPrompt(agentId, payload) {
  return `You are the ${agentId} agent. Analyze this task and respond ONLY with a JSON object.

Task:
${JSON.stringify(payload, null, 2)}

Respond with ONLY this JSON (no explanation, no markdown):
{"analysis": "brief analysis", "action": "recommended action", "confidence": 0.85}`;
}

// ── Health check for server startup ──────────────────────────────────────
async function healthCheck() {
  const online = await isOllamaOnline();
  if (!online) {
    console.warn('[OLLAMA] Offline — local AI unavailable. Cloud AI (Claude) will be used as fallback.');
    return { online: false };
  }

  const models = await listModels();
  const hasModel = models.some(m => m.startsWith(OLLAMA_MODEL.split(':')[0]));

  if (!hasModel) {
    console.warn(`[OLLAMA] Online but model "${OLLAMA_MODEL}" not found.`);
    console.warn(`[OLLAMA] Run: ollama pull ${OLLAMA_MODEL}`);
    console.warn(`[OLLAMA] Available models: ${models.join(', ') || 'none'}`);
  } else {
    console.log(`[OK] OLLAMA: Online | Model: ${OLLAMA_MODEL} | URL: ${OLLAMA_BASE_URL}`);
  }

  return { online: true, models, hasModel };
}

module.exports = {
  runAgent,
  chat,
  stream,
  embed,
  isOllamaOnline,
  listModels,
  healthCheck,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
};
