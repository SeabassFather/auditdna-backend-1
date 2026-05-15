// ================================================================================
// LOAF LIFECYCLE WHATSAPP PARSER
// Parses incoming WhatsApp messages from shippers/growers and posts to Lifecycle API
// Install in: C:\AuditDNA\backend\loaf\whatsapp-lifecycle-parser.js
// Wires into: OpenClaw bot message handler (SOUL.md + agent handler)
// ================================================================================
'use strict';

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const API_BASE = process.env.API_BASE || 'http://localhost:5050';

// ── COMMAND PATTERNS ────────────────────────────────────────────────────────────
// Shipper texts: LOT-AX9F2K DEPARTURE 24000 ARRIVAL 22800 FUEL 640 MILES 2400 BORDER 3.5
// Grower texts:  LOT-AX9F2K HARVEST 18000 WATER 4800 CHEMICALS 12 FUEL 180 LABOR 480
// Packer texts:  LOT-AX9F2K RECEIVED 17800 ENERGY 420 REJECTED 200 PACKAGING 340
// Buyer texts:   LOT-AX9F2K BUYERRECEIVED 21200 WASTE 180 SHELF 14 COMMUNITIES "Salinas CA"
// Status check:  STATUS LOT-AX9F2K
// Help:          LOAF HELP / LOAF AYUDA

const LOT_PATTERN    = /\b(LOT-[A-Z0-9-]+|LC-[A-Z0-9]+)\b/i;
const NUM            = (text, keys) => {
  for (const k of keys) {
    const m = new RegExp(`\\b${k}[:\\s]+([0-9]+\\.?[0-9]*)`, 'i').exec(text);
    if (m) return parseFloat(m[1]);
  }
  return null;
};
const STR = (text, keys) => {
  for (const k of keys) {
    const m = new RegExp(`\\b${k}[:\\s]+"?([^"\\n]+)"?`, 'i').exec(text);
    if (m) return m[1].trim();
  }
  return null;
};

function detectStage(text) {
  const t = text.toUpperCase();
  if (/\b(HARVEST|COSECHA|WATER|AGUA|CHEMICALS|QUIMICOS|FERTILIZER)\b/.test(t)) return 'field';
  if (/\b(RECEIVED|RECIBIDO|ENERGY|ENERGIA|REJECTED|RECHAZADO|PACKAGING|EMPAQUE)\b/.test(t)) return 'packinghouse';
  if (/\b(DEPARTURE|SALIDA|ARRIVAL|LLEGADA|MILES|MILLAS|BORDER|FRONTERA|TRANSIT)\b/.test(t)) return 'transit';
  if (/\b(BUYERRECEIVED|COMPRADOR|WASTE|DESPERDICIO|SHELF|COMMUNITIES|COMUNIDADES)\b/.test(t)) return 'buyer';
  return null;
}

function parseFieldData(text) {
  return {
    harvestWeightKg:        NUM(text, ['HARVEST','COSECHA','PESO','WEIGHT']),
    waterLitersPerHa:       NUM(text, ['WATER','AGUA','AGUA/HA']),
    chemicalKgPerHa:        NUM(text, ['CHEMICALS','QUIMICOS','CHEM']),
    fertilizerKgPerHa:      NUM(text, ['FERTILIZER','FERTILIZANTE','FERT']),
    fuelLitersField:        NUM(text, ['FUEL','COMBUSTIBLE']),
    laborHoursField:        NUM(text, ['LABOR','TRABAJO','HORAS']),
    soilCarbonBaseline:     NUM(text, ['CARBON','CARBONO','SOIL']),
    distanceToPackhouseKm:  NUM(text, ['DISTANCE','DISTANCIA','KM']),
  };
}

function parsePackhouseData(text) {
  return {
    weightReceivedKg:     NUM(text, ['RECEIVED','RECIBIDO','WEIGHT','PESO']),
    energyKwhPackhouse:   NUM(text, ['ENERGY','ENERGIA','KWH']),
    rejectedWeightKg:     NUM(text, ['REJECTED','RECHAZADO','REJECT']),
    packagingWeightKg:    NUM(text, ['PACKAGING','EMPAQUE','PACKING']),
    waterLitersPackhouse: NUM(text, ['WATER','AGUA']),
    laborHoursPackhouse:  NUM(text, ['LABOR','TRABAJO','HORAS']),
  };
}

function parseTransitData(text) {
  return {
    weightDepartureKg: NUM(text, ['DEPARTURE','SALIDA','DEP','PESO_SALIDA']),
    weightArrivalKg:   NUM(text, ['ARRIVAL','LLEGADA','ARR','PESO_LLEGADA']),
    milesTransit:      NUM(text, ['MILES','MILLAS','KM','DISTANCE','DISTANCIA']),
    fuelLitersTransit: NUM(text, ['FUEL','COMBUSTIBLE']),
    refrigFuelLiters:  NUM(text, ['REFRIG','REFRIGERACION','REFRIGERATION']),
    borderWaitHours:   NUM(text, ['BORDER','FRONTERA','WAIT','ESPERA']),
    route:             STR(text, ['ROUTE','RUTA','VIA']),
  };
}

