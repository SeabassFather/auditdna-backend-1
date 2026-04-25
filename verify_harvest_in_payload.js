// C:\AuditDNA\frontend\src\modules\FactorMatchmaker.jsx
// Sprint C Phase 3 — Factor Matchmaker UI
// Wired to: /api/factor/score, /api/factor/draft, /api/factor/send,
//           /api/factor/agreements, /api/factor/deal/:id/documents
// Brain pings: FACTOR_SCORE / FACTOR_DRAFT / FACTOR_APPROVE / FACTOR_SEND / FACTOR_SKIP
// Palette: Candy Shop (Apr 24 2026 standard). ZERO NMLS. ZERO PACA. ZERO dark bg.

import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5050';

// ====== CANDY SHOP PALETTE ======
const C = {
  bg:          '#f5f8fc',
  panel:       '#d8dde5',
  panelDark:   '#cdd5dd',
  text:        '#1e293b',
  textMuted:   '#475569',
  statusBg:    '#c6e6b4',
  statusText:  '#3f6318',
  dataBg:      '#b8d5f0',
  dataText:    '#1e3a8a',
  primaryBg:   '#ffc89a',
  primaryText: '#7c2d12',
  warnBg:      '#fde68a',
  warnText:    '#78350f',
  errorBg:     '#fecaca',
  errorText:   '#7f1d1d',
  border:      '#cbd5e1'
};

