'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { DistributionBucket, FrequencyData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import FrequencyExpandModal from './FrequencyExpandModal';

const CHART_ID = 'frequency_distribution';

const FREQ_COLORS = ['#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#3730a3'];

interface Props {
  data: DistributionBucket[];
  summary: { avg_frequency: number; median_frequency: number };
  frequencyData: FrequencyData;
}

interface TipPayload { name: string; value: number; color: string }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-secondary)]">{p.name}:</span>
          <span className="font-medium">{p.name === 'Revenue %' ? `${(p.value as number).toFixed(1)}%` : (p.value as number).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function FrequencyDistribution({ data, summary, frequencyData }: Props) {
  const { expandedChart, setExpandedChart } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Use rich distribution when available, else fall back to legacy
  const chartData = frequencyData?.distribution?.length
    ? frequencyData.distribution.map((d, i) => ({ range: d.range, customers: d.customer_count, revenue_pct: d.pct_revenue, colorIdx: i }))
    : data.map((d, i) => ({ range: d.range, customers: d.count, revenue_pct: 0, colorIdx: i }));

  if (!isMounted) return null;

  return (
    <>
      <div className="card h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Purchase Frequency Distribution
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Transaction count per customer (last 12 months)
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpandedChart(CHART_ID)} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand full analysis">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0" style={{ minHeight: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#6366f1' }}
                tickFormatter={v => `${v}%`}
                tickLine={false}
                axisLine={false}
                width={28}
                domain={[0, 30]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              <Bar yAxisId="left" dataKey="customers" name="Customers" radius={[3, 3, 0, 0]} opacity={0.9}>
                {chartData.map((d, i) => (
                  <rect key={i} fill={FREQ_COLORS[Math.min(d.colorIdx, FREQ_COLORS.length - 1)]} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="revenue_pct" name="Revenue %" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex gap-4 text-xs text-[var(--text-secondary)]">
          <span>Avg <span className="font-semibold text-[var(--text-primary)]">{(frequencyData?.summary?.avg_frequency ?? summary.avg_frequency).toFixed(1)}x</span></span>
          <span>Median <span className="font-semibold text-[var(--text-primary)]">{frequencyData?.summary?.median_frequency ?? summary.median_frequency}x</span></span>
          <span>Repeat rate <span className="font-semibold text-[var(--text-primary)]">{frequencyData?.summary?.repeat_rate_90d ?? 0}%</span></span>
        </div>
      </div>

      {expandedChart === CHART_ID && (
        <FrequencyExpandModal data={frequencyData} onClose={() => setExpandedChart(null)} />
      )}
    </>
  );
}
