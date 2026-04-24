// 15 agents A1-A15. Each agent is a {code, name, tickInterval, tick(ctx)} object.
// Phase 2A ships with working scaffolds. Deep logic per agent ships in Phase 2B.

const A1_MatchScout = {
  code: 'A1', name: 'Match Scout', tickInterval: 300,
  async tick(ctx) {
    // Find active growers with available lots and buyers looking for matching commodity
    const q = await ctx.pool.query(`
      SELECT g.id AS grower_id, g.commodity, g.region, g.volume_lbs
      FROM growers g
      WHERE g.status='ACTIVE' AND g.available_volume_lbs > 0
      LIMIT 20
    `).catch(()=>({ rows: [] }));
    if (q.rows.length === 0) { await ctx.logEvent('TICK', 'info', { title: 'no active growers' }); return; }
    await ctx.logEvent('TICK', 'info', { title: `scanned ${q.rows.length} growers` });
  }
};

const A2_PriceHawk = {
  code: 'A2', name: 'Price Hawk', tickInterval: 600,
  async tick(ctx) {
    // Pull recent USDA price snapshots + compare to open deals
    await ctx.logEvent('TICK', 'info', { title: 'USDA price scan' });
  }
};

const A3_DealCloser = {
  code: 'A3', name: 'Deal Closer', tickInterval: 900,
  async tick(ctx) {
    // Find deals stalled >48h in same stage
    const q = await ctx.pool.query(`
      SELECT id, stage, updated_at FROM deals
      WHERE stage NOT IN ('COMPLETED','CANCELLED','DISPUTED')
        AND updated_at < NOW() - INTERVAL '48 hours'
      LIMIT 25
    `).catch(()=>({ rows: [] }));
    for (const row of q.rows) {
      await ctx.queueAction('NUDGE_DEAL', { target_id: String(row.id), reason: `stalled in ${row.stage} >48h`, payload: { stage: row.stage } });
    }
    await ctx.logEvent('TICK', 'info', { title: `nudged ${q.rows.length} stalled deals` });
  }
};

const A4_DDInspector = {
  code: 'A4', name: 'DD Inspector', tickInterval: 600,
  async tick(ctx) {
    // Scan pending DD docs, flag missing required types
    await ctx.logEvent('TICK', 'info', { title: 'DD queue scan' });
  }
};

const A5_ComplianceSentinel = {
  code: 'A5', name: 'Compliance Sentinel', tickInterval: 1800,
  async tick(ctx) {
    // Check cert expiry and compliance flags
    await ctx.logEvent('TICK', 'info', { title: 'compliance scan' });
  }
};

const A6_FactorMatchmaker = {
  code: 'A6', name: 'Factor Matchmaker', tickInterval: 600,
  async tick(ctx) {
    // Route accepted deals to factoring waterfall
    await ctx.logEvent('TICK', 'info', { title: 'factoring waterfall scan' });
  }
};

const A7_LogisticsHunter = {
  code: 'A7', name: 'Logistics Hunter', tickInterval: 900,
  async tick(ctx) { await ctx.logEvent('TICK', 'info', { title: 'logistics scan' }); }
};

const A8_DisputeMediator = {
  code: 'A8', name: 'Dispute Mediator', tickInterval: 1800,
  async tick(ctx) {
    const q = await ctx.pool.query(`SELECT id FROM deals WHERE stage='DISPUTED' LIMIT 10`).catch(()=>({ rows: [] }));
    if (q.rows.length > 0) await ctx.logEvent('DECIDE', 'warn', { title: `${q.rows.length} disputed deals`, payload: { ids: q.rows.map(r=>r.id) } });
  }
};

const A9_ProfitOptimizer = {
  code: 'A9', name: 'Profit Optimizer', tickInterval: 600,
  async tick(ctx) { await ctx.logEvent('TICK', 'info', { title: 'margin scoring' }); }
};

const A10_LookalikeLauncher = {
  code: 'A10', name: 'Lookalike Launcher', tickInterval: 1800,
  async tick(ctx) { await ctx.logEvent('TICK', 'info', { title: 'lookalike pattern scan' }); }
};

const A11_SleepAgent = {
  code: 'A11', name: 'Sleep Agent', tickInterval: 300,
  async tick(ctx) {
    if (ctx.sleepMode) {
      await ctx.logEvent('TICK', 'info', { title: 'sleep mode active - VERIFIED only' });
    }
    // Wake up queued items at 6am
    const q = await ctx.pool.query(`
      UPDATE autonomy_queue SET status='REVIEWING'
      WHERE status='PENDING' AND scheduled_for <= NOW() RETURNING id
    `).catch(()=>({ rows: [] }));
    if (q.rows.length > 0) await ctx.logEvent('ACTION', 'info', { title: `released ${q.rows.length} queued items` });
  }
};

const A12_GrowerNurture = {
  code: 'A12', name: 'Grower Nurture', tickInterval: 1800,
  async tick(ctx) { await ctx.logEvent('TICK', 'info', { title: 'grower nurture cadence' }); }
};

const A13_BuyerIntel = {
  code: 'A13', name: 'Buyer Intel', tickInterval: 1800,
  async tick(ctx) { await ctx.logEvent('TICK', 'info', { title: 'buyer profile enrichment' }); }
};

const A14_CertExpiryRadar = {
  code: 'A14', name: 'Cert Expiry Radar', tickInterval: 3600,
  async tick(ctx) {
    // 30/60/90 day warnings - table may not exist yet, so guard
    try {
      const q = await ctx.pool.query(`
        SELECT id, cert_type, expires_at FROM grower_certs
        WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '90 days'
        LIMIT 50
      `);
      if (q.rows.length > 0) await ctx.logEvent('DECIDE', 'warn', { title: `${q.rows.length} certs expiring <=90d` });
    } catch (e) { /* table not yet present - ok */ }
  }
};

const A15_CrossSellSpotter = {
  code: 'A15', name: 'Cross-Sell Spotter', tickInterval: 1800,
  async tick(ctx) { await ctx.logEvent('TICK', 'info', { title: 'cross-sell scan' }); }
};

module.exports = [
  A1_MatchScout, A2_PriceHawk, A3_DealCloser, A4_DDInspector, A5_ComplianceSentinel,
  A6_FactorMatchmaker, A7_LogisticsHunter, A8_DisputeMediator, A9_ProfitOptimizer, A10_LookalikeLauncher,
  A11_SleepAgent, A12_GrowerNurture, A13_BuyerIntel, A14_CertExpiryRadar, A15_CrossSellSpotter
];
