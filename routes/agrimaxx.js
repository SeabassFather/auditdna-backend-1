// ============================================================
// C:\AuditDNA\backend\routes\agrimaxx.js
// Agri-Maxx Water Energy System — Campaign API Routes
// Register in server.js: app.use('/api/agrimaxx', require('./routes/agrimaxx'));
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// GET /api/agrimaxx/contacts
// Query params: track=A|B, segment, language=en|es, limit, offset
// ============================================================
router.get('/contacts', async (req, res) => {
  try {
    const { track, segment, language, limit = 500, offset = 0 } = req.query;

    let conditions = ['opt_out = false'];
    const params = [];
    let i = 1;

    if (track === 'A') {
      conditions.push(`contact_track = 'A'`);
    } else if (track === 'B') {
      conditions.push(`contact_track = 'B'`);
    }

    if (segment) {
      conditions.push(`industry_segment = $${i++}`);
      params.push(segment);
    }

    if (language === 'es') {
      conditions.push(`preferred_language = 'es'`);
    } else if (language === 'en') {
      conditions.push(`preferred_language = 'en'`);
    }

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT
        id, first_name, last_name,
        CONCAT(first_name, ' ', last_name) AS name,
        email, company, title, phone,
        city, state_province, country,
        contact_track, industry_segment,
        crop_focus, facility_type,
        water_use_daily_gallons,
        preferred_language, lead_score,
        crm_stage, source_tag, tags
      FROM ag_contacts
      ${where}
      ORDER BY lead_score DESC, company ASC
      LIMIT $${i++} OFFSET $${i}
    `;

    const result = await db.query(query, params);

    // Count
    const countQuery = `SELECT COUNT(*) FROM ag_contacts ${where}`;
    const countResult = await db.query(countQuery, params.slice(0, params.length - 2));

    res.json({
      success: true,
      total: parseInt(countResult.rows[0].count),
      count: result.rows.length,
      contacts: result.rows
    });
  } catch (err) {
    console.error('[agrimaxx /contacts]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GET /api/agrimaxx/campaigns
// Returns all Agri-Maxx campaign templates
// ============================================================
router.get('/campaigns', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, campaign_code, campaign_name, campaign_track,
        sequence_day, language, subject_line, preview_text,
        body_html, status, created_at
      FROM agrimaxx_campaigns
      WHERE status = 'ACTIVE'
      ORDER BY campaign_track, sequence_day, language
    `);

    res.json({ success: true, campaigns: result.rows });
  } catch (err) {
    console.error('[agrimaxx /campaigns]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GET /api/agrimaxx/stats
// Dashboard stats for the campaign module
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const [contacts, sends, optOuts, scores] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE contact_track = 'A') AS track_a,
          COUNT(*) FILTER (WHERE contact_track = 'B') AS track_b,
          COUNT(*) FILTER (WHERE preferred_language = 'es') AS spanish,
          COUNT(*) FILTER (WHERE opt_out = true) AS opted_out
        FROM ag_contacts
      `),
      db.query(`
        SELECT
          COUNT(*) AS total_sent,
          COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
          COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
          COUNT(*) FILTER (WHERE replied_at IS NOT NULL) AS replied
        FROM campaign_sends
        WHERE campaign_id IN (SELECT id FROM agrimaxx_campaigns)
      `),
      db.query(`SELECT COUNT(*) AS count FROM ag_contacts WHERE opt_out = true`),
      db.query(`
        SELECT
          AVG(score) AS avg_score,
          COUNT(*) FILTER (WHERE score >= 80) AS hot_leads,
          COUNT(*) FILTER (WHERE score >= 50 AND score < 80) AS warm_leads,
          COUNT(*) FILTER (WHERE score < 50) AS cold_leads
        FROM agrimaxx_lead_scores
        WHERE scored_at >= NOW() - INTERVAL '30 days'
      `)
    ]);

    const c = contacts.rows[0];
    const s = sends.rows[0];
    const sc = scores.rows[0];

    const openRate = s.total_sent > 0
      ? ((s.opened / s.total_sent) * 100).toFixed(1)
      : '0.0';
    const clickRate = s.opened > 0
      ? ((s.clicked / s.opened) * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      contacts: {
        total: parseInt(c.total),
        track_a: parseInt(c.track_a),
        track_b: parseInt(c.track_b),
        spanish: parseInt(c.spanish),
        opted_out: parseInt(c.opted_out)
      },
      sends: {
        total: parseInt(s.total_sent),
        opened: parseInt(s.opened),
        clicked: parseInt(s.clicked),
        replied: parseInt(s.replied),
        open_rate: parseFloat(openRate),
        click_rate: parseFloat(clickRate)
      },
      leads: {
        avg_score: sc.avg_score ? parseFloat(parseFloat(sc.avg_score).toFixed(1)) : 0,
        hot: parseInt(sc.hot_leads) || 0,
        warm: parseInt(sc.warm_leads) || 0,
        cold: parseInt(sc.cold_leads) || 0
      }
    });
  } catch (err) {
    console.error('[agrimaxx /stats]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/agrimaxx/record-send
// Body: { contactId, campaignId, sentAt }
// ============================================================
router.post('/record-send', async (req, res) => {
  try {
    const { contactId, campaignId, sentAt } = req.body;

    if (!contactId || !campaignId) {
      return res.status(400).json({ success: false, error: 'contactId and campaignId required' });
    }

    const result = await db.query(`
      INSERT INTO campaign_sends (contact_id, campaign_id, sent_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (contact_id, campaign_id) DO NOTHING
      RETURNING id
    `, [contactId, campaignId, sentAt || new Date()]);

    // Update lead score on send
    await db.query(`
      INSERT INTO agrimaxx_lead_scores (contact_id, score, score_reason)
      VALUES ($1, 10, 'Email sent - initial contact')
      ON CONFLICT (contact_id)
      DO UPDATE SET
        score = LEAST(agrimaxx_lead_scores.score + 5, 100),
        score_reason = 'Follow-up send',
        scored_at = NOW()
    `, [contactId]);

    res.json({ success: true, sendId: result.rows[0]?.id });
  } catch (err) {
    console.error('[agrimaxx /record-send]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/agrimaxx/track-open
// Body: { sendId }
// ============================================================
router.post('/track-open', async (req, res) => {
  try {
    const { sendId } = req.body;
    if (!sendId) return res.status(400).json({ success: false, error: 'sendId required' });

    await db.query(`
      UPDATE campaign_sends SET opened_at = NOW()
      WHERE id = $1 AND opened_at IS NULL
    `, [sendId]);

    // Boost lead score on open
    await db.query(`
      UPDATE agrimaxx_lead_scores
      SET score = LEAST(score + 15, 100),
          score_reason = 'Email opened',
          scored_at = NOW()
      WHERE contact_id = (SELECT contact_id FROM campaign_sends WHERE id = $1)
    `, [sendId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[agrimaxx /track-open]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/agrimaxx/track-click
// Body: { sendId }
// ============================================================
router.post('/track-click', async (req, res) => {
  try {
    const { sendId } = req.body;
    if (!sendId) return res.status(400).json({ success: false, error: 'sendId required' });

    await db.query(`
      UPDATE campaign_sends SET clicked_at = NOW()
      WHERE id = $1 AND clicked_at IS NULL
    `, [sendId]);

    await db.query(`
      UPDATE agrimaxx_lead_scores
      SET score = LEAST(score + 25, 100),
          score_reason = 'Link clicked — high intent',
          scored_at = NOW()
      WHERE contact_id = (SELECT contact_id FROM campaign_sends WHERE id = $1)
    `, [sendId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[agrimaxx /track-click]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/agrimaxx/opt-out
// Body: { email, reason }
// ============================================================
router.post('/opt-out', async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    const result = await db.query(`
      UPDATE ag_contacts
      SET
        opt_out = true,
        opt_out_reason = $2,
        opt_out_date = NOW(),
        updated_at = NOW()
      WHERE LOWER(email) = LOWER($1)
      RETURNING id, email, company
    `, [email, reason || 'Unsubscribe request']);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    res.json({
      success: true,
      message: 'Contact opted out successfully',
      contact: result.rows[0]
    });
  } catch (err) {
    console.error('[agrimaxx /opt-out]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/agrimaxx/contacts
// Add a single new contact
// ============================================================
router.post('/contacts', async (req, res) => {
  try {
    const {
      first_name, last_name, email, company, title, phone,
      city, state_province, country, contact_track,
      industry_segment, crop_focus, facility_type,
      water_use_daily_gallons, preferred_language,
      source_tag, tags
    } = req.body;

    if (!email || !first_name) {
      return res.status(400).json({ success: false, error: 'email and first_name required' });
    }

    const result = await db.query(`
      INSERT INTO ag_contacts (
        first_name, last_name, email, company, title, phone,
        city, state_province, country, contact_track,
        industry_segment, crop_focus, facility_type,
        water_use_daily_gallons, preferred_language,
        source_tag, tags
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, company
    `, [
      first_name, last_name, email, company, title, phone,
      city, state_province, country, contact_track || 'A',
      industry_segment, crop_focus, facility_type,
      water_use_daily_gallons, preferred_language || 'en',
      source_tag || 'manual', tags || []
    ]);

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    res.status(201).json({ success: true, contact: result.rows[0] });
  } catch (err) {
    console.error('[agrimaxx POST /contacts]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/agrimaxx/contacts/bulk
// Bulk import — array of contacts, deduped by email
// Body: { contacts: [...], source_tag: 'wga_import' }
// ============================================================
router.post('/contacts/bulk', async (req, res) => {
  const { contacts, source_tag } = req.body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, error: 'contacts array required' });
  }

  const inserted = [];
  const skipped = [];

  try {
    for (const c of contacts) {
      if (!c.email || !c.first_name) { skipped.push(c.email || 'no-email'); continue; }

      try {
        const result = await db.query(`
          INSERT INTO ag_contacts (
            first_name, last_name, email, company, title, phone,
            city, state_province, country, contact_track,
            industry_segment, crop_focus, preferred_language,
            source_tag, tags
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `, [
          c.first_name, c.last_name || '', c.email,
          c.company || '', c.title || '', c.phone || '',
          c.city || '', c.state_province || '', c.country || 'USA',
          c.contact_track || 'A', c.industry_segment || 'grower',
          c.crop_focus || '', c.preferred_language || 'en',
          source_tag || c.source_tag || 'bulk_import',
          c.tags || []
        ]);
        if (result.rows.length > 0) inserted.push(c.email);
        else skipped.push(c.email);
      } catch (rowErr) {
        skipped.push(c.email);
      }
    }

    res.json({
      success: true,
      inserted: inserted.length,
      skipped: skipped.length,
      total_processed: contacts.length
    });
  } catch (err) {
    console.error('[agrimaxx /contacts/bulk]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;