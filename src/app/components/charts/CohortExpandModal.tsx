'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';
import { X, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CohortDetailData, CohortHeatmapRow } from '@/app/lib/types';
import { formatMoneyAuto, formatMoneyPlainAuto } from '@/app/lib/format-money';

type TabId = 'heatmap' | 'comparison' | 'revenue' | 'channel' | 'leading' | 'shapes';
type HeatmapMode = 'transaction' | 'revenue';

const COHORT_COLORS = [
  '#1d4ed8','#16a34a','#d97706','#dc2626','#7c3aed',
  '#0891b2','#be185d','#65a30d','#ea580c','#0f766e',
  '#7e22ce','#b45309',
];

const CHANNEL_COLORS = { Paid: '#ef4444', Organic: '#16a34a', Referral: '#6366f1' };
const SHAPE_META: Record<string, { label: string; bg: string; border: string }> = {
  smile:      { label: 'Smile Curve',  bg: 'bg-green-50',  border: 'border-green-200' },
  cliff:      { label: 'Cliff',        bg: 'bg-red-50',    border: 'border-red-200' },
  plateau:    { label: 'Plateau',      bg: 'bg-green-50',  border: 'border-green-200' },
  slow_bleed: { label: 'Slow Bleed',   bg: 'bg-amber-50',  border: 'border-amber-200' },
};

function fmtInr(n: number) {
  return formatMoneyAuto(n);
}

function getHeatColor(v: number, isRevenue = false): string {
  if (isRevenue && v > 100) return '#14532d';
  if (v >= 90) return '#1a3a5c';
  if (v >= 80) return '#2a5a8c';
  if (v >= 70) return '#3a7abc';
  if (v >= 60) return '#7ab4e4';
  if (v >= 50) return '#b4d8f2';
  return '#deedf8';
}
function getHeatText(v: number): string { return v >= 75 ? '#ffffff' : '#1a3a5c'; }

// Build period keys present in heatmap rows
function getPeriodKeys(rows: CohortHeatmapRow[]): string[] {
  const keys: string[] = [];
  for (let i = 0; i <= 11; i++) {
    const k = `m${i}`;
    if (rows.some(r => r[k] !== undefined)) keys.push(k);
  }
  return keys;
}

interface Props {
  data: CohortDetailData;
  onClose: () => void;
}

