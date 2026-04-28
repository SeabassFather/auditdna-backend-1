/**
 * C:\AuditDNA\backend\services\rfq-match-engine.js
 *
 * Match engine for reverse-RFQ marketplace.
 *  - Filters growers by commodity + spec match
 *  - Filters by logistics radius (delivery feasibility)
 *  - Ranks by GRS score
 *  - Tiered cascade notification (top 3 first, then top 7, then open)
 *  - Sealed-bid auction window 5 min, then top 3 advance to 5-min open round
 *  - Need signals: inventory pressure, GRS streak, distress flag
 *
 * Mount in server.js:
 *   const matchEngine = require('./services/rfq-match-engine');
 *   app.use('/api/rfq', matchEngine.router);
 */

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const getPool = require('../db');
const pool = getPool();

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const AUCTION_TOTAL_MIN = 10;     // total auction window
const SEALED_MIN = 5;              // sealed-bid round
const OPEN_MIN = 5;                // open round (top 3 visible)
const TIER_1_SIZE = 3;             // top 3 growers get first ping
const TIER_2_SIZE = 7;             // next 7 expand window
const SPOT_THRESHOLD = 1500;       // below = spot market, no auction
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'auditdna-agro-saul2026';

// ----------------------------------------------------------------------------
// Anonymous ID generator
// ----------------------------------------------------------------------------
function anonymousId(role, id) {
  // "Verified Grower #4421" / "Verified Buyer #1893"
  const r = (role === 'grower' ? 'Grower' : role === 'buyer' ? 'Buyer' : 'Party');
  const n = parseInt(id, 10) % 9999;
  return `Verified ${r} #${n.toString().padStart(4, '0')}`;
}

// ----------------------------------------------------------------------------
// Brain event helper
// ----------------------------------------------------------------------------
async function fireBrainEvent(client, rfqId, eventType, actorId, actorRole, payload) {
  await client.query(
    `INSERT INTO rfq_brain_events (rfq_id, event_type, actor_id, actor_role, payload)
     VALUES ($1,$2,$3,$4,$5)`,
    [rfqId, eventType, actorId, actorRole, JSON.stringify(payload || {})]
  );
}

// ----------------------------------------------------------------------------
// ntfy push (admin alerts) + native push placeholder
// ----------------------------------------------------------------------------
async function pushNtfy(title, message, priority = 'default', tags = []) {
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags.join(','),
      },
      body: message,
    });
  } catch (e) {
    console.error('[ntfy] push failed:', e.message);
  }
}

async function logNotification(client, rfqId, recipientId, recipientRole, channel, eventType, payload) {
  await client.query(
    `INSERT INTO rfq_notifications (rfq_id, recipient_id, recipient_role, channel, event_type, payload, delivered, delivered_at)
     VALUES ($1,$2,$3,$4,$5,$6, TRUE, NOW())`,
    [rfqId, recipientId, recipientRole, channel, eventType, JSON.stringify(payload || {})]
  );
}

