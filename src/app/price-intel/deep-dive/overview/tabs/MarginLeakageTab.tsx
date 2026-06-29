'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  core: PriceIntelCore;
}

const LEAK_META: Record<string, { label: string; dept: string; color: string }> = {
  'Free-rider waste':       { label: 'Promo Free-rider',    dept: 'Beverages, Personal Care', color: '#F43F5E' },
  'Cost passthrough gap':   { label: 'Cost Passthrough',    dept: 'Dairy & Frozen, Grocery',  color: '#F97316' },
  'Premature markdown':     { label: 'Premature Markdown',  dept: 'Snacks & Biscuits',         color: '#F59E0B' },
  'Elasticity gap':         { label: 'Elasticity Under-pricing', dept: 'Grocery, Dairy',       color: '#8B5CF6' },
};

export default function MarginLeakageTab({ core }: Props) {
  const waterfallData = useMemo(() => {
    let running = 0;
    return core.margin_waterfall.map((bar) => {
      if (bar.is_total) {
        const entry = { label: bar.label, start: 0, amount: bar.value_inr, color: bar.color_type === 'base' ? '#10B981' : '#4F46E5', runningTotal: bar.value_inr };
        if (bar.color_type === 'base') running = bar.value_inr;
        return entry;
      } else {
        const amt = Math.abs(bar.value_inr);
        running -= amt;
        return { label: bar.label, start: running, amount: amt, color: '#F43F5E', runningTotal: running };
      }
    });
  }, [core.margin_waterfall]);

  const leakRows = core.margin_waterfall.filter((b) => !b.is_total);
  const total = core.kpis.total_margin_leakage_inr;

  return (
    <div className="px-8 py-6">
      {/* Waterfall chart */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Weekly Margin Leakage Waterfall</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Total margin leakage: <span className="font-semibold text-rose-600">{formatMoneyAuto(total)}/week</span>
        </p>
        <div style={{ height: 560 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} margin={{ top: 20, right: 24, bottom: 20, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <YAxis
                tickFormatter={(v: number) => formatMoneyAuto(v)}
                tick={{ fontSize: 11, fill: '#111827' }}
                stroke="#D1D5DB"
              />
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                formatter={(value: unknown, _name: unknown, props: { payload?: { label?: string; amount?: number } }): [string, string] => [
                  formatMoneyAuto(props?.payload?.amount ?? (value as number)),
                  props?.payload?.label ?? '',
                ]}
                cursor={{ fill: 'var(--bg-secondary)' }}
              />
              {/* Invisible spacer bar */}
              <Bar dataKey="start" stackId="wf" fill="transparent" />
              {/* Visible bar */}
              <Bar dataKey="amount" stackId="wf" radius={[3, 3, 0, 0]}>
                {waterfallData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="amount"
                  position="top"
                  formatter={(v: unknown) => formatMoneyAuto(v as number)}
                  style={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Leakage Breakdown</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
              {['Leak type', 'Weekly loss', '% of total', 'Departments affected', 'Top SKUs'].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leakRows.map((row, i) => {
              const meta = LEAK_META[row.label];
              const pct = ((Math.abs(row.value_inr) / total) * 100).toFixed(0);
              const topSkus = core.skus
                .filter((s) => Math.abs(s.revenue_impact_inr) > 0)
                .sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr))
                .slice(i * 3, i * 3 + 3)
                .map((s) => s.product_name.split(' ').slice(0, 2).join(' '))
                .join(', ');
              return (
                <tr key={row.label} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: meta?.color ?? '#ccc' }} />
                      <span className="font-medium text-[var(--text-primary)]">{meta?.label ?? row.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-rose-600">{formatMoneyAuto(Math.abs(row.value_inr))}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-rose-100" style={{ width: 80 }}>
                        <div className="h-full rounded-full bg-rose-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span>{pct}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">{meta?.dept ?? '—'}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)] text-xs">{topSkus || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
