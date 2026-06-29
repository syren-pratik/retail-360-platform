'use client';

import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelSizeColorGrid } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  grid: PriceIntelSizeColorGrid;
}

function interpolateColor(t: number): string {
  // t in [0,1]: low #FEE2E2 -> high #DCFCE7
  const lo = [254, 226, 226];
  const hi = [220, 252, 231];
  const c = lo.map((l, i) => Math.round(l + (hi[i] - l) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export default function PriceIntelSizeColorPriceGrid({ grid }: Props) {
  const margins = grid.cells.map((c) => c.margin_pct);
  const minM = Math.min(...margins);
  const maxM = Math.max(...margins);
  const range = Math.max(1e-6, maxM - minM);

  const cellAt = (size: string, color: string) =>
    grid.cells.find((c) => c.size === size && c.color === color);

  return (
    <PriceIntelChartCard
      id="size_color_price_grid"
      title="Size × Color Price Grid"
      subtitle={grid.style_name}
      data={grid.cells as unknown as Record<string, unknown>[]}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-1.5 text-[var(--text-tertiary)] font-medium border-b border-[var(--border-default)]">
                Size \ Color
              </th>
              {grid.colors.map((c) => (
                <th
                  key={c}
                  className="text-center p-1.5 text-[var(--text-secondary)] font-medium border-b border-[var(--border-default)]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.sizes.map((s) => (
              <tr key={s}>
                <td className="p-1.5 text-[var(--text-secondary)] font-medium border-b border-[var(--border-default)]">
                  {s}
                </td>
                {grid.colors.map((c) => {
                  const cell = cellAt(s, c);
                  if (!cell)
                    return (
                      <td
                        key={c}
                        className="p-1.5 border-b border-[var(--border-default)] text-[var(--text-tertiary)]"
                      >
                        —
                      </td>
                    );
                  const t = (cell.margin_pct - minM) / range;
                  const barWidth = Math.max(4, Math.round(t * 100));
                  return (
                    <td
                      key={c}
                      title={`${s} · ${c}\nPrice: ${formatMoneyAuto(cell.price_usd)}\nMargin: ${cell.margin_pct}%\nUnits: ${cell.units_sold.toLocaleString()}`}
                      className="p-1.5 border-b border-[var(--border-default)]"
                      style={{ background: interpolateColor(t) }}
                    >
                      <div className="font-medium text-[var(--text-primary)] leading-tight">
                        {formatMoneyAuto(cell.price_usd)}
                      </div>
                      <div className="mt-1 h-1 rounded bg-white/60 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                        {cell.margin_pct}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PriceIntelChartCard>
  );
}
