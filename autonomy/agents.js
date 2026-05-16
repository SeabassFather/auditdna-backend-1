// =============================================================================
// autonomy/agents.js
// Save to: C:\AuditDNA\backend\autonomy\agents.js
// =============================================================================
// A1–A15 Autonomous Agents — real DB logic, not stubs
// =============================================================================

// ---------------------------------------------------------------------------
// A1: Match Scout — commodity-matched grower/buyer pairing
// ---------------------------------------------------------------------------
const A1_MatchScout = {
  code: 'A1', name: 'Match Scout', tickInterval: 300,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    // Find growers with available volume
    const growers = await pool.query(`
      SELECT id, commodity, region, available_volume_lbs, email
      FROM growers
      WHERE status = 'ACTIVE' AND available_volume_lbs > 0
      LIMIT 30
    `).catch(() => ({ rows: [] }));

    if (!growers.rows.length) {
      return logEvent('TICK', 'info', { title: 'A1: no active growers with volume' });
    }

    let matchCount = 0;
    for (const g of growers.rows) {
      const buyers = await pool.query(`
        SELECT id, buyer_email, volume_lbs_needed, price_target_cwt
        FROM buyer_wants
        WHERE lower(commodity) = lower($1)
          AND status = 'OPEN'
          AND volume_lbs_needed <= $2 * 1.25
        LIMIT 5
      `, [g.commodity, g.available_volume_lbs]).catch(() => ({ rows: [] }));

      for (const b of buyers.rows) {
        await queueAction('GROWER_BUYER_MATCH', {
          target_email: b.buyer_email,
          target_id:    String(g.id),
          reason:       `Commodity match: ${g.commodity} | Grower: ${g.id} | Vol: ${g.available_volume_lbs}lbs`,
          payload:      { grower_id: g.id, want_id: b.id, commodity: g.commodity },
        });
        matchCount++;
      }
    }

    await logEvent('TICK', 'info', {
      title: `A1: ${matchCount} grower-buyer matches queued`,
      payload: { growers: growers.rows.length, matches: matchCount },
    });
  },
};

// ---------------------------------------------------------------------------
// A2: Price Hawk — USDA price spike/drop detection
// ---------------------------------------------------------------------------
const A2_PriceHawk = {
  code: 'A2', name: 'Price Hawk', tickInterval: 600,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const spikes = await pool.query(`
      SELECT commodity, market, price, price_change_pct, price_date
      FROM usda_prices
      WHERE price_date >= CURRENT_DATE - INTERVAL '2 days'
        AND abs(price_change_pct) >= 12
      ORDER BY abs(price_change_pct) DESC
      LIMIT 15
    `).catch(() => ({ rows: [] }));

    for (const s of spikes.rows) {
      const direction = s.price_change_pct > 0 ? 'SPIKE' : 'DROP';
      await queueAction('PRICE_ALERT', {
        reason: `${direction}: ${s.commodity} @ ${s.market} changed ${s.price_change_pct}%`,
        payload: { commodity: s.commodity, market: s.market, price: s.price, pct: s.price_change_pct },
      });
    }

    await logEvent('TICK', 'info', {
      title: `A2: ${spikes.rows.length} price anomalies detected`,
    });
  },
};

