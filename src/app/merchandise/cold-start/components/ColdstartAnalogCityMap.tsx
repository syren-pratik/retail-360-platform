'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartCitySimilarity, ColdstartTargetCity } from '@/app/lib/coldstart-types';

interface Props {
  analogs: ColdstartCitySimilarity[];
  target: ColdstartTargetCity;
}

// Colors: first 3 are top-3 analogs (highlighted), rest are muted
const ANALOG_COLORS = ['#f59e0b', '#6366f1', '#10b981', '#94a3b8', '#cbd5e1', '#94a3b8', '#cbd5e1', '#94a3b8', '#cbd5e1'];

type ScatterPoint = ColdstartCitySimilarity & { isTarget?: boolean };

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1">
        {d.city}, {d.state}
        {d.isTarget && <span className="ml-1 text-blue-600">(Target)</span>}
      </p>
      <div className="space-y-0.5 text-[var(--text-secondary)]">
        <p>Population: {d.population_m.toFixed(1)}M</p>
        <p>GDP/capita: ${d.gdp_per_capita_usd.toLocaleString()}</p>
        <p>Avg basket: ${d.avg_basket_usd}</p>
        <p>Climate: {d.climate_zone}</p>
        {!d.isTarget && d.rank > 0 && (
          <>
            <p className="text-emerald-600 font-medium">Similarity: {(d.similarity_score * 100).toFixed(1)}%</p>
            {d.weight > 0 && <p>Blend weight: {(d.weight * 100).toFixed(1)}%</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default function ColdstartAnalogCityMap({ analogs, target }: Props) {
  const targetPoint: ScatterPoint = {
    city: target.name,
    state: target.state,
    population_m: target.population_m,
    gdp_per_capita_usd: target.gdp_per_capita_usd,
    avg_basket_usd: target.avg_basket_usd,
    climate_zone: target.climate_zone,
    tier: target.tier,
    similarity_score: 1,
    rank: 0,
    weight: 0,
    isTarget: true,
  };

  const scatterData: ScatterPoint[] = [
    ...analogs.map((a) => ({ ...a, isTarget: false as const })),
    targetPoint,
  ];

  // Top 3 for ranking table
  const top3 = analogs.filter((a) => a.rank <= 3).sort((a, b) => a.rank - b.rank);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* FIX 5: Scatter — Y-axis = population_m */}
      <ChartCard
        id="coldstart-analog-scatter"
        title="Analog City Feature Space"
        subtitle="GDP/capita vs population — target city crosshairs show target position"
        height={300}
        exportFilename="coldstart_analog_cities"
        data={scatterData as unknown as Record<string, unknown>[]}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <XAxis
              type="number"
              dataKey="gdp_per_capita_usd"
              name="GDP/capita (USD)"
              domain={[1500, 4500]}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'GDP per capita (USD)', position: 'insideBottom', fontSize: 10, fill: 'var(--text-secondary)', dy: 16 }}
            />
            <YAxis
              type="number"
              dataKey="population_m"
              name="Population (millions)"
              domain={[0, 35]}
              tickFormatter={(v: number) => `${v.toFixed(0)}M`}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{ value: 'Population (M)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--text-secondary)', dx: -4 }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* target city crosshairs */}
            <ReferenceLine x={target.gdp_per_capita_usd} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1} />
            <ReferenceLine y={target.population_m}       stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1} />

            <Scatter data={scatterData} name="cities">
              {scatterData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isTarget ? '#3b82f6' : ANALOG_COLORS[i] ?? '#94a3b8'}
                  r={entry.isTarget ? 9 : entry.rank <= 3 ? 8 : 5}
                  opacity={entry.isTarget ? 1 : entry.rank <= 3 ? 1 : 0.5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex gap-3 mt-0 px-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span className="text-[var(--text-secondary)]">target city</span>
          </span>
          {top3.map((a, i) => (
            <span key={a.city} className="flex items-center gap-1 text-xs">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: ANALOG_COLORS[i] }} />
              <span className="text-[var(--text-secondary)]">{a.city} (#{a.rank})</span>
            </span>
          ))}
        </div>
      </ChartCard>

      {/* Ranking table — FIX 6: blend formula caption removed */}
      <ChartCard
        id="coldstart-analog-ranking"
        title="Analog City Rankings"
        subtitle="Similarity scores from Notebook 22 · top 3 used for demand transfer"
        height={300}
        exportFilename="coldstart_analog_ranking"
        data={analogs as unknown as Record<string, unknown>[]}
      >
        <div className="overflow-auto h-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-2 text-[var(--text-secondary)] font-medium w-8">Rank</th>
                <th className="text-left py-2 px-2 text-[var(--text-secondary)] font-medium">City</th>
                <th className="text-right py-2 px-2 text-[var(--text-secondary)] font-medium w-24">Similarity</th>
                <th className="text-right py-2 px-2 text-[var(--text-secondary)] font-medium w-14">Weight</th>
              </tr>
            </thead>
            <tbody>
              {analogs.map((a, i) => {
                const isTop3 = a.rank <= 3;
                return (
                  <tr
                    key={a.city}
                    className={`border-b border-[var(--border-default)] last:border-0 ${isTop3 ? '' : 'opacity-60'}`}
                  >
                    <td className="py-2 px-2">
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                        style={{ backgroundColor: isTop3 ? ANALOG_COLORS[i] : '#94a3b8' }}
                      >
                        {a.rank}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <p className="font-medium text-[var(--text-primary)]">{a.city}</p>
                      <p className="text-[var(--text-tertiary)] text-[10px]">{a.state} · {a.tier} · {a.climate_zone}</p>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 bg-[var(--bg-subtle)] rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{ width: `${a.similarity_score * 100}%` }}
                          />
                        </div>
                        <span className="font-mono font-medium text-[var(--text-primary)] w-10 text-right">
                          {(a.similarity_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-medium text-[var(--text-primary)]">
                      {a.weight > 0 ? `${(a.weight * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
