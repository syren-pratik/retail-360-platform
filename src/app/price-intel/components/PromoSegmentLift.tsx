'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelLiftSegment } from '@/app/lib/price-intel-types';

interface Props {
  segments: PriceIntelLiftSegment[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const lift = payload.find((p) => p.dataKey === 'lift_pct');
  const fr = payload.find((p) => p.dataKey === 'free_rider_ratio_pct');
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {lift && <p className="text-emerald-600">Lift: +{lift.value.toFixed(1)}%</p>}
      {fr && <p className="text-rose-600">Free Rider: {fr.value.toFixed(1)}%</p>}
    </div>
  );
};

export default function PromoSegmentLift({ segments }: Props) {
  return (
    <PriceIntelChartCard
      data={segments as unknown as Record<string, unknown>[]}
      id="price-intel-segment-lift"
      title="Lift by Segment"
      subtitle="Promo lift vs free-rider waste"
      height={240}
      exportFilename="price_intel_segment_lift"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={segments}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="segment"
            tick={{ fontSize: 9, fill: '#111827' }}
            width={84}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="lift_pct" radius={[0, 4, 4, 0]} maxBarSize={16} name="Lift">
            {segments.map((s, i) => (
              <Cell key={i} fill="#10B981" opacity={0.8} />
            ))}
          </Bar>
          <Bar dataKey="free_rider_ratio_pct" radius={[0, 4, 4, 0]} maxBarSize={16} name="Free Rider">
            {segments.map((s, i) => (
              <Cell key={i} fill="#F43F5E" opacity={0.6} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
