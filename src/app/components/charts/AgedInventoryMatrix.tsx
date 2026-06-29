'use client';

import { useMemo } from 'react';
import ChartCard from './ChartCard';
import { formatCrOrUsdMAuto } from '@/app/lib/format-money';

interface Cell {
  season: string;
  category: string;
  inventory_value_usd_m: number;
  avg_weeks_on_floor: number;
  markdown_stage_distribution?: Record<string, number>;
  aged_flag: boolean;
}

export interface AgedInventoryData {
  seasons: string[];
  categories: string[];
  cells: Cell[];
  summary?: {
    total_aged_value_usd_m?: number;
    worst_season?: string;
    worst_category?: string;
  };
}

interface Props {
  data: AgedInventoryData | null;
}

function ageColor(weeks: number): string {
  // green→yellow→red ramp by avg_weeks_on_floor
  if (weeks <= 12) return '#10B981';
  if (weeks <= 20) return '#84CC16';
  if (weeks <= 30) return '#F59E0B';
  if (weeks <= 45) return '#F97316';
  return '#DC2626';
}

export default function AgedInventoryMatrix({ data }: Props) {
  const lookup = useMemo(() => {
    const m = new Map<string, Cell>();
    data?.cells.forEach((c) => m.set(`${c.season}::${c.category}`, c));
    return m;
  }, [data]);

  if (!data) {
    return (
      <ChartCard id="aged-inventory-matrix" title="Aged Inventory by Season" height={360}>
        <div className="text-sm text-[var(--text-secondary)] flex h-full items-center justify-center">
          No aged-inventory data available.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      id="aged-inventory-matrix"
      title="Aged Inventory by Season"
      subtitle="Season × Category — value $; color = weeks on floor; red border = past tolerance"
      height={360}
      data={data.cells as unknown as Record<string, unknown>[]}
      exportFilename="aged-inventory-matrix"
    >
      <div className="h-full overflow-auto">
        <table className="w-full text-xs border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left text-[var(--text-tertiary)] font-medium pb-1">Season</th>
              {data.categories.map((c) => (
                <th key={c} className="text-center text-[var(--text-tertiary)] font-medium pb-1 px-1">
                  <span className="block max-w-[80px] mx-auto truncate" title={c}>
                    {c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.seasons.map((s) => (
              <tr key={s}>
                <td className="font-medium text-[var(--text-primary)] pr-2">{s}</td>
                {data.categories.map((c) => {
                  const cell = lookup.get(`${s}::${c}`);
                  if (!cell) {
                    return <td key={c} className="w-20 h-12 bg-[var(--bg-secondary)] rounded-sm" />;
                  }
                  return (
                    <td key={c} className="px-0">
                      <div
                        className="h-12 rounded-sm flex flex-col items-center justify-center text-white"
                        style={{
                          background: ageColor(cell.avg_weeks_on_floor),
                          boxShadow: cell.aged_flag ? 'inset 0 0 0 2px #B91C1C' : undefined,
                        }}
                        title={`${cell.season} · ${cell.category}: ${cell.avg_weeks_on_floor}w on floor`}
                      >
                        <span className="text-xs font-semibold">
                          {formatCrOrUsdMAuto(cell.inventory_value_usd_m)}
                        </span>
                        <span className="text-[9px] opacity-90">{cell.avg_weeks_on_floor}w</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-3 text-[10px] text-[var(--text-tertiary)] mt-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#10B981' }} />≤12w fresh
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#F59E0B' }} />13–30w aging
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#DC2626' }} />45w+ aged
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm ring-2 ring-red-700" />past tolerance
          </span>
        </div>
      </div>
    </ChartCard>
  );
}
