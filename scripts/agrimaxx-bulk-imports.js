// ============================================================
// C:\AuditDNA\backend\scripts\agrimaxx-bulk-import.js
//
// Agri-Maxx 20K Agriculture Contact Bulk Importer
// Usage: node agrimaxx-bulk-import.js --source=wga --file=contacts.csv
//
// Supported sources:
//   --source=wga        Western Growers Association CSV export
//   --source=pma        Produce Marketing Association CSV export
//   --source=unitedfresh United Fresh CSV export
//   --source=senasica   Mexico SENASICA/SADER grower registry CSV
//   --source=custom     Generic CSV (see COLUMN MAP below)
//   --source=json       Raw JSON array file
//
// Required columns (mapped per source below):
//   first_name, last_name, email, company, title, city,
//   state_province, country, industry_segment, crop_focus
// ============================================================

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../db');

// ============================================================
// CLI ARGS
// ============================================================
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace('--', '').split('=');
  acc[key] = val;
  return acc;
}, {});

const SOURCE = args.source || 'custom';
const FILE = args.file || null;
const DRY_RUN = args['dry-run'] === 'true';
const LIMIT = parseInt(args.limit) || 0; // 0 = no limit
const TRACK = args.track || null; // force track A or B
const LANG = args.lang || null; // force language

if (!FILE) {
  console.error('[ERROR] --file=<path> is required');
  process.exit(1);
}

// ============================================================
// COLUMN MAPS BY SOURCE
// Map source CSV headers -> our schema fields
// ============================================================
const COLUMN_MAPS = {
  wga: {
    first_name:        ['First Name', 'FirstName', 'first_name'],
    last_name:         ['Last Name', 'LastName', 'last_name'],
    email:             ['Email', 'Email Address', 'email'],
    company:           ['Company', 'Organization', 'Grower Name'],
    title:             ['Title', 'Job Title', 'Position'],
    phone:             ['Phone', 'Direct Phone', 'Mobile'],
    city:              ['City'],
    state_province:    ['State', 'Province', 'state'],
    country:           ['Country'],
    crop_focus:        ['Commodity', 'Crop', 'Product'],
    industry_segment:  ['Member Type', 'Category', 'Segment'],
    water_use:         ['Acres Irrigated', 'Irrigated Acres'],
    preferred_language:['Language', 'Preferred Language']
  },
  pma: {
    first_name:        ['First', 'FirstName'],
    last_name:         ['Last', 'LastName'],
    email:             ['Email', 'Work Email'],
    company:           ['Company Name', 'Company'],
    title:             ['Job Title', 'Title'],
    phone:             ['Phone Number', 'Phone'],
    city:              ['City'],
    state_province:    ['State/Province', 'State'],
    country:           ['Country'],
    crop_focus:        ['Product Category', 'Commodities'],
    industry_segment:  ['Member Category'],
    preferred_language:['Language']
  },
  unitedfresh: {
    first_name:        ['FirstName', 'First Name'],
    last_name:         ['LastName', 'Last Name'],
    email:             ['Email'],
    company:           ['Company'],
    title:             ['Title'],
    phone:             ['Phone'],
    city:              ['City'],
    state_province:    ['State'],
    country:           ['Country'],
    crop_focus:        ['Commodities', 'Products'],
    industry_segment:  ['Membership Type']
  },
  senasica: {
    first_name:        ['Nombre', 'nombre_propietario'],
    last_name:         ['Apellido', 'apellido_propietario'],
    email:             ['Correo', 'correo_electronico', 'Email'],
    company:           ['Empresa', 'Razon Social', 'nombre_empresa'],
    title:             ['Cargo', 'Puesto'],
    phone:             ['Telefono', 'Tel'],
    city:              ['Municipio', 'Ciudad'],
    state_province:    ['Estado'],
    country:           ['Pais'],
    crop_focus:        ['Cultivo', 'Producto'],
    industry_segment:  ['Tipo', 'Categoria']
  },
  custom: {
    first_name:        ['first_name', 'First Name', 'FirstName', 'fname'],
    last_name:         ['last_name', 'Last Name', 'LastName', 'lname'],
    email:             ['email', 'Email', 'Email Address'],
    company:           ['company', 'Company', 'Organization'],
    title:             ['title', 'Title', 'Job Title'],
    phone:             ['phone', 'Phone'],
    city:              ['city', 'City'],
    state_province:    ['state', 'State', 'state_province', 'Province'],
    country:           ['country', 'Country'],
    crop_focus:        ['crop', 'crop_focus', 'Crop', 'Commodity'],
    industry_segment:  ['segment', 'industry_segment', 'Segment'],
    water_use:         ['water_use_daily_gallons', 'water_use', 'gallons_per_day'],
    preferred_language:['preferred_language', 'language', 'Language']
  }
};

