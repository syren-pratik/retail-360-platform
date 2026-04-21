'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import ChartCard from '@/app/components/charts/ChartCard';
import { UrgencyBadge } from '@/app/components/ui/SafeBadge';
import { safeLookup } from '@/app/lib/safe-data';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface UnderStockedItem {
  product_id: string;
  product_name: string;
  store: string;
  current: number;
  safety: number;
  gap: number;
  urgency: string; // Changed from union type to string for safety
}

interface UnderStockedTableProps {
  data: UnderStockedItem[];
}

// Safe lookup required — data values may vary in casing or include unmapped values
const URGENCY_ORDER: Record<string, number> = {
  Critical: 0, URGENT: 0,
  High: 1, HIGH: 1,
  Medium: 2, MEDIUM: 2,
  Low: 3, LOW: 3,
};

export default function UnderStockedTable({ data }: UnderStockedTableProps) {
  const router = useRouter();

  // Sort by urgency (Critical first) then by gap - using safe lookup
  const sortedData = (data ?? []).slice().sort((a, b) => {
    const orderA = safeLookup(URGENCY_ORDER, a.urgency, 99);
    const orderB = safeLookup(URGENCY_ORDER, b.urgency, 99);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (b.gap ?? 0) - (a.gap ?? 0);
  });

  const handleRowClick = (productId: string) => {
    router.push(`/inventory/product/${productId}`);
  };

  // Calculate summary stats
  const criticalCount = (data ?? []).filter(d => d.urgency === 'Critical').length;
  const totalGap = (data ?? []).reduce((sum, d) => sum + (d.gap ?? 0), 0);

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  return (
    <ChartCard
      id="under-stocked-table"
      title="Under-Stocked SKUs"
      subtitle={`${criticalCount} critical • ${(totalGap ?? 0).toLocaleString()} units below safety stock`}
      height={280}
      data={data as unknown as Record<string, unknown>[]}
    >
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--bg-secondary)]">
            <tr className="text-left text-[var(--text-tertiary)]">
              <th className="py-2 px-2 font-medium">SKU</th>
              <th className="py-2 px-2 font-medium">Store</th>
              <th className="py-2 px-2 font-medium text-right">Current</th>
              <th className="py-2 px-2 font-medium text-right">Safety</th>
              <th className="py-2 px-2 font-medium text-right">Gap</th>
              <th className="py-2 px-2 font-medium">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {(sortedData ?? []).map((item) => {
              const coveragePct = (item.safety ?? 0) > 0 ? (((item.current ?? 0) / (item.safety ?? 1)) * 100).toFixed(0) : '0';
              const isCritical = (item.urgency ?? '')?.toLowerCase() === 'critical' || item.urgency === 'URGENT';

              return (
                <tr
                  key={`${item.product_id}-${item.store}`}
                  onClick={() => handleRowClick(item.product_id)}
                  className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                >
                  <td className="py-2 px-2">
                    <div>
                      <p className="font-medium text-[var(--text-primary)] truncate max-w-[120px]" title={item.product_name}>
                        {item.product_name}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{item.product_id}</p>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-[var(--text-secondary)] truncate max-w-[100px]" title={item.store}>
                    {item.store}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-[var(--text-primary)]">
                    {(item.current ?? 0)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {(item.safety ?? 0)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingDown size={12} className="text-red-500" />
                      <span className="font-medium text-red-600">-{(item.gap ?? 0)}</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{coveragePct}% coverage</p>
                  </td>
                  <td className="py-2 px-2">
                    <UrgencyBadge
                      value={item.urgency}
                      icon={isCritical ? <AlertTriangle size={10} /> : undefined}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
            <AlertTriangle size={24} className="mb-2 opacity-50" />
            <p className="text-sm">No under-stocked items</p>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
