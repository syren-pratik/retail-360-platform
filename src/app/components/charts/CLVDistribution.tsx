'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { CLVTierData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface CLVDistributionProps {
  data: CLVTierData[];
}

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#F43F5E'];
const CHART_ID = 'clv_distribution';

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

const formatCurrency = (num: number) => {
  return `₹${formatNumber(num)}`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CLVTierData }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.clv_tier}</p>
        <p className="text-sm">{formatNumber(data.customer_count)} customers</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Avg CLV: {formatCurrency(data.avg_clv)}
        </p>
      </div>
    );
  }
  return null;
};

export default function CLVDistribution({ data }: CLVDistributionProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();

  // Find if this chart has an active drilldown
  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedTier = activeDrilldown?.value;

  const handleBarClick = (entry: CLVTierData) => {
    addDrilldown({
      source: CHART_ID,
      field: 'clv_tier',
      value: entry.clv_tier,
      label: `CLV Tier: ${entry.clv_tier}`,
    });
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          dataKey="clv_tier"
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-default)' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickFormatter={formatNumber}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="customer_count"
          radius={[4, 4, 0, 0]}
          onClick={(_, index) => handleBarClick(data[index])}
          cursor="pointer"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              opacity={selectedTier && selectedTier !== entry.clv_tier ? 0.3 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <CLVDistributionCard
          data={data}
          selectedTier={selectedTier}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="CLV Distribution by Tier"
          subtitle="Customer count and average CLV per tier"
          rawData={data}
          columns={[
            { key: 'clv_tier', label: 'CLV Tier' },
            { key: 'customer_count', label: 'Customers', format: (v) => formatNumber(v as number) },
            { key: 'avg_clv', label: 'Avg CLV', format: (v) => formatCurrency(v as number) },
            { key: 'total_clv', label: 'Total CLV', format: (v) => formatCurrency(v as number) },
            { key: 'avg_frequency', label: 'Avg Frequency', format: (v) => (v as number).toFixed(1) },
            { key: 'avg_recency', label: 'Avg Recency (days)', format: (v) => Math.round(v as number).toString() },
          ]}
        >
          <ChartWrapper height={400}>
            {renderChart()}
          </ChartWrapper>
        </ChartExpandModal>
      </>
    );
  }

  return (
    <CLVDistributionCard
      data={data}
      selectedTier={selectedTier}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component for reuse
interface CLVDistributionCardProps {
  data: CLVTierData[];
  selectedTier?: string;
  onBarClick: (entry: CLVTierData) => void;
  onExpand: () => void;
}

function CLVDistributionCard({ data, selectedTier, onBarClick, onExpand }: CLVDistributionCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            CLV Distribution by Tier
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Customer count and average CLV per tier
          </p>
        </div>
        <button
          onClick={onExpand}
          className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Expand chart"
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div className="h-[280px]">
        <ChartWrapper height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="clv_tier"
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                tickFormatter={formatNumber}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="customer_count"
                radius={[4, 4, 0, 0]}
                onClick={(_, index) => onBarClick(data[index])}
                cursor="pointer"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedTier && selectedTier !== entry.clv_tier ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
      {/* Legend with CLV values */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {data.map((tier, index) => (
          <button
            key={tier.clv_tier}
            onClick={() => onBarClick(tier)}
            className={`text-center p-2 rounded-md transition-all cursor-pointer hover:bg-[var(--bg-secondary)] ${
              selectedTier === tier.clv_tier ? 'bg-[var(--accent-primary-light)]' : ''
            }`}
          >
            <div
              className="w-3 h-3 rounded-sm mx-auto mb-1"
              style={{
                backgroundColor: COLORS[index],
                opacity: selectedTier && selectedTier !== tier.clv_tier ? 0.3 : 1,
              }}
            />
            <p className="text-xs text-[var(--text-secondary)]">{tier.clv_tier}</p>
            <p className="text-xs font-medium text-[var(--text-primary)]">
              {formatCurrency(tier.avg_clv)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
