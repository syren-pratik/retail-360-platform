'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface PipelineDay {
  date: string;
  expected_deliveries: number;
  status_breakdown: {
    on_time: number;
    at_risk: number;
    delayed: number;
  };
}

interface InboundTimelineProps {
  data: PipelineDay[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; fill: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const total = (payload ?? []).reduce((sum, p) => sum + (p.value ?? 0), 0);
  const formattedDate = new Date(label || '').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm text-[var(--text-primary)] mb-2">
        {formattedDate}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mb-2">
        {total} deliveries expected
      </p>
      <div className="space-y-1 text-xs">
        {(payload ?? []).map((entry) => (
          <div key={entry.dataKey} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
              {entry.dataKey === 'on_time' ? 'On Time' :
               entry.dataKey === 'at_risk' ? 'At Risk' : 'Delayed'}
            </span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InboundTimeline({ data }: InboundTimelineProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  // Transform data for stacked bar
  const chartData = (data ?? []).map(d => ({
    date: d.date ?? '',
    displayDate: new Date(d.date ?? '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    on_time: d.status_breakdown?.on_time ?? 0,
    at_risk: d.status_breakdown?.at_risk ?? 0,
    delayed: d.status_breakdown?.delayed ?? 0,
    total: d.expected_deliveries ?? 0,
  }));

  // Calculate totals
  const totalDeliveries = (chartData ?? []).reduce((sum, d) => sum + (d.total ?? 0), 0);
  const totalDelayed = (chartData ?? []).reduce((sum, d) => sum + (d.delayed ?? 0), 0);

  return (
    <ChartCard
      id="inbound-timeline"
      title="Inbound Pipeline Timeline"
      subtitle={`${totalDeliveries} deliveries next 7 days • ${totalDelayed} delayed`}
      height={280}
      data={chartData as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

          <XAxis
            dataKey="displayDate"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
          />

          <YAxis
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: 'Deliveries',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--text-secondary)', fontSize: 11 }
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconSize={10}
            formatter={(value) =>
              value === 'on_time' ? 'On Time' :
              value === 'at_risk' ? 'At Risk' : 'Delayed'
            }
          />

          <Bar
            dataKey="on_time"
            stackId="a"
            fill="#22C55E"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="at_risk"
            stackId="a"
            fill="#F59E0B"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="delayed"
            stackId="a"
            fill="#DC2626"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
