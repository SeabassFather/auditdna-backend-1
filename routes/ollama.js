'use strict';

const express = require('express');
const router  = express.Router();
const ollama  = require('../ai-core/providers/ollamaProvider');
const engine  = require('../ai-core/orchestrator/executionEngine');

router.get('/status', async (req, res) => {
  try {
    const health = await ollama.healthCheck();
    res.json({ success: true, ollama: health, model: ollama.OLLAMA_MODEL, url: ollama.OLLAMA_BASE_URL });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/models', async (req, res) => {
  try {
    const models = await ollama.listModels();
    res.json({ success: true, models, count: models.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/chat', async (req, res) => {
  try {
    const { prompt, system, model, temperature, max_tokens, format } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' });
    const text = await ollama.chat(prompt, { system, model, temperature, max_tokens, format });
    res.json({ success: true, response: text, model: model || ollama.OLLAMA_MODEL });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/stream', async (req, res) => {
  try {
    const { prompt, system, model } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' });
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    for await (const chunk of ollama.stream(prompt, { system, model })) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

router.post('/agent', async (req, res) => {
  try {
    const { agentId, taskType, ...rest } = req.body;
    if (!agentId) return res.status(400).json({ success: false, error: 'agentId required' });
    const result = await engine.runLocal(agentId, { taskType: taskType || agentId, ...rest });
    res.json(result);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/embed', async (req, res) => {
  try {
    const { text, model } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'text required' });
    const embedding = await ollama.embed(text, model);
    res.json({ success: true, embedding, dimensions: embedding?.length || 0, model: model || 'nomic-embed-text' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/engine-status', async (req, res) => {
  try {
    const status = await engine.getStatus();
    res.json({ success: true, ...status });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
