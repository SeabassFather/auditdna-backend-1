// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\05-anvil.js
// STAGE 5 - ANVIL: atomic write to Postgres
// FIX: corrected to match real plastpac_inquiries schema (contact_name, not name)
// =============================================================================

let pool;
function getPool() {
  if (pool) return pool;
  try { pool = require('../../db'); }
  catch (e1) {
    try { pool = require('../../config/db'); }
    catch (e2) {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
      });
    }
  }
  return pool;
}

async function q(sql, params) {
  const p = getPool();
  if (!p || !p.query) throw new Error('ANVIL: db pool unavailable');
  return p.query(sql, params);
}

async function insertByType(type, data) {
  switch (type) {
    case 'plastpac.inquiry': {
      // Real plastpac_inquiries schema: contact_name, contact_role, email, phone,
      // company, source, status, plus product_slug + many optional packaging fields.
      const r = await q(
        `INSERT INTO plastpac_inquiries
          (product_slug, source, company, contact_name, contact_role, email, phone,
           current_packaging, box_dimensions, board_style, print_requirements,
           weight_limit, pallet_pattern, shipping_address, ordering_contact,
           notes, ip_address, user_agent, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'new')
         RETURNING id`,
        [
          data.product_slug || 'plastpac-ecocrate',
          data.source || 'gatekeeper',
          data.company || null,
          data.name || data.contact_name || null,        // accept either input key
          data.role || data.contact_role || null,
          data.email || null,
          data.phone || null,
          data.current_packaging || null,
          data.box_dimensions || null,
          data.board_style || null,
          data.print_requirements || data.message || null,
          data.weight_limit || null,
          data.pallet_pattern || null,
          data.shipping_address || null,
          data.ordering_contact || null,
          data.notes || data.message || null,
          (data._meta && data._meta.source_ip) || null,
          (data._meta && data._meta.user_agent) || null
        ]
      );
      return { table: 'plastpac_inquiries', inserted_id: r.rows[0].id };
    }
    case 'contact.create': {
      const r = await q(
        `INSERT INTO contacts (name, email, phone, company, type, source)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [data.name, data.email || null, data.phone || null, data.company || null,
         data.contact_type || 'general', data.source || 'gatekeeper']
      );
      return { table: 'contacts', inserted_id: r.rows[0].id };
    }
    case 'mortgage.lead': {
      const r = await q(
        `INSERT INTO mortgage_leads (name, email, phone, loan_amount, property_type, source)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [data.name, data.email, data.phone || null, data.loan_amount || null,
         data.property_type || null, data.source || 'gatekeeper']
      );
      return { table: 'mortgage_leads', inserted_id: r.rows[0].id };
    }
    default:
      return { table: null, inserted_id: null, action: 'no_primary_insert' };
  }
}

async function run(ctx) {
  if (ctx.skip_insert) {
    return { skipped: true, reason: 'forge_marked_duplicate' };
  }
  const type = ctx.request.request_type;
  const data = ctx.normalized || {};

  try {
    const result = await insertByType(type, data);
    ctx.inserted = result;
    return result;
  } catch (e) {
    throw new Error('ANVIL: insert failed: ' + e.message);
  }
}

module.exports = {
  number: 5,
  name: 'insert',
  agent: 'anvil',
  run
};
