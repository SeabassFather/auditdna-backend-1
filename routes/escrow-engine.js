// ============================================================================
// escrow-engine.js — Strict escrow protocol with full audit trail
// PROTOCOL: LOI_SIGNED → DEPOSIT_REQUESTED → DEPOSIT_CONFIRMED → IN_ESCROW
//           → SHIPPED → DELIVERY_CONFIRMED → RELEASE_AUTHORIZED → FUNDS_RELEASED
//           → FEE_COLLECTED → COMPLETE  (DISPUTED possible at any stage)
//
// POST /api/escrow/create           — open new escrow
// GET  /api/escrow/list             — all escrows (owner/admin)
// GET  /api/escrow/:id              — single escrow detail
// POST /api/escrow/:id/advance      — advance to next stage (strict rules)
// POST /api/escrow/:id/dispute      — trigger dispute + freeze
// POST /api/escrow/:id/resolve      — resolve dispute (owner only)
// GET  /api/escrow/:id/audit-trail  — full immutable log
// GET  /api/escrow/stats/summary    — dashboard stats
// ============================================================================
const express = require('express');
const router  = express.Router();

// ── STAGE DEFINITIONS ─────────────────────────────────────────────────────────
const STAGES = [
  'LOI_SIGNED',           // 0  Both parties agreed to terms (blind)
  'DEPOSIT_REQUESTED',    // 1  Mexausa requests buyer deposit
  'DEPOSIT_CONFIRMED',    // 2  Owner manually confirms receipt of funds
  'IN_ESCROW',            // 3  Funds held — grower clears to ship — PARTY DISCLOSURE
  'SHIPPED',              // 4  Grower provides BOL/tracking number
  'DELIVERY_CONFIRMED',   // 5  Buyer confirms delivery + quality acceptance
  'RELEASE_AUTHORIZED',   // 6  Owner/admin authorizes fund release (2-step)
  'FUNDS_RELEASED',       // 7  Grower receives deal amount minus fee
  'FEE_COLLECTED',        // 8  Mexausa fee auto-deducted and logged
  'COMPLETE',             // 9  Receipts sent, deal archived
];
const STAGE_IDX = Object.fromEntries(STAGES.map((s,i) => [s,i]));

// Who can advance each stage
const ADVANCE_RULES = {
  LOI_SIGNED:          { roles: ['owner','admin'], note: 'Owner confirms LOI signed by both parties' },
  DEPOSIT_REQUESTED:   { roles: ['owner','admin'], note: 'Owner confirms deposit request sent to buyer' },
  DEPOSIT_CONFIRMED:   { roles: ['owner','admin'], note: 'Owner confirms funds received in escrow account' },
  IN_ESCROW:           { roles: ['owner','admin','grower'], note: 'Grower confirms shipment initiated' },
  SHIPPED:             { roles: ['owner','admin','buyer'], note: 'Buyer confirms delivery and quality' },
  DELIVERY_CONFIRMED:  { roles: ['owner','admin'], note: 'Owner authorizes fund release — IRREVERSIBLE' },
  RELEASE_AUTHORIZED:  { roles: ['owner'], note: 'Owner only — confirms funds wired to grower' },
  FUNDS_RELEASED:      { roles: ['owner'], note: 'Owner confirms fee collected' },
  FEE_COLLECTED:       { roles: ['owner','admin'], note: 'Owner closes and archives deal' },
};

const MEXAUSA_FEE_PCT = 2.5; // 2.5% default

