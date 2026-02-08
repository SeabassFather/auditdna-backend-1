import React, { useState, useEffect } from "react";
// For chart: npm install recharts if not already
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

// Demo product and market universe
const FEATURED = ["Avocado", "Leafy Greens", "Strawberries"];
const PRODUCT_LIST = [
  ...FEATURED,
  "Tomatoes", "Chili Peppers", "Mangoes", "Blueberries", "Papayas", "Bananas", "Broccoli", "Cucumbers", "Spinach",
  // ...and 500+ more from your product catalog
];

const DEMO_MARKET = {
  Avocado: [
    { date: "2025-10-01", price: 28.6, volume: 50000 },
    { date: "2025-10-08", price: 31.2, volume: 54500 },
    { date: "2025-10-15", price: 29.8, volume: 57050 },
    { date: "2025-10-22", price: 32.1, volume: 60000 },
  ],
  Strawberries: [
    { date: "2025-10-01", price: 18.1, volume: 22000 },
    { date: "2025-10-08", price: 17.7, volume: 23550 },
    { date: "2025-10-15", price: 19.2, volume: 24500 },
    { date: "2025-10-22", price: 20.0, volume: 25600 },
  ],
  "Leafy Greens": [
    { date: "2025-10-01", price: 10.2, volume: 34000 },
    { date: "2025-10-08", price: 11.0, volume: 35210 },
    { date: "2025-10-15", price: 10.6, volume: 37000 },
    { date: "2025-10-22", price: 11.5, volume: 39050 },
  ],
  Tomatoes: [], // empty demo (triggers empty state)
};

const TRACEABILITY = {
  Avocado: {
    origin: "MichoacÃ¡n, MX",
    corridor: "MichoacÃ¡n â†’ Laredo â†’ Los Angeles",
    lastAudit: "2025-10-05",
    exporter: "AgroDelCampo MX",
    certifications: ["USDA Organic", "GLOBALG.A.P.", "PrimusGFS"],
    compliance: "Active",
  },
  Strawberries: {
    origin: "Oxnard, CA / Manzanillo, MX",
    corridor: "Oxnard â†’ Manzanillo â†’ Houston",
    lastAudit: "2025-10-03",
    exporter: "Hacienda San Miguel",
    certifications: ["USDA Organic", "Rainforest Alliance"],
    compliance: "Active",
  },
  "Leafy Greens": {
    origin: "Guanajuato, MX",
    corridor: "Guanajuato â†’ Veracruz â†’ Miami",
    lastAudit: "2025-10-10",
    exporter: "Huerto Verde Mexicano",
    certifications: ["USDA Organic", "PrimusGFS"],
    compliance: "Active",
  },
};

const EN = {
  pageTitle: "Market Intelligence",
  pickProduct: "Choose a product",
  featured: "Featured",
  price: "Price (USD / box)",
  volume: "Wholesale Volume (lbs)",
  chartTitle: "Price & Volume Trend",
  trace: "Traceability Profile",
  origin: "Origin",
  corridor: "Trade Corridor",
  exporter: "Exporter",
  audit: "Last Audit",
  certs: "Certifications",
  active: "Compliance: Active",
  noData: "No data available for",
};

const ES = {
  pageTitle: "Inteligencia de Mercado",
  pickProduct: "Elige un producto",
  featured: "Destacado",
  price: "Precio (USD / caja)",
  volume: "Volumen Mayorista (lbs)",
  chartTitle: "Tendencias de Precio y Volumen",
  trace: "Perfil de Trazabilidad",
  origin: "Origen",
  corridor: "Corredor Comercial",
  exporter: "Exportador",
  audit: "Ãšltima AuditorÃ­a",
  certs: "Certificaciones",
  active: "Cumplimiento: Activo",
  noData: "No hay datos disponibles para",
};

export default function MarketModule({ language = "en" }) {
  const TXT = language === "es" ? ES : EN;
  const [selected, setSelected] = useState("Avocado");
  // Fetch from API in real system; here just demo
  const market = DEMO_MARKET[selected] || [];
  const trace = TRACEABILITY[selected];

  return (
    <div className="p-8" style={{background:"#101828",minHeight:"100vh"}}>
      <h1 className="text-4xl font-bold mb-8 text-cyan-400">{TXT.pageTitle}</h1>
      {/* Product Select Row */}
      <div className="flex gap-6 items-center mb-8 flex-wrap">
        <span className="text-xl font-semibold text-slate-200">{TXT.pickProduct}</span>
        {FEATURED.map(p => (
          <button key={p} className={`px-4 py-2 rounded bg-gradient-to-r from-green-400/50 to-emerald-600 text-white font-bold ${selected===p?"ring-2 ring-cyan-400 scale-110":""}`}
            onClick={()=>setSelected(p)}>
            {p}
          </button>
        ))}
        <select value={selected} onChange={e=>setSelected(e.target.value)}
          className="ml-2 px-4 py-2 rounded bg-slate-700 text-white border-cyan-400 font-bold">
          {PRODUCT_LIST.map(p=>
            <option key={p} value={p}>{p}</option>
          )}
        </select>
      </div>

      {/* Chart and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Price/Volume Chart */}
        <div className="col-span-2 bg-slate-900 rounded-xl p-6 shadow" style={{minHeight:"350px"}}>
          <h2 className="text-2xl font-bold text-cyan-300 mb-4">{TXT.chartTitle} â€“ {selected}</h2>
          {market.length === 0 ? (
            <div className="text-2xl text-red-400 mt-12">{TXT.noData} <b>{selected}</b></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={market}>
                <CartesianGrid stroke="#334155"/>
                <XAxis dataKey="date" stroke="#e0e8ea"/>
                <YAxis yAxisId="left" stroke="#10b981" label={{value:TXT.price,angle:-90,position:"insideLeft",fill:"#10b981"}}/>
                <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" label={{value:TXT.volume,angle:90,position:"insideRight",fill:"#38bdf8"}}/>
                <Tooltip />
                <Line type="monotone" dataKey="price" name={TXT.price} stroke="#10b981" strokeWidth={3} yAxisId="left"/>
                <Line type="monotone" dataKey="volume" name={TXT.volume} stroke="#38bdf8" strokeWidth={2} yAxisId="right" dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Traceability Panel */}
        <div className="bg-gradient-to-br from-cyan-900 to-green-800 rounded-xl p-6 shadow text-white">
          <h2 className="text-xl font-bold mb-4">{TXT.trace} â€“ {selected}</h2>
          {trace ? (
            <>
              <div className="mb-2"><b>{TXT.origin}:</b> {trace.origin}</div>
              <div className="mb-2"><b>{TXT.corridor}:</b> {trace.corridor}</div>
              <div className="mb-2"><b>{TXT.audit}:</b> {trace.lastAudit}</div>
              <div className="mb-2"><b>{TXT.exporter}:</b> {trace.exporter}</div>
              <div className="mb-2"><b>{TXT.certs}:</b> {trace.certifications.join(", ")}</div>
              <div className="mb-2"><b>{TXT.active}</b></div>
            </>
          ) : (
            <span className="text-yellow-200">No traceability profile</span>
          )}
        </div>
      </div>
    </div>
  );
}
