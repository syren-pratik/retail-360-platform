'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { ChurnRiskData, ChurnDetailData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChurnExpandModal from './ChurnExpandModal';

interface ChurnRiskDonutProps {
  data: ChurnRiskData[];
  churnDetail: ChurnDetailData;
}

const COLORS: Record<string, string> = {
  'Critical': '#EF4444',
  'High Risk': '#EF4444',
  'High': '#F97316',
  'Medium Risk': '#F59E0B',
  'Medium': '#F59E0B',
  'Low Risk': '#10B981',
  'Low': '#10B981',
};

const CHART_ID = 'churn_risk';

const formatNumber = (num: number) => {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

function fmtInr(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(0)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChurnRiskData }>;
  totalCustomers: number;
}

const CustomTooltip = ({ active, payload, totalCustomers }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    const pct = ((entry.customer_count / totalCustomers) * 100).toFixed(1);
    const avgProb = (entry.avg_prob_90d * 100).toFixed(1);
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{entry.churn_risk_tier}</p>
        <p className="text-sm">
          {formatNumber(entry.customer_count)} customers ({pct}%)
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Avg 90d prob: {avgProb}%
        </p>
      </div>
    );
  }
  return null;
};

export default function ChurnRiskDonut({ data, churnDetail }: ChurnRiskDonutProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();
  const totalCustomers = data.reduce((sum, d) => sum + d.customer_count, 0);

  // Find if this chart has an active drilldown
  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedTier = activeDrilldown?.value;

  const handleSegmentClick = (entry: ChurnRiskData) => {
    addDrilldown({
      source: CHART_ID,
      field: 'churn_risk_tier',
      value: entry.churn_risk_tier,
      label: `Churn Risk: ${entry.churn_risk_tier}`,
    });
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <ChurnRiskDonutCard
          data={data}
          totalCustomers={totalCustomers}
          revenueAtRisk={churnDetail.summary.revenue_at_risk_90d}
          selectedTier={selectedTier}
          onSegmentClick={handleSegmentClick}
          onExpand={handleExpand}
        />
        <ChurnExpandModal data={churnDetail} onClose={() => setExpandedChart(null)} />
      </>
    );
  }

  return (
    <ChurnRiskDonutCard
      data={data}
      totalCustomers={totalCustomers}
      revenueAtRisk={churnDetail.summary.revenue_at_risk_90d}
      selectedTier={selectedTier}
      onSegmentClick={handleSegmentClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface ChurnRiskDonutCardProps {
  data: ChurnRiskData[];
  totalCustomers: number;
  revenueAtRisk: number;
  selectedTier?: string;
  onSegmentClick: (entry: ChurnRiskData) => void;
  onExpand: () => void;
}

function ChurnRiskDonutCard({
  data,
  totalCustomers,
  revenueAtRisk,
  selectedTier,
  onSegmentClick,
  onExpand,
}: ChurnRiskDonutCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Churn Risk Distribution
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">Customer risk segmentation (90-day probability)</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand chart">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
      <div className="h-[280px] relative">
        <ChartWrapper height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="customer_count"
                nameKey="churn_risk_tier"
                onClick={(_, index) => onSegmentClick(data[index])}
                cursor="pointer"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.churn_risk_tier}
                    fill={COLORS[entry.churn_risk_tier]}
                    opacity={selectedTier && selectedTier !== entry.churn_risk_tier ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip totalCustomers={totalCustomers} />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center -mt-8">
            <p className="text-xl font-bold text-red-600">
              {fmtInr(revenueAtRisk)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">at risk</p>
          </div>
        </div>
      </div>
    </div>
  );
}
