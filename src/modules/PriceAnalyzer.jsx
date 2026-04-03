import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

// =============================================================================
// PRICE ANALYZER DASHBOARD — AuditDNA / Mexausa Food Group, Inc.
// Terminal market charts | 50-product comparison | Buy/sell signals
// Palette: Slate/Gold/Platinum | Zero green/purple/emojis
// =============================================================================

const API  = process.env.REACT_APP_API_URL || 'http://localhost:5050';
const USDA = '4F158DB1-85C2-3243-BFFA-58B53FB40D23';

const T = {
  bg:      '#0a0a0a', bgAlt: '#1a1a1a', card: 'rgba(30,30,30,0.95)',
  border:  'rgba(192,192,192,0.12)', borderGold: 'rgba(203,166,88,0.3)',
  gold:    '#cba658', goldDark: '#b8944d', goldFaint: 'rgba(203,166,88,0.08)',
  silver:  '#e2e8f0', platinum: '#cbd5e1', dim: '#94a3b8', faint: '#475569',
  text:    '#f8fafc', danger: '#ef4444', warn: '#f59e0b',
  dangerFaint: 'rgba(239,68,68,0.10)', warnFaint: 'rgba(245,158,11,0.10)',
};

// ─── 50-PRODUCT PRICE INTELLIGENCE DATABASE ──────────────────────────────────
const PRODUCTS = [
  // AVOCADOS
  { id:'AVO-48',  name:'Hass Avocado 48ct',      cat:'Avocados',   unit:'case', cm:42.50, ws:51.00, retail:1.79, terminal:54.00, signal:'BUY',  margin:21 },
  { id:'AVO-36',  name:'Hass Avocado 36ct',      cat:'Avocados',   unit:'case', cm:48.50, ws:58.00, retail:2.19, terminal:61.00, signal:'BUY',  margin:19 },
  { id:'AVO-60',  name:'Hass Avocado 60ct',      cat:'Avocados',   unit:'case', cm:38.50, ws:47.00, retail:1.49, terminal:50.00, signal:'BUY',  margin:22 },
  { id:'AVO-ORG', name:'Hass Avocado Organic',   cat:'Avocados',   unit:'case', cm:52.00, ws:64.00, retail:2.99, terminal:68.00, signal:'BUY',  margin:23 },
  { id:'AVO-COL', name:'Colombian Hass',          cat:'Avocados',   unit:'case', cm:44.00, ws:54.00, retail:2.29, terminal:57.00, signal:'HOLD', margin:18 },
  // STRAWBERRIES
  { id:'STR-ALB', name:'Strawberry Albion 8x1lb',cat:'Berries',    unit:'flat', cm:24.00, ws:32.00, retail:4.99, terminal:34.00, signal:'BUY',  margin:29 },
  { id:'STR-SAN', name:'Strawberry San Andreas',  cat:'Berries',    unit:'flat', cm:22.50, ws:30.00, retail:4.49, terminal:32.00, signal:'BUY',  margin:29 },
  { id:'STR-ORG', name:'Strawberry Organic',      cat:'Berries',    unit:'flat', cm:32.00, ws:42.00, retail:6.99, terminal:44.00, signal:'BUY',  margin:31 },
  { id:'STR-FRZ', name:'Strawberry Frozen IQF',   cat:'Berries',    unit:'case', cm:32.00, ws:40.00, retail:4.99, terminal:43.00, signal:'HOLD', margin:25 },
  // BLUEBERRIES
  { id:'BLU-12',  name:'Blueberries 12x6oz',     cat:'Berries',    unit:'flat', cm:38.50, ws:48.00, retail:4.99, terminal:52.00, signal:'BUY',  margin:35 },
  { id:'BLU-ORG', name:'Blueberries Organic',     cat:'Berries',    unit:'flat', cm:48.00, ws:60.00, retail:7.99, terminal:64.00, signal:'BUY',  margin:33 },
  { id:'BLU-PER', name:'Blueberries Peru',         cat:'Berries',    unit:'flat', cm:36.00, ws:46.00, retail:4.99, terminal:49.00, signal:'HOLD', margin:27 },
  // RASPBERRIES
  { id:'RSP-12',  name:'Raspberries 12x6oz',      cat:'Berries',    unit:'flat', cm:42.00, ws:52.00, retail:5.99, terminal:56.00, signal:'BUY',  margin:32 },
  { id:'RSP-ORG', name:'Raspberries Organic',      cat:'Berries',    unit:'flat', cm:52.00, ws:64.00, retail:7.99, terminal:68.00, signal:'BUY',  margin:31 },
  // BLACKBERRIES
  { id:'BLK-12',  name:'Blackberries 12x6oz',     cat:'Berries',    unit:'flat', cm:36.00, ws:46.00, retail:4.99, terminal:49.00, signal:'BUY',  margin:35 },
  // TOMATOES
  { id:'TOM-ROM', name:'Roma Tomatoes 25lb',       cat:'Tomatoes',   unit:'case', cm:18.75, ws:27.00, retail:1.49, terminal:29.00, signal:'BUY',  margin:44 },
  { id:'TOM-CHR', name:'Cherry Tomatoes 12x1pt',   cat:'Tomatoes',   unit:'flat', cm:26.00, ws:34.00, retail:3.99, terminal:36.00, signal:'BUY',  margin:31 },
  { id:'TOM-GRP', name:'Grape Tomatoes 12x1pt',    cat:'Tomatoes',   unit:'flat', cm:24.00, ws:32.00, retail:3.49, terminal:34.00, signal:'BUY',  margin:33 },
  { id:'TOM-BEF', name:'Beefsteak 25lb',            cat:'Tomatoes',   unit:'case', cm:22.00, ws:30.00, retail:2.49, terminal:32.00, signal:'HOLD', margin:36 },
  { id:'TOM-TOV', name:'Tomatoes on Vine 15lb',     cat:'Tomatoes',   unit:'case', cm:28.00, ws:36.00, retail:3.99, terminal:38.00, signal:'BUY',  margin:29 },
  { id:'TOM-ORG', name:'Roma Organic 25lb',          cat:'Tomatoes',   unit:'case', cm:26.00, ws:35.00, retail:2.49, terminal:37.00, signal:'BUY',  margin:35 },
  // PEPPERS
  { id:'PEP-RED', name:'Bell Pepper Red 11lb',     cat:'Peppers',    unit:'case', cm:22.00, ws:30.00, retail:2.49, terminal:32.00, signal:'BUY',  margin:36 },
  { id:'PEP-YEL', name:'Bell Pepper Yellow 11lb',  cat:'Peppers',    unit:'case', cm:24.00, ws:32.00, retail:2.69, terminal:34.00, signal:'BUY',  margin:33 },
  { id:'PEP-GRN', name:'Bell Pepper Green 11lb',   cat:'Peppers',    unit:'case', cm:14.00, ws:22.00, retail:1.29, terminal:24.00, signal:'SELL', margin:57 },
  { id:'PEP-MNI', name:'Mini Sweet Peppers 12x1lb',cat:'Peppers',    unit:'flat', cm:28.00, ws:36.00, retail:3.99, terminal:38.00, signal:'BUY',  margin:29 },
  { id:'PEP-POB', name:'Poblano 20lb',               cat:'Peppers',    unit:'case', cm:22.00, ws:30.00, retail:2.99, terminal:32.00, signal:'HOLD', margin:36 },
  // CITRUS
  { id:'LIM-MX',  name:'Limes 40lb Mexico',        cat:'Citrus',     unit:'case', cm:16.00, ws:24.00, retail:0.49, terminal:26.00, signal:'BUY',  margin:50 },
  { id:'LEM-CA',  name:'Lemons 115ct California',  cat:'Citrus',     unit:'case', cm:22.00, ws:30.00, retail:0.79, terminal:32.00, signal:'HOLD', margin:36 },
  { id:'ORA-NAV', name:'Navel Oranges 56ct',        cat:'Citrus',     unit:'case', cm:18.00, ws:26.00, retail:1.29, terminal:28.00, signal:'BUY',  margin:44 },
  { id:'GRF-36',  name:'Grapefruit Red 36ct',       cat:'Citrus',     unit:'case', cm:14.00, ws:22.00, retail:1.49, terminal:24.00, signal:'BUY',  margin:57 },
  // LEAFY GREENS
  { id:'LTG-ROM', name:'Romaine Hearts 12ct',       cat:'Leafy Greens',unit:'case',cm:18.00, ws:26.00, retail:2.99, terminal:28.00, signal:'HOLD', margin:44 },
  { id:'LTG-SPG', name:'Spinach 4x2.5lb',            cat:'Leafy Greens',unit:'case',cm:22.00, ws:30.00, retail:3.49, terminal:32.00, signal:'BUY',  margin:36 },
  { id:'LTG-KAL', name:'Kale 24ct',                  cat:'Leafy Greens',unit:'case',cm:16.00, ws:24.00, retail:1.99, terminal:26.00, signal:'BUY',  margin:50 },
  { id:'LTG-CLN', name:'Cilantro 60ct',               cat:'Leafy Greens',unit:'case',cm:14.00, ws:20.00, retail:0.99, terminal:22.00, signal:'BUY',  margin:43 },
  // CUCUMBERS
  { id:'CUC-STD', name:'Cucumbers 24ct',             cat:'Cucumbers',  unit:'case', cm:12.00, ws:18.00, retail:0.99, terminal:20.00, signal:'BUY',  margin:50 },
  { id:'CUC-ENG', name:'English Cucumber 12ct',      cat:'Cucumbers',  unit:'case', cm:18.00, ws:26.00, retail:1.99, terminal:28.00, signal:'HOLD', margin:44 },
  // SQUASH
  { id:'SQS-ZUC', name:'Zucchini 22lb',              cat:'Squash',     unit:'case', cm:14.00, ws:20.00, retail:1.29, terminal:22.00, signal:'BUY',  margin:43 },
  { id:'SQS-YEL', name:'Yellow Squash 22lb',         cat:'Squash',     unit:'case', cm:14.00, ws:20.00, retail:1.29, terminal:22.00, signal:'BUY',  margin:43 },
  // MANGOES
  { id:'MNG-TOM', name:'Tommy Atkins Mango 9ct',    cat:'Mangoes',    unit:'case', cm:16.00, ws:24.00, retail:2.49, terminal:26.00, signal:'BUY',  margin:50 },
  { id:'MNG-ATO', name:'Ataulfo Mango 14ct',         cat:'Mangoes',    unit:'case', cm:18.00, ws:26.00, retail:1.79, terminal:28.00, signal:'BUY',  margin:44 },
  // ONIONS
  { id:'ONI-YEL', name:'Yellow Onions 50lb',         cat:'Onions',     unit:'sack', cm:14.00, ws:20.00, retail:0.99, terminal:22.00, signal:'HOLD', margin:43 },
  { id:'ONI-RED', name:'Red Onions 25lb',             cat:'Onions',     unit:'case', cm:16.00, ws:22.00, retail:1.29, terminal:24.00, signal:'BUY',  margin:38 },
  { id:'ONI-WHT', name:'White Onions 50lb',           cat:'Onions',     unit:'sack', cm:14.00, ws:20.00, retail:0.99, terminal:22.00, signal:'SELL', margin:43 },
  // GRAPES
  { id:'GRP-RED', name:'Red Seedless Grapes 18lb',  cat:'Grapes',     unit:'case', cm:22.00, ws:32.00, retail:2.99, terminal:34.00, signal:'BUY',  margin:45 },
  { id:'GRP-GRN', name:'Green Seedless Grapes 18lb',cat:'Grapes',     unit:'case', cm:20.00, ws:30.00, retail:2.79, terminal:32.00, signal:'BUY',  margin:50 },
  // HERBS
  { id:'HRB-BSL', name:'Basil 16ct',                 cat:'Herbs',      unit:'case', cm:18.00, ws:26.00, retail:2.49, terminal:28.00, signal:'BUY',  margin:44 },
  { id:'HRB-PRX', name:'Parsley 60ct',                cat:'Herbs',      unit:'case', cm:14.00, ws:20.00, retail:0.99, terminal:22.00, signal:'BUY',  margin:43 },
  // MELONS
  { id:'MEL-WTR', name:'Watermelon 36ct Seedless',  cat:'Melons',     unit:'case', cm:14.00, ws:20.00, retail:5.99, terminal:22.00, signal:'BUY',  margin:43 },
  { id:'MEL-CAN', name:'Cantaloupe 9ct',              cat:'Melons',     unit:'case', cm:16.00, ws:24.00, retail:3.99, terminal:26.00, signal:'HOLD', margin:50 },
];