// ---------------------------------------------------------------------------
// A3: Deal Closer — nudge stalled deals
// ---------------------------------------------------------------------------
const A3_DealCloser = {
  code: 'A3', name: 'Deal Closer', tickInterval: 900,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const stalled = await pool.query(`
      SELECT id, stage, buyer_email, seller_email, commodity,
             EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 AS hours_stalled
      FROM deals
      WHERE stage NOT IN ('COMPLETED','CANCELLED','DISPUTED')
        AND updated_at < NOW() - INTERVAL '48 hours'
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    for (const d of stalled.rows) {
      await queueAction('NUDGE_DEAL', {
        target_email: d.buyer_email,
        target_id:    String(d.id),
        reason:       `Deal ${d.id} stalled ${Math.round(d.hours_stalled)}h in stage ${d.stage}`,
        payload:      { deal_id: d.id, stage: d.stage, commodity: d.commodity },
      });
    }

    await logEvent('TICK', 'info', {
      title: `A3: ${stalled.rows.length} stalled deals nudged`,
    });
  },
};

// ---------------------------------------------------------------------------
// A4: DD Inspector — flag missing due-diligence documents
// ---------------------------------------------------------------------------
const A4_DDInspector = {
  code: 'A4', name: 'DD Inspector', tickInterval: 600,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    // Required doc types per deal stage
    const REQUIRED = {
      'SOURCING':    ['grower_profile','commodity_spec'],
      'NEGOTIATION': ['grower_profile','commodity_spec','price_sheet'],
      'CONTRACTING': ['grower_profile','commodity_spec','price_sheet','signed_contract'],
      'FUNDING':     ['grower_profile','commodity_spec','price_sheet','signed_contract','invoice'],
    };

    const pending = await pool.query(`
      SELECT d.id AS deal_id, d.stage, d.buyer_email,
             COALESCE(array_agg(dd.doc_type) FILTER (WHERE dd.doc_type IS NOT NULL), '{}') AS docs_present
      FROM deals d
      LEFT JOIN deal_documents dd ON dd.deal_id = d.id AND dd.status = 'APPROVED'
      WHERE d.stage IN ('SOURCING','NEGOTIATION','CONTRACTING','FUNDING')
      GROUP BY d.id, d.stage, d.buyer_email
      LIMIT 30
    `).catch(() => ({ rows: [] }));

    let flagged = 0;
    for (const d of pending.rows) {
      const required = REQUIRED[d.stage] || [];
      const present  = d.docs_present || [];
      const missing  = required.filter(r => !present.includes(r));
      if (missing.length > 0) {
        flagged++;
        await queueAction('DD_FLAG', {
          target_email: d.buyer_email,
          target_id:    String(d.deal_id),
          reason:       `Deal ${d.deal_id} missing docs: ${missing.join(', ')}`,
          payload:      { deal_id: d.deal_id, stage: d.stage, missing },
        });
      }
    }

    await logEvent('TICK', 'info', { title: `A4: ${flagged} deals flagged for missing DD docs` });
  },
};

// ---------------------------------------------------------------------------
// A5: Compliance Sentinel — cert expiry watchdog
// ---------------------------------------------------------------------------
const A5_ComplianceSentinel = {
  code: 'A5', name: 'Compliance Sentinel', tickInterval: 1800,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const expiring = await pool.query(`
      SELECT entity_name, contact_email, cert_type, expiry_date,
             (expiry_date - CURRENT_DATE) AS days_remaining
      FROM grower_certifications
      WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '45 days'
        AND notified = false
      ORDER BY expiry_date ASC
      LIMIT 40
    `).catch(() => ({ rows: [] }));

    for (const c of expiring.rows) {
      const severity = c.days_remaining <= 7 ? 'URGENT' : c.days_remaining <= 21 ? 'WARNING' : 'INFO';
      await queueAction('CERT_EXPIRY_ALERT', {
        target_email: c.contact_email,
        reason:       `${c.cert_type} expires in ${c.days_remaining} days for ${c.entity_name}`,
        payload:      { entity_name: c.entity_name, cert_type: c.cert_type, expiry_date: c.expiry_date, severity },
      });
      // Mark as notified
      await pool.query(
        `UPDATE grower_certifications SET notified = true WHERE entity_name = $1 AND cert_type = $2`,
        [c.entity_name, c.cert_type]
      ).catch(() => {});
    }

    await logEvent('TICK', 'info', { title: `A5: ${expiring.rows.length} cert expiry alerts queued` });
  },
};

// ---------------------------------------------------------------------------
// A6: Factor Matchmaker — match invoices to factoring partners
// ---------------------------------------------------------------------------
const A6_FactorMatchmaker = {
  code: 'A6', name: 'Factor Matchmaker', tickInterval: 600,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const invoices = await pool.query(`
      SELECT id, seller_email, invoice_amount, commodity, buyer_credit_score,
             EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS age_hours
      FROM invoices
      WHERE status = 'PENDING_FACTOR'
        AND created_at > NOW() - INTERVAL '72 hours'
      ORDER BY invoice_amount DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    for (const inv of invoices.rows) {
      await queueAction('FACTOR_MATCH', {
        target_email: inv.seller_email,
        target_id:    String(inv.id),
        reason:       `Invoice $${inv.invoice_amount} ready for factoring match`,
        payload:      { invoice_id: inv.id, amount: inv.invoice_amount, commodity: inv.commodity },
      });
    }

    await logEvent('TICK', 'info', { title: `A6: ${invoices.rows.length} invoices queued for factoring` });
  },
};

