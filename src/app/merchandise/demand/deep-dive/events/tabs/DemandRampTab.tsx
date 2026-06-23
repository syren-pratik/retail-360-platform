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
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const CATEGORIES = [
  { key: 'dal_pulses', label: 'Dal & Pulses', peak: 2.85, color: 'var(--chart-rose)' },
  { key: 'edible_oil', label: 'Edible Oil', peak: 2.31, color: 'var(--chart-amber)' },
  { key: 'rice', label: 'Rice', peak: 1.45, color: 'var(--chart-blue)' },
  { key: 'beverages', label: 'Beverages', peak: 0.98, color: 'var(--chart-slate)' },
];

const PHASE_ACTIONS: Record<string, string> = {
  'D-14 to D-7': 'Monitor — ramp starting',
  'D-7 to D-3': 'Action required — order now',
  'D-3 to D-0': 'Final check — confirm stock',
};

function getPhase(day: number): { phase: string; action: string; style: string } {
  if (day === 0) {
    return { phase: 'PEAK', action: 'Confirm stock', style: 'text-rose-600 font-bold' };
  } else if (day >= -3) {
    return { phase: 'peak', action: 'Final check', style: 'text-rose-600 font-semibold' };
  } else if (day >= -7) {
    return { phase: 'building', action: 'Action required', style: 'text-amber-600' };
  } else {
    return { phase: 'normal', action: 'Monitor', style: 'text-[var(--text-secondary)]' };
  }
}

