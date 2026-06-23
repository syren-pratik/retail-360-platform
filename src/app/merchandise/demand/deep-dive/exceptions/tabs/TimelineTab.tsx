'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const ANCHOR = '2026-05-17';

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatAxisDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[d.getMonth()]}`;
}

const resolutionStats = [
  { label: 'Approved this week', value: 12, trend: +4, trendPositive: true },
  { label: 'Overridden',         value: 3,  trend: -1, trendPositive: true },
  { label: 'Snoozed',            value: 8,  trend: +2, trendPositive: false },
  { label: 'Newly created',      value: 18, trend: +5, trendPositive: false },
];

const INSIGHTS = [
  {
    headline: 'Exception volume up 51% over 4 weeks',
    detail:
      'From ~35 to 53 exceptions. Eid preparation pressure is the primary driver of the increase.',
    severity: 'negative' as const,
  },
  {
    headline: 'Critical exceptions accelerating in Week 4',
    detail:
      'Week 4 sees a disproportionate rise in Critical-priority items. Immediate action needed this week.',
    severity: 'negative' as const,
  },
  {
    headline: '12 exceptions approved this week — good progress',
    detail:
      'Approval rate is improving. Continue this pace to clear the backlog before Eid.',
    severity: 'positive' as const,
  },
  {
    headline: 'Average 4 new exceptions per day',
    detail:
      'Steady inflow means the queue will not clear itself. Dedicated daily review session recommended.',
    severity: 'warning' as const,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  core: MerchDemandFullPayload;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimelineTab({ }: Props) {
  // ── Timeline data — 28 days ───────────────────────────────────────────────
  const timelineData = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const date = addDays(ANCHOR, i - 28);
        const week = Math.floor(i / 7);
        // Week 1: ~35, week 2: ~42, week 3: ~48, week 4: ~53
        const baseTotal = [35, 42, 48, 53][week];
        const noise = seededNoise(i * 7);
        const total = Math.round(baseTotal * (0.85 + noise * 0.3));
        const critical = Math.round(
          total * (0.05 + week * 0.04 + seededNoise(i * 11) * 0.05),
        );
        const high = Math.round(total * (0.2 + seededNoise(i * 13) * 0.1));
        const medium = total - critical - high;
        return {
          date,
          critical: Math.max(0, critical),
          high: Math.max(0, high),
          medium: Math.max(0, medium),
          total,
        };
      }),
    [],
  );

  // ── Velocity data ─────────────────────────────────────────────────────────
  const velocityData = useMemo(
    () =>
      timelineData.map((d, i) => ({
        date: d.date,
        new_exceptions: Math.round(2 + seededNoise(i * 19) * 4 + (i / 28) * 3),
      })),
    [timelineData],
  );

  const avgNewPerDay =
    velocityData.reduce((s, d) => s + d.new_exceptions, 0) / velocityData.length;

  return (
    <div className="space-y-6">
      {/* ── Section 1: Stacked area chart ── */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Exception Volume Over Time
          </h3>
          <AIInsightButton id="merch-dd-exception-volume-over-time" title="Exception Volume Over Time" data={timelineData as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          4-week trailing window — stacked by priority
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={timelineData}
            margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatAxisDate}
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              interval={6}
            />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
            <Tooltip
              formatter={(v: unknown, name: unknown) => [
                String(Math.round(Number(v))),
                String(name),
              ]}
              labelFormatter={(label: unknown) => formatAxisDate(String(label))}
              contentStyle={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="medium"
              stackId="1"
              stroke="#3B82F6"
              fill="url(#gradMedium)"
              strokeWidth={1.5}
              name="Medium"
            />
            <Area
              type="monotone"
              dataKey="high"
              stackId="1"
              stroke="#F59E0B"
              fill="url(#gradHigh)"
              strokeWidth={1.5}
              name="High"
            />
            <Area
              type="monotone"
              dataKey="critical"
              stackId="1"
              stroke="#F43F5E"
              fill="url(#gradCritical)"
              strokeWidth={1.5}
              name="Critical"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex gap-4 mt-3">
          {[
            { color: '#3B82F6', label: 'Medium' },
            { color: '#F59E0B', label: 'High' },
            { color: '#F43F5E', label: 'Critical' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Resolution stats ── */}
      <div className="grid grid-cols-4 gap-4">
        {resolutionStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-4"
          >
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {stat.value}
            </p>
            <p
              className={`text-xs mt-1 ${
                stat.trendPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {stat.trend >= 0 ? '+' : ''}
              {stat.trend} vs last week
            </p>
          </div>
        ))}
      </div>

      {/* ── Section 3: Velocity line chart ── */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            New Exceptions Per Day
          </h3>
          <AIInsightButton id="merch-dd-new-exceptions-per-day" title="New Exceptions Per Day" data={velocityData as unknown as Record<string, unknown>[]} />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          Daily inflow rate — avg {avgNewPerDay.toFixed(1)} per day over 4 weeks
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={velocityData}
            margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatAxisDate}
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              interval={6}
            />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
            <Tooltip
              formatter={(v: unknown, name: unknown) => [
                String(Math.round(Number(v))),
                String(name),
              ]}
              labelFormatter={(label: unknown) => formatAxisDate(String(label))}
              contentStyle={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={avgNewPerDay}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              label={{
                value: `Avg ${avgNewPerDay.toFixed(1)}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#94A3B8',
              }}
            />
            <Line
              type="monotone"
              dataKey="new_exceptions"
              stroke="#6366F1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="New Exceptions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Insights ── */}
      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
