'use client';


import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelMechanicROI } from '@/app/lib/price-intel-types';

interface Props {
  mechanics: PriceIntelMechanicROI[];
}

export default function PromoMechanicROI({ mechanics }: Props) {
  const sorted = [...mechanics].sort((a, b) => b.roi - a.roi);

  return (
    <PriceIntelChartCard
      data={mechanics as unknown as Record<string, unknown>[]}
      id="price-intel-mechanic-roi"
      title="ROI by Mechanic"
      subtitle="Promo mechanic effectiveness"
      height={240}
      exportFilename="price_intel_mechanic_roi"
    >
      <div className="flex items-center gap-4 h-full pt-2">
        {/* Simple horizontal bars */}
        <div className="flex-1 space-y-2.5">
          {sorted.map((m) => (
            <div key={m.mechanic}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-primary)] font-medium">{m.mechanic}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">{m.share_pct.toFixed(0)}% share</span>
                  <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">{m.roi.toFixed(2)}×</span>
                </div>
              </div>
              <div className="relative h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((m.roi / 4) * 100, 100)}%`,
                    background: m.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PriceIntelChartCard>
  );
}
