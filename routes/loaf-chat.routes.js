'use strict';
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { AGENT_CONFIGS, routeInquiry, logAgentEvent, escalateToHuman } = require('../agents/loaf-agents');

router.post('/chat', async (req, res) => {
  try {
    const { message, agent: requestedAgent, session_id } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ ok: false, error: 'message required' });
    const ai = req.app.get('ai');
    const pool = req.app.get('pool');
    const sessionId = session_id || crypto.randomUUID();
    const agentName = requestedAgent && AGENT_CONFIGS[requestedAgent.toUpperCase()] ? requestedAgent.toUpperCase() : routeInquiry(message);
    const agent = AGENT_CONFIGS[agentName];
    const response = await ai.ask(message, agent.system_prompt);
    await logAgentEvent(agentName, sessionId, message, response, { source: 'loaf-chat' });
    const esc = ['urgent','recall','fda investigation','lawsuit','talk to someone','call me'];
    if (esc.some(k => message.toLowerCase().includes(k))) await escalateToHuman(agentName, sessionId, { message }, 'high');
    if (pool) pool.query('INSERT INTO loaf_chat_log (session_id,agent,user_message,agent_response,created_at) VALUES ($1,$2,$3,$4,NOW())', [sessionId, agentName, message, response]).catch(()=>{});
    return res.json({ ok: true, session_id: sessionId, agent: agentName, agent_display: agent.display_name, response });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/agents', (req, res) => {
  res.json({ ok: true, agents: Object.entries(AGENT_CONFIGS).map(([k,v]) => ({ id: k, name: v.display_name, opening: v.opening_message })) });
});

module.exports = router;
