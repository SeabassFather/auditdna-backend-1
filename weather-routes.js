// ════════════════════════════════════════════════════════════════════════════
// WEATHER INTELLIGENCE — FULL ROUTE MODULE
// Add to: C:\AuditDNA\backend\MiniAPI\server.js
// Sources: Open-Meteo (global, free, no key) + NOAA (US border zones, no key)
// Covers: Mexico, Central America, South America → US Northern Territories
// ════════════════════════════════════════════════════════════════════════════

// ── GROWING REGIONS — full corridor Baja to Patagonia ────────────────────
const GROWING_REGIONS = [
  // Mexico
  { id: 'sinaloa',      name: 'Sinaloa, MX',           country: 'MX', commodity: 'Tomato / Pepper / Cucumber',   lat: 24.80, lon: -107.39, zone: null },
  { id: 'michoacan',    name: 'Michoacan, MX',          country: 'MX', commodity: 'Avocado #1 World',             lat: 19.70, lon: -101.19, zone: null },
  { id: 'sonora',       name: 'Sonora, MX',             country: 'MX', commodity: 'Grapes / Citrus / Melon',      lat: 29.07, lon: -110.95, zone: null },
  { id: 'sanquintin',   name: 'San Quintin, BC',        country: 'MX', commodity: 'Strawberry / Tomato',          lat: 30.53, lon: -115.94, zone: null },
  { id: 'jalisco',      name: 'Jalisco, MX',            country: 'MX', commodity: 'Avocado / Berry',              lat: 20.66, lon: -103.35, zone: null },
  { id: 'ensenada',     name: 'Ensenada, BC',           country: 'MX', commodity: 'Wine / Olive / Strawberry',    lat: 31.87, lon: -116.60, zone: null },
  { id: 'guanajuato',   name: 'Guanajuato, MX',         country: 'MX', commodity: 'Broccoli / Cauliflower',       lat: 21.02, lon: -101.26, zone: null },
  { id: 'veracruz',     name: 'Veracruz, MX',           country: 'MX', commodity: 'Citrus / Vanilla / Coffee',    lat: 19.17, lon: -96.13,  zone: null },
  // Central America
  { id: 'guatemala',    name: 'Guatemala City, GT',     country: 'GT', commodity: 'Banana / Sugar / Cardamom',    lat: 14.64, lon: -90.51,  zone: null },
  { id: 'honduras',     name: 'San Pedro Sula, HN',     country: 'HN', commodity: 'Banana / Melon / Pineapple',   lat: 15.50, lon: -87.20,  zone: null },
  { id: 'costarica',    name: 'San Jose, CR',           country: 'CR', commodity: 'Pineapple / Banana',           lat:  9.93, lon: -84.08,  zone: null },
  { id: 'panama',       name: 'Panama City, PA',        country: 'PA', commodity: 'Banana / Plantain',            lat:  8.99, lon: -79.52,  zone: null },
  // South America
  { id: 'ecuador',      name: 'Guayaquil, EC',          country: 'EC', commodity: 'Banana #1 World Exporter',     lat: -1.83, lon: -78.18,  zone: null },
  { id: 'peru',         name: 'Lima, PE',               country: 'PE', commodity: 'Asparagus / Blueberry / Avo',  lat: -12.05, lon: -77.04, zone: null },
  { id: 'chile',        name: 'Santiago, CL',           country: 'CL', commodity: 'Grapes / Cherry / Blueberry',  lat: -33.46, lon: -70.65, zone: null },
  { id: 'colombia',     name: 'Bogota, CO',             country: 'CO', commodity: 'Banana / Flower / Citrus',     lat:  4.71, lon: -74.07,  zone: null },
  { id: 'brazil',       name: 'Sao Paulo, BR',          country: 'BR', commodity: 'Coffee / Orange / Soy',        lat: -23.55, lon: -46.63, zone: null },
  { id: 'argentina',    name: 'Mendoza, AR',            country: 'AR', commodity: 'Grape / Apple / Pear',         lat: -32.89, lon: -68.84, zone: null },
  // US Border Crossings
  { id: 'nogales',      name: 'Nogales, AZ',            country: 'US', commodity: 'Border Crossing — #1 Produce', lat: 31.34, lon: -110.93, zone: 'AZZ501' },
  { id: 'calexico',     name: 'Calexico / Mexicali',    country: 'US', commodity: 'Border Crossing — Imperial Valley', lat: 32.67, lon: -115.50, zone: 'CAZ049' },
  { id: 'laredo',       name: 'Laredo, TX',             country: 'US', commodity: 'Border Crossing — #1 by Volume', lat: 27.52, lon: -99.49, zone: 'TXZ301' },
  { id: 'pharr',        name: 'Pharr / McAllen, TX',    country: 'US', commodity: 'Border Crossing — South TX',   lat: 26.19, lon: -98.18,  zone: 'TXZ338' },
];

