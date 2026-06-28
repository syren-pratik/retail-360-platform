'use client';

interface BrandCell {
  segment: string;
  brand: string;
  share_of_wallet_pct: number;
  avg_aov_with_brand: number;
  customer_count: number;
}

export interface BrandAffinityData {
  segments: string[];
  brands: string[];
  cells: BrandCell[];
}

interface BrandAffinityHeatmapProps {
  data: BrandAffinityData;
}

// Green-scale color ramp on share_of_wallet_pct. Top of scale ~25%.
function cellColor(pct: number): { bg: string; fg: string } {
  if (pct >= 20) return { bg: '#065F46', fg: '#fff' };
  if (pct >= 15) return { bg: '#047857', fg: '#fff' };
  if (pct >= 10) return { bg: '#059669', fg: '#fff' };
  if (pct >= 7)  return { bg: '#10B981', fg: '#fff' };
  if (pct >= 4)  return { bg: '#6EE7B7', fg: '#064E3B' };
  if (pct >= 2)  return { bg: '#A7F3D0', fg: '#064E3B' };
  if (pct >= 1)  return { bg: '#D1FAE5', fg: '#064E3B' };
  return { bg: '#F0FDF4', fg: '#94A3B8' };
}

export default function BrandAffinityHeatmap({ data }: BrandAffinityHeatmapProps) {
  if (!data?.cells?.length) return null;

  // Lookup map by `${segment}__${brand}`
  const map = new Map<string, BrandCell>();
  data.cells.forEach((c) => map.set(`${c.segment}__${c.brand}`, c));

  const segments = data.segments ?? [];
  const brands = data.brands ?? [];

  return (
    <section className="card h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Brand Affinity — Segment x Brand
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Share of wallet % · hover for AOV and customer counts
          </p>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-[var(--text-secondary)] font-medium min-w-[140px]">
                Segment
              </th>
              {brands.map((b) => (
                <th
                  key={b}
                  className="text-center py-2 px-1 text-[var(--text-secondary)] font-medium min-w-[64px] whitespace-nowrap"
                >
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {segments.map((seg) => (
              <tr key={seg} className="border-t border-[var(--border-subtle)]">
                <td className="py-1.5 px-2 text-[var(--text-primary)] font-medium whitespace-nowrap">
                  {seg}
                </td>
                {brands.map((br) => {
                  const cell = map.get(`${seg}__${br}`);
                  const pct = cell?.share_of_wallet_pct ?? 0;
                  const { bg, fg } = cellColor(pct);
                  const title = cell
                    ? `${seg} x ${br}\nShare of wallet: ${pct.toFixed(1)}%\nAvg AOV: $${cell.avg_aov_with_brand}\nCustomers: ${cell.customer_count.toLocaleString('en-US')}`
                    : `${seg} x ${br}: no data`;
                  return (
                    <td key={br} className="py-1 px-0.5 text-center">
                      <span
                        title={title}
                        className="inline-block w-full py-1 rounded text-[11px] font-medium"
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color scale legend */}
      <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
        <span>Share of wallet:</span>
        {[0, 2, 5, 10, 15, 20].map((p) => {
          const { bg, fg } = cellColor(p);
          return (
            <span
              key={p}
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: bg, color: fg }}
            >
              {p}%
            </span>
          );
        })}
      </div>
    </section>
  );
}
