'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

type Region = 'North' | 'South' | 'East' | 'West';

const REGIONAL_DATA: Record<Region, { demand_index: number; mape: number; status: 'on_track' | 'at_risk' }> = {
  North: { demand_index: 1.12, mape: 14.2, status: 'on_track' },
  South: { demand_index: 0.97, mape: 16.8, status: 'at_risk' },
  East:  { demand_index: 0.94, mape: 17.2, status: 'at_risk' },
  West:  { demand_index: 1.08, mape: 15.1, status: 'on_track' },
};

const CITY_DATA: Record<Region, { city: string; demand_index: number }[]> = {
  North: [
    { city: 'Delhi NCR', demand_index: 1.18 },
    { city: 'Lucknow', demand_index: 1.14 },
    { city: 'Chandigarh', demand_index: 1.06 },
    { city: 'Jaipur', demand_index: 1.09 },
  ],
  South: [
    { city: 'Bengaluru', demand_index: 1.02 },
    { city: 'Chennai', demand_index: 0.93 },
    { city: 'Hyderabad', demand_index: 0.98 },
    { city: 'Kochi', demand_index: 0.95 },
  ],
  East: [
    { city: 'Kolkata', demand_index: 0.91 },
    { city: 'Bhubaneswar', demand_index: 0.96 },
    { city: 'Patna', demand_index: 0.98 },
  ],
  West: [
    { city: 'Mumbai', demand_index: 1.11 },
    { city: 'Pune', demand_index: 1.08 },
    { city: 'Ahmedabad', demand_index: 1.10 },
    { city: 'Surat', demand_index: 1.04 },
  ],
};

const STATUS_BADGE: Record<'on_track' | 'at_risk', string> = {
  on_track: 'badge-positive',
  at_risk:  'badge-warning',
};

const INSIGHTS = [
  { headline: 'North India driving demand growth', detail: 'Delhi NCR and Lucknow showing +12% above plan. South India tracking -3% below.', severity: 'positive' as const },
  { headline: 'Mumbai weather impact', detail: 'Pre-monsoon heat driving Beverages +22% in Mumbai stores.', severity: 'warning' as const },
  { headline: 'Tier-2 cities outperforming', detail: 'Jaipur and Ahmedabad Tier-2 stores beating forecast by 8pp — higher than Tier-1 average.', severity: 'positive' as const },
  { headline: 'East India lag', detail: 'Kolkata stores tracking 6% below forecast. Investigate local competitor activity.', severity: 'negative' as const },
];

// Deterministic pseudo-random noise for store mock data
function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface Props {
  core: MerchDemandFullPayload;
}

export default function GeographyTab({ core }: Props) {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [storeSearch, setStoreSearch] = useState('');

  const regions = Object.keys(REGIONAL_DATA) as Region[];

  const storeRows = useMemo(() => {
    return core.stores.map((store, i) => {
      const base = 1200;
      const typeFactor = store.store_type === 'Hypermarket' ? 2.2 : store.store_type === 'Supermarket' ? 1.4 : 0.8;
      const noise = 0.85 + seededNoise(i * 13) * 0.3;
      const forecast = Math.round(base * typeFactor * 100);
      const actual = Math.round(forecast * noise);
      const variance = ((actual - forecast) / forecast) * 100;
      const mape = Math.abs(variance) * 0.6 + 8 + seededNoise(i * 7) * 6;
      return { store, forecast, actual, variance, mape };
    }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [core.stores]);

  const filteredStores = storeRows.filter((r) => {
    const q = storeSearch.toLowerCase();
    return !q || r.store.store_name.toLowerCase().includes(q) || r.store.city.toLowerCase().includes(q);
  });

  const cityData = selectedRegion ? CITY_DATA[selectedRegion] : [];

  const selectStyle = "text-xs border border-[var(--border-default)] rounded-md px-2 py-1 bg-white text-[var(--text-primary)]";

  return (
    <div className="space-y-6">
      {/* Regional panels */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: regional table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Regional Performance</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Click a region to drill into city breakdown</p>
            </div>
            <AIInsightButton id="merch-dd-regional-performance" title="Regional Performance" data={regions.map((region) => ({ region, ...REGIONAL_DATA[region] })) as unknown as Record<string, unknown>[]} />
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)]">
                <th className="text-left px-5 py-2.5 font-medium">Region</th>
                <th className="text-right px-4 py-2.5 font-medium">Stores</th>
                <th className="text-right px-4 py-2.5 font-medium">vs Forecast</th>
                <th className="text-right px-4 py-2.5 font-medium">MAPE</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((region) => {
                const data = REGIONAL_DATA[region];
                const stores = core.stores.filter((s) => s.region === region).length;
                const vsFC = (data.demand_index - 1) * 100;
                const isSelected = selectedRegion === region;
                return (
                  <tr
                    key={region}
                    onClick={() => setSelectedRegion(isSelected ? null : region)}
                    className={`border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--accent-primary-light)]' : 'hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />}
                        {region}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">{stores}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${vsFC >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {vsFC >= 0 ? '+' : ''}{vsFC.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">{data.mape.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${STATUS_BADGE[data.status]} text-[10px]`}>
                        {data.status === 'on_track' ? 'On Track' : 'At Risk'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: city breakdown */}
        <div className="card">
          {selectedRegion ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedRegion} — City Breakdown</p>
                <AIInsightButton id="merch-dd-city-breakdown" title={`${selectedRegion} — City Breakdown`} data={cityData as unknown as Record<string, unknown>[]} />
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mb-4">Demand index vs forecast (1.0 = on plan)</p>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0.8, 1.3]}
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(v: number) => v.toFixed(2)}
                    />
                    <YAxis
                      type="category"
                      dataKey="city"
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <ReferenceLine x={1.0} stroke="#94A3B8" strokeDasharray="4 3" label={{ value: 'Plan', position: 'top', fontSize: 9, fill: '#94A3B8' }} />
                    <Tooltip
                      formatter={(v: unknown) => [`${Number(v).toFixed(2)}x`, 'Demand index']}
                      contentStyle={{ fontSize: 11 }}
                      cursor={{ fill: '#F1F5F9' }}
                    />
                    <Bar dataKey="demand_index" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                      {cityData.map((d, i) => (
                        <Cell key={i} fill={d.demand_index >= 1 ? 'var(--chart-emerald)' : 'var(--chart-rose)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-[var(--text-tertiary)]">
              Select a region to see city breakdown
            </div>
          )}
        </div>
      </div>

      {/* Store-level table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Store-Level Performance</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Sorted by absolute variance · all {core.stores.length} stores</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search store or city…"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              className={`${selectStyle} w-48`}
            />
            <AIInsightButton id="merch-dd-store-level-performance" title="Store-Level Performance" data={filteredStores as unknown as Record<string, unknown>[]} />
          </div>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 380 }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)]">
                <th className="text-left px-5 py-2.5 font-medium">Store</th>
                <th className="text-left px-4 py-2.5 font-medium">City</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-right px-4 py-2.5 font-medium">Forecast (units)</th>
                <th className="text-right px-4 py-2.5 font-medium">Actual (units)</th>
                <th className="text-right px-4 py-2.5 font-medium">MAPE</th>
                <th className="text-right px-4 py-2.5 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredStores.map((r) => (
                <tr key={r.store.store_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-5 py-2.5 font-medium text-[var(--text-primary)] truncate max-w-[160px]">{r.store.store_name}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.store.city}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.store.store_type}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{r.forecast.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-primary)] font-medium">{r.actual.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">{r.mape.toFixed(1)}%</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${r.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.variance >= 0 ? '+' : ''}{r.variance.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
