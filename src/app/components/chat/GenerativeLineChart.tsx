'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface GenerativeLineChartProps {
  data: Record<string, unknown>[];
  x_key: string;
  y_key: string;
  title: string;
  onPointClick?: (data: Record<string, unknown>) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-sm text-xs">
        <p className="font-medium mb-1">{label}</p>
        <p>{payload[0].value?.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

const formatValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function GenerativeLineChart({
  data,
  x_key,
  y_key,
  title,
  onPointClick,
}: GenerativeLineChartProps) {
  const handleClick = (data: Record<string, unknown>) => {
    if (onPointClick) {
      onPointClick(data);
    }
  };

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-[var(--text-primary)] mb-2">{title}</p>
      <div className="h-[180px] w-full max-w-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey={x_key}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={y_key}
              stroke="var(--chart-indigo)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-indigo)', r: 3 }}
              activeDot={{
                r: 5,
                cursor: onPointClick ? 'pointer' : 'default',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick: (_: any, payload: any) => payload?.payload && handleClick(payload.payload as Record<string, unknown>),
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
