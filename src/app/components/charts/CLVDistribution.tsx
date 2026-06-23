'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { CLVTierData, CLVDetailData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import { AIInsightButton } from './ChartCard';
import CLVExpandModal from './CLVExpandModal';

interface CLVDistributionProps {
  data: CLVTierData[];
  clvDetail: CLVDetailData;
}

const TIER_COLORS: Record<string, string> = {
  Platinum: '#6366F1',
  Gold: '#F59E0B',
  Silver: '#64748B',
  Bronze: '#92400E',
  'At-Risk': '#F43F5E',
};

const CHART_ID = 'clv_distribution';

function fmtInr(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CLVTierData }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{d.clv_tier}</p>
        <p className="text-sm">{fmtCount(d.customer_count)} customers</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Avg CLV: {fmtInr(d.avg_clv)}</p>
      </div>
    );
  }
  return null;
};

export default function CLVDistribution({ data, clvDetail }: CLVDistributionProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedTier = activeDrilldown?.value;

  const handleBarClick = (entry: CLVTierData) => {
    addDrilldown({ source: CHART_ID, field: 'clv_tier', value: entry.clv_tier, label: `CLV Tier: ${entry.clv_tier}` });
  };

  // Pareto insight from detail data
  const p = clvDetail.pareto?.find((x) => x.top_pct === 15);
  const paretoInsight = p
    ? `Top 15% (Platinum) = ${p.clv_share}% of total CLV`
    : clvDetail.summary?.total_clv
      ? `Total portfolio CLV: ${fmtInr(clvDetail.summary.total_clv)}`
      : '';

  if (expandedChart === CHART_ID) {
    return (
      <>
        <CLVDistributionCard data={data} selectedTier={selectedTier} onBarClick={handleBarClick}
          onExpand={() => setExpandedChart(CHART_ID)} paretoInsight={paretoInsight} />
        <CLVExpandModal data={clvDetail} onClose={() => setExpandedChart(null)} />
      </>
    );
  }

  return (
    <CLVDistributionCard data={data} selectedTier={selectedTier} onBarClick={handleBarClick}
      onExpand={() => setExpandedChart(CHART_ID)} paretoInsight={paretoInsight} />
  );
}

interface CLVDistributionCardProps {
  data: CLVTierData[];
  selectedTier?: string;
  onBarClick: (entry: CLVTierData) => void;
  onExpand: () => void;
  paretoInsight: string;
}

function CLVDistributionCard({ data, selectedTier, onBarClick, onExpand, paretoInsight }: CLVDistributionCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">CLV Distribution by Tier</h3>
          <p className="text-sm text-[var(--text-secondary)]">12-month predicted customer lifetime value</p>
        </div>
        <div className="flex items-center gap-1">
          <AIInsightButton id={CHART_ID} title="CLV Distribution by Tier" data={data as unknown as Record<string, unknown>[]} />
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand chart">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="h-[220px]">
        <ChartWrapper height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="clv_tier" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={fmtCount}
                tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="customer_count" radius={[4, 4, 0, 0]} onClick={(_, index) => onBarClick(data[index])} cursor="pointer">
                {data.map((entry) => (
                  <Cell key={entry.clv_tier} fill={TIER_COLORS[entry.clv_tier] ?? '#6366F1'}
                    opacity={selectedTier && selectedTier !== entry.clv_tier ? 0.3 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Tier legend with avg CLV */}
      <div className="mt-3 grid grid-cols-4 gap-1">
        {data.map((tier) => (
          <button key={tier.clv_tier} onClick={() => onBarClick(tier)}
            className={`text-center p-2 rounded-md transition-all cursor-pointer hover:bg-[var(--bg-secondary)] ${
              selectedTier === tier.clv_tier ? 'bg-[var(--accent-primary-light)]' : ''
            }`}>
            <div className="w-3 h-3 rounded-sm mx-auto mb-1"
              style={{ backgroundColor: TIER_COLORS[tier.clv_tier] ?? '#6366F1',
                opacity: selectedTier && selectedTier !== tier.clv_tier ? 0.3 : 1 }} />
            <p className="text-xs text-[var(--text-secondary)]">{tier.clv_tier}</p>
            <p className="text-xs font-medium text-[var(--text-primary)]">{fmtInr(tier.avg_clv)}</p>
          </button>
        ))}
      </div>

      {paretoInsight && (
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-tertiary)] italic">{paretoInsight}</p>
        </div>
      )}
    </div>
  );
}