// ============================================================
// SEGMENT NORMALIZATION
// Maps various source values to our schema's industry_segment
// ============================================================
function normalizeSegment(raw, country) {
  if (!raw) return 'grower';
  const r = raw.toLowerCase();
  if (r.includes('packing') || r.includes('pack house')) return 'packing_house';
  if (r.includes('processor') || r.includes('processing') || r.includes('fresh cut')) return 'processor';
  if (r.includes('cold') || r.includes('storage') || r.includes('warehouse')) return 'cold_storage';
  if (r.includes('greenhouse') || r.includes('glass house')) return 'greenhouse';
  if (r.includes('nursery') || r.includes('transplant')) return 'nursery';
  if (r.includes('organic')) return 'organic_grower';
  if (r.includes('broker') || r.includes('trading')) return 'broker';
  if (r.includes('distributor') || r.includes('distribution')) return 'distributor';
  if (r.includes('retail') || r.includes('supermarket') || r.includes('store')) return 'retailer';
  if (r.includes('food service') || r.includes('foodservice')) return 'food_service';
  if (r.includes('irrigation')) return 'irrigation_district';
  if (r.includes('golf') || r.includes('turf')) return 'golf_turf';
  if (r.includes('cannabis') || r.includes('hemp')) return 'cannabis';
  return 'grower';
}

// ============================================================
// TRACK DETERMINATION
// A = Growers/Field, B = Processors/Facilities
// ============================================================
function determineTrack(segment) {
  const trackB = ['processor', 'packing_house', 'cold_storage', 'food_service', 'retailer'];
  return trackB.includes(segment) ? 'B' : 'A';
}

// ============================================================
// LANGUAGE DETECTION
// ============================================================
function detectLanguage(country, rawLang) {
  if (rawLang) {
    const l = rawLang.toLowerCase();
    if (l.includes('es') || l.includes('spanish') || l.includes('espaÃ±ol')) return 'es';
    if (l.includes('en') || l.includes('english')) return 'en';
  }
  const espCountries = ['mexico', 'mx', 'peru', 'pe', 'chile', 'cl', 'colombia', 'co',
    'guatemala', 'gt', 'honduras', 'hn', 'costa rica', 'cr', 'ecuador', 'ec',
    'argentina', 'ar', 'dominican republic', 'do'];
  if (country && espCountries.includes(country.toLowerCase())) return 'es';
  return 'en';
}

// ============================================================
// COLUMN RESOLVER
// Finds the first matching column name from a list of candidates
// ============================================================
function resolveColumn(row, candidates) {
  for (const candidate of candidates) {
    if (row[candidate] !== undefined && row[candidate] !== '') {
      return row[candidate].toString().trim();
    }
  }
  return null;
}

// ============================================================
// ROW TRANSFORMER
// ============================================================
function transformRow(raw, colMap) {
  const get = (field) => resolveColumn(raw, colMap[field] || [field]);

  const country = get('country') || 'USA';
  const rawSegment = get('industry_segment');
  const rawLang = get('preferred_language');
  const segment = normalizeSegment(rawSegment, country);

  return {
    first_name:             get('first_name') || '',
    last_name:              get('last_name') || '',
    email:                  (get('email') || '').toLowerCase(),
    company:                get('company') || '',
    title:                  get('title') || '',
    phone:                  get('phone') || '',
    city:                   get('city') || '',
    state_province:         get('state_province') || '',
    country:                country,
    contact_track:          TRACK || determineTrack(segment),
    industry_segment:       segment,
    crop_focus:             get('crop_focus') || '',
    water_use_daily_gallons:parseFloat(get('water_use')) || null,
    preferred_language:     LANG || detectLanguage(country, rawLang),
    source_tag:             SOURCE,
    tags:                   []
  };
}

// ============================================================
// VALIDATION
// ============================================================
function isValid(contact) {
  if (!contact.email || !contact.email.includes('@')) return false;
  if (!contact.first_name && !contact.company) return false;
  return true;
}

// ============================================================
// DB UPSERT (insert or skip on conflict)
// ============================================================
async function insertContact(contact) {
  const result = await db.query(`
    INSERT INTO ag_contacts (
      first_name, last_name, email, company, title, phone,
      city, state_province, country, contact_track,
      industry_segment, crop_focus, water_use_daily_gallons,
      preferred_language, source_tag, tags
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `, [
    contact.first_name, contact.last_name, contact.email,
    contact.company, contact.title, contact.phone,
    contact.city, contact.state_province, contact.country,
    contact.contact_track, contact.industry_segment,
    contact.crop_focus, contact.water_use_daily_gallons,
    contact.preferred_language, contact.source_tag,
    contact.tags
  ]);
  return result.rows.length > 0;
}

