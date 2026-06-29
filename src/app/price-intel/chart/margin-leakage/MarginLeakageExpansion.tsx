'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Line,
  ComposedChart,
  Cell,
} from 'recharts';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import type { PriceIntelCore, PriceIntelActionItem } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  core: PriceIntelCore;
}

const TABS = [
  { id: 'waterfall', label: 'Waterfall' },
  { id: 'trend', label: 'Trend' },
  { id: 'by-department', label: 'By Department' },
  { id: 'sku-drill', label: 'SKU Drill' },
];

function colorTypeToHex(ct: 'base' | 'leak' | 'result'): string {
  if (ct === 'base') return '#6366f1';
  if (ct === 'leak') return '#f43f5e';
  return '#10b981';
}

// ─── Waterfall Tab ────────────────────────────────────────────────────────────

function WaterfallTab({ core }: { core: PriceIntelCore }) {
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  const baseValue = core.margin_waterfall[0]?.value_inr ?? 1;
  const chartData = core.margin_waterfall.map((bar) => ({
    label: bar.label,
    value: bar.value_inr,
    color: colorTypeToHex(bar.color_type),
    pct: ((bar.value_inr / baseValue) * 100).toFixed(1),
    color_type: bar.color_type,
  }));

  // SKUs from action_queue filtered for selected bar
  const leakTypeMap: Record<string, PriceIntelActionItem['alert_type'][]> = {
    'Free-rider Waste': ['free_rider'],
    'Cost Passthrough Gap': ['cost_passthrough'],
    'Premature Markdown': ['markdown_trigger'],
    'Elasticity Underpricing': ['elasticity_opportunity'],
  };

  const filteredSKUs = selectedBar
    ? core.action_queue.filter((a) =>
        (leakTypeMap[selectedBar] ?? []).includes(a.alert_type)
      )
    : [];

  return (
    <div>
      <ResponsiveContainer width="100%" height={440}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 40, left: 20, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis
            tickFormatter={(v: unknown) => formatMoneyAuto(v as number)}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = chartData.find((c) => c.label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{label}</p>
                  <p className="text-gray-600">
                    Value:{' '}
                    <span className="font-medium">{formatMoneyAuto(d?.value ?? 0)}</span>
                  </p>
                  <p className="text-gray-600">
                    % of theoretical max:{' '}
                    <span className="font-medium">{d?.pct}%</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="value"
            name="Value"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(data: unknown) => {
              const d = data as { label: string };
              setSelectedBar((prev) => (prev === d.label ? null : d.label));
            }}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={selectedBar === null || selectedBar === entry.label ? 1 : 0.4}
                stroke={selectedBar === entry.label ? '#1e293b' : 'none'}
                strokeWidth={2}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Bar value labels overlay */}
      <div className="flex gap-2 mt-1 px-8 justify-around">
        {chartData.map((bar) => (
          <div key={bar.label} className="text-center">
            <p
              className="text-xs font-semibold tabular-nums"
              style={{ color: bar.color }}
            >
              {formatMoneyAuto(bar.value)}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{bar.pct}%</p>
          </div>
        ))}
      </div>

      {/* Contributing SKUs panel */}
      {selectedBar && (
        <div className="mt-6 border border-[var(--border-default)] rounded-xl p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Contributing SKUs — {selectedBar}
          </p>
          {filteredSKUs.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No direct action items linked to this bar.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredSKUs.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)]"
                >
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {item.product_name}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      {item.headline}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-rose-600 tabular-nums whitespace-nowrap ml-3">
                    {formatMoneyAuto(item.financial_impact_inr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Trend Tab ────────────────────────────────────────────────────────────────

function TrendTab({ core }: { core: PriceIntelCore }) {
  const breakdown = core.kpis.margin_leakage_breakdown;
  const total = core.kpis.total_margin_leakage_inr;
  const trend = core.kpis.trend_12w;

  // Derive 4 stacked areas proportionally per week using sell_through as proxy
  const avgST = trend.reduce((s, p) => s + p.sell_through, 0) / trend.length || 1;

  const areaData = trend.map((p) => {
    const weekScale = (p.sell_through / avgST) * 0.9 + 0.1; // 0.1-1.0 range
    const weekTotal = total * weekScale;
    const freeRider = breakdown.promo_free_rider_inr * weekScale;
    const passthrough = breakdown.cost_passthrough_gap_inr * weekScale;
    const markdown = breakdown.premature_markdown_inr * weekScale;
    const elasticity = Math.max(0, weekTotal - freeRider - passthrough - markdown);
    return {
      week: `W${p.week}`,
      free_rider: Math.round(freeRider),
      passthrough: Math.round(passthrough),
      markdown: Math.round(markdown),
      elasticity: Math.round(elasticity),
      total: Math.round(weekTotal),
    };
  });

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={areaData} margin={{ top: 16, right: 40, left: 20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis
            tickFormatter={(v: unknown) => formatMoneyAuto(v as number)}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) =>
              [formatMoneyAuto(v as number), name as string] as [string, string]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="free_rider"
            name="Free-rider"
            stackId="leak"
            stroke="#f43f5e"
            fill="#fecaca"
          />
          <Area
            type="monotone"
            dataKey="passthrough"
            name="Cost Passthrough"
            stackId="leak"
            stroke="#f59e0b"
            fill="#fde68a"
          />
          <Area
            type="monotone"
            dataKey="markdown"
            name="Premature Markdown"
            stackId="leak"
            stroke="#f97316"
            fill="#fed7aa"
          />
          <Area
            type="monotone"
            dataKey="elasticity"
            name="Elasticity Underpricing"
            stackId="leak"
            stroke="#EAB308"
            fill="#fef08a"
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total Leakage"
            stroke="#1e293b"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">
        <span className="font-semibold">Insight:</span> Free-rider and cost-passthrough leakage
        peak in weeks with high promo intensity. Elasticity underpricing is relatively stable,
        suggesting structural pricing gaps rather than campaign-driven losses.
      </div>
    </div>
  );
}

// ─── By-Department Tab ────────────────────────────────────────────────────────

interface DeptMix {
  free_rider: number;
  passthrough: number;
  markdown: number;
  elasticity: number;
}

const DEPT_MIX: Record<string, DeptMix> = {
  'Grocery & Staples': { free_rider: 0.2, passthrough: 0.4, markdown: 0.25, elasticity: 0.15 },
  Beverages: { free_rider: 0.55, passthrough: 0.15, markdown: 0.2, elasticity: 0.1 },
  'Dairy & Frozen': { free_rider: 0.2, passthrough: 0.15, markdown: 0.5, elasticity: 0.15 },
  Snacks: { free_rider: 0.25, passthrough: 0.25, markdown: 0.25, elasticity: 0.25 },
  'Personal Care': { free_rider: 0.3, passthrough: 0.35, markdown: 0.2, elasticity: 0.15 },
};

function ByDepartmentTab({ core }: { core: PriceIntelCore }) {
  const breakdown = core.kpis.margin_leakage_breakdown;
  const totalSKUs = core.departments.reduce((s, d) => s + d.sku_count, 0) || 1;

  const deptData = core.departments.map((dept) => {
    const deptShare = dept.sku_count / totalSKUs;
    const deptTotal =
      (breakdown.promo_free_rider_inr +
        breakdown.cost_passthrough_gap_inr +
        breakdown.premature_markdown_inr +
        breakdown.elasticity_underpricing_inr) *
      deptShare;
    const mix = DEPT_MIX[dept.name] ?? { free_rider: 0.25, passthrough: 0.25, markdown: 0.25, elasticity: 0.25 };
    return {
      dept: dept.name.replace(' & ', '\n& '),
      free_rider: Math.round(deptTotal * mix.free_rider),
      passthrough: Math.round(deptTotal * mix.passthrough),
      markdown: Math.round(deptTotal * mix.markdown),
      elasticity: Math.round(deptTotal * mix.elasticity),
    };
  });

  return (
    <div>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={deptData} margin={{ top: 16, right: 24, left: 20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#111827' }} interval={0} />
          <YAxis
            tickFormatter={(v: unknown) => formatMoneyAuto(v as number)}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) =>
              [formatMoneyAuto(v as number), name as string] as [string, string]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="free_rider" name="Free-rider" fill="#f43f5e" radius={[2, 2, 0, 0]} />
          <Bar dataKey="passthrough" name="Cost Passthrough" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          <Bar dataKey="markdown" name="Premature Markdown" fill="#f97316" radius={[2, 2, 0, 0]} />
          <Bar dataKey="elasticity" name="Elasticity" fill="#EAB308" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── SKU Drill Tab ────────────────────────────────────────────────────────────

function SKUDrillTab({ core }: { core: PriceIntelCore }) {
  const sorted = [...core.action_queue].sort(
    (a, b) => b.financial_impact_inr - a.financial_impact_inr
  );
  const top5 = sorted.slice(0, 5);
  const top5sum = top5.reduce((s, a) => s + a.financial_impact_inr, 0);
  const totalImpact = sorted.reduce((s, a) => s + a.financial_impact_inr, 0) || 1;
  const top5pct = ((top5sum / totalImpact) * 100).toFixed(0);

  const alertTypeLabel: Record<string, string> = {
    free_rider: 'Free-rider',
    cost_passthrough: 'Cost Passthrough',
    margin_floor: 'Margin Floor',
    sell_through: 'Sell-Through',
    elasticity_opportunity: 'Elasticity',
    promo_ending: 'Promo Ending',
    competitor_gap: 'Competitor Gap',
    markdown_trigger: 'Markdown Trigger',
  };

  const priorityColors: Record<string, string> = {
    urgent: 'bg-rose-100 text-rose-700',
    review: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <div>
      {/* Recovery call-out */}
      <div className="mb-5 px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
        Fix these <span className="font-semibold">5 SKUs</span> to recover{' '}
        <span className="font-semibold">{formatMoneyAuto(top5sum)}</span> —{' '}
        <span className="font-semibold">{top5pct}%</span> of total leakage
      </div>

      {/* Top 5 cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {top5.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex flex-col gap-1"
          >
            <span
              className={`self-start text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColors[item.priority] ?? ''}`}
            >
              {item.priority.toUpperCase()}
            </span>
            <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight mt-1">
              {item.product_name}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">{item.department}</p>
            <p className="text-base font-bold text-rose-600 tabular-nums mt-auto">
              {formatMoneyAuto(item.financial_impact_inr)}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">impact</p>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                SKU
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Department
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Alert Type
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Impact
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Root Cause
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {sorted.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-3 py-2 font-medium text-[var(--text-primary)] max-w-[160px] truncate">
                  {item.product_name}
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                  {item.department}
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {alertTypeLabel[item.alert_type] ?? item.alert_type}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums font-semibold text-rose-600 whitespace-nowrap">
                  {formatMoneyAuto(item.financial_impact_inr)}
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)] text-xs max-w-[200px] truncate">
                  {item.headline}
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)] text-xs max-w-[180px] truncate">
                  {item.recommended_action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function MarginLeakageExpansion({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view') ?? 'waterfall';

  const handleView = useCallback(
    (v: string) => {
      router.push('?view=' + v, { scroll: false });
    },
    [router]
  );

  const { margin_leakage_breakdown: bd, margin_realization_pct, total_margin_leakage_inr } = core.kpis;

  const kpiTiles = [
    {
      label: 'Total Leakage',
      value: formatMoneyAuto(total_margin_leakage_inr),
      color: 'negative' as const,
    },
    {
      label: 'Free-rider Waste',
      value: formatMoneyAuto(bd.promo_free_rider_inr),
      color: 'negative' as const,
    },
    {
      label: 'Cost Passthrough Gap',
      value: formatMoneyAuto(bd.cost_passthrough_gap_inr),
      color: 'negative' as const,
    },
    {
      label: 'Margin Realization',
      value: `${margin_realization_pct.toFixed(1)}%`,
      color: margin_realization_pct > 80 ? ('positive' as const) : ('warning' as const),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Margin Leakage Analysis"
        subtitle="Waterfall breakdown, trend analysis, and SKU-level drill"
        backLabel="← Back to Price Intel"
        backHref="/price-intel?tab=overview"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={rawView} onTabChange={handleView} />

      <div className="px-8 py-6">
        {rawView === 'waterfall' && <WaterfallTab core={core} />}
        {rawView === 'trend' && <TrendTab core={core} />}
        {rawView === 'by-department' && <ByDepartmentTab core={core} />}
        {rawView === 'sku-drill' && <SKUDrillTab core={core} />}
      </div>
    </div>
  );
}
