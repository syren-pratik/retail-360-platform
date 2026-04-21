'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface GenerativeDonutChartProps {
  data: Record<string, unknown>[];
  name_key: string;
  value_key: string;
  title: string;
  onSegmentClick?: (data: Record<string, unknown>) => void;
}

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#64748B'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; value: number }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-sm text-xs">
        <p className="font-medium">{String(payload[0].payload.name || payload[0].payload.label)}</p>
        <p>{payload[0].value?.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

export default function GenerativeDonutChart({
  data,
  name_key,
  value_key,
  title,
  onSegmentClick,
}: GenerativeDonutChartProps) {
  // Transform data to ensure consistent naming, keep original data for click handler
  const chartData = data.map((item, index) => ({
    name: String(item[name_key]),
    value: Number(item[value_key]),
    fill: COLORS[index % COLORS.length],
    originalData: item,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (pieData: any) => {
    if (onSegmentClick && pieData?.originalData) {
      onSegmentClick(pieData.originalData);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-[var(--text-primary)]">{title}</p>
        {onSegmentClick && (
          <span className="text-[10px] text-[var(--text-tertiary)]">Click to explore</span>
        )}
      </div>
      <div className="h-[180px] w-full max-w-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              onClick={(data) => handleClick(data)}
              cursor={onSegmentClick ? 'pointer' : 'default'}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ fontSize: 10 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
