'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ForecastDataPoint } from '@/app/lib/demand-types';

interface ForecastVsActualProps {
  data: ForecastDataPoint[];
}

export default function ForecastVsActual({ data }: ForecastVsActualProps) {
  // Find today's date index for the reference line
  const todayIndex = data.findIndex((d) => d.actual === null);
  const todayDate = todayIndex > 0 ? data[todayIndex - 1]?.date : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-indigo)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--chart-indigo)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            padding: '12px',
          }}
          formatter={(value, name) => {
            const labels: Record<string, string> = {
              forecast: 'Forecast',
              actual: 'Actual',
              upperBound: 'Upper Bound',
              lowerBound: 'Lower Bound',
            };
            const numValue = typeof value === 'number' ? value : 0;
            const strName = String(name);
            return [formatValue(numValue), labels[strName] || strName];
          }}
          labelFormatter={(label) => formatDate(String(label))}
        />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => {
            const labels: Record<string, string> = {
              forecast: 'Forecast',
              actual: 'Actual Sales',
              upperBound: '95% CI Upper',
              lowerBound: '95% CI Lower',
            };
            return <span className="text-sm text-[var(--text-secondary)]">{labels[value] || value}</span>;
          }}
        />

        {/* Confidence interval area */}
        <Area
          type="monotone"
          dataKey="upperBound"
          stroke="none"
          fill="url(#confidenceGradient)"
          fillOpacity={1}
          name="upperBound"
          legendType="none"
        />
        <Area
          type="monotone"
          dataKey="lowerBound"
          stroke="none"
          fill="white"
          fillOpacity={1}
          name="lowerBound"
          legendType="none"
        />

        {/* Reference line for today */}
        {todayDate && (
          <ReferenceLine
            x={todayDate}
            stroke="var(--text-tertiary)"
            strokeDasharray="5 5"
            label={{
              value: 'Today',
              position: 'top',
              fill: 'var(--text-tertiary)',
              fontSize: 11,
            }}
          />
        )}

        {/* Forecast line */}
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="var(--chart-indigo)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--chart-indigo)' }}
          name="forecast"
        />

        {/* Actual line */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="var(--chart-emerald)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--chart-emerald)' }}
          name="actual"
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
