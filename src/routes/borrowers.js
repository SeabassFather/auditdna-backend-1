// ============================================================================
// AuditDNA - Borrower Onboarding Route
// Sprint C P9 / 4.25.2026
// One-time entity registry shared by Factoring, PO Finance, Commercial Loan
// Schema: borrower_entities + borrower_beneficial_owners
// Brain emits: BORROWER_ONBOARDED, BORROWER_APPROVED, BORROWER_BANK_VERIFIED,
//              MASTER_AGREEMENT_SIGNED, BENEFICIAL_OWNER_ADDED
// ============================================================================

const express = require('express');
const router = express.Router();

// ---- Self-migrating schema ------------------------------------------------
async function ensureSchema() {
  if (!global.db) return;
  try {
    await global.db.query(`
      CREATE TABLE IF NOT EXISTS borrower_entities (
        id SERIAL PRIMARY KEY,
        legal_name VARCHAR(200) NOT NULL,
        dba VARCHAR(200),
        entity_type VARCHAR(50),
        ein VARCHAR(20),
        borrower_role VARCHAR(50),
        street VARCHAR(200),
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        country VARCHAR(50) DEFAULT 'USA',
        primary_contact_name VARCHAR(200),
        primary_contact_email VARCHAR(200),
        primary_contact_phone VARCHAR(50),
        years_in_business INTEGER,
        annual_revenue NUMERIC(15,2),
        employee_count INTEGER,
        industry_codes VARCHAR(200),
        paca_number VARCHAR(50),
        usda_license VARCHAR(50),
        state_license VARCHAR(100),
        insurance_carrier VARCHAR(200),
        insurance_policy VARCHAR(100),
        insurance_expires DATE,
        bank_name VARCHAR(200),
        bank_account_last4 VARCHAR(10),
        bank_routing_last4 VARCHAR(10),
        bank_verified BOOLEAN DEFAULT false,
        bank_verified_at TIMESTAMP,
        fico_score INTEGER,
        d_b_number VARCHAR(50),
        kyc_status VARCHAR(50) DEFAULT 'pending',
        kyc_approved_at TIMESTAMP,
        kyc_approved_by VARCHAR(100),
        master_agreement_signed BOOLEAN DEFAULT false,
        master_agreement_date DATE,
        onboarded_at TIMESTAMP DEFAULT NOW(),
        onboarded_by VARCHAR(100),
        notes TEXT,
        grower_id INTEGER,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_borrower_entities_ein ON borrower_entities(ein);`);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_borrower_entities_legal_name ON borrower_entities(legal_name);`);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_borrower_entities_role ON borrower_entities(borrower_role);`);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_borrower_entities_kyc ON borrower_entities(kyc_status);`);

    await global.db.query(`
      CREATE TABLE IF NOT EXISTS borrower_beneficial_owners (
        id SERIAL PRIMARY KEY,
        borrower_id INTEGER NOT NULL REFERENCES borrower_entities(id) ON DELETE CASCADE,
        full_name VARCHAR(200) NOT NULL,
        ownership_pct NUMERIC(5,2),
        title VARCHAR(100),
        ssn_last4 VARCHAR(10),
        dob DATE,
        email VARCHAR(200),
        phone VARCHAR(50),
        is_signer BOOLEAN DEFAULT false,
        added_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await global.db.query(`CREATE INDEX IF NOT EXISTS idx_beneficial_owners_borrower ON borrower_beneficial_owners(borrower_id);`);

    console.log('[borrowers] schema OK');
  } catch (e) {
    console.error('[borrowers] schema error:', e.message);
  }
}
setTimeout(ensureSchema, 1500);

function emitBrain(type, payload) {
  try { if (typeof global.brainEmit === 'function') global.brainEmit(type, payload); } catch (e) {}
}

const heavyJson = express.json({ limit: '1mb' });

