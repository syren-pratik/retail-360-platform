'use client';

import { useMemo, useState } from 'react';
import type { MerchDemandFullPayload, MerchDemandActionItem } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXCEPTION_TYPES = [
  'understock_risk',
  'overstock_risk',
  'event_ramp',
  'anomaly',
  'demand_spike',
  'demand_drop',
] as const;

type ExcType = (typeof EXCEPTION_TYPES)[number];

const TYPE_LABELS: Record<ExcType, string> = {
  understock_risk: 'Understock',
  overstock_risk:  'Overstock',
  event_ramp:      'Event Ramp',
  anomaly:         'Anomaly',
  demand_spike:    'Spike',
  demand_drop:     'Drop',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  understock_risk: 'Understock Risk',
  overstock_risk:  'Overstock Risk',
  event_ramp:      'Event Ramp',
  demand_spike:    'Demand Spike',
  demand_drop:     'Demand Drop',
  anomaly:         'Anomaly',
  promo_extend:    'Promo Extend',
  promo_pull:      'Promo Pull',
  launch_scale:    'Launch Scale',
};

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

function derivePriority(item: MerchDemandActionItem): Priority {
  const absImpact = Math.abs(item.revenue_impact_inr);
  if (
    absImpact >= 400_000 ||
    (item.action_type === 'understock_risk' && item.days_to_impact <= 2)
  )
    return 'Critical';
  if (absImpact >= 150_000 || item.days_to_impact <= 5) return 'High';
  if (absImpact >= 50_000) return 'Medium';
  return 'Low';
}

function heatCell(count: number): { bg: string; fg: string } {
  if (count === 0) return { bg: '#F8FAFC', fg: '#94A3B8' };
  if (count === 1) return { bg: '#FEE2E2', fg: '#DC2626' };
  if (count <= 3) return { bg: '#FECACA', fg: '#B91C1C' };
  return { bg: '#F87171', fg: '#fff' };
}

const STORE_TYPE_BADGE: Record<string, string> = {
  Hypermarket:     'bg-violet-100 text-violet-700',
  Supermarket:     'bg-blue-100 text-blue-700',
  Express:         'bg-sky-100 text-sky-700',
  'Dark Store':    'bg-slate-100 text-slate-700',
  'Kirana Partner':'bg-amber-100 text-amber-700',
};

