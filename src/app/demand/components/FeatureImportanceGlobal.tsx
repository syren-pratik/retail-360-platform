'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useDashboard } from '@/app/context/DashboardContext';

interface FeatureImportance {
  feature: string;
  importance: number;
  category: string;
}

interface FeatureImportanceGlobalProps {
  data: FeatureImportance[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Time Series': '#6366F1',
  'Calendar': '#3B82F6',
  'Product': '#10B981',
  'Marketing': '#F59E0B',
  'Weather': '#06B6D4',
  'Store': '#8B5CF6',
  'Competition': '#EF4444',
};

// Human-readable feature labels
const FEATURE_LABELS: Record<string, string> = {
  'Historical Sales (Lag 7)': '7-Day Sales History',
  'Historical Sales (Lag 14)': '14-Day Sales History',
  'Day of Week': 'Day of Week',
  'Price': 'Product Price',
  'Promotion Flag': 'Promotion Active',
  'Month': 'Month of Year',
  'Festival Flag': 'Festival Period',
  'Temperature': 'Temperature',
  'Store Size': 'Store Size',
  'Competitor Price': 'Competitor Pricing',
};

export default function FeatureImportanceGlobal({ data }: FeatureImportanceGlobalProps) {
  const { triggerChatMessage } = useDashboard();

  // Sort by importance and take top 12
  const topData = [...data]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 12)
    .map((item) => ({
      ...item,
      label: FEATURE_LABELS[item.feature] || item.feature,
    }));

  const handleBarClick = (feature: string) => {
    triggerChatMessage(`Tell me more about how "${feature}" affects demand forecasting`);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={topData}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 110, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 'auto']}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          width={105}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload as FeatureImportance & { label: string };
              return (
                <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                  <p className="font-semibold mb-1">{item.label}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span>Importance</span>
                      <span className="font-medium">{(item.importance * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Category</span>
                      <span
                        className="font-medium px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor: CATEGORY_COLORS[item.category] + '20',
                          color: CATEGORY_COLORS[item.category],
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[var(--accent-primary)] text-[10px]">Click to ask AI</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="importance"
          radius={[0, 4, 4, 0]}
          cursor="pointer"
          onClick={(_, __, e) => {
            const payload = (e as unknown as { payload?: { feature?: string } })?.payload;
            if (payload?.feature) handleBarClick(payload.feature);
          }}
        >
          {topData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CATEGORY_COLORS[entry.category] || '#94A3B8'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