// ============================================================================
// POST /api/borrowers/onboard - create new entity
// ============================================================================
router.post('/api/borrowers/onboard', heavyJson, async (req, res) => {
  const b = req.body || {};
  if (!b.legal_name) return res.status(400).json({ error: 'legal_name required' });

  try {
    const r = await global.db.query(
      `INSERT INTO borrower_entities (
         legal_name, dba, entity_type, ein, borrower_role,
         street, city, state, zip, country,
         primary_contact_name, primary_contact_email, primary_contact_phone,
         years_in_business, annual_revenue, employee_count, industry_codes,
         paca_number, usda_license, state_license,
         insurance_carrier, insurance_policy, insurance_expires,
         bank_name, bank_account_last4, bank_routing_last4,
         fico_score, d_b_number, onboarded_by, notes, grower_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
       RETURNING id, onboarded_at`,
      [
        b.legal_name, b.dba || null, b.entity_type || null, b.ein || null, b.borrower_role || null,
        b.street || null, b.city || null, b.state || null, b.zip || null, b.country || 'USA',
        b.primary_contact_name || null, b.primary_contact_email || null, b.primary_contact_phone || null,
        b.years_in_business || null, b.annual_revenue || null, b.employee_count || null, b.industry_codes || null,
        b.paca_number || null, b.usda_license || null, b.state_license || null,
        b.insurance_carrier || null, b.insurance_policy || null, b.insurance_expires || null,
        b.bank_name || null, b.bank_account_last4 || null, b.bank_routing_last4 || null,
        b.fico_score || null, b.d_b_number || null, b.onboarded_by || 'saul', b.notes || null, b.grower_id || null
      ]
    );

    emitBrain('BORROWER_ONBOARDED', {
      borrower_id: r.rows[0].id,
      legal_name: b.legal_name,
      borrower_role: b.borrower_role,
      ein: b.ein
    });

    res.json({ ok: true, borrower_id: r.rows[0].id, onboarded_at: r.rows[0].onboarded_at });
  } catch (e) {
    console.error('[borrowers] onboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/borrowers - list (with optional search)
// ============================================================================
router.get('/api/borrowers', async (req, res) => {
  const { q, role, kyc, limit } = req.query;
  const conditions = [];
  const params = [];
  let pidx = 1;

  if (q) {
    conditions.push(`(LOWER(legal_name) LIKE $${pidx} OR LOWER(dba) LIKE $${pidx} OR ein LIKE $${pidx})`);
    params.push(`%${String(q).toLowerCase()}%`); pidx++;
  }
  if (role) { conditions.push(`borrower_role = $${pidx++}`); params.push(role); }
  if (kyc) { conditions.push(`kyc_status = $${pidx++}`); params.push(kyc); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit || '200', 10), 500);

  try {
    const r = await global.db.query(
      `SELECT id, legal_name, dba, entity_type, ein, borrower_role, state,
              kyc_status, master_agreement_signed, bank_verified,
              annual_revenue, fico_score, onboarded_at, updated_at
       FROM borrower_entities
       ${where}
       ORDER BY updated_at DESC
       LIMIT ${lim}`,
      params
    );
    res.json({ borrowers: r.rows, count: r.rows.length });
  } catch (e) {
    console.error('[borrowers] list error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/borrowers/:id - detail with beneficial owners
// ============================================================================
router.get('/api/borrowers/:id', async (req, res) => {
  try {
    const e = await global.db.query(`SELECT * FROM borrower_entities WHERE id = $1`, [parseInt(req.params.id, 10)]);
    if (e.rows.length === 0) return res.status(404).json({ error: 'not found' });
    const bos = await global.db.query(
      `SELECT * FROM borrower_beneficial_owners WHERE borrower_id = $1 ORDER BY ownership_pct DESC NULLS LAST, added_at`,
      [parseInt(req.params.id, 10)]
    );
    res.json({ borrower: e.rows[0], beneficial_owners: bos.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// PUT /api/borrowers/:id - update
// ============================================================================
router.put('/api/borrowers/:id', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};

  const fields = [
    'legal_name','dba','entity_type','ein','borrower_role',
    'street','city','state','zip','country',
    'primary_contact_name','primary_contact_email','primary_contact_phone',
    'years_in_business','annual_revenue','employee_count','industry_codes',
    'paca_number','usda_license','state_license',
    'insurance_carrier','insurance_policy','insurance_expires',
    'bank_name','bank_account_last4','bank_routing_last4',
    'fico_score','d_b_number','notes','grower_id'
  ];

  const sets = [];
  const params = [];
  let pidx = 1;
  fields.forEach(f => {
    if (b[f] !== undefined) {
      sets.push(`${f} = $${pidx++}`);
      params.push(b[f] === '' ? null : b[f]);
    }
  });
  if (sets.length === 0) return res.json({ ok: true, no_changes: true });

  sets.push(`updated_at = NOW()`);
  params.push(id);

  try {
    const r = await global.db.query(
      `UPDATE borrower_entities SET ${sets.join(', ')} WHERE id = $${pidx} RETURNING id, legal_name`,
      params
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, updated: r.rows[0] });
  } catch (e) {
    console.error('[borrowers] update error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// DELETE /api/borrowers/:id
// ============================================================================
router.delete('/api/borrowers/:id', async (req, res) => {
  try {
    const r = await global.db.query(
      `DELETE FROM borrower_entities WHERE id = $1 RETURNING legal_name`,
      [parseInt(req.params.id, 10)]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, deleted: r.rows[0].legal_name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/borrowers/:id/approve - KYC approval
// ============================================================================
router.post('/api/borrowers/:id/approve', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const approvedBy = (req.body && req.body.approved_by) || 'saul';
  try {
    const r = await global.db.query(
      `UPDATE borrower_entities
       SET kyc_status = 'approved', kyc_approved_at = NOW(), kyc_approved_by = $2, updated_at = NOW()
       WHERE id = $1 RETURNING id, legal_name, ein, borrower_role`,
      [id, approvedBy]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    emitBrain('BORROWER_APPROVED', {
      borrower_id: id,
      legal_name: r.rows[0].legal_name,
      borrower_role: r.rows[0].borrower_role,
      approved_by: approvedBy
    });
    res.json({ ok: true, approved: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/borrowers/:id/reject - KYC rejection
// ============================================================================
router.post('/api/borrowers/:id/reject', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reason = (req.body && req.body.reason) || null;
  try {
    const r = await global.db.query(
      `UPDATE borrower_entities
       SET kyc_status = 'rejected', updated_at = NOW(),
           notes = COALESCE(notes, '') || CASE WHEN $2::text IS NULL THEN '' ELSE E'\nKYC rejected: ' || $2::text END
       WHERE id = $1 RETURNING id, legal_name`,
      [id, reason]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/borrowers/:id/sign-master - master agreement signed
// ============================================================================
router.post('/api/borrowers/:id/sign-master', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const signDate = (req.body && req.body.signed_date) || new Date().toISOString().split('T')[0];
  try {
    const r = await global.db.query(
      `UPDATE borrower_entities
       SET master_agreement_signed = true, master_agreement_date = $2, updated_at = NOW()
       WHERE id = $1 RETURNING id, legal_name`,
      [id, signDate]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    emitBrain('MASTER_AGREEMENT_SIGNED', {
      borrower_id: id,
      legal_name: r.rows[0].legal_name,
      signed_date: signDate
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/borrowers/:id/verify-bank - bank verified
// ============================================================================
router.post('/api/borrowers/:id/verify-bank', heavyJson, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const r = await global.db.query(
      `UPDATE borrower_entities
       SET bank_verified = true, bank_verified_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING id, legal_name, bank_name, bank_account_last4`,
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    emitBrain('BORROWER_BANK_VERIFIED', {
      borrower_id: id,
      legal_name: r.rows[0].legal_name,
      bank_name: r.rows[0].bank_name,
      account_last4: r.rows[0].bank_account_last4
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// POST /api/borrowers/:id/beneficial-owners - add BO
// ============================================================================
router.post('/api/borrowers/:id/beneficial-owners', heavyJson, async (req, res) => {
  const borrowerId = parseInt(req.params.id, 10);
  const b = req.body || {};
  if (!b.full_name) return res.status(400).json({ error: 'full_name required' });

  try {
    const r = await global.db.query(
      `INSERT INTO borrower_beneficial_owners
         (borrower_id, full_name, ownership_pct, title, ssn_last4, dob, email, phone, is_signer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, added_at`,
      [
        borrowerId, b.full_name, b.ownership_pct || null, b.title || null,
        b.ssn_last4 || null, b.dob || null, b.email || null, b.phone || null,
        b.is_signer || false
      ]
    );
    emitBrain('BENEFICIAL_OWNER_ADDED', {
      borrower_id: borrowerId,
      bo_id: r.rows[0].id,
      full_name: b.full_name,
      ownership_pct: b.ownership_pct
    });
    res.json({ ok: true, bo_id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// DELETE /api/borrowers/:id/beneficial-owners/:boId
// ============================================================================
router.delete('/api/borrowers/:id/beneficial-owners/:boId', async (req, res) => {
  try {
    const r = await global.db.query(
      `DELETE FROM borrower_beneficial_owners WHERE id = $1 AND borrower_id = $2 RETURNING full_name`,
      [parseInt(req.params.boId, 10), parseInt(req.params.id, 10)]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/borrowers/:id/readiness - completeness score
// ============================================================================
router.get('/api/borrowers/:id/readiness', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const e = await global.db.query(`SELECT * FROM borrower_entities WHERE id = $1`, [id]);
    if (e.rows.length === 0) return res.status(404).json({ error: 'not found' });
    const bos = await global.db.query(`SELECT COUNT(*)::int as c FROM borrower_beneficial_owners WHERE borrower_id = $1`, [id]);
    const b = e.rows[0];

    const checks = [
      { k:'legal_name', ok: !!b.legal_name },
      { k:'ein', ok: !!b.ein },
      { k:'entity_type', ok: !!b.entity_type },
      { k:'borrower_role', ok: !!b.borrower_role },
      { k:'address', ok: !!b.street && !!b.city && !!b.state && !!b.zip },
      { k:'contact', ok: !!b.primary_contact_name && !!b.primary_contact_email },
      { k:'business_profile', ok: !!b.years_in_business && !!b.annual_revenue },
      { k:'banking', ok: !!b.bank_name && !!b.bank_account_last4 },
      { k:'beneficial_owners', ok: bos.rows[0].c > 0 },
      { k:'kyc_approved', ok: b.kyc_status === 'approved' },
      { k:'master_signed', ok: b.master_agreement_signed === true },
      { k:'bank_verified', ok: b.bank_verified === true }
    ];
    const completed = checks.filter(c => c.ok).length;
    const score = Math.round((completed / checks.length) * 100);
    res.json({ score, completed, total: checks.length, checks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// GET /api/borrowers/stats - KPIs
// ============================================================================
router.get('/api/borrowers/stats', async (req, res) => {
  try {
    const r = await global.db.query(`
      SELECT
        COUNT(*)::int as total,
        SUM(CASE WHEN kyc_status = 'approved' THEN 1 ELSE 0 END)::int as approved,
        SUM(CASE WHEN kyc_status = 'pending' THEN 1 ELSE 0 END)::int as pending,
        SUM(CASE WHEN kyc_status = 'rejected' THEN 1 ELSE 0 END)::int as rejected,
        SUM(CASE WHEN master_agreement_signed THEN 1 ELSE 0 END)::int as master_signed,
        SUM(CASE WHEN bank_verified THEN 1 ELSE 0 END)::int as bank_verified
      FROM borrower_entities
    `);
    const byRole = await global.db.query(`
      SELECT borrower_role, COUNT(*)::int as count
      FROM borrower_entities
      WHERE borrower_role IS NOT NULL
      GROUP BY borrower_role
    `);
    res.json({ summary: r.rows[0], by_role: byRole.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
