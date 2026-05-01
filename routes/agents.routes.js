// =============================================================================
// AGENT WIZARDS -- BACKEND ROUTES
// Save to: C:\AuditDNA\backend\routes\agents.routes.js
// =============================================================================
// Mount in server.js (after other routes):
//   try { app.use('/api/agents', require('./routes/agents.routes')); console.log('[OK] agents mounted at /api/agents'); } catch (e) { console.error('[FAIL] agents:', e.message); }
//
// ENDPOINTS:
//   POST  /api/agents/start              create a session, return first message
//   POST  /api/agents/:id/turn           user replies, get next AI message
//   GET   /api/agents/:id                fetch session + messages
//   GET   /api/agents/resume/:token      resume a paused session via magic-link
//   POST  /api/agents/:id/handoff        explicit human handoff
//   POST  /api/agents/:id/upload-init    request signed upload URL
//   POST  /api/agents/:id/abandon        mark session abandoned
//   GET   /api/agents/list               list sessions (admin)
//   GET   /api/agents/handoffs           list pending handoffs (admin)
//   GET   /api/agents/onboarding         list onboarding pending Diego review (admin)
//   GET   /api/agents/inquiries          list buyer inquiries (admin)
//   POST  /api/agents/onboarding/:id/promote   admin approves -> moves to live growers/buyers
//   POST  /api/agents/onboarding/:id/reject    admin rejects
// =============================================================================

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');
const {
  ENRIQUE_SYSTEM, ELIOT_SYSTEM, DIEGO_SYSTEM,
  ENRIQUE_TOOLS, ELIOT_TOOLS,
  MODELS, TOKEN_CAPS,
} = require('../services/agent-prompts');

const getDb = () => pool;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// HELPERS
// ============================================================================

const newSessionId = () => 'AGT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
const newOnboardingId = () => 'ONB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
const newInquiryId = () => 'INQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
const newResumeToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

function pickAuth(req) {
  const auth = req.headers.authorization || '';
  const tok = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return tok;
}

function pickAgentConfig(agent_type) {
  if (agent_type === 'enrique') return { system: ENRIQUE_SYSTEM, tools: ENRIQUE_TOOLS, model: MODELS.enrique, cap: TOKEN_CAPS.enrique };
  if (agent_type === 'eliot')   return { system: ELIOT_SYSTEM,   tools: ELIOT_TOOLS,   model: MODELS.eliot,   cap: TOKEN_CAPS.eliot   };
  if (agent_type === 'diego')   return { system: DIEGO_SYSTEM,   tools: [],            model: MODELS.diego,   cap: TOKEN_CAPS.diego   };
  throw new Error('Unknown agent_type: ' + agent_type);
}

function pingBrain(type, payload) {
  // Fire-and-forget brain event publish
  try {
    const fetchFn = global.fetch || require('node-fetch');
    const apiBase = process.env.RAILWAY_URL || process.env.SELF_URL || 'http://localhost:5050';
    fetchFn(apiBase + '/api/brain/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ type, payload, timestamp: Date.now() }] }),
    }).catch(() => {});
  } catch {}
}

// Compute cost in cents from token usage (Sonnet 4: $3/M input, $15/M output)
function costCents(inputTok, outputTok) {
  const inputCents  = (inputTok  || 0) * 0.0003;   // $3/Mtok = 0.0003 cents/tok
  const outputCents = (outputTok || 0) * 0.0015;
  return Math.ceil(inputCents + outputCents);
}

// Parse Claude's JSON output (handles markdown fences if present)
function parseAgentJson(text) {
  if (!text) return null;
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(cleaned); } catch {}
  // Try extracting first {...} block
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// ============================================================================
// CALL CLAUDE -- single turn
// ============================================================================
async function callAgent({ system, tools, model, messages }) {
  const t0 = Date.now();
  const params = {
    model: model.model,
    max_tokens: model.max_tokens,
    temperature: model.temperature,
    system,
    messages,
  };
  if (tools && tools.length > 0) params.tools = tools;
  const resp = await anthropic.messages.create(params);
  const latency = Date.now() - t0;
  return {
    content: resp.content,
    stop_reason: resp.stop_reason,
    usage: resp.usage || {},
    latency_ms: latency,
  };
}