// ----------------------------------------------------------------------------
// Match candidates - find growers who can fulfill
// ----------------------------------------------------------------------------
async function findMatchedGrowers(client, rfq) {
  // Strategy:
  // 1. Filter by commodity_category match in growers.commodities (or commodities_grown JSONB)
  // 2. Filter by destination logistics: grower's state/country can serve dest
  // 3. Optional: certifications, organic
  // 4. Rank by GRS score DESC
  //
  // Schema-tolerant: check what columns exist in growers table
  const growers = await client.query(`
    SELECT g.id, g.contact_name, g.legal_name, g.trade_name,
           g.email, g.phone, g.state_province, g.country,
           COALESCE(g.grs_score, 50) AS grs_score,
           COALESCE(g.commodities_grown, '[]'::jsonb) AS commodities,
           g.organic_certified
      FROM growers g
     WHERE g.email IS NOT NULL
       AND (
            g.commodities_grown::text ILIKE '%' || $1 || '%'
         OR g.commodities_grown::text ILIKE '%' || $2 || '%'
       )
     ORDER BY COALESCE(g.grs_score, 50) DESC
     LIMIT 50
  `, [rfq.commodity_category, rfq.commodity_subcategory]);

  // Compute need signals per grower
  const today = new Date().toISOString().slice(0, 10);
  const ranked = [];
  for (const g of growers.rows) {
    // signal_inventory_pressure: declared production within 7 days?
    const invQ = await client.query(`
      SELECT COUNT(*) AS c
        FROM grower_intel_yields
       WHERE grower_id = $1
         AND created_at > NOW() - INTERVAL '7 days'
    `).catch(() => ({ rows: [{ c: 0 }] }));
    const inventoryPressure = parseInt(invQ.rows[0]?.c || 0, 10) > 0;

    // signal_streak: days since last won deal
    const streakQ = await client.query(`
      SELECT EXTRACT(DAY FROM NOW() - MAX(locked_at))::INT AS days
        FROM rfq_deal_locks
       WHERE grower_id = $1
    `).catch(() => ({ rows: [{ days: 999 }] }));
    const streak = streakQ.rows[0]?.days || 999;

    ranked.push({
      grower_id: g.id,
      grs_score: g.grs_score,
      anonymous_id: anonymousId('grower', g.id),
      email: g.email,
      phone: g.phone,
      country: g.country,
      state: g.state_province,
      organic: g.organic_certified,
      signal_inventory_pressure: inventoryPressure,
      signal_streak: streak,
      signal_distress: false,  // grower-flagged manually in mini
    });
  }

  return ranked;
}

// ----------------------------------------------------------------------------
// Tiered cascade notification
// ----------------------------------------------------------------------------
async function cascadeNotify(rfq, growers) {
  if (!growers.length) return { notified: 0, tiers: 0 };

  const client = await pool.connect();
  let notified = 0;
  try {
    // Tier 1: top 3
    const tier1 = growers.slice(0, TIER_1_SIZE);
    for (const g of tier1) {
      await logNotification(client, rfq.id, g.grower_id, 'grower', 'webpush', 'NEW_RFQ_TIER1', {
        rfq_id: rfq.id,
        rfq_code: rfq.rfq_code,
        commodity: rfq.commodity_subcategory,
        quantity: rfq.quantity,
        unit: rfq.quantity_unit,
        delivery: rfq.delivery_date_start,
        destination: rfq.destination_state || rfq.destination_country,
        target_price: rfq.target_price,
        terms: rfq.terms,
        sealed_until: rfq.auction_ends_at,
      });
      notified++;
    }

    // Tier 2: next 7 (delayed by simulated 90s grace - in production this fires after a setTimeout/cron)
    const tier2 = growers.slice(TIER_1_SIZE, TIER_1_SIZE + TIER_2_SIZE);
    for (const g of tier2) {
      await logNotification(client, rfq.id, g.grower_id, 'grower', 'webpush', 'NEW_RFQ_TIER2', {
        rfq_id: rfq.id, rfq_code: rfq.rfq_code,
        commodity: rfq.commodity_subcategory,
        sealed_until: rfq.auction_ends_at,
      });
      notified++;
    }

    // Tier 3: rest
    const tier3 = growers.slice(TIER_1_SIZE + TIER_2_SIZE);
    for (const g of tier3) {
      await logNotification(client, rfq.id, g.grower_id, 'grower', 'webpush', 'NEW_RFQ_OPEN', {
        rfq_id: rfq.id, rfq_code: rfq.rfq_code,
        commodity: rfq.commodity_subcategory,
      });
      notified++;
    }

    await fireBrainEvent(client, rfq.id, 'CASCADE_NOTIFY_FIRED', null, 'system', {
      tier1: tier1.length, tier2: tier2.length, tier3: tier3.length, total: notified,
    });
  } catch (e) {
    console.error('[match] cascade failed:', e.message);
  } finally {
    client.release();
  }

  // Admin ntfy ping
  await pushNtfy(
    `[RFQ ${rfq.rfq_code}] ${rfq.commodity_subcategory} x ${rfq.quantity}${rfq.quantity_unit}`,
    `Notified ${notified} growers. Auction ends ${rfq.auction_ends_at}`,
    'high',
    ['rfq', 'cascade'],
  );

  return { notified, tier1: Math.min(TIER_1_SIZE, growers.length), tier2: Math.min(TIER_2_SIZE, Math.max(0, growers.length - TIER_1_SIZE)), tier3: Math.max(0, growers.length - TIER_1_SIZE - TIER_2_SIZE) };
}

