'use client';

import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelHeatmapRow } from '@/app/lib/price-intel-types';

interface Props {
  rows: PriceIntelHeatmapRow[];
}

const WEEK_COUNT = 8;

function sellThroughColor(value: number, target: number): string {
  const ratio = value / Math.max(target, 1);
  if (ratio >= 1.05) return '#10B981'; // over target — green
  if (ratio >= 0.9)  return '#6366F1'; // near target — indigo
  if (ratio >= 0.7)  return '#F59E0B'; // below target — amber
  return '#F43F5E';                     // far below — red
}

function opacity(ratio: number): number {
  return Math.min(0.9, 0.3 + ratio * 0.6);
}

export default function MarkdownHeatmap({ rows }: Props) {
  const weekLabels = Array.from({ length: WEEK_COUNT }, (_, i) => `W${i + 1}`);

  return (
    <PriceIntelChartCard
      data={rows as unknown as Record<string, unknown>[]}
      id="price-intel-markdown-heatmap"
      title="Sell-Through Heatmap"
      subtitle="Color = vs target · darker = worse"
      height={280}
      exportFilename="price_intel_markdown_heatmap"
    >
      <div className="overflow-auto h-full">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium w-32">Category</th>
              <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium w-24">Dept</th>
              {weekLabels.map((w) => (
                <th key={w} className="text-center py-1.5 px-1 text-[var(--text-secondary)] font-medium w-12">{w}</th>
              ))}
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium w-14">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={WEEK_COUNT + 3} className="py-6 text-center text-[var(--text-tertiary)]">
                  No category sell-through data for this selection.
                </td>
              </tr>
            )}
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-[var(--border-default)] last:border-0">
                <td className="py-1.5 px-2 font-medium text-[var(--text-primary)] truncate max-w-[120px]">{row.category}</td>
                <td className="py-1.5 px-2 text-[var(--text-tertiary)] truncate">{row.department}</td>
                {row.values.slice(0, WEEK_COUNT).map((v, wi) => {
                  const color = sellThroughColor(v, row.target_pct);
                  const op = opacity(v / Math.max(row.target_pct, 1));
                  return (
                    <td key={wi} className="py-1 px-1 text-center">
                      <div
                        className="rounded mx-auto w-9 h-7 flex items-center justify-center text-[10px] font-mono font-medium text-white"
                        style={{ background: color, opacity: op }}
                        title={`${v.toFixed(1)}% (target: ${row.target_pct.toFixed(0)}%)`}
                      >
                        {v.toFixed(0)}%
                      </div>
                    </td>
                  );
                })}
                <td className="py-1.5 px-2 text-right text-[var(--text-tertiary)] font-mono">{row.target_pct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PriceIntelChartCard>
  );
}
