// routes/rfq-engine.js
// AuditDNA — Blind RFQ / PO / Stage Gate / Lender Ping Engine
// MFGINC sees real names. All external parties see IDs only.

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── SETUP TABLES ────────────────────────────────────────────────────────────
router.post('/setup-tables', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blind_ids (
        id SERIAL PRIMARY KEY,
        real_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL,
        blind_id VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS commodity_listings (
        id SERIAL PRIMARY KEY,
        grower_id INTEGER NOT NULL,
        blind_grower_id VARCHAR(20),
        commodity VARCHAR(100) NOT NULL,
        region VARCHAR(100),
        country VARCHAR(60),
        volume_lbs INTEGER,
        volume_unit VARCHAR(20) DEFAULT 'lbs',
        certifications JSONB DEFAULT '[]',
        availability_start DATE,
        availability_end DATE,
        fob_price_min NUMERIC(10,2),
        fob_price_max NUMERIC(10,2),
        incoterms VARCHAR(20),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rfq_requests (
        id SERIAL PRIMARY KEY,
        rfq_number VARCHAR(30) UNIQUE NOT NULL,
        buyer_id INTEGER NOT NULL,
        blind_buyer_id VARCHAR(20),
        commodity VARCHAR(100) NOT NULL,
        quantity_lbs INTEGER,
        delivery_window_start DATE,
        delivery_window_end DATE,
        price_target NUMERIC(10,2),
        incoterms VARCHAR(20),
        notes TEXT,
        status VARCHAR(30) DEFAULT 'open',
        matched_growers JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rfq_responses (
        id SERIAL PRIMARY KEY,
        rfq_id INTEGER REFERENCES rfq_requests(id),
        grower_id INTEGER NOT NULL,
        blind_grower_id VARCHAR(20),
        price_per_unit NUMERIC(10,2),
        volume_available INTEGER,
        delivery_terms TEXT,
        incoterms VARCHAR(20),
        notes TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(30) UNIQUE NOT NULL,
        rfq_id INTEGER REFERENCES rfq_requests(id),
        buyer_id INTEGER NOT NULL,
        blind_buyer_id VARCHAR(20),
        grower_id INTEGER NOT NULL,
        blind_grower_id VARCHAR(20),
        commodity VARCHAR(100),
        quantity_lbs INTEGER,
        unit_price NUMERIC(10,2),
        total_value NUMERIC(12,2),
        delivery_date DATE,
        port_of_entry VARCHAR(100),
        incoterms VARCHAR(20),
        factoring_requested BOOLEAN DEFAULT FALSE,
        factoring_status VARCHAR(30),
        lender_id INTEGER,
        blind_lender_id VARCHAR(20),
        stage INTEGER DEFAULT 1,
        commission_signed BOOLEAN DEFAULT FALSE,
        nda_buyer_signed BOOLEAN DEFAULT FALSE,
        nda_grower_signed BOOLEAN DEFAULT FALSE,
        deal_terms_signed BOOLEAN DEFAULT FALSE,
        escrow_funded BOOLEAN DEFAULT FALSE,
        disclosure_released BOOLEAN DEFAULT FALSE,
        delivery_confirmed BOOLEAN DEFAULT FALSE,
        payment_released BOOLEAN DEFAULT FALSE,
        status VARCHAR(30) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lender_pings (
        id SERIAL PRIMARY KEY,
        po_id INTEGER REFERENCES purchase_orders(id),
        transaction_id VARCHAR(30),
        commodity VARCHAR(100),
        amount NUMERIC(12,2),
        delivery_date DATE,
        buyer_credit_tier INTEGER,
        grower_compliance_tier INTEGER,
        lender_id INTEGER,
        blind_lender_id VARCHAR(20),
        status VARCHAR(30) DEFAULT 'pending',
        terms_offered JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS deal_messages (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER,
        po_id INTEGER,
        sender_id INTEGER,
        sender_role VARCHAR(30),
        blind_sender_id VARCHAR(20),
        message TEXT,
        is_admin_visible BOOLEAN DEFAULT TRUE,
        read_by_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS deal_events (
        id SERIAL PRIMARY KEY,
        po_id INTEGER,
        rfq_id INTEGER,
        event_type VARCHAR(60),
        user_id INTEGER,
        blind_user_id VARCHAR(20),
        role VARCHAR(30),
        module VARCHAR(60),
        action TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS traceability_certs (
        id SERIAL PRIMARY KEY,
        po_id INTEGER REFERENCES purchase_orders(id),
        grower_id INTEGER,
        cert_type VARCHAR(60),
        uploaded BOOLEAN DEFAULT FALSE,
        upload_date TIMESTAMP,
        expiry_date DATE,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    res.json({ success: true, message: 'All RFQ/PO/Deal tables created.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BLIND ID GENERATOR ───────────────────────────────────────────────────────
async function getOrCreateBlindId(real_id, role) {
  const prefix = role === 'buyer' ? 'BYR' : role === 'grower' ? 'GRW' : role === 'lender' ? 'LND' : 'USR';
  const existing = await pool.query('SELECT blind_id FROM blind_ids WHERE real_id=$1 AND role=$2', [real_id, role]);
  if (existing.rows.length > 0) return existing.rows[0].blind_id;
  const blind_id = `${prefix}-${String(real_id).padStart(4, '0')}${Math.floor(Math.random() * 90 + 10)}`;
  await pool.query('INSERT INTO blind_ids (real_id, role, blind_id) VALUES ($1,$2,$3)', [real_id, role, blind_id]);
  return blind_id;
}

// ─── LOG DEAL EVENT ───────────────────────────────────────────────────────────
async function logEvent(po_id, rfq_id, event_type, user_id, role, module, action, metadata = {}) {
  const blind_user_id = await getOrCreateBlindId(user_id, role);
  await pool.query(
    `INSERT INTO deal_events (po_id, rfq_id, event_type, user_id, blind_user_id, role, module, action, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [po_id, rfq_id, event_type, user_id, blind_user_id, role, module, action, JSON.stringify(metadata)]
  );
}

// ─── COMMODITY BLIND SEARCH ───────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { commodity, region, country, min_volume, certifications } = req.query;
  try {
    let query = `
      SELECT
        cl.id, cl.blind_grower_id, cl.commodity, cl.region, cl.country,
        cl.volume_lbs, cl.certifications, cl.availability_start, cl.availability_end,
        cl.fob_price_min, cl.fob_price_max, cl.incoterms
      FROM commodity_listings cl
      WHERE cl.active = TRUE
    `;
    const params = [];
    if (commodity) { params.push(`%${commodity}%`); query += ` AND cl.commodity ILIKE $${params.length}`; }
    if (region)    { params.push(`%${region}%`);    query += ` AND cl.region ILIKE $${params.length}`; }
    if (country)   { params.push(country);           query += ` AND cl.country = $${params.length}`; }
    if (min_volume){ params.push(parseInt(min_volume)); query += ` AND cl.volume_lbs >= $${params.length}`; }
    query += ' ORDER BY cl.created_at DESC LIMIT 20';

    const result = await pool.query(query, params);

    // Ensure all growers have blind IDs
    for (const row of result.rows) {
      if (!row.blind_grower_id) {
        row.blind_grower_id = await getOrCreateBlindId(row.id, 'grower');
      }
    }

    res.json({ results: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GROWER: POST LISTING ─────────────────────────────────────────────────────
router.post('/listings', async (req, res) => {
  const { grower_id, commodity, region, country, volume_lbs, certifications, availability_start, availability_end, fob_price_min, fob_price_max, incoterms } = req.body;
  try {
    const blind_grower_id = await getOrCreateBlindId(grower_id, 'grower');
    const result = await pool.query(
      `INSERT INTO commodity_listings
       (grower_id, blind_grower_id, commodity, region, country, volume_lbs, certifications, availability_start, availability_end, fob_price_min, fob_price_max, incoterms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [grower_id, blind_grower_id, commodity, region, country, volume_lbs, JSON.stringify(certifications || []), availability_start, availability_end, fob_price_min, fob_price_max, incoterms]
    );
    await logEvent(null, null, 'LISTING_POSTED', grower_id, 'grower', 'GrowerPortal', `Posted listing for ${commodity}`, { listing_id: result.rows[0].id });
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BUYER: SUBMIT RFQ ────────────────────────────────────────────────────────
router.post('/rfq', async (req, res) => {
  const { buyer_id, commodity, quantity_lbs, delivery_window_start, delivery_window_end, price_target, incoterms, notes, matched_listing_ids } = req.body;
  try {
    const blind_buyer_id = await getOrCreateBlindId(buyer_id, 'buyer');
    const rfq_number = `RFQ-${Date.now()}`;
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Resolve matched growers blind IDs
    const matchedGrowers = [];
    if (matched_listing_ids && matched_listing_ids.length > 0) {
      const listings = await pool.query(
        'SELECT grower_id, blind_grower_id FROM commodity_listings WHERE id = ANY($1)',
        [matched_listing_ids]
      );
      for (const l of listings.rows) {
        const bid = l.blind_grower_id || await getOrCreateBlindId(l.grower_id, 'grower');
        matchedGrowers.push({ grower_id: l.grower_id, blind_grower_id: bid });
      }
    }

    const result = await pool.query(
      `INSERT INTO rfq_requests
       (rfq_number, buyer_id, blind_buyer_id, commodity, quantity_lbs, delivery_window_start, delivery_window_end, price_target, incoterms, notes, matched_growers, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [rfq_number, buyer_id, blind_buyer_id, commodity, quantity_lbs, delivery_window_start, delivery_window_end, price_target, incoterms, notes, JSON.stringify(matchedGrowers), expires_at]
    );

    const rfq = result.rows[0];

    // Notify matched growers via Brain
    for (const g of matchedGrowers) {
      await pool.query(
        `INSERT INTO deal_messages (rfq_id, sender_id, sender_role, blind_sender_id, message, is_admin_visible)
         VALUES ($1, $2, 'system', 'SYSTEM', $3, TRUE)`,
        [rfq.id, buyer_id, `An Agriculture Intelligence buyer (${blind_buyer_id}) has submitted an RFQ for ${commodity}. Log in to respond.`]
      ).catch(() => {});
    }

    await logEvent(null, rfq.id, 'RFQ_SUBMITTED', buyer_id, 'buyer', 'BuyerPortal', `RFQ submitted for ${commodity}`, { rfq_number, matched_count: matchedGrowers.length });

    res.json({ success: true, rfq, matched_growers_notified: matchedGrowers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GROWER: VIEW INCOMING RFQs ───────────────────────────────────────────────
router.get('/rfq/grower/:grower_id', async (req, res) => {
  const { grower_id } = req.params;
  try {
    const blind_grower_id = await getOrCreateBlindId(parseInt(grower_id), 'grower');
    const result = await pool.query(
      `SELECT rfq_number, commodity, quantity_lbs, delivery_window_start, delivery_window_end, price_target, incoterms, notes, status, expires_at, created_at
       FROM rfq_requests
       WHERE matched_growers::text LIKE $1 AND status = 'open'
       ORDER BY created_at DESC`,
      [`%${blind_grower_id}%`]
    );
    res.json({ rfqs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GROWER: SUBMIT OFFER RESPONSE ───────────────────────────────────────────
router.post('/rfq/:rfq_id/respond', async (req, res) => {
  const { rfq_id } = req.params;
  const { grower_id, price_per_unit, volume_available, delivery_terms, incoterms, notes } = req.body;
  try {
    const blind_grower_id = await getOrCreateBlindId(grower_id, 'grower');
    const result = await pool.query(
      `INSERT INTO rfq_responses (rfq_id, grower_id, blind_grower_id, price_per_unit, volume_available, delivery_terms, incoterms, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [rfq_id, grower_id, blind_grower_id, price_per_unit, volume_available, delivery_terms, incoterms, notes]
    );
    await logEvent(null, parseInt(rfq_id), 'OFFER_SUBMITTED', grower_id, 'grower', 'GrowerPortal', `Offer submitted for RFQ ${rfq_id}`, {});
    res.json({ success: true, response: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BUYER: VIEW OFFERS (BLIND) ───────────────────────────────────────────────
router.get('/rfq/:rfq_id/offers/:buyer_id', async (req, res) => {
  const { rfq_id, buyer_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.id, r.blind_grower_id, r.price_per_unit, r.volume_available, r.delivery_terms, r.incoterms, r.notes, r.status, r.created_at
       FROM rfq_responses r
       JOIN rfq_requests rq ON rq.id = r.rfq_id
       WHERE r.rfq_id = $1 AND rq.buyer_id = $2`,
      [rfq_id, buyer_id]
    );
    res.json({ offers: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BUYER: CREATE PO ─────────────────────────────────────────────────────────
router.post('/po', async (req, res) => {
  const { rfq_id, buyer_id, grower_id, commodity, quantity_lbs, unit_price, delivery_date, port_of_entry, incoterms, factoring_requested } = req.body;
  try {
    const blind_buyer_id = await getOrCreateBlindId(buyer_id, 'buyer');
    const blind_grower_id = await getOrCreateBlindId(grower_id, 'grower');
    const po_number = `PO-${Date.now()}`;
    const total_value = quantity_lbs * unit_price;

    const result = await pool.query(
      `INSERT INTO purchase_orders
       (po_number, rfq_id, buyer_id, blind_buyer_id, grower_id, blind_grower_id, commodity, quantity_lbs, unit_price, total_value, delivery_date, port_of_entry, incoterms, factoring_requested, stage, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,1,'draft') RETURNING *`,
      [po_number, rfq_id, buyer_id, blind_buyer_id, grower_id, blind_grower_id, commodity, quantity_lbs, unit_price, total_value, delivery_date, port_of_entry, incoterms, factoring_requested || false]
    );

    const po = result.rows[0];

    // Seed traceability cert checklist
    const certs = ['water_cert', 'soil_cert', 'gap_cert', 'fsma_records', 'phytosanitary', 'senasica', 'globalgap'];
    for (const cert of certs) {
      await pool.query(
        'INSERT INTO traceability_certs (po_id, grower_id, cert_type) VALUES ($1,$2,$3)',
        [po.id, grower_id, cert]
      );
    }

    // If factoring requested — ping lenders blind
    if (factoring_requested) {
      const buyer_credit_tier = 2;
      const grower_compliance_tier = 3;
      await pool.query(
        `INSERT INTO lender_pings (po_id, transaction_id, commodity, amount, delivery_date, buyer_credit_tier, grower_compliance_tier, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
        [po.id, po_number, commodity, total_value, delivery_date, buyer_credit_tier, grower_compliance_tier]
      );
    }

    await logEvent(po.id, rfq_id, 'PO_CREATED', buyer_id, 'buyer', 'BuyerPortal', `PO created: ${po_number}`, { total_value, factoring_requested });

    res.json({ success: true, po });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STAGE GATE: UPDATE DOCUMENT STATUS ──────────────────────────────────────
router.post('/po/:po_id/stage-gate', async (req, res) => {
  const { po_id } = req.params;
  const { field, value, user_id, role } = req.body;
  const allowed = ['commission_signed','nda_buyer_signed','nda_grower_signed','deal_terms_signed','escrow_funded','delivery_confirmed','payment_released'];
  if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field' });

  try {
    await pool.query(`UPDATE purchase_orders SET ${field}=$1, updated_at=NOW() WHERE id=$2`, [value, po_id]);

    // Check if all stage gate docs signed — release disclosure
    const po = await pool.query('SELECT * FROM purchase_orders WHERE id=$1', [po_id]);
    const p = po.rows[0];
    if (p.commission_signed && p.nda_buyer_signed && p.nda_grower_signed && p.deal_terms_signed && !p.disclosure_released) {
      await pool.query('UPDATE purchase_orders SET disclosure_released=TRUE, stage=4, status=$1, updated_at=NOW() WHERE id=$2', ['disclosure_released', po_id]);
    }

    await logEvent(parseInt(po_id), null, 'STAGE_GATE_UPDATE', user_id, role, 'StageGate', `${field} set to ${value}`, {});
    res.json({ success: true, field, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TRACEABILITY: CERT UPLOAD STATUS ────────────────────────────────────────
router.post('/po/:po_id/cert/:cert_type', async (req, res) => {
  const { po_id, cert_type } = req.params;
  const { grower_id, expiry_date } = req.body;
  try {
    await pool.query(
      `UPDATE traceability_certs SET uploaded=TRUE, upload_date=NOW(), expiry_date=$1
       WHERE po_id=$2 AND cert_type=$3`,
      [expiry_date, po_id, cert_type]
    );
    await logEvent(parseInt(po_id), null, 'CERT_UPLOADED', grower_id, 'grower', 'ComplianceVault', `Uploaded ${cert_type}`, {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BUYER: TRACEABILITY CHECKLIST (BLIND) ───────────────────────────────────
router.get('/po/:po_id/traceability/:buyer_id', async (req, res) => {
  const { po_id, buyer_id } = req.params;
  try {
    const po = await pool.query('SELECT buyer_id FROM purchase_orders WHERE id=$1', [po_id]);
    if (!po.rows.length || po.rows[0].buyer_id !== parseInt(buyer_id)) return res.status(403).json({ error: 'Unauthorized' });

    const certs = await pool.query(
      'SELECT cert_type, uploaded, upload_date, expiry_date, verified FROM traceability_certs WHERE po_id=$1',
      [po_id]
    );
    res.json({ checklist: certs.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MESSAGE TOGGLE: SEND MESSAGE ────────────────────────────────────────────
router.post('/message', async (req, res) => {
  const { sender_id, sender_role, po_id, rfq_id, message } = req.body;
  try {
    const blind_sender_id = await getOrCreateBlindId(sender_id, sender_role);
    await pool.query(
      `INSERT INTO deal_messages (deal_id, po_id, sender_id, sender_role, blind_sender_id, message, is_admin_visible, read_by_admin)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE)`,
      [rfq_id, po_id, sender_id, sender_role, blind_sender_id, message]
    );

    // Fire Brain notification to admin
    await pool.query(
      `INSERT INTO brain_events (event_type, payload, created_at) VALUES ('USER_MESSAGE', $1, NOW())`,
      [JSON.stringify({ sender_id, blind_sender_id, sender_role, po_id, rfq_id, message })]
    ).catch(() => {});

    await logEvent(po_id, rfq_id, 'MESSAGE_SENT', sender_id, sender_role, 'MessageToggle', 'User sent direct message to MFGINC', { po_id, rfq_id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: DEAL INTELLIGENCE CENTER ─────────────────────────────────────────
router.get('/admin/deals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        po.id, po.po_number, po.commodity, po.quantity_lbs, po.total_value,
        po.delivery_date, po.status, po.stage,
        po.blind_buyer_id, po.blind_grower_id,
        po.commission_signed, po.nda_buyer_signed, po.nda_grower_signed,
        po.deal_terms_signed, po.escrow_funded, po.disclosure_released,
        po.delivery_confirmed, po.payment_released,
        po.factoring_requested, po.factoring_status,
        po.created_at, po.updated_at,
        b.display_name AS buyer_name, b.username AS buyer_username,
        g.display_name AS grower_name, g.username AS grower_username
      FROM purchase_orders po
      LEFT JOIN users b ON b.id = po.buyer_id
      LEFT JOIN users g ON g.id = po.grower_id
      ORDER BY po.updated_at DESC
    `);

    res.json({ deals: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: UNREAD MESSAGES ───────────────────────────────────────────────────
router.get('/admin/messages/unread', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dm.*, u.display_name AS sender_name
      FROM deal_messages dm
      LEFT JOIN users u ON u.id = dm.sender_id
      WHERE dm.read_by_admin = FALSE AND dm.is_admin_visible = TRUE
      ORDER BY dm.created_at DESC
    `);
    res.json({ messages: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: MARK MESSAGE READ ─────────────────────────────────────────────────
router.post('/admin/messages/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE deal_messages SET read_by_admin=TRUE WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: DEAL EVENT LOG ────────────────────────────────────────────────────
router.get('/admin/events/:po_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM deal_events WHERE po_id=$1 ORDER BY created_at ASC',
      [req.params.po_id]
    );
    res.json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LENDER: VIEW PING ────────────────────────────────────────────────────────
router.get('/lender/pings/:lender_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT transaction_id, commodity, amount, delivery_date, buyer_credit_tier, grower_compliance_tier, status, created_at
       FROM lender_pings WHERE lender_id=$1 OR lender_id IS NULL ORDER BY created_at DESC`,
      [req.params.lender_id]
    );
    res.json({ pings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LENDER: SUBMIT TERMS ─────────────────────────────────────────────────────
router.post('/lender/pings/:ping_id/terms', async (req, res) => {
  const { lender_id, terms } = req.body;
  try {
    const blind_lender_id = await getOrCreateBlindId(lender_id, 'lender');
    await pool.query(
      'UPDATE lender_pings SET lender_id=$1, blind_lender_id=$2, terms_offered=$3, status=$4 WHERE id=$5',
      [lender_id, blind_lender_id, JSON.stringify(terms), 'terms_submitted', req.params.ping_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
