'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_TYPE_LABELS: Record<string, string> = {
  understock_risk: 'Understock Risk',
  overstock_risk:  'Overstock Risk',
  event_ramp:      'Event Ramp',
  demand_spike:    'Demand Spike',
  demand_drop:     'Demand Drop',
  anomaly:         'Anomaly',
  promo_extend:    'Promo Extend',
  promo_pull:      'Promo Pull',
  launch_scale:    'Launch Scale',
};

const STACKED_TYPES = [
  'understock_risk',
  'overstock_risk',
  'event_ramp',
  'anomaly',
  'demand_spike',
  'demand_drop',
] as const;

const STACKED_COLORS: Record<string, string> = {
  understock_risk: '#F43F5E',
  overstock_risk:  '#F59E0B',
  event_ramp:      'rgba(245,158,11,0.7)',
  anomaly:         '#6366F1',
  demand_spike:    '#10B981',
  demand_drop:     'rgba(244,63,94,0.7)',
};

const STACKED_LABELS: Record<string, string> = {
  understock_risk: 'Understock',
  overstock_risk:  'Overstock',
  event_ramp:      'Event Ramp',
  anomaly:         'Anomaly',
  demand_spike:    'Demand Spike',
  demand_drop:     'Demand Drop',
};

const INSIGHTS = [
  {
    headline: 'Grocery & Staples has most exceptions by revenue',
    detail: 'Largest total revenue at stake across all exception types. Needs dedicated review.',
    severity: 'negative' as const,
  },
  {
    headline: 'Snacks & Biscuits: rapid demand spike exceptions',
    detail:
      'Multiple demand spike exceptions in Snacks — likely Eid pre-purchase effect.',
    severity: 'warning' as const,
  },
  {
    headline: 'Dairy & Frozen: understock concentration',
    detail:
      'Short shelf-life products are concentration points for understock risk. Tighten reorder triggers.',
    severity: 'warning' as const,
  },
  {
    headline: 'Personal Care: mostly overstock risk',
    detail:
      'Long shelf-life personal care items have accumulated overstock. Consider promotions to clear.',
    severity: 'neutral' as const,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  core: MerchDemandFullPayload;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ByCategoryTab({ core }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Category bar chart data ───────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map = new Map<string, { count: number; revenueAtStake: number }>();
    core.action_items.forEach((item) => {
      const sku = core.skus.find((s) => s.sku_id === item.sku_id);
      const cat = sku?.category ?? 'Unknown';
      const existing = map.get(cat) ?? { count: 0, revenueAtStake: 0 };
      map.set(cat, {
        count: existing.count + 1,
        revenueAtStake: existing.revenueAtStake + Math.abs(item.revenue_impact_inr),
      });
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenueAtStake - a.revenueAtStake);
  }, [core.action_items, core.skus]);

  // ── Filtered exceptions for selected category ─────────────────────────────
  const filteredExceptions = useMemo(() => {
    if (!selectedCategory) return [];
    return core.action_items.filter((item) => {
      const sku = core.skus.find((s) => s.sku_id === item.sku_id);
      return (sku?.category ?? 'Unknown') === selectedCategory;
    });
  }, [selectedCategory, core.action_items, core.skus]);

  // ── Dept stacked breakdown ────────────────────────────────────────────────
  const deptBreakdown = useMemo(() => {
    const depts = Array.from(new Set(core.skus.map((s) => s.department))).sort();
    return depts.map((dept) => {
      const deptSKUs = new Set(
        core.skus.filter((s) => s.department === dept).map((s) => s.sku_id),
      );
      const row: Record<string, unknown> = { dept: dept.split(' ')[0] };
      STACKED_TYPES.forEach((t) => {
        row[t] = core.action_items.filter(
          (i) => deptSKUs.has(i.sku_id) && i.action_type === t,
        ).length;
      });
      return row;
    });
  }, [core.action_items, core.skus]);

  // ── Bar colors ────────────────────────────────────────────────────────────
  const maxRevenue = categoryData[0]?.revenueAtStake ?? 0;

  function barColor(idx: number, revenue: number): string {
    if (revenue === maxRevenue) return '#F43F5E';
    if (idx < 5) return '#F59E0B';
    return '#3B82F6';
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1: bar chart + filtered table ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: horizontal bar chart */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Revenue at Stake by Category
            </h3>
            <AIInsightButton id="merch-dd-revenue-at-stake-by-category" title="Revenue at Stake by Category" data={categoryData as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            Click a bar to filter exceptions
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              layout="vertical"
              data={categoryData}
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-default)" />
              <XAxis
                type="number"
                tickFormatter={(v: unknown) => formatLakhsCrores(Number(v))}
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  formatLakhsCrores(Number(v)),
                  String(name),
                ]}
                contentStyle={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="revenueAtStake"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => {
                  const cat: string = d?.category ?? '';
                  setSelectedCategory(cat === selectedCategory ? null : cat);
                }}
              >
                {categoryData.map((entry, idx) => (
                  <Cell
                    key={entry.category}
                    fill={barColor(idx, entry.revenueAtStake)}
                    opacity={
                      selectedCategory === null || selectedCategory === entry.category ? 1 : 0.4
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: filtered exceptions table */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedCategory ? `Exceptions — ${selectedCategory}` : 'Category Exceptions'}
            </h3>
            <AIInsightButton id="merch-dd-category-exceptions" title={selectedCategory ? `Exceptions — ${selectedCategory}` : 'Category Exceptions'} data={filteredExceptions as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            {selectedCategory
              ? `${filteredExceptions.length} exceptions in this category`
              : 'Click a category bar to filter'}
          </p>

          {!selectedCategory ? (
            <div className="flex items-center justify-center h-64 text-sm text-[var(--text-tertiary)]">
              Select a category from the bar chart
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-[var(--text-tertiary)]">
              No exceptions in this category
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-[var(--text-tertiary)] font-medium uppercase tracking-wide">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-left text-[var(--text-tertiary)] font-medium uppercase tracking-wide">
                      Action Type
                    </th>
                    <th className="px-3 py-2 text-right text-[var(--text-tertiary)] font-medium uppercase tracking-wide">
                      Revenue
                    </th>
                    <th className="px-3 py-2 text-right text-[var(--text-tertiary)] font-medium uppercase tracking-wide">
                      Days
                    </th>
                    <th className="px-3 py-2 text-left text-[var(--text-tertiary)] font-medium uppercase tracking-wide">
                      Conf.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {filteredExceptions
                    .sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr))
                    .map((item) => {
                      const sku = core.skus.find((s) => s.sku_id === item.sku_id);
                      return (
                        <tr
                          key={item.action_id}
                          className="hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <td className="px-3 py-2">
                            <p className="font-medium text-[var(--text-primary)] truncate max-w-[120px]">
                              {sku?.product_name ?? item.sku_id}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {ACTION_TYPE_LABELS[item.action_type] ?? item.action_type}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">
                            {formatLakhsCrores(Math.abs(item.revenue_impact_inr))}
                          </td>
                          <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                            {item.days_to_impact}d
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`font-medium ${
                                item.confidence === 'High'
                                  ? 'text-emerald-700'
                                  : item.confidence === 'Medium'
                                  ? 'text-amber-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {item.confidence}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: stacked bar by department ── */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Exception Type Breakdown by Department
          </h3>
          <AIInsightButton id="merch-dd-exception-type-by-department" title="Exception Type Breakdown by Department" data={deptBreakdown as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          Count of each exception type per department
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={deptBreakdown} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
            <XAxis
              dataKey="dept"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
            <Tooltip
              formatter={(v: unknown, name: unknown) => [
                String(Math.round(Number(v))),
                STACKED_LABELS[String(name)] ?? String(name),
              ]}
              contentStyle={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            {STACKED_TYPES.map((t) => (
              <Bar key={t} dataKey={t} stackId="a" fill={STACKED_COLORS[t]} />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {STACKED_TYPES.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span
                className="w-3 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: STACKED_COLORS[t] }}
              />
              <span className="text-xs text-[var(--text-secondary)]">{STACKED_LABELS[t]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Insights ── */}
      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
