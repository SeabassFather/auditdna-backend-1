// land-listings-upload.js — CSV bulk upload for property listings
// Save to: C:\AuditDNA\backend\routes\land-listings-upload.js
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Parse CSV line respecting quoted commas
function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV must have header row + at least one data row');
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

function toBool(v) {
  if (!v) return false;
  return ['yes','true','1','si','y'].includes(String(v).toLowerCase().trim());
}
function toNum(v) {
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
}
function toInt(v) {
  const n = parseInt(String(v).replace(/[^0-9]/g, ''));
  return isNaN(n) ? null : n;
}

// POST /api/land-upload/csv — bulk upload
router.post('/csv', upload.single('file'), async (req, res) => {
  const pool = req.app.get('db') || global.db;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let rows;
  try {
    const text = req.file.buffer.toString('utf-8');
    rows = parseCSV(text);
  } catch(e) {
    return res.status(400).json({ error: 'CSV parse error: ' + e.message });
  }

  const results = { inserted: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      await pool.query(`
        INSERT INTO land_listings (
          title, property_type, description, price_usd, price_mxn,
          region, state, municipality, address, lat, lng,
          size_sqm, size_hectares, bedrooms, bathrooms, parking,
          ocean_front, ocean_view, beach_access, pool, dock,
          platform, featured, status,
          water_rights, current_crop, soil_type, certifications,
          water_risk_score, food_security_zone, loaf_production_value,
          irrigated_hectares, well_depth_meters, annual_yield_tons,
          agent_name, agent_phone, agent_email,
          ref_id, video_url, virtual_tour_url,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
          $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
          $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,NOW(),NOW()
        )
        ON CONFLICT DO NOTHING
      `, [
        r.title || `Property ${i+1}`,
        r.property_type || r.type || 'Residential',
        r.description || '',
        toNum(r.price_usd || r.price),
        toNum(r.price_mxn),
        r.region || '',
        r.state || '',
        r.municipality || r.city || '',
        r.address || '',
        toNum(r.lat || r.latitude),
        toNum(r.lng || r.longitude),
        toNum(r.size_sqm || r.sqm),
        toNum(r.size_hectares || r.hectares || r.ha),
        toInt(r.bedrooms || r.beds),
        toNum(r.bathrooms || r.baths),
        toInt(r.parking),
        toBool(r.ocean_front || r.oceanfront),
        toBool(r.ocean_view || r.oceanview),
        toBool(r.beach_access),
        toBool(r.pool),
        toBool(r.dock),
        r.platform || 'both',
        toBool(r.featured),
        r.status || 'active',
        r.water_rights || null,
        r.current_crop || r.crop || null,
        r.soil_type || r.soil || null,
        r.certifications || r.certs || null,
        toInt(r.water_risk_score || r.water_risk),
        r.food_security_zone || null,
        toNum(r.loaf_production_value || r.production_value),
        toNum(r.irrigated_hectares),
        toNum(r.well_depth_meters),
        toNum(r.annual_yield_tons),
        r.agent_name || r.agent || 'Mexausa Team',
        r.agent_phone || r.phone || '+1-831-251-3116',
        r.agent_email || r.email || 'info@enjoybaja.com',
        r.ref_id || r.ref || r.mls || null,
        r.video_url || r.video || null,
        r.virtual_tour_url || r.tour || null,
      ]);
      results.inserted++;
    } catch(e) {
      results.errors.push({ row: i + 2, error: e.message });
      results.skipped++;
    }
  }

  res.json({
    ok: true,
    total: rows.length,
    inserted: results.inserted,
    skipped: results.skipped,
    errors: results.errors.slice(0, 10),
  });
});

// GET /api/land-upload/template — download CSV template
router.get('/template', (req, res) => {
  const headers = [
    'title','property_type','description','price_usd','price_mxn',
    'region','state','municipality','address','lat','lng',
    'size_sqm','size_hectares','bedrooms','bathrooms','parking',
    'ocean_front','ocean_view','beach_access','pool','dock',
    'platform','featured','status',
    'water_rights','current_crop','soil_type','certifications',
    'water_risk_score','food_security_zone','loaf_production_value',
    'irrigated_hectares','well_depth_meters','annual_yield_tons',
    'agent_name','agent_phone','agent_email',
    'ref_id','video_url','virtual_tour_url'
  ].join(',');

  const example = [
    '"Oceanfront Lot Ensenada","Oceanfront","Prime Pacific oceanfront lot","285000","","Ensenada BC","Baja California","Ensenada","Blvd Costero 100","31.8667","-116.5833","1200","","","","","yes","yes","yes","no","no","both","yes","active","","","","","","","","","","","Ariel Bolio","+52-646-XXX-XXXX","ariel@enjoybaja.com","EB-001","",""',
    '"Mexicali Rancho","Agricultural","180ha irrigated rancho","1200000","","Mexicali BC","Baja California","Mexicali","Km 12 Carretera","32.6245","-115.4523","","180","","","","no","no","no","no","no","both","yes","active","Confirmed Canal","Broccoli / Green Onion","Sandy loam Grade A","GlobalGAP","42","NORMAL","850000","160","45","2400","Saul Garcia","+1-831-251-3116","saul@mexausafg.com","MFG-001","",""',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="MexausaPropertyTemplate.csv"');
  res.send(headers + '\n' + example);
});

module.exports = router;
