// =============================================================================
// AUDITDNA — GROWER ONBOARDING BOT (WhatsApp via OpenClaw)
// Spanish-only | Field workers Michoacan/Sinaloa/Baja/Sonora
// Saves to Railway PostgreSQL growers table
// Run: node grower-bot.js
// =============================================================================

const http = require('http');
const https = require('https');
const { Pool } = require('pg');

const OPENCLAW_GATEWAY = 'ws://process.env.DB_HOST:18789';
const OPENCLAW_TOKEN   = 'f8500ee7115a28d7aea6d694ee853eca797d72278d72c627';
const SAUL_WHATSAPP    = process.env.SAUL_WA || '+18315939998';
const API_BASE         = process.env.REACT_APP_API_URL || 'http://process.env.DB_HOST:5050';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres:PMJobEqMsVuiwvFwHlHFUrGXarncSAQj@hopper.proxy.rlwy.net:55424/railway',
  ssl: { rejectUnauthorized: false }
});

// =============================================================================
// SESSION STORE (in-memory — persists as long as bot runs)
// =============================================================================
const sessions = {}; // { phone: { step, data, lastActivity } }

// =============================================================================
// CONVERSATION FLOW — 8 STEPS
// =============================================================================
const STEPS = {
  START: 0,
  NOMBRE: 1,
  EMPRESA: 2,
  ESTADO: 3,
  MUNICIPIO: 4,
  PRODUCTOS: 5,
  CERTIFICACIONES: 6,
  EMAIL: 7,
  SENASICA: 8,
  CONFIRM: 9,
  DONE: 10,
};

const MESSAGES = {
  BIENVENIDA: `*Bienvenido a AuditDNA - Mexausa Food Group, Inc.*

Hola! Soy el asistente de registro para productores agricolas.

En pocos minutos podra registrarse como proveedor en nuestra plataforma y acceder a compradores en USA y Mexico.

Para comenzar, escriba su *nombre completo*:`,

  EMPRESA: (nombre) => `Gracias, *${nombre}*!

Ahora dinos el nombre de tu *rancho o empresa*:`,

  ESTADO: `Perfecto!

En que *estado* de Mexico se encuentra tu rancho?
(Ej: Michoacan, Sinaloa, Baja California, Sonora, Jalisco, Guanajuato...)`,

  MUNICIPIO: (estado) => `Excelente!

Y en que *municipio* de ${estado}?`,

  PRODUCTOS: `Muy bien!

Cuales son tus *productos principales*?
(Ej: Aguacate, Fresa, Tomate, Limon, Uva, Esparrago...)

Puedes escribir varios separados por coma:`,

  CERTIFICACIONES: `Que *certificaciones* tienes?

- GlobalGAP
- PrimusGFS  
- SENASICA
- USDA Organico
- FDA Registrado
- Ninguna por ahora

Escribe las que apliquen o "Ninguna":`,

  EMAIL: `Casi terminamos!

Cual es tu *correo electronico* de contacto?`,

  SENASICA: `Tienes numero de *registro SENASICA*?
(Si no tienes, escribe "No")`,

  CONFIRMAR: (data) => `*RESUMEN DE REGISTRO*

Nombre: ${data.nombre}
Empresa: ${data.empresa}
Estado: ${data.estado}
Municipio: ${data.municipio}
Productos: ${data.productos}
Certificaciones: ${data.certificaciones}
Email: ${data.email}
SENASICA: ${data.senasica}

Es correcto? Responde *SI* para confirmar o *NO* para empezar de nuevo.`,

  REGISTRADO: (nombre) => `*Registro exitoso!*

${nombre}, has sido registrado en la plataforma AuditDNA.

Nuestro equipo revisara tu informacion y te contactara en las proximas 24-48 horas.

Para mas informacion: sales@mexausafg.com
Tel: +52-646-340-2686

Bienvenido a la familia Mexausa Food Group!`,

  ERROR: `Lo siento, hubo un problema. Por favor intenta de nuevo escribiendo *HOLA*.`,
  
  NO_ENTIENDO: `No entendi tu respuesta. Por favor responde segun las instrucciones anteriores, o escribe *HOLA* para empezar de nuevo.`,
};

