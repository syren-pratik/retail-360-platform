'use client';

import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelPromoTrendPoint } from '@/app/lib/price-intel-types';

interface Props {
  trend: PriceIntelPromoTrendPoint[];
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
  const roi = payload.find((p) => p.dataKey === 'roi');
  const goal = payload.find((p) => p.dataKey === 'goal_roi');
  const entry = payload[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaign = (entry as any)?.payload?.active_campaign_name as string | null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {roi && <p className="text-[var(--text-secondary)]">ROI: <span className="font-medium text-[var(--text-primary)]">{roi.value.toFixed(2)}×</span></p>}
      {goal && <p className="text-[var(--text-tertiary)]">Goal: {goal.value.toFixed(2)}×</p>}
      {campaign && <p className="text-blue-600 mt-1">{campaign}</p>}
    </div>
  );
};

export default function PromoROITrend({ trend }: Props) {
  return (
    <PriceIntelChartCard
      data={trend as unknown as Record<string, unknown>[]}
      id="price-intel-promo-roi-trend"
      title="Promo ROI Trend"
      subtitle="14-week rolling · goal line shown"
      height={240}
      exportFilename="price_intel_promo_roi_trend"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week_label"
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(1)}×`}
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={1.5} stroke="#94A3B8" strokeDasharray="4 3" strokeWidth={1} />
          <Area
            dataKey="roi"
            stroke="#6366F1"
            strokeWidth={2}
            fill="url(#roiGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            dataKey="goal_roi"
            stroke="#10B981"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
