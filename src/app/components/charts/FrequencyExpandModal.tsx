'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, BarChart, Bar, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { X, Download, TrendingUp, RefreshCw, Users, Clock, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FrequencyData, FrequencyBucket, FrequencyMigrationFlow } from '@/app/lib/types';

type TabId = 'distribution' | 'recency' | 'migration' | 'interval' | 'trends';


const RECENCY_COLORS = {
  active_30d:      '#15803d',
  slipping_30_90:  '#d97706',
  at_risk_90_180:  '#ea580c',
  lost_180plus:    '#dc2626',
};

const FREQ_RANGES = ['1x', '2-3x', '4-6x', '7-12x', '13-24x', '25-52x', '52x+'];
const MIGRATION_COLS = ['1x', '2-3x', '4-6x', '7-12x', '13-24x', '25-52x', '52x+', 'Churned'];

const INTERVAL_COLORS = ['#15803d','#22c55e','#84cc16','#eab308','#f97316','#ef4444','#991b1b'];

function fmtInr(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function Insight({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

interface Props { data: FrequencyData; onClose: () => void }

export default function FrequencyExpandModal({ data, onClose }: Props) {
  const [tab, setTab] = useState<TabId>('distribution');
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [handleClose]);

  const {
    summary, distribution, with_recency,
    frequency_migration, interpurchase_interval,
    frequency_trend, early_warning, insights,
  } = data;

  // Build migration lookup: { from: { to: count } }
  const migMap: Record<string, Record<string, { count: number; direction: string }>> = {};
  for (const flow of (frequency_migration?.flows ?? []) as FrequencyMigrationFlow[]) {
    if (!migMap[flow.from]) migMap[flow.from] = {};
    migMap[flow.from][flow.to] = { count: flow.count, direction: flow.direction };
  }

  const handleExportCSV = () => {
    const rows = ['Range,Customers,%,Revenue,%Rev,Avg Basket,Avg CLV'];
    for (const d of distribution) {
      rows.push([d.range, d.customer_count, d.pct, fmtInr(d.revenue), d.pct_revenue, d.avg_basket, d.avg_clv].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'frequency_distribution.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const distChartData = distribution.map(d => ({ range: d.range, customers: d.customer_count, revenue_pct: d.pct_revenue }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full mx-4 flex flex-col"
        style={{ maxWidth: '1100px', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/cx360" onClick={handleClose} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft size={15} />
              Back to CX360
            </Link>
            <span className="text-[var(--border-default)]">|</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Purchase Frequency</span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2 text-sm"><Download size={14} /> Export CSV</button>
            <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-6 gap-2 px-6 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex-shrink-0">
          {[
            { icon: <TrendingUp size={13} className="text-blue-600" />, bg: 'bg-blue-50', label: 'Avg Freq', value: `${summary.avg_frequency}x`, sub: `+${summary.frequency_trend_mom}% MoM` },
            { icon: <TrendingUp size={13} className="text-indigo-600" />, bg: 'bg-indigo-50', label: 'Median Freq', value: `${summary.median_frequency}x`, sub: 'per customer' },
            { icon: <RefreshCw size={13} className="text-green-600" />, bg: 'bg-green-50', label: 'Repeat Rate', value: `${summary.repeat_rate_90d}%`, sub: '90-day window' },
            { icon: <Users size={13} className="text-emerald-600" />, bg: 'bg-emerald-50', label: 'Active 30d', value: `${summary.pct_active_30d}%`, sub: 'of customers' },
            { icon: <Clock size={13} className="text-amber-600" />, bg: 'bg-amber-50', label: 'Median Interval', value: `${summary.median_interpurchase_days}d`, sub: 'between visits' },
            { icon: <Globe size={13} className="text-purple-600" />, bg: 'bg-purple-50', label: 'Omni Frequent', value: `${summary.omni_frequent_pct}%`, sub: '3+ channels' },
          ].map((k, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`p-1.5 rounded-md ${k.bg} flex-shrink-0`}>{k.icon}</div>
              <div>
                <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium leading-tight">{k.label}</div>
                <div className="text-sm font-bold text-[var(--text-primary)] leading-tight">{k.value}</div>
                <div className="text-[9px] text-[var(--text-secondary)] leading-tight">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center border-b border-[var(--border-default)] px-6 flex-shrink-0">
          {([
            { id: 'distribution', label: 'Distribution' },
            { id: 'recency',      label: 'Freq × Recency' },
            { id: 'migration',    label: 'Migration' },
            { id: 'interval',     label: 'Inter-Purchase' },
            { id: 'trends',       label: 'Trends' },
          ] as { id: TabId; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* TAB 1: Distribution */}
          {tab === 'distribution' && (
            <div className="p-6 space-y-6">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={distChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} tickLine={false} axisLine={false} width={44} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6366f1' }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} width={32} domain={[0, 30]} />
                  <Tooltip formatter={(v: unknown) => [`${(v as number).toLocaleString()}`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                  <Bar yAxisId="left" dataKey="customers" name="Customers" radius={[3,3,0,0]}>
                    {distChartData.map((_, i) => <Cell key={i} fill={`hsl(${240 + i * 10},${70 - i * 5}%,${65 - i * 5}%)`} />)}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="revenue_pct" name="Revenue %" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>

              <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                <div className="bg-[var(--bg-secondary)] px-4 py-2 border-b border-[var(--border-default)]">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Bucket Detail — CLV vs Basket</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        {['Range','Customers','%','Revenue','Rev %','Avg Basket','Avg CLV'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {distribution.map((d: FrequencyBucket) => (
                        <tr key={d.range} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                          <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{d.range}</td>
                          <td className="px-3 py-2">{d.customer_count.toLocaleString()}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{d.pct}%</td>
                          <td className="px-3 py-2">{fmtInr(d.revenue)}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{d.pct_revenue}%</td>
                          <td className="px-3 py-2">₹{d.avg_basket.toLocaleString('en-IN')}</td>
                          <td className={`px-3 py-2 font-semibold ${d.avg_clv >= 3000 ? 'text-blue-600' : d.avg_clv >= 1500 ? 'text-green-600' : 'text-[var(--text-secondary)]'}`}>
                            ₹{d.avg_clv.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Insight text={insights[0]} />
            </div>
          )}

          {/* TAB 2: Freq × Recency */}
          {tab === 'recency' && (
            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">Recency health within each frequency bucket — shows who is still active vs slipping vs lost.</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={with_recency} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} tickLine={false} axisLine={false} width={40} />
                  <Tooltip formatter={(v: unknown) => [`${(v as number).toLocaleString()}`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                  <Bar dataKey="active_30d" name="Active (≤30d)" stackId="a" fill={RECENCY_COLORS.active_30d} />
                  <Bar dataKey="slipping_30_90" name="Slipping (30-90d)" stackId="a" fill={RECENCY_COLORS.slipping_30_90} />
                  <Bar dataKey="at_risk_90_180" name="At Risk (90-180d)" stackId="a" fill={RECENCY_COLORS.at_risk_90_180} />
                  <Bar dataKey="lost_180plus" name="Lost (180d+)" stackId="a" fill={RECENCY_COLORS.lost_180plus} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(RECENCY_COLORS).map(([key, color]) => {
                  const total = with_recency.reduce((s, r) => s + ((r as Record<string, number>)[key] ?? 0), 0);
                  const label = { active_30d: 'Active ≤30d', slipping_30_90: 'Slipping 30-90d', at_risk_90_180: 'At Risk 90-180d', lost_180plus: 'Lost 180d+' }[key];
                  return (
                    <div key={key} className="rounded-lg px-3 py-2 border" style={{ borderColor: color + '40', backgroundColor: color + '10' }}>
                      <div className="text-xs font-medium" style={{ color }}>{label}</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">{total.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
              <Insight text={insights[1]} />
            </div>
          )}

          {/* TAB 3: Migration Matrix */}
          {tab === 'migration' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-secondary)]">Customer movement between frequency bands · <span className="font-semibold">{frequency_migration?.period}</span></p>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-100 inline-block border border-green-300" /> Upgraded ↑</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-100 inline-block border border-slate-200" /> Same</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100 inline-block border border-amber-300" /> Downgraded ↓</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 inline-block border border-red-300" /> Churned</span>
                </div>
              </div>

              <div className="overflow-auto rounded-xl border border-[var(--border-default)]">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="py-2.5 px-3 text-left font-medium text-[var(--text-secondary)] min-w-[90px] border-b border-[var(--border-default)] sticky left-0 bg-[var(--bg-secondary)] z-10">From ↓ / To →</th>
                      {MIGRATION_COLS.map(col => (
                        <th key={col} className="py-2.5 px-2 text-center font-medium text-[var(--text-secondary)] min-w-[75px] border-b border-[var(--border-default)]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FREQ_RANGES.map(fromRange => {
                      const rowFlows = migMap[fromRange] ?? {};
                      const rowTotal = Object.values(rowFlows).reduce((s, v) => s + v.count, 0);
                      return (
                        <tr key={fromRange} className="border-b border-[var(--border-subtle)]">
                          <td className="py-2 px-3 font-semibold text-[var(--text-primary)] sticky left-0 bg-white z-10 border-r border-[var(--border-subtle)]">{fromRange}</td>
                          {MIGRATION_COLS.map(toRange => {
                            const cell = rowFlows[toRange];
                            if (!cell) return <td key={toRange} className="py-2 px-2 text-center text-[var(--text-tertiary)]">—</td>;
                            const pct = rowTotal > 0 ? Math.round((cell.count / rowTotal) * 100) : 0;
                            const styles: Record<string, { bg: string; border: string; text: string }> = {
                              up:   { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700' },
                              same: { bg: 'bg-slate-50',  border: 'border-slate-200', text: 'text-slate-600' },
                              down: { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700' },
                              lost: { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700'   },
                            };
                            const s = styles[cell.direction] ?? styles.same;
                            const arrow = cell.direction === 'up' ? '↑' : cell.direction === 'down' ? '↓' : cell.direction === 'lost' ? 'x' : '';
                            return (
                              <td key={toRange} className="py-1 px-1">
                                <div className={`rounded px-1.5 py-1.5 text-center border ${s.bg} ${s.border}`}>
                                  <div className={`font-semibold ${s.text}`}>{cell.count.toLocaleString()}{arrow && <span className="ml-0.5">{arrow}</span>}</div>
                                  <div className="text-[9px] text-[var(--text-tertiary)]">{pct}%</div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--bg-secondary)] border-t border-[var(--border-default)]">
                      <td className="py-2 px-3 font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg-secondary)] z-10 text-[10px]">Net flows</td>
                      {MIGRATION_COLS.map(col => {
                        const inflow = (frequency_migration?.flows ?? []).filter((f: FrequencyMigrationFlow) => f.to === col && f.direction === 'up').reduce((s, f) => s + f.count, 0);
                        const outflow = (frequency_migration?.flows ?? []).filter((f: FrequencyMigrationFlow) => f.from === col && (f.direction === 'down' || f.direction === 'lost')).reduce((s, f) => s + f.count, 0);
                        const net = inflow - outflow;
                        return (
                          <td key={col} className={`py-2 px-2 text-center text-[10px] font-semibold ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : 'text-[var(--text-tertiary)]'}`}>
                            {net > 0 ? `+${net.toLocaleString()}` : net === 0 ? '—' : net.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Insight text={insights[2]} />
            </div>
          )}

          {/* TAB 4: Inter-Purchase Interval */}
          {tab === 'interval' && (
            <div className="p-6 space-y-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={interpurchase_interval} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} tickLine={false} axisLine={false} width={40} />
                  <Tooltip formatter={(v: unknown) => [`${(v as number).toLocaleString()}`]} />
                  <Bar dataKey="customers" name="Customers" radius={[3,3,0,0]}>
                    {interpurchase_interval.map((_, i) => <Cell key={i} fill={INTERVAL_COLORS[i % INTERVAL_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Early warning table */}
              <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-800">Early Warning — Customers Overdue vs Personal Baseline</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      {['Customer', 'Normal Interval', 'Current Gap', 'Days Overdue', 'CLV', 'Risk'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {early_warning.map(w => (
                      <tr key={w.customer_id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                        <td className="px-3 py-2 font-mono text-[var(--text-primary)] font-semibold">{w.customer_id}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{w.normal_interval}d</td>
                        <td className="px-3 py-2 font-semibold text-amber-700">{w.current_gap}d</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-red-600">+{w.days_overdue}d</span>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">₹{w.clv.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${w.risk === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {w.risk === 'high' ? 'High' : 'Med'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Insight text={insights[4]} />
            </div>
          )}

          {/* TAB 5: Trends */}
          {tab === 'trends' && (
            <div className="p-6 space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={frequency_trend} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip formatter={(v: unknown) => [`${(v as number).toFixed(1)}`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
                  <Line type="monotone" dataKey="avg_freq" name="Avg Frequency" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="median_freq" name="Median Freq" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="repeat_rate" name="Repeat Rate %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="active_pct" name="Active % (30d)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Avg Freq', start: frequency_trend[0]?.avg_freq, end: frequency_trend[frequency_trend.length-1]?.avg_freq, unit: 'x' },
                  { label: 'Median Freq', start: frequency_trend[0]?.median_freq, end: frequency_trend[frequency_trend.length-1]?.median_freq, unit: 'x' },
                  { label: 'Repeat Rate', start: frequency_trend[0]?.repeat_rate, end: frequency_trend[frequency_trend.length-1]?.repeat_rate, unit: '%' },
                  { label: 'Active 30d', start: frequency_trend[0]?.active_pct, end: frequency_trend[frequency_trend.length-1]?.active_pct, unit: '%' },
                ].map(kpi => {
                  const delta = kpi.end - kpi.start;
                  return (
                    <div key={kpi.label} className="rounded-xl border border-[var(--border-default)] px-4 py-3">
                      <div className="text-xs text-[var(--text-tertiary)] font-medium mb-1">{kpi.label}</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">{kpi.end.toFixed(1)}{kpi.unit}</div>
                      <div className={`text-xs font-medium mt-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}{kpi.unit} vs Jan
                      </div>
                    </div>
                  );
                })}
              </div>

              <Insight text={insights[3]} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