// ============================================================
// CSV IMPORT
// ============================================================
async function importCSV(filePath, colMap) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const contact = transformRow(row, colMap);
        if (isValid(contact)) {
          results.push(contact);
          if (LIMIT > 0 && results.length >= LIMIT) {
            // Signal done early
          }
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// ============================================================
// JSON IMPORT
// ============================================================
function importJSON(filePath, colMap) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const arr = Array.isArray(raw) ? raw : raw.contacts || raw.data || [];
  return arr
    .map(row => transformRow(row, colMap))
    .filter(isValid)
    .slice(0, LIMIT > 0 ? LIMIT : arr.length);
}

// ============================================================
// STATS SUMMARY
// ============================================================
function printStats(contacts, inserted, skipped) {
  const byTrack = contacts.reduce((a, c) => {
    a[c.contact_track] = (a[c.contact_track] || 0) + 1; return a;
  }, {});
  const byLang = contacts.reduce((a, c) => {
    a[c.preferred_language] = (a[c.preferred_language] || 0) + 1; return a;
  }, {});
  const bySegment = contacts.reduce((a, c) => {
    a[c.industry_segment] = (a[c.industry_segment] || 0) + 1; return a;
  }, {});

  console.log('\n=== IMPORT SUMMARY ===');
  console.log(`Source:    ${SOURCE}`);
  console.log(`File:      ${FILE}`);
  console.log(`Processed: ${contacts.length}`);
  console.log(`Inserted:  ${inserted}`);
  console.log(`Skipped:   ${skipped} (duplicates or invalid)`);
  console.log('\nBy Track:');
  Object.entries(byTrack).forEach(([k, v]) => console.log(`  Track ${k}: ${v}`));
  console.log('\nBy Language:');
  Object.entries(byLang).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nBy Segment (top 10):');
  Object.entries(bySegment)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('======================\n');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log(`\n[Agri-Maxx Bulk Importer] Source: ${SOURCE} | File: ${FILE}${DRY_RUN ? ' | DRY RUN' : ''}`);

  const filePath = path.resolve(FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const colMap = COLUMN_MAPS[SOURCE] || COLUMN_MAPS.custom;
  const ext = path.extname(FILE).toLowerCase();

  let contacts = [];
  try {
    if (ext === '.json') {
      contacts = importJSON(filePath, colMap);
    } else {
      contacts = await importCSV(filePath, colMap);
    }
  } catch (err) {
    console.error('[ERROR] Failed to parse file:', err.message);
    process.exit(1);
  }

  if (LIMIT > 0) contacts = contacts.slice(0, LIMIT);

  console.log(`Parsed ${contacts.length} valid contacts from file.`);

  if (DRY_RUN) {
    console.log('[DRY RUN] First 5 parsed contacts:');
    contacts.slice(0, 5).forEach(c => console.log(JSON.stringify(c, null, 2)));
    printStats(contacts, 0, 0);
    process.exit(0);
  }

  let inserted = 0;
  let skipped = 0;

  // Batch in groups of 100 for progress reporting
  const BATCH = 100;
  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    for (const c of batch) {
      try {
        const ok = await insertContact(c);
        ok ? inserted++ : skipped++;
      } catch (err) {
        console.error(`[WARN] Failed to insert ${c.email}: ${err.message}`);
        skipped++;
      }
    }
    const pct = Math.round(((i + batch.length) / contacts.length) * 100);
    process.stdout.write(`\rProgress: ${pct}% (${i + batch.length}/${contacts.length})`);
  }

  console.log('');
  printStats(contacts, inserted, skipped);
  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});

// ============================================================
// USAGE EXAMPLES:
//
// Test parse without writing to DB:
//   node agrimaxx-bulk-import.js --source=wga --file=wga_members.csv --dry-run=true
//
// Import WGA members CSV:
//   node agrimaxx-bulk-import.js --source=wga --file=wga_members.csv
//
// Import PMA CSV, force Track B (processors):
//   node agrimaxx-bulk-import.js --source=pma --file=pma_export.csv --track=B
//
// Import SENASICA Mexico growers, force Spanish:
//   node agrimaxx-bulk-import.js --source=senasica --file=senasica_growers.csv --lang=es
//
// Import generic JSON, first 5000 only:
//   node agrimaxx-bulk-import.js --source=json --file=contacts.json --limit=5000
//
// Import custom CSV with auto-detect:
//   node agrimaxx-bulk-import.js --source=custom --file=my_contacts.csv
// ============================================================

