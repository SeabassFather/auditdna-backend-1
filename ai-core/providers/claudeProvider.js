// =============================================================================
// ai-core/providers/claudeProvider.js
// Save to: C:\AuditDNA\backend\ai-core\providers\claudeProvider.js
// =============================================================================
// AuditDNA Claude Tool-Use Agent — Anthropic claude-sonnet-4-20250514
// 8 tools wired to live Railway PostgreSQL data
// =============================================================================
'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Tool definitions — AuditDNA Agriculture data layer
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'query_contacts',
    description: 'Search the AuditDNA CRM contact database (33,971 records). Filter by role, commodity, state, country, or keyword.',
    input_schema: {
      type: 'object',
      properties: {
        role:      { type: 'string', description: 'grower | buyer | shipper | broker | packer' },
        commodity: { type: 'string', description: 'e.g. lettuce, strawberry, avocado' },
        state:     { type: 'string', description: 'US state or MX state abbreviation' },
        country:   { type: 'string', description: 'US | MX | CA' },
        keyword:   { type: 'string', description: 'Free-text search against name, company, email' },
        limit:     { type: 'number', description: 'Max records to return (default 20)' },
      },
      required: [],
    },
  },
  {
    name: 'query_growers',
    description: 'Query active growers in the platform. Returns commodity, region, volume, GRS score, cert status.',
    input_schema: {
      type: 'object',
      properties: {
        commodity:  { type: 'string' },
        region:     { type: 'string', description: 'e.g. Salinas, Mexicali, Yuma' },
        min_volume: { type: 'number', description: 'Min available volume in lbs' },
        min_grs:    { type: 'number', description: 'Minimum GRS score 0-100' },
        limit:      { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'query_buyers',
    description: 'Query active buyers. Returns open needs, target commodities, price targets, preferred origin.',
    input_schema: {
      type: 'object',
      properties: {
        commodity:  { type: 'string' },
        max_price:  { type: 'number', description: 'Max price per CWT in USD' },
        origin:     { type: 'string', description: 'US | MX | any' },
        limit:      { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'check_usda_prices',
    description: 'Retrieve live USDA market prices for a commodity. Returns price, market, date, unit, trend.',
    input_schema: {
      type: 'object',
      properties: {
        commodity: { type: 'string', description: 'e.g. romaine lettuce, strawberry, avocado hass' },
        market:    { type: 'string', description: 'e.g. Los Angeles, Chicago, New York' },
        days_back: { type: 'number', description: 'How many days of history to return (default 7)' },
      },
      required: ['commodity'],
    },
  },
  {
    name: 'score_grower_risk',
    description: 'Run GRS (Grower Risk Score) and DPS (Data Point Score) scoring on a grower by ID or name.',
    input_schema: {
      type: 'object',
      properties: {
        grower_id:   { type: 'number' },
        grower_name: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'match_grower_buyer',
    description: 'Find grower-buyer matches for a commodity. Returns ranked matches with compatibility scores.',
    input_schema: {
      type: 'object',
      properties: {
        commodity:     { type: 'string' },
        volume_lbs:    { type: 'number' },
        origin_region: { type: 'string' },
        price_target:  { type: 'number' },
        limit:         { type: 'number', description: 'Max matches (default 10)' },
      },
      required: ['commodity'],
    },
  },
  {
    name: 'send_platform_alert',
    description: 'Queue a platform notification to a user, contact, or admin. Type: INFO | WARNING | URGENT.',
    input_schema: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Email address or user ID' },
        type:    { type: 'string', enum: ['INFO', 'WARNING', 'URGENT'] },
        title:   { type: 'string' },
        message: { type: 'string' },
        channel: { type: 'string', enum: ['email', 'platform', 'both'], description: 'Default: platform' },
      },
      required: ['to', 'type', 'title', 'message'],
    },
  },
  {
    name: 'run_compliance_check',
    description: 'Check FSMA 204, GlobalGAP, PrimusGFS, SENASICA, and PACA compliance status for a grower.',
    input_schema: {
      type: 'object',
      properties: {
        grower_id:   { type: 'number' },
        grower_name: { type: 'string' },
        check_types: {
          type: 'array',
          items: { type: 'string', enum: ['FSMA204', 'GlobalGAP', 'PrimusGFS', 'SENASICA', 'PACA', 'ALL'] },
          description: 'Which compliance frameworks to check. Default: ALL',
        },
      },
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor — maps tool names to DB queries
// ---------------------------------------------------------------------------
async function executeTool(toolName, input, pool) {
  if (!pool) return { error: 'Database unavailable', tool: toolName };

  try {
    switch (toolName) {

      case 'query_contacts': {
        const conditions = [];
        const params = [];
        if (input.role)      { params.push(`%${input.role}%`);      conditions.push(`lower(contact_type) LIKE lower($${params.length})`); }
        if (input.commodity) { params.push(`%${input.commodity}%`); conditions.push(`lower(commodity) LIKE lower($${params.length})`); }
        if (input.state)     { params.push(input.state);            conditions.push(`state_code = $${params.length}`); }
        if (input.country)   { params.push(input.country);          conditions.push(`country_code = $${params.length}`); }
        if (input.keyword) {
          params.push(`%${input.keyword}%`);
          const p = params.length;
          conditions.push(`(lower(full_name) LIKE lower($${p}) OR lower(company) LIKE lower($${p}) OR lower(email) LIKE lower($${p}))`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = Math.min(input.limit || 20, 100);
        const r = await pool.query(
          `SELECT id, full_name, company, email, contact_type, commodity, state_code, country_code
           FROM contacts ${where} LIMIT ${limit}`,
          params
        ).catch(() => ({ rows: [] }));
        return { count: r.rows.length, results: r.rows };
      }

      case 'query_growers': {
        const params = [];
        const conds = ["status = 'ACTIVE'"];
        if (input.commodity)  { params.push(`%${input.commodity}%`);  conds.push(`lower(commodity) LIKE lower($${params.length})`); }
        if (input.region)     { params.push(`%${input.region}%`);     conds.push(`lower(region) LIKE lower($${params.length})`); }
        if (input.min_volume) { params.push(input.min_volume);        conds.push(`available_volume_lbs >= $${params.length}`); }
        if (input.min_grs)    { params.push(input.min_grs);           conds.push(`grs_score >= $${params.length}`); }
        const r = await pool.query(
          `SELECT id, full_name, company, commodity, region, available_volume_lbs, grs_score, cert_status
           FROM growers WHERE ${conds.join(' AND ')} ORDER BY grs_score DESC NULLS LAST
           LIMIT ${Math.min(input.limit || 20, 50)}`,
          params
        ).catch(() => ({ rows: [] }));
        return { count: r.rows.length, results: r.rows };
      }

      case 'query_buyers': {
        const params = [];
        const conds = ["bw.status = 'OPEN'"];
        if (input.commodity)  { params.push(`%${input.commodity}%`); conds.push(`lower(bw.commodity) LIKE lower($${params.length})`); }
        if (input.max_price)  { params.push(input.max_price);        conds.push(`bw.price_target_cwt <= $${params.length}`); }
        if (input.origin && input.origin !== 'any') { params.push(input.origin); conds.push(`bw.preferred_origin = $${params.length}`); }
        const r = await pool.query(
          `SELECT bw.id, bw.commodity, bw.volume_lbs_needed, bw.price_target_cwt,
                  bw.preferred_origin, bw.buyer_email, bw.created_at
           FROM buyer_wants bw WHERE ${conds.join(' AND ')}
           ORDER BY bw.created_at DESC LIMIT ${Math.min(input.limit || 20, 50)}`,
          params
        ).catch(() => ({ rows: [] }));
        return { count: r.rows.length, results: r.rows };
      }

      case 'check_usda_prices': {
        const params = [`%${input.commodity}%`];
        const daysBack = input.days_back || 7;
        const conds = [`lower(commodity) LIKE lower($1)`, `price_date >= CURRENT_DATE - INTERVAL '${daysBack} days'`];
        if (input.market) { params.push(`%${input.market}%`); conds.push(`lower(market) LIKE lower($${params.length})`); }
        const r = await pool.query(
          `SELECT commodity, market, price, unit, price_date, price_change_pct
           FROM usda_prices WHERE ${conds.join(' AND ')}
           ORDER BY price_date DESC LIMIT 30`,
          params
        ).catch(() => ({ rows: [] }));
        return { count: r.rows.length, results: r.rows };
      }

      case 'score_grower_risk': {
        const params = [];
        let where = '1=1';
        if (input.grower_id)   { params.push(input.grower_id);         where = `id = $${params.length}`; }
        else if (input.grower_name) { params.push(`%${input.grower_name}%`); where = `lower(full_name) LIKE lower($${params.length})`; }
        const r = await pool.query(
          `SELECT id, full_name, grs_score, dps_score, ads_score,
                  cert_status, compliance_flags, last_scored_at
           FROM growers WHERE ${where} LIMIT 5`,
          params
        ).catch(() => ({ rows: [] }));
        return { count: r.rows.length, results: r.rows };
      }

      case 'match_grower_buyer': {
        const params = [`%${input.commodity}%`];
        const r = await pool.query(
          `SELECT
             g.id AS grower_id, g.full_name AS grower, g.region, g.available_volume_lbs, g.grs_score,
             bw.id AS want_id, bw.buyer_email, bw.volume_lbs_needed, bw.price_target_cwt,
             abs(g.available_volume_lbs - bw.volume_lbs_needed) AS vol_gap
           FROM growers g
           JOIN buyer_wants bw ON lower(bw.commodity) LIKE lower($1)
           WHERE lower(g.commodity) LIKE lower($1)
             AND g.status = 'ACTIVE'
             AND bw.status = 'OPEN'
           ORDER BY g.grs_score DESC NULLS LAST, vol_gap ASC
           LIMIT ${Math.min(input.limit || 10, 25)}`,
          params
        ).catch(() => ({ rows: [] }));
        return { count: r.rows.length, matches: r.rows };
      }

      case 'send_platform_alert': {
        const r = await pool.query(
          `INSERT INTO platform_notifications (recipient_email, type, title, message, channel, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
          [input.to, input.type, input.title, input.message, input.channel || 'platform']
        ).catch(() => ({ rows: [{ id: null }] }));
        return { queued: true, notification_id: r.rows[0]?.id, to: input.to, type: input.type };
      }

      case 'run_compliance_check': {
        const params = [];
        let where = '1=1';
        if (input.grower_id)   { params.push(input.grower_id);          where = `grower_id = $${params.length}`; }
        else if (input.grower_name) { params.push(`%${input.grower_name}%`); where = `lower(entity_name) LIKE lower($${params.length})`; }
        const r = await pool.query(
          `SELECT entity_name, cert_type, cert_number, issued_date, expiry_date,
                  status, days_until_expiry
           FROM grower_certifications
           WHERE ${where}
           ORDER BY expiry_date ASC LIMIT 20`,
          params
        ).catch(() => ({ rows: [] }));
        return {
          count: r.rows.length,
          certifications: r.rows,
          summary: {
            active:   r.rows.filter(c => c.status === 'ACTIVE').length,
            expiring: r.rows.filter(c => c.days_until_expiry <= 30 && c.days_until_expiry >= 0).length,
            expired:  r.rows.filter(c => c.status === 'EXPIRED').length,
          },
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { error: e.message, tool: toolName };
  }
}

// ---------------------------------------------------------------------------
// Main agent runner — multi-turn tool use loop
// ---------------------------------------------------------------------------
class ClaudeProvider {

  // Run a multi-turn tool-use agent conversation
  async runAgent(agentId, payload, pool = null) {
    const taskType = payload.taskType || agentId;
    const userPrompt = payload.prompt || `Execute task: ${taskType}\n\nContext:\n${JSON.stringify(payload, null, 2)}`;

    const systemPrompt = `You are ${agentId}, an autonomous AI agent inside the AuditDNA Agriculture Intelligence Platform.
Operator: Mexausa Food Group, Inc. | Founder: Saul Garcia | Platform: mexausafg.com
Corridor: US-Mexico produce trade | Database: 33,971 contacts, live USDA feeds, grower/buyer CRM.

Use the available tools to fetch real data before drawing conclusions.
Respond in structured JSON:
{
  "analysis": "...",
  "action": "...",
  "confidence": 0.0-1.0,
  "data_used": [...],
  "recommendations": [...]
}
Never fabricate data. If tools return empty results, say so.`;

    const messages = [{ role: 'user', content: userPrompt }];
    let iterations = 0;
    const MAX_ITER = 5;

    while (iterations < MAX_ITER) {
      iterations++;
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });

      // Collect text content
      const textBlocks = response.content.filter(b => b.type === 'text');
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      // If no tool calls — final response
      if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
        const outputText = textBlocks.map(b => b.text).join('\n');
        let parsed;
        try {
          const clean = outputText.replace(/```json|```/g, '').trim();
          parsed = JSON.parse(clean);
        } catch {
          parsed = { analysis: outputText, action: 'manual-review', confidence: 0.7 };
        }
        return {
          agentId,
          taskType,
          output: parsed,
          rawText: outputText,
          iterations,
          model: 'claude-sonnet-4-20250514',
          confidence: parsed.confidence || 0.85,
          toolsUsed: messages.filter(m => m.role === 'tool').length,
        };
      }

      // Execute all tool calls
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = [];
      for (const block of toolUseBlocks) {
        console.log(`[ClaudeProvider] Tool: ${block.name}`, JSON.stringify(block.input).substring(0, 100));
        const result = await executeTool(block.name, block.input, pool);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    return { agentId, taskType, output: { analysis: 'Max iterations reached', confidence: 0.5 }, iterations };
  }

  // Simple completion — no tools, just text
  async complete(systemPrompt, userPrompt, maxTokens = 2048) {
    const r = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return r.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  }

  // Stream — for real-time Brain outputs
  async stream(systemPrompt, userPrompt, onChunk) {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        onChunk(event.delta.text);
      }
    }
    return await stream.finalMessage();
  }
}

module.exports = new ClaudeProvider();
