'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { RevenueBySegment as RevenueBySegmentType, RevenueDetailData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import RevenueExpandModal from './RevenueExpandModal';

interface RevenueBySegmentProps {
  data: RevenueBySegmentType[];
  revenueDetail: RevenueDetailData;
}

const CHART_ID = 'revenue_by_segment';

// Color by risk_status from detail data — fallback by segment name
const RISK_COLORS: Record<string, string> = {
  healthy: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  neutral: '#6366F1',
};

const SEGMENT_FALLBACK_COLORS: Record<string, string> = {
  'Low Risk': '#10B981',
  'High-Value VIP': '#6366F1',
  'Medium Risk': '#F59E0B',
  'High Risk': '#EF4444',
  'Low-Value': '#F97316',
  'Churned': '#94A3B8',
  'New Customers': '#3B82F6',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RevenueBySegmentType }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{d.segment}</p>
        <p className="text-sm">₹{(d.revenue / 10_000_000).toFixed(1)} Cr</p>
        <p className="text-sm text-[var(--text-secondary)]">{d.revenue_pct.toFixed(1)}% of total</p>
        <p className="text-sm text-[var(--text-secondary)]">{d.customers.toLocaleString('en-IN')} customers</p>
        <p className="text-xs text-[var(--accent-primary)] mt-1">Click to filter</p>
      </div>
    );
  }
  return null;
};

export default function RevenueBySegment({ data, revenueDetail }: RevenueBySegmentProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedSegment = activeDrilldown?.value;

  // Build risk status lookup from detail data
  const riskMap: Record<string, string> = {};
  revenueDetail.segments?.forEach((s) => { riskMap[s.segment] = s.risk_status; });

  const getColor = (segment: string) => {
    const status = riskMap[segment];
    if (status) return RISK_COLORS[status] ?? '#6366F1';
    return SEGMENT_FALLBACK_COLORS[segment] ?? '#6366F1';
  };

  const handleBarClick = (entry: RevenueBySegmentType) => {
    addDrilldown({ source: CHART_ID, field: 'customer_segment', value: entry.segment, label: `Segment: ${entry.segment}` });
  };

  if (expandedChart === CHART_ID) {
    return (
      <>
        <RevenueBySegmentCard
          data={data}
          selectedSegment={selectedSegment}
          isMounted={isMounted}
          onBarClick={handleBarClick}
          onExpand={() => setExpandedChart(CHART_ID)}
          getColor={getColor}
        />
        <RevenueExpandModal data={revenueDetail} onClose={() => setExpandedChart(null)} />
      </>
    );
  }

  return (
    <RevenueBySegmentCard
      data={data}
      selectedSegment={selectedSegment}
      isMounted={isMounted}
      onBarClick={handleBarClick}
      onExpand={() => setExpandedChart(CHART_ID)}
      getColor={getColor}
    />
  );
}

interface RevenueBySegmentCardProps {
  data: RevenueBySegmentType[];
  selectedSegment?: string;
  isMounted: boolean;
  onBarClick: (entry: RevenueBySegmentType) => void;
  onExpand: () => void;
  getColor: (segment: string) => string;
}

function RevenueBySegmentCard({ data, selectedSegment, isMounted, onBarClick, onExpand, getColor }: RevenueBySegmentCardProps) {
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  // Pareto insight: find how many segments cover 80% of revenue
  let cumPct = 0;
  let paretoCount = 0;
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  for (const seg of sorted) {
    cumPct += seg.revenue_pct;
    paretoCount++;
    if (cumPct >= 80) break;
  }
  const paretoInsight = `Top ${paretoCount} segment${paretoCount > 1 ? 's' : ''} (${sorted.slice(0, paretoCount).map(s => s.segment).join(', ')}) = ${cumPct.toFixed(0)}% of ₹${(totalRevenue / 10_000_000).toFixed(0)}Cr revenue`;

  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Revenue by Segment</h3>
          <p className="text-sm text-[var(--text-secondary)]">Revenue contribution · colour = health status</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand chart">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="h-[200px]">
        <ChartWrapper height={200}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }} tickFormatter={(v) => `₹${(v / 10_000_000).toFixed(0)}Cr`} />
                <YAxis type="category" dataKey="segment" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} onClick={(_, index) => onBarClick(data[index])} cursor="pointer"
                  label={{ position: 'right', fontSize: 10, fill: 'var(--text-secondary)',
                    formatter: (v: unknown) => `₹${((v as number) / 10_000_000).toFixed(0)}Cr` }}>
                  {data.map((entry) => (
                    <Cell key={entry.segment} fill={getColor(entry.segment)}
                      opacity={selectedSegment && selectedSegment !== entry.segment ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
          )}
        </ChartWrapper>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <p className="text-xs text-[var(--text-tertiary)] italic">{paretoInsight}</p>
      </div>
    </div>
  );
}