async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS escrow_transactions (
      id                SERIAL PRIMARY KEY,
      escrow_id         VARCHAR(30) UNIQUE NOT NULL,
      deal_id           VARCHAR(100),
      manifest_id       INTEGER,

      -- BLIND UNTIL IN_ESCROW — stored internally only
      buyer_username    VARCHAR(100),
      buyer_display     VARCHAR(150),
      buyer_email       VARCHAR(200),
      seller_username   VARCHAR(100),
      seller_display    VARCHAR(150),
      seller_email      VARCHAR(200),

      -- Deal terms
      commodity         VARCHAR(100) NOT NULL,
      variety           VARCHAR(100),
      volume            VARCHAR(100),
      unit_price        NUMERIC(12,2),
      total_amount      NUMERIC(14,2) NOT NULL,
      currency          VARCHAR(10)  DEFAULT 'USD',
      fee_pct           NUMERIC(5,2) DEFAULT 2.5,
      fee_amount        NUMERIC(12,2),
      net_to_seller     NUMERIC(14,2),
      delivery_terms    VARCHAR(200),
      delivery_location VARCHAR(200),
      expected_delivery DATE,

      -- Payment tracking
      deposit_method    VARCHAR(80),
      deposit_reference VARCHAR(200),
      deposit_confirmed_at TIMESTAMPTZ,
      release_method    VARCHAR(80),
      release_reference VARCHAR(200),
      released_at       TIMESTAMPTZ,

      -- Shipping
      bol_number        VARCHAR(200),
      carrier           VARCHAR(150),
      tracking_number   VARCHAR(200),
      shipped_at        TIMESTAMPTZ,
      delivered_at      TIMESTAMPTZ,

      -- Stage control
      stage             VARCHAR(30) NOT NULL DEFAULT 'LOI_SIGNED',
      stage_index       INTEGER NOT NULL DEFAULT 0,
      previous_stage    VARCHAR(30),
      is_disputed       BOOLEAN DEFAULT FALSE,
      dispute_reason    TEXT,
      dispute_raised_by VARCHAR(100),
      dispute_raised_at TIMESTAMPTZ,

      -- Auth
      created_by        VARCHAR(100),
      authorized_by     VARCHAR(100),
      release_auth_1    VARCHAR(100),
      release_auth_2    VARCHAR(100),

      -- Notes
      internal_notes    TEXT,
      loi_reference     VARCHAR(200),

      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS escrow_audit_log (
      id            SERIAL PRIMARY KEY,
      escrow_id     VARCHAR(30) NOT NULL,
      action        VARCHAR(80) NOT NULL,
      from_stage    VARCHAR(30),
      to_stage      VARCHAR(30),
      actor_username VARCHAR(100),
      actor_role    VARCHAR(50),
      note          TEXT,
      meta          JSONB DEFAULT '{}',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_escrow_id       ON escrow_transactions(escrow_id);
    CREATE INDEX IF NOT EXISTS idx_escrow_stage    ON escrow_transactions(stage);
    CREATE INDEX IF NOT EXISTS idx_escrow_audit_id ON escrow_audit_log(escrow_id);
    CREATE INDEX IF NOT EXISTS idx_escrow_created  ON escrow_transactions(created_at DESC);
  `).catch(()=>{});
}

function genEscrowId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `MFG-ESC-${ts}-${rand}`;
}

async function logAudit(pool, escrowId, action, fromStage, toStage, actor, role, note, meta={}) {
  await pool.query(
    `INSERT INTO escrow_audit_log (escrow_id,action,from_stage,to_stage,actor_username,actor_role,note,meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [escrowId, action, fromStage||'', toStage||'', actor||'system', role||'', note||'', JSON.stringify(meta)]
  ).catch(()=>{});
}

async function sendEscrowEmail(subject, body, recipients=[]) {
  const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';
  const allTo = ['sgarcia1911@gmail.com', ...recipients].filter(Boolean);
  for (const to of allTo) {
    try {
      await fetch(`${BASE}/api/gmail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body })
      });
    } catch(_) {}
  }
}

function buildStageEmail(escrow, stage, note) {
  const isMasked = STAGE_IDX[stage] < STAGE_IDX['IN_ESCROW'];
  const buyerName  = isMasked ? 'VERIFIED BUYER'  : (escrow.buyer_display  || 'Buyer');
  const sellerName = isMasked ? 'VERIFIED SUPPLIER' : (escrow.seller_display || 'Supplier');
  return `MEXAUSA FOOD GROUP — ESCROW UPDATE
${'='.repeat(50)}
ESCROW ID:    ${escrow.escrow_id}
STAGE:        ${stage}
COMMODITY:    ${escrow.commodity}${escrow.variety?' — '+escrow.variety:''}
VOLUME:       ${escrow.volume}
AMOUNT:       $${Number(escrow.total_amount).toLocaleString()} ${escrow.currency||'USD'}
FEE (${escrow.fee_pct}%):  $${Number(escrow.fee_amount||0).toLocaleString()}
NET TO SELLER: $${Number(escrow.net_to_seller||0).toLocaleString()}

BUYER:        ${buyerName}
SUPPLIER:     ${sellerName}
DELIVERY:     ${escrow.delivery_location||'TBD'} by ${escrow.expected_delivery||'TBD'}
${escrow.bol_number?'BOL: '+escrow.bol_number+'\n':''}
NOTE: ${note||'Stage advanced per protocol.'}
${'─'.repeat(50)}
${isMasked?'IDENTITY PROTECTION ACTIVE — Parties revealed at IN_ESCROW stage only.\n':'PARTY DISCLOSURE ACTIVE — Both parties now identified.\n'}
Mexausa Food Group | mexausafg.com
This is an automated escrow protocol notification.`;
}

// ── POST /create ──────────────────────────────────────────────────────────────
router.post('/create', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  const {
    buyer_username, buyer_display, buyer_email,
    seller_username, seller_display, seller_email,
    commodity, variety, volume,
    unit_price, total_amount, currency,
    fee_pct, delivery_terms, delivery_location, expected_delivery,
    deposit_method, loi_reference, deal_id, manifest_id,
    internal_notes, created_by, creator_role
  } = req.body;

  if (!commodity || !total_amount || !buyer_username || !seller_username) {
    return res.status(400).json({ ok: false, error: 'commodity, total_amount, buyer_username, seller_username required' });
  }

  const escrowId   = genEscrowId();
  const feePct     = parseFloat(fee_pct) || MEXAUSA_FEE_PCT;
  const totalAmt   = parseFloat(total_amount);
  const feeAmt     = parseFloat((totalAmt * feePct / 100).toFixed(2));
  const netSeller  = parseFloat((totalAmt - feeAmt).toFixed(2));

  try {
    await pool.query(
      `INSERT INTO escrow_transactions
         (escrow_id,deal_id,manifest_id,buyer_username,buyer_display,buyer_email,
          seller_username,seller_display,seller_email,commodity,variety,volume,
          unit_price,total_amount,currency,fee_pct,fee_amount,net_to_seller,
          delivery_terms,delivery_location,expected_delivery,deposit_method,
          loi_reference,internal_notes,created_by,stage,stage_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
               $19,$20,$21,$22,$23,$24,$25,'LOI_SIGNED',0)`,
      [escrowId, deal_id||null, manifest_id||null,
       buyer_username, buyer_display||buyer_username, buyer_email||'',
       seller_username, seller_display||seller_username, seller_email||'',
       commodity, variety||'', volume||'',
       unit_price||null, totalAmt, currency||'USD',
       feePct, feeAmt, netSeller,
       delivery_terms||'FOB Origin', delivery_location||'', expected_delivery||null,
       deposit_method||'Wire Transfer', loi_reference||'',
       internal_notes||'', created_by||'system']
    );

    await logAudit(pool, escrowId, 'CREATED', null, 'LOI_SIGNED', created_by, creator_role,
      `Escrow created. Amount: $${totalAmt} ${currency||'USD'}. Fee: ${feePct}% ($${feeAmt}). Net to seller: $${netSeller}.`,
      { total_amount: totalAmt, fee_pct: feePct, commodity });

    // Log user activity
    await pool.query(
      `INSERT INTO user_activity_log (username,display_name,role,event_type,module,description,meta)
       VALUES ($1,$2,$3,'ESCROW_CREATED','Escrow',$4,$5)`,
      [created_by||'system', buyer_display||'', creator_role||'admin',
       `Escrow ${escrowId}: ${commodity} $${totalAmt}`,
       JSON.stringify({escrowId, commodity, total_amount: totalAmt, buyer_username, seller_username})]
    ).catch(()=>{});

    await sendEscrowEmail(
      `[MFG ESCROW] New Escrow Created — ${escrowId} | ${commodity} | $${totalAmt.toLocaleString()}`,
      buildStageEmail({ escrow_id:escrowId, commodity, variety, volume, total_amount:totalAmt, fee_pct:feePct, fee_amount:feeAmt, net_to_seller:netSeller, buyer_display, seller_display, delivery_location, expected_delivery, currency },
        'LOI_SIGNED', 'Escrow initiated. Awaiting deposit request.')
    );

    try { if(global.brain) global.brain.ping('ESCROW_CREATED', {escrowId, commodity, total_amount:totalAmt, buyer_username, seller_username}); } catch(_){}

    res.status(201).json({ ok: true, escrowId, stage: 'LOI_SIGNED', fee_pct: feePct, fee_amount: feeAmt, net_to_seller: netSeller });
  } catch(e) {
    console.error('[ESCROW CREATE]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /:id/advance ─────────────────────────────────────────────────────────
router.post('/:id/advance', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  const { actor_username, actor_role, note, meta={} } = req.body;
  const { id } = req.params;

  try {
    const q = await pool.query('SELECT * FROM escrow_transactions WHERE escrow_id=$1', [id]);
    if (!q.rows.length) return res.status(404).json({ ok: false, error: 'Escrow not found' });
    const escrow = q.rows[0];

    if (escrow.is_disputed) return res.status(400).json({ ok: false, error: 'FROZEN — dispute active. Resolve dispute first.' });

    const currentStage = escrow.stage;
    const currentIdx   = STAGE_IDX[currentStage];

    if (currentIdx >= STAGES.length - 1) {
      return res.status(400).json({ ok: false, error: 'Escrow is already COMPLETE' });
    }

    // Check authorization
    const rule = ADVANCE_RULES[currentStage];
    if (rule && !rule.roles.includes(actor_role)) {
      return res.status(403).json({ ok: false, error: `Stage ${currentStage} can only be advanced by: ${rule.roles.join(', ')}` });
    }

    // Special rule: RELEASE_AUTHORIZED requires owner only and 2-step confirmation
    if (currentStage === 'DELIVERY_CONFIRMED') {
      if (actor_role !== 'owner' && actor_role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Fund release requires owner/admin authorization' });
      }
      // First auth
      if (!escrow.release_auth_1) {
        await pool.query('UPDATE escrow_transactions SET release_auth_1=$1, updated_at=NOW() WHERE escrow_id=$2', [actor_username, id]);
        await logAudit(pool, id, 'RELEASE_AUTH_1', currentStage, currentStage, actor_username, actor_role, 'First release authorization recorded. Second signature required.');
        return res.json({ ok: true, message: 'First authorization recorded. Second signature required to release funds.', stage: currentStage, auth_1: actor_username });
      }
      if (escrow.release_auth_1 === actor_username) {
        return res.status(400).json({ ok: false, error: 'Same person cannot provide both signatures. Second signatory required.' });
      }
      await pool.query('UPDATE escrow_transactions SET release_auth_2=$1, updated_at=NOW() WHERE escrow_id=$2', [actor_username, id]);
    }

    const nextStage = STAGES[currentIdx + 1];

    // Advance fields depending on stage
    let extraFields = 'updated_at=NOW()';
    const extraParams = [id];
    let paramIdx = 2;

    if (nextStage === 'IN_ESCROW') {
      extraFields += `, deposit_confirmed_at=NOW()`;
    }
    if (nextStage === 'SHIPPED') {
      const { bol_number, carrier, tracking_number } = req.body;
      if (bol_number) { extraFields += `, bol_number=$${paramIdx++}, carrier=$${paramIdx++}, tracking_number=$${paramIdx++}, shipped_at=NOW()`; extraParams.unshift(bol_number, carrier||'', tracking_number||''); }
    }
    if (nextStage === 'DELIVERY_CONFIRMED') {
      extraFields += `, delivered_at=NOW()`;
    }
    if (nextStage === 'FUNDS_RELEASED') {
      const { release_reference, release_method } = req.body;
      extraFields += `, released_at=NOW(), authorized_by=$${paramIdx++}`;
      extraParams.unshift(actor_username);
      if (release_reference) { extraFields += `, release_reference=$${paramIdx++}`; extraParams.unshift(release_reference); }
      if (release_method)    { extraFields += `, release_method=$${paramIdx++}`;    extraParams.unshift(release_method); }
    }

    await pool.query(
      `UPDATE escrow_transactions
         SET stage=$1, stage_index=$2, previous_stage=$3, ${extraFields}
       WHERE escrow_id=$${extraParams.length + 3}`,
      [nextStage, currentIdx + 1, currentStage, ...extraParams.slice(0,-1), id]
    );

    await logAudit(pool, id, 'STAGE_ADVANCED', currentStage, nextStage, actor_username, actor_role, note || rule?.note || '', meta);

    // Email both parties at every stage (identity masked until IN_ESCROW)
    const recipients = [];
    if (STAGE_IDX[nextStage] >= STAGE_IDX['IN_ESCROW']) {
      if (escrow.buyer_email)  recipients.push(escrow.buyer_email);
      if (escrow.seller_email) recipients.push(escrow.seller_email);
    }
    await sendEscrowEmail(
      `[MFG ESCROW] Stage Update: ${nextStage} — ${id}`,
      buildStageEmail(escrow, nextStage, note), recipients
    );

    // Activity log
    await pool.query(
      `INSERT INTO user_activity_log (username,display_name,role,event_type,module,description,meta)
       VALUES ($1,$2,$3,'ESCROW_STAGE_ADVANCED','Escrow',$4,$5)`,
      [actor_username||'system', actor_username||'', actor_role||'',
       `${id}: ${currentStage} → ${nextStage}`,
       JSON.stringify({escrowId:id, from:currentStage, to:nextStage, commodity:escrow.commodity})]
    ).catch(()=>{});

    try { if(global.brain) global.brain.ping('ESCROW_ADVANCED', {escrowId:id, from:currentStage, to:nextStage}); } catch(_){}

    res.json({ ok: true, escrowId: id, from: currentStage, to: nextStage, stage: nextStage });
  } catch(e) {
    console.error('[ESCROW ADVANCE]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /:id/dispute ─────────────────────────────────────────────────────────
router.post('/:id/dispute', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  const { actor_username, actor_role, reason } = req.body;
  try {
    const q = await pool.query('SELECT * FROM escrow_transactions WHERE escrow_id=$1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    const escrow = q.rows[0];
    await pool.query(
      `UPDATE escrow_transactions SET is_disputed=TRUE, dispute_reason=$1, dispute_raised_by=$2, dispute_raised_at=NOW(), stage='DISPUTED', updated_at=NOW() WHERE escrow_id=$3`,
      [reason||'Dispute raised', actor_username, req.params.id]
    );
    await logAudit(pool, req.params.id, 'DISPUTED', escrow.stage, 'DISPUTED', actor_username, actor_role, reason);
    await sendEscrowEmail(
      `[MFG ESCROW] ⚠ DISPUTE RAISED — ${req.params.id} | FUNDS FROZEN`,
      `ESCROW DISPUTE ALERT\n${'='.repeat(40)}\nESCROW: ${req.params.id}\nRAISED BY: ${actor_username}\nREASON: ${reason||'Not specified'}\nSTATUS: FUNDS FROZEN pending owner review.\nCONTACT: sgarcia1911@gmail.com\nmexausafg.com`
    );
    res.json({ ok:true, escrowId:req.params.id, status:'DISPUTED', message:'Funds frozen. Owner notified.' });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── POST /:id/resolve ─────────────────────────────────────────────────────────
router.post('/:id/resolve', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  const { actor_username, actor_role, resolution, return_to_stage } = req.body;
  if (!['owner','admin'].includes(actor_role)) {
    return res.status(403).json({ ok:false, error:'Only owner/admin can resolve disputes' });
  }
  try {
    const q = await pool.query('SELECT * FROM escrow_transactions WHERE escrow_id=$1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    const escrow = q.rows[0];
    const returnStage = return_to_stage || escrow.previous_stage || 'IN_ESCROW';
    const returnIdx   = STAGE_IDX[returnStage] || 3;
    await pool.query(
      `UPDATE escrow_transactions SET is_disputed=FALSE, stage=$1, stage_index=$2, updated_at=NOW() WHERE escrow_id=$3`,
      [returnStage, returnIdx, req.params.id]
    );
    await logAudit(pool, req.params.id, 'DISPUTE_RESOLVED', 'DISPUTED', returnStage, actor_username, actor_role, resolution);
    await sendEscrowEmail(
      `[MFG ESCROW] Dispute Resolved — ${req.params.id} | Funds Unfrozen`,
      `ESCROW DISPUTE RESOLVED\n${'='.repeat(40)}\nESCROW: ${req.params.id}\nRESOLVED BY: ${actor_username}\nRESOLUTION: ${resolution||'Resolved by owner'}\nRETURNED TO STAGE: ${returnStage}\nFunds unfrozen.\nmexausafg.com`
    );
    res.json({ ok:true, escrowId:req.params.id, stage:returnStage, message:'Dispute resolved. Escrow unfrozen.' });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /list ─────────────────────────────────────────────────────────────────
router.get('/list', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  try {
    const { stage, limit } = req.query;
    let where = ['1=1'], params = [], p = 1;
    if (stage) { where.push(`stage=$${p++}`); params.push(stage); }
    const rows = await pool.query(
      `SELECT escrow_id,commodity,variety,volume,total_amount,currency,fee_pct,fee_amount,
              net_to_seller,stage,stage_index,is_disputed,created_at,updated_at,
              delivery_location,expected_delivery,deposit_method,
              buyer_display,seller_display,created_by,authorized_by,bol_number
       FROM escrow_transactions WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${p}`,
      [...params, Math.min(parseInt(limit)||50,200)]
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, escrows:rows.rows, total:rows.rows.length });
  } catch(e) { res.status(500).json({ ok:false, escrows:[], error:e.message }); }
});

// ── GET /stats/summary ────────────────────────────────────────────────────────
router.get('/stats/summary', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) AS total_escrows,
        COUNT(*) FILTER (WHERE stage='COMPLETE')          AS completed,
        COUNT(*) FILTER (WHERE stage='DISPUTED')          AS disputed,
        COUNT(*) FILTER (WHERE stage NOT IN ('COMPLETE','DISPUTED')) AS active,
        COALESCE(SUM(total_amount) FILTER (WHERE stage='COMPLETE'), 0) AS total_volume_completed,
        COALESCE(SUM(fee_amount)   FILTER (WHERE stage='COMPLETE'), 0) AS total_fees_collected,
        COALESCE(SUM(total_amount) FILTER (WHERE stage NOT IN ('COMPLETE','DISPUTED')), 0) AS volume_in_flight
      FROM escrow_transactions`
    ).catch(()=>({rows:[{}]}));
    res.json({ ok:true, stats:stats.rows[0] });
  } catch(e) { res.json({ ok:false, stats:{}, error:e.message }); }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  try {
    const q = await pool.query('SELECT * FROM escrow_transactions WHERE escrow_id=$1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ ok:false, error:'Not found' });
    res.json({ ok:true, escrow:q.rows[0] });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ── GET /:id/audit-trail ──────────────────────────────────────────────────────
router.get('/:id/audit-trail', async (req, res) => {
  const pool = global.db || req.app.locals.pool;
  await ensureTables(pool);
  try {
    const rows = await pool.query(
      `SELECT * FROM escrow_audit_log WHERE escrow_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    ).catch(()=>({rows:[]}));
    res.json({ ok:true, trail:rows.rows, total:rows.rows.length });
  } catch(e) { res.status(500).json({ ok:false, trail:[], error:e.message }); }
});

module.exports = router;
