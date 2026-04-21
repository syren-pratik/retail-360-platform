'use client';

import { useMemo } from 'react';
import { Tag, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PromoHistoryItem } from '@/app/lib/generate-product-pricing-detail';

interface PromoHistoryTableProps {
  data: PromoHistoryItem[];
}

function getPromoTypeColor(type: string): string {
  if ((type ?? '').includes('BOGO')) return 'bg-purple-100 text-purple-700';
  if ((type ?? '').includes('Bundle')) return 'bg-green-100 text-green-700';
  if ((type ?? '').includes('Combo')) return 'bg-teal-100 text-teal-700';
  if ((type ?? '').includes('Cashback')) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function PromoHistoryTable({ data }: PromoHistoryTableProps) {
  const stats = useMemo(() => {
    const avgLift = data.reduce((sum, p) => sum + p.lift_pct, 0) / (data ?? []).length;
    const avgRoi = data.reduce((sum, p) => sum + p.roi, 0) / (data ?? []).length;
    const avgDiscount = data.reduce((sum, p) => sum + p.discount_pct, 0) / (data ?? []).length;
    const bestPromo = data.reduce((best, p) => (p.roi > best.roi ? p : best), data[0]);
    return { avgLift, avgRoi, avgDiscount, bestPromo };
  }, [data]);

  const getRoiIcon = (roi: number) => {
    if (roi >= 1.5) return <TrendingUp size={12} className="text-green-500" />;
    if (roi >= 1) return <Minus size={12} className="text-amber-500" />;
    return <TrendingDown size={12} className="text-red-500" />;
  };

  const getRoiColor = (roi: number) => {
    if (roi >= 1.5) return 'text-green-600';
    if (roi >= 1) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <Tag size={18} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Promo History
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Past promotional performance
            </p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg mb-4">
        <div className="text-center">
          <div className="text-xs text-[var(--text-tertiary)]">Total Promos</div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">{(data ?? []).length}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-[var(--text-tertiary)]">Avg Discount</div>
          <div className="text-lg font-semibold text-red-600">{(stats.avgDiscount ?? 0).toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-[var(--text-tertiary)]">Avg Lift</div>
          <div className="text-lg font-semibold text-green-600">+{(stats.avgLift ?? 0).toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-[var(--text-tertiary)]">Avg ROI</div>
          <div className={`text-lg font-semibold ${getRoiColor(stats.avgRoi)}`}>
            {(stats.avgRoi ?? 0).toFixed(2)}x
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="p-2 text-left font-medium text-[var(--text-secondary)]">ID</th>
              <th className="p-2 text-left font-medium text-[var(--text-secondary)]">Date</th>
              <th className="p-2 text-left font-medium text-[var(--text-secondary)]">Type</th>
              <th className="p-2 text-right font-medium text-[var(--text-secondary)]">Discount</th>
              <th className="p-2 text-right font-medium text-[var(--text-secondary)]">Lift</th>
              <th className="p-2 text-right font-medium text-[var(--text-secondary)]">ROI</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((promo) => (
              <tr
                key={promo.promo_id}
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
              >
                <td className="p-2 font-medium text-[var(--text-primary)]">
                  {promo.promo_id}
                </td>
                <td className="p-2 text-[var(--text-secondary)]">{formatDate(promo.date)}</td>
                <td className="p-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPromoTypeColor(
                      promo.type
                    )}`}
                  >
                    {promo.type}
                  </span>
                </td>
                <td className="p-2 text-right text-red-600">-{promo.discount_pct}%</td>
                <td className="p-2 text-right text-green-600">+{(promo.lift_pct ?? 0).toFixed(1)}%</td>
                <td className="p-2 text-right">
                  <span className={`flex items-center justify-end gap-1 ${getRoiColor(promo.roi)}`}>
                    {getRoiIcon(promo.roi)}
                    {(promo.roi ?? 0).toFixed(2)}x
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Best performer highlight */}
      {stats.bestPromo && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-green-600 font-medium mb-1">Best Performing Promo</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-primary)] font-medium">
              {stats.bestPromo.promo_id} - {stats.bestPromo.type}
            </span>
            <span className="text-green-600 font-semibold">{(stats.bestPromo?.roi ?? 0).toFixed(2)}x ROI</span>
          </div>
        </div>
      )}
    </div>
  );
}
