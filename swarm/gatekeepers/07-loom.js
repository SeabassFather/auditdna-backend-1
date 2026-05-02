// =============================================================================
// File: C:\AuditDNA\backend\swarm\gatekeepers\07-loom.js
// STAGE 7 - LOOM: derives output fields, weaves business logic into response
// =============================================================================

function nextActions(ctx) {
  const type = ctx.request.request_type;
  const tier = ctx.business && ctx.business.tier;
  const acts = [];

  if (type === 'plastpac.inquiry') {
    acts.push({ kind: 'email_hector',  when: 'immediate', payload: 'plastpac_inquiry_alert' });
    acts.push({ kind: 'email_saul',    when: 'immediate', payload: 'plastpac_inquiry_alert' });
    acts.push({ kind: 'email_lead',    when: 'immediate', payload: 'plastpac_inquiry_autoreply' });
    if (tier === 'hot') acts.push({ kind: 'sms_hector', when: 'immediate', payload: 'hot_lead_alert' });
  }
  if (type === 'mortgage.lead') {
    acts.push({ kind: 'email_loanofficer', when: 'immediate', payload: 'new_mortgage_lead' });
    if (tier === 'hot') acts.push({ kind: 'phone_followup_assigned', when: 'within_2h' });
  }
  if (type === 'grower.onboard') {
    acts.push({ kind: 'email_enrique', when: 'immediate', payload: 'new_grower_to_qualify' });
  }
  if (type === 'buyer.inquire') {
    acts.push({ kind: 'email_eliot', when: 'immediate', payload: 'new_buyer_inquiry' });
  }

  return acts;
}

async function run(ctx) {
  const acts = nextActions(ctx);
  ctx.next_actions = acts;
  return {
    next_actions_count: acts.length,
    next_actions: acts
  };
}

module.exports = {
  number: 7,
  name: 'render_logic',
  agent: 'loom',
  run
};
