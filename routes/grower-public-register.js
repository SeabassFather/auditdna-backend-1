// ============================================================================
// GROWER PUBLIC REGISTRATION ROUTE
// Save to: C:\AuditDNA\backend\routes\grower-public-register.js
// Mount in server.js: app.use('/api/growers', require('./routes/grower-public-register'));
// ============================================================================
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const bcrypt  = require('bcryptjs');

// â”€â”€ POST /api/growers/register-public â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called from the login card Register form (no auth required)
router.post('/register-public', async (req, res) => {
  const {
    entityType, companyLegal, ein, state, city, pacaNum,
    gapCert, globalGap, sqf, brc, fsmaTeir, waterTests, soilTests, traceability,
    contactName, contactEmail, contactPhone, notes,
    // Products from role-selector context
    commodities, region
  } = req.body;

  if (!companyLegal || !contactEmail) {
    return res.status(400).json({ error: 'Company name and contact email are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into growers table
    const growerResult = await client.query(`
      INSERT INTO growers (
        company_name, entity_type, ein, state, city, country,
        paca_num, gap_cert, global_gap, sqf_cert, brc_cert,
        fsma_tier, water_tests, soil_tests, traceability,
        first_name, last_name, email, phone, notes,
        commodities, region, status, risk_tier,
        compliance_status, registered_at
      ) VALUES (
        $1,$2,$3,$4,$5,'Mexico',
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,$18,$19,
        $20,$21,'pending','T0',
        'pending_review', NOW()
      ) RETURNING id`,
      [
        companyLegal, entityType||'grower', ein||null, state||null, city||null,
        pacaNum||null, gapCert||false, globalGap||false, sqf||false, brc||false,
        parseInt(fsmaTeir)||1, waterTests||false, soilTests||false, traceability||false,
        contactName?.split(' ')[0]||contactName||'',
        contactName?.split(' ').slice(1).join(' ')||'',
        contactEmail, contactPhone||null, notes||null,
        commodities||null, region||null
      ]
    );
    const growerId = growerResult.rows[0].id;

    // 2. Create pending auth_users record so grower can log in once approved
    const tempPassword = `Grower${growerId}#${new Date().getFullYear()}`;
    const hash = await bcrypt.hash(tempPassword, 10);
    await client.query(`
      INSERT INTO auth_users (email, password_hash, name, role, status, grower_id)
      VALUES ($1, $2, $3, 'grower', 'pending', $4)
      ON CONFLICT (email) DO UPDATE SET grower_id=$4, status='pending', role='grower'`,
      [contactEmail, hash, contactName||companyLegal, growerId]
    ).catch(() => {
      // auth_users may not have grower_id column â€” insert without it
      return client.query(`
        INSERT INTO auth_users (email, password_hash, name, role, status)
        VALUES ($1, $2, $3, 'grower', 'pending')
        ON CONFLICT (email) DO UPDATE SET status='pending', role='grower'`,
        [contactEmail, hash, contactName||companyLegal]
      );
    });

    // 3. Fire Brain event
    await client.query(`
      INSERT INTO brain_events (type, payload, created_at)
      VALUES ('GROWER_REGISTRATION_SUBMITTED', $1, NOW())`,
      [JSON.stringify({ growerId, company: companyLegal, email: contactEmail, entityType, commodities, region, fsmaTeir })]
    ).catch(() => {}); // brain_events table may not exist â€” non-fatal

    await client.query('COMMIT');

    // 4. Broadcast via Node global event (picked up by Brain.js if running)
    try {
      if (global.__auditDNABrain?.emit) {
        global.__auditDNABrain.emit('GROWER_REGISTRATION_SUBMITTED', {
          growerId, company: companyLegal, email: contactEmail, commodities
        });
      }
    } catch {}

    return res.json({
      success: true,
      growerId,
      message: `Registration received for ${companyLegal}. Our team will review and contact you at ${contactEmail} within 1-2 business days with your access credentials.`,
      nextSteps: [
        'Your application is under review',
        'You will receive login credentials once approved',
        'A Mexausa Food Group representative will contact you directly'
      ]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Grower public register error:', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again or contact Saul@mexausafg.com' });
  } finally {
    client.release();
  }
});

// â”€â”€ PATCH /api/growers/:id/activate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called by admin (GrowerMaster activation queue) to approve a pending grower
router.patch('/:id/activate', async (req, res) => {
  const { id } = req.params;
  const { tier, notes, approvedBy } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE growers SET
        status='active', risk_tier=$1, compliance_status='approved',
        activated_at=NOW(), admin_notes=$2
      WHERE id=$3 RETURNING *`,
      [tier||'T0', notes||null, id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Grower not found' });
    }

    const grower = result.rows[0];

    // Activate auth_users record
    await client.query(
      `UPDATE auth_users SET status='active' WHERE email=$1`,
      [grower.email]
    ).catch(() => {});

    // Fire Brain event
    await client.query(`
      INSERT INTO brain_events (type, payload, created_at)
      VALUES ('GROWER_ACTIVATED', $1, NOW())`,
      [JSON.stringify({ growerId: id, company: grower.company_name, email: grower.email, commodities: grower.commodities, tier: tier||'T0' })]
    ).catch(() => {});

    await client.query('COMMIT');

    return res.json({
      success: true,
      grower,
      message: `${grower.company_name} activated successfully`,
      intelligence_trigger: {
        commodities: grower.commodities,
        region: grower.region || grower.state,
        action: 'USDA_INTELLIGENCE_QUERY + BUYER_MATCH + CAMPAIGN_SUGGESTION'
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Grower activate error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// â”€â”€ PATCH /api/growers/:id/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    await global.db.query(
      `UPDATE growers SET status='rejected', admin_notes=$1 WHERE id=$2`,
      [reason||'Application not approved', id]
    );
    await global.db.query(
      `UPDATE auth_users SET status='suspended'
       WHERE email=(SELECT email FROM growers WHERE id=$1)`, [id]
    ).catch(() => {});
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// â”€â”€ GET /api/growers/pending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns all growers with status='pending' for the admin approval queue
router.get('/pending', async (req, res) => {
  try {
    const result = await global.db.query(`
      SELECT id, company_name, entity_type, email, phone, city, state, country,
             commodities, region, fsma_tier, gap_cert, global_gap,
             compliance_status, registered_at, notes, contact_email
      FROM growers
      WHERE status='pending'
      ORDER BY registered_at DESC
    `);
    return res.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    return res.status(500).json({ error: err.message, data: [] });
  }
});

module.exports = router;

