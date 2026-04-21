// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INSERT THIS CODE BEFORE THE PlaceholderTab COMPONENT (Around line 1136)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// DASHBOARD TAB - Replace PlaceholderTab for dashboard
const DashboardTab = ({ language, C }) => {
  const t = TRANSLATIONS[language];
  
  return (
    <div style={{ padding: '24px' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {[
          { label: t.totalSales || 'Total Sales', value: '$1.2M', change: '+12.5%', color: C.gold },
          { label: t.activeOrders || 'Active Orders', value: '234', change: '+8%', color: C.info },
          { label: t.inventoryValue || 'Inventory Value', value: '$890K', change: '-3%', color: C.success },
          { label: t.pendingInvoices || 'Pending Invoices', value: '$156K', change: '+5%', color: C.warning }
        ].map((stat, i) => (
          <div key={i} style={{ background: C.card, borderRadius: '12px', padding: '20px', border: `1px solid ${C.border}` }}>
            <div style={{ color: C.platinum, fontSize: '13px', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ color: stat.change.includes('+') ? C.success : C.danger, fontSize: '12px' }}>{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Cowboys Status */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '24px', border: `2px solid ${C.borderGold}`, marginBottom: '24px' }}>
        <h3 style={{ color: C.gold, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
          <Activity size={24} /> 81 AI COWBOYS STATUS - 9 TEAMS ACTIVE
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {AI_COWBOYS.slice(0, 8).map(cowboy => (
            <div key={cowboy.id} style={{ background: C.bgAlt, borderRadius: '8px', padding: '12px', border: `1px solid ${C.border}` }}>
              <div style={{ color: cowboy.color, fontWeight: '600', fontSize: '12px', marginBottom: '4px' }}>{cowboy.name}</div>
              <div style={{ color: C.textMuted, fontSize: '11px', marginBottom: '8px' }}>{cowboy.role}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: C.success }}>{cowboy.accuracy || 96.5}%</span>
                <span style={{ color: C.platinum }}>{(cowboy.tasks || 5000).toLocaleString()} tasks</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Charts */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '24px', border: `1px solid ${C.border}` }}>
        <h3 style={{ color: C.gold, marginBottom: '20px' }}>Sales Performance - Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={[
            { day: 'Mon', sales: 45000, margin: 12000 },
            { day: 'Tue', sales: 52000, margin: 14000 },
            { day: 'Wed', sales: 48000, margin: 13000 },
            { day: 'Thu', sales: 61000, margin: 16000 },
            { day: 'Fri', sales: 55000, margin: 15000 },
            { day: 'Sat', sales: 67000, margin: 18000 },
            { day: 'Sun', sales: 43000, margin: 11000 },
          ]}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.gold} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={C.gold} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="day" stroke={C.platinum} />
            <YAxis stroke={C.platinum} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px' }} />
            <Area type="monotone" dataKey="sales" stroke={C.gold} strokeWidth={3} fill="url(#salesGradient)" />
            <Area type="monotone" dataKey="margin" stroke={C.success} strokeWidth={2} fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// MANIFEST TAB
const ManifestTab = ({ language, C }) => {
  const [manifests, setManifests] = React.useState([
    { id: 'MAN-2025-001', product: 'Hass Avocado 48ct', cases: 1200, grower: 'Green Valley', port: 'Nogales', status: 'In Transit', eta: '2025-02-07', temp: '38Â°F' },
    { id: 'MAN-2025-002', product: 'Strawberries 8x1lb', cases: 800, grower: 'Sunrise Berry', port: 'Otay Mesa', status: 'Cleared', eta: '2025-02-06', temp: '34Â°F' },
    { id: 'MAN-2025-003', product: 'Roma Tomatoes 25lb', cases: 1500, grower: 'Pacific Produce', port: 'Nogales', status: 'Inspection', eta: '2025-02-08', temp: '42Â°F' },
    { id: 'MAN-2025-004', product: 'Blueberries 12x6oz', cases: 600, grower: 'Blue Harvest', port: 'Calexico', status: 'Pending', eta: '2025-02-09', temp: '35Â°F' },
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: C.gold, margin: 0, fontSize: '28px' }}>Manifest Intake</h2>
        <button style={{ padding: '10px 20px', background: C.success, border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> New Manifest
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Active Manifests', value: manifests.length, color: C.gold },
          { label: 'In Transit', value: manifests.filter(m => m.status === 'In Transit').length, color: C.info },
          { label: 'Cleared', value: manifests.filter(m => m.status === 'Cleared').length, color: C.success },
          { label: 'Total Cases', value: manifests.reduce((sum, m) => sum + m.cases, 0).toLocaleString(), color: C.platinum },
        ].map((stat, i) => (
          <div key={i} style={{ background: C.card, borderRadius: '8px', padding: '16px', border: `1px solid ${C.border}` }}>
            <div style={{ color: C.textMuted, fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '24px', fontWeight: '700' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '20px', border: `1px solid ${C.border}`, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['Manifest ID', 'Product', 'Cases', 'Grower', 'Port', 'Status', 'ETA', 'Temp'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', color: C.gold, fontSize: '12px', fontWeight: '700' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manifests.map(m => (
              <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px', color: C.text, fontWeight: '600' }}>{m.id}</td>
                <td style={{ padding: '12px', color: C.silver }}>{m.product}</td>
                <td style={{ padding: '12px', color: C.gold, fontWeight: '700' }}>{m.cases.toLocaleString()}</td>
                <td style={{ padding: '12px', color: C.text }}>{m.grower}</td>
                <td style={{ padding: '12px', color: C.info }}>{m.port}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                    background: m.status === 'Cleared' ? 'rgba(34,197,94,0.2)' : m.status === 'In Transit' ? 'rgba(59,130,246,0.2)' : m.status === 'Inspection' ? 'rgba(251,191,36,0.2)' : 'rgba(148,163,176,0.2)',
                    color: m.status === 'Cleared' ? C.success : m.status === 'In Transit' ? C.info : m.status === 'Inspection' ? C.warning : C.platinum
                  }}>
                    {m.status}
                  </span>
                </td>
                <td style={{ padding: '12px', color: C.textMuted, fontSize: '12px' }}>{m.eta}</td>
                <td style={{ padding: '12px', color: C.platinum }}>{m.temp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// SALES TAB WITH COGS
const SalesTab = ({ language, C }) => {
  const [sales, setSales] = React.useState([
    { id: 'SO-2025-001', customer: 'Walmart DC', product: 'Hass Avocado 48ct', cases: 500, unitPrice: 51.00, baseCost: 42.50, cogs: 45.20, margin: 5.80, status: 'Confirmed', date: '2025-02-06' },
    { id: 'SO-2025-002', customer: 'Costco Wholesale', product: 'Strawberries 8x1lb', cases: 300, unitPrice: 36.00, baseCost: 28.00, cogs: 31.50, margin: 4.50, status: 'Pending', date: '2025-02-06' },
    { id: 'SO-2025-003', customer: 'Kroger Fresh', product: 'Roma Tomatoes 25lb', cases: 800, unitPrice: 27.00, baseCost: 18.75, cogs: 21.30, margin: 5.70, status: 'Confirmed', date: '2025-02-05' },
  ]);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.cases * s.unitPrice), 0);
  const totalCOGS = sales.reduce((sum, s) => sum + (s.cases * s.cogs), 0);
  const totalMargin = totalRevenue - totalCOGS;
  const marginPercent = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: C.gold, margin: 0, fontSize: '28px' }}>Sales Orders</h2>
        <button style={{ padding: '10px 20px', background: C.success, border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
          + New Order
        </button>
      </div>

      {/* Financial Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: C.gold },
          { label: 'Total COGS', value: `$${totalCOGS.toLocaleString()}`, color: C.danger },
          { label: 'Gross Margin', value: `$${totalMargin.toLocaleString()}`, color: C.success },
          { label: 'Margin %', value: `${marginPercent}%`, color: C.info }
        ].map((stat, i) => (
          <div key={i} style={{ background: C.card, borderRadius: '8px', padding: '16px', border: `1px solid ${C.border}` }}>
            <div style={{ color: C.textMuted, fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '24px', fontWeight: '700' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '20px', border: `1px solid ${C.border}`, overflowX: 'auto' }}>
        <h3 style={{ color: C.gold, marginBottom: '16px' }}>Active Orders</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['Order ID', 'Customer', 'Product', 'Cases', 'Price', 'COGS', 'Margin', 'Margin %', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', color: C.gold, fontSize: '12px', fontWeight: '700' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map(s => {
              const orderMarginPercent = ((s.margin / s.unitPrice) * 100).toFixed(1);
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px', color: C.text, fontWeight: '600' }}>{s.id}</td>
                  <td style={{ padding: '12px', color: C.silver }}>{s.customer}</td>
                  <td style={{ padding: '12px', color: C.text }}>{s.product}</td>
                  <td style={{ padding: '12px', color: C.gold, fontWeight: '700' }}>{s.cases}</td>
                  <td style={{ padding: '12px', color: C.success }}>${s.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: '12px', color: C.danger }}>${s.cogs.toFixed(2)}</td>
                  <td style={{ padding: '12px', color: C.success }}>${s.margin.toFixed(2)}</td>
                  <td style={{ padding: '12px', color: C.info }}>{orderMarginPercent}%</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                      background: s.status === 'Confirmed' ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)',
                      color: s.status === 'Confirmed' ? C.success : C.warning }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// TRACEABILITY TAB (FSMA 204)
const TraceabilityTab = ({ language, C }) => {
  const [lots, setLots] = React.useState([
    { id: 'LOT-AVO-2025-001', product: 'Hass Avocado 48ct', grower: 'Green Valley Farms', harvestDate: '2025-01-28', packDate: '2025-01-29', shipDate: '2025-02-01', customer: 'Walmart DC', status: 'Delivered', fsmaScore: 100 },
    { id: 'LOT-STR-2025-045', product: 'Strawberries 8x1lb', grower: 'Sunrise Berry Farms', harvestDate: '2025-02-04', packDate: '2025-02-04', shipDate: '2025-02-05', customer: 'Costco', status: 'In Transit', fsmaScore: 85 },
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: C.gold, marginBottom: '20px', fontSize: '28px' }}>FSMA 204 Traceability</h2>
      
      {/* 7-Step Chain Visualization */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '24px', border: `1px solid ${C.border}`, marginBottom: '24px' }}>
        <h3 style={{ color: C.gold, marginBottom: '20px' }}>Traceability Chain</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {['Farm', 'Harvest', 'Pack', 'Manifest', 'Lot', 'Sale', 'Customer'].map((step, i) => (
            <React.Fragment key={step}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <span style={{ color: C.bg, fontWeight: '700', fontSize: '18px' }}>{i + 1}</span>
                </div>
                <div style={{ color: C.text, fontSize: '12px', fontWeight: '600' }}>{step}</div>
              </div>
              {i < 6 && <div style={{ flex: 1, height: '2px', background: C.border, margin: '0 8px' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Lots Table */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '20px', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['Lot ID', 'Product', 'Grower', 'Harvest', 'Pack', 'Ship', 'Customer', 'FSMA Score', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', color: C.gold, fontSize: '12px', fontWeight: '700' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => (
              <tr key={lot.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px', color: C.text, fontWeight: '600' }}>{lot.id}</td>
                <td style={{ padding: '12px', color: C.silver }}>{lot.product}</td>
                <td style={{ padding: '12px', color: C.text }}>{lot.grower}</td>
                <td style={{ padding: '12px', color: C.textMuted, fontSize: '12px' }}>{lot.harvestDate}</td>
                <td style={{ padding: '12px', color: C.textMuted, fontSize: '12px' }}>{lot.packDate}</td>
                <td style={{ padding: '12px', color: C.textMuted, fontSize: '12px' }}>{lot.shipDate}</td>
                <td style={{ padding: '12px', color: C.text }}>{lot.customer}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                    background: lot.fsmaScore === 100 ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)',
                    color: lot.fsmaScore === 100 ? C.success : C.warning 
                  }}>
                    {lot.fsmaScore}%
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                    background: lot.status === 'Delivered' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                    color: lot.status === 'Delivered' ? C.success : C.info }}>
                    {lot.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ANALYTICS TAB WITH CHARTS
const AnalyticsTab = ({ language, C }) => {
  const salesData = [
    { month: 'Aug', sales: 450000, cogs: 320000, margin: 130000 },
    { month: 'Sep', sales: 520000, cogs: 370000, margin: 150000 },
    { month: 'Oct', sales: 480000, cogs: 340000, margin: 140000 },
    { month: 'Nov', sales: 610000, cogs: 435000, margin: 175000 },
    { month: 'Dec', sales: 550000, cogs: 390000, margin: 160000 },
    { month: 'Jan', sales: 670000, cogs: 475000, margin: 195000 },
  ];

  const productMix = [
    { name: 'Avocados', value: 35, color: C.gold },
    { name: 'Berries', value: 28, color: C.danger },
    { name: 'Tomatoes', value: 18, color: C.info },
    { name: 'Peppers', value: 12, color: C.success },
    { name: 'Other', value: 7, color: C.platinum },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: C.gold, marginBottom: '24px', fontSize: '28px' }}>Analytics Dashboard</h2>

      {/* Sales Trend */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '24px', border: `1px solid ${C.border}`, marginBottom: '24px' }}>
        <h3 style={{ color: C.gold, marginBottom: '20px' }}>Sales & Margin Trend - Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" stroke={C.platinum} />
            <YAxis stroke={C.platinum} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="sales" fill={C.gold} name="Sales" />
            <Bar dataKey="cogs" fill={C.danger} name="COGS" />
            <Line type="monotone" dataKey="margin" stroke={C.success} strokeWidth={3} name="Margin" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Product Mix */}
      <div style={{ background: C.card, borderRadius: '12px', padding: '24px', border: `1px solid ${C.border}` }}>
        <h3 style={{ color: C.gold, marginBottom: '20px' }}>Product Mix by Revenue</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={productMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {productMix.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div>
            {productMix.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < productMix.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color }} />
                  <span style={{ color: C.text }}>{item.name}</span>
                </div>
                <span style={{ color: item.color, fontWeight: '700' }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// COMPLIANCE TAB
const ComplianceTab = ({ language, C }) => {
  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: C.gold, marginBottom: '24px', fontSize: '28px' }}>Compliance & Audits</h2>
      
      <div style={{ background: C.card, borderRadius: '12px', padding: '24px', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
          {[
            { label: 'FSMA 204 Compliance', value: '98%', color: C.success },
            { label: 'Active Certifications', value: '24', color: C.gold },
            { label: 'Pending Audits', value: '3', color: C.warning }
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '20px', background: C.bgAlt, borderRadius: '8px' }}>
              <div style={{ color: C.textMuted, fontSize: '12px', marginBottom: '8px' }}>{stat.label}</div>
              <div style={{ color: stat.color, fontSize: '32px', fontWeight: '700' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ color: C.text, fontSize: '16px', textAlign: 'center', padding: '40px' }}>
          <Shield size={48} color={C.gold} style={{ margin: '0 auto 16px' }} />
          <div style={{ color: C.gold, fontWeight: '600', marginBottom: '8px' }}>Compliance System Active</div>
          <div style={{ color: C.textMuted }}>FSMA 204 | GlobalGAP | PRIMUS GFS | SENASICA | LGMA</div>
        </div>
      </div>
    </div>
  );
};

// REPORTS TAB
const ReportsTab = ({ language, C }) => {
  const reports = [
    { name: 'Daily Sales Summary', type: 'Sales', freq: 'Daily', lastRun: '2025-02-06 08:00', format: 'PDF', status: 'Ready' },
    { name: 'Weekly Inventory', type: 'Inventory', freq: 'Weekly', lastRun: '2025-02-03', format: 'Excel', status: 'Ready' },
    { name: 'Monthly P&L', type: 'Financial', freq: 'Monthly', lastRun: '2025-01-31', format: 'PDF', status: 'Ready' },
    { name: 'FSMA 204 Compliance', type: 'Compliance', freq: 'On Demand', lastRun: '2025-01-28', format: 'PDF', status: 'Ready' },
    { name: 'Grower Performance', type: 'Suppliers', freq: 'Monthly', lastRun: '2025-01-31', format: 'Excel', status: 'Ready' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: C.gold, margin: 0, fontSize: '28px' }}>Comprehensive Reports</h2>
        <button style={{ padding: '10px 20px', background: C.success, border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
          + Custom Report
        </button>
      </div>

      <div style={{ background: C.card, borderRadius: '12px', padding: '20px', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['Report Name', 'Type', 'Frequency', 'Last Run', 'Format', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', color: C.gold, fontSize: '12px', fontWeight: '700' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((report, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px', color: C.text, fontWeight: '600' }}>{report.name}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(59,130,246,0.2)', color: C.info, fontSize: '11px', fontWeight: '600' }}>
                    {report.type}
                  </span>
                </td>
                <td style={{ padding: '12px', color: C.text }}>{report.freq}</td>
                <td style={{ padding: '12px', color: C.textMuted, fontSize: '12px' }}>{report.lastRun}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', background: report.format === 'PDF' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', color: report.format === 'PDF' ? C.danger : C.success, fontSize: '11px', fontWeight: '600' }}>
                    {report.format}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(34,197,94,0.2)', color: C.success, fontSize: '11px', fontWeight: '600' }}>
                    {report.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <button style={{ padding: '6px 12px', background: C.success, border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: '600' }}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// DOCUMENTS TAB
const DocumentsTab = ({ language, C }) => {
  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: C.gold, marginBottom: '24px', fontSize: '28px' }}>Document Vault</h2>
      <div style={{ background: C.card, borderRadius: '12px', padding: '40px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <FileText size={64} color={C.gold} style={{ margin: '0 auto 20px' }} />
        <div style={{ color: C.gold, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Secure Document Storage</div>
        <div style={{ color: C.textMuted }}>Invoices | BOLs | Certificates | Inspection Reports</div>
      </div>
    </div>
  );
};

// TENANTS TAB  
const TenantsTab = ({ language, C }) => {
  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: C.gold, marginBottom: '24px', fontSize: '28px' }}>Multi-Tenant Management</h2>
      <div style={{ background: C.card, borderRadius: '12px', padding: '40px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <Users size={64} color={C.gold} style={{ margin: '0 auto 20px' }} />
        <div style={{ color: C.gold, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Tenant Administration</div>
        <div style={{ color: C.textMuted }}>Manage multiple client accounts</div>
      </div>
    </div>
  );
};

// COMMUNICATION TAB
const CommunicationTab = ({ language, C }) => {
  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: C.gold, marginBottom: '24px', fontSize: '28px' }}>Communication Center</h2>
      <div style={{ background: C.card, borderRadius: '12px', padding: '40px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <MessageCircle size={64} color={C.gold} style={{ margin: '0 auto 20px' }} />
        <div style={{ color: C.gold, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Messaging System</div>
        <div style={{ color: C.textMuted }}>Internal communications & notifications</div>
      </div>
    </div>
  );
};

// SETTINGS TAB
const SettingsTab = ({ language, C }) => {
  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: C.gold, marginBottom: '24px', fontSize: '28px' }}>System Settings</h2>
      <div style={{ background: C.card, borderRadius: '12px', padding: '40px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <Settings size={64} color={C.gold} style={{ margin: '0 auto 20px' }} />
        <div style={{ color: C.gold, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Configuration</div>
        <div style={{ color: C.textMuted }}>User preferences | API keys | Notifications</div>
      </div>
    </div>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NOW UPDATE THE TABS ARRAY TO USE THESE COMPONENTS INSTEAD OF PlaceholderTab
// Replace lines ~1165-1183 with this:
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/*
const TABS = [
  { id: 'dashboard', label: t.dashboard, icon: 'ðŸ“Š', component: DashboardTab },
  { id: 'market', label: t.marketIntel, icon: 'ðŸ“ˆ', component: MarketIntelligenceTab },
  { id: 'manifest', label: t.manifest, icon: 'ðŸ“¦', component: ManifestTab },
  { id: 'inventory', label: t.inventory, icon: 'ðŸ­', component: InventoryTab },
  { id: 'sales', label: t.sales, icon: 'ðŸ’°', component: SalesTab },
  { id: 'traceability', label: t.traceability, icon: 'ðŸ”—', component: TraceabilityTab },
  { id: 'analytics', label: t.analytics, icon: 'ðŸ“‰', component: AnalyticsTab },
  { id: 'suppliers', label: t.suppliers, icon: 'ðŸŒ±', component: SuppliersTab },
  { id: 'financial', label: t.financial, icon: 'ðŸ¦', component: FinancialTab },
  { id: 'compliance', label: t.compliance, icon: 'âœ…', component: ComplianceTab },
  { id: 'logistics', label: t.logistics, icon: 'ðŸšš', component: LogisticsTab },
  { id: 'reports', label: t.reports, icon: 'ðŸ“‹', component: ReportsTab },
  { id: 'documents', label: t.documents, icon: 'ðŸ“', component: DocumentsTab },
  { id: 'tenants', label: t.tenants, icon: 'ðŸ‘¥', component: TenantsTab },
  { id: 'communication', label: t.communication, icon: 'ðŸ’¬', component: CommunicationTab },
  { id: 'mobile', label: t.mobile, icon: 'ðŸ“±', component: MobileSalesTab },
  { id: 'settings', label: t.settings, icon: 'âš™ï¸', component: SettingsTab },
];
*/

