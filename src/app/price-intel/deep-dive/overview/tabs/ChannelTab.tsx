'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  core: PriceIntelCore;
}

const DEPT_COLS = ['Grocery & Staples', 'Beverages', 'Dairy & Frozen', 'Snacks & Biscuits', 'Personal Care'];

const LIFT_DATA: Array<{ channel: string; depts: Record<string, number> }> = [
  { channel: 'In-Store',    depts: { 'Grocery & Staples': 4.2, 'Beverages': 6.1, 'Dairy & Frozen': 3.8, 'Snacks & Biscuits': 7.2, 'Personal Care': 5.4 } },
  { channel: 'Online',      depts: { 'Grocery & Staples': 8.1, 'Beverages': 11.4, 'Dairy & Frozen': 5.2, 'Snacks & Biscuits': 14.6, 'Personal Care': 12.8 } },
  { channel: 'Quick Commerce', depts: { 'Grocery & Staples': 12.3, 'Beverages': 18.7, 'Dairy & Frozen': 8.4, 'Snacks & Biscuits': 22.1, 'Personal Care': 16.4 } },
  { channel: 'Modern Trade', depts: { 'Grocery & Staples': 3.1, 'Beverages': 4.8, 'Dairy & Frozen': 2.9, 'Snacks & Biscuits': 5.6, 'Personal Care': 4.2 } },
  { channel: 'Wholesale',   depts: { 'Grocery & Staples': 1.8, 'Beverages': 2.2, 'Dairy & Frozen': 1.4, 'Snacks & Biscuits': 2.8, 'Personal Care': 1.9 } },
];

const CHANNEL_COLORS: Record<string, string> = {
  'In-Store': '#4F46E5',
  'Online': '#10B981',
  'Quick Commerce': '#F59E0B',
  'Modern Trade': '#3B82F6',
  'Wholesale': '#6B7280',
};

function liftColor(v: number): string {
  if (v >= 15) return '#10B981';
  if (v >= 8)  return '#34D399';
  if (v >= 4)  return '#FCD34D';
  return '#FCA5A5';
}

export default function ChannelTab({ core }: Props) {
  const channelData = core.channel_performance.map((c) => ({
    ...c,
    name: c.channel,
  }));

  return (
    <div className="px-8 py-6">
      {/* Channel performance horizontal bars */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Channel Revenue Performance</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">Weekly revenue with promo lift vs baseline</p>
        <div style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channelData} layout="vertical" margin={{ top: 8, right: 80, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatMoneyAuto(v)}
                tick={{ fontSize: 11, fill: '#111827' }}
                stroke="#D1D5DB"
              />
              <YAxis dataKey="channel" type="category" tick={{ fontSize: 12, fill: '#111827' }} width={110} stroke="#D1D5DB" />
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                formatter={(v: unknown): [string, string] => [formatMoneyAuto(v as number), 'Revenue']}
              />
              <Bar dataKey="revenue_inr" radius={[0, 4, 4, 0]}>
                {channelData.map((entry) => (
                  <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? '#4F46E5'} />
                ))}
                <LabelList
                  dataKey="revenue_lift_pct"
                  position="right"
                  formatter={(v: unknown) => `+${v}% lift`}
                  style={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel × Department heatmap */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Channel × Department Lift Heatmap</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Promo lift % by channel and department</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide w-36">Channel</th>
                {DEPT_COLS.map((d) => (
                  <th key={d} className="px-3 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide text-center">
                    {d.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIFT_DATA.map((row) => (
                <tr key={row.channel} className="border-b border-[var(--border-default)] last:border-0">
                  <td className="px-6 py-3 font-medium text-[var(--text-primary)] text-sm">{row.channel}</td>
                  {DEPT_COLS.map((d) => {
                    const v = row.depts[d] ?? 0;
                    return (
                      <td key={d} className="px-3 py-3 text-center">
                        <span
                          className="inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums"
                          style={{ background: `${liftColor(v)}33`, color: liftColor(v) }}
                        >
                          +{v}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-[var(--border-default)] flex items-center gap-4">
          <span className="text-[10px] text-[var(--text-tertiary)]">Lift scale:</span>
          {[['< 4%', '#FCA5A5'], ['4–8%', '#FCD34D'], ['8–15%', '#34D399'], ['15%+', '#10B981']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: `${c}33`, border: `1px solid ${c}` }} />
              <span className="text-[10px] text-[var(--text-tertiary)]">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