function parseBuyerData(text) {
  return {
    weightBuyerReceivedKg: NUM(text, ['BUYERRECEIVED','COMPRADOR','RECEIVED','RECIBIDO','WEIGHT']),
    wasteBuyerKg:          NUM(text, ['WASTE','DESPERDICIO','PERDIDA']),
    storageEnergyKwh:      NUM(text, ['ENERGY','ENERGIA','KWH','STORAGE']),
    shelfLifeDays:         NUM(text, ['SHELF','VIDA_UTIL','DIAS','DAYS']),
    communitiesServed:     STR(text, ['COMMUNITIES','COMUNIDADES','COMMUNITY']),
  };
}

// ── HELP MESSAGES ────────────────────────────────────────────────────────────────
const HELP_EN = `*LOAF Data Submission via WhatsApp*

*FIELD (Grower):*
LOT-XXXXXX HARVEST 18000 WATER 4800 CHEMICALS 12 FUEL 180 LABOR 480

*PACKHOUSE (Packer):*
LOT-XXXXXX RECEIVED 17800 ENERGY 420 REJECTED 200 PACKAGING 340

*TRANSIT (Shipper):*
LOT-XXXXXX DEPARTURE 24000 ARRIVAL 22800 MILES 2400 FUEL 640 BORDER 3.5

*BUYER (Receiver):*
LOT-XXXXXX BUYERRECEIVED 21200 WASTE 180 SHELF 14

*Check status:*
STATUS LOT-XXXXXX

_Mexausa Food Group Inc. · loaf.mexausafg.com · Patent Pending_`;

const HELP_ES = `*Envío de Datos LOAF por WhatsApp*

*CAMPO (Productor):*
LOT-XXXXXX COSECHA 18000 AGUA 4800 QUIMICOS 12 COMBUSTIBLE 180 TRABAJO 480

*EMPAQUE (Empacador):*
LOT-XXXXXX RECIBIDO 17800 ENERGIA 420 RECHAZADO 200 EMPAQUE 340

*TRÁNSITO (Transportista):*
LOT-XXXXXX SALIDA 24000 LLEGADA 22800 MILLAS 2400 COMBUSTIBLE 640 FRONTERA 3.5

*COMPRADOR (Receptor):*
LOT-XXXXXX COMPRADOR 21200 DESPERDICIO 180 DIAS 14

*Consultar estado:*
STATUS LOT-XXXXXX

_Mexausa Food Group Inc. · loaf.mexausafg.com · Patente Pendiente_`;

