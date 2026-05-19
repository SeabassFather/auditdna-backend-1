// migrations/startup-tables.js
// Save to: C:\AuditDNA\backend\migrations\startup-tables.js
// Runs on every server boot — idempotent (CREATE TABLE IF NOT EXISTS)
'use strict';

async function runStartupMigrations(pool) {
  if (!pool) return;
  const queries = [

    // Demand signals (buyer pre-orders, flash interest)
    `CREATE TABLE IF NOT EXISTS demand_signals (
       id SERIAL PRIMARY KEY,
       commodity VARCHAR(120),
       volume_lbs NUMERIC,
       price_target NUMERIC,
       urgency VARCHAR(20) DEFAULT 'MEDIUM',
       weeks_out INTEGER DEFAULT 2,
       notes TEXT,
       type VARCHAR(30) DEFAULT 'DEMAND',
       buyer_email VARCHAR(200),
       status VARCHAR(20) DEFAULT 'OPEN',
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Grower certifications (A5 agent + compliance)
    `CREATE TABLE IF NOT EXISTS grower_certifications (
       id SERIAL PRIMARY KEY,
       grower_id INTEGER,
       entity_name VARCHAR(200),
       contact_email VARCHAR(200),
       cert_type VARCHAR(80),
       cert_number VARCHAR(100),
       issued_date DATE,
       expiry_date DATE,
       status VARCHAR(20) DEFAULT 'ACTIVE',
       days_until_expiry INTEGER GENERATED ALWAYS AS ((expiry_date - CURRENT_DATE)) STORED,
       notified BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Platform notifications (ClaudeProvider send_platform_alert tool)
    `CREATE TABLE IF NOT EXISTS platform_notifications (
       id SERIAL PRIMARY KEY,
       recipient_email VARCHAR(200),
       type VARCHAR(20) DEFAULT 'INFO',
       title VARCHAR(300),
       message TEXT,
       channel VARCHAR(20) DEFAULT 'platform',
       read BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Weather alerts (A13 WeatherWatcher agent)
    `CREATE TABLE IF NOT EXISTS weather_alerts (
       id SERIAL PRIMARY KEY,
       region VARCHAR(120),
       alert_type VARCHAR(80),
       severity VARCHAR(20) DEFAULT 'INFO',
       message TEXT,
       valid_from TIMESTAMPTZ DEFAULT NOW(),
       valid_to TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Lot fingerprints (created in route too — belt+suspenders)
    `CREATE TABLE IF NOT EXISTS lot_fingerprints (
       id SERIAL PRIMARY KEY,
       lot_id VARCHAR(60) UNIQUE,
       commodity VARCHAR(120),
       grower VARCHAR(200),
       region VARCHAR(120),
       country VARCHAR(10),
       harvest_date DATE,
       weight_lbs NUMERIC,
       integrity_score INTEGER,
       farm_data JSONB,
       seed_data JSONB,
       water_data JSONB,
       soil_data JSONB,
       fert_data JSONB,
       po_number VARCHAR(60),
       manifest_number VARCHAR(60),
       invoice_number VARCHAR(60),
       bound BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Cold chain (created in route too)
    `CREATE TABLE IF NOT EXISTS cold_chain_shipments (
       id SERIAL PRIMARY KEY,
       load_id VARCHAR(40) UNIQUE,
       commodity VARCHAR(120),
       origin VARCHAR(120),
       destination VARCHAR(120),
       carrier VARCHAR(120),
       set_temp NUMERIC,
       vehicle VARCHAR(60),
       status VARCHAR(30) DEFAULT 'ACTIVE',
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    `CREATE TABLE IF NOT EXISTS cold_chain_logs (
       id SERIAL PRIMARY KEY,
       load_id VARCHAR(40),
       location VARCHAR(120),
       temp_reading NUMERIC,
       deviation NUMERIC,
       logged_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Flash sales
    `CREATE TABLE IF NOT EXISTS flash_sales (
       id SERIAL PRIMARY KEY,
       ref VARCHAR(24) UNIQUE,
       commodity VARCHAR(120),
       volume VARCHAR(80),
       price VARCHAR(80),
       discount INTEGER,
       near_spoil VARCHAR(20),
       contact VARCHAR(200),
       status VARCHAR(20) DEFAULT 'ACTIVE',
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,


    // Brain logs (Brain.ping + agent events)
    `CREATE TABLE IF NOT EXISTS brain_logs (
       id SERIAL PRIMARY KEY,
       event_type VARCHAR(60),
       level VARCHAR(20) DEFAULT 'info',
       title VARCHAR(300),
       payload JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    // Autonomy queue (A1-A15 action queue)
    `CREATE TABLE IF NOT EXISTS autonomy_queue (
       id SERIAL PRIMARY KEY,
       action_type VARCHAR(60),
       target_email VARCHAR(200),
       target_id VARCHAR(80),
       reason TEXT,
       payload JSONB,
       status VARCHAR(20) DEFAULT 'PENDING',
       processed_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,
    // Auction lots (in-memory in service, DB backup)
    `CREATE TABLE IF NOT EXISTS auction_lots (
       id SERIAL PRIMARY KEY,
       lot_id VARCHAR(40) UNIQUE,
       commodity VARCHAR(120),
       volume NUMERIC,
       grade VARCHAR(20),
       origin VARCHAR(120),
       current_bid NUMERIC,
       start_price NUMERIC,
       reserve_price NUMERIC,
       status VARCHAR(20) DEFAULT 'ACTIVE',
       ends_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,

    `CREATE TABLE IF NOT EXISTS auction_bids (
       id SERIAL PRIMARY KEY,
       lot_id VARCHAR(40),
       bidder VARCHAR(200),
       amount NUMERIC,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`,
  ];

  let ok = 0, fail = 0;
  for (const q of queries) {
    try {
      await pool.query(q);
      ok++;
    } catch (e) {
      console.warn('[MIGRATION] warn:', e.message.substring(0, 80));
      fail++;
    }
  }
  console.log(`[MIGRATIONS] startup complete: ${ok} OK, ${fail} failed`);
}

module.exports = { runStartupMigrations };
