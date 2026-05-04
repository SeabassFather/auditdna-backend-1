// ============================================================================
// SPARTAN / TROJAN INTAKE ROUTES
// Patent US2025-059 - Immutable Audit Database Schema
// File: C:\AuditDNA\backend\routes\intake.routes.js
// Mount in server.js: app.use(require('./routes/intake.routes')(pool));
// ============================================================================

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { spartanRequiredDocs, trojanRequiredDocs } = require('../data/intakeRequiredDocs');

module.exports = function (pool) {
  const router = express.Router();

  // 25MB per file, 10 files max per upload, in memory then bytea
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024, files: 10 },
  });

  // ID verify: 3 files (id_front, id_back, selfie)
  const idUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }).fields([
    { name: 'id_front', maxCount: 1 },
    { name: 'id_back',  maxCount: 1 },
    { name: 'selfie',   maxCount: 1 },
  ]);

  // ----------------------------------------------------------------
  // Helper: sha256 of buffer
  // ----------------------------------------------------------------
  function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  // Compute next anchor in case-scoped hash chain
  async function nextAnchor(caseId, eventType, payload) {
    const prev = await pool.query(
      `SELECT chain_hash FROM intake_chain_log WHERE case_id = $1 ORDER BY id DESC LIMIT 1`,
      [caseId]
    );
    const prevHash = prev.rows[0]?.chain_hash || '0'.repeat(64);
    const data = JSON.stringify({ eventType, payload, ts: Date.now() });
    const chainHash = crypto.createHash('sha256').update(prevHash + data).digest('hex');
    await pool.query(
      `INSERT INTO intake_chain_log (case_id, event_type, prev_hash, chain_hash, payload_summary)
       VALUES ($1, $2, $3, $4, $5)`,
      [caseId, eventType, prevHash, chainHash, data.substring(0, 500)]
    );
    return chainHash;
  }

  function brain(eventType, payload) {
    try {
      // best-effort emit to Brain SSE (in-process if mounted, else no-op)
      if (global.brainEmit) global.brainEmit(eventType, payload);
    } catch {}
  }

  // ============================================================================
  // GET REQUIRED DOCS for a service
  // GET /api/:mode/intake/required-docs/:serviceCode
  // ============================================================================
  router.get('/api/:mode/intake/required-docs/:serviceCode', (req, res) => {
    const { mode, serviceCode } = req.params;
    const catalog = mode === 'trojan' ? trojanRequiredDocs : spartanRequiredDocs;
    // serviceCode looks like "SP-1" or "1" - extract category id
    const catId = parseInt(String(serviceCode).replace(/^[A-Z]+-/, ''), 10);
    const docs = catalog[catId];
    if (!docs) return res.status(404).json({ ok: false, error: 'Service not found' });
    res.json({ ok: true, docs });
  });

  // ============================================================================
  // START intake case
  // POST /api/:mode/intake/start
  // ============================================================================
  router.post('/api/:mode/intake/start', express.json(), async (req, res) => {
    const { mode } = req.params;
    if (!['spartan', 'trojan'].includes(mode)) return res.status(400).json({ ok: false, error: 'Invalid mode' });

    try {
      const { request_id, service_code, service_name, category, category_id } = req.body || {};
      const caseId = `${mode.toUpperCase()}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      await pool.query(
        `INSERT INTO intake_cases
          (case_id, mode, request_id, service_code, service_name, category, category_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'INTAKE_OPEN', NOW())`,
        [caseId, mode, request_id || null, service_code || null, service_name || null, category || null, category_id || null]
      );

      await nextAnchor(caseId, 'CASE_OPENED', { mode, service_code, service_name });
      brain('INTAKE_CASE_OPENED', { caseId, mode, service_name });

      res.json({ ok: true, case_id: caseId });
    } catch (e) {
      console.error('[INTAKE-START]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ============================================================================
  // UPLOAD document file
  // POST /api/:mode/intake/upload
  // multipart/form-data: file, case_id, request_id, hash, mode
  // ============================================================================
  router.post('/api/:mode/intake/upload', upload.single('file'), async (req, res) => {
    const { mode } = req.params;
    try {
      if (!req.file) return res.status(400).json({ ok: false, error: 'No file' });
      const caseId = req.body.case_id;
      if (!caseId) return res.status(400).json({ ok: false, error: 'Missing case_id' });

      const serverHash = sha256(req.file.buffer);
      const clientHash = req.body.hash;
      const hashMatch = !clientHash || clientHash.toLowerCase() === serverHash;

      const result = await pool.query(
        `INSERT INTO intake_files
          (case_id, original_name, mime_type, size_bytes, sha256, content, client_hash, hash_match, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id`,
        [caseId, req.file.originalname, req.file.mimetype, req.file.size, serverHash, req.file.buffer, clientHash || null, hashMatch]
      );

      await nextAnchor(caseId, 'FILE_UPLOADED', {
        file_id: result.rows[0].id,
        name: req.file.originalname,
        size: req.file.size,
        sha256: serverHash,
      });
      brain('INTAKE_FILE_UPLOADED', { caseId, name: req.file.originalname, size: req.file.size });

      res.json({ ok: true, file_id: result.rows[0].id, sha256: serverHash, hash_match: hashMatch });
    } catch (e) {
      console.error('[INTAKE-UPLOAD]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ============================================================================
  // ID VERIFICATION (gov ID + selfie + consumer info)
  // POST /api/:mode/intake/id-verify
  // ============================================================================
  router.post('/api/:mode/intake/id-verify', idUpload, async (req, res) => {
    const { mode } = req.params;
    try {
      const caseId = req.body.case_id;
      if (!caseId) return res.status(400).json({ ok: false, error: 'Missing case_id' });

      const idFront = req.files?.id_front?.[0];
      const idBack  = req.files?.id_back?.[0];
      const selfie  = req.files?.selfie?.[0];

      if (!idFront || !selfie) return res.status(400).json({ ok: false, error: 'id_front and selfie required' });

      await pool.query(
        `INSERT INTO intake_id_verification
          (case_id, full_name, email, phone, state, dob,
           id_front_sha256, id_front_content, id_front_size,
           id_back_sha256, id_back_content, id_back_size,
           selfie_sha256, selfie_content, selfie_size,
           verified_at, verification_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),'PENDING')
         ON CONFLICT (case_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           state = EXCLUDED.state,
           dob = EXCLUDED.dob,
           id_front_sha256 = EXCLUDED.id_front_sha256,
           id_front_content = EXCLUDED.id_front_content,
           id_front_size = EXCLUDED.id_front_size,
           id_back_sha256 = EXCLUDED.id_back_sha256,
           id_back_content = EXCLUDED.id_back_content,
           id_back_size = EXCLUDED.id_back_size,
           selfie_sha256 = EXCLUDED.selfie_sha256,
           selfie_content = EXCLUDED.selfie_content,
           selfie_size = EXCLUDED.selfie_size,
           verified_at = NOW()`,
        [
          caseId,
          req.body.full_name || null, req.body.email || null, req.body.phone || null,
          (req.body.state || '').toUpperCase().trim() || null, req.body.dob || null,
          sha256(idFront.buffer), idFront.buffer, idFront.size,
          idBack ? sha256(idBack.buffer) : null, idBack?.buffer || null, idBack?.size || null,
          sha256(selfie.buffer), selfie.buffer, selfie.size,
        ]
      );

      await nextAnchor(caseId, 'ID_VERIFIED', {
        full_name: req.body.full_name,
        state: req.body.state,
        id_front_sha256: sha256(idFront.buffer),
        selfie_sha256: sha256(selfie.buffer),
      });
      brain('INTAKE_ID_VERIFIED', { caseId, full_name: req.body.full_name });

      res.json({ ok: true });
    } catch (e) {
      console.error('[INTAKE-IDVERIFY]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ============================================================================
  // CONSENT capture
  // POST /api/:mode/intake/consent
  // ============================================================================
  router.post('/api/:mode/intake/consent', express.json(), async (req, res) => {
    const { mode } = req.params;
    try {
      const { case_id, request_id, consents, signed_name, consent_hash, user_agent } = req.body || {};
      if (!case_id) return res.status(400).json({ ok: false, error: 'Missing case_id' });
      if (!consents) return res.status(400).json({ ok: false, error: 'Missing consents' });
      if (!signed_name || signed_name.trim().length < 3) return res.status(400).json({ ok: false, error: 'Signed name required' });

      const allChecked = Object.values(consents).every(v => v === true);
      if (!allChecked) return res.status(400).json({ ok: false, error: 'All consents must be checked' });

      const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();

      await pool.query(
        `INSERT INTO intake_consent
          (case_id, cfpb_filing, fund_reassign, escrow_setup, communications, service_fee,
           signed_name, consent_hash, user_agent, ip_address, signed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (case_id) DO UPDATE SET
           cfpb_filing = EXCLUDED.cfpb_filing,
           fund_reassign = EXCLUDED.fund_reassign,
           escrow_setup = EXCLUDED.escrow_setup,
           communications = EXCLUDED.communications,
           service_fee = EXCLUDED.service_fee,
           signed_name = EXCLUDED.signed_name,
           consent_hash = EXCLUDED.consent_hash,
           signed_at = NOW()`,
        [
          case_id,
          !!consents.cfpbFiling, !!consents.fundReassign, !!consents.escrowSetup,
          !!consents.communications, !!consents.serviceFee,
          signed_name.trim(), consent_hash || null, user_agent || null, ip || null
        ]
      );

      await nextAnchor(case_id, 'CONSENT_SIGNED', { signed_name: signed_name.trim(), consent_hash });
      brain('INTAKE_CONSENT_SIGNED', { caseId: case_id, signed_name: signed_name.trim() });

      res.json({ ok: true });
    } catch (e) {
      console.error('[INTAKE-CONSENT]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ============================================================================
  // SUBMIT case (final)
  // POST /api/:mode/intake/submit
  // ============================================================================
  router.post('/api/:mode/intake/submit', express.json(), async (req, res) => {
    const { mode } = req.params;
    try {
      const {
        case_id, request_id, service_code, service_name, category,
        path, counsel_opt_in, state_limit, estimated_recovery,
        consumer_info, file_count, consent_signed_at,
      } = req.body || {};

      if (!case_id) return res.status(400).json({ ok: false, error: 'Missing case_id' });

      // verify all required pieces present
      const filesQ = await pool.query(`SELECT COUNT(*)::int AS n FROM intake_files WHERE case_id = $1`, [case_id]);
      const idQ = await pool.query(`SELECT 1 FROM intake_id_verification WHERE case_id = $1 LIMIT 1`, [case_id]);
      const consentQ = await pool.query(`SELECT 1 FROM intake_consent WHERE case_id = $1 LIMIT 1`, [case_id]);

      if (filesQ.rows[0].n < 1) return res.status(400).json({ ok: false, error: 'No files uploaded' });
      if (idQ.rowCount === 0) return res.status(400).json({ ok: false, error: 'ID verification missing' });
      if (consentQ.rowCount === 0) return res.status(400).json({ ok: false, error: 'Consent missing' });

      await pool.query(
        `UPDATE intake_cases SET
          status = 'SUBMITTED',
          path = $2,
          counsel_opt_in = $3,
          state_legal_limit = $4,
          estimated_recovery = $5,
          submitted_at = NOW(),
          consumer_state = $6,
          consumer_email = $7
         WHERE case_id = $1`,
        [
          case_id, path || 'escrow', counsel_opt_in,
          state_limit || null, estimated_recovery || 0,
          (consumer_info?.state || '').toUpperCase().trim() || null,
          consumer_info?.email || null,
        ]
      );

      const finalHash = await nextAnchor(case_id, 'CASE_SUBMITTED', {
        path, counsel_opt_in, estimated_recovery, file_count, mode,
      });
      brain('INTAKE_CASE_SUBMITTED', { caseId: case_id, mode, path, counsel_opt_in });

      // best-effort ntfy push
      try {
        const fetch = require('node-fetch');
        await fetch('https://ntfy.sh/mexausa-saul', {
          method: 'POST',
          body: `[${mode.toUpperCase()}] Case ${case_id} submitted | ${file_count} files | path=${path || 'escrow'} | rec=$${(estimated_recovery || 0).toLocaleString()}`,
          headers: {
            'Title': `${mode === 'trojan' ? 'TROJAN' : 'SPARTAN'} Intake Submitted`,
            'Priority': 'high',
            'Tags': mode === 'trojan' ? 'lock,trojan' : 'shield,spartan',
          },
        });
      } catch {}

      res.json({
        ok: true,
        case_id,
        chain_anchor: finalHash,
        message: 'Case submitted. AI/SI analysis will begin shortly. Status updates via email and SMS.',
      });
    } catch (e) {
      console.error('[INTAKE-SUBMIT]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ============================================================================
  // GET case status
  // GET /api/:mode/intake/case/:caseId
  // ============================================================================
  router.get('/api/:mode/intake/case/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const c = await pool.query(`SELECT * FROM intake_cases WHERE case_id = $1`, [caseId]);
      if (c.rowCount === 0) return res.status(404).json({ ok: false, error: 'Case not found' });

      const f = await pool.query(
        `SELECT id, original_name, mime_type, size_bytes, sha256, hash_match, uploaded_at
           FROM intake_files WHERE case_id = $1 ORDER BY id`, [caseId]);
      const chain = await pool.query(
        `SELECT event_type, chain_hash, created_at
           FROM intake_chain_log WHERE case_id = $1 ORDER BY id`, [caseId]);

      res.json({
        ok: true,
        case: c.rows[0],
        files: f.rows,
        chain: chain.rows,
        file_count: f.rows.length,
        chain_length: chain.rows.length,
      });
    } catch (e) {
      console.error('[INTAKE-CASE]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ============================================================================
  // GET file content (auth required in real prod)
  // GET /api/:mode/intake/file/:fileId
  // ============================================================================
  router.get('/api/:mode/intake/file/:fileId', async (req, res) => {
    try {
      const r = await pool.query(`SELECT mime_type, original_name, content FROM intake_files WHERE id = $1`, [req.params.fileId]);
      if (r.rowCount === 0) return res.status(404).send('Not found');
      const f = r.rows[0];
      res.setHeader('Content-Type', f.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${f.original_name}"`);
      res.send(f.content);
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  return router;
};