// =============================================================================
// SEND MESSAGE VIA OPENCLAW GATEWAY
// =============================================================================
async function sendMessage(to, message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'message.send',
      params: {
        channel: 'whatsapp',
        to,
        message,
      }
    });

    const options = {
      hostname: 'process.env.DB_HOST',
      port: 18789,
      path: '/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// =============================================================================
// OPENCLAW CLI SEND (fallback using child_process)
// =============================================================================
const { execSync } = require('child_process');

function sendViaOcCli(to, message) {
  try {
    const escaped = message.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const result = execSync(
      `openclaw message send --channel whatsapp --target ${to} --message "${escaped}" --json`,
      { encoding: 'utf8', timeout: 15000 }
    );
    console.log(`[BOT] Sent to ${to}:`, result.slice(0, 100));
    return true;
  } catch (err) {
    console.error(`[BOT] Send failed:`, err.message);
    return false;
  }
}

// =============================================================================
// SAVE GROWER TO DATABASE
// =============================================================================
async function saveGrower(phone, data) {
  try {
    // Try Railway backend API first
    const payload = JSON.stringify({
      phone,
      name: data.nombre,
      company: data.empresa,
      state: data.estado,
      municipality: data.municipio,
      products: data.productos,
      certifications: data.certificaciones,
      email: data.email,
      senasica: data.senasica === 'No' ? null : data.senasica,
      source: 'whatsapp_bot',
      status: 'pending_review',
      registered_at: new Date().toISOString(),
    });

    // Save to Railway PostgreSQL directly
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_grower_registrations (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20),
        name VARCHAR(255),
        company VARCHAR(255),
        state VARCHAR(100),
        municipality VARCHAR(100),
        products TEXT,
        certifications TEXT,
        email VARCHAR(255),
        senasica VARCHAR(100),
        source VARCHAR(50) DEFAULT 'whatsapp_bot',
        status VARCHAR(50) DEFAULT 'pending_review',
        registered_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await pool.query(`
      INSERT INTO whatsapp_grower_registrations
        (phone, name, company, state, municipality, products, certifications, email, senasica)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id
    `, [phone, data.nombre, data.empresa, data.estado, data.municipio,
        data.productos, data.certificaciones, data.email, data.senasica]);

    console.log(`[BOT] Grower saved to DB — ID: ${result.rows[0].id}`);

    // Notify Saul via WhatsApp
    const notif = `*NUEVO PRODUCTOR REGISTRADO*\n\nNombre: ${data.nombre}\nEmpresa: ${data.empresa}\nEstado: ${data.estado}\nProductos: ${data.productos}\nEmail: ${data.email}\nTel: ${phone}`;
    sendViaOcCli(SAUL_WHATSAPP, notif);

    return result.rows[0].id;
  } catch (err) {
    console.error('[BOT] DB save failed:', err.message);
    return null;
  }
}

// =============================================================================
// PROCESS INCOMING MESSAGE
// =============================================================================
async function processMessage(from, text) {
  const phone = from.replace(/\D/g, '');
  const msg = (text || '').trim();
  const msgLower = msg.toLowerCase();

  console.log(`[BOT] Incoming from ${phone}: "${msg}"`);

  // Reset trigger
  if (msgLower === 'hola' || msgLower === 'hi' || msgLower === 'inicio' || msgLower === 'start' || !sessions[phone]) {
    sessions[phone] = { step: STEPS.NOMBRE, data: {}, lastActivity: Date.now() };
    return sendViaOcCli(from, MESSAGES.BIENVENIDA);
  }

  const session = sessions[phone];
  session.lastActivity = Date.now();

  switch (session.step) {
    case STEPS.NOMBRE:
      if (msg.length < 3) return sendViaOcCli(from, 'Por favor escribe tu nombre completo (minimo 3 caracteres):');
      session.data.nombre = msg;
      session.step = STEPS.EMPRESA;
      return sendViaOcCli(from, MESSAGES.EMPRESA(msg));

    case STEPS.EMPRESA:
      if (msg.length < 2) return sendViaOcCli(from, 'Por favor escribe el nombre de tu rancho o empresa:');
      session.data.empresa = msg;
      session.step = STEPS.ESTADO;
      return sendViaOcCli(from, MESSAGES.ESTADO);

    case STEPS.ESTADO:
      session.data.estado = msg;
      session.step = STEPS.MUNICIPIO;
      return sendViaOcCli(from, MESSAGES.MUNICIPIO(msg));

    case STEPS.MUNICIPIO:
      session.data.municipio = msg;
      session.step = STEPS.PRODUCTOS;
      return sendViaOcCli(from, MESSAGES.PRODUCTOS);

    case STEPS.PRODUCTOS:
      if (msg.length < 3) return sendViaOcCli(from, 'Por favor escribe al menos un producto:');
      session.data.productos = msg;
      session.step = STEPS.CERTIFICACIONES;
      return sendViaOcCli(from, MESSAGES.CERTIFICACIONES);

    case STEPS.CERTIFICACIONES:
      session.data.certificaciones = msg;
      session.step = STEPS.EMAIL;
      return sendViaOcCli(from, MESSAGES.EMAIL);

    case STEPS.EMAIL:
      if (!msg.includes('@')) return sendViaOcCli(from, 'Por favor escribe un correo electronico valido (ejemplo: juan@rancho.com):');
      session.data.email = msg;
      session.step = STEPS.SENASICA;
      return sendViaOcCli(from, MESSAGES.SENASICA);

    case STEPS.SENASICA:
      session.data.senasica = msg;
      session.step = STEPS.CONFIRM;
      return sendViaOcCli(from, MESSAGES.CONFIRMAR(session.data));

    case STEPS.CONFIRM:
      if (msgLower === 'si' || msgLower === 'sí' || msgLower === 's') {
        const id = await saveGrower(from, session.data);
        session.step = STEPS.DONE;
        return sendViaOcCli(from, MESSAGES.REGISTRADO(session.data.nombre));
      } else if (msgLower === 'no' || msgLower === 'n') {
        sessions[phone] = { step: STEPS.NOMBRE, data: {}, lastActivity: Date.now() };
        return sendViaOcCli(from, MESSAGES.BIENVENIDA);
      } else {
        return sendViaOcCli(from, 'Por favor responde *SI* para confirmar o *NO* para empezar de nuevo.');
      }

    case STEPS.DONE:
      return sendViaOcCli(from, `Hola ${session.data.nombre}! Ya estas registrado. Para iniciar un nuevo registro escribe *HOLA*.\n\nContacto: sales@mexausafg.com`);

    default:
      sessions[phone] = { step: STEPS.NOMBRE, data: {}, lastActivity: Date.now() };
      return sendViaOcCli(from, MESSAGES.BIENVENIDA);
  }
}

// =============================================================================
// WEBHOOK SERVER — OpenClaw posts inbound messages here
// =============================================================================
const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const event = JSON.parse(body);
        console.log('[BOT] Webhook event:', JSON.stringify(event).slice(0, 200));

        // OpenClaw webhook format
        const from = event.from || event.sender || event.contact?.phone || event.message?.from;
        const text = event.text || event.body || event.message?.text || event.content;

        if (from && text) {
          await processMessage(from, text);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('[BOT] Webhook error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, sessions: Object.keys(sessions).length }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[BOT] Grower onboarding bot listening on port ${PORT}`);
  console.log(`[BOT] Webhook URL: http://process.env.DB_HOST:${PORT}/webhook`);
  console.log(`[BOT] Health: http://process.env.DB_HOST:${PORT}/health`);
  console.log(`[BOT] Notify Saul at: ${SAUL_WHATSAPP}`);
});

// Clean up stale sessions every hour
setInterval(() => {
  const now = Date.now();
  Object.keys(sessions).forEach(phone => {
    if (now - sessions[phone].lastActivity > 3600000) {
      delete sessions[phone];
      console.log(`[BOT] Cleared stale session for ${phone}`);
    }
  });
}, 3600000);

console.log('[BOT] AuditDNA Grower Onboarding Bot started');
console.log('[BOT] Waiting for WhatsApp messages...');
console.log('[BOT] Send HOLA to +52-646-340-2686 to start registration');
