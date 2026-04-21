// ============================================================
// C:\AuditDNA\auditdna-realestate\backend\routes\did-video.js
// D-ID AI Video Generator Route
// Generates talking-head videos from photo + script
// Uses D-ID API â€” key in .env as DID_API_KEY
// ============================================================
'use strict';
const express = require('express');
const router  = express.Router();
const https   = require('https');

const DID_KEY = process.env.DID_API_KEY;
const DID_AUTH = DID_KEY ? 'Basic ' + Buffer.from(DID_KEY).toString('base64') : null;

const didRequest = (method, path, body) => new Promise((resolve, reject) => {
  if (!DID_AUTH) return reject(new Error('DID_API_KEY not configured'));
  const data = body ? JSON.stringify(body) : null;
  const opts = {
    hostname: 'api.d-id.com',
    path,
    method,
    headers: {
      'Authorization': DID_AUTH,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
    },
  };
  const req = https.request(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
      catch { resolve({ status: res.statusCode, body: d }); }
    });
  });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

// GET /api/did/credits
router.get('/credits', async (req, res) => {
  try {
    const r = await didRequest('GET', '/credits');
    res.json({ remaining: r.body.remaining, total: r.body.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/did/generate â€” create talking-head video
router.post('/generate', async (req, res) => {
  const { script, photo_url, language, voice } = req.body;
  if (!script) return res.status(400).json({ error: 'script required' });
  if (!photo_url) return res.status(400).json({ error: 'photo_url required' });

  try {
    // Upload photo if base64
    let source_url = photo_url;
    if (photo_url.startsWith('data:')) {
      // Upload to D-ID images endpoint
      const imgData = photo_url.split(',')[1];
      const mimeType = photo_url.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      const uploadRes = await didRequest('POST', '/images', {
        data: imgData,
        mime_type: mimeType,
        name: `avatar_${Date.now()}.jpg`,
      });
      if (uploadRes.body.url) {
        source_url = uploadRes.body.url;
      } else {
        return res.status(400).json({ error: 'Photo upload failed', details: uploadRes.body });
      }
    }

    // Create talk video
    const payload = {
      source_url,
      script: {
        type: 'text',
        input: script.substring(0, 1500),
        provider: {
          type: 'microsoft',
          voice_id: voice || (language?.startsWith('es') ? 'es-MX-DaliaNeural' : 'en-US-JennyNeural'),
        },
      },
      config: {
        fluent: true,
        pad_audio: 0.0,
        stitch: true,
      },
    };

    const r = await didRequest('POST', '/talks', payload);
    if (r.body.id) {
      res.json({ id: r.body.id, status: r.body.status });
    } else {
      res.status(400).json({ error: 'Failed to create video', details: r.body });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/did/status/:id â€” poll video status
router.get('/status/:id', async (req, res) => {
  try {
    const r = await didRequest('GET', `/talks/${req.params.id}`);
    res.json({
      id: r.body.id,
      status: r.body.status,
      result_url: r.body.result_url || null,
      error: r.body.error || null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