// ============================================================================
// EXECUTE TOOL CALL (fan out to internal services)
// ============================================================================
async function executeTool(name, args) {
  const db = getDb();
  switch (name) {
    case 'lookup_paca': {
      // Stub for now -- real PACA lookup hits USDA AMS API
      // For MVP: check if it's a numeric 4-7 digit string
      const n = (args.paca_number || '').replace(/\D/g, '');
      if (n.length < 4 || n.length > 7) return { ok: false, error: 'Invalid PACA format' };
      // Optional: check our local cache table
      try {
        const r = await db.query('SELECT * FROM growers WHERE paca_number = $1 LIMIT 1', [n]);
        if (r.rows.length) return { ok: true, status: 'on_file', record: r.rows[0] };
      } catch {}
      return { ok: true, status: 'unverified_external', note: 'Would call USDA AMS API in production. Format valid.' };
    }

    case 'lookup_commodity': {
      const text = (args.text || '').toLowerCase().trim();
      if (!text) return { ok: false, error: 'empty' };
      try {
        // Fuzzy match against commodity catalog
        const r = await db.query(`
          SELECT id, name_en, name_es, category, FOB_avg
          FROM commodities
          WHERE LOWER(name_en) LIKE $1 OR LOWER(name_es) LIKE $1 OR $2 = ANY(aliases)
          LIMIT 5
        `, ['%' + text + '%', text]);
        if (r.rows.length) return { ok: true, matches: r.rows };
      } catch (e) {
        // Table might not exist yet -- return generic match
      }
      return { ok: true, matches: [{ id: 'CUSTOM_' + text.replace(/\W/g, '_'), name_en: text, name_es: text, category: 'unknown', note: 'New entry' }] };
    }

    case 'geocode_farm': {
      // Stub. In production hit Google Geocoding API.
      return { ok: true, address: args.address, lat: null, lng: null, note: 'Geocoding stub. Wire Google Maps API key to enable.' };
    }

    case 'score_grower': {
      // Call internal scoring-engine.js if exposed via /api/score/grower
      try {
        const fetchFn = global.fetch || require('node-fetch');
        const r = await fetchFn('http://localhost:5050/api/score/grower', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args.collected_data || {}),
        });
        if (r.ok) return { ok: true, ...(await r.json()) };
      } catch {}
      return { ok: true, gri: 70, dps: 65, ads: 80, note: 'Default placeholder scores. Scoring engine offline.' };
    }

    case 'upload_url': {
      // Stub for signed upload URL. Real impl uses S3/R2.
      const uploadId = 'UP-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      return {
        ok: true,
        upload_id: uploadId,
        url: '/api/agents/upload/' + uploadId,
        method: 'POST',
        expires_in_sec: 3600,
        note: 'POST file as multipart/form-data with field name "file"',
      };
    }

    case 'match_growers': {
      try {
        const commodity = args.commodity || '';
        const r = await db.query(`
          SELECT id, state_region, country, certifications, gri_score
          FROM growers
          WHERE status = 'active'
            AND (
              commodities::text ILIKE $1
              OR primary_commodity ILIKE $1
            )
          ORDER BY gri_score DESC NULLS LAST
          LIMIT 5
        `, ['%' + commodity + '%']);
        const anonymized = r.rows.map((g, i) => ({
          anonymous_id: 'G-' + String(i + 1).padStart(3, '0'),
          state_region: g.state_region,
          country: g.country,
          certifications: g.certifications,
          gri_score: g.gri_score,
          // Identity NOT exposed
        }));
        return { ok: true, matches: anonymized, count: anonymized.length };
      } catch (e) {
        return { ok: true, matches: [], count: 0, note: 'No matches in current grower network. Recommend WeSource.' };
      }
    }

    case 'trigger_wesource': {
      try {
        const dispatchId = 'WSD-' + Date.now().toString(36).toUpperCase();
        await db.query(`
          INSERT INTO wesource_outreach (id, request_id, commodity, region_targets, dispatch_status, created_at)
          VALUES ($1, $2, $3, $4, 'pending', NOW())
          ON CONFLICT DO NOTHING
        `, [dispatchId, args.inquiry_id, args.commodity, JSON.stringify(args.region_targets || [])]).catch(() => {});
        return { ok: true, dispatch_id: dispatchId };
      } catch (e) { return { ok: false, error: e.message }; }
    }

    case 'trigger_handoff': {
      // Returned to caller; actual row creation handled in /turn flow
      return { ok: true, will_handoff: true, ...args };
    }

    default:
      return { ok: false, error: 'Unknown tool: ' + name };
  }
}

