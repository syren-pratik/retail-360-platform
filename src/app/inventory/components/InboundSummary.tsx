'use client';

import { Truck, AlertCircle, PackageCheck } from 'lucide-react';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface InboundSummaryData {
  in_transit: { count: number; value: number };
  delayed: { count: number; value: number; avg_delay_days: number };
  received_this_week: { count: number; value: number };
}

interface InboundSummaryProps {
  data: InboundSummaryData;
}

export default function InboundSummary({ data }: InboundSummaryProps) {
  if (!data) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  const cards = [
    {
      title: 'In Transit',
      value: data.in_transit?.count ?? 0,
      subValue: `₹${((data.in_transit?.value ?? 0) / 100000).toFixed(1)}L`,
      icon: Truck,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Delayed',
      value: data.delayed?.count ?? 0,
      subValue: `Avg ${(data.delayed?.avg_delay_days ?? 0).toFixed(1)} days`,
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      alert: (data.delayed?.count ?? 0) > 0,
    },
    {
      title: 'Received This Week',
      value: data.received_this_week?.count ?? 0,
      subValue: `₹${((data.received_this_week?.value ?? 0) / 100000).toFixed(1)}L`,
      icon: PackageCheck,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {(cards ?? []).map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`bg-white rounded-lg border ${
              card.alert ? 'border-red-200' : 'border-[var(--border-default)]'
            } p-4 flex items-center gap-4`}
          >
            <div className={`p-3 rounded-lg ${card.iconBg}`}>
              <Icon size={24} className={card.iconColor} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-0.5">{card.title}</p>
              <p className={`text-2xl font-semibold ${
                card.alert ? 'text-red-600' : 'text-[var(--text-primary)]'
              }`}>
                {card.value}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{card.subValue}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
