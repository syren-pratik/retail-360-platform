'use client';

import ChartCard from '@/app/components/charts/ChartCard';
import type { StoreOpeningDrivers } from '@/app/lib/store-opening-types';

interface Props { drivers: StoreOpeningDrivers; }

const MAX_PCT = 18;

function Row({ label, effect }: { label: string; effect: number }) {
  const isPos = effect >= 0;
  const widthPct = (Math.abs(effect) / MAX_PCT) * 50; // half-width = max 50%
  const color = isPos ? '#10B981' : '#F59E0B';

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-56 flex-shrink-0 text-xs text-[var(--text-secondary)] text-right pr-2">{label}</div>
      <div className="flex-1 relative h-6">
        {/* center axis */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300" />
        {/* bar */}
        <div
          className="absolute top-1 bottom-1 rounded"
          style={{
            backgroundColor: color,
            left: isPos ? '50%' : `${50 - widthPct}%`,
            width: `${widthPct}%`,
          }}
        />
        {/* value label */}
        <div
          className="absolute top-0 bottom-0 flex items-center text-[11px] font-semibold"
          style={{
            color,
            left: isPos ? `calc(50% + ${widthPct}% + 4px)` : undefined,
            right: !isPos ? `calc(50% + ${widthPct}% + 4px)` : undefined,
          }}
        >
          {isPos ? '+' : ''}{effect}%
        </div>
      </div>
    </div>
  );
}

export default function StoreOpeningMarketDrivers({ drivers }: Props) {
  const data = drivers.rows.map((d) => ({ label: d.label, effect_pct: d.effect_pct }));
  return (
    <ChartCard
      id="store-opening-drivers"
      title="Market & site drivers"
      subtitle="Effect on the forecast vs the chain new-store baseline."
      height={340}
      data={data as unknown as Record<string, unknown>[]}
      exportFilename="store-opening-drivers"
      showExpand={false}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col justify-center">
          {drivers.rows.map((r) => <Row key={r.label} label={r.label} effect={r.effect_pct} />)}
        </div>
        <div className="pt-3 mt-2 border-t border-[var(--border-default)] text-right">
          <span className="text-xs text-[var(--text-secondary)]">Net market & site effect vs baseline: </span>
          <span className="text-sm font-semibold text-emerald-600">+{drivers.net_effect_pct}%</span>
        </div>
      </div>
    </ChartCard>
  );
}
