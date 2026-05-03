'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import type { SupplierOTIFData, SupplierRecord } from './InventoryDashboardContent';

interface Props {
  data: SupplierOTIFData | null;
}

type SortKey = 'otif_pct' | 'fill_rate_pct' | 'avg_delay_days' | 'order_value_cr' | 'stockouts_caused';

const TREND_STYLES: Record<string, string> = {
  improving: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  stable: 'text-gray-600 bg-gray-50 border-gray-200',
  declining: 'text-red-600 bg-red-50 border-red-200',
};

const TREND_ICONS: Record<string, string> = {
  improving: '↑',
  stable: '→',
  declining: '↓',
};

function otifColor(pct: number): string {
  if (pct >= 90) return '#10B981';
  if (pct >= 80) return '#F59E0B';
  return '#EF4444';
}

export default function SupplierOTIF({ data }: Props) {
  const [tab, setTab] = useState<'league' | 'scatter' | 'delays' | 'trend'>('league');
  const [sortKey, setSortKey] = useState<SortKey>('otif_pct');
  const [sortAsc, setSortAsc] = useState(false);

  const suppliers = data?.suppliers ?? [];
  const delayReasons = data?.delay_reasons ?? [];
  const monthly = data?.monthly_otif_vs_stockouts ?? [];

  const sorted = useMemo(() => {
    return [...suppliers].sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? diff : -diff;
    });
  }, [suppliers, sortKey, sortAsc]);

  const scatterData = suppliers.map(s => ({
    name: s.name,
    x: s.order_value_cr,
    y: s.otif_pct,
    z: s.stockouts_caused * 3 + 20,
    otif: s.otif_pct,
    stockouts: s.stockouts_caused,
    category: s.category,
  }));

  const delayChartData = delayReasons.map(d => ({
    name: d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name,
    fullName: d.name,
    manufacturing: d.manufacturing_pct,
    logistics: d.logistics_pct,
    quality: d.quality_pct,
    documentation: d.documentation_pct,
    no_reason: d.no_reason_pct,
  }));

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortHeader({ colKey, label, cls = '' }: { colKey: SortKey; label: string; cls?: string }) {
    return (
      <button
        className={`text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide hover:text-[var(--text-primary)] transition-colors ${cls}`}
        onClick={() => toggleSort(colKey)}
      >
        {label}{sortKey === colKey ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </button>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Supplier Performance</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            OTIF, fill rate, and delay analysis across {suppliers.length} suppliers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'league', label: 'League Table' },
          { key: 'scatter', label: 'Value vs OTIF' },
          { key: 'delays', label: 'Delay Reasons' },
          { key: 'trend', label: 'OTIF Trend' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              tab === t.key
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* League table */}
      {tab === 'league' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                <th className="text-left px-3 py-2 font-medium text-[var(--text-secondary)]">Supplier</th>
                <th className="px-3 py-2 text-right"><SortHeader colKey="otif_pct" label="OTIF%" /></th>
                <th className="px-3 py-2 text-right"><SortHeader colKey="fill_rate_pct" label="Fill%" /></th>
                <th className="px-3 py-2 text-right"><SortHeader colKey="avg_delay_days" label="Avg Delay" /></th>
                <th className="px-3 py-2 text-right"><SortHeader colKey="order_value_cr" label="Value" /></th>
                <th className="px-3 py-2 text-right"><SortHeader colKey="stockouts_caused" label="OOS caused" /></th>
                <th className="px-3 py-2 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {sorted.map((s: SupplierRecord) => (
                <tr key={s.supplier_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-3 py-2">
                    <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{s.category}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className="font-semibold tabular-nums"
                      style={{ color: otifColor(s.otif_pct) }}
                    >
                      {s.otif_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${s.fill_rate_pct >= 95 ? 'text-emerald-600' : s.fill_rate_pct >= 88 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.fill_rate_pct.toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${s.avg_delay_days <= 1 ? 'text-emerald-600' : s.avg_delay_days <= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.avg_delay_days.toFixed(1)}d
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)]">₹{s.order_value_cr.toFixed(1)}Cr</td>
                  <td className={`px-3 py-2 text-right font-medium ${s.stockouts_caused === 0 ? 'text-emerald-600' : s.stockouts_caused <= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.stockouts_caused}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${TREND_STYLES[s.trend]}`}>
                      {TREND_ICONS[s.trend]} {s.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scatter: order value vs OTIF */}
      {tab === 'scatter' && (
        <div>
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="x"
                  name="Order Value"
                  type="number"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Order Value (₹Cr)', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: '#9CA3AF' } }}
                />
                <YAxis
                  dataKey="y"
                  name="OTIF%"
                  type="number"
                  domain={[60, 100]}
                  tick={{ fontSize: 10 }}
                  label={{ value: 'OTIF %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9CA3AF' } }}
                />
                <ZAxis dataKey="z" range={[40, 200]} />
                <ReferenceLine y={80} stroke="#F59E0B" strokeDasharray="4 2" />
                <ReferenceLine y={90} stroke="#10B981" strokeDasharray="4 2" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-sm text-xs">
                        <p className="font-semibold text-[var(--text-primary)]">{d.name}</p>
                        <p className="text-[var(--text-secondary)]">{d.category}</p>
                        <p>OTIF: <span className="font-medium" style={{ color: otifColor(d.otif) }}>{d.otif.toFixed(1)}%</span></p>
                        <p>Order Value: ₹{d.x.toFixed(1)}Cr</p>
                        <p>Stockouts caused: {d.stockouts}</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={scatterData}
                  fill="#6366F1"
                  fillOpacity={0.7}
                  shape={(props: { cx?: number; cy?: number; payload?: { otif: number }; r?: number }) => {
                    const { cx = 0, cy = 0, payload, r = 8 } = props;
                    const color = otifColor(payload?.otif ?? 0);
                    return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1} />;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            {/* Quadrant labels */}
            <div className="absolute top-4 left-24 text-[10px] text-emerald-600 font-medium opacity-60">High Value · High OTIF</div>
            <div className="absolute bottom-10 left-24 text-[10px] text-red-500 font-medium opacity-60">High Value · Low OTIF ⚠</div>
          </div>
        </div>
      )}

      {/* Delay reasons */}
      {tab === 'delays' && (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={delayChartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [`${(v as number).toFixed(1)}%`, String(name).replace('_', ' ')]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(_: unknown, payload: readonly any[]) =>
                  payload?.[0]?.payload?.fullName ?? ''
                }
              />
              <Bar dataKey="manufacturing" name="manufacturing" stackId="a" fill="#6366F1" />
              <Bar dataKey="logistics" name="logistics" stackId="a" fill="#F59E0B" />
              <Bar dataKey="quality" name="quality" stackId="a" fill="#EF4444" />
              <Bar dataKey="documentation" name="documentation" stackId="a" fill="#10B981" />
              <Bar dataKey="no_reason" name="no_reason" stackId="a" fill="#D1D5DB" radius={[0, 3, 3, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center gap-3 justify-center mt-2">
            {[
              { label: 'Manufacturing', color: '#6366F1' },
              { label: 'Logistics', color: '#F59E0B' },
              { label: 'Quality', color: '#EF4444' },
              { label: 'Documentation', color: '#10B981' },
              { label: 'No Reason', color: '#D1D5DB' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                <span className="text-[10px] text-[var(--text-secondary)]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OTIF vs Stockouts trend */}
      {tab === 'trend' && (
        <div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[70, 100]} label={{ value: 'OTIF %', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#9CA3AF' } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: 'Stockouts', angle: 90, position: 'insideRight', style: { fontSize: 9, fill: '#9CA3AF' } }} />
                <Tooltip formatter={(v: unknown, name: unknown) => [
                  name === 'otif_pct' ? `${(v as number).toFixed(1)}%` : (v as number).toFixed(0),
                  name === 'otif_pct' ? 'OTIF' : 'Stockout Count',
                ]} />
                <ReferenceLine yAxisId="left" y={80} stroke="#F59E0B" strokeDasharray="4 2" />
                <Bar yAxisId="right" dataKey="stockout_count" name="stockout_count" fill="#FEE2E2" radius={[3, 3, 0, 0]} />
                <Line yAxisId="left" dataKey="otif_pct" name="otif_pct" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366F1' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 justify-center mt-2">
            <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-indigo-500" /><span className="text-[10px] text-[var(--text-secondary)]">OTIF % (left axis)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" /><span className="text-[10px] text-[var(--text-secondary)]">Stockout Count (right axis)</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