const INSIGHTS = [
  {
    headline: 'Demand ramp begins D-7 across all Eid categories',
    detail: 'Set procurement triggers at D-7 to ensure stock arrives in time.',
    severity: 'warning' as const,
  },
  {
    headline: 'Panic-buying peak at D-1: 2.85× for Dal & Pulses',
    detail:
      'Final ordering should happen no later than D-3 to capture shelf availability.',
    severity: 'negative' as const,
  },
  {
    headline: 'D+1 demand drops back to baseline',
    detail:
      'Avoid over-ordering: post-event demand is very low. Stock ordered for D should be sized conservatively.',
    severity: 'neutral' as const,
  },
  {
    headline: 'Ramp curve consistent with cold-start model validation',
    detail:
      'Festival demand shape matches the cold-start module validation results from Q1.',
    severity: 'positive' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function DemandRampTab({ core }: Props) {
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.key)),
  );

  const defaultEventId = useMemo(() => {
    const eid = core.events.find((e) => e.event_name === 'Eid al-Adha');
    return eid?.event_id ?? core.events[0]?.event_id ?? '';
  }, [core.events]);

  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId);

  const chartData = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => {
        const day = i - 14; // -14 to 0
        const progress = i / 13;
        const point: Record<string, unknown> = {
          day: day === 0 ? 'D' : `D${day}`,
        };
        CATEGORIES.forEach((cat) => {
          const catIdx = CATEGORIES.indexOf(cat);
          const mult =
            cat.peak <= 1
              ? 1.0 + (cat.peak - 1) * progress
              : 1.0 +
                (cat.peak - 1.0) *
                  Math.pow(progress, 1.4) *
                  (1 + seededNoise(i * 17 + catIdx) * 0.04);
          point[cat.key] = Number(mult.toFixed(3));
          point[cat.key + '_lower'] = Number((mult * 0.88).toFixed(3));
          point[cat.key + '_range'] = Number((mult * 0.24).toFixed(3));
        });
        return point;
      }),
    [],
  );

  // Table rows D-14 to D
  const tableRows = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => {
        const day = i - 14;
        const progress = i / 13;
        const dalMult =
          1.0 +
          (2.85 - 1.0) *
            Math.pow(progress, 1.4) *
            (1 + seededNoise(i * 17) * 0.04);
        const aboveBaseline = ((dalMult - 1) * 100).toFixed(0);
        const { phase, action, style } = getPhase(day);
        return { day, dalMult: Number(dalMult.toFixed(2)), aboveBaseline, phase, action, style };
      }),
    [],
  );

  function toggleCategory(key: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

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

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Demand Ramp Curve (D-14 to D)
            </p>
            <AIInsightButton id="merch-dd-demand-ramp-curve" title="Demand Ramp Curve (D-14 to D)" data={chartData as unknown as Record<string, unknown>[]} />
          </div>

          {/* Category toggles */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeCategories.has(cat.key)
                    ? 'border-transparent bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                    : 'border-[var(--border-primary)] text-[var(--text-tertiary)]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeCategories.has(cat.key) ? cat.color : '#cbd5e1' }}
                />
                {cat.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={480}>
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
              <YAxis
                domain={[0.8, 3.2]}
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                tickFormatter={(v: unknown) => `${Number(v).toFixed(1)}×`}
              />
              <Tooltip
                formatter={(v: unknown, name: unknown) => {
                  const key = String(name);
                  if (key.endsWith('_lower') || key.endsWith('_range')) return [null, null];
                  const cat = CATEGORIES.find((c) => c.key === key);
                  return [`${Number(v).toFixed(2)}×`, cat?.label ?? key];
                }}
                contentStyle={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />

              {CATEGORIES.filter((cat) => activeCategories.has(cat.key)).map((cat) => (
                <>
                  <Area
                    key={`${cat.key}_ci`}
                    dataKey={cat.key + '_lower'}
                    stroke="none"
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Area
                    key={`${cat.key}_range`}
                    dataKey={cat.key + '_range'}
                    stroke="none"
                    fill={cat.color}
                    fillOpacity={0.08}
                    isAnimationActive={false}
                  />
                  <Line
                    key={cat.key}
                    type="monotone"
                    dataKey={cat.key}
                    stroke={cat.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              ))}

              <ReferenceLine
                y={1.0}
                stroke="var(--text-tertiary)"
                strokeDasharray="4 2"
                label={{
                  value: 'Baseline',
                  position: 'insideTopLeft',
                  fontSize: 10,
                  fill: 'var(--text-tertiary)',
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* RIGHT — Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Daily Ramp Detail — Dal &amp; Pulses
            </p>
            <AIInsightButton id="merch-dd-daily-ramp-detail" title="Daily Ramp Detail — Dal & Pulses" data={tableRows as unknown as Record<string, unknown>[]} />
          </div>

          {/* Phase legend */}
          <div className="flex gap-4 mb-4 text-[10px]">
            {Object.entries(PHASE_ACTIONS).map(([range, action]) => (
              <div key={range} className="p-2 bg-[var(--bg-secondary)] rounded">
                <p className="font-semibold text-[var(--text-primary)]">{range}</p>
                <p className="text-[var(--text-secondary)] mt-0.5">{action}</p>
              </div>
            ))}
          </div>

          <div className="overflow-auto" style={{ maxHeight: 480 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                <tr>
                  <th className="text-left py-2 px-2 text-[var(--text-tertiary)] font-medium">
                    Day
                  </th>
                  <th className="text-right py-2 px-2 text-[var(--text-tertiary)] font-medium">
                    Multiplier
                  </th>
                  <th className="text-right py-2 px-2 text-[var(--text-tertiary)] font-medium">
                    vs Baseline
                  </th>
                  <th className="text-left py-2 px-2 text-[var(--text-tertiary)] font-medium">
                    Phase
                  </th>
                  <th className="text-left py-2 px-2 text-[var(--text-tertiary)] font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ day, dalMult, aboveBaseline, phase, action, style }) => (
                  <tr
                    key={day}
                    className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className={`py-2 px-2 font-mono ${style}`}>
                      {day === 0 ? 'D' : `D${day}`}
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold ${style}`}>
                      {dalMult.toFixed(2)}×
                    </td>
                    <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                      {Number(aboveBaseline) === 0 ? 'baseline' : `+${aboveBaseline}%`}
                    </td>
                    <td className={`py-2 px-2 capitalize ${style}`}>{phase}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)]">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
