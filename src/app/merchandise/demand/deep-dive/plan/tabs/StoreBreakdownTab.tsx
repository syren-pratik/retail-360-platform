'use client';

import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ANCHOR = '2026-05-17'

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const TYPE_COLORS: Record<string, string> = {
  Express: 'var(--chart-blue)',
  Hypermarket: 'var(--chart-rose)',
  Supermarket: 'var(--chart-emerald)',
  'Dark Store': 'var(--chart-amber)',
  'Kirana Partner': 'var(--chart-slate)',
};

const TYPE_BASE_VARIANCE: Record<string, number> = {
  Express: -2.1,
  Hypermarket: 1.8,
  Supermarket: -3.4,
  'Dark Store': 0.4,
  'Kirana Partner': -1.2,
};

const TYPE_SKU_COUNT: Record<string, number> = {
  Express: 180,
  Hypermarket: 380,
  Supermarket: 250,
  'Dark Store': 120,
  'Kirana Partner': 80,
};

const STATUS_BADGE: Record<string, string> = {
  on_track: 'badge-positive',
  at_risk: 'badge-warning',
  will_miss: 'badge-negative',
  will_beat: 'badge-positive',
};

const STATUS_LABEL: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  will_miss: 'Will Miss',
  will_beat: 'Will Beat',
};

const INSIGHTS = [
  {
    headline: 'Supermarkets average -3.4% variance — most at-risk format',
    detail:
      'Supermarket format is consistently underperforming. Investigate pricing and assortment gaps.',
    severity: 'negative' as const,
  },
  {
    headline: 'Hypermarkets outperforming plan at +1.8%',
    detail:
      'Larger formats are benefiting from Eid preparation shopping. Strong festival category performance.',
    severity: 'positive' as const,
  },
  {
    headline: 'Dark Stores nearly on plan at +0.4%',
    detail:
      'Predictable online fulfillment demand. Dark Store format shows the most stable performance.',
    severity: 'positive' as const,
  },
  {
    headline: 'Express stores need attention',
    detail:
      'Express format (-2.1% avg) suffering from range limitations. Consider temporary range expansion for festival period.',
    severity: 'warning' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function StoreBreakdownTab({ core }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const storeData = useMemo(
    () =>
      core.stores
        .map((store, i) => {
          const baseVar = TYPE_BASE_VARIANCE[store.store_type] ?? -1.5;
          const variance = baseVar + seededNoise(i * 11) * 6 - 3;
          const skuCount = TYPE_SKU_COUNT[store.store_type] ?? 150;
          const plan = skuCount * 500 * 120;
          const forecast = plan * (1 + variance / 100);
          let status: 'will_beat' | 'on_track' | 'at_risk' | 'will_miss';
          if (variance > 5) status = 'will_beat';
          else if (variance > -1) status = 'on_track';
          else if (variance > -5) status = 'at_risk';
          else status = 'will_miss';
          return {
            store,
            variance: Number(variance.toFixed(1)),
            skuCount,
            plan,
            forecast,
            status,
          };
        })
        .sort((a, b) => a.variance - b.variance),
    [core.stores],
  );

  const filteredStoreData = useMemo(() => {
    if (typeFilter === 'all') return storeData;
    return storeData.filter((d) => d.store.store_type === typeFilter);
  }, [storeData, typeFilter]);

  const storeTypes = Array.from(new Set(core.stores.map((s) => s.store_type))).sort();

  return (
    <div className="space-y-6">
      {/* Layout: scatter + table */}
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — Scatter chart */}
        <div className="col-span-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Store Size vs Variance
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Each dot is a store — x-axis: SKU count, y-axis: variance vs plan
              </p>
            </div>
            <AIInsightButton id="merch-dd-store-size-vs-variance" title="Store Size vs Variance" data={storeData.map((d) => ({ store: d.store.store_name, city: d.store.city, type: d.store.store_type, skuCount: d.skuCount, variance: d.variance })) as unknown as Record<string, unknown>[]} />
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                type="number"
                dataKey="x"
                name="Store Size (SKU count)"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                label={{
                  value: 'Store Size (SKU count)',
                  position: 'insideBottom',
                  offset: -20,
                  style: { fontSize: 10, fill: '#94A3B8' },
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Variance vs Plan (%)"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                width={44}
                label={{
                  value: 'Variance vs Plan (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 8,
                  style: { fontSize: 10, fill: '#94A3B8' },
                }}
              />
              <ReferenceLine
                y={0}
                stroke="#CBD5E1"
                strokeDasharray="4 2"
                label={{
                  value: 'On Plan',
                  position: 'right',
                  style: { fontSize: 9, fill: '#94A3B8' },
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const p = payload[0]?.payload as {
                    x: number;
                    y: number;
                    name: string;
                    city: string;
                  };
                  return (
                    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 text-xs shadow-sm">
                      <p className="font-semibold text-[var(--text-primary)]">{p.name}</p>
                      <p className="text-[var(--text-secondary)]">{p.city}</p>
                      <p
                        className={`font-semibold ${
                          p.y >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {p.y >= 0 ? '+' : ''}
                        {p.y.toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <Scatter
                  key={type}
                  name={type}
                  data={storeData
                    .filter((d) => d.store.store_type === type)
                    .map((d) => ({
                      x: d.skuCount,
                      y: d.variance,
                      name: d.store.store_name,
                      city: d.store.city,
                    }))}
                  fill={color}
                  opacity={0.8}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          {/* Store type legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-[var(--text-tertiary)]">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Store table */}
        <div className="col-span-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Store Performance
            </h3>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-[var(--border-default)] rounded-md px-2 py-1 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            >
              <option value="all">All Types</option>
              {storeTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <AIInsightButton id="merch-dd-store-performance" title="Store Performance" data={filteredStoreData as unknown as Record<string, unknown>[]} />
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    Store
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    City
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    Variance %
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStoreData.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="px-3 py-2 text-xs font-medium text-[var(--text-primary)] max-w-[120px] truncate">
                      {d.store.store_name}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                      {d.store.city}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              TYPE_COLORS[d.store.store_type] ?? '#94A3B8',
                          }}
                        />
                        {d.store.store_type}
                      </div>
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-right tabular-nums font-semibold ${
                        d.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {d.variance >= 0 ? '+' : ''}
                      {d.variance.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`badge ${STATUS_BADGE[d.status]} text-[10px]`}>
                        {STATUS_LABEL[d.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
