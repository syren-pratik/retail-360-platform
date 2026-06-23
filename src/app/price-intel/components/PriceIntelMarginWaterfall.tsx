'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelWaterfallBar } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props {
  bars: PriceIntelWaterfallBar[];
}

const COLOR_MAP = {
  base:   '#6366F1',
  leak:   '#F43F5E',
  result: '#10B981',
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: WaterfallEntry }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{d.label}</p>
      <p className={d.color_type === 'leak' ? 'text-rose-600' : 'text-[var(--text-secondary)]'}>
        {d.color_type === 'leak' ? '−' : ''}{formatLakhsCrores(Math.abs(d.value_inr))}
      </p>
    </div>
  );
};

interface WaterfallEntry extends PriceIntelWaterfallBar {
  base: number;
  bar: number;
}

function buildWaterfallData(bars: PriceIntelWaterfallBar[]): WaterfallEntry[] {
  let running = 0;
  return bars.map((b) => {
    // Anchors (start = base/total, end = result/total) stand on the zero axis.
    if (b.color_type === 'base' || b.color_type === 'result') {
      running = b.value_inr;
      return { ...b, base: 0, bar: b.value_inr };
    }
    // Leak step: bar floats between the new running level and the previous one.
    running += b.value_inr; // value_inr is negative for leaks → running drops
    return { ...b, base: running, bar: Math.abs(b.value_inr) };
  });
}

export default function PriceIntelMarginWaterfall({ bars }: Props) {
  const data = buildWaterfallData(bars);
  const maxVal = Math.max(...bars.map((b) => Math.abs(b.value_inr)));

  return (
    <PriceIntelChartCard
      data={data as unknown as Record<string, unknown>[]}
      id="price-intel-margin-waterfall"
      title="Margin Waterfall"
      subtitle="How theoretical margin becomes realized"
      height={260}
      exportFilename="price_intel_margin_waterfall"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tickFormatter={(v: number) => formatLakhsCrores(v)}
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxVal * 1.1]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="var(--border-default)" />
          {/* invisible base */}
          <Bar dataKey="base" stackId="wf" fill="transparent" />
          {/* visible bar */}
          <Bar dataKey="bar" stackId="wf" radius={[3, 3, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell key={i} fill={COLOR_MAP[entry.color_type]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
