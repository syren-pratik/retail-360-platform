'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelForecastPoint } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props {
  forecast: PriceIntelForecastPoint[];
}

interface ChartEntry extends PriceIntelForecastPoint {
  ci_range: number;
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
  const rev = payload.find((p) => p.dataKey === 'forecast_revenue_inr');
  const margin = payload.find((p) => p.dataKey === 'forecast_margin_inr');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (payload[0] as any)?.payload as ChartEntry | undefined;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {rev && <p className="text-[var(--text-secondary)]">Revenue: <span className="font-medium">{formatLakhsCrores(rev.value)}</span></p>}
      {margin && <p className="text-emerald-600">Margin: {formatLakhsCrores(margin.value)}</p>}
      {entry && (
        <p className="text-[var(--text-tertiary)] mt-1">
          CI: {formatLakhsCrores(entry.lower_ci_inr)} – {formatLakhsCrores(entry.upper_ci_inr)}
        </p>
      )}
      {entry?.event_label && (
        <p className="text-violet-600 font-medium mt-1">{entry.event_label}</p>
      )}
    </div>
  );
};

export default function ForecastChart({ forecast }: Props) {
  const data: ChartEntry[] = forecast.map((p) => ({
    ...p,
    ci_range: p.upper_ci_inr - p.lower_ci_inr,
  }));

  const eventWeeks = forecast
    .filter((p) => p.event_label)
    .map((p) => p.week_label);

  return (
    <PriceIntelChartCard
      data={data as unknown as Record<string, unknown>[]}
      id="price-intel-forecast"
      title="14-Week Revenue Forecast"
      subtitle="95% CI band shown · event labels marked"
      height={280}
      exportFilename="price_intel_forecast"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week_label"
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tickFormatter={(v: number) => formatLakhsCrores(v)}
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {eventWeeks.map((w) => (
            <ReferenceLine
              key={w}
              x={w}
              stroke="#8B5CF6"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          ))}
          {/* CI band: transparent base + colored range */}
          <Area
            dataKey="lower_ci_inr"
            fill="transparent"
            stroke="none"
            stackId="ci"
          />
          <Area
            dataKey="ci_range"
            fill="url(#ciGrad)"
            stroke="none"
            stackId="ci"
          />
          <Line
            dataKey="forecast_revenue_inr"
            stroke="#6366F1"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            name="Revenue"
          />
          <Line
            dataKey="forecast_margin_inr"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            name="Margin"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
