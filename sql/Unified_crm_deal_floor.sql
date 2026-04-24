import React, { useState, useEffect, useMemo, useRef } from 'react';
import CommodityIntel from './CommodityIntel';

// ============================================
// API + BRAIN + LEAD-SHARING BUS
// ============================================
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';

// pingBrain â€” non-blocking event fire to /api/brain/events
// Feeds the 81 Niner Miners workflow engine
const pingBrain = (type, payload) => {
  try {
    fetch(`${API_BASE}/api/brain/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          type,
          payload,
          source: 'UnifiedCRM',
          timestamp: Date.now()
        }]
      })
    }).catch(() => {});
  } catch {}
};

// shareLeadAcrossModules â€” dispatches a CustomEvent that SaulIntelCRM,
// EmailMarketing, and any other module can subscribe to via
// window.addEventListener('auditdna:lead-share', handler)
const shareLeadAcrossModules = (event, detail) => {
  try {
    window.dispatchEvent(new CustomEvent(event, { detail }));
    window.__AuditDNA_Intel = window.__AuditDNA_Intel || {};
    window.__AuditDNA_Intel.lastLeadShare = { event, detail, at: Date.now() };
  } catch {}
};

// ============================================
// UNIFIED CRM - PROFESSIONAL EDITION
// MFG, Inc. / Mexausa Food Group, Inc.
// Colors: Silver/Platinum (#cbd5e1, #94a3b8), Gold (#cba658), Dark Slate (#0f172a, #1e293b)
// NO GREEN, NO PURPLE, NO EMOJIS
// ============================================

const colors = {
  bg: '#0f172a',
  card: '#1e293b',
  cardHover: '#273449',
  border: '#334155',
  gold: '#cba658',
  goldDark: '#b8944d',
  silver: '#94a3b8',
  platinum: '#cbd5e1',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  statusHot: '#dc2626',
  statusWarm: '#ea580c',
  statusCold: '#2563eb',
  statusConverted: '#16a34a',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

const INDUSTRIES = {
  'agriculture': { name: 'Agriculture', nameES: 'Agricultura' },
  'veterinary': { name: 'Veterinary & Animal Health', nameES: 'Veterinaria' },
  'food_processing': { name: 'Food Processing', nameES: 'Procesamiento de Alimentos' },
  'pharmaceuticals': { name: 'Pharmaceuticals', nameES: 'FarmacÃ©uticos' },
  'distribution': { name: 'Distribution & Logistics', nameES: 'DistribuciÃ³n' },
  'retail': { name: 'Retail & Wholesale', nameES: 'Minorista/Mayorista' },
  'import_export': { name: 'Import/Export', nameES: 'ImportaciÃ³n/ExportaciÃ³n' },
  'manufacturing': { name: 'Manufacturing', nameES: 'Manufactura' },
};

const LEAD_STATUS = {
  'new': { name: 'New Lead', color: colors.platinum },
  'hot': { name: 'Hot', color: colors.statusHot },
  'warm': { name: 'Warm', color: colors.statusWarm },
  'cold': { name: 'Cold', color: colors.statusCold },
  'contacted': { name: 'Contacted', color: colors.gold },
  'meeting': { name: 'Meeting Scheduled', color: '#0891b2' },
  'proposal': { name: 'Proposal Sent', color: '#0d9488' },
  'negotiating': { name: 'In Negotiation', color: '#d97706' },
  'converted': { name: 'Converted', color: colors.statusConverted },
  'lost': { name: 'Closed - Lost', color: colors.textMuted },
};

const COUNTRIES = {
  'MX': { name: 'Mexico', code: 'MX' },
  'US': { name: 'United States', code: 'US' },
  'GT': { name: 'Guatemala', code: 'GT' },
  'PE': { name: 'Peru', code: 'PE' },
  'CL': { name: 'Chile', code: 'CL' },
};

const UnifiedCRM = () => {
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('contacts');
  const [lang, setLang] = useState('EN');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  
  const [filters, setFilters] = useState({
    search: '',
    industry: 'all',
    country: 'all',
    status: 'all',
    campaign: 'all',
    state: 'all'
  });

  // ============================================
  // NEW: Mass Blast state
  // ============================================
  const [blastSegment, setBlastSegment] = useState({ country: 'all', industry: 'all', status: 'all' });
  const [blastSubject, setBlastSubject] = useState('');
  const [blastTemplate, setBlastTemplate] = useState('custom');
  const [blastBody, setBlastBody] = useState('');
  const [blastSending, setBlastSending] = useState(false);
  const [blastResult, setBlastResult] = useState(null); // { sent, failed, ids }

  // ============================================
  // NEW: DB Scraper state â€” queries AuditDNA's internal tables
  // Sources: growers, buyers, shipper_contacts (the 23,379 contacts)
  // ============================================
  const [scrapeSource, setScrapeSource] = useState('growers'); // growers | buyers | shippers | all
  const [scrapeCountry, setScrapeCountry] = useState('all');
  const [scrapeRiskTier, setScrapeRiskTier] = useState('all');
  const [scrapeResults, setScrapeResults] = useState([]);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeSelected, setScrapeSelected] = useState([]);
  const [scrapeStats, setScrapeStats] = useState(null); // { growers, buyers, shippers, total }

  // ============================================
  // NEW: Messenger Hub state (UI scaffold â€” backend Phase 2)
  // ============================================
  const [messengerChannel, setMessengerChannel] = useState('team-agriculture');
  const [messengerDraft, setMessengerDraft] = useState('');

  // ============================================
  // NEW: Interest Inbox state (inbound email tracking â€” backend Phase 2)
  // ============================================
  const [inboxItems, setInboxItems] = useState([]); // populated when backend lands

  // ============================================
  // NEW: Email send modal state (wire existing EmailModal to real backend)
  // ============================================
  const [emailDraft, setEmailDraft] = useState({ subject: '', template: 'custom', body: '' });
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendError, setEmailSendError] = useState('');

  // ============================================
  // NEW: Deal Floor state (Phase 2.1 — blind marketplace backbone)
  // Backend: /api/deals/* (18 endpoints in C:\AuditDNA\backend\routes\deal-floor.js)
  // Verified Phase 1: health, status, channels (CRUD), dd/types
  // ============================================
  const [dfSection, setDfSection] = useState('deal-rooms'); // deal-rooms | channels | dd-review | po-finance | compliance
  const [dfChannels, setDfChannels] = useState([]);
  const [dfSelectedChannel, setDfSelectedChannel] = useState(null);
  const [dfDocTypes, setDfDocTypes] = useState([]);
  const [dfDdItems, setDfDdItems] = useState([]);
  const [dfPoItems, setDfPoItems] = useState([]);
  const [dfFinanceItems, setDfFinanceItems] = useState([]);
  const [dfComplianceItems, setDfComplianceItems] = useState([]);
  const [dfAuditChain, setDfAuditChain] = useState(null);
  const [dfLoading, setDfLoading] = useState(false);
  const [dfDragOver, setDfDragOver] = useState(false);
  const [dfUploadDocType, setDfUploadDocType] = useState('');
  const [dfUploadStatus, setDfUploadStatus] = useState(null);
  const [dfStatus, setDfStatus] = useState(null);
  const [dfShowNewChannel, setDfShowNewChannel] = useState(false);
  const [dfNewChannel, setDfNewChannel] = useState({
    commodity: '', variety: '', pack: '', grade: '', qty_cartons: '', origin: '', notes: ''
  });
  const dfFileInputRef = useRef(null);

  // Centralized endpoint map — edit here when deal-floor.js manifest is confirmed
  const DF_API = {
    status:         () => `${API_BASE}/api/deals/status`,
    channels:       () => `${API_BASE}/api/deals/channels`,
    channel:        (id) => `${API_BASE}/api/deals/channels/${id}`,
    ddTypes:        () => `${API_BASE}/api/deals/dd/types`,
    ddList:         (chId) => `${API_BASE}/api/deals/channels/${chId}/dd`,
    ddUpload:       (chId) => `${API_BASE}/api/deals/channels/${chId}/dd`,
    poList:         (chId) => `${API_BASE}/api/deals/channels/${chId}/po`,
    financeList:    (chId) => `${API_BASE}/api/deals/channels/${chId}/finance`,
    complianceList: (chId) => `${API_BASE}/api/deals/channels/${chId}/compliance`,
    auditChain:     (chId) => `${API_BASE}/api/deals/channels/${chId}/audit-chain`,
    advanceStage:   (chId) => `${API_BASE}/api/deals/channels/${chId}/stage`,
  };

  const DF_STAGES = {
    'LOI':              { name: 'LOI',              color: colors.platinum,  order: 1 },
    'NDA':              { name: 'NDA',              color: colors.silver,    order: 2 },
    'TERM_SHEET':       { name: 'Term Sheet',       color: colors.gold,      order: 3 },
    'ACCEPTANCE':       { name: 'Acceptance',       color: colors.goldDark,  order: 4 },
    'PARTY_DISCLOSURE': { name: 'Party Disclosure', color: '#e0b85a',        order: 5 },
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsRes, campaignsRes] = await Promise.all([
        fetch(`${API_BASE}/api/crm/contacts`).catch(() => null),
        fetch(`${API_BASE}/api/crm/campaigns`).catch(() => null)
      ]);
      
      if (contactsRes?.ok) {
        const data = await contactsRes.json();
        // Backend /api/crm/contacts returns { success, total, count, data: [...] }
        // Local JSON fallback uses { contacts: [...] } - handle both shapes
        setContacts(data.contacts || data.data || []);
      } else {
        const res = await fetch('/data/unified_contacts.json').catch(() => null);
        if (res?.ok) {
          const data = await res.json();
          setContacts(data.contacts || data.data || []);
        }
      }
      
      if (campaignsRes?.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      } else {
        const res = await fetch('/data/unified_campaigns.json').catch(() => null);
        if (res?.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
        }
      }
    } catch (err) {
      console.log('Loading data...');
    }
    setLoading(false);
  };

  const filteredContacts = useMemo(() => {
    let result = [...contacts];
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(c =>
        c.company_name?.toLowerCase().includes(term) ||
        c.contact_name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.state?.toLowerCase().includes(term) ||
        c.municipality?.toLowerCase().includes(term)
      );
    }
    if (filters.industry !== 'all') result = result.filter(c => c.industry === filters.industry);
    if (filters.country !== 'all') result = result.filter(c => c.country_code === filters.country);
    if (filters.status !== 'all') result = result.filter(c => c.lead_status === filters.status);
    if (filters.campaign !== 'all') result = result.filter(c => c.campaigns?.includes(filters.campaign));
    if (filters.state !== 'all') result = result.filter(c => c.state === filters.state);
    return result;
  }, [contacts, filters]);

  const stats = useMemo(() => {
    const s = { total: contacts.length, byStatus: {}, byIndustry: {}, byCountry: {}, byCampaign: {} };
    contacts.forEach(c => {
      s.byStatus[c.lead_status] = (s.byStatus[c.lead_status] || 0) + 1;
      s.byIndustry[c.industry] = (s.byIndustry[c.industry] || 0) + 1;
      s.byCountry[c.country_code] = (s.byCountry[c.country_code] || 0) + 1;
      (c.campaigns || []).forEach(camp => { s.byCampaign[camp] = (s.byCampaign[camp] || 0) + 1; });
    });
    return s;
  }, [contacts]);

  const states = useMemo(() => {
    const stateSet = new Set(contacts.map(c => c.state).filter(Boolean));
    return Array.from(stateSet).sort();
  }, [contacts]);

  const toggleSelect = (id) => setSelectedContacts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  
  const selectAllVisible = () => {
    const ids = filteredContacts.slice(0, pageSize).map(c => c.id);
    const allSelected = ids.every(id => selectedContacts.includes(id));
    setSelectedContacts(allSelected ? selectedContacts.filter(id => !ids.includes(id)) : [...new Set([...selectedContacts, ...ids])]);
  };

  const bulkUpdateStatus = (newStatus) => {
    setContacts(prev => prev.map(c => selectedContacts.includes(c.id) ? { ...c, lead_status: newStatus, updated_at: new Date().toISOString() } : c));
    pingBrain('CRM_BULK_STATUS_CHANGE', { count: selectedContacts.length, newStatus, contactIds: selectedContacts });
    shareLeadAcrossModules('auditdna:contact-stage-change', { contactIds: selectedContacts, newStatus });
    setSelectedContacts([]);
  };

  const bulkAddToCampaign = (campaignId) => {
    setContacts(prev => prev.map(c => selectedContacts.includes(c.id) ? { ...c, campaigns: [...new Set([...(c.campaigns || []), campaignId])] } : c));
    pingBrain('CRM_CAMPAIGN_ADD', { count: selectedContacts.length, campaignId, contactIds: selectedContacts });
    shareLeadAcrossModules('auditdna:campaign-assign', { contactIds: selectedContacts, campaignId });
    setSelectedContacts([]);
  };

  // ============================================
  // NEW HANDLERS â€” Mass Blast
  // ============================================
  const computeBlastRecipients = () => {
    return contacts.filter(c => {
      if (blastSegment.country !== 'all' && c.country_code !== blastSegment.country) return false;
      if (blastSegment.industry !== 'all' && c.industry !== blastSegment.industry) return false;
      if (blastSegment.status !== 'all' && c.lead_status !== blastSegment.status) return false;
      if (!c.email) return false;
      return true;
    });
  };

  const sendBlast = async () => {
    const recipients = computeBlastRecipients();
    if (!blastSubject || !blastBody) { setBlastResult({ error: 'Subject and body required' }); return; }
    if (!recipients.length) { setBlastResult({ error: 'No matching recipients' }); return; }
    setBlastSending(true);
    setBlastResult(null);
    try {
      // Fire Brain event FIRST so it's logged even if send endpoint has issues
      pingBrain('EMAIL_BLAST_INITIATED', {
        recipientCount: recipients.length,
        subject: blastSubject,
        segment: blastSegment,
        template: blastTemplate
      });
      shareLeadAcrossModules('auditdna:blast-queued', {
        recipientCount: recipients.length,
        recipientIds: recipients.map(r => r.id),
        subject: blastSubject
      });
      const res = await fetch(`${API_BASE}/api/email/send-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.map(r => ({ id: r.id, email: r.email, name: r.contact_name || r.company_name })),
          subject: blastSubject,
          body: blastBody,
          template: blastTemplate,
          source: 'UnifiedCRM'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBlastResult({ sent: data.sent || recipients.length, failed: data.failed || 0, ids: data.ids || [] });
        pingBrain('EMAIL_BLAST_SENT', { sent: data.sent, failed: data.failed });
      } else {
        setBlastResult({ error: data.error || `Backend returned ${res.status}` });
      }
    } catch (err) {
      setBlastResult({ error: err.message });
    }
    setBlastSending(false);
  };

  // ============================================
  // NEW HANDLERS â€” DB Scraper
  // Queries AuditDNA's internal tables via existing /api/crm endpoints
  // ============================================
  const runScraper = async () => {
    setScrapeLoading(true);
    setScrapeResults([]);
    try {
      let endpoints = [];
      if (scrapeSource === 'growers' || scrapeSource === 'all') endpoints.push(`${API_BASE}/api/crm/growers?limit=50000`);
      if (scrapeSource === 'buyers'  || scrapeSource === 'all') endpoints.push(`${API_BASE}/api/crm/buyers?limit=50000`);
      if (scrapeSource === 'shippers' || scrapeSource === 'all') endpoints.push(`${API_BASE}/api/crm/shippers?limit=50000`);
      const responses = await Promise.all(endpoints.map(u => fetch(u).then(r => r.json()).catch(() => ({ data: [] }))));
      let merged = [];
      responses.forEach((r, i) => {
        const sourceName = endpoints[i].includes('growers') ? 'grower' : endpoints[i].includes('buyers') ? 'buyer' : 'shipper';
        const rows = r.data || r.growers || r.buyers || r.shippers || [];
        rows.forEach(row => merged.push({ ...row, _source: sourceName }));
      });
      if (scrapeCountry !== 'all') merged = merged.filter(r => (r.country || r.country_code) === scrapeCountry);
      if (scrapeRiskTier !== 'all') merged = merged.filter(r => String(r.risk_tier) === scrapeRiskTier);
      setScrapeResults(merged);
      setScrapeStats({
        growers: merged.filter(r => r._source === 'grower').length,
        buyers: merged.filter(r => r._source === 'buyer').length,
        shippers: merged.filter(r => r._source === 'shipper').length,
        total: merged.length
      });
      pingBrain('CRM_SCRAPE_RUN', { source: scrapeSource, country: scrapeCountry, riskTier: scrapeRiskTier, found: merged.length });
    } catch (err) {
      console.error('[SCRAPER]', err);
      setScrapeResults([]);
    }
    setScrapeLoading(false);
  };

  const importScrapedToCRM = () => {
    const toImport = scrapeResults.filter(r => scrapeSelected.includes(r.id));
    if (!toImport.length) return;
    const newContacts = toImport.map(r => ({
      id: `imported_${r._source}_${r.id}`,
      company_name: r.legal_name || r.name || r.company_name || 'Unknown',
      contact_name: r.primary_contact || r.contact_name || '',
      email: r.email || '',
      phone: r.phone || '',
      country_code: r.country || r.country_code || '',
      state: r.state_region || r.state || '',
      municipality: r.city || r.municipality || '',
      industry: r._source === 'grower' ? 'agriculture' : r._source === 'shipper' ? 'distribution' : 'food_processing',
      lead_status: 'new',
      campaigns: [],
      updated_at: new Date().toISOString(),
      _imported_from: r._source
    }));
    setContacts(prev => {
      const existing = new Set(prev.map(c => c.id));
      return [...prev, ...newContacts.filter(n => !existing.has(n.id))];
    });
    pingBrain('CRM_SCRAPE_IMPORT', { imported: newContacts.length, sources: [...new Set(toImport.map(t => t._source))] });
    shareLeadAcrossModules('auditdna:scrape-import', { contacts: newContacts });
    setScrapeSelected([]);
    setScrapeResults([]);
  };

  // ============================================
  // NEW HANDLERS â€” Individual email send (wires EmailModal to real backend)
  // ============================================
  const sendIndividualEmail = async () => {
    if (!selectedContact?.email) { setEmailSendError('Contact has no email'); return; }
    if (!emailDraft.subject || !emailDraft.body) { setEmailSendError('Subject and body required'); return; }
    setEmailSending(true);
    setEmailSendError('');
    try {
      const res = await fetch(`${API_BASE}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedContact.email,
          toName: selectedContact.contact_name || selectedContact.company_name,
          subject: emailDraft.subject,
          body: emailDraft.body,
          template: emailDraft.template,
          contactId: selectedContact.id,
          source: 'UnifiedCRM'
        })
      });
      if (res.ok) {
        pingBrain('EMAIL_SENT_INDIVIDUAL', { contactId: selectedContact.id, to: selectedContact.email });
        shareLeadAcrossModules('auditdna:email-sent', { contactId: selectedContact.id, to: selectedContact.email, subject: emailDraft.subject });
        setEmailDraft({ subject: '', template: 'custom', body: '' });
        setShowModal(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setEmailSendError(data.error || `Backend returned ${res.status}`);
      }
    } catch (err) {
      setEmailSendError(err.message);
    }
    setEmailSending(false);
  };

  // ============================================
  // NEW HANDLERS â€” Share lead to team (broadcasts to SaulIntelCRM + EmailMarketing)
  // ============================================
  const shareSelectedToTeam = () => {
    const toShare = contacts.filter(c => selectedContacts.includes(c.id));
    if (!toShare.length) return;
    pingBrain('CRM_LEAD_SHARE', { count: toShare.length, ids: selectedContacts });
    shareLeadAcrossModules('auditdna:lead-share', { contacts: toShare, from: 'UnifiedCRM' });
    setSelectedContacts([]);
  };

  // ============================================
  // NEW HANDLERS — Deal Floor (Phase 2.1)
  // ============================================
  const dfUnwrap = (r, keys) => {
    if (!r) return [];
    for (const k of keys) if (Array.isArray(r[k])) return r[k];
    return Array.isArray(r) ? r : [];
  };

  const loadDealFloor = async () => {
    setDfLoading(true);
    try {
      const [statusRes, channelsRes, ddTypesRes] = await Promise.all([
        fetch(DF_API.status()).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(DF_API.channels()).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(DF_API.ddTypes()).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (statusRes) setDfStatus(statusRes);
      setDfChannels(dfUnwrap(channelsRes, ['channels', 'data', 'items']));
      setDfDocTypes(dfUnwrap(ddTypesRes, ['types', 'data', 'items']));
      pingBrain('DF_LOAD', { channels: dfUnwrap(channelsRes, ['channels', 'data', 'items']).length });
    } catch (err) {
      console.error('[DEAL_FLOOR] load failed', err);
    }
    setDfLoading(false);
  };

  const loadChannelDetail = async (ch) => {
    if (!ch?.id) return;
    setDfSelectedChannel(ch);
    setDfLoading(true);
    try {
      const [ddRes, poRes, finRes, compRes, chainRes] = await Promise.all([
        fetch(DF_API.ddList(ch.id)).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(DF_API.poList(ch.id)).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(DF_API.financeList(ch.id)).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(DF_API.complianceList(ch.id)).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(DF_API.auditChain(ch.id)).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      setDfDdItems(dfUnwrap(ddRes, ['items', 'dd', 'data']));
      setDfPoItems(dfUnwrap(poRes, ['items', 'pos', 'data']));
      setDfFinanceItems(dfUnwrap(finRes, ['items', 'finance', 'data']));
      setDfComplianceItems(dfUnwrap(compRes, ['items', 'compliance', 'data']));
      setDfAuditChain(chainRes || null);
    } catch (err) {
      console.error('[DEAL_FLOOR] channel detail', err);
    }
    setDfLoading(false);
  };

  const createChannel = async () => {
    if (!dfNewChannel.commodity) { alert('Commodity required'); return; }
    try {
      const res = await fetch(DF_API.channels(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dfNewChannel)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        pingBrain('DF_CHANNEL_CREATE', { commodity: dfNewChannel.commodity, channelId: data.channel?.id || data.id });
        shareLeadAcrossModules('auditdna:df-channel-new', { channel: data.channel || data });
        setDfShowNewChannel(false);
        setDfNewChannel({ commodity: '', variety: '', pack: '', grade: '', qty_cartons: '', origin: '', notes: '' });
        loadDealFloor();
      } else {
        alert(`Create failed: ${data.error || res.status}`);
      }
    } catch (err) { alert(`Create error: ${err.message}`); }
  };

  const uploadDdFile = async (file) => {
    if (!dfSelectedChannel) { setDfUploadStatus({ error: 'Select a channel first' }); return; }
    if (!dfUploadDocType) { setDfUploadStatus({ error: 'Select a document type' }); return; }
    setDfUploadStatus({ uploading: true, filename: file.name });
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', dfUploadDocType);
      fd.append('filename', file.name);
      const res = await fetch(DF_API.ddUpload(dfSelectedChannel.id), { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDfUploadStatus({ success: true, filename: file.name });
        pingBrain('DF_DD_UPLOAD', { channelId: dfSelectedChannel.id, docType: dfUploadDocType, filename: file.name });
        shareLeadAcrossModules('auditdna:df-dd-upload', { channelId: dfSelectedChannel.id, docType: dfUploadDocType });
        loadChannelDetail(dfSelectedChannel);
      } else {
        setDfUploadStatus({ error: data.error || `Backend returned ${res.status}` });
      }
    } catch (err) {
      setDfUploadStatus({ error: err.message });
    }
  };

  const onDropFile = (e) => {
    e.preventDefault();
    setDfDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadDdFile(file);
  };

  const onFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadDdFile(file);
  };

  const verifyAuditChain = async (chId) => {
    setDfAuditChain({ verifying: true });
    try {
      const res = await fetch(DF_API.auditChain(chId));
      const data = await res.json().catch(() => ({}));
      setDfAuditChain(data);
      pingBrain('DF_CHAIN_VERIFY', { channelId: chId, valid: data.valid });
    } catch (err) { setDfAuditChain({ error: err.message }); }
  };

  const advanceChannelStage = async (chId, newStage) => {
    try {
      const res = await fetch(DF_API.advanceStage(chId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      if (res.ok) {
        pingBrain('DF_STAGE_ADVANCE', { channelId: chId, newStage });
        shareLeadAcrossModules('auditdna:df-stage-advance', { channelId: chId, newStage });
        loadDealFloor();
        if (dfSelectedChannel?.id === chId) {
          const updated = (await fetch(DF_API.channel(chId)).then(r => r.json()).catch(() => null));
          if (updated) loadChannelDetail(updated.channel || updated);
        }
      }
    } catch (err) { console.error('[DEAL_FLOOR] stage advance', err); }
  };

  const s = {
    container: { minHeight: '100vh', background: colors.bg, color: colors.textPrimary, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
    header: { padding: '12px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.card },
    title: { fontSize: '14px', fontWeight: '600', color: colors.platinum, letterSpacing: '1px', textTransform: 'uppercase' },
    badge: { padding: '4px 12px', borderRadius: '3px', fontSize: '11px', fontWeight: '600', marginLeft: '14px' },
    tabs: { display: 'flex', gap: '1px', background: colors.slate700, padding: '2px', borderRadius: '4px' },
    tab: (active) => ({ padding: '8px 18px', borderRadius: '3px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: active ? colors.gold : 'transparent', color: active ? colors.slate900 : colors.textSecondary, transition: 'all 0.15s ease' }),
    content: { display: 'flex', height: 'calc(100vh - 52px)' },
    sidebar: { width: '230px', background: colors.card, borderRight: `1px solid ${colors.border}`, overflowY: 'auto', padding: '14px' },
    main: { flex: 1, overflowY: 'auto', padding: '16px 20px' },
    statCard: { background: colors.slate800, borderRadius: '4px', padding: '14px', marginBottom: '10px', borderLeft: `3px solid ${colors.gold}` },
    statValue: { fontSize: '22px', fontWeight: '700', color: colors.platinum, letterSpacing: '-0.5px' },
    statLabel: { fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '4px' },
    input: { padding: '9px 12px', borderRadius: '4px', border: `1px solid ${colors.border}`, background: colors.slate800, color: colors.textPrimary, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    select: { padding: '9px 12px', borderRadius: '4px', border: `1px solid ${colors.border}`, background: colors.slate800, color: colors.textPrimary, fontSize: '12px', cursor: 'pointer' },
    btn: (v = 'default') => ({ padding: '9px 16px', borderRadius: '4px', border: v === 'default' ? `1px solid ${colors.border}` : 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: v === 'primary' ? colors.gold : colors.slate800, color: v === 'primary' ? colors.slate900 : colors.textSecondary, transition: 'all 0.15s ease' }),
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    th: { padding: '12px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: `1px solid ${colors.border}`, background: colors.slate800, position: 'sticky', top: 0, zIndex: 1 },
    td: { padding: '12px 14px', borderBottom: `1px solid ${colors.border}15` },
    checkbox: { width: '15px', height: '15px', cursor: 'pointer', accentColor: colors.gold },
    filterLabel: { fontSize: '10px', fontWeight: '600', color: colors.textMuted, marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' },
    sideItem: (active) => ({ padding: '9px 12px', borderRadius: '3px', marginBottom: '2px', cursor: 'pointer', background: active ? colors.slate700 : 'transparent', borderLeft: active ? `2px solid ${colors.gold}` : '2px solid transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: active ? colors.platinum : colors.textSecondary, transition: 'all 0.12s ease' }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: colors.card, borderRadius: '6px', width: '500px', maxHeight: '80vh', overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
    modalHeader: { padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.slate800 },
    modalBody: { padding: '20px', maxHeight: '55vh', overflowY: 'auto' },
    modalFooter: { padding: '16px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px', background: colors.slate800 },
  };

  const L = lang === 'ES' ? {
    title: 'CRM UNIFICADO', contacts: 'Contactos', campaigns: 'CampaÃ±as', pipeline: 'Pipeline',
    search: 'Buscar empresa, contacto, email...', allIndustries: 'Todas las Industrias', allCountries: 'Todos los PaÃ­ses',
    allStatus: 'Todos los Estados', allCampaigns: 'Todas las CampaÃ±as', allStates: 'Todos los Estados', selected: 'seleccionados',
    actions: 'Acciones', refresh: 'Actualizar', showing: 'Mostrando', of: 'de', company: 'EMPRESA', contact: 'CONTACTO',
    location: 'UBICACIÃ“N', industry: 'INDUSTRIA', status: 'ESTADO', email: 'Correo', phone: 'TelÃ©fono',
    sendEmail: 'Enviar Correo', schedule: 'Programar', addToCampaign: 'Agregar a CampaÃ±a', bulkActions: 'Acciones en Lote',
    changeStatus: 'Cambiar Estado', cancel: 'Cancelar', done: 'Listo', send: 'Enviar', total: 'Total', pending: 'Pendiente',
    massBlast: 'EnvÃ­o Masivo', dbScraper: 'Extractor BD', messenger: 'MensajerÃ­a', inbox: 'Bandeja InterÃ©s',
    segment: 'Segmento', recipients: 'Destinatarios', subject: 'Asunto', message: 'Mensaje', preview: 'Vista Previa',
    sendBlast: 'Enviar EnvÃ­o', source: 'Fuente', filter: 'Filtro', riskTier: 'Nivel de Riesgo', runScrape: 'Ejecutar',
    importToCRM: 'Importar al CRM', channel: 'Canal', typeMessage: 'Escribir mensaje...', phaseTwo: 'Backend Fase 2',
    trackReplies: 'Seguimiento de Respuestas', noInboundYet: 'Sin respuestas aÃºn â€” Fase 2 implementarÃ¡ el sistema de seguimiento',
    shareToTeam: 'Compartir al Equipo', sent: 'Enviado', failed: 'FallÃ³'
  } : {
    title: 'UNIFIED CRM', contacts: 'Contacts', campaigns: 'Campaigns', pipeline: 'Pipeline',
    search: 'Search company, contact, email...', allIndustries: 'All Industries', allCountries: 'All Countries',
    allStatus: 'All Status', allCampaigns: 'All Campaigns', allStates: 'All States', selected: 'selected',
    actions: 'Actions', refresh: 'Refresh', showing: 'Showing', of: 'of', company: 'COMPANY', contact: 'CONTACT',
    location: 'LOCATION', industry: 'INDUSTRY', status: 'STATUS', email: 'Email', phone: 'Phone',
    sendEmail: 'Send Email', schedule: 'Schedule', addToCampaign: 'Add to Campaign', bulkActions: 'Bulk Actions',
    changeStatus: 'Change Status', cancel: 'Cancel', done: 'Done', send: 'Send', total: 'Total', pending: 'Pending',
    massBlast: 'Mass Blast', dbScraper: 'DB Scraper', messenger: 'Messenger', inbox: 'Interest Inbox',
    segment: 'Segment', recipients: 'Recipients', subject: 'Subject', message: 'Message', preview: 'Preview',
    sendBlast: 'Send Blast', source: 'Source', filter: 'Filter', riskTier: 'Risk Tier', runScrape: 'Run',
    importToCRM: 'Import to CRM', channel: 'Channel', typeMessage: 'Type a message...', phaseTwo: 'Backend Phase 2',
    trackReplies: 'Reply Tracking', noInboundYet: 'No inbound replies yet â€” Phase 2 will implement tracking system',
    shareToTeam: 'Share to Team', sent: 'Sent', failed: 'Failed'
  };

  const Sidebar = () => (
    <div style={s.sidebar}>
      <div style={{ marginBottom: '18px' }}>
        <div style={s.statCard}>
          <div style={s.statValue}>{stats.total.toLocaleString()}</div>
          <div style={s.statLabel}>{L.total} {L.contacts}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ ...s.statCard, borderLeftColor: colors.statusHot }}>
            <div style={{ ...s.statValue, fontSize: '18px', color: colors.statusHot }}>{stats.byStatus['hot'] || 0}</div>
            <div style={s.statLabel}>Hot</div>
          </div>
          <div style={{ ...s.statCard, borderLeftColor: colors.statusWarm }}>
            <div style={{ ...s.statValue, fontSize: '18px', color: colors.statusWarm }}>{stats.byStatus['warm'] || 0}</div>
            <div style={s.statLabel}>Warm</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div style={s.filterLabel}>{L.campaigns}</div>
        <div style={s.sideItem(filters.campaign === 'all')} onClick={() => setFilters(f => ({ ...f, campaign: 'all' }))}>
          <span>All Campaigns</span><span style={{ fontSize: '10px', color: colors.gold }}>{stats.total}</span>
        </div>
        {campaigns.map(c => (
          <div key={c.id} style={s.sideItem(filters.campaign === c.id)} onClick={() => setFilters(f => ({ ...f, campaign: c.id }))}>
            <span>{c.name.replace(/^[^\s]+\s/, '')}</span><span style={{ fontSize: '10px', color: colors.gold }}>{stats.byCampaign[c.id] || c.contact_count || 0}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div style={s.filterLabel}>{L.industry}</div>
        <div style={s.sideItem(filters.industry === 'all')} onClick={() => setFilters(f => ({ ...f, industry: 'all' }))}>
          <span>All Industries</span><span style={{ fontSize: '10px', color: colors.gold }}>{stats.total}</span>
        </div>
        {Object.entries(INDUSTRIES).filter(([k]) => stats.byIndustry[k]).map(([k, v]) => (
          <div key={k} style={s.sideItem(filters.industry === k)} onClick={() => setFilters(f => ({ ...f, industry: k }))}>
            <span>{lang === 'ES' ? v.nameES : v.name}</span><span style={{ fontSize: '10px', color: colors.gold }}>{stats.byIndustry[k]}</span>
          </div>
        ))}
      </div>

      <div>
        <div style={s.filterLabel}>{L.status}</div>
        <div style={s.sideItem(filters.status === 'all')} onClick={() => setFilters(f => ({ ...f, status: 'all' }))}>
          <span>All Status</span><span style={{ fontSize: '10px', color: colors.gold }}>{stats.total}</span>
        </div>
        {Object.entries(LEAD_STATUS).filter(([k]) => stats.byStatus[k]).map(([k, v]) => (
          <div key={k} style={s.sideItem(filters.status === k)} onClick={() => setFilters(f => ({ ...f, status: k }))}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: v.color }}></span>
              {v.name}
            </span>
            <span style={{ fontSize: '10px', color: colors.gold }}>{stats.byStatus[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const ContactTable = () => (
    <div style={{ background: colors.card, borderRadius: '4px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}><input type="checkbox" style={s.checkbox} checked={filteredContacts.slice(0, pageSize).length > 0 && filteredContacts.slice(0, pageSize).every(c => selectedContacts.includes(c.id))} onChange={selectAllVisible} /></th>
              <th style={s.th}>{L.company}</th>
              <th style={s.th}>{L.contact}</th>
              <th style={s.th}>{L.email}</th>
              <th style={s.th}>{L.location}</th>
              <th style={s.th}>{L.industry}</th>
              <th style={s.th}>{L.status}</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.slice(0, pageSize * currentPage).map(c => (
              <tr key={c.id} style={{ background: selectedContacts.includes(c.id) ? `${colors.gold}08` : 'transparent' }}>
                <td style={s.td}><input type="checkbox" style={s.checkbox} checked={selectedContacts.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                <td style={s.td}>
                  <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '3px' }}>{c.company_name}</div>
                  <div style={{ fontSize: '10px', color: colors.textMuted }}>ID: {c.senasica_id || c.id.split('-')[1]}</div>
                </td>
                <td style={s.td}>
                  <div style={{ color: colors.textPrimary }}>{c.contact_name || 'â€”'}</div>
                  <div style={{ fontSize: '10px', color: colors.textMuted }}>{c.contact_title || ''}</div>
                </td>
                <td style={s.td}>
                  {c.email ? <a href={`mailto:${c.email}`} style={{ color: colors.gold, textDecoration: 'none' }}>{c.email}</a> : <span style={{ color: colors.textMuted, fontSize: '11px' }}>{L.pending}</span>}
                </td>
                <td style={s.td}>
                  <div style={{ fontSize: '12px' }}>{c.municipality}</div>
                  <div style={{ fontSize: '10px', color: colors.textMuted }}>{c.state}, {COUNTRIES[c.country_code]?.code || c.country_code}</div>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize: '11px', color: colors.textSecondary }}>{INDUSTRIES[c.industry]?.name || c.industry}</span>
                </td>
                <td style={s.td}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '3px', fontSize: '10px', fontWeight: '600', background: `${LEAD_STATUS[c.lead_status]?.color || colors.platinum}12`, color: LEAD_STATUS[c.lead_status]?.color || colors.platinum, border: `1px solid ${LEAD_STATUS[c.lead_status]?.color || colors.platinum}25` }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: LEAD_STATUS[c.lead_status]?.color || colors.platinum }}></span>
                    {LEAD_STATUS[c.lead_status]?.name || c.lead_status}
                  </span>
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={{ ...s.btn(), padding: '6px 10px', fontSize: '10px' }} onClick={() => { setSelectedContact(c); setShowModal('email'); }}>Email</button>
                    <button style={{ ...s.btn(), padding: '6px 10px', fontSize: '10px' }} onClick={() => { setSelectedContact(c); setShowModal('calendar'); }}>Schedule</button>
                    <button style={{ ...s.btn(), padding: '6px 10px', fontSize: '10px' }} onClick={() => { setSelectedContact(c); setShowModal('campaign'); }}>Campaign</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredContacts.length > pageSize * currentPage && (
        <div style={{ padding: '14px', textAlign: 'center', borderTop: `1px solid ${colors.border}` }}>
          <button style={s.btn('primary')} onClick={() => setCurrentPage(p => p + 1)}>Load More ({(filteredContacts.length - pageSize * currentPage).toLocaleString()} remaining)</button>
        </div>
      )}
    </div>
  );

  const PipelineView = () => {
    const stages = ['new', 'hot', 'warm', 'cold', 'contacted', 'meeting', 'proposal', 'negotiating', 'converted', 'lost'];
    return (
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
        {stages.map(stage => {
          const stageContacts = contacts.filter(c => c.lead_status === stage);
          const info = LEAD_STATUS[stage];
          return (
            <div key={stage} style={{ minWidth: '210px', background: colors.card, borderRadius: '4px', border: `1px solid ${colors.border}` }}>
              <div style={{ padding: '12px 14px', borderBottom: `2px solid ${info.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: colors.platinum, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{info.name}</span>
                <span style={{ padding: '3px 10px', borderRadius: '3px', fontSize: '10px', fontWeight: '600', background: `${info.color}18`, color: info.color }}>{stageContacts.length}</span>
              </div>
              <div style={{ padding: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {stageContacts.slice(0, 15).map(c => (
                  <div key={c.id} style={{ background: colors.slate800, borderRadius: '3px', padding: '12px', marginBottom: '8px', cursor: 'pointer', borderLeft: `2px solid ${info.color}` }} onClick={() => { setSelectedContact(c); setShowModal('edit'); }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: colors.textPrimary, marginBottom: '4px' }}>{c.company_name}</div>
                    <div style={{ fontSize: '10px', color: colors.textMuted }}>{c.municipality}, {c.state}</div>
                  </div>
                ))}
                {stageContacts.length > 15 && <div style={{ textAlign: 'center', fontSize: '10px', color: colors.textMuted, padding: '8px' }}>+{stageContacts.length - 15} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const Modal = ({ title, children, onClose }) => (
    <div style={s.modal} onClick={onClose}>
      <div style={s.modalContent} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <span style={{ fontWeight: '600', color: colors.platinum, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>Ã—</button>
        </div>
        {children}
      </div>
    </div>
  );

  const EmailModal = () => (
    <Modal title={L.sendEmail} onClose={() => setShowModal(null)}>
      <div style={s.modalBody}>
        <div style={{ marginBottom: '16px' }}><label style={s.filterLabel}>Recipient</label><input type="text" value={selectedContact?.email || `${selectedContact?.company_name} (${L.pending})`} style={s.input} readOnly /></div>
        <div style={{ marginBottom: '16px' }}><label style={s.filterLabel}>Subject</label><input type="text" value={emailDraft.subject} onChange={e => setEmailDraft(d => ({ ...d, subject: e.target.value }))} placeholder="Partnership Opportunity - Mexausa Food Group, Inc." style={s.input} /></div>
        <div style={{ marginBottom: '16px' }}><label style={s.filterLabel}>Template</label>
          <select value={emailDraft.template} onChange={e => setEmailDraft(d => ({ ...d, template: e.target.value }))} style={{ ...s.select, width: '100%' }}>
            <option value="custom">Custom</option>
            <option value="intro">Initial Introduction</option>
            <option value="follow-up">Follow-up</option>
            <option value="catalog">Product Catalog</option>
            <option value="meeting">Meeting Request</option>
            <option value="quote">Quote Request</option>
          </select>
        </div>
        <div><label style={s.filterLabel}>Message</label><textarea rows={6} value={emailDraft.body} onChange={e => setEmailDraft(d => ({ ...d, body: e.target.value }))} style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Compose your message..." /></div>
        {emailSendError && <div style={{ marginTop: 10, color: colors.statusHot, fontSize: 12 }}>Error: {emailSendError}</div>}
      </div>
      <div style={s.modalFooter}>
        <button style={s.btn()} onClick={() => setShowModal(null)}>{L.cancel}</button>
        <button style={s.btn('primary')} disabled={emailSending || !selectedContact?.email} onClick={sendIndividualEmail}>{emailSending ? 'Sending...' : L.send}</button>
      </div>
    </Modal>
  );

  const CalendarModal = () => (
    <Modal title={L.schedule} onClose={() => setShowModal(null)}>
      <div style={s.modalBody}>
        <div style={{ marginBottom: '16px' }}><label style={s.filterLabel}>Contact</label><input type="text" value={`${selectedContact?.company_name} - ${selectedContact?.contact_name || 'No contact'}`} style={s.input} readOnly /></div>
        <div style={{ marginBottom: '16px' }}><label style={s.filterLabel}>Activity Type</label>
          <select style={{ ...s.select, width: '100%' }}>
            <option>Phone Call</option><option>Email Follow-up</option><option>Video Meeting</option><option>In-Person Meeting</option><option>Send Proposal</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div><label style={s.filterLabel}>Date</label><input type="date" style={s.input} /></div>
          <div><label style={s.filterLabel}>Time</label><input type="time" style={s.input} /></div>
        </div>
        <div style={{ marginBottom: '16px' }}><label style={s.filterLabel}>Update Lead Status</label>
          <select style={{ ...s.select, width: '100%' }}>
            <option value="">â€” No change â€”</option>
            {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </div>
        <div><label style={s.filterLabel}>Notes</label><textarea rows={3} style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Add notes..." /></div>
      </div>
      <div style={s.modalFooter}>
        <button style={s.btn()} onClick={() => setShowModal(null)}>{L.cancel}</button>
        <button style={s.btn('primary')}>{L.schedule}</button>
      </div>
    </Modal>
  );

  const CampaignModal = () => (
    <Modal title={L.addToCampaign} onClose={() => setShowModal(null)}>
      <div style={s.modalBody}>
        <div style={{ marginBottom: '16px' }}>
          <label style={s.filterLabel}>Contact</label>
          <div style={{ padding: '12px 14px', background: colors.slate800, borderRadius: '4px', border: `1px solid ${colors.border}` }}>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>{selectedContact?.company_name}</div>
            <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '3px' }}>{selectedContact?.municipality}, {selectedContact?.state}</div>
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={s.filterLabel}>Current Campaigns</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {selectedContact?.campaigns?.length > 0 ? selectedContact.campaigns.map(cid => {
              const camp = campaigns.find(c => c.id === cid);
              return camp ? <span key={cid} style={{ padding: '5px 12px', background: `${colors.gold}12`, color: colors.gold, borderRadius: '3px', fontSize: '11px', border: `1px solid ${colors.gold}25` }}>{camp.name.replace(/^[^\s]+\s/, '')}</span> : null;
            }) : <span style={{ color: colors.textMuted, fontSize: '11px' }}>No campaigns assigned</span>}
          </div>
        </div>
        <div>
          <label style={s.filterLabel}>Available Campaigns</label>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {campaigns.map(camp => {
              const inCampaign = selectedContact?.campaigns?.includes(camp.id);
              return (
                <div key={camp.id} style={{ padding: '12px 14px', background: inCampaign ? `${colors.statusConverted}08` : colors.slate800, borderRadius: '4px', marginBottom: '8px', cursor: inCampaign ? 'default' : 'pointer', border: `1px solid ${inCampaign ? colors.statusConverted : colors.border}25`, opacity: inCampaign ? 0.7 : 1 }}
                  onClick={() => {
                    if (!inCampaign) {
                      setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, campaigns: [...(c.campaigns || []), camp.id] } : c));
                      setSelectedContact(prev => ({ ...prev, campaigns: [...(prev.campaigns || []), camp.id] }));
                    }
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500', fontSize: '12px', color: colors.textPrimary }}>{camp.name.replace(/^[^\s]+\s/, '')}</span>
                    {inCampaign && <span style={{ color: colors.statusConverted, fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Added</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: colors.textMuted, marginTop: '4px' }}>{stats.byCampaign[camp.id] || camp.contact_count || 0} contacts</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div style={s.modalFooter}>
        <button style={s.btn('primary')} onClick={() => setShowModal(null)}>{L.done}</button>
      </div>
    </Modal>
  );

  const BulkModal = () => (
    <Modal title={`${L.bulkActions} (${selectedContacts.length} ${L.selected})`} onClose={() => setShowModal(null)}>
      <div style={s.modalBody}>
        <div style={{ marginBottom: '20px' }}>
          <label style={s.filterLabel}>{L.changeStatus}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {Object.entries(LEAD_STATUS).map(([k, v]) => (
              <button key={k} style={{ ...s.btn(), textAlign: 'left', padding: '12px 14px', borderLeft: `3px solid ${v.color}` }} onClick={() => { bulkUpdateStatus(k); setShowModal(null); }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: v.color }}></span>
                  {v.name}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={s.filterLabel}>{L.addToCampaign}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {campaigns.map(camp => (
              <button key={camp.id} style={{ ...s.btn(), textAlign: 'left', padding: '12px 14px' }} onClick={() => { bulkAddToCampaign(camp.id); setShowModal(null); }}>
                {camp.name.replace(/^[^\s]+\s/, '')}
                <span style={{ fontSize: '10px', color: colors.textMuted, marginLeft: '10px' }}>({stats.byCampaign[camp.id] || 0} contacts)</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );

  // ============================================
  // NEW VIEW â€” MASS BLAST
  // ============================================
  const BlastView = () => {
    const recipients = computeBlastRecipients();
    return (
      <div style={{ background: colors.card, borderRadius: 4, padding: 20, border: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 18, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{L.massBlast}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={s.filterLabel}>{L.segment} â€” Country</label>
            <select value={blastSegment.country} onChange={e => setBlastSegment(b => ({ ...b, country: e.target.value }))} style={{ ...s.select, width: '100%' }}>
              <option value="all">{L.allCountries}</option>
              {Object.keys(stats.byCountry || {}).map(cc => <option key={cc} value={cc}>{cc} ({stats.byCountry[cc]})</option>)}
            </select>
          </div>
          <div>
            <label style={s.filterLabel}>{L.segment} â€” Industry</label>
            <select value={blastSegment.industry} onChange={e => setBlastSegment(b => ({ ...b, industry: e.target.value }))} style={{ ...s.select, width: '100%' }}>
              <option value="all">{L.allIndustries}</option>
              {Object.entries(INDUSTRIES).map(([k, v]) => <option key={k} value={k}>{v.name} ({stats.byIndustry[k] || 0})</option>)}
            </select>
          </div>
          <div>
            <label style={s.filterLabel}>{L.segment} â€” Status</label>
            <select value={blastSegment.status} onChange={e => setBlastSegment(b => ({ ...b, status: e.target.value }))} style={{ ...s.select, width: '100%' }}>
              <option value="all">{L.allStatus}</option>
              {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.name} ({stats.byStatus[k] || 0})</option>)}
            </select>
          </div>
        </div>
        <div style={{ background: colors.slate800, borderRadius: 4, padding: 14, marginBottom: 14, border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.gold}` }}>
          <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{L.recipients}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: colors.gold }}>{recipients.length.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>contacts with email matching segment</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={s.filterLabel}>{L.subject}</label>
          <input type="text" value={blastSubject} onChange={e => setBlastSubject(e.target.value)} style={s.input} placeholder="e.g. Partnership Opportunity â€” Mexausa Food Group, Inc." />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={s.filterLabel}>Template</label>
          <select value={blastTemplate} onChange={e => setBlastTemplate(e.target.value)} style={{ ...s.select, width: '100%' }}>
            <option value="custom">Custom (blank)</option>
            <option value="intro-grower">Grower Introduction</option>
            <option value="intro-buyer">Buyer Introduction</option>
            <option value="intro-shipper">Shipper Introduction</option>
            <option value="follow-up">Follow-up</option>
            <option value="price-alert">Price Alert</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.filterLabel}>{L.message}</label>
          <textarea rows={8} value={blastBody} onChange={e => setBlastBody(e.target.value)} style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Compose your blast message. Use {{contact_name}} and {{company_name}} as merge tags." />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button style={s.btn('primary')} disabled={blastSending || !recipients.length} onClick={sendBlast}>
            {blastSending ? 'Sending...' : `${L.sendBlast} ${recipients.length ? `(${recipients.length})` : ''}`}
          </button>
          <button style={s.btn()} onClick={() => { setBlastSubject(''); setBlastBody(''); setBlastResult(null); }}>Clear</button>
          {blastResult?.sent != null && (
            <span style={{ color: colors.statusConverted, fontSize: 12, fontWeight: 600 }}>
              {L.sent}: {blastResult.sent}{blastResult.failed > 0 && `  ${L.failed}: ${blastResult.failed}`}
            </span>
          )}
          {blastResult?.error && (
            <span style={{ color: colors.statusHot, fontSize: 12, fontWeight: 600 }}>Error: {blastResult.error}</span>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // NEW VIEW â€” DB SCRAPER
  // Queries AuditDNA's 3 internal tables (growers/buyers/shippers = 23,379 contacts)
  // ============================================
  const ScraperView = () => (
    <div style={{ background: colors.card, borderRadius: 4, padding: 20, border: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 18, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{L.dbScraper}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 14, alignItems: 'end' }}>
        <div>
          <label style={s.filterLabel}>{L.source}</label>
          <select value={scrapeSource} onChange={e => setScrapeSource(e.target.value)} style={{ ...s.select, width: '100%' }}>
            <option value="growers">Growers (5,000)</option>
            <option value="buyers">Buyers (3,000)</option>
            <option value="shippers">Shippers (15,379)</option>
            <option value="all">All Sources (23,379)</option>
          </select>
        </div>
        <div>
          <label style={s.filterLabel}>Country</label>
          <select value={scrapeCountry} onChange={e => setScrapeCountry(e.target.value)} style={{ ...s.select, width: '100%' }}>
            <option value="all">All</option>
            <option value="MX">Mexico</option>
            <option value="US">USA</option>
            <option value="DO">Dominican Republic</option>
            <option value="GT">Guatemala</option>
            <option value="PE">Peru</option>
          </select>
        </div>
        <div>
          <label style={s.filterLabel}>{L.riskTier}</label>
          <select value={scrapeRiskTier} onChange={e => setScrapeRiskTier(e.target.value)} style={{ ...s.select, width: '100%' }}>
            <option value="all">All Tiers</option>
            <option value="1">Tier 1 (Low Risk)</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3 (High Risk)</option>
          </select>
        </div>
        <button style={s.btn('primary')} disabled={scrapeLoading} onClick={runScraper}>
          {scrapeLoading ? 'Scraping...' : L.runScrape}
        </button>
      </div>
      {scrapeStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          <div style={s.statCard}><div style={s.statValue}>{scrapeStats.growers.toLocaleString()}</div><div style={s.statLabel}>Growers</div></div>
          <div style={s.statCard}><div style={s.statValue}>{scrapeStats.buyers.toLocaleString()}</div><div style={s.statLabel}>Buyers</div></div>
          <div style={s.statCard}><div style={s.statValue}>{scrapeStats.shippers.toLocaleString()}</div><div style={s.statLabel}>Shippers</div></div>
          <div style={{ ...s.statCard, borderLeft: `3px solid ${colors.statusConverted}` }}><div style={s.statValue}>{scrapeStats.total.toLocaleString()}</div><div style={s.statLabel}>Total Matched</div></div>
        </div>
      )}
      {scrapeSelected.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ color: colors.gold, fontSize: 12, fontWeight: 600 }}>{scrapeSelected.length} {L.selected}</span>
          <button style={s.btn('primary')} onClick={importScrapedToCRM}>{L.importToCRM} ({scrapeSelected.length})</button>
          <button style={s.btn()} onClick={() => setScrapeSelected([])}>Clear</button>
        </div>
      )}
      <div style={{ maxHeight: '52vh', overflowY: 'auto', background: colors.slate800, borderRadius: 4, border: `1px solid ${colors.border}` }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}><input type="checkbox" style={s.checkbox} onChange={e => setScrapeSelected(e.target.checked ? scrapeResults.map(r => r.id) : [])} /></th>
              <th style={s.th}>Source</th>
              <th style={s.th}>Name / Legal</th>
              <th style={s.th}>Contact</th>
              <th style={s.th}>Country</th>
              <th style={s.th}>Tier</th>
              <th style={s.th}>Email</th>
            </tr>
          </thead>
          <tbody>
            {scrapeResults.slice(0, 200).map(r => (
              <tr key={`${r._source}_${r.id}`}>
                <td style={s.td}><input type="checkbox" style={s.checkbox} checked={scrapeSelected.includes(r.id)} onChange={() => setScrapeSelected(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id])} /></td>
                <td style={s.td}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: colors.slate700, color: colors.textSecondary, textTransform: 'uppercase' }}>{r._source}</span></td>
                <td style={s.td}>{r.legal_name || r.name || r.company_name || '-'}</td>
                <td style={s.td}>{r.primary_contact || r.contact_name || '-'}</td>
                <td style={s.td}>{r.country || r.country_code || '-'}</td>
                <td style={s.td}>{r.risk_tier || '-'}</td>
                <td style={s.td}>{r.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!scrapeResults.length && !scrapeLoading && <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>No results â€” click {L.runScrape} to scrape internal tables</div>}
        {scrapeResults.length > 200 && <div style={{ padding: 12, textAlign: 'center', color: colors.textMuted, fontSize: 11 }}>Showing first 200 of {scrapeResults.length.toLocaleString()} â€” use filters to narrow</div>}
      </div>
    </div>
  );

  // ============================================
  // NEW VIEW â€” MESSENGER HUB (UI scaffold, backend Phase 2)
  // ============================================
  const MessengerView = () => (
    <div style={{ background: colors.card, borderRadius: 4, padding: 20, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{L.messenger}</div>
        <span style={{ padding: '4px 12px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: colors.statusWarm, color: colors.slate900, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{L.phaseTwo}</span>
      </div>
      <div style={{ background: colors.slate800, borderRadius: 4, padding: 16, marginBottom: 14, border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.statusWarm}` }}>
        <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.6 }}>
          UI scaffold ready. Backend work needed: port <code style={{ color: colors.gold }}>Internal-messenger.js</code> from EnjoyBaja backend to AuditDNA backend, create <code style={{ color: colors.gold }}>im_channels</code> and <code style={{ color: colors.gold }}>im_messages</code> tables in AuditDNA PostgreSQL, wire channel list endpoint. Send button is disabled until backend lands â€” no silent failures.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, height: '52vh' }}>
        <div style={{ background: colors.slate800, borderRadius: 4, padding: 12, border: `1px solid ${colors.border}`, overflowY: 'auto' }}>
          <div style={s.filterLabel}>Channels (preview)</div>
          {['team-agriculture', 'team-mortgage', 'owner-only', 'compliance', 'sales-floor'].map(ch => (
            <div key={ch} style={{ ...s.sideItem(messengerChannel === ch), opacity: 0.6 }} onClick={() => setMessengerChannel(ch)}>#{ch}</div>
          ))}
        </div>
        <div style={{ background: colors.slate800, borderRadius: 4, padding: 16, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, color: colors.textMuted, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Message history will appear here once backend is live</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input type="text" value={messengerDraft} onChange={e => setMessengerDraft(e.target.value)} disabled placeholder={`${L.typeMessage} (disabled â€” ${L.phaseTwo})`} style={{ ...s.input, opacity: 0.5 }} />
            <button style={{ ...s.btn('primary'), opacity: 0.5, cursor: 'not-allowed' }} disabled>{L.send}</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // NEW VIEW â€” INTEREST INBOX (inbound reply tracking, backend Phase 2)
  // ============================================
  const InboxView = () => (
    <div style={{ background: colors.card, borderRadius: 4, padding: 20, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{L.inbox} â€” {L.trackReplies}</div>
        <span style={{ padding: '4px 12px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: colors.statusWarm, color: colors.slate900, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{L.phaseTwo}</span>
      </div>
      <div style={{ background: colors.slate800, borderRadius: 4, padding: 16, marginBottom: 14, border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.statusWarm}` }}>
        <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, color: colors.platinum, marginBottom: 8 }}>What this view will do (Phase 2):</div>
          <div>â€¢ Capture inbound email replies to blasts/campaigns sent from this CRM</div>
          <div>â€¢ Match replies to original outreach by Message-ID or subject thread</div>
          <div>â€¢ Queue "interested" responses for Saul/team to act on</div>
          <div>â€¢ One-click draft reply (Claude-generated, Saul approves)</div>
          <div>â€¢ Auto-update lead status when reply lands (new â†’ warm â†’ meeting-requested)</div>
          <div>â€¢ Fire Brain event on every inbound â€” feed Niner Miners for follow-up automation</div>
          <div style={{ fontWeight: 600, color: colors.platinum, marginTop: 12, marginBottom: 8 }}>Backend requirements:</div>
          <div>â€¢ Choose: <strong>(A)</strong> IMAP poller (checks GoDaddy inbox every N minutes) OR <strong>(B)</strong> Zoho/inbound webhook (fires on each received email)</div>
          <div>â€¢ Table: <code style={{ color: colors.gold }}>email_replies</code> (id, from_email, subject, body, related_campaign_id, related_contact_id, received_at, processed)</div>
          <div>â€¢ Route: <code style={{ color: colors.gold }}>POST /api/inbox/webhook</code> (for option B) or cron job (for option A)</div>
        </div>
      </div>
      <div style={{ background: colors.slate800, borderRadius: 4, padding: 30, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
        <div style={{ color: colors.textMuted, fontSize: 12 }}>{L.noInboundYet}</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>Inbox items: {inboxItems.length}</div>
      </div>
    </div>
  );

  // ============================================
  // NEW VIEW — DEAL FLOOR (Phase 2.1 blind marketplace)
  // 5 sections: DEAL ROOMS / CHANNELS / DD REVIEW / PO+FINANCE / COMPLIANCE
  // Preserves anon_id display, hash-chain verification, stage badges, drag-drop upload
  // ============================================
  const DF_SECTIONS = [
    { id: 'deal-rooms',  label: 'Deal Rooms',  labelES: 'Salas de Trato' },
    { id: 'channels',    label: 'Channels',    labelES: 'Canales' },
    { id: 'dd-review',   label: 'DD Review',   labelES: 'RevisiÃ³n DD' },
    { id: 'po-finance',  label: 'PO + Finance',labelES: 'OC + Finanzas' },
    { id: 'compliance',  label: 'Compliance',  labelES: 'Cumplimiento' },
  ];

  const dfStageBadge = (stage) => {
    const st = DF_STAGES[stage] || { name: stage || '—', color: colors.textMuted };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 3, fontSize: 10, fontWeight: 600,
        background: `${st.color}15`, color: st.color,
        border: `1px solid ${st.color}40`, textTransform: 'uppercase', letterSpacing: '0.6px'
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 2, background: st.color }} />
        {st.name}
      </span>
    );
  };

  const DfDealRoomsView = () => {
    const stageCounts = dfChannels.reduce((acc, c) => {
      acc[c.stage] = (acc[c.stage] || 0) + 1;
      return acc;
    }, {});
    const recent = [...dfChannels].sort((a, b) =>
      new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    ).slice(0, 8);
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Deal Rooms Overview</div>
          {dfStatus && (
            <span style={{ fontSize: 10, color: colors.textMuted, letterSpacing: '0.5px' }}>
              Backend: {dfStatus.status || 'online'}{dfStatus.version ? ` v${dfStatus.version}` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          {Object.entries(DF_STAGES).map(([k, st]) => (
            <div key={k} style={{ ...s.statCard, borderLeft: `3px solid ${st.color}` }}>
              <div style={{ ...s.statValue, color: st.color }}>{stageCounts[k] || 0}</div>
              <div style={s.statLabel}>{st.name}</div>
            </div>
          ))}
        </div>
        <div style={{ background: colors.card, borderRadius: 4, padding: 18, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.platinum, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Recent Activity</div>
          {recent.length ? recent.map(c => (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center',
              padding: '10px 12px', background: colors.slate800, borderRadius: 3,
              marginBottom: 6, cursor: 'pointer', borderLeft: `2px solid ${DF_STAGES[c.stage]?.color || colors.border}`
            }} onClick={() => { setDfSection('channels'); loadChannelDetail(c); }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>{c.code || c.channel_code || `CH-${c.id}`}</div>
                <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                  {c.commodity || '—'}{c.variety ? ` / ${c.variety}` : ''}{c.pack ? ` / ${c.pack}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 10, color: colors.textMuted, fontFamily: 'monospace' }}>
                anon: {c.anon_id || c.anonymous_id || '—'}
              </span>
              {dfStageBadge(c.stage)}
              <span style={{ fontSize: 10, color: colors.textMuted }}>
                {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : (c.created_at ? new Date(c.created_at).toLocaleDateString() : '—')}
              </span>
            </div>
          )) : (
            <div style={{ padding: 30, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
              No channels yet. Create one in the Channels section.
            </div>
          )}
        </div>
      </div>
    );
  };

  const DfChannelsView = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Channels ({dfChannels.length})
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn()} onClick={loadDealFloor} disabled={dfLoading}>
            {dfLoading ? 'Loading...' : L.refresh}
          </button>
          <button style={s.btn('primary')} onClick={() => setDfShowNewChannel(true)}>+ New Channel</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: dfSelectedChannel ? '1fr 1fr' : '1fr', gap: 14 }}>
        <div style={{ background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, overflow: 'hidden', maxHeight: '70vh', overflowY: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Code</th>
                <th style={s.th}>Anon ID</th>
                <th style={s.th}>Commodity</th>
                <th style={s.th}>Stage</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Hash</th>
              </tr>
            </thead>
            <tbody>
              {dfChannels.map(c => (
                <tr key={c.id}
                    style={{ cursor: 'pointer', background: dfSelectedChannel?.id === c.id ? `${colors.gold}10` : 'transparent' }}
                    onClick={() => loadChannelDetail(c)}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: 12 }}>{c.code || c.channel_code || `CH-${c.id}`}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </div>
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: colors.gold }}>
                    {c.anon_id || c.anonymous_id || '—'}
                  </td>
                  <td style={s.td}>
                    <div style={{ fontSize: 12 }}>{c.commodity || '—'}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                      {[c.variety, c.pack, c.grade].filter(Boolean).join(' / ') || '—'}
                    </div>
                  </td>
                  <td style={s.td}>{dfStageBadge(c.stage)}</td>
                  <td style={{ ...s.td, fontSize: 11 }}>
                    {c.qty_cartons ? `${Number(c.qty_cartons).toLocaleString()} ct` : '—'}
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 10, color: colors.textMuted }}>
                    {c.hash ? `${String(c.hash).slice(0, 10)}…` : '—'}
                  </td>
                </tr>
              ))}
              {!dfChannels.length && !dfLoading && (
                <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
                  No channels. Click + New Channel to open the first deal room.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {dfSelectedChannel && (
          <div style={{ background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, padding: 18, maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.platinum }}>
                  {dfSelectedChannel.code || dfSelectedChannel.channel_code || `CH-${dfSelectedChannel.id}`}
                </div>
                <div style={{ fontSize: 11, color: colors.gold, fontFamily: 'monospace', marginTop: 4 }}>
                  anon_id: {dfSelectedChannel.anon_id || dfSelectedChannel.anonymous_id || '—'}
                </div>
              </div>
              <button style={{ ...s.btn(), padding: '4px 10px', fontSize: 10 }} onClick={() => setDfSelectedChannel(null)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ background: colors.slate800, padding: 10, borderRadius: 3, border: `1px solid ${colors.border}` }}>
                <div style={s.filterLabel}>Commodity</div>
                <div style={{ fontSize: 13, color: colors.textPrimary }}>{dfSelectedChannel.commodity || '—'}</div>
              </div>
              <div style={{ background: colors.slate800, padding: 10, borderRadius: 3, border: `1px solid ${colors.border}` }}>
                <div style={s.filterLabel}>Variety</div>
                <div style={{ fontSize: 13, color: colors.textPrimary }}>{dfSelectedChannel.variety || '—'}</div>
              </div>
              <div style={{ background: colors.slate800, padding: 10, borderRadius: 3, border: `1px solid ${colors.border}` }}>
                <div style={s.filterLabel}>Pack / Grade</div>
                <div style={{ fontSize: 13, color: colors.textPrimary }}>{[dfSelectedChannel.pack, dfSelectedChannel.grade].filter(Boolean).join(' / ') || '—'}</div>
              </div>
              <div style={{ background: colors.slate800, padding: 10, borderRadius: 3, border: `1px solid ${colors.border}` }}>
                <div style={s.filterLabel}>Qty Cartons</div>
                <div style={{ fontSize: 13, color: colors.textPrimary }}>
                  {dfSelectedChannel.qty_cartons ? Number(dfSelectedChannel.qty_cartons).toLocaleString() : '—'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={s.filterLabel}>Current Stage</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {dfStageBadge(dfSelectedChannel.stage)}
                <select
                  style={{ ...s.select, flex: 1 }}
                  value=""
                  onChange={e => { if (e.target.value) advanceChannelStage(dfSelectedChannel.id, e.target.value); }}>
                  <option value="">Advance to…</option>
                  {Object.entries(DF_STAGES).map(([k, st]) =>
                    <option key={k} value={k} disabled={DF_STAGES[dfSelectedChannel.stage]?.order >= st.order}>{st.name}</option>
                  )}
                </select>
              </div>
            </div>

            <div style={{
              background: colors.slate800, padding: 12, borderRadius: 3,
              border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.gold}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Audit Hash Chain
                </div>
                <button style={{ ...s.btn(), padding: '4px 10px', fontSize: 10 }} onClick={() => verifyAuditChain(dfSelectedChannel.id)}>
                  Verify
                </button>
              </div>
              {dfAuditChain?.verifying ? (
                <div style={{ fontSize: 11, color: colors.textMuted }}>Verifying chain…</div>
              ) : dfAuditChain?.valid === true ? (
                <div style={{ fontSize: 11, color: colors.gold }}>
                  Chain intact — {dfAuditChain.length || dfAuditChain.chain?.length || 0} blocks verified
                </div>
              ) : dfAuditChain?.valid === false ? (
                <div style={{ fontSize: 11, color: colors.statusHot }}>
                  CHAIN BROKEN at block {dfAuditChain.break_at ?? '?'} — {dfAuditChain.reason || 'hash mismatch'}
                </div>
              ) : dfAuditChain?.error ? (
                <div style={{ fontSize: 11, color: colors.statusHot }}>Error: {dfAuditChain.error}</div>
              ) : (
                <div style={{ fontSize: 11, color: colors.textMuted }}>Click Verify to recompute the hash chain</div>
              )}
              <div style={{ fontSize: 10, color: colors.textMuted, fontFamily: 'monospace', marginTop: 8, wordBreak: 'break-all' }}>
                head: {dfSelectedChannel.hash || dfAuditChain?.head || '—'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
              <div style={{ ...s.statCard, padding: 10 }}>
                <div style={{ ...s.statValue, fontSize: 18 }}>{dfDdItems.length}</div>
                <div style={s.statLabel}>DD Docs</div>
              </div>
              <div style={{ ...s.statCard, padding: 10 }}>
                <div style={{ ...s.statValue, fontSize: 18 }}>{dfPoItems.length}</div>
                <div style={s.statLabel}>POs</div>
              </div>
              <div style={{ ...s.statCard, padding: 10 }}>
                <div style={{ ...s.statValue, fontSize: 18 }}>{dfComplianceItems.length}</div>
                <div style={s.statLabel}>Compliance</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {dfShowNewChannel && (
        <Modal title="New Deal Channel" onClose={() => setDfShowNewChannel(false)}>
          <div style={s.modalBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.filterLabel}>Commodity *</label>
                <input style={s.input} value={dfNewChannel.commodity}
                       onChange={e => setDfNewChannel(n => ({ ...n, commodity: e.target.value }))}
                       placeholder="Avocado, Lime, Berry..." />
              </div>
              <div>
                <label style={s.filterLabel}>Variety</label>
                <input style={s.input} value={dfNewChannel.variety}
                       onChange={e => setDfNewChannel(n => ({ ...n, variety: e.target.value }))}
                       placeholder="Hass, Persian..." />
              </div>
              <div>
                <label style={s.filterLabel}>Pack</label>
                <input style={s.input} value={dfNewChannel.pack}
                       onChange={e => setDfNewChannel(n => ({ ...n, pack: e.target.value }))}
                       placeholder="48ct, 60ct, flat..." />
              </div>
              <div>
                <label style={s.filterLabel}>Grade</label>
                <input style={s.input} value={dfNewChannel.grade}
                       onChange={e => setDfNewChannel(n => ({ ...n, grade: e.target.value }))}
                       placeholder="#1, #2, export..." />
              </div>
              <div>
                <label style={s.filterLabel}>Qty (cartons)</label>
                <input type="number" style={s.input} value={dfNewChannel.qty_cartons}
                       onChange={e => setDfNewChannel(n => ({ ...n, qty_cartons: e.target.value }))} />
              </div>
              <div>
                <label style={s.filterLabel}>Origin</label>
                <input style={s.input} value={dfNewChannel.origin}
                       onChange={e => setDfNewChannel(n => ({ ...n, origin: e.target.value }))}
                       placeholder="Michoacán, Baja California..." />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={s.filterLabel}>Notes</label>
              <textarea rows={3} style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }}
                        value={dfNewChannel.notes}
                        onChange={e => setDfNewChannel(n => ({ ...n, notes: e.target.value }))} />
            </div>
          </div>
          <div style={s.modalFooter}>
            <button style={s.btn()} onClick={() => setDfShowNewChannel(false)}>{L.cancel}</button>
            <button style={s.btn('primary')} onClick={createChannel} disabled={!dfNewChannel.commodity}>Create Channel</button>
          </div>
        </Modal>
      )}
    </div>
  );

  const DfDdReviewView = () => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
        Due Diligence Review
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={s.filterLabel}>Channel</label>
          <select style={{ ...s.select, width: '100%' }}
                  value={dfSelectedChannel?.id || ''}
                  onChange={e => {
                    const ch = dfChannels.find(c => String(c.id) === String(e.target.value));
                    if (ch) loadChannelDetail(ch); else setDfSelectedChannel(null);
                  }}>
            <option value="">— Select a channel —</option>
            {dfChannels.map(c =>
              <option key={c.id} value={c.id}>
                {(c.code || `CH-${c.id}`)} — {c.commodity} {c.variety ? `/ ${c.variety}` : ''} [{c.stage || 'LOI'}]
              </option>
            )}
          </select>
        </div>
        <div>
          <label style={s.filterLabel}>Document Type ({dfDocTypes.length} seeded)</label>
          <select style={{ ...s.select, width: '100%' }} value={dfUploadDocType}
                  onChange={e => setDfUploadDocType(e.target.value)}>
            <option value="">— Select doc type —</option>
            {dfDocTypes.map(t =>
              <option key={t.id || t.code || t.name} value={t.code || t.id || t.name}>
                {t.label || t.name || t.code}
              </option>
            )}
          </select>
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDfDragOver(true); }}
        onDragLeave={() => setDfDragOver(false)}
        onDrop={onDropFile}
        onClick={() => dfFileInputRef.current?.click()}
        style={{
          padding: 30, textAlign: 'center', cursor: 'pointer',
          background: dfDragOver ? `${colors.gold}12` : colors.slate800,
          border: `2px dashed ${dfDragOver ? colors.gold : colors.border}`,
          borderRadius: 4, marginBottom: 14, transition: 'all 0.15s ease'
        }}>
        <div style={{ fontSize: 13, color: dfDragOver ? colors.gold : colors.textPrimary, fontWeight: 600 }}>
          {dfDragOver ? 'Release to upload' : 'Drag & drop a document here'}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
          or click to browse — selected channel: {dfSelectedChannel?.code || dfSelectedChannel?.channel_code || '(none)'} / type: {dfUploadDocType || '(none)'}
        </div>
        <input type="file" ref={dfFileInputRef} style={{ display: 'none' }} onChange={onFileInput} />
      </div>

      {dfUploadStatus?.uploading && (
        <div style={{ padding: 10, background: colors.slate800, borderRadius: 3, marginBottom: 12, fontSize: 11, color: colors.gold }}>
          Uploading {dfUploadStatus.filename}…
        </div>
      )}
      {dfUploadStatus?.success && (
        <div style={{ padding: 10, background: `${colors.gold}10`, borderRadius: 3, marginBottom: 12, fontSize: 11, color: colors.gold, borderLeft: `3px solid ${colors.gold}` }}>
          Uploaded: {dfUploadStatus.filename}
        </div>
      )}
      {dfUploadStatus?.error && (
        <div style={{ padding: 10, background: `${colors.statusHot}10`, borderRadius: 3, marginBottom: 12, fontSize: 11, color: colors.statusHot, borderLeft: `3px solid ${colors.statusHot}` }}>
          Error: {dfUploadStatus.error}
        </div>
      )}

      <div style={{ background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Filename</th>
              <th style={s.th}>Doc Type</th>
              <th style={s.th}>Uploaded</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Hash</th>
            </tr>
          </thead>
          <tbody>
            {dfDdItems.map(it => (
              <tr key={it.id}>
                <td style={s.td}>
                  <div style={{ fontSize: 12, color: colors.textPrimary }}>{it.filename || it.file_name || '—'}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted }}>
                    {it.file_size ? `${Math.round(it.file_size / 1024)} KB` : ''}
                  </div>
                </td>
                <td style={{ ...s.td, fontSize: 11 }}>{it.doc_type || it.type || '—'}</td>
                <td style={{ ...s.td, fontSize: 11, color: colors.textMuted }}>
                  {it.uploaded_at || it.created_at ? new Date(it.uploaded_at || it.created_at).toLocaleString() : '—'}
                </td>
                <td style={s.td}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                    background: it.status === 'approved' ? `${colors.gold}18` : it.status === 'flagged' ? `${colors.statusHot}18` : `${colors.silver}18`,
                    color: it.status === 'approved' ? colors.gold : it.status === 'flagged' ? colors.statusHot : colors.silver,
                  }}>{(it.status || 'pending').toUpperCase()}</span>
                </td>
                <td style={{ ...s.td, fontSize: 10, color: colors.textMuted, fontFamily: 'monospace' }}>
                  {it.hash ? `${String(it.hash).slice(0, 12)}…` : '—'}
                </td>
              </tr>
            ))}
            {!dfDdItems.length && (
              <tr><td colSpan="5" style={{ padding: 30, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
                {dfSelectedChannel ? 'No documents uploaded yet for this channel.' : 'Select a channel to see its DD docs.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const DfPoFinanceView = () => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
        Purchase Orders + Factoring Waterfall
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={s.filterLabel}>Channel</label>
        <select style={{ ...s.select, width: '100%' }}
                value={dfSelectedChannel?.id || ''}
                onChange={e => {
                  const ch = dfChannels.find(c => String(c.id) === String(e.target.value));
                  if (ch) loadChannelDetail(ch); else setDfSelectedChannel(null);
                }}>
          <option value="">— Select a channel —</option>
          {dfChannels.map(c =>
            <option key={c.id} value={c.id}>
              {c.code || `CH-${c.id}`} — {c.commodity} [{c.stage || 'LOI'}]
            </option>
          )}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Purchase Orders ({dfPoItems.length})
          </div>
          {dfPoItems.length ? dfPoItems.map(po => (
            <div key={po.id} style={{ padding: 10, background: colors.slate800, borderRadius: 3, marginBottom: 6, borderLeft: `2px solid ${colors.gold}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{po.po_number || po.number || `PO-${po.id}`}</span>
                <span style={{ fontSize: 12, color: colors.gold, fontWeight: 700 }}>
                  {po.amount_usd ? `$${Number(po.amount_usd).toLocaleString()}` : '—'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                {po.qty_cartons ? `${Number(po.qty_cartons).toLocaleString()} ct` : ''}
                {po.unit_price ? ` @ $${Number(po.unit_price).toFixed(2)}/ct` : ''}
                {po.created_at ? ` · ${new Date(po.created_at).toLocaleDateString()}` : ''}
              </div>
            </div>
          )) : (
            <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted, fontSize: 11 }}>
              {dfSelectedChannel ? 'No POs yet' : 'Select a channel'}
            </div>
          )}
        </div>

        <div style={{ background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Factoring Waterfall ({dfFinanceItems.length})
          </div>
          {dfFinanceItems.length ? dfFinanceItems.map((fin, i) => (
            <div key={fin.id || i} style={{ padding: 10, background: colors.slate800, borderRadius: 3, marginBottom: 6, borderLeft: `2px solid ${colors.platinum}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Priority {fin.order || fin.priority || (i + 1)} — {fin.partner_label || 'Financing Partner'}
                </span>
                <span style={{ fontSize: 11, color: colors.gold }}>
                  {fin.advance_rate ? `${(Number(fin.advance_rate) * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                {fin.stage ? `Stage: ${fin.stage} · ` : ''}
                {fin.status ? `Status: ${fin.status}` : ''}
              </div>
              {fin.identity_disclosed === false && (
                <div style={{ fontSize: 10, color: colors.silver, marginTop: 4, fontStyle: 'italic' }}>
                  Identity hidden until Party Disclosure stage
                </div>
              )}
            </div>
          )) : (
            <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted, fontSize: 11 }}>
              {dfSelectedChannel ? 'No finance records yet' : 'Select a channel'}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const DfComplianceView = () => (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
        Compliance + Audit Chain
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={s.filterLabel}>Channel</label>
        <select style={{ ...s.select, width: '100%' }}
                value={dfSelectedChannel?.id || ''}
                onChange={e => {
                  const ch = dfChannels.find(c => String(c.id) === String(e.target.value));
                  if (ch) loadChannelDetail(ch); else setDfSelectedChannel(null);
                }}>
          <option value="">— Select a channel —</option>
          {dfChannels.map(c =>
            <option key={c.id} value={c.id}>{c.code || `CH-${c.id}`} — {c.commodity} [{c.stage || 'LOI'}]</option>
          )}
        </select>
      </div>

      {dfSelectedChannel && (
        <div style={{
          background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`,
          borderLeft: `3px solid ${colors.gold}`, padding: 14, marginBottom: 14
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Hash Chain — {dfSelectedChannel.code || `CH-${dfSelectedChannel.id}`}
            </div>
            <button style={s.btn('primary')} onClick={() => verifyAuditChain(dfSelectedChannel.id)}>Verify Chain</button>
          </div>
          {dfAuditChain?.valid === true && (
            <div style={{ fontSize: 11, color: colors.gold }}>
              VERIFIED — {dfAuditChain.length || dfAuditChain.chain?.length || 0} blocks intact
              {dfAuditChain.verified_at && ` · ${new Date(dfAuditChain.verified_at).toLocaleString()}`}
            </div>
          )}
          {dfAuditChain?.valid === false && (
            <div style={{ fontSize: 11, color: colors.statusHot, fontWeight: 600 }}>
              CHAIN BROKEN — block {dfAuditChain.break_at ?? '?'} ({dfAuditChain.reason || 'hash mismatch'})
            </div>
          )}
          {(!dfAuditChain || dfAuditChain.verifying) && (
            <div style={{ fontSize: 11, color: colors.textMuted }}>
              {dfAuditChain?.verifying ? 'Computing chain hash…' : 'Click Verify Chain to recompute'}
            </div>
          )}
        </div>
      )}

      <div style={{ background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Check</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Last Run</th>
              <th style={s.th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {dfComplianceItems.map(item => (
              <tr key={item.id}>
                <td style={s.td}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>{item.check_name || item.name || '—'}</div>
                </td>
                <td style={{ ...s.td, fontSize: 11 }}>{item.category || '—'}</td>
                <td style={s.td}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                    background: item.status === 'pass' ? `${colors.gold}18` : item.status === 'fail' ? `${colors.statusHot}18` : `${colors.silver}18`,
                    color: item.status === 'pass' ? colors.gold : item.status === 'fail' ? colors.statusHot : colors.silver,
                  }}>{(item.status || 'pending').toUpperCase()}</span>
                </td>
                <td style={{ ...s.td, fontSize: 11, color: colors.textMuted }}>
                  {item.last_run_at || item.updated_at ? new Date(item.last_run_at || item.updated_at).toLocaleString() : '—'}
                </td>
                <td style={{ ...s.td, fontSize: 11, color: colors.textSecondary }}>{item.notes || '—'}</td>
              </tr>
            ))}
            {!dfComplianceItems.length && (
              <tr><td colSpan="5" style={{ padding: 30, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>
                {dfSelectedChannel ? 'No compliance checks recorded yet.' : 'Select a channel to view compliance status.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const DealFloorView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, minHeight: '72vh' }}>
      <div style={{ background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, padding: 10, height: 'fit-content' }}>
        <div style={{ ...s.filterLabel, marginBottom: 10 }}>Deal Floor</div>
        {DF_SECTIONS.map(sec => (
          <div key={sec.id} style={s.sideItem(dfSection === sec.id)} onClick={() => setDfSection(sec.id)}>
            <span>{lang === 'ES' ? sec.labelES : sec.label}</span>
            {sec.id === 'channels' && dfChannels.length > 0 && (
              <span style={{ fontSize: 10, color: colors.gold }}>{dfChannels.length}</span>
            )}
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 10, background: colors.slate800, borderRadius: 3, borderLeft: `2px solid ${colors.gold}` }}>
          <div style={{ fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Backend</div>
          <div style={{ fontSize: 11, color: dfStatus?.status === 'ok' || dfStatus?.online ? colors.gold : colors.textMuted, marginTop: 4 }}>
            {dfStatus ? (dfStatus.status || (dfStatus.online ? 'online' : 'unknown')) : 'not loaded'}
          </div>
        </div>
      </div>

      <div>
        {dfLoading && !dfChannels.length ? (
          <div style={{ padding: 50, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>Loading deal floor…</div>
        ) : dfSection === 'deal-rooms' ? <DfDealRoomsView />
          : dfSection === 'channels' ? <DfChannelsView />
          : dfSection === 'dd-review' ? <DfDdReviewView />
          : dfSection === 'po-finance' ? <DfPoFinanceView />
          : dfSection === 'compliance' ? <DfComplianceView />
          : null}
      </div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={s.title}>{L.title}</span>
          <span style={{ ...s.badge, background: colors.gold, color: colors.slate900 }}>{stats.total.toLocaleString()} Records</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={s.tabs}>
            <button style={s.tab(activeView === 'contacts')} onClick={() => setActiveView('contacts')}>{L.contacts}</button>
            <button style={s.tab(activeView === 'pipeline')} onClick={() => setActiveView('pipeline')}>{L.pipeline}</button>
            <button style={s.tab(activeView === 'campaigns')} onClick={() => setActiveView('campaigns')}>{L.campaigns}</button>
            <span style={{ width: 1, background: colors.border, margin: '4px 6px' }} />
            <button style={s.tab(activeView === 'blast')} onClick={() => setActiveView('blast')}>{L.massBlast}</button>
            <button style={s.tab(activeView === 'scraper')} onClick={() => { setActiveView('scraper'); if (!scrapeStats) runScraper(); }}>{L.dbScraper}</button>
            <button style={s.tab(activeView === 'messenger')} onClick={() => setActiveView('messenger')}>{L.messenger}</button>
            <button style={s.tab(activeView === 'inbox')} onClick={() => setActiveView('inbox')}>{L.inbox}</button>
            <span style={{ width: 1, background: colors.border, margin: '4px 6px' }} />
            <button style={s.tab(activeView === 'dealfloor')} onClick={() => { setActiveView('dealfloor'); loadDealFloor(); }}>{lang === 'ES' ? 'PISO DE TRATO' : 'DEAL FLOOR'}</button>
          <button style={s.tab(activeView === 'commodity')} onClick={() => setActiveView('commodity')}>{lang === 'es' ? 'INTEL COMMODITY' : 'COMMODITY INTEL'}</button>
          </div>
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ ...s.select, width: 'auto', padding: '9px 12px' }}>
            <option value="EN">EN</option><option value="ES">ES</option>
          </select>
        </div>
      </div>

      <div style={s.content}>
        {activeView !== 'dealfloor' && <Sidebar />}
        <div style={s.main}>
          {activeView !== 'dealfloor' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder={L.search} value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setCurrentPage(1); }} style={{ ...s.input, flex: 1, minWidth: '240px' }} />
            <select value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))} style={s.select}>
              <option value="all">{L.allStates}</option>
              {states.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
            {selectedContacts.length > 0 && (
              <>
                <span style={{ color: colors.gold, fontWeight: '600', fontSize: '12px' }}>{selectedContacts.length} {L.selected}</span>
                <button style={s.btn('primary')} onClick={() => setShowModal('bulk')}>{L.actions}</button>
                <button style={s.btn()} onClick={() => setSelectedContacts([])}>Clear</button>
              </>
            )}
            <button style={s.btn()} onClick={loadData}>{L.refresh}</button>
          </div>
          )}

          {activeView !== 'dealfloor' && (
          <div style={{ marginBottom: '12px', fontSize: '12px', color: colors.textMuted }}>
            {L.showing} <span style={{ color: colors.platinum, fontWeight: '600' }}>{Math.min(filteredContacts.length, pageSize * currentPage).toLocaleString()}</span> {L.of} <span style={{ color: colors.platinum, fontWeight: '600' }}>{filteredContacts.length.toLocaleString()}</span> records
          </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: colors.textMuted }}>Loading...</div>
          ) : activeView === 'contacts' ? (
            <ContactTable />
          ) : activeView === 'pipeline' ? (
            <PipelineView />
          ) : activeView === 'campaigns' ? (
            <div style={{ background: colors.card, borderRadius: '4px', padding: '24px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '18px', color: colors.platinum, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Email Marketing Campaigns</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {campaigns.map(camp => (
                  <div key={camp.id} style={{ background: colors.slate800, borderRadius: '4px', padding: '18px', border: `1px solid ${colors.border}`, cursor: 'pointer', borderLeft: `3px solid ${colors.gold}` }} onClick={() => { setFilters(f => ({ ...f, campaign: camp.id })); setActiveView('contacts'); }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: colors.textPrimary }}>{camp.name.replace(/^[^\s]+\s/, '')}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: colors.gold, letterSpacing: '-0.5px' }}>{(stats.byCampaign[camp.id] || camp.contact_count || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>Contacts</div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeView === 'blast' ? (
            <BlastView />
          ) : activeView === 'scraper' ? (
            <ScraperView />
          ) : activeView === 'messenger' ? (
            <MessengerView />
          ) : activeView === 'commodity' ? (
            <CommodityIntel lang={lang} embedded={true} />
          ) : activeView === 'inbox' ? (
            <InboxView />
          ) : activeView === 'dealfloor' ? (
            <DealFloorView />
          ) : null}
        </div>
      </div>

      {showModal === 'email' && selectedContact && <EmailModal />}
      {showModal === 'calendar' && selectedContact && <CalendarModal />}
      {showModal === 'campaign' && selectedContact && <CampaignModal />}
      {showModal === 'bulk' && <BulkModal />}
    </div>
  );
};

export default UnifiedCRM;