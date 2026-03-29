const express  = require('express');
const router   = express.Router();
const twilio   = require('twilio');
const { getPool } = require('../db');

const client   = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM     = process.env.TWILIO_PHONE_NUMBER;

const MSGS = {
  welcome:    'Bienvenido a AuditDNA / CM Products International.\nResponde con:\n1 - Registrarme\n2 - Estado de mis documentos\n3 - Hablar con un agente\n4 - English',
  welcome_en: 'Welcome to AuditDNA / CM Products International.\nReply with:\n1 - Register\n2 - Document status\n3 - Talk to an agent\n4 - Espanol',
  register:   'Para registrarte como productor, visita:\nhttps://mexausafg.com/#grower-portal\n\nNecesitas:\n- Licencia comercial\n- Plan FSMA\n- Certificado GAP/BPM\n- Cert. fitosanitario\n- Seguro de responsabilidad\n- RFC/W-9\n- Acuerdo CM Products\n\nResponde STATUS para ver tus documentos.',
  register_en:'To register as a grower, visit:\nhttps://mexausafg.com/#grower-portal\n\nYou need:\n- Business license\n- FSMA Food Safety Plan\n- GAP/GMP Certificate\n- Phytosanitary cert\n- Liability insurance\n- RFC/W-9\n- CM Products Agreement\n\nReply STATUS to check your documents.',
  agent:      'Un agente de CM Products se comunicara contigo pronto.\nSaul Garcia: +1-831-251-3116\nOficina Baja: +52-646-340-2686',
  unknown:    'No entendi tu mensaje. Responde 1, 2, 3 o 4.\nFor English reply 4.',
};

const sendSMS = async (to, body) => {
  try {
    await client.messages.create({ from: FROM, to, body });
  } catch(e) {
    console.error('[SMS ERROR]', e.message);
  }
};

// POST /api/sms/webhook — Twilio inbound
router.post('/webhook', async (req, res) => {
  const pool = getPool(req);
  const { Body, From } = req.body;
  const msg  = (Body||'').trim().toLowerCase();
  const phone = From || '';

  console.log('[SMS INBOUND]', phone, ':', Body);

  let reply = MSGS.unknown;

  if (!msg || msg === 'hola' || msg === 'hi' || msg === 'hello' || msg === 'inicio' || msg === 'start' || msg === 'menu') {
    reply = MSGS.welcome;
  } else if (msg === '1' || msg === 'registro' || msg === 'registrar' || msg === 'register') {
    reply = MSGS.register;
    // Log inbound lead
    try {
      await pool.query(
        'INSERT INTO sms_leads (phone, action, created_at) VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING',
        [phone, 'register_request']
      );
    } catch(e) {}
  } else if (msg === '2' || msg === 'status' || msg === 'estado' || msg === 'documentos') {
    // Check compliance status by phone
    try {
      const r = await pool.query(
        'SELECT id, company_name, docs_complete, compliance_status FROM grower_profiles WHERE phone=$1 LIMIT 1',
        [phone]
      );
      if (r.rows.length) {
        const g = r.rows[0];
        const docs = await pool.query(
          'SELECT DISTINCT doc_type FROM grower_documents WHERE grower_id=$1', [g.id]
        );
        const uploaded = docs.rows.map(d=>d.doc_type);
        const total    = 7;
        const done     = uploaded.length;
        reply = g.docs_complete
          ? `${g.company_name}: Todos los documentos completos. Acceso aprobado.`
          : `${g.company_name}: ${done}/${total} documentos enviados.\nFalta(n): visita mexausafg.com/#grower-portal para subir los documentos faltantes.`;
      } else {
        reply = 'No encontramos tu numero en el sistema. Registrate en:\nhttps://mexausafg.com/#grower-portal';
      }
    } catch(e) {
      reply = 'Error consultando tu estado. Intenta de nuevo o llama al +1-831-251-3116';
    }
  } else if (msg === '3' || msg === 'agente' || msg === 'agent' || msg === 'ayuda' || msg === 'help') {
    reply = MSGS.agent;
  } else if (msg === '4' || msg === 'english' || msg === 'en') {
    reply = MSGS.welcome_en;
  } else if (msg === 'register en' || msg === '1 en') {
    reply = MSGS.register_en;
  }

  await sendSMS(phone, reply);
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

// POST /api/sms/send — manual send from admin panel
router.post('/send', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });
  try {
    const result = await client.messages.create({ from: FROM, to, body: message });
    res.json({ success: true, sid: result.sid });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sms/blast — send to list of growers missing docs
router.post('/blast', async (req, res) => {
  const pool = getPool(req);
  try {
    const r = await pool.query(
      'SELECT phone, first_name, company_name FROM grower_profiles WHERE docs_complete=false AND phone IS NOT NULL AND phone != \'\' LIMIT 50'
    );
    let sent = 0;
    for (const g of r.rows) {
      const name = g.company_name || g.first_name || 'Productor';
      const msg  = `Hola ${name}, te falta completar tus documentos en AuditDNA. Visita mexausafg.com/#grower-portal o responde STATUS para ver que falta. CM Products International.`;
      await sendSMS(g.phone, msg);
      sent++;
      await new Promise(r=>setTimeout(r,300));
    }
    res.json({ success: true, sent });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
