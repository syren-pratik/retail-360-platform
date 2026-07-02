'use client';

import ChartCard from '@/app/components/charts/ChartCard';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import type { StoreOpeningDepartments, StoreOpeningDepartmentRow } from '@/app/lib/store-opening-types';

interface Props { departments: StoreOpeningDepartments; }

function confidenceClass(c: number): string {
  if (c >= 0.70) return 'bg-emerald-50 text-emerald-700';
  if (c >= 0.60) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

function statusClass(s: StoreOpeningDepartmentRow['status']): string {
  if (s === 'Ready') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'Review') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

export default function StoreOpeningDepartmentForecast({ departments }: Props) {
  const data = departments.rows.map((r) => ({
    department: r.department,
    mix_pct: r.mix_pct,
    year1_net_inr: r.year1_net_inr,
    confidence: r.confidence,
    opening_buy_inr: r.opening_buy_inr,
    status: r.status,
  }));

  return (
    <ChartCard
      id="store-opening-departments"
      title="Department forecast — first year"
      subtitle="Department worlds · forecast mix and recommended opening buys awaiting sign-off."
      height={340}
      data={data as unknown as Record<string, unknown>[]}
      exportFilename="store-opening-departments"
      showExpand={false}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
              <tr>
                <th className="text-left py-2">Department</th>
                <th className="text-right py-2">Mix</th>
                <th className="text-right py-2">Year-1 Net</th>
                <th className="text-center py-2">Conf.</th>
                <th className="text-right py-2">Opening Buy</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {departments.rows.map((r) => (
                <tr key={r.department} className="hover:bg-[var(--bg-secondary)]">
                  <td className="py-2 text-[var(--text-primary)] font-medium">{r.department}</td>
                  <td className="py-2 text-right font-mono">{r.mix_pct.toFixed(1)}%</td>
                  <td className="py-2 text-right font-mono">{formatLakhsCrores(r.year1_net_inr)}</td>
                  <td className="py-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${confidenceClass(r.confidence)}`}>
                      {r.confidence.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{formatLakhsCrores(r.opening_buy_inr)}</td>
                  <td className="py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-3 mt-2 border-t border-[var(--border-default)]">
          <span>{departments.remainder_label}</span>
          <span className="font-mono">total opening buy {formatLakhsCrores(departments.total_opening_buy_inr)}</span>
        </div>
      </div>
    </ChartCard>
  );
}