// ---------------------------------------------------------------------------
// A7: Onboarding Shepherd — push incomplete onboarding growers
// ---------------------------------------------------------------------------
const A7_OnboardingShepherd = {
  code: 'A7', name: 'Onboarding Shepherd', tickInterval: 1200,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const incomplete = await pool.query(`
      SELECT id, email, full_name, onboarding_step, created_at,
             EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS age_hours
      FROM growers
      WHERE status = 'ONBOARDING'
        AND onboarding_step < 5
        AND created_at > NOW() - INTERVAL '7 days'
        AND (last_nudge_at IS NULL OR last_nudge_at < NOW() - INTERVAL '24 hours')
      LIMIT 25
    `).catch(() => ({ rows: [] }));

    for (const g of incomplete.rows) {
      await queueAction('ONBOARDING_NUDGE', {
        target_email: g.email,
        target_id:    String(g.id),
        reason:       `Grower ${g.full_name} stuck at step ${g.onboarding_step} for ${Math.round(g.age_hours)}h`,
        payload:      { grower_id: g.id, step: g.onboarding_step },
      });
      await pool.query(
        `UPDATE growers SET last_nudge_at = NOW() WHERE id = $1`,
        [g.id]
      ).catch(() => {});
    }

    await logEvent('TICK', 'info', { title: `A7: ${incomplete.rows.length} onboarding nudges sent` });
  },
};

// ---------------------------------------------------------------------------
// A8: Inventory Scout — flag low inventory vs open buyer needs
// ---------------------------------------------------------------------------
const A8_InventoryScout = {
  code: 'A8', name: 'Inventory Scout', tickInterval: 900,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const gaps = await pool.query(`
      SELECT bw.commodity, SUM(bw.volume_lbs_needed) AS total_demand,
             COALESCE(SUM(g.available_volume_lbs), 0) AS total_supply,
             SUM(bw.volume_lbs_needed) - COALESCE(SUM(g.available_volume_lbs), 0) AS supply_gap
      FROM buyer_wants bw
      LEFT JOIN growers g ON lower(g.commodity) = lower(bw.commodity) AND g.status = 'ACTIVE'
      WHERE bw.status = 'OPEN'
      GROUP BY bw.commodity
      HAVING SUM(bw.volume_lbs_needed) > COALESCE(SUM(g.available_volume_lbs), 0) * 1.1
      ORDER BY supply_gap DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    for (const gap of gaps.rows) {
      await queueAction('SUPPLY_GAP_ALERT', {
        reason: `Supply gap: ${gap.commodity} | Demand: ${gap.total_demand}lbs | Supply: ${gap.total_supply}lbs`,
        payload: { commodity: gap.commodity, demand: gap.total_demand, supply: gap.total_supply, gap: gap.supply_gap },
      });
    }

    await logEvent('TICK', 'info', { title: `A8: ${gaps.rows.length} supply gaps detected` });
  },
};

// ---------------------------------------------------------------------------
// A9: Digest Sender — daily intel digest queuer
// ---------------------------------------------------------------------------
const A9_DigestSender = {
  code: 'A9', name: 'Digest Sender', tickInterval: 3600,
  async tick(ctx) {
    const { pool, logEvent, queueAction, sleepMode } = ctx;

    if (sleepMode) {
      return logEvent('TICK', 'info', { title: 'A9: sleep mode, digest deferred' });
    }

    // Only queue digest once per day
    const already = await pool.query(`
      SELECT id FROM autonomy_queue
      WHERE action_type = 'DAILY_DIGEST'
        AND created_at >= CURRENT_DATE
      LIMIT 1
    `).catch(() => ({ rows: [] }));

    if (already.rows.length > 0) {
      return logEvent('TICK', 'info', { title: 'A9: digest already queued today' });
    }

    await queueAction('DAILY_DIGEST', {
      reason: 'Daily agricultural intelligence digest',
      payload: { date: new Date().toISOString().split('T')[0] },
    });

    await logEvent('TICK', 'info', { title: 'A9: daily digest queued' });
  },
};

// ---------------------------------------------------------------------------
// A10: LOAF Monitor — field worker registration follow-up
// ---------------------------------------------------------------------------
const A10_LOAFMonitor = {
  code: 'A10', name: 'LOAF Monitor', tickInterval: 1200,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const pending = await pool.query(`
      SELECT id, email, full_name, registration_step, created_at
      FROM loaf_registrations
      WHERE status = 'PENDING'
        AND created_at > NOW() - INTERVAL '14 days'
        AND (last_followup_at IS NULL OR last_followup_at < NOW() - INTERVAL '48 hours')
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    for (const r of pending.rows) {
      await queueAction('LOAF_FOLLOWUP', {
        target_email: r.email,
        target_id:    String(r.id),
        reason:       `LOAF registration pending step ${r.registration_step} — follow up`,
        payload:      { registration_id: r.id, step: r.registration_step },
      });
      await pool.query(
        `UPDATE loaf_registrations SET last_followup_at = NOW() WHERE id = $1`,
        [r.id]
      ).catch(() => {});
    }

    await logEvent('TICK', 'info', { title: `A10: ${pending.rows.length} LOAF follow-ups queued` });
  },
};

