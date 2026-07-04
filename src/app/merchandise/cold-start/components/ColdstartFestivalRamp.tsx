'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import type { ColdstartFestivalCategoryPattern } from '@/app/lib/coldstart-types';

interface Props {
  patterns: ColdstartFestivalCategoryPattern[];
}

// Derive unique festival×category pairs sorted by peak uplift desc
function buildPairs(patterns: ColdstartFestivalCategoryPattern[]) {
  const seen = new Map<string, { festival_name: string; category: string; peak_mult: number }>();
  for (const p of patterns) {
    const key = `${p.festival_name}||${p.category}`;
    const existing = seen.get(key);
    if (!existing || p.uplift_multiplier > existing.peak_mult) {
      seen.set(key, { festival_name: p.festival_name, category: p.category, peak_mult: p.uplift_multiplier });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.peak_mult - a.peak_mult);
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-0.5">
        {label === 0 ? 'Festival Day' : label !== undefined && label < 0 ? `D${label}` : `D+${label}`}
      </p>
      <p className="text-emerald-600 font-semibold">{payload[0].value.toFixed(2)}× uplift</p>
    </div>
  );
};

export default function ColdstartFestivalRamp({ patterns }: Props) {
  const pairs = buildPairs(patterns);
  const [selectedKey, setSelectedKey] = useState(
    pairs.length > 0 ? `${pairs[0].festival_name}||${pairs[0].category}` : 'Diwali||Frozen Foods'
  );

  const [selFest, selCat] = selectedKey.split('||');
  const chartData = patterns
    .filter((p) => p.festival_name === selFest && p.category === selCat)
    .sort((a, b) => a.day_offset - b.day_offset)
    .map((p) => ({
      day_offset: p.day_offset,
      label: p.day_offset === 0 ? 'Festival' : p.day_offset < 0 ? `D${p.day_offset}` : `D+${p.day_offset}`,
      uplift_multiplier: p.uplift_multiplier,
    }));

  const peakMult = pairs.find((p) => p.festival_name === selFest && p.category === selCat)?.peak_mult;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Ramp line chart */}
      <ChartCard
        id="coldstart-festival-ramp-chart"
        title="Festival Demand Ramp"
        subtitle={`${selFest} × ${selCat} · uplift multiplier vs. days to festival`}
        height={280}
        exportFilename="coldstart_festival_ramp"
        data={chartData as unknown as Record<string, unknown>[]}
      >
        {/* Selector */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-[var(--text-secondary)]">Pair:</span>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded px-1.5 py-1 focus:outline-none"
          >
            {pairs.map((p) => (
              <option key={`${p.festival_name}||${p.category}`} value={`${p.festival_name}||${p.category}`}>
                {p.festival_name} × {p.category}
              </option>
            ))}
          </select>
          {peakMult && (
            <span className="text-[10px] text-emerald-600 font-semibold ml-auto">peak {peakMult.toFixed(2)}×</span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[1.0, 'auto']}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={1.0} stroke="var(--border-default)" strokeDasharray="3 2" />
            <Line
              type="monotone"
              dataKey="uplift_multiplier"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={{ fill: '#f97316', r: 3 }}
              name="uplift_multiplier"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top-8 combo table */}
      <ChartCard
        id="coldstart-festival-ramp-table"
        title="Top Festival × Category Pairs"
        subtitle="Ranked by peak uplift · click row to view ramp"
        height={280}
        exportFilename="coldstart_festival_pairs"
        data={pairs as unknown as Record<string, unknown>[]}
      >
        <div className="overflow-auto h-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">#</th>
                <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">Festival</th>
                <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">Category</th>
                <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium">Peak</th>
              </tr>
            </thead>
            <tbody>
              {pairs.slice(0, 8).map((p, i) => {
                const key = `${p.festival_name}||${p.category}`;
                const isSelected = key === selectedKey;
                return (
                  <tr
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`border-b border-[var(--border-default)] last:border-0 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                  >
                    <td className="py-1.5 px-2 text-[var(--text-tertiary)]">{i + 1}</td>
                    <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">{p.festival_name}</td>
                    <td className="py-1.5 px-2 text-[var(--text-secondary)]">{p.category}</td>
                    <td className="py-1.5 px-2 text-right">
                      <span className={`font-mono font-bold ${
                        p.peak_mult >= 2.5 ? 'text-red-500' :
                        p.peak_mult >= 1.8 ? 'text-orange-500' : 'text-amber-600'
                      }`}>
                        {p.peak_mult.toFixed(2)}×
                      </span>
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
