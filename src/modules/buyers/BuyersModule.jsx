import React, { useState, useMemo } from "react";
import { BUYERS } from "./buyersData";

/**
 * BuyersModule
 * - Simple searchable buyers network UI
 * - Replace BUYERS dataset with your full 52-buyer list
 */

export default function BuyersModule() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  const regions = useMemo(() => Array.from(new Set(BUYERS.map(b => b.country))).sort(), []);
  const categories = useMemo(() => {
    const s = new Set();
    BUYERS.forEach(b => b.categories.forEach(c => s.add(c)));
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    return BUYERS.filter(b => {
      const matchesQ = !q || b.name.toLowerCase().includes(q.toLowerCase()) || (b.contact?.name && b.contact.name.toLowerCase().includes(q.toLowerCase()));
      const matchesRegion = region === "all" || b.country === region;
      const matchesCategory = category === "all" || b.categories.includes(category);
      return matchesQ && matchesRegion && matchesCategory;
    });
  }, [q, region, category]);

  return (
    <div className="p-6">
      <header className="mb-4">
        <h2 className="text-2xl font-bold">Buyer Network</h2>
        <p className="text-sm text-gray-400">Search the buyer network (imported Latin America buyers).</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input placeholder="Search by buyer or contact..." value={q} onChange={(e)=>setQ(e.target.value)} className="p-2 rounded bg-[#0f1116]/40 md:col-span-2" />
        <select value={region} onChange={(e)=>setRegion(e.target.value)} className="p-2 rounded bg-[#0f1116]/40">
          <option value="all">All Countries</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={category} onChange={(e)=>setCategory(e.target.value)} className="p-2 rounded bg-[#0f1116]/40">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="p-4 rounded border border-gray-700 bg-white/5 cursor-pointer" onClick={() => setSelectedBuyer(b)}>
              <div className="flex justify-between">
                <div>
                  <div className="font-bold text-lg">{b.name}</div>
                  <div className="text-xs text-gray-400">{b.city}, {b.country}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-green-600">{b.categories.join(", ")}</div>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-300">{b.notes}</div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-6 bg-white/5 rounded border border-gray-700 text-center text-gray-400">
              No buyers found â€” try different filters
            </div>
          )}
        </div>

        <aside className="bg-white/5 p-4 rounded border border-gray-700">
          {!selectedBuyer ? (
            <div>
              <div className="text-sm text-gray-300 mb-2">Select a buyer to view contact details</div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold">{selectedBuyer.name}</h3>
              <div className="text-sm text-gray-400 mb-2">{selectedBuyer.city}, {selectedBuyer.country}</div>
              <div className="text-sm mb-2"><strong>Categories:</strong> {selectedBuyer.categories.join(", ")}</div>
              <div className="text-sm mb-2"><strong>Contact:</strong> {selectedBuyer.contact?.name}</div>
              <div className="text-sm mb-2"><strong>Phone:</strong> <a href={`tel:${selectedBuyer.contact?.phone}`} className="text-green-500">{selectedBuyer.contact?.phone}</a></div>
              <div className="text-sm mb-2"><strong>Email:</strong> <a href={`mailto:${selectedBuyer.contact?.email}`} className="text-green-500">{selectedBuyer.contact?.email}</a></div>
              <div className="mt-3">
                <button className="w-full bg-green-600 text-white px-3 py-2 rounded">Start Deal / Request Quote</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