// ── OPEN-METEO FETCH — global, no key, fast ───────────────────────────────
async function fetchOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,` +
    `et0_fao_evapotranspiration,precipitation_probability_max` +
    `&current_weather=true&forecast_days=7&timezone=auto`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'AuditDNA/1.0 (saul@mexausafg.com)' } });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── NOAA ALERTS — US border zones only ───────────────────────────────────
async function fetchNOAAAlerts(zone) {
  if (!zone) return [];
  try {
    const r = await fetch(`https://api.weather.gov/alerts/active/zone/${zone}`, {
      headers: { 'User-Agent': 'AuditDNA/1.0 (saul@mexausafg.com)', Accept: 'application/geo+json' }
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.features || []).map(f => ({
      event: f.properties.event,
      severity: f.properties.severity,
      headline: f.properties.headline,
      expires: f.properties.expires,
    }));
  } catch { return []; }
}

// ── FORMAT WEATHER DATA ───────────────────────────────────────────────────
function parseWeather(region, meteo, alerts) {
  const current = meteo.current_weather || {};
  const daily = meteo.daily || {};
  const today = 0;

  const tempC = current.temperature;
  const tempF = tempC != null ? Math.round(tempC * 9 / 5 + 32) : null;

  // Frost risk: temp below 2C / 35F
  const minTemp = daily.temperature_2m_min?.[today];
  const frostRisk = minTemp != null && minTemp <= 2;

  // Rain risk: > 5mm
  const rain = daily.precipitation_sum?.[today];
  const rainRisk = rain != null && rain > 5;

  // Crop stress via ET0 (evapotranspiration)
  const et0 = daily.et0_fao_evapotranspiration?.[today];
  const heatStress = et0 != null && et0 > 6;

  const alerts_flag = alerts.length > 0 || frostRisk || heatStress;

  return {
    ...region,
    current: {
      tempC: Math.round(tempC * 10) / 10,
      tempF,
      windKph: Math.round(current.windspeed || 0),
      condition: current.weathercode,
    },
    today: {
      maxC: Math.round(daily.temperature_2m_max?.[today] * 10) / 10,
      minC: Math.round(daily.temperature_2m_min?.[today] * 10) / 10,
      rainMm: Math.round((rain || 0) * 10) / 10,
      rainPct: daily.precipitation_probability_max?.[today] || 0,
      windMax: Math.round(daily.windspeed_10m_max?.[today] || 0),
      et0: Math.round((et0 || 0) * 100) / 100,
    },
    forecast: (daily.temperature_2m_max || []).slice(0, 7).map((max, i) => ({
      day: i,
      maxC: Math.round(max * 10) / 10,
      minC: Math.round((daily.temperature_2m_min?.[i] || 0) * 10) / 10,
      rainMm: Math.round((daily.precipitation_sum?.[i] || 0) * 10) / 10,
      rainPct: daily.precipitation_probability_max?.[i] || 0,
    })),
    alerts,
    flags: { frostRisk, rainRisk, heatStress, hasAlerts: alerts.length > 0, anyRisk: alerts_flag },
    updated: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PASTE THESE ROUTES INTO MiniAPI/server.js
// ════════════════════════════════════════════════════════════════════════════

// Route 1: All regions snapshot — full corridor at once
// GET /api/weather/all
app.get('/api/weather/all', async (req, res) => {
  try {
    const results = await Promise.allSettled(
      GROWING_REGIONS.map(async region => {
        const [meteo, alerts] = await Promise.allSettled([
          fetchOpenMeteo(region.lat, region.lon),
          fetchNOAAAlerts(region.zone),
        ]);
        return parseWeather(
          region,
          meteo.status === 'fulfilled' ? meteo.value : {},
          alerts.status === 'fulfilled' ? alerts.value : []
        );
      })
    );

    const regions = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const alerts = regions.filter(r => r.flags.anyRisk);

    res.json({
      success: true,
      count: regions.length,
      activeAlerts: alerts.length,
      regions,
      generated: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 2: Single region
// GET /api/weather/region?id=sinaloa
app.get('/api/weather/region', async (req, res) => {
  try {
    const { id, lat, lon } = req.query;
    let region = GROWING_REGIONS.find(r => r.id === id);
    if (!region && lat && lon) {
      region = { id: 'custom', name: 'Custom Location', country: '??', commodity: '-', lat: parseFloat(lat), lon: parseFloat(lon), zone: null };
    }
    if (!region) return res.status(404).json({ success: false, error: 'Region not found' });

    const [meteo, alerts] = await Promise.allSettled([
      fetchOpenMeteo(region.lat, region.lon),
      fetchNOAAAlerts(region.zone),
    ]);

    res.json({
      success: true,
      region: parseWeather(
        region,
        meteo.status === 'fulfilled' ? meteo.value : {},
        alerts.status === 'fulfilled' ? alerts.value : []
      ),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 3: Alerts only — frost / heat / rain risks across all regions
// GET /api/weather/alerts
app.get('/api/weather/ag-alerts', async (req, res) => {
  try {
    const results = await Promise.allSettled(
      GROWING_REGIONS.map(async region => {
        const [meteo, alerts] = await Promise.allSettled([
          fetchOpenMeteo(region.lat, region.lon),
          fetchNOAAAlerts(region.zone),
        ]);
        return parseWeather(
          region,
          meteo.status === 'fulfilled' ? meteo.value : {},
          alerts.status === 'fulfilled' ? alerts.value : []
        );
      })
    );

    const all = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const flagged = all.filter(r => r.flags.anyRisk);

    res.json({
      success: true,
      totalRegions: all.length,
      alertCount: flagged.length,
      alerts: flagged.map(r => ({
        id: r.id,
        name: r.name,
        country: r.country,
        commodity: r.commodity,
        flags: r.flags,
        tempC: r.current.tempC,
        minC: r.today.minC,
        rainMm: r.today.rainMm,
        noaaAlerts: r.alerts,
      })),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 4: Border crossings only — logistics intelligence
// GET /api/weather/borders
app.get('/api/weather/borders', async (req, res) => {
  try {
    const borders = GROWING_REGIONS.filter(r => r.country === 'US');
    const results = await Promise.allSettled(
      borders.map(async region => {
        const [meteo, alerts] = await Promise.allSettled([
          fetchOpenMeteo(region.lat, region.lon),
          fetchNOAAAlerts(region.zone),
        ]);
        return parseWeather(
          region,
          meteo.status === 'fulfilled' ? meteo.value : {},
          alerts.status === 'fulfilled' ? alerts.value : []
        );
      })
    );
    res.json({
      success: true,
      borders: results.filter(r => r.status === 'fulfilled').map(r => r.value),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 5: Mexico only
// GET /api/weather/mexico
app.get('/api/weather/mexico', async (req, res) => {
  try {
    const mx = GROWING_REGIONS.filter(r => r.country === 'MX');
    const results = await Promise.allSettled(
      mx.map(async region => {
        const meteo = await fetchOpenMeteo(region.lat, region.lon);
        return parseWeather(region, meteo, []);
      })
    );
    res.json({
      success: true,
      regions: results.filter(r => r.status === 'fulfilled').map(r => r.value),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Route 6: LATAM (Central + South America)
// GET /api/weather/latam
app.get('/api/weather/latam', async (req, res) => {
  try {
    const latam = GROWING_REGIONS.filter(r => !['MX','US'].includes(r.country));
    const results = await Promise.allSettled(
      latam.map(async region => {
        const meteo = await fetchOpenMeteo(region.lat, region.lon);
        return parseWeather(region, meteo, []);
      })
    );
    res.json({
      success: true,
      regions: results.filter(r => r.status === 'fulfilled').map(r => r.value),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Export regions list for frontend
app.get('/api/weather/regions', (req, res) => {
  res.json({ success: true, regions: GROWING_REGIONS });
});
