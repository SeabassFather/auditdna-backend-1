// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\10-courier.js
// STAGE 10 - COURIER: packages activity record, hands off to Margie
// =============================================================================

function summarize(ctx) {
  const t = ctx.request.request_type;
  const d = ctx.normalized || {};
  const b = ctx.business || {};
  const i = ctx.intel || {};
  const ins = ctx.inserted || {};

  const parts = [];
  parts.push(t);
  if (d.name)      parts.push('from ' + d.name);
  if (d.company)   parts.push('@ ' + d.company);
  if (d.commodity) parts.push('re: ' + d.commodity);
  if (b.tier)      parts.push('tier=' + b.tier);
  if (b.lead_score !== undefined) parts.push('score=' + b.lead_score);
  if (i.is_competitor)  parts.push('[COMPETITOR]');
  if (i.is_target_buyer) parts.push('[TARGET_BUYER]');
  if (ins.inserted_id)  parts.push('id=' + ins.inserted_id);

  return parts.join(' | ');
}

async function run(ctx) {
  ctx.archive_record = {
    run_id: ctx.run_id,
    request_type: ctx.request.request_type,
    summary: summarize(ctx),
    intel: ctx.intel || {},
    full_record: {
      classification: ctx.classification,
      normalized: ctx.normalized,
      dedupe: ctx.dedupe,
      inserted: ctx.inserted,
      business: ctx.business,
      next_actions: ctx.next_actions,
      duration_ms: ctx.finished_at ? (ctx.finished_at - ctx.started_at) : null,
      status: ctx.had_failure ? 'failed' : 'success'
    }
  };

  return {
    summary: ctx.archive_record.summary,
    record_size: Buffer.byteLength(JSON.stringify(ctx.archive_record), 'utf8'),
    handoff_to: 'margie'
  };
}

module.exports = {
  number: 10,
  name: 'share_with_margie',
  agent: 'courier',
  run
};