// ============================================================================
// ROUTES
// ============================================================================

// ----------------------------------------------------------------------------
// POST /api/rfq/create - buyer posts a need
// ----------------------------------------------------------------------------
router.post('/create', async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    if (!b.buyer_id || !b.commodity_category || !b.commodity_subcategory || !b.quantity || !b.delivery_date_start) {
      return res.status(400).json({ error: 'missing required fields: buyer_id, commodity_category, commodity_subcategory, quantity, delivery_date_start' });
    }

    await client.query('BEGIN');

    const estimatedGmv = (Number(b.quantity) || 0) * (Number(b.target_price) || 0);
    const isSpot = estimatedGmv > 0 && estimatedGmv < SPOT_THRESHOLD;
    const auctionStarts = isSpot ? null : new Date();
    const auctionEnds = isSpot ? null : new Date(Date.now() + AUCTION_TOTAL_MIN * 60 * 1000);

    const ins = await client.query(`
      INSERT INTO rfq_needs (
        buyer_id, buyer_anonymous_id,
        commodity_category, commodity_subcategory, pack_size,
        quantity, quantity_unit,
        delivery_date_start, delivery_date_end,
        destination_zip, destination_country, destination_state,
        terms, target_price, target_price_currency,
        organic_required, certs_required,
        payment_preference, photo_urls, spec_notes,
        status, auction_starts_at, auction_ends_at,
        is_spot_market, estimated_gmv
      ) VALUES (
        $1,$2,
        $3,$4,$5,
        $6,$7,
        $8,$9,
        $10,$11,$12,
        $13,$14,$15,
        $16,$17,
        $18,$19,$20,
        $21,$22,$23,
        $24,$25
      ) RETURNING *
    `, [
      b.buyer_id, anonymousId('buyer', b.buyer_id),
      b.commodity_category, b.commodity_subcategory, b.pack_size || null,
      Number(b.quantity), b.quantity_unit || 'pallets',
      b.delivery_date_start, b.delivery_date_end || null,
      b.destination_zip || null, b.destination_country || 'US', b.destination_state || null,
      b.terms || 'FOB', b.target_price ? Number(b.target_price) : null, b.target_price_currency || 'USD',
      !!b.organic_required, b.certs_required || [],
      b.payment_preference || 'escrow', b.photo_urls || [], b.spec_notes || null,
      isSpot ? 'open' : 'auction', auctionStarts, auctionEnds,
      isSpot, estimatedGmv || null,
    ]);

    const rfq = ins.rows[0];

    // Calendar event: posted
    await client.query(`
      INSERT INTO rfq_calendar_events (rfq_id, event_type, color_code, title, description, starts_at, ends_at)
      VALUES ($1,'posted','yellow',$2,$3, NOW(), $4)
    `, [
      rfq.id,
      `RFQ ${rfq.rfq_code} - ${rfq.commodity_subcategory}`,
      `Need: ${rfq.quantity} ${rfq.quantity_unit}, deliver ${rfq.delivery_date_start}, terms ${rfq.terms}`,
      rfq.delivery_date_start,
    ]);

    await fireBrainEvent(client, rfq.id, 'RFQ_POSTED', b.buyer_id, 'buyer', {
      commodity: rfq.commodity_subcategory,
      qty: rfq.quantity,
      gmv: estimatedGmv,
      is_spot: isSpot,
    });

    await client.query('COMMIT');

    // Match + cascade outside transaction (independent failure)
    let cascade = { notified: 0 };
    try {
      const matched = await findMatchedGrowers(pool, rfq);
      cascade = await cascadeNotify(rfq, matched);
    } catch (e) {
      console.error('[rfq/create] match-cascade failed (rfq still posted):', e.message);
    }

    res.json({ ...rfq, cascade });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[rfq/create] error:', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// POST /api/rfq/bid - grower submits sealed bid
// ----------------------------------------------------------------------------
router.post('/bid', async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    if (!b.rfq_id || !b.grower_id || !b.bid_price || !b.quantity_offered) {
      return res.status(400).json({ error: 'missing rfq_id, grower_id, bid_price, quantity_offered' });
    }

    await client.query('BEGIN');

    const rfqQ = await client.query(`SELECT * FROM rfq_needs WHERE id = $1`, [b.rfq_id]);
    if (!rfqQ.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'rfq not found' }); }
    const rfq = rfqQ.rows[0];

    if (rfq.status !== 'auction' && rfq.status !== 'open') {
      await client.query('ROLLBACK'); return res.status(409).json({ error: `rfq not accepting bids (status=${rfq.status})` });
    }
    if (rfq.auction_ends_at && new Date(rfq.auction_ends_at) < new Date()) {
      await client.query('ROLLBACK'); return res.status(409).json({ error: 'auction window closed' });
    }

    // Determine round (sealed if within first 5 min, else open)
    let round = 1;
    if (rfq.auction_starts_at) {
      const elapsed = (Date.now() - new Date(rfq.auction_starts_at).getTime()) / 1000 / 60;
      round = elapsed > SEALED_MIN ? 2 : 1;
    }

    // Pull grower's GRS + signals
    const grQ = await client.query(`
      SELECT id, COALESCE(grs_score, 50) AS grs_score
        FROM growers WHERE id = $1
    `, [b.grower_id]);
    const grs = grQ.rows[0]?.grs_score || 50;

    const ins = await client.query(`
      INSERT INTO rfq_offers (
        rfq_id, grower_id, grower_anonymous_id,
        bid_price, bid_currency, quantity_offered, delivery_date,
        terms, round,
        signal_inventory_pressure, signal_streak, signal_distress,
        grs_score, photo_urls, notes, status
      ) VALUES (
        $1,$2,$3,
        $4,$5,$6,$7,
        $8,$9,
        $10,$11,$12,
        $13,$14,$15,'submitted'
      ) RETURNING *
    `, [
      b.rfq_id, b.grower_id, anonymousId('grower', b.grower_id),
      Number(b.bid_price), b.bid_currency || 'USD', Number(b.quantity_offered), b.delivery_date || rfq.delivery_date_start,
      b.terms || rfq.terms, round,
      !!b.signal_inventory_pressure, parseInt(b.signal_streak || 0, 10), !!b.signal_distress,
      grs, b.photo_urls || [], b.notes || null,
    ]);

    await fireBrainEvent(client, rfq.id, 'GROWER_BID', b.grower_id, 'grower', {
      bid_price: ins.rows[0].bid_price, round, grs,
    });

    await client.query('COMMIT');

    // Notify buyer
    await pushNtfy(
      `[RFQ ${rfq.rfq_code}] New bid: $${ins.rows[0].bid_price}`,
      `Round ${round}, GRS ${grs}, qty ${ins.rows[0].quantity_offered}`,
      'default', ['rfq', 'bid'],
    );

    res.json(ins.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// POST /api/rfq/revise - grower revises bid in open round
// ----------------------------------------------------------------------------
router.post('/revise', async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    if (!b.offer_id || !b.bid_price) return res.status(400).json({ error: 'missing offer_id, bid_price' });
    await client.query('BEGIN');
    const r = await client.query(`SELECT * FROM rfq_offers WHERE id = $1`, [b.offer_id]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'offer not found' }); }
    if (r.rows[0].status !== 'submitted') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'offer not revisable' }); }

    const upd = await client.query(`
      UPDATE rfq_offers
         SET bid_price = $1, round = 2, status = 'revised', revised_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [Number(b.bid_price), b.offer_id]
    );
    await fireBrainEvent(client, r.rows[0].rfq_id, 'GROWER_REVISED', r.rows[0].grower_id, 'grower', { new_price: b.bid_price });
    await client.query('COMMIT');
    res.json(upd.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// GET /api/rfq/:id - get RFQ + offers (anonymized for caller role)
// ----------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const role = (req.query.role || 'buyer').toString();
    const rfqQ = await pool.query(`SELECT * FROM rfq_needs WHERE id = $1`, [id]);
    if (!rfqQ.rows.length) return res.status(404).json({ error: 'not found' });
    const rfq = rfqQ.rows[0];

    let offersQuery;
    if (role === 'buyer') {
      // Buyer sees top 3 in open round, with anonymous_id only
      offersQuery = `
        SELECT id, grower_anonymous_id, bid_price, bid_currency, quantity_offered,
               delivery_date, terms, round,
               signal_inventory_pressure, signal_streak, signal_distress, grs_score,
               status, submitted_at, revised_at
          FROM rfq_offers
         WHERE rfq_id = $1 AND status IN ('submitted','revised')
         ORDER BY bid_price ASC, grs_score DESC
         LIMIT 5
      `;
    } else if (role === 'grower') {
      // Grower sees only their own bids
      const growerId = parseInt(req.query.grower_id || '0', 10);
      offersQuery = `
        SELECT * FROM rfq_offers WHERE rfq_id = $1 AND grower_id = ${growerId}
      `;
    } else {
      offersQuery = `SELECT * FROM rfq_offers WHERE rfq_id = $1 ORDER BY bid_price ASC`;
    }

    const offersR = await pool.query(offersQuery, [id]);

    res.json({ ...rfq, offers: offersR.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/rfq/grower/:grower_id/inbox - notifications for grower
// ----------------------------------------------------------------------------
router.get('/grower/:grower_id/inbox', async (req, res) => {
  try {
    const gid = parseInt(req.params.grower_id, 10);
    const r = await pool.query(`
      SELECT n.id AS notif_id, n.event_type, n.payload, n.created_at,
             rn.id AS rfq_id, rn.rfq_code, rn.commodity_category, rn.commodity_subcategory,
             rn.pack_size, rn.quantity, rn.quantity_unit,
             rn.delivery_date_start, rn.destination_state, rn.destination_country,
             rn.target_price, rn.target_price_currency, rn.terms,
             rn.status, rn.auction_starts_at, rn.auction_ends_at, rn.is_spot_market,
             (SELECT COUNT(*) FROM rfq_offers o WHERE o.rfq_id = rn.id AND o.grower_id = $1) AS my_bids
        FROM rfq_notifications n
        JOIN rfq_needs rn ON rn.id = n.rfq_id
       WHERE n.recipient_id = $1
         AND n.recipient_role = 'grower'
         AND rn.status IN ('open','auction')
       ORDER BY n.created_at DESC
       LIMIT 50
    `, [gid]);
    res.json({ items: r.rows, count: r.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/rfq/lock - buyer accepts an offer, deal closes
// ----------------------------------------------------------------------------
router.post('/lock', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rfq_id, offer_id, finance_mode = 'A', buyer_id } = req.body || {};
    if (!rfq_id || !offer_id) return res.status(400).json({ error: 'missing rfq_id, offer_id' });
    if (!['A','B','C','D'].includes(finance_mode)) return res.status(400).json({ error: 'finance_mode must be A|B|C|D' });

    await client.query('BEGIN');

    const rfqQ = await client.query(`SELECT * FROM rfq_needs WHERE id = $1`, [rfq_id]);
    const offQ = await client.query(`SELECT * FROM rfq_offers WHERE id = $1`, [offer_id]);
    if (!rfqQ.rows.length || !offQ.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'rfq or offer not found' }); }
    const rfq = rfqQ.rows[0];
    const off = offQ.rows[0];

    const gmv = Number(off.bid_price) * Number(off.quantity_offered);
    const platformFeePct = 3.50;
    const platformFeeFlat = 25.00;
    let factorFee = null, poFee = null;
    if (finance_mode === 'B' || finance_mode === 'D') factorFee = 2.50;
    if (finance_mode === 'C' || finance_mode === 'D') poFee = 2.40;

    const margin = (gmv * (platformFeePct / 100)) + platformFeeFlat
                 + (factorFee ? gmv * (factorFee / 100) : 0)
                 + (poFee ? gmv * (poFee / 100) : 0);

    const lockIns = await client.query(`
      INSERT INTO rfq_deal_locks (
        rfq_id, offer_id, buyer_id, grower_id,
        final_price, final_currency, final_quantity, final_delivery_date, final_terms,
        finance_mode, platform_fee_pct, platform_fee_flat, factor_fee_pct, po_finance_fee_pct,
        gmv, mexausa_margin
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,
        $15,$16
      ) RETURNING *
    `, [
      rfq_id, offer_id, rfq.buyer_id, off.grower_id,
      off.bid_price, off.bid_currency, off.quantity_offered, off.delivery_date, off.terms,
      finance_mode, platformFeePct, platformFeeFlat, factorFee, poFee,
      gmv, margin,
    ]);

    // Update statuses
    await client.query(`UPDATE rfq_needs SET status='locked', locked_offer_id=$1 WHERE id=$2`, [offer_id, rfq_id]);
    await client.query(`UPDATE rfq_offers SET status='won' WHERE id=$1`, [offer_id]);
    await client.query(`UPDATE rfq_offers SET status='lost' WHERE rfq_id=$1 AND id<>$2 AND status IN ('submitted','revised')`, [rfq_id, offer_id]);

    // Calendar: locked
    await client.query(`
      INSERT INTO rfq_calendar_events (rfq_id, event_type, color_code, title, description, starts_at, ends_at)
      VALUES ($1,'locked','green',$2,$3, NOW(), $4)
    `, [
      rfq_id,
      `LOCKED: ${rfq.rfq_code} @ $${off.bid_price}`,
      `Mode ${finance_mode}, GMV ${gmv}, margin ${margin.toFixed(2)}`,
      rfq.delivery_date_start,
    ]);

    // Shipment skeleton
    await client.query(`
      INSERT INTO rfq_shipments (rfq_id, deal_lock_id, status) VALUES ($1, $2, 'pending')
    `, [rfq_id, lockIns.rows[0].id]);

    await fireBrainEvent(client, rfq_id, 'DEAL_LOCKED', buyer_id || rfq.buyer_id, 'buyer', {
      offer_id, finance_mode, gmv, margin,
    });

    await client.query('COMMIT');

    // Admin alert
    await pushNtfy(
      `[DEAL LOCKED ${rfq.rfq_code}]`,
      `${rfq.commodity_subcategory} | $${off.bid_price} x ${off.quantity_offered} = $${gmv} | Mode ${finance_mode} | Margin $${margin.toFixed(0)}`,
      'urgent',
      ['rfq', 'deal-locked'],
    );

    res.json(lockIns.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// POST /api/rfq/distress-flag - grower flags they need to move product fast
// ----------------------------------------------------------------------------
router.post('/distress-flag', async (req, res) => {
  try {
    const { offer_id, distressed = true } = req.body || {};
    if (!offer_id) return res.status(400).json({ error: 'missing offer_id' });
    const r = await pool.query(`UPDATE rfq_offers SET signal_distress=$1 WHERE id=$2 RETURNING *`, [!!distressed, offer_id]);
    if (!r.rows.length) return res.status(404).json({ error: 'offer not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/rfq/admin/dashboard - real-time metrics for Mexausa admin
// ----------------------------------------------------------------------------
router.get('/admin/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'auction') AS active_auctions,
        COUNT(*) FILTER (WHERE status = 'open') AS active_spot,
        COUNT(*) FILTER (WHERE status = 'locked' AND created_at > NOW() - INTERVAL '24 hours') AS locked_24h,
        COALESCE(SUM(estimated_gmv) FILTER (WHERE status IN ('auction','open','locked') AND created_at > NOW() - INTERVAL '7 days'), 0) AS gmv_7d,
        COUNT(*) FILTER (WHERE status = 'disputed') AS disputed
      FROM rfq_needs
    `);
    const recentLocks = await pool.query(`
      SELECT dl.id, dl.gmv, dl.mexausa_margin, dl.finance_mode, dl.locked_at,
             rn.rfq_code, rn.commodity_subcategory
        FROM rfq_deal_locks dl
        JOIN rfq_needs rn ON rn.id = dl.rfq_id
       ORDER BY dl.locked_at DESC
       LIMIT 10
    `);
    res.json({ stats: stats.rows[0], recent_locks: recentLocks.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, findMatchedGrowers, cascadeNotify, anonymousId };
