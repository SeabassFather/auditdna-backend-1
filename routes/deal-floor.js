// ============================================================================
// C:\AuditDNA\backend\routes\deal-floor.js
// Mexausa Food Group, Inc. — UnifiedCRM Deal Floor
// Phase 1 backend: 18 endpoints powering the anonymous deal floor.
// Wires: deal_rooms, deal_messages, dd_documents, purchase_orders,
//        factoring_offers, compliance_items, commodity_channels, channel_posts.
// ============================================================================
'use strict';

const express = require('express');
const crypto  = require('crypto');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const router  = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// DB pool — reuses global pool set by server.js (global.db)
// ──────────────────────────────────────────────────────────────────────────────
const getPool = () => global.db || require('../db').getPool();

// ──────────────────────────────────────────────────────────────────────────────
// File upload config — DD vault lives on local disk
// ──────────────────────────────────────────────────────────────────────────────
const DD_VAULT_ROOT = process.env.DD_VAULT_ROOT || 'C:\\AuditDNA\\backend\\_ddvault';
if (!fs.existsSync(DD_VAULT_ROOT)) fs.mkdirSync(DD_VAULT_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dealDir = path.join(DD_VAULT_ROOT, req.params.dealId || '_unknown');
    if (!fs.existsSync(dealDir)) fs.mkdirSync(dealDir, { recursive: true });
    cb(null, dealDir);
  },
  filename: (req, file, cb) => {
    const stamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${stamp}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

// SHA-256 of a file path
function fileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// SHA-256 of a message (for hash-chain)
function msgHash(prevHash, anonId, body, ts) {
  return crypto.createHash('sha256')
    .update((prevHash || '') + anonId + (body || '') + ts)
    .digest('hex');
}

// Generate deal ID: MFG-<COMMODITY_CODE>-<MMDD>-<RANDOM>
function generateDealId(commodity) {
  const code = (commodity || 'XX').toUpperCase().slice(0, 3);
  const d = new Date();
  const mmdd = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `MFG-${code}-${mmdd}-${rand}`;
}

// Generate anonymous ID: <ROLE>-<COUNTRY>-<STATE>-<NUM>
async function generateAnonId(pool, role, contactId, country, state) {
  const existing = await pool.query(
    `SELECT anon_id FROM anon_id_registry WHERE real_contact_id=$1 AND role=$2 LIMIT 1`,
    [contactId, role]
  );
  if (existing.rows.length) return existing.rows[0].anon_id;

  const c = (country || 'XX').toUpperCase().slice(0, 2);
  const s = (state || 'XX').toUpperCase().slice(0, 3);
  const num = Math.floor(1000 + Math.random() * 9000);
  const anonId = `${role}-${c}-${s}-${num}`;

  await pool.query(
    `INSERT INTO anon_id_registry(anon_id, real_contact_id, role, country, state)
     VALUES($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [anonId, contactId, role, c, s]
  );
  return anonId;
}

// Fire a Brain event so autonomy.js can react
async function brainFire(pool, event, payload) {
  try {
    await pool.query(
      `INSERT INTO brain_events(event_type, payload, source, created_at)
       VALUES($1, $2, 'DEAL_FLOOR', NOW())`,
      [event, JSON.stringify(payload)]
    );
  } catch (_) { /* table may not exist in dev */ }
}

// Stage machine — legal transitions
const STAGE_FLOW = {
  PROPOSAL:    ['LOI', 'CANCELLED'],
  LOI:         ['NDA', 'CANCELLED'],
  NDA:         ['DD', 'CANCELLED'],
  DD:          ['TERMS', 'CANCELLED'],
  TERMS:       ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:    ['PO', 'CANCELLED'],
  PO:          ['FACTORED', 'CANCELLED'],
  FACTORED:    ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT:  ['DELIVERED', 'DISPUTED'],
  DELIVERED:   ['PAID_SELLER', 'DISPUTED'],
  PAID_SELLER: ['COMPLETED', 'DISPUTED'],
  COMPLETED:   [],
  CANCELLED:   [],
  DISPUTED:    ['COMPLETED', 'CANCELLED']
};

// Auto-seed compliance checklist based on commodity + countries
async function seedComplianceItems(pool, dealId, commodity, originCountry, destCountry) {
  const items = [];

  // Mexico to USA produce
  if (originCountry === 'MX' && destCountry === 'US') {
    items.push(
      { code: 'SENASICA_EXPORT', label: 'SENASICA Phytosanitary Export Certificate', required_stage: 'PO' },
      { code: 'USDA_IMPORT',     label: 'USDA APHIS Import Permit',                  required_stage: 'PO' },
      { code: 'FDA_PRIOR',       label: 'FDA Prior Notice of Imported Food',         required_stage: 'IN_TRANSIT' },
      { code: 'CBP_ENTRY',       label: 'CBP Entry Summary (7501)',                  required_stage: 'IN_TRANSIT' },
      { code: 'FSMA_TRACE',      label: 'FSMA 204 Traceability Records',             required_stage: 'PO' },
      { code: 'COO',             label: 'Certificate of Origin',                     required_stage: 'PO' }
    );
  }

  // Organic-labeled
  if ((commodity || '').toLowerCase().includes('organic')) {
    items.push({ code: 'USDA_ORGANIC_CHAIN', label: 'USDA Organic Chain of Custody', required_stage: 'PO' });
  }

  // Universal items
  items.push(
    { code: 'PACKING_LIST',   label: 'Packing List',                  required_stage: 'IN_TRANSIT' },
    { code: 'BILL_OF_LADING', label: 'Bill of Lading',                required_stage: 'IN_TRANSIT' },
    { code: 'COMM_INVOICE',   label: 'Commercial Invoice',            required_stage: 'IN_TRANSIT' },
    { code: 'TEMP_LOG',       label: 'Cold Chain Temperature Log',    required_stage: 'DELIVERED' },
    { code: 'POD',            label: 'Proof of Delivery',             required_stage: 'DELIVERED' }
  );

  for (const it of items) {
    await pool.query(
      `INSERT INTO compliance_items(deal_id, item_code, item_label, required_stage)
       VALUES($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [dealId, it.code, it.label, it.required_stage]
    );
  }
  return items.length;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── HEALTH ────────────────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.query(`SELECT COUNT(*)::int AS deals FROM deal_rooms`);
    res.json({ ok: true, deals: r.rows[0].deals });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── STATUS ────────────────────────────────────────────────────────────────────
// NOTE: MUST be defined before /:id route, otherwise Express treats "status"
// as a deal_id parameter and returns not_found.
router.get('/status', async (req, res) => {
  try {
    const pool = getPool();
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM deal_rooms WHERE stage NOT IN ('COMPLETED','CANCELLED')) AS active_deals,
        (SELECT COUNT(*)::int FROM deal_rooms WHERE stage = 'COMPLETED') AS completed_deals,
        (SELECT COUNT(*)::int FROM dd_documents WHERE status IN ('UPLOADED','UNDER_REVIEW')) AS dd_queue,
        (SELECT COUNT(*)::int FROM compliance_items WHERE status = 'PENDING') AS compliance_pending,
        (SELECT COUNT(*)::int FROM commodity_channels WHERE active = TRUE) AS channels,
        (SELECT COUNT(*)::int FROM channel_posts WHERE archived = FALSE AND created_at > NOW() - INTERVAL '24 hours') AS posts_24h
    `);
    res.json({
      service: 'Deal Floor API v1.0',
      routes: 18,
      vault_root: DD_VAULT_ROOT,
      stats: stats.rows[0]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CHANNELS — PUBLIC ANONYMOUS WATCH ROOMS ──────────────────────────────────

// GET /api/deals/channels — list all commodity channels
router.get('/channels', async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.query(`
      SELECT channel_id, commodity, variety, pack_size, subscribers, post_count, active
      FROM commodity_channels
      WHERE active = TRUE
      ORDER BY post_count DESC, commodity ASC
    `);
    res.json({ channels: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/deals/channels — create a new commodity channel (admin only)
router.post('/channels', async (req, res) => {
  try {
    const pool = getPool();
    const { commodity, variety, pack_size } = req.body;
    if (!commodity) return res.status(400).json({ error: 'commodity required' });
    const code = `CH-${commodity.toUpperCase().replace(/[^A-Z]/g, '').slice(0,3)}-${(variety || 'ALL').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}-${(pack_size || 'ANY').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}`;
    await pool.query(
      `INSERT INTO commodity_channels(channel_id, commodity, variety, pack_size)
       VALUES($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [code, commodity, variety, pack_size]
    );
    res.json({ ok: true, channel_id: code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/deals/channels/:id/posts — recent posts
router.get('/channels/:id/posts', async (req, res) => {
  try {
    const pool = getPool();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const r = await pool.query(`
      SELECT id, poster_anon_id, poster_role, post_type, body, qty, price,
             origin_country, origin_state, valid_until, created_at
      FROM channel_posts
      WHERE channel_id = $1 AND archived = FALSE
      ORDER BY created_at DESC LIMIT $2
    `, [req.params.id, limit]);
    res.json({ posts: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/deals/channels/:id/post — post offer/ask
router.post('/channels/:id/post', async (req, res) => {
  try {
    const pool = getPool();
    const { poster_contact_id, role, post_type, body, qty, price, origin_country, origin_state, valid_until } = req.body;
    if (!poster_contact_id || !role || !post_type) {
      return res.status(400).json({ error: 'poster_contact_id, role, post_type required' });
    }
    const anonId = await generateAnonId(pool, role, poster_contact_id, origin_country, origin_state);
    const r = await pool.query(`
      INSERT INTO channel_posts(channel_id, poster_contact_id, poster_anon_id, poster_role,
                                post_type, body, qty, price, origin_country, origin_state, valid_until)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, poster_anon_id, created_at
    `, [req.params.id, poster_contact_id, anonId, role, post_type, body, qty, price, origin_country, origin_state, valid_until || null]);
    await pool.query(`UPDATE commodity_channels SET post_count = post_count + 1 WHERE channel_id = $1`, [req.params.id]);
    await brainFire(pool, 'CHANNEL_POST_CREATED', { channel_id: req.params.id, post_id: r.rows[0].id, role, post_type });
    res.json({ ok: true, post: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DEAL ROOMS ────────────────────────────────────────────────────────────────

// POST /api/deals/create — open a new deal room
router.post('/create', async (req, res) => {
  try {
    const pool = getPool();
    const {
      commodity, variety, pack_size, seller_id, buyer_id,
      qty, unit, seller_price, buyer_price,
      origin_country, origin_state, destination_country, destination_state,
      payment_terms, delivery_terms, expected_delivery_date,
      source_channel_id, created_by
    } = req.body;

    if (!commodity || !seller_id || !buyer_id) {
      return res.status(400).json({ error: 'commodity, seller_id, buyer_id required' });
    }

    const dealId = generateDealId(commodity);
    const sellerAnon = await generateAnonId(pool, 'SELLER', seller_id, origin_country, origin_state);
    const buyerAnon  = await generateAnonId(pool, 'BUYER',  buyer_id,  destination_country, destination_state);

    await pool.query(`
      INSERT INTO deal_rooms(
        deal_id, commodity, variety, pack_size,
        seller_id, buyer_id, seller_anon_id, buyer_anon_id,
        qty, unit, seller_price, buyer_price,
        origin_country, origin_state, destination_country, destination_state,
        payment_terms, delivery_terms, expected_delivery_date,
        source_channel_id, created_by
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    `, [
      dealId, commodity, variety, pack_size,
      seller_id, buyer_id, sellerAnon, buyerAnon,
      qty, unit, seller_price, buyer_price,
      origin_country, origin_state, destination_country, destination_state,
      payment_terms, delivery_terms, expected_delivery_date,
      source_channel_id, created_by
    ]);

    const complianceCount = await seedComplianceItems(pool, dealId, commodity, origin_country, destination_country);
    await brainFire(pool, 'DEAL_CREATED', { deal_id: dealId, commodity, seller_id, buyer_id });

    res.json({
      ok: true,
      deal_id: dealId,
      seller_anon_id: sellerAnon,
      buyer_anon_id: buyerAnon,
      stage: 'PROPOSAL',
      compliance_items_seeded: complianceCount
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/deals/active — list active deals (for dashboard)
router.get('/active', async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.query(`SELECT * FROM v_active_deals LIMIT 100`);
    res.json({ deals: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/deals/:id — deal detail
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.query(`SELECT * FROM deal_rooms WHERE deal_id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not_found' });
    const deal = r.rows[0];

    // Strip real IDs unless caller is MFG (TODO: real RBAC check — for now trust caller)
    const msgs = await pool.query(
      `SELECT id, sender_anon_id, sender_role, body, hash, created_at
       FROM deal_messages WHERE deal_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    const docs = await pool.query(
      `SELECT id, party_role, doc_type_code, filename, status, uploaded_at, verified_at
       FROM dd_documents WHERE deal_id = $1 ORDER BY uploaded_at ASC`,
      [req.params.id]
    );
    const compliance = await pool.query(
      `SELECT item_code, item_label, required_stage, status, resolved_at
       FROM compliance_items WHERE deal_id = $1`,
      [req.params.id]
    );
    const factoring = await pool.query(
      `SELECT id, partner_id, partner_priority, offer_amount, advance_pct, fee_pct, term_days,
              effective_apr, status, buyer_visible, created_at
       FROM factoring_offers WHERE deal_id = $1 ORDER BY partner_priority ASC`,
      [req.params.id]
    );
    const pos = await pool.query(
      `SELECT po_id, po_type, qty, unit, unit_price, total, status, pdf_path, issued_at
       FROM purchase_orders WHERE deal_id = $1`,
      [req.params.id]
    );

    res.json({
      deal,
      messages: msgs.rows,
      documents: docs.rows,
      compliance: compliance.rows,
      factoring_offers: factoring.rows,
      purchase_orders: pos.rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/deals/:id/advance — move to next stage
router.post('/:id/advance', async (req, res) => {
  try {
    const pool = getPool();
    const { to_stage, staff_id, reason } = req.body;
    if (!to_stage) return res.status(400).json({ error: 'to_stage required' });

    const cur = await pool.query(`SELECT stage FROM deal_rooms WHERE deal_id = $1`, [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'deal_not_found' });
    const fromStage = cur.rows[0].stage;

    const allowed = STAGE_FLOW[fromStage] || [];
    if (!allowed.includes(to_stage)) {
      return res.status(400).json({ error: `illegal_transition: ${fromStage} -> ${to_stage}`, allowed });
    }

    // Pre-flight: if advancing past DD, require all required DD docs VERIFIED
    if (fromStage === 'DD' && to_stage === 'TERMS') {
      const pending = await pool.query(`
        SELECT COUNT(*)::int AS n FROM dd_documents
        WHERE deal_id = $1 AND status != 'VERIFIED'
      `, [req.params.id]);
      if (pending.rows[0].n > 0) {
        return res.status(400).json({ error: 'dd_incomplete', pending_docs: pending.rows[0].n });
      }
    }

    // Pre-flight: if advancing to PO, require all PO-stage compliance VERIFIED
    if (to_stage === 'PO') {
      const pending = await pool.query(`
        SELECT COUNT(*)::int AS n FROM compliance_items
        WHERE deal_id = $1 AND required_stage = 'PO' AND status NOT IN ('VERIFIED', 'WAIVED')
      `, [req.params.id]);
      if (pending.rows[0].n > 0) {
        return res.status(400).json({ error: 'compliance_incomplete', pending_items: pending.rows[0].n });
      }
    }

    await pool.query(
      `UPDATE deal_rooms SET stage = $1, stage_updated_at = NOW(), stage_updated_by = $2 WHERE deal_id = $3`,
      [to_stage, staff_id || null, req.params.id]
    );
    await pool.query(
      `INSERT INTO deal_stage_history(deal_id, from_stage, to_stage, advanced_by, reason)
       VALUES($1, $2, $3, $4, $5)`,
      [req.params.id, fromStage, to_stage, staff_id || null, reason || null]
    );

    // Unlock party disclosure at ACCEPTED
    if (to_stage === 'ACCEPTED') {
      await pool.query(
        `UPDATE deal_rooms SET party_disclosure_unlocked = TRUE, party_disclosure_at = NOW() WHERE deal_id = $1`,
        [req.params.id]
      );
    }

    await brainFire(pool, 'DEAL_STAGE_ADVANCED', { deal_id: req.params.id, from: fromStage, to: to_stage });

    res.json({ ok: true, deal_id: req.params.id, stage: to_stage });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MESSAGES — HASH-CHAINED TAMPER-PROOF LOG ─────────────────────────────────

// POST /api/deals/:id/message
router.post('/:id/message', async (req, res) => {
  try {
    const pool = getPool();
    const { sender_contact_id, sender_anon_id, sender_role, body, attachment_ids } = req.body;
    if (!sender_anon_id || !sender_role || !body) {
      return res.status(400).json({ error: 'sender_anon_id, sender_role, body required' });
    }

    const prev = await pool.query(
      `SELECT hash FROM deal_messages WHERE deal_id = $1 ORDER BY id DESC LIMIT 1`,
      [req.params.id]
    );
    const prevHash = prev.rows[0]?.hash || null;
    const ts = new Date().toISOString();
    const hash = msgHash(prevHash, sender_anon_id, body, ts);

    const r = await pool.query(`
      INSERT INTO deal_messages(deal_id, sender_contact_id, sender_anon_id, sender_role,
                                body, attachment_ids, prev_hash, hash, created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, hash, created_at
    `, [req.params.id, sender_contact_id || null, sender_anon_id, sender_role, body,
        attachment_ids || null, prevHash, hash, ts]);

    await brainFire(pool, 'DEAL_MESSAGE_SENT', { deal_id: req.params.id, sender_role });
    res.json({ ok: true, message: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/deals/:id/verify-chain — verify hash chain integrity
router.get('/:id/verify-chain', async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.query(
      `SELECT id, sender_anon_id, body, prev_hash, hash, created_at
       FROM deal_messages WHERE deal_id = $1 ORDER BY id ASC`,
      [req.params.id]
    );
    let broken = null;
    let expectedPrev = null;
    for (const m of r.rows) {
      const ts = new Date(m.created_at).toISOString();
      const computed = msgHash(expectedPrev, m.sender_anon_id, m.body, ts);
      if (computed !== m.hash) { broken = m.id; break; }
      expectedPrev = m.hash;
    }
    res.json({ ok: broken === null, total: r.rows.length, broken_at_message_id: broken });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DD VAULT ──────────────────────────────────────────────────────────────────

// GET /api/deals/dd/types — list required doc types (filtered by role + origin)
router.get('/dd/types', async (req, res) => {
  try {
    const pool = getPool();
    const { role, country } = req.query;
    const params = [];
    let sql = `SELECT code, label, applies_to, required, commodity_filter, origin_country, description FROM dd_document_types WHERE 1=1`;
    if (role) { params.push(role.toUpperCase()); sql += ` AND (applies_to = $${params.length} OR applies_to = 'BOTH')`; }
    if (country) { params.push(country.toUpperCase()); sql += ` AND (origin_country IS NULL OR origin_country = $${params.length})`; }
    sql += ` ORDER BY required DESC, code ASC`;
    const r = await pool.query(sql, params);
    res.json({ types: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/deals/:dealId/dd/upload — multipart upload
router.post('/:dealId/dd/upload', upload.single('file'), async (req, res) => {
  try {
    const pool = getPool();
    if (!req.file) return res.status(400).json({ error: 'file required' });

    const { party_role, party_contact_id, doc_type_code, issue_date, expiry_date } = req.body;
    if (!party_role || !party_contact_id || !doc_type_code) {
      return res.status(400).json({ error: 'party_role, party_contact_id, doc_type_code required' });
    }

    const hash = fileHash(req.file.path);

    const r = await pool.query(`
      INSERT INTO dd_documents(deal_id, party_role, party_contact_id, doc_type_code,
                               filename, storage_path, mime_type, filesize_bytes, file_hash_sha256,
                               issue_date, expiry_date, status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'UPLOADED')
      RETURNING id, filename, status, uploaded_at
    `, [
      req.params.dealId, party_role.toUpperCase(), party_contact_id, doc_type_code.toUpperCase(),
      req.file.originalname, req.file.path, req.file.mimetype, req.file.size, hash,
      issue_date || null, expiry_date || null
    ]);

    await brainFire(pool, 'DD_DOCUMENT_UPLOADED', {
      deal_id: req.params.dealId, doc_id: r.rows[0].id, doc_type: doc_type_code, party_role
    });

    res.json({ ok: true, document: r.rows[0], file_hash: hash });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/deals/dd/queue — internal review queue
router.get('/dd/queue', async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.query(`SELECT * FROM v_dd_review_queue LIMIT 100`);
    res.json({ queue: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/deals/dd/:docId/verify — mark doc verified/rejected (staff action)
router.post('/dd/:docId/verify', async (req, res) => {
  try {
    const pool = getPool();
    const { status, staff_id, notes, rejection_reason } = req.body;
    if (!['VERIFIED', 'NEEDS_FIX', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    await pool.query(`
      UPDATE dd_documents SET
        status = $1,
        verified_by = $2,
        verified_at = CASE WHEN $1 = 'VERIFIED' THEN NOW() ELSE verified_at END,
        verification_notes = COALESCE($3, verification_notes),
        rejection_reason = CASE WHEN $1 = 'REJECTED' THEN $4 ELSE rejection_reason END,
        updated_at = NOW()
      WHERE id = $5
    `, [status, staff_id || null, notes || null, rejection_reason || null, req.params.docId]);

    const doc = await pool.query(`SELECT deal_id, doc_type_code FROM dd_documents WHERE id = $1`, [req.params.docId]);
    if (doc.rows.length) {
      await brainFire(pool, 'DD_DOCUMENT_' + status, {
        deal_id: doc.rows[0].deal_id, doc_id: req.params.docId, doc_type: doc.rows[0].doc_type_code
      });
    }
    res.json({ ok: true, status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────

// POST /api/deals/:id/po/generate — generate two-leg PO (IN + OUT)
router.post('/:id/po/generate', async (req, res) => {
  try {
    const pool = getPool();
    const d = await pool.query(`SELECT * FROM deal_rooms WHERE deal_id = $1`, [req.params.id]);
    if (!d.rows.length) return res.status(404).json({ error: 'deal_not_found' });
    const deal = d.rows[0];

    const poIn  = `PO-${deal.deal_id}-IN`;
    const poOut = `PO-${deal.deal_id}-OUT`;

    await pool.query(`
      INSERT INTO purchase_orders(po_id, deal_id, po_type, counterparty_id, qty, unit, unit_price,
                                  payment_terms, delivery_terms, delivery_date, status, issued_at)
      VALUES($1,$2,'IN',$3,$4,$5,$6,$7,$8,$9,'ISSUED',NOW())
      ON CONFLICT (po_id) DO NOTHING
    `, [poIn, deal.deal_id, deal.seller_id, deal.qty, deal.unit, deal.seller_price,
        deal.payment_terms, deal.delivery_terms, deal.expected_delivery_date]);

    await pool.query(`
      INSERT INTO purchase_orders(po_id, deal_id, po_type, counterparty_id, qty, unit, unit_price,
                                  payment_terms, delivery_terms, delivery_date, status, issued_at)
      VALUES($1,$2,'OUT',$3,$4,$5,$6,$7,$8,$9,'ISSUED',NOW())
      ON CONFLICT (po_id) DO NOTHING
    `, [poOut, deal.deal_id, deal.buyer_id, deal.qty, deal.unit, deal.buyer_price,
        deal.payment_terms, deal.delivery_terms, deal.expected_delivery_date]);

    await brainFire(pool, 'PO_GENERATED', { deal_id: deal.deal_id, po_in: poIn, po_out: poOut });
    res.json({ ok: true, po_in: poIn, po_out: poOut });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FACTORING CASCADE ─────────────────────────────────────────────────────────

// POST /api/deals/:id/factoring/cascade — offer to LCG then AGF then MFG self
router.post('/:id/factoring/cascade', async (req, res) => {
  try {
    const pool = getPool();
    const d = await pool.query(`SELECT * FROM deal_rooms WHERE deal_id = $1`, [req.params.id]);
    if (!d.rows.length) return res.status(404).json({ error: 'deal_not_found' });
    const deal = d.rows[0];
    const dealValue = Number(deal.buyer_price) * Number(deal.qty);

    const partners = [
      { id: 'FP_LCG', priority: 1, advance: 90, fee: 2.0, term: 30 },
      { id: 'FP_AGF', priority: 2, advance: 85, fee: 2.5, term: 30 },
      { id: 'FP_MFG', priority: 3, advance: 80, fee: 3.0, term: 30 }
    ];

    const offers = [];
    for (const p of partners) {
      const effAPR = (p.fee / p.term) * 365;
      const r = await pool.query(`
        INSERT INTO factoring_offers(deal_id, partner_id, partner_priority, offer_amount, advance_pct,
                                     fee_pct, term_days, effective_apr, offer_expires, status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW() + INTERVAL '7 days','OFFERED')
        RETURNING id, partner_priority, advance_pct, fee_pct, effective_apr
      `, [req.params.id, p.id, p.priority, dealValue, p.advance, p.fee, p.term, effAPR]);
      offers.push(r.rows[0]);
    }

    await brainFire(pool, 'FACTORING_CASCADE_FIRED', { deal_id: req.params.id, partner_count: offers.length });
    res.json({ ok: true, offers, deal_value: dealValue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/deals/:id/factoring/:offerId/accept — buyer accepts factoring
router.post('/:id/factoring/:offerId/accept', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(`
      UPDATE factoring_offers SET status = 'ACCEPTED', buyer_accepted_at = NOW()
      WHERE id = $1 AND deal_id = $2
    `, [req.params.offerId, req.params.id]);

    // Decline the losers
    await pool.query(`
      UPDATE factoring_offers SET status = 'DECLINED'
      WHERE deal_id = $1 AND id != $2 AND status = 'OFFERED'
    `, [req.params.id, req.params.offerId]);

    const accepted = await pool.query(`SELECT partner_id FROM factoring_offers WHERE id = $1`, [req.params.offerId]);
    if (accepted.rows.length) {
      await pool.query(
        `UPDATE deal_rooms SET factoring_partner_id = $1 WHERE deal_id = $2`,
        [accepted.rows[0].partner_id, req.params.id]
      );
    }

    await brainFire(pool, 'FACTORING_ACCEPTED', { deal_id: req.params.id, offer_id: req.params.offerId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── COMPLIANCE ────────────────────────────────────────────────────────────────

// POST /api/deals/:id/compliance/:itemId/resolve — mark compliance item resolved
router.post('/:id/compliance/:itemId/resolve', async (req, res) => {
  try {
    const pool = getPool();
    const { status, doc_id, staff_id, notes } = req.body;
    if (!['VERIFIED', 'MISSING', 'WAIVED'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    await pool.query(`
      UPDATE compliance_items SET status = $1, doc_id = $2, resolved_at = NOW(),
                                  resolved_by = $3, notes = COALESCE($4, notes)
      WHERE id = $5 AND deal_id = $6
    `, [status, doc_id || null, staff_id || null, notes || null, req.params.itemId, req.params.id]);

    await brainFire(pool, 'COMPLIANCE_ITEM_' + status, { deal_id: req.params.id, item_id: req.params.itemId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DISCLOSURE (stage-gated) ──────────────────────────────────────────────────

// GET /api/deals/:id/disclose — reveals real party IDs IF stage permits
router.get('/:id/disclose', async (req, res) => {
  try {
    const pool = getPool();
    const r = await pool.query(`
      SELECT dr.deal_id, dr.party_disclosure_unlocked, dr.stage,
             s.name AS seller_name, s.company AS seller_company, s.email AS seller_email,
             b.name AS buyer_name,  b.company AS buyer_company,  b.email AS buyer_email
      FROM deal_rooms dr
      LEFT JOIN crm_contacts s ON s.id = dr.seller_id
      LEFT JOIN crm_contacts b ON b.id = dr.buyer_id
      WHERE dr.deal_id = $1
    `, [req.params.id]);

    if (!r.rows.length) return res.status(404).json({ error: 'deal_not_found' });
    const deal = r.rows[0];

    if (!deal.party_disclosure_unlocked) {
      return res.status(403).json({
        error: 'disclosure_locked',
        stage: deal.stage,
        message: 'Party identity is disclosed only after deal reaches ACCEPTED stage.'
      });
    }

    res.json({
      deal_id: deal.deal_id,
      stage: deal.stage,
      seller: { name: deal.seller_name, company: deal.seller_company, email: deal.seller_email },
      buyer:  { name: deal.buyer_name,  company: deal.buyer_company,  email: deal.buyer_email  }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;