// ── MAIN PARSER ──────────────────────────────────────────────────────────────────
async function parseLifecycleMessage(message, from) {
  const text = (message || '').trim();
  const upper = text.toUpperCase();

  // HELP
  if (/\b(LOAF\s+HELP|LOAF\s+AYUDA|LIFECYCLE\s+HELP)\b/.test(upper)) {
    return { reply: upper.includes('AYUDA') ? HELP_ES : HELP_EN, action: 'help' };
  }

  // STATUS CHECK
  const statusMatch = /\bSTATUS\s+(LOT-[A-Z0-9-]+|LC-[A-Z0-9]+)\b/i.exec(text);
  if (statusMatch) {
    const lotId = statusMatch[1].toUpperCase();
    try {
      const res = await fetch(`${API_BASE}/api/lifecycle/loads?lot=${lotId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      const loads = data.loads || data.data || [];
      if (loads.length === 0) {
        return { reply: `No records found for ${lotId}.\nSend data to create a record.\nType LOAF HELP for format.`, action: 'status' };
      }
      const stages = loads.map(l => l.stage).join(', ');
      const latest = loads[0];
      return {
        reply: `*Status: ${lotId}*\nStages logged: ${stages}\nLatest: ${latest.stage} — ${latest.submittedAt ? new Date(latest.submittedAt).toLocaleString() : 'unknown'}\nCommodity: ${latest.commodity || 'N/A'}\nGrower: ${latest.grower || 'N/A'}`,
        action: 'status'
      };
    } catch {
      return { reply: `Could not fetch status for ${lotId}. Try again shortly.`, action: 'error' };
    }
  }

  // DATA SUBMISSION
  const lotMatch = LOT_PATTERN.exec(text);
  if (!lotMatch) {
    return {
      reply: 'No Lot ID found. Start your message with your Lot ID.\nExample: LOT-AX9F2K HARVEST 18000 WATER 4800\n\nType LOAF HELP for all formats.',
      action: 'error'
    };
  }

  const lotNumber = lotMatch[1].toUpperCase();
  const stage     = detectStage(text);

  if (!stage) {
    return {
      reply: `Lot ID found: *${lotNumber}*\nBut could not detect stage.\nInclude keywords like HARVEST, RECEIVED, DEPARTURE, or BUYERRECEIVED.\n\nType LOAF HELP for format.`,
      action: 'error'
    };
  }

  let stageData = {};
  if (stage === 'field')        stageData = parseFieldData(text);
  if (stage === 'packinghouse') stageData = parsePackhouseData(text);
  if (stage === 'transit')      stageData = parseTransitData(text);
  if (stage === 'buyer')        stageData = parseBuyerData(text);

  // Remove null fields
  Object.keys(stageData).forEach(k => { if (stageData[k] === null) delete stageData[k]; });

  const payload = {
    lotNumber,
    stage,
    source: 'whatsapp',
    whatsappFrom: from,
    submittedAt: new Date().toISOString(),
    id: `WA-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    ...stageData,
  };

  try {
    const res = await fetch(`${API_BASE}/api/lifecycle/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    const fieldCount = Object.keys(stageData).length;
    const stageLabel = {
      field:'Field / Campo', packinghouse:'Packinghouse / Empaque',
      transit:'Transit / Tránsito', buyer:'Buyer / Comprador'
    }[stage];

    return {
      reply: `*LOAF Data Received*\nLot: ${lotNumber}\nStage: ${stageLabel}\nFields captured: ${fieldCount}\nRecord ID: ${payload.id}\n\n_Data logged to AuditDNA Lifecycle Intelligence._\n_Individual data never shared. Mexausa Food Group Inc. · Patent Pending_`,
      action: 'submitted',
      payload,
    };
  } catch (err) {
    return {
      reply: `Error saving data for ${lotNumber}. Please try again or visit loaf.mexausafg.com/submit?lot=${lotNumber}&stage=${stage}`,
      action: 'error',
      error: err.message,
    };
  }
}

// ── LIFECYCLE API ROUTES ──────────────────────────────────────────────────────────
function registerLifecycleRoutes(app, db) {
  // POST /api/lifecycle/loads — receive a load submission
  app.post('/api/lifecycle/loads', async (req, res) => {
    try {
      const load = req.body;
      if (!load.lotNumber && !load.id) return res.status(400).json({ error: 'lotNumber required' });
      // Store in DB if available
      try {
        await db.query(
          `INSERT INTO lifecycle_loads (id, lot_number, stage, grower, commodity, country, region, source, submitted_at, payload)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET payload=$10, submitted_at=$9`,
          [
            load.id || `LC-${Date.now().toString(36).toUpperCase().slice(-6)}`,
            load.lotNumber || load.lot_number,
            load.stage || 'unknown',
            load.grower || null,
            load.commodity || null,
            load.country || null,
            load.region || null,
            load.source || 'platform',
            load.submittedAt || new Date().toISOString(),
            JSON.stringify(load),
          ]
        );
      } catch (dbErr) {
        console.warn('lifecycle_loads DB insert warn:', dbErr.message);
      }
      res.json({ success: true, id: load.id, lot: load.lotNumber, stage: load.stage });
    } catch (err) {
      console.error('lifecycle POST error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/lifecycle/loads — query loads
  app.get('/api/lifecycle/loads', async (req, res) => {
    try {
      const { lot, stage, limit = 50 } = req.query;
      let query = 'SELECT * FROM lifecycle_loads';
      const params = [];
      const conditions = [];
      if (lot) { conditions.push(`lot_number = $${params.length+1}`); params.push(lot); }
      if (stage) { conditions.push(`stage = $${params.length+1}`); params.push(stage); }
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ` ORDER BY submitted_at DESC LIMIT $${params.length+1}`;
      params.push(limit);
      const result = await db.query(query, params);
      res.json({ loads: result.rows, total: result.rowCount });
    } catch (err) {
      res.status(500).json({ error: err.message, loads: [] });
    }
  });
}

// ── DB MIGRATION ──────────────────────────────────────────────────────────────────
async function createLifecycleTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS lifecycle_loads (
      id            VARCHAR(32) PRIMARY KEY,
      lot_number    VARCHAR(100),
      stage         VARCHAR(30),
      grower        VARCHAR(200),
      commodity     VARCHAR(100),
      country       VARCHAR(5),
      region        VARCHAR(100),
      source        VARCHAR(50) DEFAULT 'platform',
      submitted_at  TIMESTAMPTZ DEFAULT NOW(),
      payload       JSONB,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lifecycle_lot ON lifecycle_loads(lot_number);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_stage ON lifecycle_loads(stage);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_submitted ON lifecycle_loads(submitted_at DESC);
  `);
  console.log('lifecycle_loads table ready');
}

module.exports = { parseLifecycleMessage, registerLifecycleRoutes, createLifecycleTable };
