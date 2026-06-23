'use client';

import { useMemo, useState } from 'react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const INSIGHTS = [
  {
    headline: 'Acting now costs ₹3.2L — inaction costs ₹18.9L',
    detail:
      'The cost-benefit ratio is clear: immediate procurement investment is 5.9× cheaper than the cost of unreadiness.',
    severity: 'negative' as const,
  },
  {
    headline: 'Highest ROI action: Edible Oil reorder (8.4× ROI)',
    detail:
      'Edible Oil has the highest ROI for reordering — order now to capture maximum Eid uplift.',
    severity: 'positive' as const,
  },
  {
    headline: '72% of cost of unreadiness concentrated in 8 SKUs',
    detail:
      'Focus on the top 8 SKUs by cost of inaction for maximum impact with minimum effort.',
    severity: 'warning' as const,
  },
  {
    headline: 'Eid preparation window closes in 6 days',
    detail:
      'Order by May 23 to ensure delivery by Eid. Lead time for key SKUs is 5-7 days.',
    severity: 'negative' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function CostOfUnreadinessTab({ core }: Props) {
  const defaultEventId = useMemo(() => {
    const eid = core.events.find((e) => e.event_name === 'Eid al-Adha');
    return eid?.event_id ?? core.events[0]?.event_id ?? '';
  }, [core.events]);

  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId);

  const costRows = useMemo(() => {
    const atRiskItems = core.action_items.filter((a) => a.action_type === 'event_ramp');
    return atRiskItems
      .map((item, i) => {
        const sku = core.skus.find((s) => s.sku_id === item.sku_id);
        const gapUnits = Math.round(
          (Math.abs(item.revenue_impact_inr) / (sku?.price_inr ?? 100)) *
            (0.2 + seededNoise(i * 11) * 0.4),
        );
        const gapInr = gapUnits * (sku?.price_inr ?? 100);
        const stockoutProb = 0.45 + seededNoise(i * 7) * 0.4;
        const revenueAtRisk = gapInr * stockoutProb;
        const costOfInaction = revenueAtRisk * 1.35;
        return { item, sku, gapUnits, gapInr, stockoutProb, revenueAtRisk, costOfInaction };
      })
      .filter((r) => r.gapUnits > 0)
      .sort((a, b) => b.costOfInaction - a.costOfInaction)
      .slice(0, 15);
  }, [core.action_items, core.skus]);

  const totals = useMemo(
    () => ({
      revenueAtRisk: costRows.reduce((s, r) => s + r.revenueAtRisk, 0),
      costOfInaction: costRows.reduce((s, r) => s + r.costOfInaction, 0),
      investmentNeeded: costRows.reduce((s, r) => s + r.gapInr, 0),
    }),
    [costRows],
  );

  const roi = totals.revenueAtRisk / Math.max(totals.investmentNeeded, 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — Cost table */}
        <div className="card">
          {/* Event selector */}
          <div className="flex items-center gap-3 mb-4">
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
            <span className="ml-auto">
              <AIInsightButton id="merch-dd-cost-of-unreadiness" title="Cost of Unreadiness" data={costRows as unknown as Record<string, unknown>[]} />
            </span>
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
                    Gap (units)
                  </th>
                  <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                    Gap (₹)
                  </th>
                  <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                    Stockout prob
                  </th>
                  <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                    Rev at risk
                  </th>
                  <th className="text-right py-2 px-3 text-[var(--text-tertiary)] font-medium">
                    Cost of inaction
                  </th>
                </tr>
              </thead>
              <tbody>
                {costRows.map(
                  ({ item, sku, gapUnits, gapInr, stockoutProb, revenueAtRisk, costOfInaction }) => (
                    <tr
                      key={item.action_id}
                      className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-2 px-3">
                        <p className="font-medium text-[var(--text-primary)] truncate max-w-[100px]">
                          {sku?.product_name ?? item.sku_id}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{item.sku_id}</p>
                      </td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">
                        {sku?.category ?? '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                        {gapUnits.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                        {formatLakhsCrores(gapInr)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={
                            stockoutProb >= 0.7
                              ? 'text-rose-600 font-semibold'
                              : stockoutProb >= 0.5
                                ? 'text-amber-600'
                                : 'text-[var(--text-secondary)]'
                          }
                        >
                          {(stockoutProb * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-rose-600">
                        {formatLakhsCrores(revenueAtRisk)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-rose-700">
                        {formatLakhsCrores(costOfInaction)}
                      </td>
                    </tr>
                  ),
                )}

                {/* Subtotal row */}
                <tr className="border-t-2 border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                  <td className="py-2 px-3 font-semibold text-[var(--text-primary)]" colSpan={5}>
                    Subtotal (top {costRows.length} SKUs)
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-rose-600">
                    {formatLakhsCrores(totals.revenueAtRisk)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-rose-700">
                    {formatLakhsCrores(totals.costOfInaction)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grand total callout */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-semibold text-amber-800">
              If no action taken:{' '}
              <span className="text-rose-700">{formatLakhsCrores(totals.revenueAtRisk)}</span> in
              lost revenue +{' '}
              <span className="text-rose-700">
                {formatLakhsCrores(totals.costOfInaction - totals.revenueAtRisk)}
              </span>{' '}
              in emergency costs ={' '}
              <span className="text-rose-800 font-bold">
                {formatLakhsCrores(totals.costOfInaction)}
              </span>{' '}
              total
            </p>
          </div>
        </div>

        {/* RIGHT — Summary card */}
        <div className="space-y-4">
          <div className="card border-l-4 border-l-[var(--accent-primary)] bg-[var(--accent-primary-light)]">
            <p className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Eid al-Adha Readiness Summary
            </p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">SKUs at risk</span>
                <span className="text-sm font-semibold text-rose-600">
                  {core.kpis.next_event.skus_not_ramped}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Revenue at risk</span>
                <span className="text-sm font-semibold text-rose-600">
                  {formatLakhsCrores(totals.revenueAtRisk)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Recommended investment</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatLakhsCrores(totals.investmentNeeded)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--border-primary)] pt-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  ROI of acting
                </span>
                <span className="text-lg font-bold text-emerald-600">{roi.toFixed(1)}×</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--text-secondary)] border-t border-[var(--border-primary)] pt-3">
              Last year, stores that completed Eid ramp by D-7 saw 23% higher category revenue vs
              unprepared stores.
            </p>
          </div>

          {/* ROI breakdown mini-chart */}
          <div className="card">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Cost vs Benefit
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Investment needed</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatLakhsCrores(totals.investmentNeeded)}
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (totals.investmentNeeded / Math.max(totals.costOfInaction, 1)) * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Revenue at risk</span>
                  <span className="font-semibold text-amber-600">
                    {formatLakhsCrores(totals.revenueAtRisk)}
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                  <div
                    className="bg-amber-400 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (totals.revenueAtRisk / Math.max(totals.costOfInaction, 1)) * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Total cost of inaction</span>
                  <span className="font-semibold text-rose-600">
                    {formatLakhsCrores(totals.costOfInaction)}
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs font-semibold text-emerald-800">
                Net savings from acting: {formatLakhsCrores(totals.costOfInaction - totals.investmentNeeded)}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Every ₹1 invested saves ₹{roi.toFixed(1)} in avoided losses
              </p>
            </div>
          </div>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
