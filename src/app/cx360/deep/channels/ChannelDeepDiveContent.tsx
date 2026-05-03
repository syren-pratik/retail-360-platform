'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertTriangle, TrendingUp, Info, Download,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelDeepData {
  kpis: {
    total_acquired: number;
    online_pct: number;
    offline_pct: number;
    omni_pct: number;
    blended_cac: number;
    top_channel: string;
    growth_rate: number;
  };
  monthly_trend: Record<string, number | string>[];
  cac_trend: Record<string, number | string>[];
  budget: { channel: string; spent: number; allocated: number; utilization: number }[];
  ltv_cac: { channel: string; ltv: number; cac: number; ratio: number | null; payback_months: number }[];
  repeat_rates: { channel: string; r30: number; r60: number; r90: number }[];
  first_purchase_category: { channel: string; Electronics: number; Grocery: number; Clothing: number; Beauty: number; Home: number }[];
  city_channel_split: { city: string; Organic: number; Paid: number; Direct: number; Referral: number; Social: number; Offline: number; Email: number; Marketplace: number }[];
  alerts: { severity: string; message: string }[];
  time_to_first_purchase: { channel: string; avg_days: number; median_days: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TREND_CHANNELS = ['Organic', 'Paid', 'Direct', 'Referral', 'Email', 'Social', 'Marketplace', 'Offline'];
const CAC_CHANNELS = ['Paid', 'Social', 'Email', 'Referral', 'Marketplace'];
const CAT_KEYS = ['Electronics', 'Grocery', 'Clothing', 'Beauty', 'Home'];
const CITY_CHANNELS = ['Organic', 'Paid', 'Direct', 'Referral', 'Social', 'Offline', 'Email', 'Marketplace'];

const COLORS: Record<string, string> = {
  Organic: '#3B82F6',
  Paid: '#EF4444',
  Direct: '#10B981',
  Referral: '#F59E0B',
  Email: '#8B5CF6',
  Social: '#EC4899',
  Marketplace: '#F97316',
  Offline: '#6B7280',
};

const CAT_COLORS: Record<string, string> = {
  Electronics: '#3B82F6',
  Grocery: '#10B981',
  Clothing: '#F59E0B',
  Beauty: '#EC4899',
  Home: '#8B5CF6',
};

const DATE_OPTIONS = ['30d', '90d', 'YTD', '12m'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
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
  return <div className="border-t border-[var(--border-subtle)]" />;
}

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700 leading-relaxed">
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChannelDeepDiveContent({ data }: { data: unknown }) {
  const d = data as ChannelDeepData;
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('YTD');
  const [highlightChannel, setHighlightChannel] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const { kpis, monthly_trend, cac_trend, budget, ltv_cac, repeat_rates,
    first_purchase_category, city_channel_split, alerts, time_to_first_purchase } = d;

  // Compute channel totals from monthly trend for donut
  const channelTotals = TREND_CHANNELS.map(ch => ({
    name: ch,
    value: monthly_trend.reduce((sum, row) => sum + ((row[ch] as number) || 0), 0),
  })).sort((a, b) => b.value - a.value);

  // Export full scorecard
  const handleExport = () => {
    const rows = ltv_cac.map(c => {
      const rr = repeat_rates.find(r => r.channel === c.channel);
      return {
        channel: c.channel,
        ltv: c.ltv,
        cac: c.cac,
        ltv_cac_ratio: c.ratio ?? 'Organic/Free',
        payback_months: c.payback_months,
        repeat_30d: rr?.r30 ?? '-',
        repeat_60d: rr?.r60 ?? '-',
        repeat_90d: rr?.r90 ?? '-',
      };
    });
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'channel_deep_dive.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* ── Sticky top nav ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/cx360"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={15} />
            Back to CX360
          </Link>
          <span className="text-[var(--border-default)]">|</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Channel Performance</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
        </div>
        <div className="flex items-center gap-2">
          {DATE_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setSelectedDateRange(opt)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                selectedDateRange === opt
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {opt}
            </button>
          ))}
          <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* Page heading */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Channel Performance — Deep Dive</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Comprehensive acquisition, cost, quality & geographic analysis · {kpis.total_acquired.toLocaleString('en-IN')} total customers
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 1: CHANNEL MIX & VOLUME                   */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={1} title="Channel Mix & Volume" subtitle="Acquisition distribution and growth trends" />

          {/* KPI Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Total Acquired', value: kpis.total_acquired.toLocaleString('en-IN'), color: 'text-[var(--text-primary)]' },
              { label: 'Online Share', value: `${kpis.online_pct}%`, color: 'text-blue-600' },
              { label: 'Offline Share', value: `${kpis.offline_pct}%`, color: 'text-gray-600' },
              { label: 'Omnichannel', value: `${kpis.omni_pct}%`, color: 'text-purple-600' },
              { label: 'Blended CAC', value: `₹${kpis.blended_cac}`, color: 'text-[var(--text-primary)]' },
              { label: 'YoY Growth', value: `+${kpis.growth_rate}%`, color: 'text-[var(--positive)]' },
            ].map(kpi => (
              <div key={kpi.label} className="card py-3 px-4">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{kpi.label}</p>
                <p className={`text-lg font-semibold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Donut + Monthly Trend */}
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Acquisition Mix</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Distribution by source (all-time)</p>
              <div style={{ height: 260 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelTotals}
                        cx="50%"
                        cy="46%"
                        innerRadius={55}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={2}
                        onClick={(entry) => setHighlightChannel(highlightChannel === (entry as { name?: string }).name ? null : (entry as { name?: string }).name ?? null)}
                        cursor="pointer"
                      >
                        {channelTotals.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[entry.name] || '#94A3B8'}
                            opacity={highlightChannel && highlightChannel !== entry.name ? 0.3 : 1}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown) => [(val as number).toLocaleString('en-IN'), 'Customers']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Monthly Acquisition by Channel</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">New customers per month · last 12 months</p>
              <div style={{ height: 260 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthly_trend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} tickLine={false} interval={1} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: '11px' }} />
                      {TREND_CHANNELS.map(ch => (
                        <Line
                          key={ch}
                          type="monotone"
                          dataKey={ch}
                          stroke={COLORS[ch] || '#94A3B8'}
                          strokeWidth={highlightChannel === ch ? 2.5 : 1.5}
                          dot={false}
                          opacity={highlightChannel && highlightChannel !== ch ? 0.2 : 1}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <Insight>
                Diwali spike visible in Oct–Nov across all channels. Social Media showing strongest recent growth — up 42% Jan to Jun 2024. Offline remains stable at ~550/month.
              </Insight>
            </div>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 2: COST & EFFICIENCY                      */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={2} title="Cost & Efficiency" subtitle="Customer acquisition cost trends and budget utilization" />

          <div className="grid grid-cols-2 gap-6">
            {/* CAC by channel (horizontal bar) */}
            <div className="card">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">CAC by Channel</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">June 2024 · paid channels only</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[...cac_trend].slice(-1).flatMap(row =>
                        CAC_CHANNELS.map(ch => ({ channel: ch, cac: (row[ch] as number) || 0 }))
                      ).sort((a, b) => a.cac - b.cac)}
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} tickFormatter={v => `₹${v}`} />
                      <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={80} />
                      <Tooltip formatter={(v: unknown) => [`₹${v as number}`, 'CAC']} />
                      <Bar dataKey="cac" radius={[0, 4, 4, 0]}>
                        {CAC_CHANNELS.map(ch => (
                          <Cell key={ch} fill={COLORS[ch] || '#94A3B8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* CAC trend lines */}
            <div className="card">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">CAC Trend</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Jan–Jun 2024 · are costs rising?</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cac_trend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                      <Tooltip formatter={(v: unknown) => [`₹${v as number}`, 'CAC']} contentStyle={{ fontSize: '11px' }} />
                      {CAC_CHANNELS.map(ch => (
                        <Line key={ch} type="monotone" dataKey={ch} stroke={COLORS[ch] || '#94A3B8'} strokeWidth={1.8} dot={false} name={ch} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Budget utilization */}
          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Budget Utilization</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Spend vs. allocated budget by channel</p>
            <div className="space-y-4">
              {budget.map(b => {
                const over = b.utilization > 100;
                const pct = Math.min(b.utilization, 120);
                return (
                  <div key={b.channel}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-[var(--text-primary)]">{b.channel}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-[var(--text-secondary)]">
                          {formatINR(b.spent)} / {formatINR(b.allocated)}
                        </span>
                        <span className={`font-semibold ${over ? 'text-red-600' : b.utilization >= 90 ? 'text-amber-600' : 'text-[var(--positive)]'}`}>
                          {b.utilization}%{over && ' (Over)'}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : b.utilization >= 90 ? 'bg-amber-500' : 'bg-[var(--accent-primary)]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <Insight>
              Referral Program is 13% over budget — strong signal to increase allocation given its 18.7:1 LTV:CAC. Email/SMS is most cost-efficient at ₹45 CAC.
            </Insight>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 3: QUALITY OF ACQUISITION                 */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={3} title="Quality of Acquisition" subtitle="LTV:CAC ratios, payback periods, and repeat rates" />

          {/* Channel Scorecard Table */}
          <div className="card overflow-x-auto">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Channel Scorecard</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-4">All metrics · sorted by LTV:CAC ratio</p>
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {['Channel', 'LTV', 'CAC', 'LTV:CAC', 'Payback', '30d Repeat', '60d Repeat', '90d Repeat'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ltv_cac.map(row => {
                  const rr = repeat_rates.find(r => r.channel === row.channel);
                  const ratio = row.ratio;
                  const ratioColor = ratio === null ? 'text-[var(--positive)]' : ratio >= 3 ? 'text-[var(--positive)]' : ratio >= 1 ? 'text-amber-600' : 'text-red-600';
                  const ratioBg = ratio === null ? 'bg-green-50' : ratio >= 3 ? 'bg-green-50' : ratio >= 1 ? 'bg-amber-50' : 'bg-red-50';
                  return (
                    <tr key={row.channel} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-2.5 px-3 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[row.channel.split(' ')[0]] || '#94A3B8' }} />
                          {row.channel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">₹{row.ltv.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{row.cac === 0 ? '—' : `₹${row.cac}`}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ratioBg} ${ratioColor}`}>
                          {ratio === null ? '∞' : `${ratio.toFixed(1)}x`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                        {row.payback_months === 0 ? 'Instant' : `${row.payback_months}m`}
                      </td>
                      <td className="py-2.5 px-3">{rr ? `${rr.r30}%` : '—'}</td>
                      <td className="py-2.5 px-3">{rr ? `${rr.r60}%` : '—'}</td>
                      <td className="py-2.5 px-3">{rr ? <span className={rr.r90 < 30 ? 'text-red-600 font-medium' : ''}>{rr.r90}%</span> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* LTV:CAC bar */}
            <div className="card">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">LTV:CAC Ratio</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">Paid channels only · 3:1 is minimum target</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={ltv_cac.filter(c => c.ratio !== null).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))}
                      margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                      <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip formatter={(v: unknown) => [`${(v as number).toFixed(1)}x`, 'LTV:CAC']} />
                      <ReferenceLine x={3} stroke="#EF4444" strokeDasharray="4 2" label={{ value: '3:1 target', position: 'top', fontSize: 10, fill: '#EF4444' }} />
                      <Bar dataKey="ratio" radius={[0, 4, 4, 0]}>
                        {ltv_cac.filter(c => c.ratio !== null).map(c => (
                          <Cell key={c.channel} fill={(c.ratio ?? 0) >= 3 ? '#10B981' : (c.ratio ?? 0) >= 1 ? '#F59E0B' : '#EF4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 90-day repeat rate grouped bar */}
            <div className="card">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Repeat Purchase Rate</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">30 / 60 / 90 day repeat rate by acquisition source</p>
              <div style={{ height: 240 }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[...repeat_rates].sort((a, b) => b.r90 - a.r90)}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                      <YAxis type="category" dataKey="channel" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip formatter={(v: unknown) => [`${v as number}%`]} contentStyle={{ fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="r30" name="30-day" fill="#93C5FD" radius={[0, 2, 2, 0]} barSize={6} />
                      <Bar dataKey="r60" name="60-day" fill="#3B82F6" radius={[0, 2, 2, 0]} barSize={6} />
                      <Bar dataKey="r90" name="90-day" fill="#1D4ED8" radius={[0, 2, 2, 0]} barSize={6} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <Insight>
                Offline Walk-in and Referral bring the most loyal customers (90d repeat: 65% & 62%). Marketplace buyers have the lowest loyalty at 18% — mostly one-time deal seekers.
              </Insight>
            </div>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 4: FUNNEL CONVERSION                      */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={4} title="Funnel Conversion" subtitle="Time from signup to first purchase by channel" />

          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Time to First Purchase</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Average days from acquisition to first order · lower is better</p>
            <div style={{ height: 280 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={[...time_to_first_purchase].sort((a, b) => b.avg_days - a.avg_days)}
                    margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} tickFormatter={v => `${v}d`} />
                    <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip formatter={(v: unknown) => [`${v as number} days`]} contentStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="avg_days" name="Avg Days" radius={[0, 4, 4, 0]}>
                      {[...time_to_first_purchase]
                        .sort((a, b) => b.avg_days - a.avg_days)
                        .map(c => (
                          <Cell key={c.channel} fill={c.avg_days <= 2 ? '#10B981' : c.avg_days <= 5 ? '#F59E0B' : '#EF4444'} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <Insight>
              Direct Traffic (1.8d) and Organic Search (2.1d) convert fastest. Paid Ads (7.2d) and Social Media (6.8d) require nurturing — consider post-acquisition email flows to accelerate first purchase.
            </Insight>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 5: CUSTOMER PROFILE BY SOURCE             */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={5} title="Customer Profile by Source" subtitle="What do new customers buy first, by acquisition channel?" />

          <div className="card overflow-x-auto">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">First Purchase Category</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Category mix of first order · shows acquisition intent</p>
            <div style={{ height: 300 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={first_purchase_category}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip formatter={(v: unknown) => [`${v as number}%`]} contentStyle={{ fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {CAT_KEYS.map(cat => (
                      <Bar key={cat} dataKey={cat} stackId="a" fill={CAT_COLORS[cat]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <Insight>
              Paid Ads customers are Electronics-first (40%) → high AOV but also highest price-sensitivity. Social Media → Beauty (45%) → strong for Skin/Beauty campaigns. Offline Walk-in → Grocery (55%) → habitual shoppers with high lifetime value.
            </Insight>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 6: GEOGRAPHIC DISTRIBUTION                */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader n={6} title="Geographic Distribution" subtitle="Channel mix varies significantly across cities" />

          <div className="card overflow-x-auto">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Acquisition by City & Channel</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">New customers per city · stacked by acquisition source</p>
            <div style={{ height: 320 }}>
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={city_channel_split}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                    <YAxis type="category" dataKey="city" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {CITY_CHANNELS.map(ch => (
                      <Bar key={ch} dataKey={ch} stackId="a" fill={COLORS[ch] || '#94A3B8'} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <Insight>
              Mumbai leads on Organic (2,800) — strong SEO presence. Delhi NCR is most Paid Ads-heavy. Bangalore shows highest Referral (1,100) — strong word-of-mouth community. Expand Referral incentives in Bangalore.
            </Insight>
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 7: RED FLAGS & ALERTS                     */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <SectionHeader n={7} title="Red Flags & Alerts" subtitle="Automated signals requiring attention or action" />
          <div className="space-y-2.5">
            {alerts.map((alert, i) => {
              const icon = alert.severity === 'critical' ? <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                : alert.severity === 'warning' ? <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                : alert.severity === 'positive' ? <TrendingUp size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                : <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />;
              const bg = alert.severity === 'critical' ? 'bg-red-50 border-red-200'
                : alert.severity === 'warning' ? 'bg-amber-50 border-amber-200'
                : alert.severity === 'positive' ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200';
              const text = alert.severity === 'critical' ? 'text-red-800'
                : alert.severity === 'warning' ? 'text-amber-800'
                : alert.severity === 'positive' ? 'text-green-800'
                : 'text-blue-800';
              return (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 border rounded-lg ${bg}`}>
                  {icon}
                  <p className={`text-sm ${text}`}>{alert.message}</p>
                </div>
              );
            })}
          </div>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════ */}
        {/* SECTION 8: FULL DATA TABLE                        */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader n={8} title="Full Channel Data" subtitle="All channels × all metrics · exportable" />
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors -mt-5"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 860 }}>
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  {['Channel', 'LTV', 'CAC', 'LTV:CAC', 'Payback', '30d%', '60d%', '90d%', 'Avg Days to 1st Purchase'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ltv_cac.map((row, idx) => {
                  const rr = repeat_rates.find(r => r.channel === row.channel);
                  const ttpf = time_to_first_purchase.find(t => t.channel === row.channel);
                  const ratio = row.ratio;
                  return (
                    <tr key={row.channel} className={`border-b border-[var(--border-subtle)] ${idx % 2 === 0 ? '' : 'bg-[var(--bg-secondary)]/30'}`}>
                      <td className="py-2.5 px-3 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: COLORS[row.channel.split(' ')[0]] || '#94A3B8' }} />
                          {row.channel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">₹{row.ltv.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{row.cac === 0 ? '—' : `₹${row.cac}`}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${ratio === null ? 'text-[var(--positive)]' : ratio >= 3 ? 'text-[var(--positive)]' : ratio >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                          {ratio === null ? '∞' : `${ratio.toFixed(1)}x`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{row.payback_months === 0 ? 'Instant' : `${row.payback_months}m`}</td>
                      <td className="py-2.5 px-3">{rr?.r30 ?? '—'}%</td>
                      <td className="py-2.5 px-3">{rr?.r60 ?? '—'}%</td>
                      <td className="py-2.5 px-3">
                        {rr ? <span className={rr.r90 < 30 ? 'text-red-600 font-medium' : ''}>{rr.r90}%</span> : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                        {ttpf ? (ttpf.avg_days === 0 ? 'Same day' : `${ttpf.avg_days}d`) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom padding */}
        <div className="h-10" />
      </div>
    </div>
  );
}
