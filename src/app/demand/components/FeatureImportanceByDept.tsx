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

interface FeatureImportance {
  feature: string;
  importance: number;
  category: string;
}

interface FeatureImportanceByDeptProps {
  data: FeatureImportance[];
}

// Department colors
const DEPT_COLORS: Record<string, string> = {
  'Grocery': '#6366F1',
  'Dairy': '#3B82F6',
  'Beverages': '#10B981',
  'Snacks': '#F59E0B',
  'Personal Care': '#EC4899',
};

// Generate department-specific feature importance (deterministic)
function generateDeptFeatureImportance(features: FeatureImportance[]) {
  const departments = Object.keys(DEPT_COLORS);
  const topFeatures = features.slice(0, 5);

  return topFeatures.map((feature) => {
    const row: Record<string, string | number> = {
      feature: feature.feature.length > 15 ? feature.feature.slice(0, 13) + '...' : feature.feature,
      fullFeature: feature.feature,
    };

    // Generate slightly varied importance for each department
    departments.forEach((dept, i) => {
      const baseImportance = feature.importance;
      const variance = (Math.sin(i * 12345 + feature.feature.length * 67890) + 1) * 0.3 - 0.15;
      row[dept] = Math.max(0.02, Math.min(0.35, baseImportance + variance * baseImportance));
    });

    return row;
  });
}

export default function FeatureImportanceByDept({ data }: FeatureImportanceByDeptProps) {
  const chartData = generateDeptFeatureImportance(data);
  const departments = Object.keys(DEPT_COLORS);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 20, left: 100, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <YAxis
          type="category"
          dataKey="feature"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          width={95}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const firstPayload = payload[0].payload;
              return (
                <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                  <p className="font-semibold mb-2">{firstPayload.fullFeature}</p>
                  <div className="space-y-1">
                    {payload.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}
                        </span>
                        <span className="font-medium">
                          {((entry.value as number) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="rect"
          iconSize={10}
          wrapperStyle={{ fontSize: 11 }}
        />
        {departments.map((dept) => (
          <Bar
            key={dept}
            dataKey={dept}
            fill={DEPT_COLORS[dept]}
            radius={[0, 2, 2, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
