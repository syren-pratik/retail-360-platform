'use client';

import { useMemo } from 'react';
import { Truck, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface InboundOrder {
  po_id: string;
  product_name: string;
  supplier: string;
  qty: number;
  expected_date: string;
  status: 'in_transit' | 'at_risk' | 'delayed' | 'received';
  delay_days: number;
}

interface InboundTableProps {
  data: InboundOrder[];
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  in_transit: {
    icon: <Truck size={12} />,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'In Transit',
  },
  at_risk: {
    icon: <Clock size={12} />,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'At Risk',
  },
  delayed: {
    icon: <AlertCircle size={12} />,
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Delayed',
  },
  received: {
    icon: <CheckCircle size={12} />,
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Received',
  },
};

export default function InboundTable({ data }: InboundTableProps) {
  // Sort: delayed first, then at_risk, then in_transit
  const sortedData = useMemo(() => {
    const statusOrder = { delayed: 0, at_risk: 1, in_transit: 2, received: 3 };
    return (data ?? []).slice().sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Secondary sort by expected date
      return new Date(a.expected_date ?? '').getTime() - new Date(b.expected_date ?? '').getTime();
    });
  }, [data]);

  const delayedCount = (data ?? []).filter(d => d.status === 'delayed').length;
  const atRiskCount = (data ?? []).filter(d => d.status === 'at_risk').length;

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  return (
    <ChartCard
      id="inbound-table"
      title="Inbound Orders"
      subtitle={`${delayedCount} delayed • ${atRiskCount} at risk`}
      height={320}
      data={data as unknown as Record<string, unknown>[]}
    >
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="text-left text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
              <th className="py-2 px-2 font-medium">PO #</th>
              <th className="py-2 px-2 font-medium">Product</th>
              <th className="py-2 px-2 font-medium">Supplier</th>
              <th className="py-2 px-2 font-medium text-right">Qty</th>
              <th className="py-2 px-2 font-medium">Expected</th>
              <th className="py-2 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(sortedData ?? []).map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['in_transit'];
              const expectedDate = new Date(order.expected_date ?? '').toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <tr
                  key={order.po_id}
                  className={`border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors ${
                    order.status === 'delayed' ? 'bg-red-50/50' : ''
                  }`}
                >
                  <td className="py-2 px-2">
                    <span className="font-medium text-[var(--accent-blue)]">
                      {order.po_id}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-[var(--text-primary)] truncate max-w-[140px] block" title={order.product_name}>
                      {order.product_name}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">
                    {order.supplier}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-[var(--text-primary)]">
                    {(order.qty ?? 0).toLocaleString()}
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-[var(--text-secondary)]">{expectedDate}</span>
                    {(order.delay_days ?? 0) > 0 && (
                      <span className="ml-1 text-red-600 font-medium">
                        (+{(order.delay_days ?? 0)}d)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
            <Truck size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No inbound orders</p>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