export default function CohortExpandModal({ data, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('heatmap');
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('transaction');
  const [highlightCohort, setHighlightCohort] = useState<string | null>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [handleClose]);

  const { summary, retention_heatmap, revenue_retention, cohort_quality, by_channel,
    cumulative_revenue, leading_indicator, insights } = data;

  const heatRows = heatmapMode === 'transaction' ? retention_heatmap : revenue_retention;
  const periodKeys = getPeriodKeys(heatRows);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'heatmap',   label: 'Heatmap' },
    { id: 'comparison',label: 'Compare Cohorts' },
    { id: 'revenue',   label: 'Revenue & Payback' },
    { id: 'channel',   label: 'By Channel' },
    { id: 'leading',   label: 'Leading Indicators' },
    { id: 'shapes',    label: 'Curve Shapes' },
  ];

  // Build line chart data for comparison tab
  const compChartData = periodKeys.map((k, i) => {
    const pt: Record<string, number | string> = { period: `M${i}` };
    retention_heatmap.forEach(row => {
      if (row[k] !== undefined) pt[row.cohort] = row[k] as number;
    });
    return pt;
  });

  // Average line
  const avgLine = periodKeys.map((k, i) => {
    const vals = retention_heatmap.map(r => r[k] as number).filter(v => v !== undefined);
    return { period: `M${i}`, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  });

  // Payback table
  const paybackRows = cumulative_revenue.map(r => {
    const ltv = (r.m11 ?? r.m9 ?? r.m6 ?? r.m3 ?? r.m0) as number;
    const ltcRatio = r.cohort_cac_total > 0 ? (ltv / r.cohort_cac_total).toFixed(1) : '—';
    return { cohort: r.cohort, cac: fmtInr(r.cohort_cac_total), m3: fmtInr((r.m3 ?? 0) as number), m6: fmtInr((r.m6 ?? 0) as number), m12: fmtInr(ltv), payback: r.cac_payback_month, ltcRatio };
  });

  const handleExport = () => {
    const rows = heatRows.map(r => ({ cohort: r.cohort, size: r.size, ...periodKeys.reduce((acc, k) => ({ ...acc, [k]: r[k] ?? '' }), {}) }));
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'cohort_retention.csv'; a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/cx360" onClick={handleClose} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={15} />
            Back to CX360
          </Link>
          <span className="text-[var(--border-default)]">|</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Cohort Retention Analysis</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] transition-colors">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-6 divide-x divide-[var(--border-subtle)] border-b border-[var(--border-default)] bg-[var(--bg-secondary)] flex-shrink-0">
        {[
          { label: 'Avg M1 Retention', value: `${summary.weighted_avg_m1}%`, sub: `${summary.m1_trend_mom > 0 ? '+' : ''}${summary.m1_trend_mom}pp MoM` },
          { label: 'Avg M6 Retention', value: `${summary.weighted_avg_m6}%`, sub: `Target: ${summary.target_m6}%` },
          { label: 'Best Cohort', value: summary.best_cohort.month, sub: `M6 = ${summary.best_cohort.m6_retention}%` },
          { label: 'Worst Cohort', value: summary.worst_cohort.month, sub: `M6 = ${summary.worst_cohort.m6_retention}%` },
          { label: 'Hitting M6 Target', value: `${summary.pct_cohorts_hitting_target}%`, sub: `of cohorts ≥${summary.target_m6}%` },
          { label: 'Avg Payback', value: `${summary.avg_payback_months} mo`, sub: 'CAC recovery' },
        ].map(k => (
          <div key={k.label} className="px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)] mb-0.5">{k.label}</p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{k.value}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[var(--border-default)] bg-white flex-shrink-0 px-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Tab 1: Heatmap ── */}
        {activeTab === 'heatmap' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              {(['transaction', 'revenue'] as HeatmapMode[]).map(m => (
                <button key={m} onClick={() => setHeatmapMode(m)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${heatmapMode === m ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {m === 'transaction' ? 'Transaction Retention' : 'Revenue Retention'}
                </button>
              ))}
              {heatmapMode === 'revenue' && <span className="text-xs text-[var(--text-tertiary)] ml-2">Revenue retention can exceed 100% when retained customers spend more (expansion revenue)</span>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap sticky left-0 bg-[var(--bg-secondary)] z-10" style={{ minWidth: 100 }}>Cohort</th>
                    <th className="text-right px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap sticky left-[100px] bg-[var(--bg-secondary)] z-10" style={{ minWidth: 70 }}>Size</th>
                    {periodKeys.map((k, i) => (
                      <th key={k} className="text-center px-1 py-2 font-semibold text-[var(--text-secondary)]" style={{ minWidth: 52 }}>M{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatRows.map((row) => (
                    <tr key={row.cohort} className="border-t border-[var(--border-subtle)]">
                      <td className="px-3 py-1.5 font-medium text-[var(--text-primary)] whitespace-nowrap sticky left-0 bg-white z-10">{row.cohort}</td>
                      <td className="px-3 py-1.5 text-right text-[var(--text-secondary)] whitespace-nowrap sticky left-[100px] bg-white z-10">{(row.size as number).toLocaleString('en-IN')}</td>
                      {periodKeys.map((k, i) => {
                        const v = row[k] as number | undefined;
                        if (v === undefined) return <td key={k} style={{ minWidth: 52, padding: '3px 2px' }} />;
                        const retained = Math.round(v / 100 * (row.size as number));
                        return (
                          <td key={k} style={{ minWidth: 52, padding: '3px 2px' }}
                            title={`${row.cohort} M${i}: ${retained.toLocaleString('en-IN')} of ${(row.size as number).toLocaleString('en-IN')} retained (${v}%)`}>
                            <div style={{ background: getHeatColor(v, heatmapMode === 'revenue'), color: getHeatText(v), borderRadius: 3, padding: '5px 4px', textAlign: 'center', fontWeight: 500 }}>
                              {v}%
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cohort Quality Table */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Cohort Quality</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      {['Cohort','Size','Paid %','Organic %','Referral %','Avg CAC','1st AOV','Campaign','Shape'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohort_quality.map(cq => {
                      const sm = SHAPE_META[cq.shape] ?? SHAPE_META.slow_bleed;
                      const shapeColors: Record<string, string> = { cliff: 'text-red-600', smile: 'text-green-600', plateau: 'text-green-600', slow_bleed: 'text-amber-600' };
                      return (
                        <tr key={cq.cohort} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                          <td className="px-3 py-2 font-medium">{cq.cohort}</td>
                          <td className="px-3 py-2">{cq.size.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2">{cq.paid_pct}%</td>
                          <td className="px-3 py-2">{cq.organic_pct}%</td>
                          <td className="px-3 py-2">{cq.referral_pct}%</td>
                          <td className="px-3 py-2">{formatMoneyPlainAuto(cq.avg_cac)}</td>
                          <td className="px-3 py-2">{formatMoneyPlainAuto(cq.first_aov)}</td>
                          <td className="px-3 py-2">{cq.campaign}</td>
                          <td className={`px-3 py-2 font-medium ${shapeColors[cq.shape] ?? ''}`}>{sm.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights */}
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900">
                  <span>{ins}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 2: Cohort Comparison ── */}
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">Retention curves for all cohorts — best (Jun 24), worst (Apr 24), and average highlighted.</p>
            <div style={{ height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compChartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 105]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={36} />
                  <Tooltip formatter={(v: unknown) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Target 70%', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                  {retention_heatmap.map((row, idx) => {
                    const isBest = row.cohort === summary.best_cohort.month;
                    const isWorst = row.cohort === summary.worst_cohort.month;
                    const isHighlighted = highlightCohort ? row.cohort === highlightCohort : (isBest || isWorst);
                    return (
                      <Line
                        key={row.cohort}
                        type="monotone"
                        dataKey={row.cohort}
                        stroke={isBest ? '#16a34a' : isWorst ? '#dc2626' : COHORT_COLORS[idx % COHORT_COLORS.length]}
                        strokeWidth={isHighlighted ? 2.5 : 1}
                        opacity={highlightCohort && row.cohort !== highlightCohort ? 0.2 : isHighlighted ? 1 : 0.5}
                        dot={false}
                        connectNulls
                      />
                    );
                  })}
                  {/* Average dashed line */}
                  <Line type="monotone" data={avgLine} dataKey="avg" name="Average" stroke="#64748b" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cohort selector */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setHighlightCohort(null)} className={`px-2 py-1 text-xs rounded border ${!highlightCohort ? 'bg-slate-700 text-white border-slate-700' : 'border-[var(--border-default)] text-[var(--text-secondary)]'}`}>All</button>
              {retention_heatmap.map((row, idx) => (
                <button key={row.cohort} onClick={() => setHighlightCohort(row.cohort === highlightCohort ? null : row.cohort)}
                  className="px-2 py-1 text-xs rounded border transition-colors"
                  style={{ borderColor: COHORT_COLORS[idx % COHORT_COLORS.length], color: highlightCohort === row.cohort ? 'white' : COHORT_COLORS[idx % COHORT_COLORS.length], background: highlightCohort === row.cohort ? COHORT_COLORS[idx % COHORT_COLORS.length] : 'transparent' }}>
                  {row.cohort}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-green-600 inline-block" /> Best (Jun 24)</span>
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-red-600 inline-block" /> Worst (Apr 24)</span>
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-slate-400 inline-block border-dashed border-t-2" /> Average</span>
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-red-400 inline-block border-dashed border-t-2" /> Target (70%)</span>
            </div>
          </div>
        )}

        {/* ── Tab 3: Revenue & Payback ── */}
        {activeTab === 'revenue' && (
          <div className="space-y-8">
            {/* Revenue Heatmap */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Revenue Retention Heatmap</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Cells above 100% indicate expansion revenue — retained customers spending more than in M0.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap sticky left-0 bg-[var(--bg-secondary)] z-10" style={{ minWidth: 100 }}>Cohort</th>
                      <th className="text-right px-3 py-2 font-semibold text-[var(--text-secondary)] sticky left-[100px] bg-[var(--bg-secondary)] z-10" style={{ minWidth: 90 }}>M0 Rev</th>
                      {getPeriodKeys(revenue_retention).filter(k => k !== 'm0').map((k, i) => (
                        <th key={k} className="text-center px-1 py-2 font-semibold text-[var(--text-secondary)]" style={{ minWidth: 52 }}>M{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revenue_retention.map(row => (
                      <tr key={row.cohort} className="border-t border-[var(--border-subtle)]">
                        <td className="px-3 py-1.5 font-medium sticky left-0 bg-white z-10">{row.cohort}</td>
                        <td className="px-3 py-1.5 text-right text-[var(--text-secondary)] sticky left-[100px] bg-white z-10">{fmtInr((row.size_revenue as number) ?? 0)}</td>
                        {getPeriodKeys(revenue_retention).filter(k => k !== 'm0').map((k) => {
                          const v = row[k] as number | undefined;
                          if (v === undefined) return <td key={k} style={{ minWidth: 52, padding: '3px 2px' }} />;
                          return (
                            <td key={k} style={{ minWidth: 52, padding: '3px 2px' }}>
                              <div style={{ background: getHeatColor(v, true), color: getHeatText(v), borderRadius: 3, padding: '5px 4px', textAlign: 'center', fontWeight: 500 }}>
                                {v > 100 ? <span title="Expansion revenue">{v}%+</span> : `${v}%`}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payback Table */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Cumulative Revenue & CAC Payback</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Cohort','Total CAC','M3 Rev','M6 Rev','M12 Rev','Payback Month','LTV:CAC'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paybackRows.map(r => (
                    <tr key={r.cohort} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-medium">{r.cohort}</td>
                      <td className="px-3 py-2">{r.cac}</td>
                      <td className="px-3 py-2">{r.m3}</td>
                      <td className="px-3 py-2">{r.m6}</td>
                      <td className="px-3 py-2">{r.m12}</td>
                      <td className={`px-3 py-2 font-semibold ${r.payback <= 2 ? 'text-green-600' : r.payback >= 4 ? 'text-red-600' : 'text-amber-600'}`}>
                        Month {r.payback}
                      </td>
                      <td className="px-3 py-2">{r.ltcRatio}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 4: By Channel ── */}
        {activeTab === 'channel' && (
          <div className="space-y-8">
            <p className="text-sm text-[var(--text-secondary)]">Referral customers retain 25–30pp better than Paid at M6. This view justifies budget reallocation.</p>
            {Object.entries(by_channel).map(([channel, rows]) => (
              <div key={channel}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: CHANNEL_COLORS[channel as keyof typeof CHANNEL_COLORS] ?? '#64748b' }}>{channel} Acquisition</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)]">
                        <th className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)]">Cohort</th>
                        <th className="text-center px-3 py-2 font-semibold text-[var(--text-secondary)]">M1</th>
                        <th className="text-center px-3 py-2 font-semibold text-[var(--text-secondary)]">M3</th>
                        <th className="text-center px-3 py-2 font-semibold text-[var(--text-secondary)]">M6</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.cohort} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                          <td className="px-3 py-1.5 font-medium">{r.cohort}</td>
                          {(['m1','m3','m6'] as const).map(k => {
                            const v = r[k as keyof typeof r] as number;
                            return (
                              <td key={k} style={{ padding: '3px 8px' }}>
                                <div style={{ background: getHeatColor(v), color: getHeatText(v), borderRadius: 3, padding: '5px 8px', textAlign: 'center', fontWeight: 500 }}>
                                  {v}%
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Channel comparison bar chart */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Avg M6 Retention by Channel</h4>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(by_channel).map(([ch, rows]) => ({
                    channel: ch,
                    avgM6: Math.round(rows.reduce((s, r) => s + r.m6, 0) / rows.length),
                  }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={36} />
                    <Tooltip formatter={(v: unknown) => [`${v}%`, 'Avg M6']} />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Target', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                    <Bar dataKey="avgM6" name="Avg M6" radius={[4, 4, 0, 0]}>
                      {Object.keys(by_channel).map(ch => (
                        <Cell key={ch} fill={CHANNEL_COLORS[ch as keyof typeof CHANNEL_COLORS] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 5: Leading Indicators ── */}
        {activeTab === 'leading' && (
          <div className="space-y-8">
            {/* Scatter chart */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">M1 → M12 Prediction (R² = {leading_indicator.m1_predicts_m12_r2})</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Triangle markers = predicted (incomplete cohorts). Circle markers = actuals.</p>
              <div style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="m1" name="M1 Retention" type="number" domain={[75, 105]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} label={{ value: 'M1 Retention %', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                    <YAxis dataKey="m12" name="M12 Retention" type="number" domain={[40, 80]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} label={{ value: 'M12 Retention %', angle: -90, position: 'insideLeft', fontSize: 11 }} width={40} />
                    <Tooltip formatter={(v: unknown, name: unknown) => [`${v}%`, String(name)]} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={leading_indicator.historical_scatter.filter(d => !d.predicted)} name="Actual" fill="#1d4ed8" />
                    <Scatter data={leading_indicator.historical_scatter.filter(d => d.predicted)} name="Predicted" fill="#f59e0b" shape="triangle" />
                    <ReferenceLine x={90} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Avg M1', fill: '#94a3b8', fontSize: 10, position: 'top' }} />
                    <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'M12 target', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                    <Legend />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Early warning table */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Early Warning — Recent Cohorts</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Cohort','M1 Actual','M12 Predicted','M12 Target','Gap','Status'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leading_indicator.predictions.map(p => {
                    const gap = p.m12_predicted - p.m12_target;
                    const statusColor = p.status === 'at_risk' ? 'text-red-600 bg-red-50' : p.status === 'on_track' ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50';
                    const statusLabel = p.status === 'at_risk' ? 'At Risk' : p.status === 'on_track' ? 'On Track' : 'Borderline';
                    return (
                      <tr key={p.cohort} className="border-t border-[var(--border-subtle)]">
                        <td className="px-3 py-2 font-medium">{p.cohort}</td>
                        <td className="px-3 py-2">{p.m1_actual}%</td>
                        <td className="px-3 py-2">{p.m12_predicted}%</td>
                        <td className="px-3 py-2">{p.m12_target}%</td>
                        <td className={`px-3 py-2 font-semibold ${gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>{gap >= 0 ? '+' : ''}{gap}pp</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              {leading_indicator.insight}
            </div>
          </div>
        )}

        {/* ── Tab 6: Curve Shapes ── */}
        {activeTab === 'shapes' && (
          <div className="space-y-6">
            <p className="text-sm text-[var(--text-secondary)]">Leadership remembers &quot;cliff&quot; and &quot;smile&quot; more than &quot;83% vs 92%&quot;. These shapes explain the WHY behind retention numbers.</p>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.curve_shapes).map(([cohort, shape]) => {
                const sm = SHAPE_META[shape.shape] ?? SHAPE_META.slow_bleed;
                const rowData = retention_heatmap.find(r => r.cohort === cohort);
                const sparkData = rowData ? Object.entries(rowData).filter(([k]) => /^m\d+$/.test(k)).map(([k, v]) => ({ x: k, y: v as number })) : [];
                return (
                  <div key={cohort} className={`rounded-xl border p-4 ${sm.bg} ${sm.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-sm">{sm.label}</span>
                        <span className="ml-2 text-xs text-[var(--text-tertiary)]">— {cohort}</span>
                      </div>
                    </div>
                    {/* Sparkline */}
                    {sparkData.length > 1 && (
                      <div style={{ height: 80 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Line type="monotone" dataKey="y" stroke={shape.shape === 'cliff' ? '#dc2626' : shape.shape === 'smile' ? '#16a34a' : shape.shape === 'plateau' ? '#16a34a' : '#d97706'} strokeWidth={2} dot={false} />
                            <YAxis domain={[0, 105]} hide />
                            <XAxis dataKey="x" hide />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <p className="text-xs text-[var(--text-secondary)] mt-2">{shape.description}</p>
                    <p className="text-xs font-medium mt-2">Action: {shape.action}</p>
                    <button onClick={() => { setActiveTab('comparison'); setHighlightCohort(cohort); }}
                      className="mt-2 text-xs underline text-blue-600 hover:text-blue-800">
                      Highlight in Compare tab →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

