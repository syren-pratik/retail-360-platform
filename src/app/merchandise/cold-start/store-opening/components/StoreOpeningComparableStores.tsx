'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import type { StoreOpeningComparables, StoreOpeningComparable } from '@/app/lib/store-opening-types';

interface Props { comparables: StoreOpeningComparables; }

function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: 60, height: 24 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            stroke="#F43F5E"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Row({ row }: { row: StoreOpeningComparable }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
      <div className="flex-shrink-0 w-12 text-right">
        <div className="text-lg font-semibold text-[var(--text-primary)] leading-none">{row.match_pct}%</div>
        <div className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mt-0.5">MATCH</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{row.store_name}</div>
        <div className="text-[11px] text-[var(--text-secondary)] truncate">{row.city_state}</div>
        <div className="text-[11px] font-mono text-[var(--text-tertiary)] mt-0.5">
          first-yr net {formatLakhsCrores(row.first_year_net_inr)}
        </div>
      </div>
      <Sparkline values={row.sparkline} />
    </div>
  );
}

export default function StoreOpeningComparableStores({ comparables }: Props) {
  const tableData = comparables.rows.map((r) => ({
    rank: r.rank,
    store: r.store_name,
    city: r.city_state,
    match_pct: r.match_pct,
    first_year_net_inr: r.first_year_net_inr,
  }));
  const top5 = comparables.rows.slice(0, 5);

  return (
    <ChartCard
      id="store-opening-comparables"
      title="Comparable Stores"
      subtitle="Mainland city stores driving the forecast, ranked by demographic, climate & format match."
      height={460}
      data={tableData as unknown as Record<string, unknown>[]}
      exportFilename="store-opening-comparables"
      showExpand={false}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 divide-y divide-[var(--border-default)]">
          {top5.map((r) => <Row key={r.rank} row={r} />)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-3 mt-2 border-t border-[var(--border-default)]">
          <span>+ {comparables.total_count - top5.length} more comps in blend</span>
          <span className="font-mono">weighted avg first-yr {formatLakhsCrores(comparables.weighted_avg_inr)}</span>
        </div>
      </div>
    </ChartCard>
  );
}