// ====== BRAIN PING HELPER (module-local since App.js pingBrain is not globally exposed) ======
const pingBrain = (type, payload) => {
  try {
    fetch(`${API}/api/brain/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('auditdna_jwt') ? { Authorization: 'Bearer ' + localStorage.getItem('auditdna_jwt') } : {}) },
      body: JSON.stringify({ events: [{ type, payload, timestamp: Date.now(), module: 'FactorMatchmaker' }] })
    }).catch(() => {});
  } catch {}
};

// ====== AUTH HEADER BUILDER ======
const authHdr = () => {
  const t = localStorage.getItem('auditdna_jwt');
  return t ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t } : { 'Content-Type': 'application/json' };
};

// ====== STYLE HELPERS ======
const S = {
  container: { padding: 24, background: C.bg, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh' },
  header: { marginBottom: 24 },
  h1: { margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' },
  subtitle: { marginTop: 6, fontSize: 13, color: C.textMuted },
  panel: { background: C.panel, border: `1px solid ${C.border}`, padding: 16, marginBottom: 14 },
  panelDark: { background: C.panelDark, border: `1px solid ${C.border}`, padding: 16, marginBottom: 14 },
  label: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' },
  chip: (bg, fg) => ({ display: 'inline-block', background: bg, color: fg, padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 0, marginRight: 6 }),
  btn: (variant = 'default') => {
    const base = { padding: '9px 16px', fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 6, marginBottom: 4 };
    if (variant === 'primary') return { ...base, background: C.primaryBg, color: C.primaryText };
    if (variant === 'data')    return { ...base, background: C.dataBg, color: C.dataText };
    if (variant === 'status')  return { ...base, background: C.statusBg, color: C.statusText };
    if (variant === 'warn')    return { ...base, background: C.warnBg, color: C.warnText };
    if (variant === 'error')   return { ...base, background: C.errorBg, color: C.errorText };
    return { ...base, background: '#fff', color: C.text };
  },
  kvRow: { display: 'flex', gap: 12, padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 },
  kvKey: { color: C.textMuted, minWidth: 160, fontWeight: 600 },
  kvVal: { color: C.text, flex: 1 }
};

// ====== MAIN COMPONENT ======
const FactorMatchmaker = () => {
  const [dealId, setDealId] = useState(1);
  const [scoring, setScoring] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [drafts, setDrafts] = useState({});           // { partner_id: draft }
  const [busy, setBusy] = useState({ score: false, draft: {}, send: {} });
  const [log, setLog] = useState([]);
  const [tab, setTab] = useState('score');

  // ====== LOGGING ======
  const pushLog = (level, msg) => {
    setLog(prev => [{ ts: new Date().toLocaleTimeString(), level, msg }, ...prev].slice(0, 50));
  };

  // ====== LOAD AGREEMENTS ON MOUNT ======
  useEffect(() => {
    loadAgreements();
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const loadAgreements = async () => {
    try {
      const r = await fetch(`${API}/api/factor/agreements`, { headers: authHdr() });
      if (!r.ok) { pushLog('warn', `agreements HTTP ${r.status}`); return; }
      const j = await r.json();
      setAgreements(j.agreements || j || []);
      pushLog('info', `loaded ${(j.agreements || j || []).length} partner agreements`);
    } catch (e) { pushLog('error', 'agreements fetch failed: ' + e.message); }
  };

  const loadDocuments = async () => {
    try {
      const r = await fetch(`${API}/api/factor/deal/${dealId}/documents`, { headers: authHdr() });
      if (!r.ok) { if (r.status !== 404) pushLog('warn', `documents HTTP ${r.status}`); return; }
      const j = await r.json();
      setDocuments(j.documents || j || []);
    } catch (e) { pushLog('error', 'documents fetch failed: ' + e.message); }
  };

  // ====== SCORE DEAL ======
  const doScore = async () => {
    setBusy(b => ({ ...b, score: true }));
    setScoring(null);
    pushLog('info', `scoring deal #${dealId} — calling Claude Opus 4.7...`);
    pingBrain('FACTOR_SCORE_REQUESTED', { deal_id: dealId });

    try {
      const r = await fetch(`${API}/api/factor/score/${dealId}`, { method: 'POST', headers: authHdr() });
      if (!r.ok) {
        const err = await r.text();
        pushLog('error', `score failed ${r.status}: ${err}`);
        pingBrain('FACTOR_SCORE_FAILED', { deal_id: dealId, status: r.status });
        return;
      }
      const j = await r.json();
      setScoring(j.scoring || j);
      pushLog('status', `scored: primary=${(j.scoring || j).primary_recommendation?.partner_id} (score ${(j.scoring || j).primary_recommendation?.score}), auction pool=${((j.scoring || j).auction_pool || []).length}`);
      pingBrain('FACTOR_SCORE_COMPLETE', { deal_id: dealId, primary: (j.scoring || j).primary_recommendation, pool_size: ((j.scoring || j).auction_pool || []).length });
    } catch (e) {
      pushLog('error', 'score exception: ' + e.message);
    } finally {
      setBusy(b => ({ ...b, score: false }));
    }
  };

  // ====== DRAFT A PARTNER ======
  const doDraft = async (partner_id) => {
    setBusy(b => ({ ...b, draft: { ...b.draft, [partner_id]: true } }));
    pushLog('info', `drafting ${partner_id}...`);
    pingBrain('FACTOR_DRAFT_REQUESTED', { deal_id: dealId, partner_id });

    try {
      const r = await fetch(`${API}/api/factor/draft`, {
        method: 'POST',
        headers: authHdr(),
        body: JSON.stringify({ deal_id: dealId, partner_id })
      });
      if (!r.ok) {
        const err = await r.text();
        pushLog('error', `draft ${partner_id} failed ${r.status}: ${err.substring(0, 200)}`);
        return;
      }
      const j = await r.json();
      const draft = j.draft || j;
      setDrafts(d => ({ ...d, [partner_id]: draft }));
      pushLog('status', `${partner_id} drafted: ${draft.outreach_type} | harvest=${draft.harvest_window_used || 'n/a'}`);
      pingBrain('FACTOR_DRAFT_GENERATED', { deal_id: dealId, partner_id, outreach_type: draft.outreach_type, harvest_window: draft.harvest_window_used });
    } catch (e) {
      pushLog('error', `draft ${partner_id} exception: ${e.message}`);
    } finally {
      setBusy(b => ({ ...b, draft: { ...b.draft, [partner_id]: false } }));
    }
  };

  // ====== APPROVE (REAL SEND) ======
  const doApprove = async (partner_id) => {
    const draft = drafts[partner_id];
    if (!draft) { pushLog('warn', `no draft for ${partner_id} — click DRAFT first`); return; }

    const confirmed = window.confirm(
      `SEND REAL OUTREACH to ${partner_id}?\n\n` +
      `This will email the partner directly, attach NDA/Commission docs, write audit trail, and fire ntfy push.\n\n` +
      `Subject: ${draft.subject}\n\nProceed?`
    );
    if (!confirmed) { pushLog('info', `approve ${partner_id} canceled by user`); return; }

    setBusy(b => ({ ...b, send: { ...b.send, [partner_id]: true } }));
    pushLog('info', `SENDING real outreach to ${partner_id}...`);
    pingBrain('FACTOR_APPROVE_CLICKED', { deal_id: dealId, partner_id });

    try {
      const r = await fetch(`${API}/api/factor/send`, {
        method: 'POST',
        headers: authHdr(),
        body: JSON.stringify({ deal_id: dealId, partner_id, dryRun: false })
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        pushLog('error', `send ${partner_id} failed: ${j.error || r.status}`);
        pingBrain('FACTOR_SEND_FAILED', { deal_id: dealId, partner_id, error: j.error });
        return;
      }
      pushLog('status', `SENT ${partner_id} | message_id=${j.result?.message_id || j.message_id} | doc_id=${j.result?.document_id || j.document_id}`);
      pingBrain('FACTOR_SEND_EXECUTED', { deal_id: dealId, partner_id, message_id: j.result?.message_id || j.message_id, document_id: j.result?.document_id || j.document_id });
      loadAgreements();
      loadDocuments();
    } catch (e) {
      pushLog('error', `send ${partner_id} exception: ${e.message}`);
    } finally {
      setBusy(b => ({ ...b, send: { ...b.send, [partner_id]: false } }));
    }
  };

  // ====== SKIP (audit only, no send) ======
  const doSkip = (partner_id) => {
    pushLog('info', `SKIPPED ${partner_id} — moving waterfall forward`);
    pingBrain('FACTOR_SKIP_CLICKED', { deal_id: dealId, partner_id });
    setDrafts(d => { const n = { ...d }; delete n[partner_id]; return n; });
  };

  // ====== VIEW DRAFT ======
  const doView = (partner_id) => {
    const draft = drafts[partner_id];
    if (!draft) { doDraft(partner_id); return; }
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { pushLog('warn', 'popup blocked — allow popups for draft preview'); return; }
    w.document.write(`<html><head><title>${draft.subject}</title><style>body{font-family:-apple-system,sans-serif;padding:30px;background:#f5f8fc;color:#1e293b;max-width:700px;margin:0 auto;line-height:1.6}h2{border-bottom:2px solid #ffc89a;padding-bottom:10px}pre{white-space:pre-wrap;background:#d8dde5;padding:20px;border-left:4px solid #ffc89a}</style></head><body><h2>${draft.subject}</h2><p><strong>Outreach type:</strong> ${draft.outreach_type}<br><strong>Harvest window:</strong> ${draft.harvest_window_used || 'n/a'}<br><strong>Invoice bucket:</strong> ${draft.invoice_bucket_used || 'n/a'}</p><pre>${(draft.body_text || '').replace(/</g, '&lt;')}</pre></body></html>`);
    pingBrain('FACTOR_DRAFT_VIEWED', { deal_id: dealId, partner_id });
  };

  // ====== RENDER HELPERS ======
  const renderPartnerCard = (p, rankLabel) => {
    const partner_id = p.partner_id;
    const draft = drafts[partner_id];
    const agree = agreements.find(a => a.partner_id === partner_id);
    const isDrafting = busy.draft[partner_id];
    const isSending = busy.send[partner_id];

    return (
      <div key={partner_id} style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={S.label}>{rankLabel}</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{partner_id}</div>
          </div>
          <div>
            <span style={S.chip(C.dataBg, C.dataText)}>score {p.score}</span>
            <span style={S.chip(C.statusBg, C.statusText)}>{p.outreach_type}</span>
          </div>
        </div>

        {p.reason && (
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, fontStyle: 'italic', lineHeight: 1.5 }}>
            {p.reason}
          </div>
        )}

        {agree && (
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
            NDA: <strong style={{ color: agree.nda_status === 'SIGNED' ? C.statusText : agree.nda_status === 'SENT' ? C.warnText : C.textMuted }}>{agree.nda_status || 'NOT_SENT'}</strong>
            {' | '}Commission: <strong style={{ color: agree.commission_status === 'SIGNED' ? C.statusText : agree.commission_status === 'SENT' ? C.warnText : C.textMuted }}>{agree.commission_status || 'NOT_SENT'}</strong>
            {agree.exempt && <span style={{ ...S.chip(C.statusBg, C.statusText), marginLeft: 8 }}>EXEMPT</span>}
          </div>
        )}

        {draft && (
          <div style={{ fontSize: 12, background: C.panelDark, padding: 10, marginBottom: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{draft.subject}</div>
            <div style={{ color: C.textMuted, fontSize: 11 }}>Harvest: {draft.harvest_window_used} | Bucket: {draft.invoice_bucket_used}</div>
          </div>
        )}

        <div>
          <button style={S.btn('data')} onClick={() => doView(partner_id)} disabled={isDrafting}>
            {draft ? 'VIEW DRAFT' : (isDrafting ? 'DRAFTING...' : 'DRAFT + VIEW')}
          </button>
          {draft && (
            <>
              <button style={S.btn('primary')} onClick={() => doApprove(partner_id)} disabled={isSending}>
                {isSending ? 'SENDING...' : 'APPROVE & SEND'}
              </button>
              <button style={S.btn('warn')} onClick={() => doSkip(partner_id)}>SKIP</button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ====== RENDER ======
  const auctionPool = scoring?.auction_pool || [];
  const rejected = scoring?.rejected_partners || [];

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.label}>FACTOR MATCHMAKER — SPRINT C PHASE 3</div>
        <h1 style={S.h1}>Factoring Waterfall Cockpit</h1>
        <div style={S.subtitle}>
          Claude Opus 4.7 ranked deal flow | 10-partner waterfall | Document-gated outreach | Live ntfy push
        </div>
      </div>

      {/* Deal selector + score */}
      <div style={S.panelDark}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={S.label}>Deal ID</div>
            <input
              type="number"
              value={dealId}
              onChange={e => setDealId(parseInt(e.target.value) || 1)}
              style={{ padding: '6px 10px', border: `1px solid ${C.border}`, fontSize: 14, width: 80, background: '#fff', color: C.text }}
            />
          </div>
          <button style={S.btn('primary')} onClick={doScore} disabled={busy.score}>
            {busy.score ? 'SCORING CLAUDE OPUS 4.7 (~22s)...' : 'SCORE DEAL'}
          </button>
          <button style={S.btn('data')} onClick={loadAgreements}>RELOAD AGREEMENTS</button>
          <button style={S.btn('data')} onClick={loadDocuments}>RELOAD DOCUMENTS</button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {['score', 'agreements', 'documents', 'log'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...S.btn(tab === t ? 'primary' : 'default'),
              margin: 0
            }}
          >
            {t === 'score' ? 'WATERFALL' : t === 'agreements' ? `AGREEMENTS (${agreements.length})` : t === 'documents' ? `DOCUMENTS (${documents.length})` : `LOG (${log.length})`}
          </button>
        ))}
      </div>

      {/* TAB: WATERFALL */}
      {tab === 'score' && (
        <>
          {!scoring && (
            <div style={{ ...S.panel, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 14, color: C.textMuted }}>
                No scoring yet. Click <strong>SCORE DEAL</strong> above to invoke Claude Opus 4.7.
              </div>
            </div>
          )}

          {scoring?.deal_summary && (
            <div style={{ ...S.panel, background: C.dataBg }}>
              <div style={{ ...S.label, color: C.dataText }}>DEAL SUMMARY</div>
              <div style={{ color: C.dataText, fontSize: 13, marginTop: 4 }}>{scoring.deal_summary}</div>
            </div>
          )}

          {scoring?.primary_recommendation && (
            <>
              <div style={S.label}>Primary Recommendation (waterfall position #1 — 24h exclusive)</div>
              {renderPartnerCard(scoring.primary_recommendation, 'PRIMARY — FIRST SENDER')}
            </>
          )}

          {auctionPool.length > 0 && (
            <>
              <div style={{ ...S.label, marginTop: 20 }}>Auction Pool (opens after primary's exclusive window)</div>
              {auctionPool.map((p, i) => renderPartnerCard(p, `AUCTION #${i + 1}`))}
            </>
          )}

          {rejected.length > 0 && (
            <>
              <div style={{ ...S.label, marginTop: 20, color: C.errorText }}>Rejected ({rejected.length})</div>
              {rejected.map(p => (
                <div key={p.partner_id} style={{ ...S.panel, background: C.errorBg, borderColor: C.errorText }}>
                  <div style={{ fontWeight: 700, color: C.errorText }}>{p.partner_id}</div>
                  <div style={{ fontSize: 12, color: C.errorText }}>{p.reason}</div>
                </div>
              ))}
            </>
          )}

          {scoring?.notes && (
            <div style={{ ...S.panel, background: C.warnBg }}>
              <div style={{ ...S.label, color: C.warnText }}>Claude Notes</div>
              <div style={{ color: C.warnText, fontSize: 12, marginTop: 4 }}>{scoring.notes}</div>
            </div>
          )}
        </>
      )}

      {/* TAB: AGREEMENTS */}
      {tab === 'agreements' && (
        <div style={S.panel}>
          <div style={{ ...S.label, marginBottom: 12 }}>Partner Agreement Status (across all 10 partners)</div>
          {agreements.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>No agreements loaded. Click RELOAD AGREEMENTS.</div>
          ) : agreements.map(a => (
            <div key={a.partner_id} style={S.kvRow}>
              <span style={S.kvKey}>{a.partner_id}</span>
              <span style={S.kvVal}>
                NDA: <span style={S.chip(a.nda_status === 'SIGNED' ? C.statusBg : a.nda_status === 'SENT' ? C.warnBg : C.panel, a.nda_status === 'SIGNED' ? C.statusText : a.nda_status === 'SENT' ? C.warnText : C.textMuted)}>{a.nda_status || 'NOT_SENT'}</span>
                {' '}
                Comm: <span style={S.chip(a.commission_status === 'SIGNED' ? C.statusBg : a.commission_status === 'SENT' ? C.warnBg : C.panel, a.commission_status === 'SIGNED' ? C.statusText : a.commission_status === 'SENT' ? C.warnText : C.textMuted)}>{a.commission_status || 'NOT_SENT'}</span>
                {a.exempt && <span style={S.chip(C.statusBg, C.statusText)}>EXEMPT</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TAB: DOCUMENTS */}
      {tab === 'documents' && (
        <div style={S.panel}>
          <div style={{ ...S.label, marginBottom: 12 }}>Deal #{dealId} — Documents Audit Trail</div>
          {documents.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>No documents for this deal yet.</div>
          ) : documents.map(d => (
            <div key={d.id || (d.partner_id + d.doc_type)} style={{ ...S.panel, background: C.panelDark, margin: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{d.partner_id} — {d.doc_type}</span>
                <span style={S.chip(d.status === 'SIGNED' ? C.statusBg : C.warnBg, d.status === 'SIGNED' ? C.statusText : C.warnText)}>{d.status}</span>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                Sent: {d.sent_at ? new Date(d.sent_at).toLocaleString() : '—'}
                {d.expires_at && ` | Expires: ${new Date(d.expires_at).toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: LOG */}
      {tab === 'log' && (
        <div style={S.panel}>
          <div style={{ ...S.label, marginBottom: 12 }}>Activity Log (this session)</div>
          {log.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>No activity yet.</div>
          ) : log.map((e, i) => (
            <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${C.border}`, fontFamily: 'monospace' }}>
              <span style={{ color: C.textMuted }}>{e.ts}</span>
              <span style={{ ...S.chip(
                e.level === 'status' ? C.statusBg : e.level === 'warn' ? C.warnBg : e.level === 'error' ? C.errorBg : C.dataBg,
                e.level === 'status' ? C.statusText : e.level === 'warn' ? C.warnText : e.level === 'error' ? C.errorText : C.dataText
              ), marginLeft: 8, fontSize: 9 }}>{e.level}</span>
              <span style={{ marginLeft: 8, color: C.text }}>{e.msg}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 30, textAlign: 'center', fontSize: 10, color: C.textMuted }}>
        Factor Matchmaker wired to /api/factor/* | Claude Opus 4.7 scoring | Miners: FE-030, CW-026, IA-027, CA-028, MC-029, YP-023
      </div>
    </div>
  );
};

export default FactorMatchmaker;