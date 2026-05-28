'use client';

import type { TopSKURow, SKURiskBadge } from '../lib/forecast-aggregation';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import type { MerchFilterState } from '../MerchFilterContext';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import MerchSKUDetailView from './MerchSKUDetailView';

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="w-[60px] h-6 flex-shrink-0" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 60, H = 24;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RiskBadge({ risk }: { risk: SKURiskBadge }) {
  const cls =
    risk.variant === 'negative'
      ? 'badge badge-negative'
      : risk.variant === 'warning'
        ? 'badge badge-warning'
        : 'badge badge-neutral';
  return <span className={cls}>{risk.label}</span>;
}

const SPARKLINE_COLORS: Record<SKURiskBadge['variant'], string> = {
  neutral: '#3B82F6',
  warning: '#F59E0B',
  negative: '#F43F5E',
};

interface Props {
  rows: TopSKURow[];
  horizon: number;
  selectedSKUId: string | null;
  onSKUSelect: (id: string | null) => void;
  payload: MerchDemandFullPayload;
  filters: MerchFilterState;
}

export default function MerchSKUDrillPanel({
  rows,
  horizon,
  selectedSKUId,
  onSKUSelect,
  payload,
  filters,
}: Props) {
  // Detail view mode — swap list for detail when a SKU is selected
  if (selectedSKUId) {
    const selectedRow = rows.find(r => r.sku.sku_id === selectedSKUId);
    if (selectedRow) {
      return (
        <div className="flex flex-col h-full overflow-y-auto" style={{ maxHeight: 480 }}>
          <MerchSKUDetailView
            key={selectedSKUId}
            sku={selectedRow.sku}
            payload={payload}
            filters={filters}
            onBack={() => onSKUSelect(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)]">Top SKUs by Forecast Revenue</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          {horizon}d horizon · ranked by ₹ forecast · click to inspect
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-sm text-[var(--text-tertiary)]">
          No SKUs in scope
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 320 }}>
          {rows.map((row, idx) => (
            <button
              key={row.sku.sku_id}
              type="button"
              onClick={() => onSKUSelect(row.sku.sku_id)}
              className="w-full text-left p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] w-4 flex-shrink-0 tabular-nums">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate leading-tight">
                    {row.sku.product_name}
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono leading-tight mt-0.5">
                    {row.sku.sku_id}
                  </p>
                </div>

                <Sparkline
                  data={row.sparkline}
                  color={SPARKLINE_COLORS[row.risk.variant]}
                />

                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0 w-16 text-right">
                  {formatLakhsCrores(row.revenue_at_stake)}
                </span>
              </div>

              <div className="mt-1 ml-6">
                <RiskBadge risk={row.risk} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
