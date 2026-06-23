'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const HIST_CATEGORIES = [
  { category: 'Dal & Pulses', lift2024: 2.62, lift2025: 2.75, lift2026: 2.85 },
  { category: 'Edible Oil', lift2024: 2.11, lift2025: 2.22, lift2026: 2.31 },
  { category: 'Rice', lift2024: 1.35, lift2025: 1.40, lift2026: 1.45 },
  { category: 'Beverages', lift2024: 0.95, lift2025: 0.97, lift2026: 0.98 },
  { category: 'Personal Care', lift2024: 1.05, lift2025: 1.08, lift2026: 1.10 },
];

const INSIGHTS = [
  {
    headline: 'Eid lift trend: +5% per year over 3 years',
    detail:
      'Consistent upward trend. 2026 forecast of 2.85× for Dal & Pulses is well-supported by history.',
    severity: 'positive' as const,
  },
  {
    headline: 'Dal & Pulses most consistent — ±4% variance YoY',
    detail:
      'Most reliable Eid-sensitive category. Historical data is high-confidence for ordering.',
    severity: 'positive' as const,
  },
  {
    headline: 'Ice Cream shows inverse Eid effect',
    detail:
      'Demand drops during Eid as household focus shifts. Reduce orders for this period.',
    severity: 'warning' as const,
  },
  {
    headline: 'Recommend +10% buffer on model forecast',
    detail:
      'Given the upward trend, add a +10% buffer above model forecast for all Eid-sensitive SKUs.',
    severity: 'warning' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function HistoricalLiftTab({ core }: Props) {
  const defaultEventId = useMemo(() => {
    const eid = core.events.find((e) => e.event_name === 'Eid al-Adha');
    return eid?.event_id ?? core.events[0]?.event_id ?? '';
  }, [core.events]);

  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId);

  const chartData = useMemo(
    () =>
      Array.from({ length: 38 }, (_, i) => {
        const day = i - 30; // -30 to +7
        const progress = day < 0 ? Math.max(0, (day + 30) / 30) : Math.max(0, 1 - day / 3);
        const peak2024 = 2.62,
          peak2025 = 2.75,
          peak2026 = 2.85;
        const curve = (peak: number) =>
          day <= 0
            ? 1 + (peak - 1) * Math.pow(progress, 1.5) * (1 + seededNoise(i * 3) * 0.05)
            : Math.max(1, 1 + (peak - 1) * Math.max(0, 1 - day / 3));
        return {
          day: day === 0 ? 'D' : day < 0 ? `D${day}` : `D+${day}`,
          y2024: Number(curve(peak2024).toFixed(3)),
          y2025: Number(curve(peak2025).toFixed(3)),
          y2026: Number(curve(peak2026).toFixed(3)),
          lower_ci: day > 0 ? null : Number((curve(peak2026) * 0.9).toFixed(3)),
          ci_range: day > 0 ? null : Number((curve(peak2026) * 0.2).toFixed(3)),
        };
      }),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Event selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[var(--text-secondary)]">Event:</label>
        <select
          className="input-base text-sm py-1.5 px-3"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {core.events.map((ev) => (
            <option key={ev.event_id} value={ev.event_id}>
              {ev.event_name}
            </option>
          ))}
        </select>
      </div>

      {/* Section 1: Chart */}
      <div className="grid grid-cols-3 gap-6">
        {/* Chart — col-span-2 */}
        <div className="col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Year-over-Year Lift Comparison — Eid al-Adha
            </p>
            <AIInsightButton id="merch-dd-yoy-lift-comparison" title="Year-over-Year Lift Comparison — Eid al-Adha" data={chartData as unknown as Record<string, unknown>[]} />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                interval={4}
              />
              <YAxis
                domain={[0.9, 3.1]}
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                tickFormatter={(v: unknown) => `${Number(v).toFixed(1)}×`}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => {
                  const labelMap: Record<string, string> = {
                    y2024: '2024 Actual',
                    y2025: '2025 Actual',
                    y2026: '2026 Forecast',
                  };
                  return [`${Number(v).toFixed(2)}×`, labelMap[String(name)] ?? String(name)];
                }}
                contentStyle={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />
              <Legend
                formatter={(value: unknown) => {
                  const m: Record<string, string> = {
                    y2024: '2024 Actual',
                    y2025: '2025 Actual',
                    y2026: '2026 Forecast',
                  };
                  return m[String(value)] ?? String(value);
                }}
                wrapperStyle={{ fontSize: 11 }}
              />

              {/* CI band */}
              <Area
                dataKey="lower_ci"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                dataKey="ci_range"
                stroke="none"
                fill="var(--chart-emerald)"
                fillOpacity={0.1}
                isAnimationActive={false}
                stackId="ci"
              />

              {/* Historical lines */}
              <Line
                type="monotone"
                dataKey="y2024"
                stroke="var(--chart-slate)"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="y2025"
                stroke="var(--chart-blue)"
                strokeDasharray="4 2"
                strokeWidth={1.5}
                strokeOpacity={0.7}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="y2026"
                stroke="var(--chart-emerald)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />

              <ReferenceLine
                y={1.0}
                stroke="var(--text-tertiary)"
                strokeDasharray="4 2"
                label={{ value: 'Baseline', position: 'insideTopLeft', fontSize: 10, fill: 'var(--text-tertiary)' }}
              />
              <ReferenceLine
                x="D"
                stroke="var(--chart-rose)"
                strokeDasharray="4 2"
                label={{ value: 'Event Day', position: 'insideTopRight', fontSize: 10, fill: 'var(--chart-rose)' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Right insights panel */}
        <div className="card">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Key Observations</p>
          <div className="space-y-3">
            {[
              '3-year trend: lift increasing +5% per year',
              'Peak consistently at D-1 (day before festival)',
              'Post-event demand returns to baseline within 3 days',
              'Under-forecast risk: recommend +10% buffer',
            ].map((text, i) => (
              <div key={i} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--text-primary)]">{text}</p>
              </div>
            ))}
          </div>

          {/* Legend explanation */}
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Chart legend</p>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 bg-slate-400"
                style={{ backgroundImage: 'repeating-linear-gradient(to right,currentColor 0,currentColor 6px,transparent 6px,transparent 9px)' }}
              />
              <span className="text-xs text-[var(--text-tertiary)]">2024 Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 bg-blue-400"
                style={{ backgroundImage: 'repeating-linear-gradient(to right,currentColor 0,currentColor 4px,transparent 4px,transparent 6px)' }}
              />
              <span className="text-xs text-[var(--text-tertiary)]">2025 Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-emerald-500" />
              <span className="text-xs text-[var(--text-tertiary)]">2026 Forecast</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 bg-emerald-100 rounded" />
              <span className="text-xs text-[var(--text-tertiary)]">90% CI band</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Category breakdown table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Category Peak Lift by Year
          </p>
          <AIInsightButton id="merch-dd-category-peak-lift-by-year" title="Category Peak Lift by Year" data={HIST_CATEGORIES as unknown as Record<string, unknown>[]} />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Category
                </th>
                <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  2024 Peak Lift
                </th>
                <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  2025 Peak Lift
                </th>
                <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  2026 Forecast
                </th>
                <th className="text-center py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {HIST_CATEGORIES.map((row) => {
                const improving = row.lift2026 >= row.lift2024;
                const trendPct = (((row.lift2026 - row.lift2024) / row.lift2024) * 100).toFixed(1);
                return (
                  <tr
                    key={row.category}
                    className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                      {row.category}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">
                      {row.lift2024.toFixed(2)}×
                    </td>
                    <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">
                      {row.lift2025.toFixed(2)}×
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[var(--text-primary)]">
                      {row.lift2026.toFixed(2)}×
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-xs font-semibold ${improving ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {improving ? '↑' : '↓'} {improving ? '+' : ''}{trendPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
