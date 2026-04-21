'use client';

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AccuracyTrendPoint } from '@/app/lib/demand-types';

interface AccuracyTrendProps {
  data: AccuracyTrendPoint[];
}

export default function AccuracyTrend({ data }: AccuracyTrendProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          axisLine={{ stroke: 'var(--border-default)' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          domain={[85, 100]}
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={45}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 15]}
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={45}
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
              accuracy: 'Accuracy',
              mape: 'MAPE',
              bias: 'Bias',
            };
            const numValue = typeof value === 'number' ? value : 0;
            const strName = String(name);
            return [`${numValue.toFixed(1)}%`, labels[strName] || strName];
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => {
            const labels: Record<string, string> = {
              accuracy: 'Forecast Accuracy',
              mape: 'MAPE',
              bias: 'Bias',
            };
            return <span className="text-sm text-[var(--text-secondary)]">{labels[value] || value}</span>;
          }}
        />

        {/* Accuracy line */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="accuracy"
          stroke="var(--chart-emerald)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--chart-emerald)' }}
          activeDot={{ r: 5, fill: 'var(--chart-emerald)' }}
          name="accuracy"
        />

        {/* MAPE bars */}
        <Bar
          yAxisId="right"
          dataKey="mape"
          fill="var(--chart-amber)"
          radius={[4, 4, 0, 0]}
          barSize={20}
          name="mape"
          opacity={0.7}
        />

        {/* Bias line */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="bias"
          stroke="var(--chart-rose)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 3, fill: 'var(--chart-rose)' }}
          activeDot={{ r: 5, fill: 'var(--chart-rose)' }}
          name="bias"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
