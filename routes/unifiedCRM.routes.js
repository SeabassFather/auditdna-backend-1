// ============================================
// UNIFIED CRM API ROUTES
// All contacts, campaigns, calendar in one place
// ============================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../MiniAPI/data');
const CONTACTS_FILE = path.join(DATA_DIR, 'unified_contacts.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'unified_campaigns.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const loadJSON = (file) => {
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { console.error('Load error:', err); }
  return null;
};
const saveJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// GET /api/crm/contacts
router.get('/contacts', (req, res) => {
  const { search, industry, country, status, campaign, limit = 5000, offset = 0 } = req.query;
  let data = loadJSON(CONTACTS_FILE) || { contacts: [] };
  let contacts = data.contacts || [];

  if (search) {
    const term = search.toLowerCase();
    contacts = contacts.filter(c => c.company_name?.toLowerCase().includes(term) || c.contact_name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term));
  }
  if (industry && industry !== 'all') contacts = contacts.filter(c => c.industry === industry);
  if (country && country !== 'all') contacts = contacts.filter(c => c.country_code === country);
  if (status && status !== 'all') contacts = contacts.filter(c => c.lead_status === status);
  if (campaign && campaign !== 'all') contacts = contacts.filter(c => c.campaigns?.includes(campaign));

  res.json({ contacts: contacts.slice(Number(offset), Number(offset) + Number(limit)), total: contacts.length });
});

// GET /api/crm/campaigns
router.get('/campaigns', (req, res) => {
  const data = loadJSON(CAMPAIGNS_FILE) || { campaigns: [] };
  res.json(data);
});

// PATCH /api/crm/contacts/:id
router.patch('/contacts/:id', (req, res) => {
  const data = loadJSON(CONTACTS_FILE) || { contacts: [] };
  const index = data.contacts.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Contact not found' });
  data.contacts[index] = { ...data.contacts[index], ...req.body, updated_at: new Date().toISOString() };
  saveJSON(CONTACTS_FILE, data);
  res.json(data.contacts[index]);
});

// POST /api/crm/contacts/bulk
router.post('/contacts/bulk', (req, res) => {
  const { action, contact_ids, data: updateData } = req.body;
  const fileData = loadJSON(CONTACTS_FILE) || { contacts: [] };
  let updated = 0;
  fileData.contacts = fileData.contacts.map(c => {
    if (contact_ids.includes(c.id)) {
      updated++;
      if (action === 'update_status') return { ...c, lead_status: updateData.status, updated_at: new Date().toISOString() };
      if (action === 'add_to_campaign') return { ...c, campaigns: [...new Set([...(c.campaigns || []), updateData.campaign_id])], updated_at: new Date().toISOString() };
    }
    return c;
  });
  saveJSON(CONTACTS_FILE, fileData);
  res.json({ updated, total: fileData.contacts.length });
});

// GET /api/crm/stats
router.get('/stats', (req, res) => {
  const contacts = loadJSON(CONTACTS_FILE) || { contacts: [] };
  const stats = { total: contacts.contacts.length, by_status: {}, by_industry: {}, by_country: {} };
  contacts.contacts.forEach(c => {
    stats.by_status[c.lead_status] = (stats.by_status[c.lead_status] || 0) + 1;
    stats.by_industry[c.industry] = (stats.by_industry[c.industry] || 0) + 1;
    stats.by_country[c.country_code] = (stats.by_country[c.country_code] || 0) + 1;
  });
  res.json(stats);
});

module.exports = router;

