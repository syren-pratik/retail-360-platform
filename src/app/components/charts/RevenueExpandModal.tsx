'use client';

import { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, ComposedChart, Area,
} from 'recharts';
import { RevenueDetailData } from '@/app/lib/types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface RevenueExpandModalProps {
  data: RevenueDetailData;
  onClose: () => void;
}

const TABS = ['Overview', 'Concentration', 'Quality', 'Health Matrix', 'Migration', 'Drill-Down'];

function fmtInr(n: number) {
  return formatMoneyAuto(n);
}

const RISK_COLORS: Record<string, string> = {
  healthy: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  neutral: '#6366F1',
};

export default function RevenueExpandModal({ data, onClose }: RevenueExpandModalProps) {
  const [tab, setTab] = useState(0);
  const [drillSegment, setDrillSegment] = useState<string>('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Set default drill segment
  useEffect(() => {
    if (!drillSegment && data.segments.length > 0) {
      setDrillSegment(data.segments[0].segment);
    }
  }, [data.segments, drillSegment]);

  const s = data.summary;
  const drillKeys = Object.keys(data.drill_down ?? {});
  const activeDrill = data.drill_down?.[drillSegment];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/cx360" onClick={onClose} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={15} />
            Back to CX360
          </Link>
          <span className="text-[var(--border-default)]">|</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Revenue by Segment</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* KPI strip */}
      <div className="flex gap-6 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        {[
          { label: 'Total Revenue', value: fmtInr(s.total_revenue) },
          { label: 'Top 20% Share', value: `${s.top_20pct_customers_revenue_share}%` },
          { label: 'Gini Coefficient', value: s.gini_coefficient.toFixed(2) },
          { label: 'Fastest Growing', value: s.fastest_growing_segment },
          { label: 'MoM Growth', value: `+${s.fastest_growing_mom}%`, green: true },
          { label: 'Revenue at Risk', value: fmtInr(s.revenue_at_risk), red: true },
        ].map((k) => (
          <div key={k.label} className="text-center">
            <p className="text-xs text-[var(--text-tertiary)]">{k.label}</p>
            <p className={`text-sm font-semibold ${k.red ? 'text-red-600' : k.green ? 'text-green-600' : 'text-[var(--text-primary)]'}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-[var(--border-subtle)]">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === i
                ? 'bg-white border border-b-white border-[var(--border-default)] text-[var(--accent-primary)] -mb-px'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Tab 0: Overview */}
        {tab === 0 && (
          <div className="space-y-6">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.segments} layout="vertical" margin={{ left: 10, right: 60, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis type="number" tickFormatter={(v) => fmtInr(v)} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="segment" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: unknown) => [fmtInr(v as number), 'Revenue']} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {data.segments.map((seg) => (
                      <Cell key={seg.segment} fill={RISK_COLORS[seg.risk_status] ?? '#6366F1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Segment', 'Revenue', '% Total', 'Customers', 'Avg Revenue', 'Margin', 'MoM', 'Status'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.segments.map((seg) => (
                    <tr key={seg.segment} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-medium">{seg.segment}</td>
                      <td className="px-3 py-2">{fmtInr(seg.revenue)}</td>
                      <td className="px-3 py-2">{seg.revenue_pct.toFixed(1)}%</td>
                      <td className="px-3 py-2">{seg.customers.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2">{fmtInr(seg.avg_revenue)}</td>
                      <td className="px-3 py-2">{seg.margin_pct}%</td>
                      <td className={`px-3 py-2 font-medium ${seg.growth_mom >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {seg.growth_mom >= 0 ? '+' : ''}{seg.growth_mom}%
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${RISK_COLORS[seg.risk_status]}22`, color: RISK_COLORS[seg.risk_status] }}>
                          {seg.risk_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              {data.insights.map((ins, i) => (
                <p key={i} className="text-sm text-blue-800 mb-1 last:mb-0">• {ins}</p>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Concentration */}
        {tab === 1 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Revenue Concentration (Pareto Analysis)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.concentration} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="top_pct" tickFormatter={(v) => `Top ${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v: unknown) => [`${v}%`, 'Revenue Share']} />
                  <Area yAxisId="left" type="monotone" dataKey="cumulative_revenue_pct" fill="#6366F133" stroke="#6366F1" strokeWidth={2} name="cumulative_revenue_pct" />
                  <ReferenceLine yAxisId="left" y={80} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '80/20 line', fill: '#EF4444', fontSize: 11 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {data.concentration.slice(0, 4).map((c) => (
                <div key={c.top_pct} className="p-4 bg-[var(--bg-secondary)] rounded-lg text-center">
                  <p className="text-xs text-[var(--text-tertiary)]">Top {c.top_pct}% customers</p>
                  <p className="text-2xl font-bold text-[var(--accent-primary)] mt-1">{c.cumulative_revenue_pct}%</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">of revenue</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{fmtInr(c.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Quality / Margin */}
        {tab === 2 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Segment Quality & Margin Analysis</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.quality} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis type="number" tickFormatter={(v) => `${v}x`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="segment" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: unknown) => [`${v}x`, 'LTV:CAC']} />
                  <Bar dataKey="ltv_cac" name="LTV:CAC" radius={[0, 4, 4, 0]} fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Segment', 'NPS', 'Repeat Rate', 'Tenure (mo)', 'Discount Dep.', 'Margin', 'CAC', 'LTV:CAC'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.quality.map((q) => (
                    <tr key={q.segment} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-medium">{q.segment}</td>
                      <td className="px-3 py-2">{q.nps}</td>
                      <td className="px-3 py-2">{(q.repeat_rate * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2">{q.avg_tenure_months}</td>
                      <td className="px-3 py-2">{(q.discount_dependency * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2">{q.margin_pct}%</td>
                      <td className="px-3 py-2">{fmtInr(q.cac)}</td>
                      <td className={`px-3 py-2 font-semibold ${q.ltv_cac >= 50 ? 'text-green-600' : q.ltv_cac >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                        {q.ltv_cac}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Health Matrix */}
        {tab === 3 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Segment Health Matrix</h3>
            <div className="grid grid-cols-1 gap-4">
              {data.health_matrix.map((h) => (
                <div key={h.segment} className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                  <div className="w-32 text-sm font-medium text-[var(--text-primary)] shrink-0">{h.segment}</div>
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{
                        width: `${h.health_score}%`,
                        background: h.health_score >= 70 ? '#10B981' : h.health_score >= 40 ? '#F59E0B' : '#EF4444',
                      }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right">{h.health_score}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {[
                      { label: 'Trend', value: h.revenue_trend, up: 'up', down: 'down' },
                      { label: 'Churn', value: h.churn_risk },
                      { label: 'Growth', value: h.growth_potential },
                    ].map(({ label, value }) => (
                      <span key={label} className="px-2 py-0.5 rounded text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        {label}: <span className="font-medium">{value}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] flex-1">{h.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Revenue Migration Waterfall */}
        {tab === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Revenue Migration Waterfall</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{data.revenue_migration.period}</p>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenue_migration.waterfall} margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={55} />
                  <YAxis tickFormatter={(v) => fmtInr(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [fmtInr(Math.abs(v as number)), '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.revenue_migration.waterfall.map((item) => (
                      <Cell
                        key={item.label}
                        fill={
                          item.type === 'total' ? '#6366F1' :
                          item.type === 'base' ? '#94A3B8' :
                          item.type === 'positive' ? '#10B981' : '#EF4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {data.revenue_migration.waterfall.filter(w => w.type !== 'base' && w.type !== 'total').map((item) => (
                <div key={item.label} className={`p-3 rounded-lg ${item.type === 'positive' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className={`text-lg font-bold mt-1 ${item.type === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'positive' ? '+' : ''}{fmtInr(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Segment Drill-Down */}
        {tab === 5 && (
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              {drillKeys.map((seg) => (
                <button
                  key={seg}
                  onClick={() => setDrillSegment(seg)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    drillSegment === seg
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>
            {activeDrill && (
              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">TOP SKUS</p>
                  <ul className="space-y-2">
                    {activeDrill.top_skus.map((sku) => (
                      <li key={sku} className="text-sm text-[var(--text-primary)]">• {sku}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">TOP CITIES</p>
                  <ul className="space-y-2">
                    {activeDrill.top_cities.map((city) => (
                      <li key={city} className="text-sm text-[var(--text-primary)]">• {city}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">CHANNEL MIX</p>
                  {Object.entries(activeDrill.channel_mix).map(([ch, pct]) => (
                    <div key={ch} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{ch.replace('_', '-')}</span>
                        <span className="font-medium">{(pct * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-[var(--accent-primary)]" style={{ width: `${pct * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1">
                    <p className="text-xs text-[var(--text-secondary)]">Avg basket size: <span className="font-medium">{activeDrill.avg_items_per_basket} items</span></p>
                    <p className="text-xs text-[var(--text-secondary)]">Preferred day: <span className="font-medium">{activeDrill.preferred_day}</span></p>
                    <p className="text-xs text-[var(--text-secondary)]">Seasonal peak: <span className="font-medium">{activeDrill.seasonal_peak}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
