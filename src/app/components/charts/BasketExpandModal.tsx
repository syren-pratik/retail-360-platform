'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, BarChart, Bar, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { X, Download, TrendingUp, ShoppingCart, Award, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BasketData, BasketBucket } from '@/app/lib/types';
import { formatMoneyAuto, formatMoneyPlainAuto, getLocaleAuto } from '@/app/lib/format-money';

type TabId = 'distribution' | 'by-segment' | 'matrix' | 'trends' | 'behavior';
type SegmentTab = 'segment' | 'channel';

interface Props {
  data: BasketData;
  onClose: () => void;
}

const SEGMENT_COLORS: Record<string, string> = {
  'High-Value VIP': '#1d4ed8',
  'Loyal Active':   '#16a34a',
  'Medium Risk':    '#d97706',
  'High Risk':      '#dc2626',
  'New Customers':  '#7c3aed',
  'Low-Value':      '#64748b',
  'Churned':        '#9ca3af',
};

const CHANNEL_COLORS: Record<string, string> = {
  'In-Store':   '#3b82f6',
  'Online':     '#10b981',
  'Mobile App': '#8b5cf6',
  'Omnichannel':'#f59e0b',
};

const CAT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#6b7280','#ec4899'];

const QUADRANT_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  protect:            { label: 'Protect', color: '#15803d', bg: '#dcfce7', desc: 'High value + high frequency — top priority' },
  reactivate:         { label: 'Reactivate', color: '#d97706', bg: '#fef3c7', desc: 'High value but infrequent — win back' },
  upsell_basket:      { label: 'Upsell Basket', color: '#2563eb', bg: '#dbeafe', desc: 'Frequent but low spend — grow basket size' },
  let_go:             { label: 'Let Go', color: '#9ca3af', bg: '#f1f5f9', desc: 'Low value + low frequency — minimal investment' },
  increase_frequency: { label: 'Increase Frequency', color: '#7c3aed', bg: '#ede9fe', desc: 'Moderate spend but occasional — re-engage' },
  grow:               { label: 'Grow', color: '#0e7490', bg: '#cffafe', desc: 'Regular + moderate — nurture to VIP' },
};

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n); }
function fmtInr(n: number) {
  return formatMoneyAuto(n);
}

