'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props { core: PriceIntelCore }

type Zoom = '4W' | '8W' | '14W' | 'All';

export default function ROITrendTab({ core }: Props) {
  const [zoom, setZoom] = useState<Zoom>('14W');
  const [showGoal, setShowGoal] = useState(true);
  const [showSpend, setShowSpend] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

  const zoomCount: Record<Zoom, number> = { '4W': 4, '8W': 8, '14W': 14, 'All': 999 };
  const data = core.promo_roi_trend.slice(-zoomCount[zoom]);

  const totalIncremental = data.reduce((sum, d) => sum + d.incremental_revenue_inr, 0);
  const totalSpend = data.reduce((sum, d) => sum + d.spend_inr, 0);
  const counterfactualLoss = totalSpend; // Without promos: lose spend, keep some incremental

  return (
    <div className="px-8 py-6">
      {/* Controls */}
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          {(['4W', '8W', '14W', 'All'] as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                zoom === z ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showGoal} onChange={(e) => setShowGoal(e.target.checked)} className="rounded" />
            Goal line
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showSpend} onChange={(e) => setShowSpend(e.target.checked)} className="rounded" />
            Spend bars
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} className="rounded" />
            Campaign labels
          </label>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div style={{ height: 560 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
              <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <YAxis yAxisId="roi" orientation="left" tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" label={{ value: 'ROI ×', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              {showSpend && (
                <YAxis yAxisId="spend" orientation="right" tickFormatter={(v: number) => formatLakhsCrores(v)} tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              )}
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                formatter={(value: unknown, name: unknown): [string, string] => {
                  const v = value as number;
                  if (name === 'roi') return [`${v.toFixed(2)}×`, 'Blended ROI'];
                  if (name === 'spend_inr') return [formatLakhsCrores(v), 'Promo Spend'];
                  return [String(v), String(name)];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {showGoal && (
                <ReferenceLine yAxisId="roi" y={3} stroke="#10B981" strokeDasharray="6 3" label={{ value: 'Goal 3×', position: 'right', fontSize: 11, fill: '#10B981' }} />
              )}
              {showSpend && (
                <Bar yAxisId="spend" dataKey="spend_inr" fill="#E0E7FF" name="Promo Spend" />
              )}
              <Line yAxisId="roi" dataKey="roi" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 3, fill: '#4F46E5' }} name="roi" />
              {showLabels &&
                data.map((d, i) =>
                  d.active_campaign_name ? (
                    <ReferenceLine key={i} yAxisId="roi" x={d.week_label} stroke="#F59E0B" strokeDasharray="3 2" label={{ value: d.active_campaign_name.split(' ')[0], position: 'top', fontSize: 9, fill: '#F59E0B' }} />
                  ) : null,
                )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Counterfactual explanation */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Counterfactual: Without Promos</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Incremental Revenue Generated</p>
            <p className="text-lg font-semibold text-emerald-600">{formatLakhsCrores(totalIncremental)}</p>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Total Promo Spend</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{formatLakhsCrores(totalSpend)}</p>
          </div>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-center">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Net Incremental</p>
            <p className="text-lg font-semibold text-indigo-600">{formatLakhsCrores(totalIncremental - totalSpend)}</p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Without promo activity over this period, estimated revenue would have been{' '}
          <span className="font-semibold text-rose-600">{formatLakhsCrores(counterfactualLoss)} lower</span>.
          However, {((core.kpis.free_rider_ratio_pct / 100) * totalSpend / totalSpend * 100).toFixed(0)}% of spend went to free-riders.
          Targeting non-incremental buyers would recover approximately{' '}
          <span className="font-semibold text-emerald-600">{formatLakhsCrores(core.kpis.margin_leakage_breakdown.promo_free_rider_inr)}/week</span>.
        </p>
      </div>
    </div>
  );
}
