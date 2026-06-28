'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ArrowLeft, Download, ShoppingBag, Zap, TrendingUp,
  AlertTriangle, X, Users,
} from 'lucide-react';
import {
  CategoryBySegmentData,
  CategoryMetrics,
  CrossSellOpportunity,
  CategorySegmentRow,
} from '@/app/lib/types';
import { useFormatMoney, useFormatMoneyPlain } from '@/app/lib/format-money';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'heatmap' | 'revenue' | 'mix' | 'crosssell';
type HeatmapMetric = 'penetration' | 'revenue_share' | 'affinity_index' | 'growth_mom';

interface DrillCell {
  segment: string;
  category: string;
  metrics: CategoryMetrics;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<HeatmapMetric, string> = {
  penetration:    'Penetration %',
  revenue_share:  'Revenue Share %',
  affinity_index: 'Affinity Index',
  growth_mom:     'Growth MoM %',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Electronics':   '#3B82F6',
  'Fashion':       '#6366F1',
  'Grocery':       '#10B981',
  'Beauty':        '#F43F5E',
  'Home & Living': '#F59E0B',
  'Sports':        '#06B6D4',
  'Toys':          '#8B5CF6',
  'Books':         '#84CC16',
  'Automotive':    '#EF4444',
  'Health':        '#14B8A6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCellColors(value: number, metric: HeatmapMetric): { bg: string; fg: string } {
  if (metric === 'affinity_index') {
    if (value >= 2.0) return { bg: '#1d4ed8', fg: '#fff' };
    if (value >= 1.5) return { bg: '#3b82f6', fg: '#fff' };
    if (value >= 1.0) return { bg: '#93c5fd', fg: '#1e3a8a' };
    if (value >= 0.5) return { bg: '#dbeafe', fg: '#1e3a8a' };
    return { bg: '#f8fafc', fg: '#94a3b8' };
  }
  if (metric === 'growth_mom') {
    if (value >= 15)  return { bg: '#15803d', fg: '#fff' };
    if (value >= 5)   return { bg: '#22c55e', fg: '#fff' };
    if (value >= 0)   return { bg: '#bbf7d0', fg: '#166534' };
    if (value >= -5)  return { bg: '#fecaca', fg: '#991b1b' };
    return { bg: '#dc2626', fg: '#fff' };
  }
  if (value >= 60) return { bg: '#1a3a5c', fg: '#fff' };
  if (value >= 45) return { bg: '#2a5a8c', fg: '#fff' };
  if (value >= 35) return { bg: '#3a7abc', fg: '#fff' };
  if (value >= 25) return { bg: '#5a9ad4', fg: '#fff' };
  if (value >= 15) return { bg: '#9ac8ec', fg: '#1a3a5c' };
  if (value >= 5)  return { bg: '#cce4f6', fg: '#1a3a5c' };
  return { bg: '#f0f7fc', fg: '#94a3b8' };
}

function fmtCell(value: number, metric: HeatmapMetric): string {
  if (metric === 'affinity_index') return value.toFixed(1) + 'x';
  if (metric === 'growth_mom')     return (value > 0 ? '+' : '') + value.toFixed(1) + '%';
  return value.toFixed(0) + '%';
}

function SectionHeader({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {n}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[var(--border-subtle)] my-8" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CategoryDeepDiveContent({ data }: { data: unknown }) {
  const d = data as CategoryBySegmentData;
  const fmtMoney = useFormatMoney();
  const fmtMoneyPlain = useFormatMoneyPlain();
  const [isMounted, setIsMounted]   = useState(false);
  const [tab, setTab]               = useState<TabId>('heatmap');
  const [metric, setMetric]         = useState<HeatmapMetric>('penetration');
  const [drillCell, setDrillCell]   = useState<DrillCell | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted || !d?.matrix) return null;

  const { categories, segments, matrix, cross_sell_opportunities, segment_diagnostics } = d;

  // ── KPI strip ──
  const topCombo = (() => {
    let best = { segment: '', category: '', revenue: 0 };
    for (const row of matrix) {
      for (const [cat, m] of Object.entries(row.categories)) {
        if (m.revenue > best.revenue) best = { segment: row.segment, category: cat, revenue: m.revenue };
      }
    }
    return best;
  })();

  const biggestGap = cross_sell_opportunities[0] ?? null;

  const fastestGrowing = (() => {
    let best = { segment: '', category: '', growth: -Infinity };
    for (const row of matrix) {
      for (const [cat, m] of Object.entries(row.categories)) {
        if (m.growth_mom > best.growth) best = { segment: row.segment, category: cat, growth: m.growth_mom };
      }
    }
    return best;
  })();

  const riskSignal = (() => {
    for (const row of matrix) {
      for (const [cat, m] of Object.entries(row.categories)) {
        if (m.growth_mom < -5) return `${row.segment} × ${cat}: ${m.growth_mom.toFixed(1)}% MoM`;
      }
    }
    return null;
  })();

  // ── Chart data ──
  const revenueBarData = segments.map(seg => {
    const row = matrix.find((r: CategorySegmentRow) => r.segment === seg);
    const entry: Record<string, string | number> = { segment: seg };
    for (const cat of categories) {
      entry[cat] = row ? Math.round((row.categories[cat]?.revenue ?? 0) / 100000) : 0;
    }
    return entry;
  });

  const mixBarData = segments.map(seg => {
    const row = matrix.find((r: CategorySegmentRow) => r.segment === seg);
    const entry: Record<string, string | number> = { segment: seg };
    let total = 0;
    for (const cat of categories) total += row?.categories[cat]?.revenue ?? 0;
    for (const cat of categories) {
      const rev = row?.categories[cat]?.revenue ?? 0;
      entry[cat] = total > 0 ? parseFloat(((rev / total) * 100).toFixed(1)) : 0;
    }
    return entry;
  });

  const sortedOpps: CrossSellOpportunity[] = [...cross_sell_opportunities].sort(
    (a, b) => b.estimated_revenue - a.estimated_revenue
  );

  const priorityColor: Record<string, string> = {
    High:   'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low:    'bg-slate-100 text-slate-600',
  };

  // ── CSV export ──
  const handleExportCSV = () => {
    const rows = ['Segment,Category,Customers,Revenue (L),Penetration %,Affinity Index,Growth MoM %'];
    for (const row of matrix) {
      for (const [cat, m] of Object.entries(row.categories)) {
        rows.push([
          row.segment, cat,
          m.customers,
          (m.revenue / 100000).toFixed(1),
          m.penetration.toFixed(1),
          m.affinity_index.toFixed(2),
          m.growth_mom.toFixed(1),
        ].join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'categories_by_segment.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* ── Top Nav ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/cx360"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={15} />
            Back to CX360
          </Link>
          <div className="w-px h-4 bg-[var(--border-default)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Top Categories by Segment</span>
          <span className="text-sm font-medium text-[var(--accent-primary)]">Deep Dive</span>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Top Categories by Segment — Deep Dive
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Full {segments.length}-segment × {categories.length}-category analysis · penetration, revenue mix, affinity & cross-sell opportunities
        </p>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────── */}
      <div className="px-8 pb-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              icon: <ShoppingBag size={16} className="text-blue-600" />,
              bg: 'bg-blue-50',
              label: 'Top Revenue Combo',
              value: `${topCombo.segment} × ${topCombo.category}`,
              sub:   fmtMoney(topCombo.revenue),
              subColor: 'text-[var(--text-secondary)]',
            },
            {
              icon: <Zap size={16} className="text-amber-600" />,
              bg: 'bg-amber-50',
              label: 'Biggest Cross-Sell Gap',
              value: biggestGap ? `${biggestGap.segment} → ${biggestGap.to_category}` : '—',
              sub:   biggestGap ? `${fmtMoney(biggestGap.estimated_revenue)} uplift` : '',
              subColor: 'text-[var(--text-secondary)]',
            },
            {
              icon: <TrendingUp size={16} className="text-green-600" />,
              bg: 'bg-green-50',
              label: 'Fastest Growing Cell',
              value: `${fastestGrowing.segment} × ${fastestGrowing.category}`,
              sub:   `+${fastestGrowing.growth.toFixed(1)}% MoM`,
              subColor: 'text-green-600',
            },
            {
              icon: <AlertTriangle size={16} className={riskSignal ? 'text-red-600' : 'text-slate-400'} />,
              bg: riskSignal ? 'bg-red-50' : 'bg-slate-50',
              label: 'Risk Signal',
              value: riskSignal ?? 'No signals detected',
              sub:   riskSignal ? 'Declining MoM' : '',
              subColor: 'text-red-500',
            },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-[var(--border-default)] p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg} flex-shrink-0`}>{kpi.icon}</div>
              <div className="min-w-0">
                <div className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wide mb-1">{kpi.label}</div>
                <div className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{kpi.value}</div>
                {kpi.sub && <div className={`text-xs mt-0.5 ${kpi.subColor}`}>{kpi.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="px-8 pb-12 space-y-8">

        {/* Section 1: Analysis Views */}
        <div className="bg-white rounded-xl border border-[var(--border-default)] overflow-hidden">
          <SectionHeader n={1} title="Category Analysis" subtitle="Switch views: heatmap, revenue breakdown, category mix, or cross-sell opportunities" />

          {/* Tab bar */}
          <div className="flex items-center border-b border-[var(--border-default)] px-6">
            {([
              { id: 'heatmap',   label: 'Heatmap' },
              { id: 'revenue',   label: 'Revenue' },
              { id: 'mix',       label: 'Mix %' },
              { id: 'crosssell', label: 'Cross-Sell Opportunities' },
            ] as { id: TabId; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setDrillCell(null); }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
            {tab === 'heatmap' && (
              <div className="ml-auto flex items-center gap-1 pb-1">
                {(Object.keys(METRIC_LABELS) as HeatmapMetric[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      metric === m
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {METRIC_LABELS[m]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="flex min-h-[480px]">

            {/* HEATMAP */}
            {tab === 'heatmap' && (
              <>
                <div className={`overflow-auto p-6 transition-all duration-300 ${drillCell ? 'w-[60%]' : 'w-full'}`}>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left py-2.5 px-3 text-[var(--text-secondary)] font-medium bg-[var(--bg-secondary)] sticky left-0 z-10 min-w-[110px]">
                          Segment
                        </th>
                        {categories.map(cat => (
                          <th key={cat} className="py-2.5 px-2 text-center text-[var(--text-secondary)] font-medium bg-[var(--bg-secondary)] min-w-[86px]">
                            {cat}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map(seg => {
                        const row = matrix.find((r: CategorySegmentRow) => r.segment === seg);
                        return (
                          <tr key={seg}>
                            <td className="py-2 px-3 font-medium text-[var(--text-primary)] bg-white sticky left-0 border-b border-[var(--border-subtle)]">
                              {seg}
                            </td>
                            {categories.map(cat => {
                              const m = row?.categories[cat];
                              const val = m ? (m[metric] as number) : 0;
                              const { bg, fg } = getCellColors(val, metric);
                              const isSelected = drillCell?.segment === seg && drillCell?.category === cat;
                              return (
                                <td
                                  key={cat}
                                  className="py-2 px-1 text-center border-b border-[var(--border-subtle)] cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                    backgroundColor: bg,
                                    color: fg,
                                    outline: isSelected ? '2px solid #2563eb' : 'none',
                                    outlineOffset: '-2px',
                                  }}
                                  onClick={() => {
                                    if (!m) return;
                                    setDrillCell(isSelected ? null : { segment: seg, category: cat, metrics: m });
                                  }}
                                >
                                  {m ? fmtCell(val, metric) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-4 flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                    <span>Click any cell for details</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm inline-block bg-[#cce4f6]" /> Low
                      <span className="w-3 h-3 rounded-sm inline-block bg-[#5a9ad4] ml-1" /> Mid
                      <span className="w-3 h-3 rounded-sm inline-block bg-[#2a5a8c] ml-1" /> High
                      <span className="w-3 h-3 rounded-sm inline-block bg-[#1a3a5c] ml-1" /> Very High
                    </div>
                  </div>
                </div>

                {/* Drill-down panel */}
                {drillCell && (
                  <div className="w-[40%] border-l border-[var(--border-default)] bg-[var(--bg-secondary)] flex flex-col">
                    <div className="flex items-start justify-between p-5 border-b border-[var(--border-subtle)]">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)] text-base">{drillCell.category}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{drillCell.segment} segment</div>
                      </div>
                      <button
                        onClick={() => setDrillCell(null)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 flex-1 overflow-y-auto space-y-4">
                      {/* Metrics grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: 'Customers',      value: drillCell.metrics.customers.toLocaleString() },
                          { label: 'Revenue',        value: fmtMoney(drillCell.metrics.revenue) },
                          { label: 'Penetration',    value: `${drillCell.metrics.penetration.toFixed(1)}%` },
                          { label: 'Revenue Share',  value: `${drillCell.metrics.revenue_share.toFixed(1)}%` },
                          { label: 'Avg Spend',      value: fmtMoneyPlain(drillCell.metrics.avg_spend) },
                          { label: 'Affinity Index', value: `${drillCell.metrics.affinity_index.toFixed(2)}x` },
                          { label: 'Growth MoM',     value: `${drillCell.metrics.growth_mom > 0 ? '+' : ''}${drillCell.metrics.growth_mom.toFixed(1)}%` },
                        ].map(row => (
                          <div key={row.label} className="bg-white rounded-lg px-3 py-2.5 border border-[var(--border-subtle)]">
                            <div className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">{row.label}</div>
                            <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{row.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Segment diagnostic */}
                      {segment_diagnostics[drillCell.segment] && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                          <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Segment Insight</div>
                          <p className="text-xs text-blue-800 leading-relaxed">
                            {segment_diagnostics[drillCell.segment]}
                          </p>
                        </div>
                      )}

                      {/* Contextual signals */}
                      {drillCell.metrics.affinity_index >= 1.5 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                          <span className="font-semibold">High affinity</span> — {drillCell.segment} over-indexes on {drillCell.category} by {drillCell.metrics.affinity_index.toFixed(1)}×. Strong candidate for category-led upsell.
                        </div>
                      )}
                      {drillCell.metrics.growth_mom < -5 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                          <span className="font-semibold">Declining</span> — {drillCell.metrics.growth_mom.toFixed(1)}% MoM. Consider a targeted win-back or re-engagement campaign.
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-5 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                      <button className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                        Build Audience
                      </button>
                      <button className="w-full py-2.5 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] text-sm hover:bg-white transition-colors">
                        Export Customer List
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* REVENUE */}
            {tab === 'revenue' && (
              <div className="p-6 w-full">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revenueBarData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="segment" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} tickFormatter={v => fmtMoney(v * 100000)} />
                    <Tooltip formatter={(v: unknown) => [fmtMoney((v as number) * 100000), '']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                    {categories.map(cat => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || '#64748B'} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* MIX % */}
            {tab === 'mix' && (
              <div className="p-6 w-full">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={mixBarData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="segment" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <Tooltip formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, '']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                    {categories.map(cat => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || '#64748B'} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* CROSS-SELL */}
            {tab === 'crosssell' && (
              <div className="p-6 w-full">
                <div className="grid grid-cols-2 gap-4">
                  {sortedOpps.map((opp, i) => (
                    <div key={i} className="rounded-xl border border-[var(--border-default)] bg-white p-5 hover:border-blue-200 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColor[opp.priority] || priorityColor['Low']}`}>
                              {opp.priority}
                            </span>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{opp.segment}</span>
                          </div>
                          <div className="text-sm text-[var(--text-secondary)]">
                            {opp.from_category} <span className="text-blue-500 font-bold mx-1">→</span> {opp.to_category}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="text-lg font-bold text-green-600">{fmtMoney(opp.estimated_revenue)}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">estimated uplift</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] mb-1.5">
                          <span>Current penetration {(opp.current_penetration * 100).toFixed(0)}%</span>
                          <span>Target {(opp.potential_penetration * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-200 rounded-full relative"
                            style={{ width: `${opp.potential_penetration * 100}%` }}
                          >
                            <div
                              className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
                              style={{ width: `${(opp.current_penetration / opp.potential_penetration) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                          <Users size={11} />
                          {opp.gap_customers.toLocaleString()} addressable customers
                        </div>
                        <div className="flex gap-2">
                          <button className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
                            Create Campaign
                          </button>
                          <button className="text-xs px-3 py-1.5 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
                            Export List
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Divider />

        {/* Section 2: Segment Summary Table */}
        <div>
          <SectionHeader n={2} title="Segment Revenue Summary" subtitle="Total revenue and customer counts per segment across all categories" />
          <div className="bg-white rounded-xl border border-[var(--border-default)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                  <th className="text-left px-5 py-3 font-medium text-[var(--text-secondary)]">Segment</th>
                  <th className="text-right px-5 py-3 font-medium text-[var(--text-secondary)]">Total Customers</th>
                  <th className="text-right px-5 py-3 font-medium text-[var(--text-secondary)]">Total Revenue</th>
                  <th className="text-right px-5 py-3 font-medium text-[var(--text-secondary)]">Avg Revenue / Customer</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--text-secondary)]">Top Category</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row: CategorySegmentRow) => {
                  const topCat = Object.entries(row.categories).sort(([, a], [, b]) => b.revenue - a.revenue)[0];
                  return (
                    <tr key={row.segment} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{row.segment}</td>
                      <td className="px-5 py-3 text-right text-[var(--text-primary)]">{row.total_customers.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-[var(--text-primary)]">{fmtMoney(row.total_revenue)}</td>
                      <td className="px-5 py-3 text-right text-[var(--text-secondary)]">
                        {row.total_customers > 0 ? fmtMoneyPlain(Math.round(row.total_revenue / row.total_customers)) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[topCat?.[0]] || '#64748B' }}
                          />
                          <span className="text-[var(--text-primary)]">{topCat?.[0] ?? '—'}</span>
                          <span className="text-[var(--text-tertiary)] text-xs">
                            ({topCat ? (topCat[1].revenue_share).toFixed(0) : 0}% share)
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