// ─── MOCK TERMINAL MARKET HISTORY (12 weeks) ─────────────────────────────────
const generateHistory = (base, volatility = 0.08) => {
  const weeks = [];
  let price = base;
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const label = d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    price = price * (1 + (Math.random() - 0.5) * volatility);
    weeks.push({ week: label, terminal: +price.toFixed(2), cm: +(price * 0.82).toFixed(2) });
  }
  return weeks;
};

// ─── SIGNAL BADGE ─────────────────────────────────────────────────────────────
const SignalBadge = ({ signal }) => {
  const cfg = {
    BUY:  { bg:'rgba(203,166,88,0.18)', border:'#cba658', color:'#cba658', label:'BUY' },
    SELL: { bg:'rgba(239,68,68,0.12)',  border:'#ef4444', color:'#ef4444', label:'SELL' },
    HOLD: { bg:'rgba(148,163,184,0.1)', border:'#64748b', color:'#94a3b8', label:'HOLD' },
  }[signal] || {};
  return (
    <span style={{ padding:'2px 8px', background:cfg.bg, border:`1px solid ${cfg.border}`,
      borderRadius:3, color:cfg.color, fontSize:9, fontWeight:800, letterSpacing:1 }}>
      {cfg.label}
    </span>
  );
};

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e293b', border:`1px solid ${T.borderGold}`, borderRadius:6, padding:'10px 14px', fontSize:11 }}>
      <div style={{ color:T.gold, fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, marginBottom:2 }}>
          {p.name}: <strong>${p.value?.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PriceAnalyzer() {
  const [catFilter, setCatFilter]     = useState('All');
  const [signalFilter, setSignal]     = useState('All');
  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState('margin');
  const [selected, setSelected]       = useState(null);   // product for chart drill-down
  const [compareList, setCompareList] = useState([]);     // up to 5 for comparison
  const [usdaData, setUsdaData]       = useState({});
  const [loading, setLoading]         = useState(false);
  const [viewMode, setViewMode]       = useState('table'); // table | chart | compare

  const categories = ['All', ...new Set(PRODUCTS.map(p => p.cat))];

  // Fetch USDA pricing for selected product
  const fetchUSDA = useCallback(async (commodity) => {
    setLoading(true);
    try {
      const r = await fetch(
        `https://apps.ams.usda.gov/marketnews/v1/reports?commodity=${encodeURIComponent(commodity)}&report_type=LM&key=${USDA}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (r.ok) {
        const d = await r.json();
        setUsdaData(prev => ({ ...prev, [commodity]: d }));
      }
    } catch { /* use static data */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selected) fetchUSDA(selected.cat);
  }, [selected, fetchUSDA]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (catFilter !== 'All')    list = list.filter(p => p.cat === catFilter);
    if (signalFilter !== 'All') list = list.filter(p => p.signal === signalFilter);
    if (search)                 list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a,b) => {
      if (sortBy === 'margin')   return b.margin - a.margin;
      if (sortBy === 'name')     return a.name.localeCompare(b.name);
      if (sortBy === 'cm')       return a.cm - b.cm;
      if (sortBy === 'terminal') return b.terminal - a.terminal;
      return 0;
    });
  }, [catFilter, signalFilter, search, sortBy]);

  const toggleCompare = (p) => setCompareList(prev =>
    prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id)
    : prev.length < 5 ? [...prev, p] : prev);

  const history = selected ? generateHistory(selected.terminal) : [];

  const buyCount  = PRODUCTS.filter(p => p.signal === 'BUY').length;
  const sellCount = PRODUCTS.filter(p => p.signal === 'SELL').length;
  const holdCount = PRODUCTS.filter(p => p.signal === 'HOLD').length;
  const avgMargin = Math.round(PRODUCTS.reduce((s,p) => s + p.margin, 0) / PRODUCTS.length);

  const s = {
    card: { background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:16 },
    inp:  { background:'#0f172a', border:`1px solid ${T.border}`, color:T.text, borderRadius:4, padding:'7px 12px', fontSize:12, outline:'none' },
    btn:  (a) => ({ padding:'6px 14px', fontSize:10, fontWeight:700, cursor:'pointer', borderRadius:4,
      background: a ? T.gold : 'transparent',
      color:      a ? '#0f172a' : T.dim,
      border:     `1px solid ${a ? T.gold : T.border}` }),
  };

  return (
    <div style={{ background:T.bg, minHeight:'100vh', color:T.text, fontFamily:"'Segoe UI',sans-serif", padding:0 }}>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,rgba(203,166,88,0.08),rgba(15,23,42,0.98))', borderBottom:`1px solid ${T.borderGold}`, padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:16, fontWeight:900, letterSpacing:3, color:T.gold }}>PRICE ANALYZER</div>
          <div style={{ fontSize:10, color:T.dim, marginTop:2, letterSpacing:1 }}>Mexausa Food Group, Inc. — Terminal Market Intelligence | {PRODUCTS.length} Products</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['table','chart','compare'].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={s.btn(viewMode===m)}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, padding:'16px 24px 0' }}>
        {[
          { label:'Products Tracked', val:PRODUCTS.length, sub:'across 13 categories' },
          { label:'BUY Signals',      val:buyCount,  sub:'priced below terminal', gold:true },
          { label:'SELL Signals',     val:sellCount, sub:'above market avg', red:true },
          { label:'HOLD',             val:holdCount, sub:'watch list' },
          { label:'Avg CM Margin',    val:`${avgMargin}%`, sub:'vs terminal market', gold:true },
        ].map((k,i) => (
          <div key={i} style={{ ...s.card, ...(k.gold?{border:`1px solid ${T.gold}`,background:T.goldFaint}:{}) }}>
            <div style={{ fontSize:26, fontWeight:900, color:k.gold?T.gold:k.red?T.danger:T.platinum }}>{k.val}</div>
            <div style={{ fontSize:11, fontWeight:700, color:T.dim, marginTop:2 }}>{k.label}</div>
            <div style={{ fontSize:10, color:T.faint, marginTop:1 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ display:'flex', gap:10, padding:'14px 24px', flexWrap:'wrap', alignItems:'center' }}>
        <input style={{ ...s.inp, width:220 }} placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={s.inp} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select style={s.inp} value={signalFilter} onChange={e=>setSignal(e.target.value)}>
          {['All','BUY','SELL','HOLD'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select style={s.inp} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="margin">Sort: Margin</option>
          <option value="terminal">Sort: Terminal Price</option>
          <option value="cm">Sort: CM Price</option>
          <option value="name">Sort: Name</option>
        </select>
        <span style={{ fontSize:11, color:T.dim }}>{filtered.length} products</span>
        {compareList.length > 0 && (
          <button onClick={() => setViewMode('compare')} style={{ ...s.btn(true), marginLeft:'auto' }}>
            COMPARE ({compareList.length})
          </button>
        )}
      </div>

      <div style={{ padding:'0 24px 24px', display:'flex', gap:16 }}>

        {/* ─── TABLE VIEW ─── */}
        {viewMode === 'table' && (
          <div style={{ flex:1 }}>
            <div style={s.card}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                    {['','Product','Category','CM Price','Terminal','Wholesale','Margin %','Signal','Compare'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:T.gold, fontSize:9, fontWeight:700, letterSpacing:1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} onClick={() => setSelected(p)}
                      style={{ borderBottom:`1px solid ${T.border}`, cursor:'pointer',
                        background: selected?.id===p.id ? T.goldFaint : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(203,166,88,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background=selected?.id===p.id?T.goldFaint:'transparent'}>
                      <td style={{ padding:'8px 10px' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%',
                          background: p.signal==='BUY'?T.gold:p.signal==='SELL'?T.danger:T.faint }} />
                      </td>
                      <td style={{ padding:'8px 10px', color:T.silver, fontWeight:600 }}>{p.name}</td>
                      <td style={{ padding:'8px 10px', color:T.faint }}>{p.cat}</td>
                      <td style={{ padding:'8px 10px', color:T.gold, fontWeight:700 }}>${p.cm.toFixed(2)}<span style={{ color:T.faint, fontWeight:400 }}>/{p.unit}</span></td>
                      <td style={{ padding:'8px 10px', color:T.dim }}>${p.terminal.toFixed(2)}</td>
                      <td style={{ padding:'8px 10px', color:T.dim }}>${p.ws.toFixed(2)}</td>
                      <td style={{ padding:'8px 10px', color:T.gold, fontWeight:800 }}>{p.margin}%</td>
                      <td style={{ padding:'8px 10px' }}><SignalBadge signal={p.signal} /></td>
                      <td style={{ padding:'8px 10px' }}>
                        <button onClick={e=>{e.stopPropagation();toggleCompare(p);}}
                          style={{ padding:'2px 8px', fontSize:9, fontWeight:700, cursor:'pointer', borderRadius:3,
                            background: compareList.find(x=>x.id===p.id)?T.goldFaint:'transparent',
                            border:`1px solid ${compareList.find(x=>x.id===p.id)?T.gold:T.border}`,
                            color: compareList.find(x=>x.id===p.id)?T.gold:T.faint }}>
                          {compareList.find(x=>x.id===p.id)?'ADDED':'ADD'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── CHART VIEW ─── */}
        {viewMode === 'chart' && (
          <div style={{ flex:1 }}>
            {/* Category bar chart */}
            <div style={{ ...s.card, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.gold, marginBottom:12, letterSpacing:1 }}>CM PRICE vs TERMINAL MARKET — {catFilter === 'All' ? 'ALL CATEGORIES' : catFilter.toUpperCase()}</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={filtered.slice(0,20)} margin={{ top:5, right:20, bottom:60, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="name" tick={{ fill:T.faint, fontSize:8 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fill:T.dim, fontSize:10 }} tickFormatter={v=>`$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ color:T.dim, fontSize:10 }} />
                  <Bar dataKey="cm"       name="CM Price"       fill={T.gold}    radius={[3,3,0,0]} />
                  <Bar dataKey="terminal" name="Terminal Market" fill={T.faint}   radius={[3,3,0,0]} />
                  <Bar dataKey="ws"       name="Wholesale"       fill="#475569"   radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Margin % bar chart */}
            <div style={s.card}>
              <div style={{ fontSize:12, fontWeight:700, color:T.gold, marginBottom:12, letterSpacing:1 }}>CM MARGIN % vs TERMINAL (TOP 20)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[...filtered].sort((a,b)=>b.margin-a.margin).slice(0,20)} margin={{ top:5, right:20, bottom:60, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="name" tick={{ fill:T.faint, fontSize:8 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fill:T.dim, fontSize:10 }} tickFormatter={v=>`${v}%`} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={20} stroke={T.gold} strokeDasharray="4 2" label={{ value:'20% floor', fill:T.gold, fontSize:9 }} />
                  <Bar dataKey="margin" name="Margin %" fill={T.goldDark} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ─── COMPARE VIEW ─── */}
        {viewMode === 'compare' && (
          <div style={{ flex:1 }}>
            {compareList.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', padding:40, color:T.dim }}>
                Go to TABLE view and click ADD on up to 5 products to compare.
              </div>
            ) : (
              <div style={s.card}>
                <div style={{ fontSize:12, fontWeight:700, color:T.gold, marginBottom:16, letterSpacing:1 }}>PRODUCT COMPARISON ({compareList.length})</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                      <th style={{ padding:'8px 10px', color:T.gold, fontSize:10, fontWeight:700, textAlign:'left' }}>Attribute</th>
                      {compareList.map(p => (
                        <th key={p.id} style={{ padding:'8px 10px', color:T.silver, fontSize:10, fontWeight:700, textAlign:'left' }}>
                          {p.name}
                          <button onClick={() => toggleCompare(p)} style={{ marginLeft:6, background:'transparent', border:'none', color:T.danger, cursor:'pointer', fontSize:10 }}>x</button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label:'Category',       key:'cat' },
                      { label:'CM Price',        key:'cm',       fmt:v=>`$${v.toFixed(2)}` },
                      { label:'Terminal Market', key:'terminal', fmt:v=>`$${v.toFixed(2)}` },
                      { label:'Wholesale',       key:'ws',       fmt:v=>`$${v.toFixed(2)}` },
                      { label:'Retail',          key:'retail',   fmt:v=>`$${v.toFixed(2)}` },
                      { label:'CM Margin',       key:'margin',   fmt:v=>`${v}%` },
                      { label:'Unit',            key:'unit' },
                      { label:'Signal',          key:'signal' },
                    ].map(row => (
                      <tr key={row.label} style={{ borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:'8px 10px', color:T.gold, fontWeight:600, fontSize:11 }}>{row.label}</td>
                        {compareList.map(p => {
                          const val = p[row.key];
                          const display = row.fmt ? row.fmt(val) : val;
                          return (
                            <td key={p.id} style={{ padding:'8px 10px', color: row.key==='signal'?(val==='BUY'?T.gold:val==='SELL'?T.danger:T.dim):T.platinum, fontWeight: row.key==='margin'?800:400 }}>
                              {row.key==='signal' ? <SignalBadge signal={val} /> : display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Comparison chart */}
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.gold, marginBottom:10 }}>PRICE COMPARISON CHART</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={compareList} margin={{ top:5, right:20, bottom:40, left:10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                      <XAxis dataKey="name" tick={{ fill:T.faint, fontSize:8 }} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fill:T.dim, fontSize:10 }} tickFormatter={v=>`$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ color:T.dim, fontSize:10 }} />
                      <Bar dataKey="cm"       name="CM Price"  fill={T.gold}   radius={[3,3,0,0]} />
                      <Bar dataKey="terminal" name="Terminal"  fill={T.faint}  radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── DRILL-DOWN PANEL (table view) ─── */}
        {viewMode === 'table' && selected && (
          <div style={{ width:340, flexShrink:0 }}>
            <div style={{ ...s.card, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:T.gold }}>{selected.name}</div>
                  <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>{selected.cat}</div>
                </div>
                <SignalBadge signal={selected.signal} />
              </div>
              {[
                { label:'CM Price',      val:`$${selected.cm.toFixed(2)}/${selected.unit}`, gold:true },
                { label:'Terminal Mkt',  val:`$${selected.terminal.toFixed(2)}` },
                { label:'Wholesale',     val:`$${selected.ws.toFixed(2)}` },
                { label:'Retail',        val:`$${selected.retail.toFixed(2)}/ea` },
                { label:'CM Margin',     val:`${selected.margin}%`, gold:true },
                { label:'Savings/unit',  val:`$${(selected.terminal-selected.cm).toFixed(2)}`, gold:true },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.dim, fontSize:11 }}>{r.label}</span>
                  <span style={{ color:r.gold?T.gold:T.platinum, fontWeight:r.gold?700:400, fontSize:11 }}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* 12-week price chart */}
            <div style={s.card}>
              <div style={{ fontSize:11, fontWeight:700, color:T.gold, marginBottom:10 }}>12-WEEK PRICE TREND</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history} margin={{ top:5, right:10, bottom:20, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                  <XAxis dataKey="week" tick={{ fill:T.faint, fontSize:8 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fill:T.dim, fontSize:9 }} tickFormatter={v=>`$${v}`} width={45} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="terminal" name="Terminal" stroke={T.dim}     strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="cm"       name="CM Price" stroke={T.gold}    strokeWidth={2}   dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}