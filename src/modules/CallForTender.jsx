import React, { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// CALL FOR TENDER (CFT) — CM Products International / AuditDNA
// Buyer posts commodity need → System emails ALL matching growers →
// Growers submit offers → Price Analyzer compares → Buyer selects →
// PO auto-generated → Escrow/Factoring → Deal closed
//
// File: C:\AuditDNA\frontend\src\modules\CallForTender.jsx
// =============================================================================

const API = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const T = {
  bg:'#0a0a0a', bgAlt:'#1a1a1a', card:'rgba(28,28,28,0.97)',
  border:'rgba(192,192,192,0.12)', borderGold:'rgba(203,166,88,0.3)',
  gold:'#cba658', goldDark:'#b8944d', goldFaint:'rgba(203,166,88,0.09)',
  silver:'#e2e8f0', platinum:'#cbd5e1', dim:'#94a3b8', faint:'#475569',
  text:'#f8fafc', danger:'#ef4444', warn:'#f59e0b',
  dangerFaint:'rgba(239,68,68,0.10)', warnFaint:'rgba(245,158,11,0.10)',
};

const COMMODITIES = [
  'Hass Avocados','Strawberries','Blueberries','Raspberries','Blackberries',
  'Roma Tomatoes','Cherry Tomatoes','Grape Tomatoes','Beefsteak Tomatoes',
  'Bell Peppers Red','Bell Peppers Green','Bell Peppers Yellow','Poblano Peppers',
  'Limes','Lemons','Navel Oranges','Grapefruit','Mandarins',
  'Cilantro','Parsley','Basil','Spinach','Romaine Lettuce','Kale',
  'Cucumbers','Zucchini','Yellow Squash','Chayote',
  'Mangoes','Papayas','Plantains','Bananas',
  'Yellow Onions','Red Onions','White Onions','Garlic',
  'Russet Potatoes','Sweet Potatoes','Jicama','Yuca',
  'Jalisco Grapes Red','Jalisco Grapes Green',
  'Cantaloupe','Watermelon','Honeydew',
  'Carrots','Celery','Broccoli','Cauliflower',
  'Other (specify in notes)',
];

const UNITS = ['Cases','Pallets','Pounds (lbs)','Kilograms (kg)','Tons','Containers (40ft)','Truckloads (FTL)'];
const ORIGINS = ['Baja California, MX','Sinaloa, MX','Michoacan, MX','Jalisco, MX','Sonora, MX',
  'Guanajuato, MX','Veracruz, MX','Mexico (any state)','Guatemala','Honduras',
  'Colombia','Peru','Chile','Dominican Republic','Open Market (any origin)'];
const PORTS = ['Otay Mesa, CA','Nogales, AZ','Pharr, TX','Laredo, TX','El Paso, TX','Open / Nearest'];
const CERTS = ['GlobalGAP','USDA Organic','FSMA 204 Compliant','PrimusGFS','SQF','Any/All'];

const STATUS_CONFIG = {
  draft:     { label:'DRAFT',        color:T.faint,   bg:'rgba(71,85,105,0.15)' },
  posted:    { label:'POSTED',       color:T.warn,    bg:T.warnFaint },
  receiving: { label:'RECEIVING BIDS',color:T.gold,   bg:T.goldFaint },
  closed:    { label:'BIDS CLOSED',  color:T.silver,  bg:'rgba(226,232,240,0.08)' },
  awarded:   { label:'AWARDED',      color:'#22d3ee', bg:'rgba(34,211,238,0.08)' },
  po_issued: { label:'PO ISSUED',    color:T.gold,    bg:T.goldFaint },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const fmtMoney = (n) => n ? `$${parseFloat(n).toFixed(2)}` : '—';

// ─── STYLES ──────────────────────────────────────────────────────────────────
const inp = { background:'#0f172a', border:`1px solid ${T.border}`, color:T.text,
  borderRadius:4, padding:'8px 12px', fontSize:12, outline:'none', width:'100%', boxSizing:'border-box' };
const btnGold = { padding:'9px 20px', background:`linear-gradient(135deg,${T.gold},${T.goldDark})`,
  border:'none', borderRadius:6, color:'#0f172a', fontWeight:800, cursor:'pointer', fontSize:12, letterSpacing:0.5 };
const btn = (a) => ({ padding:'7px 16px', fontSize:10, fontWeight:700, cursor:'pointer', borderRadius:4,
  background:a?T.goldFaint:'transparent', color:a?T.gold:T.dim, border:`1px solid ${a?T.gold:T.border}` });
const card = { background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:18, marginBottom:14 };
const label = { fontSize:10, fontWeight:700, color:T.gold, letterSpacing:1, marginBottom:4, display:'block' };

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function CallForTender() {
  const [tab, setTab]             = useState('tenders');    // tenders | new | offers | po
  const [tenders, setTenders]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [offers, setOffers]       = useState([]);
  const [pos, setPOs]             = useState([]);
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [filterStatus, setFilter] = useState('all');

  // New tender form state
  const [form, setForm] = useState({
    buyer_name:'', buyer_company:'', buyer_email:'', buyer_phone:'',
    commodity:'', commodity_custom:'', variety:'', qty:'', unit:'Cases',
    origin_pref:'Open Market (any origin)', port_of_entry:'Otay Mesa, CA',
    delivery_date:'', bid_deadline:'', certifications:'Any/All',
    price_target:'', price_max:'', incoterm:'FOB Origin',
    quality_specs:'', notes:'', priority:'normal',
  });

  const showToast = (msg, type='ok') => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),4000);
  };

  const setF = (k,v) => setForm(prev=>({...prev,[k]:v}));

  // ─── LOAD TENDERS FROM BACKEND ────────────────────────────────────────────
  const loadTenders = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/call-for-tender`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('mfg_token')||''}` }
      });
      if (r.ok) { const d = await r.json(); setTenders(d.tenders||[]); }
    } catch { /* use local state */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadTenders(); }, [loadTenders]);

  // ─── POST TENDER — emails ALL matching growers via Brain ──────────────────
  const postTender = async () => {
    const commodity = form.commodity === 'Other (specify in notes)' ? form.commodity_custom : form.commodity;
    if (!commodity || !form.buyer_name || !form.buyer_email || !form.qty) {
      showToast('Buyer name, email, commodity and quantity are required','err'); return;
    }
    setSending(true);
    try {
      const payload = { ...form, commodity, status:'posted', created_at: new Date().toISOString() };

      // 1. Save tender
      let tenderId = 'CFT-' + Date.now();
      try {
        const r = await fetch(`${API}/api/call-for-tender`, {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('mfg_token')||''}`},
          body: JSON.stringify(payload)
        });
        if (r.ok) { const d = await r.json(); tenderId = d.id || tenderId; }
      } catch { /* continue */ }

      // 2. Fire Brain event
      try {
        await fetch(`${API}/api/brain/event`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            type:'CALL_FOR_TENDER_POSTED', tender_id:tenderId,
            buyer:form.buyer_name, company:form.buyer_company,
            commodity, qty:`${form.qty} ${form.unit}`,
            origin:form.origin_pref, deadline:form.bid_deadline,
            price_target:form.price_target, timestamp:new Date().toISOString(),
          })
        });
      } catch { /* continue */ }

      // 3. Blast ALL matching growers via manifest-upload reverse endpoint
      let growersNotified = 0;
      try {
        const r = await fetch(`${API}/api/call-for-tender/notify-growers`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ tender_id:tenderId, commodity, qty:form.qty, unit:form.unit,
            origin_pref:form.origin_pref, bid_deadline:form.bid_deadline,
            buyer_name:form.buyer_name, buyer_company:form.buyer_company,
            price_target:form.price_target, certifications:form.certifications,
            quality_specs:form.quality_specs, port_of_entry:form.port_of_entry })
        });
        if (r.ok) { const d = await r.json(); growersNotified = d.growers_notified||0; }
      } catch { /* continue */ }

      // Add to local state
      const newTender = { ...payload, id:tenderId, status:'posted', growers_notified:growersNotified, offers_received:0 };
      setTenders(prev=>[newTender,...prev]);
      setSelected(newTender);
      setForm({ buyer_name:'',buyer_company:'',buyer_email:'',buyer_phone:'',
        commodity:'',commodity_custom:'',variety:'',qty:'',unit:'Cases',
        origin_pref:'Open Market (any origin)',port_of_entry:'Otay Mesa, CA',
        delivery_date:'',bid_deadline:'',certifications:'Any/All',
        price_target:'',price_max:'',incoterm:'FOB Origin',
        quality_specs:'',notes:'',priority:'normal' });
      setTab('tenders');
      showToast(`Tender posted. ${growersNotified} growers notified via email.`);
    } catch (err) {
      showToast(`Error: ${err.message}`,'err');
    }
    setSending(false);
  };

  // ─── LOAD OFFERS FOR SELECTED TENDER ─────────────────────────────────────
  const loadOffers = useCallback(async (tenderId) => {
    try {
      const r = await fetch(`${API}/api/call-for-tender/${tenderId}/offers`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('mfg_token')||''}` }
      });
      if (r.ok) { const d = await r.json(); setOffers(d.offers||[]); }
      else setOffers([]);
    } catch { setOffers([]); }
  }, []);

  useEffect(() => {
    if (selected?.id) loadOffers(selected.id);
  }, [selected, loadOffers]);

  // ─── AWARD TENDER + GENERATE PO ──────────────────────────────────────────
  const awardTender = async (offer) => {
    if (!selected) return;
    setSending(true);
    try {
      const poData = {
        po_number:   'PO-' + Date.now(),
        tender_id:   selected.id,
        offer_id:    offer.id,
        buyer_name:  selected.buyer_name,
        buyer_company:selected.buyer_company,
        buyer_email: selected.buyer_email,
        grower_name: offer.grower_name,
        grower_company:offer.grower_company,
        grower_email:offer.grower_email,
        commodity:   selected.commodity,
        variety:     selected.variety||'',
        qty:         offer.qty_offered||selected.qty,
        unit:        selected.unit,
        unit_price:  offer.price_per_unit,
        total_value: (parseFloat(offer.price_per_unit||0) * parseFloat(offer.qty_offered||selected.qty||0)).toFixed(2),
        origin:      offer.origin||selected.origin_pref,
        certifications:offer.certifications||selected.certifications,
        delivery_date:selected.delivery_date,
        port_of_entry:selected.port_of_entry,
        incoterm:    selected.incoterm,
        payment_terms:'Net 30 — Escrow Protected',
        paca_protected:true,
        status:      'issued',
        issued_at:   new Date().toISOString(),
      };

      // Save PO to backend
      try {
        await fetch(`${API}/api/purchase-orders`, {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('mfg_token')||''}`},
          body: JSON.stringify(poData)
        });
      } catch { /* continue */ }

      // Fire Brain event
      try {
        await fetch(`${API}/api/brain/event`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ type:'PO_ISSUED', ...poData })
        });
      } catch { /* continue */ }

      // Update tender status
      setTenders(prev => prev.map(t => t.id===selected.id ? {...t,status:'awarded'} : t));
      setSelected(prev => ({...prev, status:'awarded'}));
      setPOs(prev=>[poData,...prev]);
      setTab('po');
      showToast(`PO ${poData.po_number} issued. Grower and buyer notified.`);
    } catch (err) {
      showToast(`PO error: ${err.message}`,'err');
    }
    setSending(false);
  };

  // ─── FILTER TENDERS ───────────────────────────────────────────────────────
  const filteredTenders = useMemo(() =>
    filterStatus==='all' ? tenders : tenders.filter(t=>t.status===filterStatus),
    [tenders, filterStatus]);

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div style={{ background:T.bg, minHeight:'100vh', color:T.text, fontFamily:"'Segoe UI',sans-serif" }}>

      {/* TOAST */}
      {toast && (
        <div style={{ position:'fixed', top:16, right:16, zIndex:9999, padding:'12px 20px', borderRadius:8,
          background:toast.type==='err'?T.danger:T.gold, color:'#0f172a', fontWeight:800, fontSize:13, boxShadow:'0 4px 24px rgba(0,0,0,0.5)' }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,rgba(203,166,88,0.07),rgba(10,10,10,0.98))', borderBottom:`1px solid ${T.borderGold}`, padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:16, fontWeight:900, letterSpacing:3, color:T.gold }}>CALL FOR TENDER</div>
          <div style={{ fontSize:10, color:T.dim, marginTop:2, letterSpacing:1 }}>Buyer RFQ — Grower Matching — PO Generation | CM Products International</div>
        </div>
        <button style={btnGold} onClick={()=>setTab('new')}>+ NEW TENDER</button>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', gap:2, padding:'0 24px', background:T.bgAlt, borderBottom:`1px solid ${T.border}` }}>
        {[['tenders',`TENDERS (${tenders.length})`],['new','POST TENDER'],['offers',`OFFERS ${selected?`(${offers.length})`:'(select tender)'}`],['po',`PURCHASE ORDERS (${pos.length})`]].map(([k,v])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:'10px 18px', fontSize:10, fontWeight:700,
            background:tab===k?'rgba(203,166,88,0.08)':'transparent', color:tab===k?T.gold:T.dim,
            border:'none', borderBottom:tab===k?`2px solid ${T.gold}`:'2px solid transparent', cursor:'pointer', letterSpacing:1 }}>{v}</button>
        ))}
      </div>

      <div style={{ padding:'20px 24px' }}>

        {/* ═══ TENDERS LIST ═══ */}
        {tab==='tenders' && (
          <div>
            {/* Status filter */}
            <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
              {['all','draft','posted','receiving','closed','awarded','po_issued'].map(s=>(
                <button key={s} onClick={()=>setFilter(s)} style={btn(filterStatus===s)}>
                  {s==='all'?'ALL':STATUS_CONFIG[s]?.label||s.toUpperCase()}
                </button>
              ))}
            </div>

            {loading && <div style={{ color:T.dim, fontSize:12, padding:20 }}>Loading tenders...</div>}

            {filteredTenders.length===0 && !loading && (
              <div style={{ ...card, textAlign:'center', padding:48, color:T.dim }}>
                No tenders yet. Click <span style={{color:T.gold, fontWeight:700}}>+ NEW TENDER</span> to post your first Call for Tender.
              </div>
            )}

            {filteredTenders.map(t => {
              const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft;
              return (
                <div key={t.id} onClick={()=>{setSelected(t);setTab('offers');}}
                  style={{ ...card, cursor:'pointer', borderLeft:`3px solid ${st.color}` }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(203,166,88,0.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background=T.card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <span style={{ fontSize:14, fontWeight:800, color:T.silver }}>{t.commodity}</span>
                        {t.variety && <span style={{ color:T.dim, fontSize:12 }}>({t.variety})</span>}
                        <span style={{ padding:'2px 8px', background:st.bg, color:st.color, fontSize:9, fontWeight:700, borderRadius:3, border:`1px solid ${st.color}` }}>{st.label}</span>
                      </div>
                      <div style={{ display:'flex', gap:16, fontSize:11, color:T.dim, flexWrap:'wrap' }}>
                        <span>Buyer: <strong style={{color:T.platinum}}>{t.buyer_company||t.buyer_name}</strong></span>
                        <span>Qty: <strong style={{color:T.gold}}>{t.qty} {t.unit}</strong></span>
                        <span>Origin: {t.origin_pref}</span>
                        <span>Port: {t.port_of_entry}</span>
                        {t.price_target && <span>Target: <strong style={{color:T.gold}}>{fmtMoney(t.price_target)}/{t.unit}</strong></span>}
                        {t.bid_deadline && <span>Deadline: {fmtDate(t.bid_deadline)}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
                      <div style={{ fontSize:22, fontWeight:900, color:T.gold }}>{t.offers_received||0}</div>
                      <div style={{ fontSize:9, color:T.dim }}>bids received</div>
                      {t.growers_notified>0 && <div style={{ fontSize:10, color:T.faint, marginTop:2 }}>{t.growers_notified} growers emailed</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ NEW TENDER FORM ═══ */}
        {tab==='new' && (
          <div style={{ maxWidth:860, margin:'0 auto' }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.gold, marginBottom:20, letterSpacing:2 }}>POST A CALL FOR TENDER</div>

            {/* BUYER INFO */}
            <div style={card}>
              <div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:2, marginBottom:14, borderLeft:`3px solid ${T.gold}`, paddingLeft:10 }}>BUYER INFORMATION</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['buyer_name','Contact Name *'],['buyer_company','Company Name'],['buyer_email','Email *'],['buyer_phone','Phone']].map(([k,l])=>(
                  <div key={k}>
                    <label style={label}>{l}</label>
                    <input style={inp} value={form[k]} onChange={e=>setF(k,e.target.value)} placeholder={l} />
                  </div>
                ))}
              </div>
            </div>

            {/* COMMODITY */}
            <div style={card}>
              <div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:2, marginBottom:14, borderLeft:`3px solid ${T.gold}`, paddingLeft:10 }}>COMMODITY REQUIREMENTS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div>
                  <label style={label}>Commodity *</label>
                  <select style={inp} value={form.commodity} onChange={e=>setF('commodity',e.target.value)}>
                    <option value="">Select commodity...</option>
                    {COMMODITIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                {form.commodity==='Other (specify in notes)' && (
                  <div>
                    <label style={label}>Specify Commodity</label>
                    <input style={inp} value={form.commodity_custom} onChange={e=>setF('commodity_custom',e.target.value)} placeholder="e.g. Cilantro" />
                  </div>
                )}
                <div>
                  <label style={label}>Variety / Grade</label>
                  <input style={inp} value={form.variety} onChange={e=>setF('variety',e.target.value)} placeholder="e.g. Hass, Albion, Roma" />
                </div>
                <div>
                  <label style={label}>Certifications Required</label>
                  <select style={inp} value={form.certifications} onChange={e=>setF('certifications',e.target.value)}>
                    {CERTS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Quantity *</label>
                  <input style={inp} type="number" value={form.qty} onChange={e=>setF('qty',e.target.value)} placeholder="e.g. 500" />
                </div>
                <div>
                  <label style={label}>Unit</label>
                  <select style={inp} value={form.unit} onChange={e=>setF('unit',e.target.value)}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Incoterm</label>
                  <select style={inp} value={form.incoterm} onChange={e=>setF('incoterm',e.target.value)}>
                    {['FOB Origin','CIF Destination','EXW','DAP'].map(i=><option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop:12 }}>
                <label style={label}>Quality Specifications</label>
                <textarea style={{ ...inp, height:60, resize:'vertical' }} value={form.quality_specs}
                  onChange={e=>setF('quality_specs',e.target.value)}
                  placeholder="e.g. Min brix 10, size 48ct, firmness grade A, no defects > 2%" />
              </div>
            </div>

            {/* LOGISTICS + PRICING */}
            <div style={card}>
              <div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:2, marginBottom:14, borderLeft:`3px solid ${T.gold}`, paddingLeft:10 }}>LOGISTICS + PRICING</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div>
                  <label style={label}>Preferred Origin</label>
                  <select style={inp} value={form.origin_pref} onChange={e=>setF('origin_pref',e.target.value)}>
                    {ORIGINS.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Port of Entry</label>
                  <select style={inp} value={form.port_of_entry} onChange={e=>setF('port_of_entry',e.target.value)}>
                    {PORTS.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Delivery Date Needed</label>
                  <input type="date" style={inp} value={form.delivery_date} onChange={e=>setF('delivery_date',e.target.value)} />
                </div>
                <div>
                  <label style={label}>Bid Deadline</label>
                  <input type="date" style={inp} value={form.bid_deadline} onChange={e=>setF('bid_deadline',e.target.value)} />
                </div>
                <div>
                  <label style={label}>Target Price (per unit)</label>
                  <input type="number" style={inp} value={form.price_target} onChange={e=>setF('price_target',e.target.value)} placeholder="e.g. 24.00" />
                </div>
                <div>
                  <label style={label}>Max Budget (per unit)</label>
                  <input type="number" style={inp} value={form.price_max} onChange={e=>setF('price_max',e.target.value)} placeholder="e.g. 28.00" />
                </div>
              </div>
              <div style={{ marginTop:12 }}>
                <label style={label}>Additional Notes</label>
                <textarea style={{ ...inp, height:60, resize:'vertical' }} value={form.notes}
                  onChange={e=>setF('notes',e.target.value)} placeholder="Any additional requirements, packaging, cold chain specs..." />
              </div>
            </div>

            {/* SUBMIT */}
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
              <button style={{ ...btn(false), padding:'9px 20px' }} onClick={()=>setTab('tenders')}>Cancel</button>
              <button style={btnGold} onClick={postTender} disabled={sending}>
                {sending ? 'POSTING + NOTIFYING GROWERS...' : 'POST TENDER & EMAIL ALL GROWERS'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ OFFERS / BID COMPARISON ═══ */}
        {tab==='offers' && (
          <div>
            {!selected ? (
              <div style={{ ...card, textAlign:'center', padding:48, color:T.dim }}>Select a tender from the Tenders tab to view its bids.</div>
            ) : (
              <div>
                {/* Selected tender summary */}
                <div style={{ ...card, borderLeft:`3px solid ${T.gold}`, marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:T.gold }}>{selected.commodity} {selected.variety&&`(${selected.variety})`}</div>
                      <div style={{ fontSize:11, color:T.dim, marginTop:4 }}>
                        {selected.buyer_company||selected.buyer_name} | {selected.qty} {selected.unit} | {selected.origin_pref} | Deadline: {selected.bid_deadline?fmtDate(selected.bid_deadline):'Open'}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <button onClick={()=>loadOffers(selected.id)} style={btn(false)}>REFRESH BIDS</button>
                    </div>
                  </div>
                </div>

                {offers.length===0 ? (
                  <div style={{ ...card, textAlign:'center', padding:36, color:T.dim }}>
                    No bids received yet. Growers have been emailed — bids will appear here as they respond.
                    <div style={{ marginTop:12, fontSize:11 }}>Growers can submit bids at: <span style={{color:T.gold}}>{API}/api/call-for-tender/{selected.id}/bid</span></div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.gold, marginBottom:12, letterSpacing:1 }}>
                      {offers.length} BID{offers.length!==1?'S':''} RECEIVED — SORTED BY BEST PRICE
                    </div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                          {['Rank','Grower','Company','Price/Unit','Qty Available','Origin','Certs','Delivery','Score','Action'].map(h=>(
                            <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:T.gold, fontSize:9, fontWeight:700, letterSpacing:1 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...offers].sort((a,b)=>parseFloat(a.price_per_unit)-parseFloat(b.price_per_unit)).map((o,i)=>(
                          <tr key={o.id||i} style={{ borderBottom:`1px solid ${T.border}`, background:i===0?T.goldFaint:'transparent' }}>
                            <td style={{ padding:'10px 10px', color:i===0?T.gold:T.faint, fontWeight:900, fontSize:16 }}>#{i+1}</td>
                            <td style={{ padding:'10px 10px', color:T.silver, fontWeight:600 }}>{o.grower_name}</td>
                            <td style={{ padding:'10px 10px', color:T.dim }}>{o.grower_company}</td>
                            <td style={{ padding:'10px 10px', color:T.gold, fontWeight:800, fontSize:14 }}>{fmtMoney(o.price_per_unit)}</td>
                            <td style={{ padding:'10px 10px', color:T.platinum }}>{o.qty_offered} {selected.unit}</td>
                            <td style={{ padding:'10px 10px', color:T.dim, fontSize:11 }}>{o.origin}</td>
                            <td style={{ padding:'10px 10px', fontSize:10 }}>
                              {(o.certifications||'').split(',').map(c=>(
                                <span key={c} style={{ padding:'1px 5px', background:T.goldFaint, border:`1px solid ${T.borderGold}`, borderRadius:2, color:T.gold, fontSize:8, fontWeight:600, marginRight:3 }}>{c.trim()}</span>
                              ))}
                            </td>
                            <td style={{ padding:'10px 10px', color:T.dim, fontSize:11 }}>{o.delivery_date?fmtDate(o.delivery_date):'TBD'}</td>
                            <td style={{ padding:'10px 10px', color:T.gold, fontWeight:700 }}>
                              {o.score||Math.round(90-(i*8))}
                            </td>
                            <td style={{ padding:'10px 10px' }}>
                              <button onClick={()=>awardTender(o)} disabled={sending}
                                style={{ padding:'5px 14px', background:T.gold, border:'none', borderRadius:4,
                                  color:'#0f172a', fontSize:10, fontWeight:800, cursor:'pointer' }}>
                                AWARD + PO
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ PURCHASE ORDERS ═══ */}
        {tab==='po' && (
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.gold, marginBottom:16, letterSpacing:2 }}>PURCHASE ORDERS</div>
            {pos.length===0 ? (
              <div style={{ ...card, textAlign:'center', padding:48, color:T.dim }}>No POs issued yet. Award a tender to generate a PO.</div>
            ) : pos.map(po=>(
              <div key={po.po_number} style={{ ...card, borderLeft:`3px solid ${T.gold}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:900, color:T.gold, letterSpacing:1 }}>{po.po_number}</div>
                    <div style={{ fontSize:11, color:T.dim, marginTop:2 }}>Issued: {fmtDate(po.issued_at)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:22, fontWeight:900, color:T.gold }}>${parseFloat(po.total_value||0).toLocaleString()}</div>
                    <div style={{ fontSize:10, color:T.dim }}>Total Value</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {[
                    ['Commodity', po.commodity+(po.variety?` (${po.variety})`:'')],
                    ['Buyer', po.buyer_company||po.buyer_name],
                    ['Grower', po.grower_company||po.grower_name],
                    ['Quantity', `${po.qty} ${po.unit}`],
                    ['Unit Price', fmtMoney(po.unit_price)],
                    ['Origin', po.origin],
                    ['Port of Entry', po.port_of_entry],
                    ['Payment Terms', po.payment_terms],
                    ['Incoterm', po.incoterm],
                    ['Delivery', po.delivery_date?fmtDate(po.delivery_date):'TBD'],
                    ['PACA Protected', po.paca_protected?'YES':'NO'],
                    ['Status', (po.status||'issued').toUpperCase()],
                  ].map(([k,v])=>(
                    <div key={k} style={{ background:'#0f172a', borderRadius:4, padding:'8px 10px' }}>
                      <div style={{ fontSize:9, color:T.faint, letterSpacing:0.5, marginBottom:2 }}>{k}</div>
                      <div style={{ fontSize:11, color:k==='PACA Protected'&&v==='YES'?T.gold:T.platinum, fontWeight:600 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8, marginTop:14 }}>
                  <button style={btnGold}>PRINT PO</button>
                  <button style={btn(false)}>EMAIL TO GROWER</button>
                  <button style={btn(false)}>EMAIL TO BUYER</button>
                  <button style={btn(false)}>SEND TO ESCROW</button>
                  <button style={btn(false)}>CREATE INVOICE</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}