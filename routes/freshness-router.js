// freshness-router.js — Distance-based buyer ping radius from harvest freshness
// MFG Patent Pending — Distance-Radius Freshness Routing Algorithm
// Save to: C:\AuditDNA\backend\routes\freshness-router.js
const express = require('express');
const router  = express.Router();

// Freshness → max ping radius in miles
// Field/Ground = unlimited, cooler days increase = radius shrinks
const FRESHNESS_ZONES = [
  { maxDays: 0,  label: 'FIELD',   radiusMiles: 9999, color: '#0F7B41', desc: 'Still in ground — national reach' },
  { maxDays: 1,  label: 'DAY 1',   radiusMiles: 2500, color: '#22c55e', desc: 'Just harvested — coast to coast' },
  { maxDays: 2,  label: 'DAY 2',   radiusMiles: 1800, color: '#84cc16', desc: 'Fresh — regional distribution' },
  { maxDays: 3,  label: 'DAY 3',   radiusMiles: 1200, color: '#C9A55C', desc: 'Good — Western US + Mexico' },
  { maxDays: 4,  label: 'DAY 4',   radiusMiles:  800, color: '#f59e0b', desc: 'Watch — Southwest only' },
  { maxDays: 5,  label: 'DAY 5',   radiusMiles:  400, color: '#f97316', desc: 'Limit — Local market only' },
  { maxDays: 6,  label: 'DAY 6',   radiusMiles:  200, color: '#ef4444', desc: 'Critical — Same-day trucks only' },
  { maxDays: 99, label: 'ALTRUISTIC', radiusMiles: 150, color: '#dc2626', desc: 'Push to Altruistic broadcast — discount' },
];

// Haversine distance between two lat/lng points in miles
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Get freshness zone from harvest date + cooler days
function getFreshnessZone(harvestDate, coolerDays = 0) {
  const daysSinceHarvest = harvestDate
    ? Math.floor((Date.now() - new Date(harvestDate).getTime()) / 86400000)
    : coolerDays;
  const totalDays = Math.max(0, daysSinceHarvest + coolerDays);
  return FRESHNESS_ZONES.find(z => totalDays <= z.maxDays) || FRESHNESS_ZONES[FRESHNESS_ZONES.length - 1];
}

// POST /api/freshness/calculate — get radius for an offer
router.post('/calculate', (req, res) => {
  const { harvest_date, cooler_days = 0, origin_lat, origin_lng } = req.body;
  const zone = getFreshnessZone(harvest_date, parseInt(cooler_days));
  res.json({
    zone: zone.label,
    radius_miles: zone.radiusMiles,
    color: zone.color,
    description: zone.desc,
    push_altruistic: zone.label === 'ALTRUISTIC',
    origin: { lat: origin_lat, lng: origin_lng },
  });
});

// POST /api/freshness/filter-buyers — filter buyer list by distance from origin
router.post('/filter-buyers', async (req, res) => {
  const { harvest_date, cooler_days = 0, origin_lat, origin_lng, buyers } = req.body;
  if (!buyers || !Array.isArray(buyers)) return res.status(400).json({ error: 'buyers array required' });
  const zone = getFreshnessZone(harvest_date, parseInt(cooler_days));
  const eligible = buyers.filter(b => {
    if (!b.lat || !b.lng) return true; // no coords — include by default
    const dist = haversine(origin_lat, origin_lng, b.lat, b.lng);
    b.distance_miles = Math.round(dist);
    return dist <= zone.radiusMiles;
  });
  res.json({
    zone: zone.label,
    radius_miles: zone.radiusMiles,
    total_buyers: buyers.length,
    eligible_buyers: eligible.length,
    buyers: eligible,
    push_altruistic: zone.label === 'ALTRUISTIC',
  });
});

// GET /api/freshness/zones — return all zones (for UI)
router.get('/zones', (req, res) => res.json(FRESHNESS_ZONES));

module.exports = router;
module.exports.getFreshnessZone = getFreshnessZone;
module.exports.haversine = haversine;
module.exports.FRESHNESS_ZONES = FRESHNESS_ZONES;