// ---------------------------------------------------------------------------
// A11: Credit Watch — buyer credit score monitoring
// ---------------------------------------------------------------------------
const A11_CreditWatch = {
  code: 'A11', name: 'Credit Watch', tickInterval: 3600,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const drops = await pool.query(`
      SELECT buyer_email, company_name, credit_score, prev_credit_score,
             (credit_score - prev_credit_score) AS score_change
      FROM buyer_credit_history
      WHERE updated_at >= NOW() - INTERVAL '7 days'
        AND (credit_score - prev_credit_score) <= -30
      ORDER BY score_change ASC
      LIMIT 15
    `).catch(() => ({ rows: [] }));

    for (const d of drops.rows) {
      await queueAction('CREDIT_ALERT', {
        target_email: d.buyer_email,
        reason:       `Credit drop: ${d.company_name} ${d.score_change} pts to ${d.credit_score}`,
        payload:      { email: d.buyer_email, company: d.company_name, change: d.score_change, new_score: d.credit_score },
      });
    }

    await logEvent('TICK', 'info', { title: `A11: ${drops.rows.length} credit alerts queued` });
  },
};

// ---------------------------------------------------------------------------
// A12: Dispute Resolver — flag unresolved disputes
// ---------------------------------------------------------------------------
const A12_DisputeResolver = {
  code: 'A12', name: 'Dispute Resolver', tickInterval: 1800,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const disputes = await pool.query(`
      SELECT id, deal_id, filed_by, reason,
             EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS age_hours
      FROM deal_disputes
      WHERE status = 'OPEN'
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at ASC
      LIMIT 15
    `).catch(() => ({ rows: [] }));

    for (const d of disputes.rows) {
      if (d.age_hours > 72) {
        await queueAction('DISPUTE_ESCALATE', {
          target_email: d.filed_by,
          target_id:    String(d.id),
          reason:       `Dispute ${d.id} open ${Math.round(d.age_hours)}h — escalating`,
          payload:      { dispute_id: d.id, deal_id: d.deal_id, age_hours: Math.round(d.age_hours) },
        });
      }
    }

    await logEvent('TICK', 'info', { title: `A12: ${disputes.rows.length} open disputes reviewed` });
  },
};