// ============================================================================
// POST /api/agents/start
// ============================================================================
router.post('/start', async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

  const { agent_type, language = 'es', source = 'web', user_id, user_email, user_phone, user_name } = req.body || {};
  if (!['enrique', 'eliot', 'diego', 'router'].includes(agent_type)) {
    return res.status(400).json({ ok: false, error: 'agent_type must be enrique|eliot|diego|router' });
  }

  try {
    const cfg = pickAgentConfig(agent_type === 'router' ? 'enrique' : agent_type);
    const id = newSessionId();
    const resumeToken = newResumeToken();

    await db.query(`
      INSERT INTO agent_sessions (
        id, agent_type, language, user_id, user_email, user_phone, user_name,
        ip_address, user_agent, source, status, token_cap, resume_token, current_step, total_steps, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, 'active', $11, $12,
        $13, $14, NOW()
      )
    `, [
      id, agent_type, language,
      user_id || null, user_email || null, user_phone || null, user_name || null,
      req.ip || null, req.headers['user-agent'] || null, source,
      cfg.cap, resumeToken,
      agent_type === 'enrique' ? 'step_1_identity' : agent_type === 'eliot' ? 'step_1_identity' : null,
      agent_type === 'enrique' ? 14 : agent_type === 'eliot' ? 10 : null,
    ]);

    // First-message kickoff: synthesize a greeting WITHOUT calling Claude
    // (saves tokens; greeting is structured)
    const isES = language === 'es';
    let greetingEs = '', greetingEn = '';
    if (agent_type === 'enrique') {
      greetingEs = 'Hola, soy Enrique de Mexausa Food Group. Le voy a ayudar a registrar su rancho o operacion para unirse a nuestra red de productores. El proceso toma unos minutos y puede pausarlo y regresar cuando quiera. Empecemos: cual es su nombre completo y el nombre de su empresa o rancho?';
      greetingEn = 'Hello, I am Enrique from Mexausa Food Group. I will help you register your farm or operation to join our grower network. The process takes a few minutes and you can pause and resume anytime. Lets begin: what is your full name and the name of your company or farm?';
    } else if (agent_type === 'eliot') {
      greetingEn = 'Hello, I am Eliot from Mexausa Food Group. I help buyers find growers across our US-Mexico produce network. To match you with the right partners, I will ask about what you need, where it ships, and your timing. Lets start: your full name and company?';
      greetingEs = 'Hola, soy Eliot de Mexausa Food Group. Ayudo a compradores a encontrar productores en nuestra red EUA-Mexico. Para conectarlo con los socios correctos, le hare preguntas sobre lo que necesita, destino, y tiempos. Empecemos: su nombre completo y empresa?';
    } else if (agent_type === 'diego') {
      greetingEn = 'Diego compliance review session opened.';
      greetingEs = 'Sesion de revision de cumplimiento Diego abierta.';
    }

    await db.query(`
      INSERT INTO agent_messages (session_id, role, content, metadata, created_at)
      VALUES ($1, 'assistant', $2, $3, NOW())
    `, [
      id,
      isES ? greetingEs : greetingEn,
      JSON.stringify({ greeting: true, message_es: greetingEs, message_en: greetingEn, next_step: agent_type === 'enrique' || agent_type === 'eliot' ? 'step_1_identity' : null }),
    ]);

    pingBrain('AGENT_SESSION_STARTED', { session_id: id, agent_type, language, source });

    res.json({
      ok: true,
      session_id: id,
      resume_token: resumeToken,
      resume_url: '/agents/resume/' + resumeToken,
      first_message: { message_es: greetingEs, message_en: greetingEn, next_step: agent_type === 'enrique' || agent_type === 'eliot' ? 'step_1_identity' : null },
    });
  } catch (e) {
    console.error('[agents] start error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// POST /api/agents/:id/turn  -- user sends a message, we get next AI reply
// ============================================================================
router.post('/:id/turn', async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });

  const { user_message, attachments } = req.body || {};
  if (!user_message || !user_message.trim()) {
    return res.status(400).json({ ok: false, error: 'user_message required' });
  }

  try {
    // Load session
    const sRes = await db.query('SELECT * FROM agent_sessions WHERE id = $1', [req.params.id]);
    if (!sRes.rows.length) return res.status(404).json({ ok: false, error: 'Session not found' });
    const session = sRes.rows[0];
    if (session.status !== 'active' && session.status !== 'paused') {
      return res.status(400).json({ ok: false, error: 'Session ' + session.status + '. Start a new one.' });
    }

    // Token cap check
    if ((session.token_count_input || 0) + (session.token_count_output || 0) > session.token_cap) {
      await db.query("UPDATE agent_sessions SET status = 'escalated' WHERE id = $1", [session.id]);
      await createHandoff(db, session.id, 'TOKEN_CAP', 'Auto-handoff: token cap reached', 'unassigned');
      pingBrain('AGENT_TOKEN_CAP_HIT', { session_id: session.id });
      return res.json({
        ok: true,
        message_es: 'Voy a transferir esta conversacion a un humano para asegurar la mejor atencion. Lo contactaran pronto.',
        message_en: 'I am transferring this conversation to a human team member to ensure the best support. Someone will reach out shortly.',
        next_step: 'escalated',
        handoff: true,
      });
    }

    // Append user message
    await db.query(`
      INSERT INTO agent_messages (session_id, role, content, metadata, created_at)
      VALUES ($1, 'user', $2, $3, NOW())
    `, [session.id, user_message, JSON.stringify({ attachments: attachments || [] })]);

    // Build messages array for Claude
    const histRes = await db.query(`
      SELECT role, content, metadata FROM agent_messages
      WHERE session_id = $1 AND role IN ('user', 'assistant')
      ORDER BY created_at ASC
      LIMIT 50
    `, [session.id]);

    const messages = histRes.rows.map(r => ({
      role: r.role,
      content: r.content,
    }));

    const cfg = pickAgentConfig(session.agent_type === 'router' ? 'enrique' : session.agent_type);

    // Tool-use loop: Claude may call tools; we execute and feed back
    let finalText = '';
    let toolsExecuted = [];
    let totalUsage = { input_tokens: 0, output_tokens: 0 };
    let turnLatency = 0;
    let safety = 0;

    let claudeMessages = [...messages];

    while (safety < 6) {
      safety++;
      const resp = await callAgent({
        system: cfg.system,
        tools: cfg.tools,
        model: cfg.model,
        messages: claudeMessages,
      });
      totalUsage.input_tokens += resp.usage.input_tokens || 0;
      totalUsage.output_tokens += resp.usage.output_tokens || 0;
      turnLatency += resp.latency_ms;

      // Check for tool_use blocks
      const toolUseBlocks = resp.content.filter(b => b.type === 'tool_use');
      const textBlocks = resp.content.filter(b => b.type === 'text');

      if (toolUseBlocks.length === 0 || resp.stop_reason !== 'tool_use') {
        finalText = textBlocks.map(b => b.text).join('\n').trim();
        break;
      }

      // Execute each tool call, accumulate results
      const toolResults = [];
      for (const tu of toolUseBlocks) {
        const result = await executeTool(tu.name, tu.input || {});
        toolsExecuted.push({ name: tu.name, args: tu.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }

      // Append assistant turn (with tool_use) and tool_result turn back into messages
      claudeMessages.push({ role: 'assistant', content: resp.content });
      claudeMessages.push({ role: 'user', content: toolResults });
    }

    // Parse the final structured JSON the agent produces
    const parsed = parseAgentJson(finalText);
    const message_es = parsed?.message_es || (finalText.includes('"message_es"') ? '' : finalText);
    const message_en = parsed?.message_en || finalText;
    const form_fragment = parsed?.form_fragment || null;
    const next_step = parsed?.next_step || session.current_step;
    const handoff_to_human = parsed?.handoff_to_human || null;

    // Persist assistant message
    const cost = costCents(totalUsage.input_tokens, totalUsage.output_tokens);
    await db.query(`
      INSERT INTO agent_messages (
        session_id, role, content, metadata,
        tokens_input, tokens_output, cost_cents, model, latency_ms, created_at
      ) VALUES ($1, 'assistant', $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      session.id, finalText,
      JSON.stringify({ parsed, tools_executed: toolsExecuted, message_es, message_en, form_fragment, next_step }),
      totalUsage.input_tokens, totalUsage.output_tokens, cost, cfg.model.model, turnLatency,
    ]);

    // Merge form_fragment into session.state
    let updatedState = session.state || {};
    if (form_fragment && typeof form_fragment === 'object') {
      updatedState = { ...updatedState, ...form_fragment };
    }

    // Update session totals
    await db.query(`
      UPDATE agent_sessions
      SET token_count_input = token_count_input + $1,
          token_count_output = token_count_output + $2,
          cost_cents = cost_cents + $3,
          current_step = $4,
          state = $5,
          last_active_at = NOW(),
          updated_at = NOW()
      WHERE id = $6
    `, [totalUsage.input_tokens, totalUsage.output_tokens, cost, next_step, JSON.stringify(updatedState), session.id]);

    pingBrain('AGENT_TURN', { session_id: session.id, agent_type: session.agent_type, step: next_step, tools: toolsExecuted.map(t => t.name), cost_cents: cost });

    // Handoff requested?
    if (handoff_to_human) {
      await db.query("UPDATE agent_sessions SET status = 'escalated' WHERE id = $1", [session.id]);
      await createHandoff(db, session.id, handoff_to_human.reason || 'AGENT_REQUEST', handoff_to_human.summary || '', handoff_to_human.assigned_to || 'unassigned');
      pingBrain('AGENT_HANDOFF_HUMAN', { session_id: session.id, reason: handoff_to_human.reason });
    }

    // Completion?
    if (next_step === 'complete') {
      await db.query("UPDATE agent_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1", [session.id]);
      // Materialize onboarding_session or buyer_inquiry
      if (session.agent_type === 'enrique') {
        await materializeOnboarding(db, session.id, updatedState, session.language);
      } else if (session.agent_type === 'eliot') {
        await materializeInquiry(db, session.id, updatedState, session.language);
      }
      pingBrain('AGENT_SESSION_COMPLETED', { session_id: session.id, agent_type: session.agent_type });
    }

    res.json({
      ok: true,
      message_es,
      message_en,
      form_fragment,
      next_step,
      tools_executed: toolsExecuted.map(t => ({ name: t.name, ok: t.result?.ok })),
      handoff: !!handoff_to_human,
      cost_cents: cost,
      tokens: { in: totalUsage.input_tokens, out: totalUsage.output_tokens },
    });
  } catch (e) {
    console.error('[agents] turn error:', e.message, e.stack);
    res.status(500).json({ ok: false, error: e.message });
  }
});

async function createHandoff(db, sessionId, reason, summary, assignee) {
  await db.query(`
    INSERT INTO agent_handoffs (session_id, reason, context_summary, assigned_to, status, created_at)
    VALUES ($1, $2, $3, $4, 'pending', NOW())
  `, [sessionId, reason, summary || null, assignee || 'unassigned']);
}

async function materializeOnboarding(db, sessionId, state, lang) {
  const id = newOnboardingId();
  await db.query(`
    INSERT INTO onboarding_sessions (
      id, agent_session_id, onboarding_type,
      applicant_name, applicant_email, applicant_phone,
      company_name, paca_number, rfc, ein,
      state_region, city, country,
      collected_data, documents, photos, certifications, commodities,
      status, created_at
    ) VALUES (
      $1, $2, 'grower',
      $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12,
      $13, $14, $15, $16, $17,
      'pending', NOW()
    )
  `, [
    id, sessionId,
    state.full_name || state.name || null, state.email || null, state.phone || null,
    state.company_name || state.company || null, state.paca_number || null, state.rfc || null, state.ein || null,
    state.state_region || state.state || null, state.city || null, state.country || null,
    JSON.stringify(state),
    JSON.stringify(state.documents || []),
    JSON.stringify(state.photos || []),
    JSON.stringify(state.certifications || []),
    JSON.stringify(state.commodities || []),
  ]);
  pingBrain('GROWER_REG_PENDING', { onboarding_id: id, session_id: sessionId });
  return id;
}

async function materializeInquiry(db, sessionId, state, lang) {
  const id = newInquiryId();
  await db.query(`
    INSERT INTO buyer_inquiries (
      id, agent_session_id,
      buyer_name, buyer_email, buyer_phone, buyer_company,
      paca_number, business_type, fob_destination, destination_country,
      commodity, volume_loads, unit_size, needed_by, recurring, recurrence_pattern,
      price_ceiling, certifications_required, packaging_preference, notes,
      matched_growers, matches_count,
      status, created_at
    ) VALUES (
      $1, $2,
      $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20,
      $21, $22,
      'new', NOW()
    )
  `, [
    id, sessionId,
    state.full_name || state.name || null, state.email || null, state.phone || null, state.company || null,
    state.paca_number || null, state.business_type || null, state.fob_destination || null, state.destination_country || null,
    state.commodity || null, state.volume_loads || null, state.unit_size || null, state.needed_by || null, !!state.recurring, state.recurrence_pattern || null,
    state.price_ceiling || null, JSON.stringify(state.certifications_required || []), state.packaging_preference || null, state.notes || null,
    JSON.stringify(state.matched_growers || []), (state.matched_growers || []).length,
  ]);
  pingBrain('BUYER_INQUIRY_SUBMITTED', { inquiry_id: id, session_id: sessionId });
  return id;
}

// ============================================================================
// GET /api/agents/:id  -- fetch session + recent messages
// ============================================================================
router.get('/:id', async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, error: 'DB not ready' });
  try {
    const s = await db.query('SELECT * FROM agent_sessions WHERE id = $1', [req.params.id]);
    if (!s.rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const m = await db.query(`
      SELECT role, content, metadata, created_at FROM agent_messages
      WHERE session_id = $1 ORDER BY created_at ASC
    `, [req.params.id]);
    res.json({ ok: true, session: s.rows[0], messages: m.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// GET /api/agents/resume/:token
// ============================================================================
router.get('/resume/:token', async (req, res) => {
  const db = getDb();
  try {
    const s = await db.query('SELECT * FROM agent_sessions WHERE resume_token = $1', [req.params.token]);
    if (!s.rows.length) return res.status(404).json({ ok: false, error: 'Invalid resume link' });
    const m = await db.query(`
      SELECT role, content, metadata, created_at FROM agent_messages
      WHERE session_id = $1 ORDER BY created_at ASC
    `, [s.rows[0].id]);
    // Re-activate if paused
    if (s.rows[0].status === 'paused') {
      await db.query("UPDATE agent_sessions SET status = 'active', last_active_at = NOW() WHERE id = $1", [s.rows[0].id]);
    }
    res.json({ ok: true, session: s.rows[0], messages: m.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// POST /api/agents/:id/handoff
// ============================================================================
router.post('/:id/handoff', async (req, res) => {
  const db = getDb();
  try {
    const { reason = 'USER_REQUEST', summary = '', assignee = 'unassigned' } = req.body || {};
    await db.query("UPDATE agent_sessions SET status = 'escalated' WHERE id = $1", [req.params.id]);
    await createHandoff(db, req.params.id, reason, summary, assignee);
    pingBrain('AGENT_HANDOFF_HUMAN', { session_id: req.params.id, reason });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ============================================================================
// POST /api/agents/:id/abandon
// ============================================================================
router.post('/:id/abandon', async (req, res) => {
  const db = getDb();
  try {
    await db.query("UPDATE agent_sessions SET status = 'abandoned' WHERE id = $1", [req.params.id]);
    pingBrain('AGENT_SESSION_ABANDONED', { session_id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ============================================================================
// ADMIN endpoints
// ============================================================================
router.get('/list', async (req, res) => {
  const db = getDb();
  try {
    const { agent_type, status, limit = 50 } = req.query;
    const where = []; const params = []; let i = 1;
    if (agent_type) { where.push(`agent_type = $${i++}`); params.push(agent_type); }
    if (status)     { where.push(`status = $${i++}`);     params.push(status); }
    const sql = `SELECT * FROM agent_sessions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY last_active_at DESC LIMIT $${i}`;
    params.push(Math.min(parseInt(limit, 10) || 50, 500));
    const r = await db.query(sql, params);
    res.json({ ok: true, sessions: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/handoffs', async (req, res) => {
  const db = getDb();
  try {
    const r = await db.query(`
      SELECT h.*, s.agent_type, s.user_email, s.user_name
      FROM agent_handoffs h
      LEFT JOIN agent_sessions s ON s.id = h.session_id
      WHERE h.status = 'pending'
      ORDER BY h.created_at DESC LIMIT 100
    `);
    res.json({ ok: true, handoffs: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/onboarding', async (req, res) => {
  const db = getDb();
  try {
    const { status = 'pending,reviewing,needs_info' } = req.query;
    const statuses = status.split(',');
    const r = await db.query(`
      SELECT * FROM onboarding_sessions
      WHERE status = ANY($1::text[])
      ORDER BY created_at DESC LIMIT 200
    `, [statuses]);
    res.json({ ok: true, onboardings: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/inquiries', async (req, res) => {
  const db = getDb();
  try {
    const r = await db.query(`
      SELECT * FROM buyer_inquiries
      WHERE status NOT IN ('closed','declined')
      ORDER BY created_at DESC LIMIT 200
    `);
    res.json({ ok: true, inquiries: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ============================================================================
// POST /api/agents/onboarding/:id/promote
// Admin (Saul/Pablo/Florencio) promotes an onboarding into the live growers table
// ============================================================================
router.post('/onboarding/:id/promote', async (req, res) => {
  const db = getDb();
  try {
    const tok = pickAuth(req); // assume reviewer is identified via JWT
    const reviewer = req.body?.reviewer_id || 'unknown';
    const r = await db.query('SELECT * FROM onboarding_sessions WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const onb = r.rows[0];

    // Insert into growers (assumes growers table exists with at least these columns)
    const growerRes = await db.query(`
      INSERT INTO growers (
        name, email, phone, company, paca_number, state_region, city, country,
        commodities, certifications, status, source, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', 'enrique_onboarding', NOW())
      RETURNING id
    `, [
      onb.applicant_name, onb.applicant_email, onb.applicant_phone, onb.company_name,
      onb.paca_number, onb.state_region, onb.city, onb.country,
      JSON.stringify(onb.commodities || []), JSON.stringify(onb.certifications || []),
    ]).catch(e => ({ rows: [{ id: 'GROWER_INSERT_FAILED_' + Date.now(), error: e.message }] }));

    const growerId = growerRes.rows[0]?.id;

    await db.query(`
      UPDATE onboarding_sessions
      SET status = 'promoted', reviewer_id = $1, reviewed_at = NOW(),
          promoted_to_table = 'growers', promoted_to_id = $2, promoted_at = NOW()
      WHERE id = $3
    `, [reviewer, growerId, req.params.id]);

    pingBrain('GROWER_PROMOTED_TO_LIVE', { onboarding_id: req.params.id, grower_id: growerId, reviewer });
    res.json({ ok: true, grower_id: growerId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/onboarding/:id/reject', async (req, res) => {
  const db = getDb();
  try {
    const reviewer = req.body?.reviewer_id || 'unknown';
    const notes = req.body?.notes || '';
    await db.query(`
      UPDATE onboarding_sessions
      SET status = 'rejected', reviewer_id = $1, reviewed_at = NOW(), reviewer_notes = $2
      WHERE id = $3
    `, [reviewer, notes, req.params.id]);
    pingBrain('GROWER_REG_REJECTED', { onboarding_id: req.params.id, reviewer });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
