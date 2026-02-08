const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const cacheDir = path.join(__dirname, '..', 'cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const USDA_DATA_URL = "https://organic.ams.usda.gov/integrity/downloads/operation_data.csv";
const cacheFile = path.join(cacheDir, "usda_registry_cache.json");

function generateGrowersDatabase() {
  return [
    { id: 'GRW001', name: 'Aguacates del Valle', certifications: ['USDA Organic'], contact: 'contact@aguacates.mx', compliance: { score: 95, status: 'EXCELLENT' } },
    { id: 'GRW002', name: 'Berries Baja SA', certifications: ['USDA Organic', 'GlobalGAP'], contact: 'info@berriesbaja.mx', compliance: { score: 92, status: 'EXCELLENT' } },
    { id: 'GRW003', name: 'Tomates Sinaloa', certifications: ['USDA Organic'], contact: 'sales@tomates-sin.mx', compliance: { score: 88, status: 'GOOD' } }
  ];
}

async function fetchUSDARegistry(force = false) {
  if (fs.existsSync(cacheFile) && !force) {
    const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    return data;
  }
  console.log("Fetching USDA Organic Integrity Database...");
  const res = await fetch(USDA_DATA_URL);
  const text = await res.text();
  const rows = text.split("\n").slice(1);
  const records = rows.map((row) => {
    const cols = row.split(",");
    return {
      operationName: cols[0],
      certifyingAgent: cols[1],
      certStatus: cols[2],
      city: cols[3],
      state: cols[4],
      country: cols[5],
      scope: cols[6],
      commodities: cols[7] ? cols[7].split(";").map((x) => x.trim()) : []
    };
  });
  fs.writeFileSync(cacheFile, JSON.stringify(records, null, 2));
  console.log('USDA Registry cached (' + records.length + ' records)');
  return records;
}

function mergeWithInternal(registryData) {
  const internal = generateGrowersDatabase();
  return registryData.map((r) => {
    const match = internal.find((g) => 
      g.name.toLowerCase().includes(r.operationName ? r.operationName.toLowerCase() : "") ||
      (r.operationName ? r.operationName.toLowerCase() : "").includes(g.name.toLowerCase())
    );
    return {
      ...r,
      internalMatch: match ? {
        id: match.id,
        name: match.name,
        certifications: match.certifications,
        contact: match.contact,
        compliance: match.compliance
      } : null
    };
  });
}

router.get("/", async (req, res) => {
  try {
    const { commodity, state, country } = req.query;
    const raw = await fetchUSDARegistry();
    let filtered = raw;
    if (commodity) {
      filtered = filtered.filter((r) =>
        r.commodities && r.commodities.join(",").toLowerCase().includes(commodity.toLowerCase())
      );
    }
    if (state) filtered = filtered.filter((r) => r.state === state);
    if (country) filtered = filtered.filter((r) => r.country === country);
    const merged = mergeWithInternal(filtered);
    res.json({ total: merged.length, results: merged });
  } catch (err) {
    console.error("USDA Registry fetch error:", err);
    res.status(500).json({ error: "Failed to fetch USDA registry" });
  }
});

router.get("/refresh", async (req, res) => {
  try {
    const data = await fetchUSDARegistry(true);
    res.json({ message: 'Registry refreshed (' + data.length + ' records)' });
  } catch (err) {
    console.error("USDA Registry refresh error:", err);
    res.status(500).json({ error: "Failed to refresh USDA registry" });
  }
});

module.exports = router;