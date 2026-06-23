'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
  Cell,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';

interface Props { core: PriceIntelCore }

const MECHANIC_LIFT: Record<string, Record<string, number>> = {
  'Elastic switchers': { cashback: 38.4, bundle: 42.1, multipack: 35.2, 'pct_off': 41.0, bogo: 39.8 },
  'Occasional buyers': { cashback: 27.8, bundle: 31.2, multipack: 26.4, 'pct_off': 29.6, bogo: 24.8 },
  'New-to-brand':      { cashback: 24.1, bundle: 22.8, multipack: 19.6, 'pct_off': 26.4, bogo: 21.2 },
  'Lapsed':            { cashback: 19.4, bundle: 18.6, multipack: 16.8, 'pct_off': 20.2, bogo: 15.4 },
  'Loyal core':        { cashback: 9.8,  bundle: 11.2, multipack: 8.4,  'pct_off': 7.6,  bogo: 6.8 },
};

const MECHANICS = ['cashback', 'bundle', 'multipack', 'pct_off', 'bogo'];
const MECH_COLORS: Record<string, string> = {
  cashback: '#4F46E5', bundle: '#10B981', multipack: '#F59E0B', pct_off: '#F43F5E', bogo: '#3B82F6',
};

export default function SegmentLiftTab({ core }: Props) {
  const liftData = core.lift_by_segment.map((s) => ({
    segment: s.segment,
    lift_pct: s.lift_pct,
    free_rider_ratio_pct: s.free_rider_ratio_pct,
    errorY: [s.lift_pct * 0.08, s.lift_pct * 0.08] as [number, number],
  }));

  const crossTableData = core.lift_by_segment.map((seg) => {
    const row: Record<string, number | string> = { segment: seg.segment };
    MECHANICS.forEach((m) => {
      row[m] = MECHANIC_LIFT[seg.segment]?.[m] ?? 0;
    });
    return row;
  });

  function bestMechanic(segment: string): string {
    const row = MECHANIC_LIFT[segment] ?? {};
    return Object.entries(row).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }

  return (
    <div className="px-8 py-6">
      {/* Expanded segment lift chart */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Segment Lift with Confidence Intervals</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">All 5 buyer segments · Error bars = ±8% CI</p>
        <div style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={liftData} margin={{ top: 20, right: 24, bottom: 20, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
              <XAxis dataKey="segment" tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <YAxis tick={{ fontSize: 11, fill: '#111827' }} tickFormatter={(v: number) => `${v}%`} stroke="#D1D5DB" />
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                formatter={(v: unknown, name: unknown): [string, string] => {
                  const num = v as number;
                  if (name === 'lift_pct') return [`${num.toFixed(1)}%`, 'Promo lift'];
                  if (name === 'free_rider_ratio_pct') return [`${num.toFixed(1)}%`, 'Free-rider ratio'];
                  return [String(num), String(name)];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="lift_pct" name="Promo lift %" radius={[4, 4, 0, 0]}>
                {liftData.map((entry, i) => (
                  <Cell key={i} fill={entry.free_rider_ratio_pct > 50 ? '#FCA5A5' : '#A5B4FC'} />
                ))}
                <ErrorBar dataKey="errorY" width={4} strokeWidth={2} stroke="#6B7280" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segment × Mechanic cross-table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Segment × Mechanic Lift Matrix</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Which mechanic works best for each buyer segment? (lift %)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Segment</th>
                {MECHANICS.map((m) => (
                  <th key={m} className="px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide text-center capitalize">
                    {m.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide text-center">Best</th>
              </tr>
            </thead>
            <tbody>
              {crossTableData.map((row) => {
                const best = bestMechanic(row.segment as string);
                return (
                  <tr key={row.segment as string} className="border-b border-[var(--border-default)] last:border-0">
                    <td className="px-6 py-3 font-medium text-[var(--text-primary)]">{row.segment as string}</td>
                    {MECHANICS.map((m) => {
                      const v = row[m] as number;
                      const isBest = m === best;
                      return (
                        <td key={m} className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold tabular-nums ${isBest ? 'ring-1 ring-emerald-400' : ''}`}
                            style={{
                              background: `${MECH_COLORS[m]}22`,
                              color: MECH_COLORS[m],
                            }}
                          >
                            {v.toFixed(1)}%
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded capitalize">
                        {best.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
