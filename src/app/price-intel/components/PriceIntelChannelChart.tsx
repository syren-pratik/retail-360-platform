'use client';

import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelChannelPerformance } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import { formatPercentSigned } from '@/app/lib/merch-format';

interface Props {
  channels: PriceIntelChannelPerformance[];
}

export default function PriceIntelChannelChart({ channels }: Props) {
  return (
    <PriceIntelChartCard
      data={channels as unknown as Record<string, unknown>[]}
      id="price-intel-channel"
      title="Channel Performance"
      subtitle="Revenue vs lift by channel"
      height={260}
      exportFilename="price_intel_channel"
    >
      <div className="space-y-3 pt-2">
        {channels.map((ch) => (
          <div key={ch.channel}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">{ch.channel}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-secondary)]">{formatMoneyAuto(ch.revenue_inr)}</span>
                <span className={`text-xs font-medium tabular-nums ${ch.revenue_lift_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatPercentSigned(ch.revenue_lift_pct)} lift
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              {/* baseline */}
              <div
                className="absolute left-0 top-0 h-full bg-[var(--border-default)] rounded-full"
                style={{ width: `${ch.baseline_bar_width_pct}%` }}
              />
              {/* actual */}
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{
                  width: `${ch.bar_width_pct}%`,
                  background: ch.revenue_lift_pct >= 0 ? '#10B981' : '#F43F5E',
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </PriceIntelChartCard>
  );
}