// ---------------------------------------------------------------------------
// A13: Weather Watcher — weather risk for active grower regions
// ---------------------------------------------------------------------------
const A13_WeatherWatcher = {
  code: 'A13', name: 'Weather Watcher', tickInterval: 3600,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const regions = await pool.query(`
      SELECT DISTINCT region, COUNT(*) AS grower_count
      FROM growers
      WHERE status = 'ACTIVE'
      GROUP BY region
      HAVING COUNT(*) >= 3
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    for (const r of regions.rows) {
      const alerts = await pool.query(`
        SELECT alert_type, severity, message, valid_from, valid_to
        FROM weather_alerts
        WHERE lower(region) = lower($1)
          AND valid_to >= NOW()
          AND severity IN ('SEVERE','EXTREME')
        LIMIT 3
      `, [r.region]).catch(() => ({ rows: [] }));

      for (const a of alerts.rows) {
        await queueAction('WEATHER_ALERT', {
          reason:  `${a.severity} weather in ${r.region}: ${a.alert_type}`,
          payload: { region: r.region, grower_count: r.grower_count, alert: a },
        });
      }
    }

    await logEvent('TICK', 'info', { title: `A13: weather scan complete for ${regions.rows.length} regions` });
  },
};

// ---------------------------------------------------------------------------
// A14: Escrow Tracker — track escrow funding milestones
// ---------------------------------------------------------------------------
const A14_EscrowTracker = {
  code: 'A14', name: 'Escrow Tracker', tickInterval: 900,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const stalled = await pool.query(`
      SELECT e.id, e.deal_id, e.status, e.amount, e.due_date,
             d.buyer_email, d.seller_email, d.commodity,
             (e.due_date - CURRENT_DATE) AS days_until_due
      FROM escrow_accounts e
      JOIN deals d ON d.id = e.deal_id
      WHERE e.status IN ('PENDING_FUNDING','FUNDED_AWAITING_RELEASE')
        AND e.due_date <= CURRENT_DATE + INTERVAL '3 days'
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    for (const esc of stalled.rows) {
      await queueAction('ESCROW_DUE', {
        target_email: esc.buyer_email,
        target_id:    String(esc.id),
        reason:       `Escrow ${esc.id} due in ${esc.days_until_due} days | $${esc.amount} | ${esc.commodity}`,
        payload:      { escrow_id: esc.id, deal_id: esc.deal_id, amount: esc.amount, due_date: esc.due_date },
      });
    }

    await logEvent('TICK', 'info', { title: `A14: ${stalled.rows.length} escrow milestones tracked` });
  },
};

// ---------------------------------------------------------------------------
// A15: Data Quality Auditor — flag contacts with missing critical fields
// ---------------------------------------------------------------------------
const A15_DataQualityAuditor = {
  code: 'A15', name: 'Data Quality Auditor', tickInterval: 7200,
  async tick(ctx) {
    const { pool, logEvent, queueAction } = ctx;

    const incomplete = await pool.query(`
      SELECT id, full_name, email, contact_type,
        (email IS NULL OR email = '')::int +
        (phone IS NULL OR phone = '')::int +
        (commodity IS NULL OR commodity = '')::int +
        (state_code IS NULL OR state_code = '')::int AS missing_fields
      FROM contacts
      WHERE (email IS NULL OR phone IS NULL OR commodity IS NULL)
        AND created_at > NOW() - INTERVAL '90 days'
      ORDER BY missing_fields DESC
      LIMIT 30
    `).catch(() => ({ rows: [] }));

    if (incomplete.rows.length > 0) {
      await queueAction('DATA_QUALITY_FLAG', {
        reason:  `${incomplete.rows.length} contacts with missing critical fields`,
        payload: {
          count: incomplete.rows.length,
          sample: incomplete.rows.slice(0, 5).map(r => ({ id: r.id, name: r.full_name, missing: r.missing_fields })),
        },
      });
    }

    await logEvent('TICK', 'info', { title: `A15: ${incomplete.rows.length} low-quality contact records flagged` });
  },
};

module.exports = [
  A1_MatchScout,
  A2_PriceHawk,
  A3_DealCloser,
  A4_DDInspector,
  A5_ComplianceSentinel,
  A6_FactorMatchmaker,
  A7_OnboardingShepherd,
  A8_InventoryScout,
  A9_DigestSender,
  A10_LOAFMonitor,
  A11_CreditWatch,
  A12_DisputeResolver,
  A13_WeatherWatcher,
  A14_EscrowTracker,
  A15_DataQualityAuditor,
];
