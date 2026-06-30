'use client';

import { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { CLVDetailData } from '@/app/lib/types';
import { formatMoneyAuto, getLocaleAuto } from '@/app/lib/format-money';

interface CLVExpandModalProps {
  data: CLVDetailData;
  onClose: () => void;
}

const TABS = ['Distribution', 'Economics', 'Behavioral', 'Migration', 'Opportunities', 'Trends'];

const TIER_COLORS: Record<string, string> = {
  Platinum: '#6366F1',
  Gold: '#F59E0B',
  Silver: '#64748B',
  Bronze: '#92400E',
};

function fmtInr(n: number) {
  return formatMoneyAuto(n);
}

export default function CLVExpandModal({ data, onClose }: CLVExpandModalProps) {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const s = data.summary;

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
          <span className="text-sm font-semibold text-[var(--text-primary)]">CLV Distribution</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* KPI Strip */}
      <div className="flex gap-6 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        {[
          { label: 'Total CLV', value: fmtInr(s.total_clv) },
          { label: 'Avg CLV', value: fmtInr(s.avg_clv) },
          { label: 'Median CLV', value: fmtInr(s.median_clv) },
          { label: 'Platinum Share', value: `${(s.top_tier_share * 100).toFixed(1)}%` },
          { label: 'Avg Payback', value: `${s.avg_payback_months} mo` },
          { label: 'CLV Growth MoM', value: `+${s.clv_growth_mom}%`, green: true },
        ].map((k) => (
          <div key={k.label} className="text-center">
            <p className="text-xs text-[var(--text-tertiary)]">{k.label}</p>
            <p className={`text-sm font-semibold ${k.green ? 'text-green-600' : 'text-[var(--text-primary)]'}`}>{k.value}</p>
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

        {/* Tab 0: Distribution */}
        {tab === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">Customer Count by Tier</h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.tier_economics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: unknown) => [(v as number).toLocaleString(getLocaleAuto()), 'Customers']} />
                      <Bar dataKey="customer_count" radius={[4, 4, 0, 0]}>
                        {data.tier_economics.map((t) => <Cell key={t.tier} fill={TIER_COLORS[t.tier] ?? '#6366F1'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">CLV Pareto — Top % Customers</h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pareto} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="top_pct" tickFormatter={(v) => `Top ${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip formatter={(v: unknown) => [`${v}%`, 'CLV Share']} />
                      <Bar dataKey="clv_share" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="4 4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              {data.insights.map((ins, i) => (
                <p key={i} className="text-sm text-blue-800 mb-1 last:mb-0">• {ins}</p>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Economics */}
        {tab === 1 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Tier Economics: LTV, CAC & Payback</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tier_economics} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${v}x`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [`${v}x`, 'LTV:CAC']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="ltv_cac" name="LTV:CAC" radius={[4, 4, 0, 0]}>
                    {data.tier_economics.map((t) => <Cell key={t.tier} fill={TIER_COLORS[t.tier] ?? '#6366F1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Tier', 'Customers', 'Avg CLV', 'Total CLV', 'Margin', 'CAC', 'LTV:CAC', 'Payback', 'Avg Basket', 'Frequency'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tier_economics.map((t) => (
                    <tr key={t.tier} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-medium" style={{ color: TIER_COLORS[t.tier] }}>{t.tier}</td>
                      <td className="px-3 py-2">{t.customer_count.toLocaleString(getLocaleAuto())}</td>
                      <td className="px-3 py-2">{fmtInr(t.avg_clv)}</td>
                      <td className="px-3 py-2">{fmtInr(t.total_clv)}</td>
                      <td className="px-3 py-2">{t.margin_pct}%</td>
                      <td className="px-3 py-2">{fmtInr(t.cac)}</td>
                      <td className={`px-3 py-2 font-semibold ${t.ltv_cac >= 50 ? 'text-green-600' : t.ltv_cac >= 25 ? 'text-amber-600' : 'text-red-600'}`}>{t.ltv_cac}x</td>
                      <td className="px-3 py-2">{t.payback_months} mo</td>
                      <td className="px-3 py-2">{fmtInr(t.avg_basket)}</td>
                      <td className="px-3 py-2">{t.avg_frequency}/yr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Behavioral Profile */}
        {tab === 2 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Behavioral Profile by Tier</h3>
            <div className="grid grid-cols-2 gap-6">
              {data.behavioral_profile.map((b) => (
                <div key={b.tier} className="p-4 border border-[var(--border-subtle)] rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-sm" style={{ background: TIER_COLORS[b.tier] }} />
                    <span className="font-semibold text-[var(--text-primary)]">{b.tier}</span>
                    <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">NPS {b.nps}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-[var(--text-tertiary)]">Top Category:</span> <span className="font-medium">{b.top_category}</span></div>
                    <div><span className="text-[var(--text-tertiary)]">Top Channel:</span> <span className="font-medium">{b.top_channel}</span></div>
                    <div><span className="text-[var(--text-tertiary)]">Sessions/wk:</span> <span className="font-medium">{b.avg_sessions_pw}</span></div>
                    <div><span className="text-[var(--text-tertiary)]">Browse→Buy:</span> <span className="font-medium">{(b.browse_to_buy * 100).toFixed(0)}%</span></div>
                    <div><span className="text-[var(--text-tertiary)]">Omni Rate:</span> <span className="font-medium">{(b.omni_rate * 100).toFixed(0)}%</span></div>
                    <div><span className="text-[var(--text-tertiary)]">Mobile Share:</span> <span className="font-medium">{(b.mobile_share * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)]">Discount sensitivity:</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.discount_sensitivity === 'low' ? 'bg-green-100 text-green-700' :
                      b.discount_sensitivity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>{b.discount_sensitivity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Migration */}
        {tab === 3 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Tier Migration — Quarter-over-Quarter</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">From</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">To</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">Customers</th>
                    <th className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">Direction</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {data.migration_flows.map((f, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-medium" style={{ color: TIER_COLORS[f.from] }}>{f.from}</td>
                      <td className="px-3 py-2 font-medium" style={{ color: f.to === 'Churned' ? '#EF4444' : TIER_COLORS[f.to] }}>{f.to}</td>
                      <td className="px-3 py-2 text-right">{f.count.toLocaleString(getLocaleAuto())}</td>
                      <td className="px-3 py-2 text-center text-lg">
                        {f.direction === 'up' ? '↑' : f.direction === 'down' ? '↓' : 'x'}
                      </td>
                      <td className={`px-3 py-2 text-xs font-medium ${
                        f.direction === 'up' ? 'text-green-600' : f.direction === 'lost' ? 'text-red-700' : 'text-amber-600'
                      }`}>
                        {f.direction === 'up' ? 'Revenue gain' : f.direction === 'lost' ? 'Customer lost' : 'Revenue risk'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Opportunities */}
        {tab === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Upgrade Opportunities</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Customers close to the next tier threshold</p>
            </div>
            <div className="space-y-4">
              {data.upgrade_opportunities.map((opp) => (
                <div key={opp.tier} className="p-4 border border-[var(--border-subtle)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[var(--text-primary)]">{opp.tier}</span>
                    <span className="text-lg font-bold text-green-600">{fmtInr(opp.revenue_potential)}</span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div><span className="text-[var(--text-tertiary)]">Customers:</span> <span className="font-medium">{opp.customers.toLocaleString(getLocaleAuto())}</span></div>
                    <div><span className="text-[var(--text-tertiary)]">Avg CLV Gap:</span> <span className="font-medium">{fmtInr(opp.gap_avg_clv)}</span></div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">Action: {opp.action}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mt-4 mb-3">High-CLV Customers at Risk</h3>
              <div className="space-y-3">
                {data.at_risk_high_clv.map((r) => (
                  <div key={r.tier} className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-center w-20 shrink-0">
                      <p className="text-xs text-[var(--text-tertiary)]">Tier</p>
                      <p className="font-semibold" style={{ color: TIER_COLORS[r.tier] }}>{r.tier}</p>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                      <div><span className="text-[var(--text-tertiary)]">At Risk:</span> <span className="font-medium text-red-600">{r.at_risk_count.toLocaleString(getLocaleAuto())} customers</span></div>
                      <div><span className="text-[var(--text-tertiary)]">Revenue Risk:</span> <span className="font-medium text-red-600">{fmtInr(r.revenue_at_risk)}</span></div>
                      <div><span className="text-[var(--text-tertiary)]">Days Inactive:</span> <span className="font-medium">{r.avg_days_inactive} days</span></div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] w-48 shrink-0">{r.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Trends */}
        {tab === 5 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">CLV Trends by Tier (10 Months)</h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tickFormatter={(v) => fmtInr(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [fmtInr(v as number)]} />
                  <Legend />
                  <Line type="monotone" dataKey="platinum_avg" stroke={TIER_COLORS.Platinum} strokeWidth={2} dot={false} name="platinum_avg" />
                  <Line type="monotone" dataKey="gold_avg" stroke={TIER_COLORS.Gold} strokeWidth={2} dot={false} name="gold_avg" />
                  <Line type="monotone" dataKey="silver_avg" stroke={TIER_COLORS.Silver} strokeWidth={2} dot={false} name="silver_avg" />
                  <Line type="monotone" dataKey="bronze_avg" stroke={TIER_COLORS.Bronze} strokeWidth={2} dot={false} name="bronze_avg" />
                  <Line type="monotone" dataKey="total_avg" stroke="#6366F1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="total_avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
