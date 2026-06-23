'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props { core: PriceIntelCore }

const STORE_TYPES = ['Hypermarket', 'Supermarket', 'Convenience'] as const;

const ROI_BY_STORE: Record<string, Record<string, number>> = {
  cashback:  { Hypermarket: 3.8, Supermarket: 3.4, Convenience: 2.9 },
  bundle:    { Hypermarket: 3.1, Supermarket: 2.9, Convenience: 2.4 },
  multipack: { Hypermarket: 2.9, Supermarket: 2.7, Convenience: 2.1 },
  pct_off:   { Hypermarket: 2.5, Supermarket: 2.3, Convenience: 1.9 },
  bogo:      { Hypermarket: 2.1, Supermarket: 1.8, Convenience: 1.4 },
};

const STORE_COLORS: Record<string, string> = {
  Hypermarket: '#4F46E5',
  Supermarket: '#10B981',
  Convenience: '#F59E0B',
};

// TPO Pyramid layers
const TPO_LAYERS = [
  {
    id: 'planning',
    label: 'Layer 4 · Promo Planning',
    sublabel: 'Strategy, budgeting, calendar',
    color: '#E0E7FF',
    border: '#4F46E5',
    content: 'Active campaigns: 7 live · Budget utilization: 84% · Planned spend W6: ₹18.4L',
  },
  {
    id: 'optimization',
    label: 'Layer 3 · Promo Optimization',
    sublabel: 'Targeting, mechanics, depth',
    color: '#D1FAE5',
    border: '#10B981',
    content: 'Best mechanic: Cashback (3.8× ROI) · Recommended depth: 12–15% · Top segment: Elastic switchers',
  },
  {
    id: 'impact',
    label: 'Layer 2 · Promo ROI & Impact',
    sublabel: 'Realized ROI, incremental revenue, free-rider',
    color: '#FEF3C7',
    border: '#F59E0B',
    content: 'Blended ROI: 3.52× · Incremental Rev: ₹71.2L (14W) · Free-rider waste: ₹9.8L/week',
  },
  {
    id: 'attribution',
    label: 'Layer 1 · Sales Attribution',
    sublabel: 'Baseline vs incremental decomposition',
    color: '#FFE4E6',
    border: '#F43F5E',
    content: 'Baseline revenue: ₹4.2Cr/week · Incremental from promos: ₹42.8L · Cannibalization: -₹8.1L',
  },
] as const;

export default function MechanicsTab({ core }: Props) {
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);

  const groupedData = core.mechanic_roi.map((m) => {
    const mKey = m.mechanic.toLowerCase().replace(' ', '_').replace('%', 'pct');
    return {
      mechanic: m.mechanic,
      ...STORE_TYPES.reduce((acc, st) => {
        acc[st] = ROI_BY_STORE[mKey]?.[st] ?? m.roi;
        return acc;
      }, {} as Record<string, number>),
    };
  });

  return (
    <div className="px-8 py-6">
      {/* Mechanic ROI grouped bar chart */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Mechanic ROI by Store Type</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">5 mechanics × 3 store formats — average ROI multiple</p>
        <div style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupedData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
              <XAxis dataKey="mechanic" tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <YAxis tick={{ fontSize: 11, fill: '#111827' }} domain={[0, 4.5]} tickFormatter={(v: number) => `${v}×`} stroke="#D1D5DB" />
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                formatter={(v: unknown, name: unknown): [string, string] => [`${(v as number).toFixed(2)}×`, String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {STORE_TYPES.map((st) => (
                <Bar key={st} dataKey={st} fill={STORE_COLORS[st]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Syren TPO Pyramid */}
      <div className="card p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Syren TPO Pyramid</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Trade Promotion Optimization — 4 layers · Click to expand</p>
        </div>

        {/* Pyramid visualization — trapezoid layers, widest at bottom */}
        <div className="flex flex-col items-center gap-2 mb-6">
          {[...TPO_LAYERS].reverse().map((layer, idx) => {
            // idx=0 is Layer1 (widest/bottom), idx=3 is Layer4 (narrowest/top)
            const reversedIdx = TPO_LAYERS.length - 1 - idx;
            const widthPct = 40 + reversedIdx * 20; // 40%, 60%, 80%, 100%
            const isExpanded = expandedLayer === layer.id;
            return (
              <div key={layer.id} style={{ width: `${widthPct}%` }}>
                <button
                  onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
                  className="w-full rounded-lg border-2 px-4 py-3 text-center transition-all hover:opacity-90"
                  style={{ background: layer.color, borderColor: layer.border }}
                >
                  <p className="text-sm font-semibold" style={{ color: layer.border }}>{layer.label}</p>
                  <p className="text-xs mt-0.5 text-[var(--text-secondary)]">{layer.sublabel}</p>
                </button>
                {isExpanded && (
                  <div
                    className="mt-2 rounded-lg p-4 text-sm border"
                    style={{ background: `${layer.color}88`, borderColor: layer.border }}
                  >
                    <p className="text-[var(--text-primary)] leading-relaxed">{layer.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary stats row */}
        <div className="grid grid-cols-4 gap-3 border-t border-[var(--border-default)] pt-4">
          {[
            { label: 'Blended ROI', value: `${core.promo_roi_trend[core.promo_roi_trend.length - 1]?.roi.toFixed(2)}×`, color: 'text-indigo-600' },
            { label: 'Free-rider waste', value: formatLakhsCrores(core.kpis.margin_leakage_breakdown.promo_free_rider_inr), color: 'text-rose-600' },
            { label: 'Best mechanic', value: core.mechanic_roi.sort((a, b) => b.roi - a.roi)[0]?.mechanic ?? '—', color: 'text-emerald-600' },
            { label: 'Active campaigns', value: String(core.campaigns.filter((c) => c.status === 'live').length), color: 'text-[var(--text-primary)]' },
          ].map((kpi) => (
            <div key={kpi.label} className="text-center bg-[var(--bg-secondary)] rounded-lg p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className={`text-base font-semibold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