function Insight({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

export default function BasketExpandModal({ data, onClose }: Props) {
  const [tab, setTab]               = useState<TabId>('distribution');
  const [segTab, setSegTab]         = useState<SegmentTab>('segment');

  const handleClose = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [handleClose]);

  const { summary, distribution, by_segment, by_channel, basket_frequency_matrix, trend, category_by_basket, discount_dependency, insights } = data;

  const segments = Object.keys(SEGMENT_COLORS);
  const channels = Object.keys(CHANNEL_COLORS);

  // ── CSV export ──
  const handleExportCSV = () => {
    const rows = ['Range,Customers,%,Transactions,%,Revenue,%,Avg Value,Median'];
    for (const d of distribution) {
      rows.push([d.range, d.customer_count, d.pct_customers, d.transactions, d.pct_transactions, fmtInr(d.revenue), d.pct_revenue, d.avg_value, d.median_value].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'basket_distribution.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Distribution chart data
  const distData = distribution.map(d => ({ range: d.range, customers: d.customer_count, revenue_pct: d.pct_revenue }));

  // Frequency matrix: unique basket ranges and frequency labels
  const bRanges  = Array.from(new Set(basket_frequency_matrix.map(r => r.basket_range)));
  const freqCols = Array.from(new Set(basket_frequency_matrix.map(r => r.frequency_range)));

  // Category mix — get top categories across all buckets
  const allCats = Array.from(new Set(Object.values(category_by_basket).flatMap(v => Object.keys(v))));
  const catMixData = Object.entries(category_by_basket).map(([bucket, cats]) => {
    const entry: Record<string, string | number> = { bucket };
    for (const cat of allCats) entry[cat] = (cats as Record<string, number>)[cat] ?? 0;
    return entry;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full mx-4 flex flex-col"
        style={{ maxWidth: '1100px', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/cx360" onClick={handleClose} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft size={15} />
              Back to CX360
            </Link>
            <span className="text-[var(--border-default)]">|</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Basket Value Distribution</span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── KPI Strip ──────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex-shrink-0">
          {[
            { icon: <ShoppingCart size={14} className="text-blue-600" />, bg: 'bg-blue-50', label: 'Median Basket', value: formatMoneyPlainAuto(summary.median_basket), sub: `Mean ${formatMoneyPlainAuto(summary.mean_basket)}` },
            { icon: <TrendingUp size={14} className="text-green-600" />, bg: 'bg-green-50', label: 'MoM Trend', value: `+${summary.basket_trend_mom}%`, sub: 'vs last month' },
            { icon: <Award size={14} className="text-amber-600" />, bg: 'bg-amber-50', label: 'Top 10% Threshold', value: `${formatMoneyPlainAuto(summary.top_10pct_threshold)}+`, sub: 'basket size qualifier' },
            { icon: <AlertTriangle size={14} className="text-purple-600" />, bg: 'bg-purple-50', label: 'Pareto', value: `${summary.top_20pct_revenue_share}%`, sub: 'revenue from top 20% baskets' },
          ].map((k, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${k.bg} flex-shrink-0`}>{k.icon}</div>
              <div>
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">{k.label}</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{k.value}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────── */}
        <div className="flex items-center gap-0 px-6 border-b border-[var(--border-default)] flex-shrink-0">
          {([
            { id: 'distribution', label: 'Distribution' },
            { id: 'by-segment',   label: 'By Segment' },
            { id: 'matrix',       label: 'Basket × Frequency' },
            { id: 'trends',       label: 'Trends' },
            { id: 'behavior',     label: 'Behavioral Analysis' },
          ] as { id: TabId; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* TAB 1: Distribution */}
          {tab === 'distribution' && (
            <div className="p-6 space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={distData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={fmt} tickLine={false} axisLine={false} width={44} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6366f1' }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} width={36} domain={[0, 30]} />
                  <Tooltip formatter={(v: unknown) => [`${(v as number).toLocaleString()}` as string]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                  <Bar yAxisId="left" dataKey="customers" name="Customers" fill="var(--chart-blue)" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue_pct" name="Revenue %" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Summary table */}
              <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                <div className="bg-[var(--bg-secondary)] px-4 py-2 border-b border-[var(--border-default)]">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Bucket Detail</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        {['Range','Customers','%','Transactions','%','Revenue','Rev %','Avg Basket','Median'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {distribution.map((d: BasketBucket) => (
                        <tr key={d.range} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                          <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{d.range}</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{d.customer_count.toLocaleString()}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{d.pct_customers}%</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{d.transactions.toLocaleString()}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{d.pct_transactions}%</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{fmtInr(d.revenue)}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{d.pct_revenue}%</td>
                          <td className="px-3 py-2 text-[var(--text-primary)]">{formatMoneyPlainAuto(d.avg_value)}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{formatMoneyPlainAuto(d.median_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Insight text={insights[0]} />
            </div>
          )}

          {/* TAB 2: By Segment / Channel */}
          {tab === 'by-segment' && (
            <div className="p-6 space-y-4">
              <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1 self-start w-fit">
                {(['segment', 'channel'] as SegmentTab[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSegTab(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                      segTab === s ? 'bg-white text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    By {s === 'segment' ? 'Segment' : 'Channel'}
                  </button>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={segTab === 'segment' ? by_segment : by_channel}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={fmt} tickLine={false} axisLine={false} width={44} />
                  <Tooltip formatter={(v: unknown) => [`${(v as number).toLocaleString()}`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                  {(segTab === 'segment' ? segments : channels).map(key => (
                    <Bar key={key} dataKey={key} stackId="a"
                      fill={segTab === 'segment' ? (SEGMENT_COLORS[key] || '#64748b') : (CHANNEL_COLORS[key] || '#64748b')}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>

              <Insight text={insights[0]} />
            </div>
          )}

          {/* TAB 3: Basket × Frequency Matrix */}
          {tab === 'matrix' && (
            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Bubble size = customer count. Click any cell to see the action strategy.
              </p>

              {/* Grid layout */}
              <div className="overflow-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 px-3 text-left font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] min-w-[120px]">
                        Basket ↓ / Freq →
                      </th>
                      {freqCols.map(f => (
                        <th key={f} className="py-2 px-3 text-center font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] min-w-[160px]">
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bRanges.map(br => (
                      <tr key={br}>
                        <td className="py-2 px-3 font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                          {br}
                        </td>
                        {freqCols.map(fc => {
                          const cell = basket_frequency_matrix.find(c => c.basket_range === br && c.frequency_range === fc);
                          if (!cell) return <td key={fc} className="border-b border-[var(--border-subtle)] py-2 px-3 text-center text-[var(--text-tertiary)]">—</td>;
                          const q = QUADRANT_CONFIG[cell.quadrant] ?? QUADRANT_CONFIG['let_go'];
                          return (
                            <td key={fc} className="border-b border-[var(--border-subtle)] py-2 px-2">
                              <div
                                className="rounded-lg p-3 text-center"
                                style={{ backgroundColor: q.bg }}
                              >
                                <div className="text-lg font-bold" style={{ color: q.color }}>
                                  {cell.customers.toLocaleString()}
                                </div>
                                <div className="text-[10px] font-semibold mt-0.5" style={{ color: q.color }}>
                                  {q.label}
                                </div>
                                <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-tight">
                                  {cell.label}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quadrant legend */}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(QUADRANT_CONFIG).map(([key, q]) => (
                  <div key={key} className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ backgroundColor: q.bg }}>
                    <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: q.color }} />
                    <div>
                      <div className="text-xs font-semibold" style={{ color: q.color }}>{q.label}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">{q.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Insight text={insights[4]} />
            </div>
          )}

          {/* TAB 4: Trends */}
          {tab === 'trends' && (
            <div className="p-6 space-y-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trend} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => formatMoneyAuto(v)} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(v: unknown) => [formatMoneyPlainAuto(v as number)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                  <Line type="monotone" dataKey="mean" name="Mean" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="median" name="Median" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="p75" name="75th %ile" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="p90" name="90th %ile" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-800">
                <span className="font-semibold">Healthy signal:</span> All four percentiles are trending upward Jan → Jun 2024. Mean rising faster than median (+11.4% vs +9.8%) indicates top spenders are growing faster than the rest — watch this gap.
              </div>

              <Insight text={insights[2]} />
            </div>
          )}

          {/* TAB 5: Behavioral Analysis */}
          {tab === 'behavior' && (
            <div className="p-6 space-y-8">

              {/* A: Category Mix */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">A. Category Mix by Basket Range</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={catMixData} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <YAxis type="category" dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={65} />
                    <Tooltip formatter={(v: unknown) => [`${v}%`]} />
                    <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                    {allCats.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* B: Discount Dependency */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">B. Discount Dependency by Basket Range</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={discount_dependency} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <YAxis type="category" dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={65} />
                    <Tooltip formatter={(v: unknown) => [`${v}%`]} />
                    <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                    <Bar dataKey="promo_pct" name="Promo / Discounted" stackId="a" fill="#ef4444" opacity={0.8}>
                      {discount_dependency.map((_, i) => <Cell key={i} />)}
                    </Bar>
                    <Bar dataKey="full_price_pct" name="Full Price" stackId="a" fill="#10b981" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
                <Insight text={insights[3]} />
              </div>

              {/* C: Channel Split */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">C. Channel Split by Basket Range</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={by_channel} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={fmt} tickLine={false} axisLine={false} width={40} />
                    <Tooltip formatter={(v: unknown) => [`${(v as number).toLocaleString()}`]} />
                    <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                    {channels.map(ch => (
                      <Bar key={ch} dataKey={ch} stackId="a" fill={CHANNEL_COLORS[ch] || '#64748b'} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
