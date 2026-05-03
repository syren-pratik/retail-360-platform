'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { X, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ChurnDetailData, ChurnMigrationFlow } from '@/app/lib/types';

type TabId = 'overview' | 'matrix' | 'migration' | 'trend' | 'intervention' | 'model';

const TIER_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#f59e0b',
  Low:      '#10b981',
};
const TIERS = ['Critical', 'High', 'Medium', 'Low'];
const TO_COLS = ['Low', 'Medium', 'High', 'Critical', 'Churned'];

function fmtInr(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

interface Props {
  data: ChurnDetailData;
  onClose: () => void;
}

export default function ChurnExpandModal({ data, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [handleClose]);

  const { summary, tier_detail, risk_value_matrix, tier_migration,
    churn_trend, by_channel, recently_churned, intervention_results, model_performance, insights } = data;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview',     label: 'Overview' },
    { id: 'matrix',       label: 'Risk × Value' },
    { id: 'migration',    label: 'Migration' },
    { id: 'trend',        label: 'Trend' },
    { id: 'intervention', label: 'Intervention ROI' },
    { id: 'model',        label: 'Model Health' },
  ];

  // Build migration map
  const migMap: Record<string, Record<string, { count: number; direction: string }>> = {};
  for (const flow of (tier_migration?.flows ?? []) as ChurnMigrationFlow[]) {
    if (!migMap[flow.from]) migMap[flow.from] = {};
    migMap[flow.from][flow.to] = { count: flow.count, direction: flow.direction };
  }

  // Donut data derived from tier_detail
  const donutData = tier_detail.map(t => ({ name: t.tier, value: t.customer_count }));

  function cellColor(dir: string) {
    if (dir === 'improved' || dir === 'saved') return '#dcfce7';
    if (dir === 'worsened') return '#fee2e2';
    if (dir === 'lost') return '#fca5a5';
    if (dir === 'same') return '#f8fafc';
    return '#f8fafc';
  }
  function cellText(dir: string) {
    if (dir === 'improved' || dir === 'saved') return 'text-green-700';
    if (dir === 'worsened' || dir === 'lost') return 'text-red-700';
    return 'text-slate-700';
  }
  function cellArrow(dir: string) {
    if (dir === 'improved') return ' ↗';
    if (dir === 'worsened') return ' ↘';
    if (dir === 'saved') return ' (Saved)';
    if (dir === 'lost') return ' (Churned)';
    return '';
  }

  // Risk×Value grid
  const VALUE_COLS = ['High (VIP)', 'Mid', 'Low'];
  function matrixCell(risk: string, value: string) {
    return risk_value_matrix.find(c => c.risk === risk && c.value === value);
  }
  const isWarRoom = (risk: string, value: string) => risk === 'Critical' && value === 'High (VIP)';
  const isProtect  = (risk: string, value: string) => risk === 'Low' && value === 'High (VIP)';

  const handleExport = () => {
    const rows = tier_detail.map(t => ({ tier: t.tier, customers: t.customer_count, pct: t.pct_of_total, revenue_at_risk: t.revenue_at_risk, avg_clv: t.avg_clv }));
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'churn_risk.csv'; a.click();
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
          <span className="text-sm font-semibold text-[var(--text-primary)]">Churn Risk Distribution</span>
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
          { label: '₹ at Risk (90d)', value: fmtInr(summary.revenue_at_risk_90d), sub: 'Next 90 days' },
          { label: 'Churn Rate MoM', value: `+${summary.churn_trend_mom}%`, sub: 'Accelerating' },
          { label: 'Net Movement', value: `-${Math.abs(tier_migration?.net_movement?.net ?? 0).toLocaleString()}`, sub: tier_migration?.net_movement?.direction ?? '' },
          { label: 'Save Rate', value: `${summary.save_rate_last_quarter}%`, sub: 'Last quarter' },
          { label: 'Intervention ROI', value: `${summary.intervention_roi}x`, sub: `₹21L → ${fmtInr(intervention_results.last_quarter.revenue_retained)}` },
          { label: 'VIP × Critical', value: '312', sub: '₹28Cr at risk' },
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

        {/* ── Tab 1: Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex gap-8 items-start">
              {/* Donut */}
              <div className="relative flex-shrink-0" style={{ width: 240, height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name">
                      {donutData.map(d => <Cell key={d.name} fill={TIER_COLORS[d.name] ?? '#94a3b8'} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [`${(v as number).toLocaleString('en-IN')}`, 'Customers']} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 32 }}>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600">{fmtInr(summary.revenue_at_risk_90d)}</p>
                    <p className="text-xs text-slate-500">at risk</p>
                  </div>
                </div>
              </div>

              {/* Insight list */}
              <div className="flex-1 space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-900">
                    <span>{ins}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier detail table */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Tier Detail</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Tier','Customers','%','Revenue at Risk','Avg CLV','Avg Days Since','Top Driver','Action','Save Rate'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tier_detail.map(t => (
                    <>
                      <tr key={t.tier} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                        onClick={() => setExpandedTier(expandedTier === t.tier ? null : t.tier)}>
                        <td className="px-3 py-2 font-semibold" style={{ color: TIER_COLORS[t.tier] }}>
                          {t.tier}
                        </td>
                        <td className="px-3 py-2">{t.customer_count.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">{t.pct_of_total}%</td>
                        <td className="px-3 py-2 font-medium">{fmtInr(t.revenue_at_risk)}</td>
                        <td className="px-3 py-2">₹{t.avg_clv.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">{t.avg_days_since_purchase}d</td>
                        <td className="px-3 py-2">{t.top_drivers[0]?.driver ?? '—'} ({t.top_drivers[0]?.pct_affected ?? 0}%)</td>
                        <td className="px-3 py-2">{t.recommended_action}</td>
                        <td className="px-3 py-2">{t.historical_save_rate != null ? `${Math.round(t.historical_save_rate * 100)}%` : '—'}</td>
                      </tr>
                      {expandedTier === t.tier && (
                        <tr key={`${t.tier}-expanded`}>
                          <td colSpan={9} className="px-6 py-3 bg-slate-50">
                            <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Top drivers:</p>
                            <div className="space-y-1">
                              {t.top_drivers.map(d => (
                                <div key={d.driver} className="flex items-center gap-3 text-xs">
                                  <div className="w-32 flex-shrink-0">{d.driver}</div>
                                  <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                    <div className="h-1.5 rounded-full" style={{ width: `${d.pct_affected}%`, background: TIER_COLORS[t.tier] }} />
                                  </div>
                                  <div className="w-10 text-right text-[var(--text-secondary)]">{d.pct_affected}%</div>
                                  <div className={`w-16 ${d.direction === 'increasing' ? 'text-red-500' : d.direction === 'decreasing' ? 'text-amber-500' : 'text-slate-400'}`}>
                                    {d.direction === 'increasing' ? '↑ rising' : d.direction === 'decreasing' ? '↓ falling' : '→ stable'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 2: Risk × Value Matrix ── */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">The top-right cell (Critical × VIP) is where 80% of retention ROI lives. The bottom-right (Low × VIP) = protect — do not disturb.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-3 bg-[var(--bg-secondary)] font-semibold text-[var(--text-secondary)]" style={{ minWidth: 120 }}>Risk ↓ / Value →</th>
                    {VALUE_COLS.map(v => (
                      <th key={v} className="px-4 py-3 bg-[var(--bg-secondary)] font-semibold text-[var(--text-secondary)] text-center" style={{ minWidth: 200 }}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map(risk => (
                    <tr key={risk} className="border-t border-[var(--border-subtle)]">
                      <td className="px-4 py-4 font-semibold whitespace-nowrap" style={{ color: TIER_COLORS[risk] }}>
                        {risk}
                      </td>
                      {VALUE_COLS.map(value => {
                        const cell = matrixCell(risk, value);
                        const warRoom = isWarRoom(risk, value);
                        const protect = isProtect(risk, value);
                        const bg = warRoom ? 'bg-red-100 border-2 border-red-400' : protect ? 'bg-green-100 border-2 border-green-400' : risk === 'Critical' ? 'bg-red-50' : risk === 'High' ? 'bg-orange-50' : risk === 'Medium' ? 'bg-amber-50' : 'bg-green-50';
                        return (
                          <td key={value} className="px-2 py-2">
                            <div className={`rounded-lg p-3 ${bg}`}>
                              {warRoom && <p className="text-xs font-bold text-red-700 mb-1">WAR ROOM</p>}
                              {protect && <p className="text-xs font-bold text-green-700 mb-1">PROTECT</p>}
                              {cell ? (
                                <>
                                  <p className="font-semibold text-sm">{cell.customers.toLocaleString('en-IN')} customers</p>
                                  <p className="text-xs text-[var(--text-secondary)]">{fmtInr(cell.revenue_at_risk)} at risk</p>
                                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Avg CLV: ₹{cell.avg_clv.toLocaleString('en-IN')}</p>
                                  <p className="text-xs font-medium mt-1 text-[var(--text-primary)]">{cell.action}</p>
                                </>
                              ) : <p className="text-xs text-slate-400">—</p>}
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
        )}

        {/* ── Tab 3: Migration ── */}
        {activeTab === 'migration' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Month-over-Month Tier Movement ({tier_migration.period})</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      <th className="text-left px-4 py-2.5 font-semibold text-[var(--text-secondary)]">From ↓ / To →</th>
                      {TO_COLS.map(c => (
                        <th key={c} className="text-center px-4 py-2.5 font-semibold" style={{ color: TIER_COLORS[c] ?? '#dc2626', minWidth: 100 }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIERS.map(from => (
                      <tr key={from} className="border-t border-[var(--border-subtle)]">
                        <td className="px-4 py-3 font-semibold" style={{ color: TIER_COLORS[from] }}>{from}</td>
                        {TO_COLS.map(to => {
                          const cell = migMap[from]?.[to];
                          if (!cell) return <td key={to} className="px-4 py-3 text-center text-slate-300">—</td>;
                          return (
                            <td key={to} className="px-4 py-3 text-center" style={{ background: cellColor(cell.direction) }}>
                              <span className={`font-medium text-sm ${cellText(cell.direction)}`}>
                                {cell.count.toLocaleString('en-IN')}{cellArrow(cell.direction)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border-default)] bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-xs text-[var(--text-secondary)]">Net Summary</td>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex gap-4 text-xs">
                          <span className="text-green-700 font-medium">Improved: {tier_migration.net_movement.improved.toLocaleString()}</span>
                          <span className="text-red-700 font-medium">Worsened: {tier_migration.net_movement.worsened.toLocaleString()}</span>
                          <span className="text-red-900 font-medium">Churned: {tier_migration.net_movement.churned.toLocaleString()}</span>
                          <span className={`font-bold ${tier_migration.net_movement.net < 0 ? 'text-red-700' : 'text-green-700'}`}>
                            Net: {tier_migration.net_movement.net > 0 ? '+' : ''}{tier_migration.net_movement.net.toLocaleString()} ({tier_migration.net_movement.direction})
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900">
              Net movement is negative by {Math.abs(tier_migration.net_movement.net).toLocaleString()} customers. Critical tier grew from 7.5% to 10% over 6 months — churn is accelerating.
            </div>
          </div>
        )}

        {/* ── Tab 4: Trend ── */}
        {activeTab === 'trend' && (
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Risk Tier Distribution Over Time</h4>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={churn_trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} stackOffset="expand">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} width={36} />
                    <Tooltip formatter={(v: unknown) => [`${((v as number) * 100).toFixed(1)}%`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                    <Area type="monotone" dataKey="critical_pct" name="Critical" stackId="1" fill="#ef4444" stroke="#ef4444" />
                    <Area type="monotone" dataKey="high_pct"     name="High"     stackId="1" fill="#f97316" stroke="#f97316" />
                    <Area type="monotone" dataKey="medium_pct"   name="Medium"   stackId="1" fill="#f59e0b" stroke="#f59e0b" />
                    <Area type="monotone" dataKey="low_pct"      name="Low"      stackId="1" fill="#10b981" stroke="#10b981" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Revenue at Risk Trend</h4>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={churn_trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => fmtInr(v as number)} tick={{ fontSize: 11 }} width={56} />
                    <Tooltip formatter={(v: unknown) => [fmtInr(v as number), 'Revenue at Risk']} />
                    <Area type="monotone" dataKey="revenue_at_risk" name="Revenue at Risk" fill="#fecaca" stroke="#ef4444" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By channel stacked bar */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Churn Risk by Acquisition Channel</h4>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={by_channel} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: unknown) => [`${v}%`]} />
                    <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                    <Bar dataKey="critical_pct" name="Critical" stackId="a" fill="#ef4444" />
                    <Bar dataKey="high_pct"     name="High"     stackId="a" fill="#f97316" />
                    <Bar dataKey="medium_pct"   name="Medium"   stackId="a" fill="#f59e0b" />
                    <Bar dataKey="low_pct"      name="Low"      stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 5: Intervention ROI ── */}
        {activeTab === 'intervention' && (
          <div className="space-y-8">
            {/* KPI cards */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Interventions', value: intervention_results.last_quarter.total_interventions.toLocaleString() },
                { label: 'Customers Saved', value: intervention_results.last_quarter.customers_saved.toLocaleString() },
                { label: 'Save Rate', value: `${Math.round(intervention_results.last_quarter.save_rate * 100)}%` },
                { label: 'Total Cost', value: fmtInr(intervention_results.last_quarter.total_cost) },
                { label: 'ROI', value: `${intervention_results.last_quarter.roi}x`, highlight: true },
              ].map(k => (
                <div key={k.label} className={`rounded-lg p-4 border ${(k as { highlight?: boolean }).highlight ? 'bg-green-50 border-green-200' : 'bg-[var(--bg-secondary)] border-[var(--border-default)]'}`}>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{k.label}</p>
                  <p className={`text-xl font-bold ${(k as { highlight?: boolean }).highlight ? 'text-green-700' : 'text-[var(--text-primary)]'}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* ROI by Action */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">ROI by Action Type</h4>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intervention_results.by_action.filter(a => a.roi != null)} layout="vertical" margin={{ top: 5, right: 60, left: 160, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} label={{ value: 'ROI (x)', position: 'insideBottomRight', offset: -10, fontSize: 10 }} />
                    <YAxis type="category" dataKey="action" tick={{ fontSize: 10 }} width={160} />
                    <Tooltip formatter={(v: unknown) => [`${v}x`, 'ROI']} />
                    <Bar dataKey="roi" name="ROI" fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {intervention_results.by_action.filter(a => a.roi != null).map((_, i) => (
                        <Cell key={i} fill={['#10b981','#6366f1','#3b82f6','#f59e0b','#94a3b8'][i % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROI by Tier */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">ROI by Tier</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Tier','Saved','Revenue Saved','Cost','ROI'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {intervention_results.by_tier.map(t => (
                    <tr key={t.tier} className="border-t border-[var(--border-subtle)]">
                      <td className="px-3 py-2 font-semibold" style={{ color: TIER_COLORS[t.tier] }}>{t.tier}</td>
                      <td className="px-3 py-2">{t.saved}</td>
                      <td className="px-3 py-2">{fmtInr(t.revenue_saved)}</td>
                      <td className="px-3 py-2">{fmtInr(t.cost)}</td>
                      <td className={`px-3 py-2 font-bold ${t.roi >= 50 ? 'text-green-700' : t.roi >= 20 ? 'text-blue-700' : 'text-amber-700'}`}>{t.roi}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-[var(--text-secondary)] mt-2 italic">Medium tier has highest ROI (111x) because cost is low and save rate is high. Critical has lowest ROI despite highest per-customer value — save rate is only 22%.</p>
            </div>
          </div>
        )}

        {/* ── Tab 6: Model Health ── */}
        {activeTab === 'model' && (
          <div className="space-y-8">
            {/* Model stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Precision', value: `${Math.round(model_performance.precision * 100)}%` },
                { label: 'Recall', value: `${Math.round(model_performance.recall * 100)}%` },
                { label: 'F1 Score', value: `${Math.round(model_performance.f1 * 100)}%` },
                { label: 'AUC-ROC', value: `${Math.round(model_performance.auc_roc * 100)}%` },
              ].map(k => (
                <div key={k.label} className="rounded-lg p-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] text-center">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{k.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-[var(--text-secondary)] -mt-2">
              Last retrained: {model_performance.last_retrained} · Calibration: {model_performance.calibration}
            </div>

            {/* Predicted vs Actual */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Predicted vs Actual Churn %</h4>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model_performance.predicted_vs_actual} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={36} />
                    <Tooltip formatter={(v: unknown) => [`${v}%`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                    <Bar dataKey="predicted_churn_pct" name="Predicted" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="actual_churn_pct"    name="Actual"    fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recently churned */}
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recently Churned — Warmest Winback Targets</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Customer','Segment','CLV','Last Purchase','Days Since','Lifetime Spend','Top Category','Likely Cause'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recently_churned.map(c => (
                    <tr key={c.customer_id} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-mono font-medium">{c.customer_id}</td>
                      <td className="px-3 py-2">{c.segment}</td>
                      <td className="px-3 py-2 font-medium">₹{c.clv.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2">{c.last_purchase}</td>
                      <td className={`px-3 py-2 font-medium ${c.days_since > 60 ? 'text-red-600' : 'text-amber-600'}`}>{c.days_since}d</td>
                      <td className="px-3 py-2">{fmtInr(c.lifetime_spend)}</td>
                      <td className="px-3 py-2">{c.top_category}</td>
                      <td className="px-3 py-2 text-slate-500">{c.cause}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
