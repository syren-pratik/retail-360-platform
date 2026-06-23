'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { MerchDemandFullPayload, MerchDemandAnomaly } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

const ANCHOR = '2026-05-17';

const SEVERITY_COLOR: Record<string, string> = {
  open:          '#F43F5E',
  investigating: '#F59E0B',
  confirmed:     '#F43F5E',
  dismissed:     '#94A3B8',
};

const SEVERITY_LABEL: Record<MerchDemandAnomaly['status'], string> = {
  open:          'Open',
  investigating: 'Investigating',
  confirmed:     'Confirmed',
  dismissed:     'Dismissed',
};

const SEVERITY_BADGE: Record<MerchDemandAnomaly['status'], string> = {
  open:          'badge-negative',
  investigating: 'badge-warning',
  confirmed:     'badge-negative',
  dismissed:     'badge-neutral',
};

const INSIGHTS = [
  { headline: '18 anomalies detected this period', detail: 'Dairy & Frozen has the most (6). All flagged for investigation.', severity: 'warning' as const },
  { headline: 'Ice Cream anomaly — weather link', detail: 'Demand 28% below forecast. Correlated with 3°C temperature drop in North India stores.', severity: 'negative' as const },
  { headline: 'Salt demand spike — unexplained', detail: 'Rock Salt +45% above forecast with no festival or weather trigger. Check for data quality issue.', severity: 'negative' as const },
  { headline: 'Most anomalies self-resolving', detail: '12 of 18 past anomalies resolved within 7 days without intervention. Consider higher snooze threshold.', severity: 'neutral' as const },
];

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

interface Props {
  core: MerchDemandFullPayload;
  precomputed: MerchDemandFullPayload['precomputed'] | null;
}

