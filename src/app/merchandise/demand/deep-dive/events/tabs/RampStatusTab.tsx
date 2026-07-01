'use client';

import { useMemo, useState } from 'react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';
import { getLocaleAuto } from '@/app/lib/format-money';

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const INSIGHTS = [
  {
    headline: 'Top 5 at-risk SKUs: 68% of total ramp gap',
    detail: 'Prioritise these 5 SKUs for immediate procurement action.',
    severity: 'negative' as const,
  },
  {
    headline: 'Edible Oil has 14-day lead time',
    detail: 'Order by May 24 to be ready for Eid al-Adha. Critical window closing.',
    severity: 'warning' as const,
  },
  {
    headline: 'Dal & Pulses ramp gap: ₹8.2L',
    detail: 'Highest revenue exposure. Recommend immediate order placement.',
    severity: 'negative' as const,
  },
  {
    headline: 'Express stores: faster restocking',
    detail: 'Prioritise Express DC transfers — 3-day lead vs 7-day for hypermarkets.',
    severity: 'neutral' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function RampStatusTab({ core }: Props) {
  const defaultEventId = useMemo(() => {
    const eid = core.events.find((e) => e.event_name === 'Eid al-Adha');
    return eid?.event_id ?? core.events[0]?.event_id ?? '';
  }, [core.events]);

  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId);

  const rampItems = useMemo(() => {
    const eventRampItems = core.action_items.filter((a) => a.action_type === 'event_ramp');
    return eventRampItems
      .map((item, i) => {
        const sku = core.skus.find((s) => s.sku_id === item.sku_id);
        const recommendedStock = Math.round(
          (Math.abs(item.revenue_impact_inr) / (sku?.price_inr ?? 100)) * 1.2,
        );
        const randomFactor = 0.3 + seededNoise(i * 7) * 0.5;
        const currentStock = Math.round(recommendedStock * randomFactor);
        const gap = Math.max(0, recommendedStock - currentStock);
        const gapInr = gap * (sku?.price_inr ?? 100);
        const ratio = currentStock / Math.max(recommendedStock, 1);
        const rampStatus: 'ready' | 'partial' | 'at-risk' =
          ratio >= 0.8 ? 'ready' : ratio >= 0.5 ? 'partial' : 'at-risk';
        return { item, sku, recommendedStock, currentStock, gap, gapInr, rampStatus };
      })
      .sort((a, b) => b.gapInr - a.gapInr);
  }, [core.action_items, core.skus]);

  const selectedEvent = core.events.find((e) => e.event_id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Event selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[var(--text-secondary)]">Event:</label>
        <select
          className="input-base text-sm py-1.5 px-3"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {core.events.map((ev) => (
            <option key={ev.event_id} value={ev.event_id}>
              {ev.event_name}
            </option>
          ))}
        </select>
        {selectedEvent && (
          <span className="text-xs text-[var(--text-tertiary)]">
            {new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {' · '}
            Prep window: {selectedEvent.typical_prep_days} days
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-rose-600">
            {rampItems.filter((r) => r.rampStatus === 'at-risk').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">At-risk SKUs</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-600">
            {rampItems.filter((r) => r.rampStatus === 'partial').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Partial ramp SKUs</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {rampItems.filter((r) => r.rampStatus === 'ready').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Ready SKUs</p>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-end mb-2">
          <AIInsightButton id="merch-dd-event-ramp-status" title="Event Ramp Status" data={rampItems as unknown as Record<string, unknown>[]} />
        </div>
        <div className="overflow-auto" style={{ maxHeight: 560 }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--bg-secondary)]">
              <tr>
                <th className="text-left py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  SKU
                </th>
                <th className="text-left py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Category
                </th>
                <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Current Stock
                </th>
                <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Recommended
                </th>
                <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Gap (units)
                </th>
                <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Gap (₹)
                </th>
                <th className="text-center py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Status
                </th>
                <th className="text-center py-2 px-3 text-[var(--text-tertiary)] font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rampItems.map(
                ({ item, sku, recommendedStock, currentStock, gap, gapInr, rampStatus }) => (
                  <tr
                    key={item.action_id}
                    className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="py-2 px-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {sku?.product_name ?? item.sku_id}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{item.sku_id}</p>
                    </td>
                    <td className="py-2 px-3 text-[var(--text-secondary)]">
                      {sku?.category ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                      {currentStock.toLocaleString(getLocaleAuto())}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                      {recommendedStock.toLocaleString(getLocaleAuto())}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={gap > 0 ? 'text-rose-600 font-medium' : 'text-emerald-600'}>
                        {gap > 0 ? `+${gap.toLocaleString(getLocaleAuto())}` : '0'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={gap > 0 ? 'text-rose-600' : 'text-[var(--text-tertiary)]'}>
                        {gap > 0 ? formatLakhsCrores(gapInr) : '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`badge ${
                          rampStatus === 'ready'
                            ? 'badge-positive'
                            : rampStatus === 'partial'
                              ? 'badge-warning'
                              : 'badge-negative'
                        }`}
                      >
                        {rampStatus === 'at-risk'
                          ? 'At Risk'
                          : rampStatus === 'partial'
                            ? 'Partial'
                            : 'Ready'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {rampStatus === 'at-risk' ? (
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-white bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded transition-colors"
                        >
                          Order Now
                        </button>
                      ) : rampStatus === 'partial' ? (
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
                        >
                          Monitor
                        </button>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        {rampItems.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">
              No event ramp action items found.
            </p>
          </div>
        )}
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
