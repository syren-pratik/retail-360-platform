'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
}

export default function FreeRiderTab({ core, onSKUSelect }: Props) {
  // Free-rider ratio trend — derived from campaigns (last 12, ordered by end_date)
  const campaignTrend = [...core.campaigns]
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
    .slice(-12)
    .map((c) => ({ name: c.campaign_name.split(' ')[0], free_rider: c.free_rider_ratio_pct, roi: c.roi }));

  const segmentData = core.lift_by_segment.map((s) => ({
    segment: s.segment.split(' ')[0],
    free_rider: s.free_rider_ratio_pct,
    lift: s.lift_pct,
  }));

  // Top 10 SKUs by free-rider waste estimate
  const frSKUs = core.skus
    .filter((s) => s.promo_frequency_pct > 0.3)
    .sort((a, b) => b.promo_frequency_pct * Math.abs(b.revenue_impact_inr) - a.promo_frequency_pct * Math.abs(a.revenue_impact_inr))
    .slice(0, 10);

  return (
    <div className="px-8 py-6">
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Free-rider ratio trend */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Free-rider Ratio by Campaign</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Last 12 campaigns — % of promo buyers who would have bought anyway</p>
          <div style={{ height: 480 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={campaignTrend} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#111827' }} angle={-30} textAnchor="end" stroke="#D1D5DB" />
                <YAxis tick={{ fontSize: 11, fill: '#111827' }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#D1D5DB" />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                  formatter={(v: unknown) => [`${v}%`, 'Free-rider ratio']}
                />
                <ReferenceLine y={40} stroke="#F59E0B" strokeDasharray="4 2" label={{ value: 'Threshold 40%', position: 'right', fontSize: 10, fill: '#F59E0B' }} />
                <Line dataKey="free_rider" stroke="#F43F5E" strokeWidth={2} dot={{ r: 4, fill: '#F43F5E' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Free-rider breakdown by segment */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Free-rider Breakdown by Segment</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Who are the free-riders across buyer segments?</p>
          <div style={{ height: 480 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentData} layout="vertical" margin={{ top: 8, right: 80, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#111827' }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#D1D5DB" />
                <YAxis dataKey="segment" type="category" tick={{ fontSize: 11, fill: '#111827' }} width={80} stroke="#D1D5DB" />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                  formatter={(v: unknown, name: unknown): [string, string] => [`${(v as number).toFixed(1)}%`, name === 'free_rider' ? 'Free-rider' : 'Lift']}
                />
                <Bar dataKey="free_rider" name="Free-rider %" radius={[0, 4, 4, 0]}>
                  {segmentData.map((entry, i) => (
                    <Cell key={i} fill={entry.free_rider > 50 ? '#F43F5E' : entry.free_rider > 30 ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SKU-level free-rider table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top SKUs by Free-rider Waste</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Click row to open SKU detail drawer</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
              {['SKU', 'Category', 'Free-rider %', 'Est. Waste ₹', 'Recommendation'].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frSKUs.map((sku) => (
              <tr
                key={sku.sku_id}
                className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)] cursor-pointer"
                onClick={() => onSKUSelect(sku.sku_id)}
              >
                <td className="px-6 py-3">
                  <p className="font-medium text-[var(--text-primary)]">{sku.product_name}</p>
                  <p className="text-[10px] font-mono text-[var(--text-tertiary)]">{sku.sku_id}</p>
                </td>
                <td className="px-6 py-3 text-[var(--text-secondary)]">{sku.category}</td>
                <td className="px-6 py-3 text-rose-600 font-semibold">{(sku.promo_frequency_pct * 100).toFixed(0)}%</td>
                <td className="px-6 py-3 font-semibold text-rose-600">
                  {formatLakhsCrores(Math.abs(sku.revenue_impact_inr) * sku.promo_frequency_pct * 0.5)}
                </td>
                <td className="px-6 py-3 text-xs text-[var(--text-secondary)]">
                  Gate to lapsed + new-to-brand segments only
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
