'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface DOSDeptData {
  department: string;
  avg_dos: number;
  target: number;
  below_target_pct: number;
}

interface DOSByDepartmentProps {
  data: DOSDeptData[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DOSDeptData }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isBelowTarget = data.avg_dos < data.target;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm text-[var(--text-primary)] mb-2">
        {data.department}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-tertiary)]">Avg DOS:</span>
          <span className={`font-medium ${isBelowTarget ? 'text-red-600' : 'text-green-600'}`}>
            {data.avg_dos} days
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-tertiary)]">Target:</span>
          <span className="font-medium text-[var(--text-primary)]">{data.target} days</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-tertiary)]">SKUs below target:</span>
          <span className={`font-medium ${data.below_target_pct > 30 ? 'text-red-600' : 'text-amber-600'}`}>
            {data.below_target_pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DOSByDepartment({ data }: DOSByDepartmentProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  // Sort by avg_dos ascending to show struggling departments first
  const sortedData = (data ?? []).slice().sort((a, b) => (a.avg_dos ?? 0) - (b.avg_dos ?? 0));

  // Calculate average target for reference line
  const avgTarget = Math.round((data ?? []).reduce((sum, d) => sum + (d.target ?? 0), 0) / (data ?? []).length);

  // Count departments below target
  const belowTargetCount = (data ?? []).filter(d => (d.avg_dos ?? 0) < (d.target ?? 0)).length;

  return (
    <ChartCard
      id="dos-by-dept"
      title="Days of Supply by Department"
      subtitle={`${belowTargetCount} of ${(data ?? []).length} departments below target`}
      height={280}
      data={data as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 10, right: 30, bottom: 10, left: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />

          <XAxis
            type="number"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            domain={[0, 'auto']}
            label={{
              value: 'Days of Supply',
              position: 'bottom',
              offset: -5,
              style: { fill: 'var(--text-secondary)', fontSize: 11 }
            }}
          />

          <YAxis
            type="category"
            dataKey="department"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={95}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Target reference line */}
          <ReferenceLine
            x={avgTarget}
            stroke="#6366F1"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `Target: ${avgTarget}d`,
              position: 'top',
              fill: '#6366F1',
              fontSize: 10
            }}
          />

          <Bar
            dataKey="avg_dos"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {(sortedData ?? []).map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={(entry.avg_dos ?? 0) < (entry.target ?? 0) ? '#DC2626' : '#22C55E'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
