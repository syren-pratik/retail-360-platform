'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

const ANCHOR = '2026-05-17';
const CHANNELS = ['In-Store', 'Online', 'Dark Store', 'Quick-Commerce'] as const;
type Channel = typeof CHANNELS[number];

const CHANNEL_COLORS: Record<Channel, string> = {
  'In-Store':       'var(--chart-blue)',
  'Online':         'var(--chart-indigo)',
  'Dark Store':     'var(--chart-emerald)',
  'Quick-Commerce': 'var(--chart-amber)',
};

const CHANNEL_METRICS: Record<Channel, {
  share: number; momChange: number; mape: number; topCategory: string;
}> = {
  'In-Store':       { share: 58, momChange: -7, mape: 16.2, topCategory: 'Grocery & Staples' },
  'Online':         { share: 22, momChange: +4, mape: 18.4, topCategory: 'Beverages' },
  'Dark Store':     { share: 10, momChange: +1, mape: 15.1, topCategory: 'Dairy & Frozen' },
  'Quick-Commerce': { share: 10, momChange: +2, mape: 21.3, topCategory: 'Snacks & Biscuits' },
};

const DEPARTMENTS = ['Grocery & Staples', 'Snacks & Biscuits', 'Dairy & Frozen', 'Beverages', 'Personal Care'];

// Channel × Department heatmap mock values (% share of that dept coming from this channel)
const HEATMAP: Record<string, Record<Channel, number>> = {
  'Grocery & Staples':  { 'In-Store': 64, 'Online': 20, 'Dark Store': 10, 'Quick-Commerce': 6 },
  'Snacks & Biscuits':  { 'In-Store': 52, 'Online': 18, 'Dark Store': 8, 'Quick-Commerce': 22 },
  'Dairy & Frozen':     { 'In-Store': 45, 'Online': 22, 'Dark Store': 25, 'Quick-Commerce': 8 },
  'Beverages':          { 'In-Store': 58, 'Online': 28, 'Dark Store': 7, 'Quick-Commerce': 7 },
  'Personal Care':      { 'In-Store': 55, 'Online': 32, 'Dark Store': 6, 'Quick-Commerce': 7 },
};

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function heatColor(pct: number): { bg: string; fg: string } {
  if (pct >= 60) return { bg: '#1a3a5c', fg: '#fff' };
  if (pct >= 45) return { bg: '#2a5a8c', fg: '#fff' };
  if (pct >= 30) return { bg: '#3a7abc', fg: '#fff' };
  if (pct >= 20) return { bg: '#7ab3d8', fg: '#1a3a5c' };
  return { bg: '#d4e8f5', fg: '#1a3a5c' };
}

const INSIGHTS = [
  { headline: 'Quick-Commerce growing fastest', detail: 'Quick-Commerce channel up +42% MoM. Now 18% of total demand vs 12% last quarter.', severity: 'positive' as const },
  { headline: 'Dark Store accuracy best', detail: 'Dark Store channel has lowest MAPE (15.1%) — predictable demand patterns.', severity: 'positive' as const },
  { headline: 'Online Beverages spike', detail: 'Online Beverages orders up 35% in last 2 weeks — likely summer demand shifting online.', severity: 'warning' as const },
  { headline: 'In-Store Snacks declining', detail: 'In-Store Snacks & Biscuits down 8% vs last month. Quick-Commerce cannibalisation suspected.', severity: 'negative' as const },
];

interface Props {
  core: MerchDemandFullPayload;
  precomputed: MerchDemandFullPayload['precomputed'] | null;
}

export default function ChannelTab({ }: Props) {
  const mixData = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => {
      const date = addDays(ANCHOR, i - 90);
      const t = i / 89;
      const n = (s: number) => 0.98 + seededNoise(i * s) * 0.04;
      const inStore = (65 - t * 7) * n(3);
      const online = (18 + t * 4) * n(7);
      const dark = (10 + t * 1) * n(11);
      const qc = (7 + t * 3) * n(17);
      const total = inStore + online + dark + qc;
      return {
        date,
        'In-Store':       Math.round((inStore / total) * 100 * 10) / 10,
        'Online':         Math.round((online / total) * 100 * 10) / 10,
        'Dark Store':     Math.round((dark / total) * 100 * 10) / 10,
        'Quick-Commerce': Math.round((qc / total) * 100 * 10) / 10,
      };
    });
  }, []);

  const tickFmt = (val: string) => {
    if (!val) return '';
    const dt = new Date(val + 'T00:00:00');
    return `${dt.getDate()} ${dt.toLocaleDateString('en-IN', { month: 'short' })}`;
  };

  return (
    <div className="space-y-6">
      {/* Channel mix evolution */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Channel Mix Over Time</p>
          <AIInsightButton id="merch-dd-channel-mix-over-time" title="Channel Mix Over Time" data={mixData as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">Last 90 days · share of total demand per channel</p>
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mixData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} stackOffset="expand">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                interval={14}
                tickFormatter={tickFmt}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#94A3B8' }}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [`${(Number(v) * 100).toFixed(1)}%`, String(name)]}
                contentStyle={{ fontSize: 11 }}
                cursor={{ stroke: '#E2E8F0' }}
              />
              {CHANNELS.map((ch) => (
                <Area
                  key={ch}
                  dataKey={ch}
                  stackId="1"
                  stroke={CHANNEL_COLORS[ch]}
                  fill={CHANNEL_COLORS[ch]}
                  fillOpacity={0.75}
                  strokeWidth={0}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-5 mt-3 flex-wrap">
          {CHANNELS.map((ch) => (
            <span key={ch} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[ch] }} />
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* Channel metrics grid */}
      <div className="grid grid-cols-4 gap-4">
        {CHANNELS.map((ch) => {
          const m = CHANNEL_METRICS[ch];
          return (
            <div key={ch} className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CHANNEL_COLORS[ch] }} />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{ch}</p>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{m.share}%</p>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">demand share</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">MoM change</span>
                  <span className={`font-medium ${m.momChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.momChange >= 0 ? '+' : ''}{m.momChange}pp
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">MAPE</span>
                  <span className="font-medium text-[var(--text-primary)] tabular-nums">{m.mape}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Top category</span>
                  <span className="font-medium text-[var(--text-primary)] truncate ml-1 text-right" style={{ maxWidth: 100 }}>{m.topCategory}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Channel × Category heatmap */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Channel × Department Demand Share</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">% of each department&apos;s demand from each channel</p>
          </div>
          <AIInsightButton id="merch-dd-channel-department-share" title="Channel × Department Demand Share" data={DEPARTMENTS.map((dept) => ({ department: dept, ...HEATMAP[dept] })) as unknown as Record<string, unknown>[]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left px-5 py-3 font-medium text-[var(--text-tertiary)]">Department</th>
                {CHANNELS.map((ch) => (
                  <th key={ch} className="text-center px-4 py-3 font-medium text-[var(--text-tertiary)]">
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHANNEL_COLORS[ch] }} />
                      {ch}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {DEPARTMENTS.map((dept) => (
                <tr key={dept} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{dept}</td>
                  {CHANNELS.map((ch) => {
                    const val = HEATMAP[dept]?.[ch] ?? 0;
                    const { bg, fg } = heatColor(val);
                    return (
                      <td key={ch} className="px-4 py-3 text-center">
                        <span
                          className="inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums min-w-[48px]"
                          style={{ backgroundColor: bg, color: fg }}
                        >
                          {val}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
