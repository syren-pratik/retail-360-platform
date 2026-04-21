'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface GenerativeBarChartProps {
  data: Record<string, unknown>[];
  x_key: string;
  y_key: string;
  title: string;
  color?: string;
  onBarClick?: (data: Record<string, unknown>) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
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

export default function GenerativeBarChart({
  data,
  x_key,
  y_key,
  title,
  color = 'var(--chart-blue)',
  onBarClick,
}: GenerativeBarChartProps) {
  const handleClick = (data: Record<string, unknown>) => {
    if (onBarClick) {
      onBarClick(data);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-[var(--text-primary)]">{title}</p>
        {onBarClick && (
          <span className="text-[10px] text-[var(--text-tertiary)]">Click bar to explore</span>
        )}
      </div>
      <div className="h-[180px] w-full max-w-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
            <Bar
              dataKey={y_key}
              fill={color}
              radius={[3, 3, 0, 0]}
              cursor={onBarClick ? 'pointer' : 'default'}
              onClick={(_, index) => data[index] && handleClick(data[index])}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
