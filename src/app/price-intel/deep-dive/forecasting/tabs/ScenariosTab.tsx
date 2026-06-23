'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props { core: PriceIntelCore }

const SCENARIO_MULTIPLIERS = {
  downside:  { revenue: 0.88, margin: 0.82, label: 'Downside',  color: '#F43F5E', bg: '#FFF1F2' },
  base:      { revenue: 1.00, margin: 1.00, label: 'Base Case', color: '#4F46E5', bg: '#EEF2FF' },
  upside:    { revenue: 1.12, margin: 1.18, label: 'Upside',    color: '#10B981', bg: '#ECFDF5' },
};

export default function ScenariosTab({ core }: Props) {
  const base14WRevenue = core.forecast_14w.reduce((s, d) => s + d.forecast_revenue_inr, 0);
  const base14WMargin  = core.forecast_14w.reduce((s, d) => s + d.forecast_margin_inr, 0);

  const scenarios = Object.entries(SCENARIO_MULTIPLIERS).map(([key, cfg]) => {
    const chartData = core.forecast_14w.map((d) => ({
      week: d.week_label,
      revenue: Math.round(d.forecast_revenue_inr * cfg.revenue),
      margin:  Math.round(d.forecast_margin_inr  * cfg.margin),
    }));
    return {
      key,
      ...cfg,
      chartData,
      totalRevenue: Math.round(base14WRevenue * cfg.revenue),
      totalMargin:  Math.round(base14WMargin  * cfg.margin),
      avgMarginPct: (cfg.margin * (base14WMargin / base14WRevenue) * 100).toFixed(1),
      activeCampaigns: key === 'upside' ? core.campaigns.filter((c) => c.status === 'live').length + 2 : core.campaigns.filter((c) => c.status === 'live').length,
    };
  });

  return (
    <div className="px-8 py-6">
      <div className="grid grid-cols-3 gap-6">
        {scenarios.map((s) => (
          <div
            key={s.key}
            className="card overflow-hidden"
            style={{ borderTop: `3px solid ${s.color}` }}
          >
            <div className="px-5 py-4 border-b border-[var(--border-default)]" style={{ background: s.bg }}>
              <h3 className="text-base font-semibold" style={{ color: s.color }}>{s.label}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {s.key === 'upside' ? 'All campaigns optimized, no free-rider' : s.key === 'downside' ? 'Reduced promo efficiency, market headwinds' : 'Current trajectory maintained'}
              </p>
            </div>

            <div style={{ height: 180 }} className="px-4 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#111827' }} interval={3} stroke="#D1D5DB" />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                    formatter={(v: unknown, name: unknown): [string, string] => [formatLakhsCrores(v as number), name === 'revenue' ? 'Revenue' : 'Margin']}
                  />
                  <Line dataKey="revenue" stroke={s.color} strokeWidth={2} dot={false} />
                  <Line dataKey="margin" stroke={s.color} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="px-5 py-4 space-y-2.5">
              {[
                { label: '14W Revenue', value: formatLakhsCrores(s.totalRevenue), color: 'text-[var(--text-primary)]' },
                { label: '14W Margin', value: formatLakhsCrores(s.totalMargin), color: 'text-emerald-600' },
                { label: 'Avg Margin %', value: `${s.avgMarginPct}%`, color: s.key === 'upside' ? 'text-emerald-600' : s.key === 'downside' ? 'text-rose-600' : 'text-[var(--text-primary)]' },
                { label: 'vs Base Revenue', value: s.key === 'base' ? '—' : `${s.key === 'upside' ? '+' : ''}${formatLakhsCrores(s.totalRevenue - base14WRevenue)}`, color: s.key === 'upside' ? 'text-emerald-600' : 'text-rose-600' },
                { label: 'Active campaigns', value: String(s.activeCampaigns), color: 'text-[var(--text-primary)]' },
                { label: 'Promo ROI', value: `${s.key === 'upside' ? '4.1' : s.key === 'downside' ? '2.4' : '3.5'}×`, color: 'text-[var(--text-primary)]' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center border-b border-[var(--border-default)] pb-2 last:border-0">
                  <span className="text-xs text-[var(--text-tertiary)]">{row.label}</span>
                  <span className={`text-xs font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
              {s.key === 'upside' && (
                <button
                  onClick={() => console.log('Apply upside scenario')}
                  className="w-full mt-2 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Apply Upside Scenario
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
