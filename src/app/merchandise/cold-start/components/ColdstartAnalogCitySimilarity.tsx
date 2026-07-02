'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AnalogSimilarityRow {
  city: string;
  climate: number;
  demographics: number;
  competitor_density: number;
  apparel_spend: number;
}

interface Props {
  data: AnalogSimilarityRow[];
}

const CITY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function ColdstartAnalogCitySimilarity({ data }: Props) {
  const axes = ['climate', 'demographics', 'competitor_density', 'apparel_spend'];
  const chartData = axes.map((axis) => {
    const row: Record<string, number | string> = { axis: axis.replace(/_/g, ' ') };
    for (const c of data) row[c.city] = c[axis as keyof AnalogSimilarityRow] as number;
    return row;
  });
  return (
    <div className="card p-4 flex flex-col">
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)]">Analog City Similarity</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          4-axis similarity radar per analog city · Austin target
        </p>
      </div>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#64748B' }} />
            <PolarRadiusAxis angle={30} tick={{ fontSize: 9, fill: '#94A3B8' }} domain={[0, 100]} />
            {data.map((c, i) => (
              <Radar key={c.city} name={c.city} dataKey={c.city} stroke={CITY_COLORS[i % CITY_COLORS.length]} fill={CITY_COLORS[i % CITY_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
            ))}
            <Tooltip />
            <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
