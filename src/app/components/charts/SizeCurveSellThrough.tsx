'use client';

import { useMemo, useState } from 'react';
import ChartCard from './ChartCard';

interface SizeCell {
  size: string;
  sell_through_pct: number;
  units_remaining: number;
  days_on_floor: number;
  stockout_flag: boolean;
}

interface Style {
  style_id: string;
  style_name: string;
  brand: string;
  category: string;
  size_set: string;
  season_tag: string;
  sizes: SizeCell[];
}

export interface SizeCurveData {
  styles: Style[];
  summary?: {
    styles_with_broken_size_curve?: number;
    total_units_at_risk_aged_sizes?: number;
    over_indexed_sizes?: string[];
    under_indexed_sizes?: string[];
  };
}

interface Props {
  data: SizeCurveData | null;
}

// Universe of size columns we display. Each style only fills its own.
const SIZE_AXIS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function colorForPct(pct: number): string {
  // green-amber-red gradient by sell-through percent
  if (pct >= 0.8) return '#DC2626'; // hot/sold out — red
  if (pct >= 0.6) return '#10B981'; // healthy — green
  if (pct >= 0.4) return '#84CC16'; // ok — lime
  if (pct >= 0.2) return '#F59E0B'; // soft — amber
  return '#60A5FA'; // slow — blue
}

export default function SizeCurveSellThrough({ data }: Props) {
  const [selected, setSelected] = useState<{ style: Style; cell: SizeCell } | null>(null);

  const rows = useMemo(() => {
    if (!data?.styles) return [];
    // Pick top 20 styles whose size_set has overlap with SIZE_AXIS (the apparel-tops axis),
    // sorted by aggregate units_remaining (largest exposure first).
    const candidates = data.styles
      .filter((s) => s.sizes.some((sz) => SIZE_AXIS.includes(sz.size)))
      .map((s) => ({
        style: s,
        cells: SIZE_AXIS.map((sz) => s.sizes.find((c) => c.size === sz) ?? null),
        exposure: s.sizes.reduce((sum, c) => sum + (c.units_remaining ?? 0), 0),
      }))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 20);
    return candidates;
  }, [data]);

  if (!data || !rows.length) {
    return (
      <ChartCard id="size-curve-sell-through" title="Size Curve Sell-Through" height={420}>
        <div className="text-sm text-[var(--text-secondary)] flex h-full items-center justify-center">
          No size-curve data available.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      id="size-curve-sell-through"
      title="Size Curve Sell-Through"
      subtitle="Top 20 styles × XS–XXL — green=healthy, red=hot/sold out, blue=slow"
      height={460}
      data={rows.map((r) => ({ style: r.style.style_name, brand: r.style.brand, exposure: r.exposure }))}
      exportFilename="size-curve-sell-through"
    >
      <div className="h-full overflow-auto">
        <table className="w-full text-xs border-separate border-spacing-y-1">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="text-left text-[var(--text-tertiary)] font-medium pb-2 pr-2 w-[40%]">Style</th>
              {SIZE_AXIS.map((sz) => (
                <th key={sz} className="text-center text-[var(--text-tertiary)] font-medium pb-2 px-1 w-10">
                  {sz}
                </th>
              ))}
              <th className="text-right text-[var(--text-tertiary)] font-medium pb-2 pl-2">Units</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.style.style_id} className="hover:bg-[var(--bg-secondary)]">
                <td className="pr-2 align-middle">
                  <p className="font-medium text-[var(--text-primary)] truncate">{r.style.style_name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {r.style.brand} · {r.style.category}
                  </p>
                </td>
                {r.cells.map((c, i) => (
                  <td key={i} className="px-0.5 align-middle">
                    {c ? (
                      <button
                        onClick={() => setSelected({ style: r.style, cell: c })}
                        className="relative w-full h-7 rounded-sm flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{ background: colorForPct(c.sell_through_pct) }}
                        title={`${Math.round(c.sell_through_pct * 100)}% sold · ${c.units_remaining} left`}
                      >
                        {Math.round(c.sell_through_pct * 100)}
                        {c.stockout_flag && (
                          <span
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                'repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 4px)',
                            }}
                          />
                        )}
                      </button>
                    ) : (
                      <div className="w-full h-7 rounded-sm bg-[var(--bg-secondary)]" />
                    )}
                  </td>
                ))}
                <td className="pl-2 text-right text-[var(--text-secondary)]">{r.exposure.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl p-5 max-w-md w-full"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {selected.style.style_name}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {selected.style.brand} · {selected.style.category} · {selected.style.season_tag}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Size</span>
                <span className="font-medium">{selected.cell.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Sell-through</span>
                <span className="font-medium">{Math.round(selected.cell.sell_through_pct * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Units remaining</span>
                <span className="font-medium">{selected.cell.units_remaining.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Days on floor</span>
                <span className="font-medium">{selected.cell.days_on_floor}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Stockout</span>
                <span className={`font-medium ${selected.cell.stockout_flag ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {selected.cell.stockout_flag ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
