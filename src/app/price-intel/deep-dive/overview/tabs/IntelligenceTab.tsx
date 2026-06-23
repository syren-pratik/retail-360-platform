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
import DeepDiveInsights from '@/app/merchandise/demand/deep-dive/shared/DeepDiveInsights';

interface Props {
  core: PriceIntelCore;
}

const INSIGHTS = [
  {
    headline: 'Free-rider waste accelerating in Beverages',
    detail:
      'Beverages promo free-rider ratio hit 58% this week — ₹4.2L of promo spend non-incremental. Recommend switching to loyalty-gated mechanic.',
    severity: 'negative' as const,
  },
  {
    headline: 'Elasticity opportunity in Dal & Pulses',
    detail:
      'Dal & Pulses elasticity -0.28 (inelastic). A ₹2 price increase projects ₹8.4L incremental margin with < 2% volume impact.',
    severity: 'positive' as const,
  },
  {
    headline: 'Cost passthrough gap widening',
    detail:
      '6 Dairy SKUs have cost increases not yet passed through. Total daily margin erosion: ₹18K. Recommend MRP revision before next restock.',
    severity: 'warning' as const,
  },
  {
    headline: 'Promo ROI trending up 4 consecutive weeks',
    detail:
      'Blended ROI reached 3.52× this week — highest in 14 weeks. Bundle mechanics driving the improvement.',
    severity: 'positive' as const,
  },
];

const SPARKLINE_CONFIG = [
  { key: 'margin_realization_pct', label: 'Margin Realization', unit: '%', color: '#4F46E5', suffix: '%' },
  { key: 'promo_roi', label: 'Promo ROI', unit: '×', color: '#10B981', suffix: '×' },
  { key: 'sell_through', label: 'Sell-through', unit: '%', color: '#F59E0B', suffix: '%' },
] as const;

export default function IntelligenceTab({ core }: Props) {
  const trendData = core.kpis.trend_12w;

  return (
    <div className="px-8 py-6">
      {/* AI Insight cards */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">AI Intelligence</h3>
        <DeepDiveInsights insights={INSIGHTS} />
      </div>

      {/* 12-week sparklines */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">12-Week KPI Trends</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">Trailing 12 weeks — margin realization, promo ROI, and sell-through</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {SPARKLINE_CONFIG.map((cfg) => {
          const vals = trendData.map((d) => d[cfg.key]);
          const latest = vals[vals.length - 1];
          const prev = vals[vals.length - 2];
          const delta = latest - prev;
          return (
            <div key={cfg.key} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">{cfg.label}</p>
                  <p className="text-xl font-semibold text-[var(--text-primary)] mt-0.5">
                    {typeof latest === 'number' ? latest.toFixed(1) : latest}{cfg.suffix}
                  </p>
                </div>
                <span className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}{cfg.suffix} vs prev
                </span>
              </div>
              <div style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="week" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                      formatter={(v: unknown): [string, string] => [`${(v as number).toFixed(1)}${cfg.suffix}`, cfg.label]}
                      labelFormatter={(l: unknown) => `W${l}`}
                    />
                    <Line dataKey={cfg.key} stroke={cfg.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
