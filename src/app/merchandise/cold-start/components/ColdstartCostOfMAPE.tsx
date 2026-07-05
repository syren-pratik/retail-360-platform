'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartCostOfMAPE } from '@/app/lib/coldstart-types';
import { formatMoneyPlainAuto, getLocaleAuto } from '@/app/lib/format-money';
import { getRuntimeTenant } from '@/app/lib/tenant-runtime';
import { useTenant } from '@/app/context/TenantContext';

interface Props {
  data: ColdstartCostOfMAPE;
}

function formatINR(n: number): string {
  const isApparel = getRuntimeTenant() === 'us_apparel';
  if (isApparel) {
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toLocaleString(getLocaleAuto())}`;
  }
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString(getLocaleAuto())}`;
}

function formatUSD(n: number, rate: number): string {
  const usd = n / rate;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(2)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  rate,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  rate: number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2">Week {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.color }}>{p.name === 'naive_cumulative_cost_inr' ? 'Naive' : 'Champion'}</span>
          <span className="font-mono font-medium">
            {formatINR(p.value)} <span className="text-[var(--text-tertiary)]">({formatUSD(p.value, rate)})</span>
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ColdstartCostOfMAPE({ data }: Props) {
  const { isApparel } = useTenant();
  const { naive_costs, champion_costs, savings, pr_projection, weekly_breakdown } = data;
  const rate = pr_projection.exchange_rate_inr_per_usd;

  const rows = [
    {
      label: 'Naive Baseline',
      mape: naive_costs.mape_pct,
      inr: naive_costs.total_cost_inr,
      description: naive_costs.description,
      colorClass: 'text-rose-600',
      bgClass: 'bg-rose-50',
    },
    {
      label: 'Champion (Blended)',
      mape: champion_costs.mape_pct,
      inr: champion_costs.total_cost_inr,
      description: champion_costs.description,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      label: 'Savings',
      mape: savings.savings_pct,
      inr: savings.total_savings_inr,
      description: savings.description,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 items-start">
      {/* Left: comparison table + trend chart */}
      <div className="col-span-3 space-y-4">
        {/* Comparison table */}
        <ChartCard
          id="coldstart-cost-of-mape-table"
          title="Cost of MAPE — 90-Day Holdout"
          subtitle="Estimated inventory loss cost from forecast error · 42 SKUs · target city launch"
          height={220}
          exportFilename="coldstart_cost_mape_table"
          data={rows as unknown as Record<string, unknown>[]}
        >
          <div className="overflow-hidden rounded-lg border border-[var(--border-default)] text-xs">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                  <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Model</th>
                  <th className="text-right px-3 py-2 text-[var(--text-secondary)] font-medium">MAPE</th>
                  <th className="text-right px-3 py-2 text-[var(--text-secondary)] font-medium">{isApparel ? 'Cost' : 'Cost (INR)'}</th>
                  {!isApparel && <th className="text-right px-3 py-2 text-[var(--text-secondary)] font-medium">Cost (USD)</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[var(--border-default)] last:border-0 ${row.bgClass}`}
                  >
                    <td className="px-3 py-2.5">
                      <span className={`font-semibold ${row.colorClass}`}>{row.label}</span>
                      <p className="text-[var(--text-tertiary)] mt-0.5 leading-tight">{row.description}</p>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${row.colorClass}`}>
                      {row.mape.toFixed(1)}%
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${row.colorClass}`}>
                      {formatINR(row.inr)}
                    </td>
                    {!isApparel && (
                      <td className="px-3 py-2.5 text-right font-mono text-[var(--text-secondary)]">
                        {formatUSD(row.inr, rate)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Cumulative cost trend chart */}
        <ChartCard
          id="coldstart-cost-of-mape-chart"
          title="Cumulative Cost Over 13 Weeks"
          subtitle="Champion model savings widen as local data accumulates and analog prior fades"
          height={220}
          exportFilename="coldstart_cost_mape_chart"
          data={weekly_breakdown as unknown as Record<string, unknown>[]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly_breakdown} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="week_num"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `W${v}`}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v: number) => formatINR(v)}
              />
              <Tooltip content={<CustomTooltip rate={rate} />} />
              <Area
                type="monotone"
                dataKey="naive_cumulative_cost_inr"
                stroke="#f43f5e"
                fill="#fecdd3"
                strokeWidth={2}
                fillOpacity={0.5}
                name="naive_cumulative_cost_inr"
              />
              <Area
                type="monotone"
                dataKey="champion_cumulative_cost_inr"
                stroke="#10b981"
                fill="#a7f3d0"
                strokeWidth={2}
                fillOpacity={0.5}
                name="champion_cumulative_cost_inr"
              />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                    {value === 'naive_cumulative_cost_inr' ? 'Naive Baseline' : 'Champion'}
                  </span>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Right: PR projection */}
      <div className="col-span-2">
        <ChartCard
          id="coldstart-cost-of-mape-projection"
          title="PR Projection"
          subtitle={isApparel ? 'Extrapolated to $1B revenue' : `Extrapolated to ₹100Cr revenue · @₹${rate}=$1`}
          height={470}
          exportFilename="coldstart_cost_mape_projection"
        >
          <div className="space-y-4 text-xs">
            {/* Headline savings */}
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-emerald-700 font-medium mb-1">Projected Savings</p>
              <p className="text-3xl font-bold text-emerald-600">
                ${(pr_projection.projected_savings_usd / 1000).toFixed(0)}K
              </p>
              <p className="text-emerald-600 text-[11px] mt-0.5">
                {formatINR(pr_projection.projected_savings_inr)}{!isApparel && ' USD'}
              </p>
            </div>

            {/* Per-billion metric */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-blue-700 font-medium mb-1">Per $1B Revenue</p>
              <p className="text-xl font-bold text-blue-600">
                ${(pr_projection.projected_savings_usd_per_billion_revenue / 1e6).toFixed(1)}M
              </p>
              <p className="text-[var(--text-tertiary)] text-[10px] mt-0.5">
                Saved annually at scale
              </p>
            </div>

            {/* Breakdown rows */}
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)]">Naive cost (90d)</span>
                <span className="font-mono font-semibold text-rose-600">{formatINR(naive_costs.total_cost_inr)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)]">Champion cost (90d)</span>
                <span className="font-mono font-semibold text-emerald-600">{formatINR(champion_costs.total_cost_inr)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)]">Gross savings</span>
                <span className="font-mono font-semibold text-blue-600">{formatINR(savings.total_savings_inr)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)]">Savings %</span>
                <span className="font-mono font-bold text-blue-600">{savings.savings_pct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[var(--text-secondary)]">Exchange rate</span>
                <span className="font-mono text-[var(--text-primary)]">{formatMoneyPlainAuto(rate)}=$1</span>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed pt-1">
              Projection assumes error costs scale linearly with revenue. Champion model MAPE of {champion_costs.mape_pct.toFixed(1)}% vs naive {naive_costs.mape_pct.toFixed(1)}% across 42 cold-start SKUs.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
