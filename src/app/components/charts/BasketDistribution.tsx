'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { BasketDistribution as BasketDistributionType, BasketData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import BasketExpandModal from './BasketExpandModal';
import { useTenant } from '@/app/context/TenantContext';

const CHART_ID = 'basket_distribution';

/** Apparel uses $ for bucket labels — strip ₹ from cached strings. */
function localizeRange(s: string, isApparel: boolean): string {
  if (!isApparel) return s;
  return s.replace(/₹/g, '$');
}

interface Props {
  data: BasketDistributionType[];
  basketData: BasketData;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-secondary)]">{p.name}:</span>
          <span className="font-medium text-[var(--text-primary)]">
            {p.name === 'Revenue %' ? `${p.value.toFixed(1)}%` : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BasketDistribution({ data: legacyData, basketData }: Props) {
  const { expandedChart, setExpandedChart } = useDashboard();
  const { isApparel } = useTenant();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Use rich distribution if available, fall back to legacy
  const dist = basketData?.distribution?.length
    ? basketData.distribution.map(d => ({ range: localizeRange(d.range, isApparel), customers: d.customer_count, revenue_pct: d.pct_revenue }))
    : legacyData.map(d => ({ range: localizeRange(d.basket_range, isApparel), customers: d.customer_count, revenue_pct: 0 }));

  if (!isMounted) return null;

  return (
    <>
      <div className="card h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Basket Value Distribution
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Per-transaction basket value (last 12 months)
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpandedChart(CHART_ID)} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand full analysis">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0" style={{ minHeight: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dist} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={40}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#6366f1' }}
                tickFormatter={v => `${v}%`}
                tickLine={false}
                axisLine={false}
                width={32}
                domain={[0, 30]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              <Bar
                yAxisId="left"
                dataKey="customers"
                name="Customers"
                fill="var(--chart-blue)"
                radius={[3, 3, 0, 0]}
                opacity={0.85}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue_pct"
                name="Revenue %"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {expandedChart === CHART_ID && (
        <BasketExpandModal
          data={basketData}
          onClose={() => setExpandedChart(null)}
        />
      )}
    </>
  );
}