const INSIGHTS = [
  {
    headline: 'Dark Stores have fewest exceptions per store',
    detail:
      'Dark fulfillment centers show more predictable demand. Lower exception rate than retail formats.',
    severity: 'positive' as const,
  },
  {
    headline: 'Hypermarket exceptions highest by ₹ value',
    detail:
      'Larger store format means larger revenue impact per exception. Prioritise hypermarket actions.',
    severity: 'negative' as const,
  },
  {
    headline: 'North India stores: most event_ramp exceptions',
    detail:
      'Eid al-Adha preparation exceptions concentrated in North India stores. Region-specific action needed.',
    severity: 'warning' as const,
  },
  {
    headline: 'Kirana Partner stores: few exceptions tracked',
    detail:
      'Kirana partner data is sparse. Exception tracking may under-represent actual demand risk.',
    severity: 'neutral' as const,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  core: MerchDemandFullPayload;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ByStoreTab({ core }: Props) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // ── Store data ────────────────────────────────────────────────────────────
  const storeData = useMemo(() => {
    const topStores = core.stores.slice(0, 30);
    return topStores
      .map((store) => {
        const storeItems = core.action_items.filter(
          (item) =>
            item.store_scope.type === 'all' ||
            item.store_scope.store_ids.includes(store.store_id),
        );
        const byType: Record<string, number> = {};
        EXCEPTION_TYPES.forEach((t) => {
          byType[t] = storeItems.filter((i) => i.action_type === t).length;
        });
        const criticalCount = storeItems.filter((i) => derivePriority(i) === 'Critical').length;
        const totalRevenue = storeItems.reduce(
          (s, i) => s + Math.abs(i.revenue_impact_inr),
          0,
        );
        const worstType = EXCEPTION_TYPES.reduce(
          (prev, curr) => (byType[curr] > (byType[prev] ?? 0) ? curr : prev),
          EXCEPTION_TYPES[0],
        );
        return {
          store,
          byType,
          criticalCount,
          totalRevenue,
          worstType,
          total: storeItems.length,
          items: storeItems,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [core.stores, core.action_items]);

  // ── Selected store ────────────────────────────────────────────────────────
  const selectedStoreData = useMemo(
    () => storeData.find((sd) => sd.store.store_id === selectedStoreId) ?? null,
    [storeData, selectedStoreId],
  );

  return (
    <div className="space-y-6">
      {/* ── Section 1: Heatmap table ── */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Exception Heatmap — Top 20 Stores
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Click a row to see store details below
            </p>
          </div>
          <AIInsightButton id="merch-dd-exception-heatmap-stores" title="Exception Heatmap — Top 20 Stores" data={storeData.slice(0, 20) as unknown as Record<string, unknown>[]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Store
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  City
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Type
                </th>
                {EXCEPTION_TYPES.map((t) => (
                  <th
                    key={t}
                    className="px-3 py-3 text-center font-medium text-[var(--text-tertiary)] uppercase tracking-wide whitespace-nowrap"
                  >
                    {TYPE_LABELS[t]}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {storeData.slice(0, 20).map((row) => (
                <tr
                  key={row.store.store_id}
                  onClick={() =>
                    setSelectedStoreId(
                      row.store.store_id === selectedStoreId ? null : row.store.store_id,
                    )
                  }
                  className={`cursor-pointer transition-colors hover:bg-[var(--bg-secondary)] ${
                    selectedStoreId === row.store.store_id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {row.store.store_name}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.store.city}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        STORE_TYPE_BADGE[row.store.store_type] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.store.store_type}
                    </span>
                  </td>
                  {EXCEPTION_TYPES.map((t) => {
                    const count = row.byType[t] ?? 0;
                    const { bg, fg } = heatCell(count);
                    return (
                      <td
                        key={t}
                        className="px-3 py-2.5 text-center font-mono font-medium"
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        {count}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-[var(--text-primary)]">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Store summary table ── */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Store Summary</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Sorted by revenue at stake — all top 30 stores
            </p>
          </div>
          <AIInsightButton id="merch-dd-store-summary" title="Store Summary" data={storeData as unknown as Record<string, unknown>[]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Store
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  City
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Total Exceptions
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Critical
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Revenue at Stake
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Worst Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {storeData.map((row) => (
                <tr
                  key={row.store.store_id}
                  className="hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                    {row.store.store_name}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        STORE_TYPE_BADGE[row.store.store_type] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.store.store_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.store.city}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--text-primary)]">
                    {row.total}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`font-mono font-semibold ${
                        row.criticalCount > 0 ? 'text-rose-600' : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      {row.criticalCount}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium text-[var(--text-primary)]">
                    {formatLakhsCrores(row.totalRevenue)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {TYPE_LABELS[row.worstType as ExcType] ?? row.worstType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Selected store detail panel ── */}
      {selectedStoreData && (
        <div className="bg-[var(--bg-primary)] border border-blue-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-900">
                {selectedStoreData.store.store_name}
              </h3>
              <p className="text-xs text-blue-700 mt-0.5">
                {selectedStoreData.store.store_type} · {selectedStoreData.store.city},{' '}
                {selectedStoreData.store.state} · {selectedStoreData.total} exceptions ·{' '}
                {formatLakhsCrores(selectedStoreData.totalRevenue)} at stake
              </p>
            </div>
            <button
              onClick={() => setSelectedStoreId(null)}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                    Action Type
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                    Revenue Impact
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {selectedStoreData.items
                  .sort(
                    (a, b) =>
                      Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr),
                  )
                  .slice(0, 20)
                  .map((item) => {
                    const sku = core.skus.find((s) => s.sku_id === item.sku_id);
                    return (
                      <tr
                        key={item.action_id}
                        className="hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                            {sku?.product_name ?? item.sku_id}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{item.sku_id}</p>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                          {ACTION_TYPE_LABELS[item.action_type] ?? item.action_type}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[var(--text-primary)]">
                          {formatLakhsCrores(Math.abs(item.revenue_impact_inr))}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`font-medium ${
                              item.confidence === 'High'
                                ? 'text-emerald-700'
                                : item.confidence === 'Medium'
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.confidence}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Insights ── */}
      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
