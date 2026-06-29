'use client';

import { useMemo } from 'react';
import ChartCard from './ChartCard';

interface Cell {
  color: string;
  category: string;
  sell_through_pct: number;
  units_sold: number;
  units_remaining: number;
  season_tag: string;
  margin_pct: number;
}

export interface ColorPerformanceData {
  colors: string[];
  categories: string[];
  cells: Cell[];
  insights?: string[];
}

interface Props {
  data: ColorPerformanceData | null;
}

// Visible swatch for each apparel color name.
const COLOR_SWATCH: Record<string, string> = {
  Black: '#111111',
  White: '#F8FAFC',
  Navy: '#1E3A8A',
  Gray: '#6B7280',
  Indigo: '#4338CA',
  Khaki: '#A3825F',
  Olive: '#65733E',
  Burgundy: '#7F1D1D',
  Pink: '#EC4899',
  Yellow: '#FACC15',
  Red: '#DC2626',
  Blue: '#3B82F6',
};

function intensity(pct: number): string {
  // sell-through pct → green ramp; <0.3 muted blue
  if (pct >= 0.8) return '#065F46';
  if (pct >= 0.65) return '#059669';
  if (pct >= 0.5) return '#10B981';
  if (pct >= 0.35) return '#FBBF24';
  if (pct >= 0.2) return '#F97316';
  return '#94A3B8';
}

export default function ColorPerformanceHeatmap({ data }: Props) {
  const lookup = useMemo(() => {
    const m = new Map<string, Cell>();
    data?.cells.forEach((c) => m.set(`${c.color}::${c.category}`, c));
    return m;
  }, [data]);

  if (!data) {
    return (
      <ChartCard id="color-performance-heatmap" title="Color Performance Heatmap" height={420}>
        <div className="text-sm text-[var(--text-secondary)] flex h-full items-center justify-center">
          No color-performance data available.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      id="color-performance-heatmap"
      title="Color Performance Heatmap"
      subtitle="Color × category sell-through % — deeper green = stronger"
      height={420}
      data={data.cells as unknown as Record<string, unknown>[]}
      exportFilename="color-performance-heatmap"
    >
      <div className="h-full overflow-auto">
        <table className="w-full text-xs border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left text-[var(--text-tertiary)] font-medium pb-1 pr-2">Color</th>
              {data.categories.map((c) => (
                <th key={c} className="text-center text-[var(--text-tertiary)] font-medium pb-1 px-1">
                  <span className="block max-w-[72px] mx-auto truncate" title={c}>
                    {c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.colors.map((color) => (
              <tr key={color}>
                <td className="pr-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm border border-[var(--border-default)]"
                      style={{ background: COLOR_SWATCH[color] ?? '#CBD5E1' }}
                    />
                    <span className="text-[var(--text-primary)] font-medium">{color}</span>
                  </span>
                </td>
                {data.categories.map((cat) => {
                  const cell = lookup.get(`${color}::${cat}`);
                  if (!cell) {
                    return <td key={cat} className="h-9 bg-[var(--bg-secondary)] rounded-sm" />;
                  }
                  return (
                    <td key={cat} className="px-0">
                      <div
                        className="h-9 rounded-sm flex items-center justify-center text-white text-[11px] font-semibold"
                        style={{ background: intensity(cell.sell_through_pct) }}
                        title={`${color} ${cat} · sell-through ${(cell.sell_through_pct * 100).toFixed(0)}% · margin ${cell.margin_pct}%`}
                      >
                        {Math.round(cell.sell_through_pct * 100)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