export default function AnomaliesTab({ core, precomputed }: Props) {
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const sortedAnomalies = useMemo(
    () => [...core.anomalies].sort((a, b) => b.detected_date.localeCompare(a.detected_date)),
    [core.anomalies],
  );

  const selectedAnomaly = selectedAnomalyId
    ? sortedAnomalies.find((a) => a.anomaly_id === selectedAnomalyId) ?? null
    : null;

  // Total demand baseline for the timeline
  const timelineData = useMemo(() => {
    const precomp = precomputed?.departments?.['all']?.['14'];
    if (precomp?.subcategory_chart.chart_points.length) {
      return precomp.subcategory_chart.chart_points.map((p) => ({
        date: p.date as string,
        total: p.total as number ?? 0,
      }));
    }
    // Fallback synthetic data
    return Array.from({ length: 60 }, (_, i) => ({
      date: addDays(ANCHOR, i - 45),
      total: 8000 + seededNoise(i * 3) * 3000,
    }));
  }, [precomputed]);

  const anomalyDates = useMemo(
    () => new Set(sortedAnomalies.map((a) => a.detected_date)),
    [sortedAnomalies],
  );

  const selectedSKU = selectedAnomaly
    ? core.skus.find((s) => s.sku_id === selectedAnomaly.sku_id)
    : null;

  const similarAnomalies = useMemo(() => {
    if (!selectedAnomaly) return [];
    return sortedAnomalies
      .filter((a) => a.anomaly_id !== selectedAnomaly.anomaly_id &&
        (a.sku_id === selectedAnomaly.sku_id || selectedSKU?.category === core.skus.find((s) => s.sku_id === a.sku_id)?.category))
      .slice(0, 3);
  }, [selectedAnomaly, sortedAnomalies, selectedSKU, core.skus]);

  const tickFmt = (val: string) => {
    if (!val) return '';
    const dt = new Date(val + 'T00:00:00');
    return `${dt.getDate()} ${dt.toLocaleDateString('en-IN', { month: 'short' })}`;
  };

  return (
    <div className="space-y-6">
      {/* Anomaly timeline chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Anomaly Timeline</p>
          <AIInsightButton id="merch-dd-anomaly-timeline" title="Anomaly Timeline" data={timelineData as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">Total demand with anomaly markers · click to inspect</p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timelineData} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                interval={Math.max(1, Math.ceil(timelineData.length / 10))}
                tickFormatter={tickFmt}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v))}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip formatter={(v: unknown) => [Math.round(Number(v)).toLocaleString('en-IN'), 'Total demand']} contentStyle={{ fontSize: 11 }} cursor={{ stroke: '#E2E8F0' }} />
              <Line
                dataKey="total"
                stroke="var(--chart-slate)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                opacity={0.5}
              />
              {sortedAnomalies.map((anomaly) => {
                const isSelected = selectedAnomalyId === anomaly.anomaly_id;
                const isInWindow = timelineData.some((d) => d.date === anomaly.detected_date);
                if (!isInWindow && !anomalyDates.has(anomaly.detected_date)) return null;
                return (
                  <ReferenceLine
                    key={anomaly.anomaly_id}
                    x={anomaly.detected_date}
                    stroke={isSelected ? '#1D4ED8' : SEVERITY_COLOR[anomaly.status]}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? undefined : '4 2'}
                    onClick={() => setSelectedAnomalyId(isSelected ? null : anomaly.anomaly_id)}
                    style={{ cursor: 'pointer' }}
                    label={{
                      value: core.skus.find((s) => s.sku_id === anomaly.sku_id)?.product_name?.split(' ')[0] ?? anomaly.sku_id,
                      position: 'top',
                      fontSize: 9,
                      fill: isSelected ? '#1D4ED8' : SEVERITY_COLOR[anomaly.status],
                    }}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-panel: table + detail */}
      <div className="grid grid-cols-3 gap-6">
        {/* Anomaly table (col-span-2) */}
        <div className="col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              All Anomalies
              <span className="ml-2 text-xs font-normal text-[var(--text-tertiary)]">{sortedAnomalies.length} detected</span>
            </p>
            <AIInsightButton id="merch-dd-all-anomalies" title="All Anomalies" data={sortedAnomalies as unknown as Record<string, unknown>[]} />
          </div>
          <div className="overflow-auto" style={{ maxHeight: 480 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-[var(--border-default)]">
                <tr className="text-[var(--text-tertiary)]">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">SKU</th>
                  <th className="text-left px-4 py-2.5 font-medium">Category</th>
                  <th className="text-right px-4 py-2.5 font-medium">Deviation</th>
                  <th className="text-center px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sortedAnomalies.map((anomaly) => {
                  const sku = core.skus.find((s) => s.sku_id === anomaly.sku_id);
                  const isSelected = selectedAnomalyId === anomaly.anomaly_id;
                  return (
                    <tr
                      key={anomaly.anomaly_id}
                      onClick={() => setSelectedAnomalyId(isSelected ? null : anomaly.anomaly_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--accent-primary-light)] border-l-2 border-l-[var(--accent-primary)]'
                          : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-[var(--text-tertiary)]">{anomaly.detected_date}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[var(--text-primary)] truncate max-w-[160px]">{sku?.product_name ?? anomaly.sku_id}</p>
                        <p className="text-[9px] text-[var(--text-tertiary)] font-mono mt-0.5">{anomaly.sku_id}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{sku?.category ?? '—'}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                        Math.abs(anomaly.deviation_pct) >= 20 ? 'text-rose-600' :
                        Math.abs(anomaly.deviation_pct) >= 10 ? 'text-amber-600' :
                        'text-[var(--text-secondary)]'
                      }`}>
                        {anomaly.deviation_pct > 0 ? '+' : ''}{anomaly.deviation_pct.toFixed(0)}%
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`badge ${SEVERITY_BADGE[anomaly.status]} text-[9px]`}>
                          {SEVERITY_LABEL[anomaly.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Anomaly detail (col-span-1) */}
        <div className="card">
          {selectedAnomaly && selectedSKU ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedSKU.product_name}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">{selectedAnomaly.sku_id}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selectedAnomaly.detected_date}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Deviation</p>
                  <p className={`text-xl font-bold tabular-nums ${
                    Math.abs(selectedAnomaly.deviation_pct) >= 20 ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {selectedAnomaly.deviation_pct > 0 ? '+' : ''}{selectedAnomaly.deviation_pct.toFixed(0)}%
                  </p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                  <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Confidence</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedAnomaly.hypothesis_confidence}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] mb-1">Hypothesis</p>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">{selectedAnomaly.hypothesis}</p>
              </div>

              {similarAnomalies.length > 0 && (
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] mb-2">Similar past anomalies</p>
                  <div className="space-y-1.5">
                    {similarAnomalies.map((a) => (
                      <div key={a.anomaly_id} className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)] truncate mr-2">{a.detected_date}</span>
                        <span className={`tabular-nums font-medium flex-shrink-0 ${a.deviation_pct > 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                          {a.deviation_pct > 0 ? '+' : ''}{a.deviation_pct.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button className="w-full px-3 py-1.5 text-xs font-medium text-white bg-[var(--accent-primary)] rounded-md hover:opacity-90 transition-opacity">
                  Investigate
                </button>
                <button className="w-full px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors">
                  Mark Resolved
                </button>
                <button className="w-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
                  Add to Watch List
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-[var(--text-tertiary)] text-center leading-relaxed px-4">
              Click a row or timeline marker to inspect an anomaly
            </div>
          )}
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
