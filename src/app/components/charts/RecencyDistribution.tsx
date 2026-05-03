'use client';

import { useState, useEffect } from 'react';
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
import { DistributionBucket } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface RecencyDistributionProps {
  data: DistributionBucket[];
  summary: {
    avg_recency_days: number;
    median_recency_days: number;
    active_30_days: number;
    active_30_days_pct: number;
  };
}

const CHART_ID = 'recency_distribution';

// Color gradient from green (recent) to red (old)
const getRecencyColor = (index: number, total: number): string => {
  const colors = ['#10B981', '#34D399', '#6EE7B7', '#FCD34D', '#F59E0B', '#EF4444', '#DC2626'];
  const colorIndex = Math.min(Math.floor((index / total) * colors.length), colors.length - 1);
  return colors[colorIndex];
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DistributionBucket }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.range}</p>
        <p className="text-sm">
          Customers: <span className="font-medium">{data.count.toLocaleString('en-IN')}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {data.pct.toFixed(1)}% of total
        </p>
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to filter by recency</p>
      </div>
    );
  }
  return null;
};

export default function RecencyDistribution({ data, summary }: RecencyDistributionProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedRange = activeDrilldown?.value;

  const handleBarClick = (entry: DistributionBucket) => {
    addDrilldown({
      source: CHART_ID,
      field: 'recency_range',
      value: entry.range,
      label: `Recency: ${entry.range}`,
    });
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  const renderChart = (height: number) => (
    <ChartWrapper height={height}>
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              onClick={(_, index) => handleBarClick(data[index])}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.range}
                  fill={getRecencyColor(index, data.length)}
                  opacity={selectedRange && selectedRange !== entry.range ? 0.3 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
      )}
    </ChartWrapper>
  );

  // Table data for export
  const tableData = data.map(bucket => ({
    range: bucket.range,
    customers: bucket.count,
    percentage: `${bucket.pct.toFixed(1)}%`,
  }));

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <RecencyDistributionCard
          data={data}
          summary={summary}
          selectedRange={selectedRange}
          isMounted={isMounted}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Recency Distribution"
          subtitle="Days since last purchase distribution"
          rawData={tableData}
          columns={[
            { key: 'range', label: 'Recency Range' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString('en-IN') },
            { key: 'percentage', label: 'Percentage' },
          ]}
        >
          {renderChart(350)}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <RecencyDistributionCard
      data={data}
      summary={summary}
      selectedRange={selectedRange}
      isMounted={isMounted}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface RecencyDistributionCardProps {
  data: DistributionBucket[];
  summary: {
    avg_recency_days: number;
    median_recency_days: number;
    active_30_days: number;
    active_30_days_pct: number;
  };
  selectedRange?: string;
  isMounted: boolean;
  onBarClick: (entry: DistributionBucket) => void;
  onExpand: () => void;
}

function RecencyDistributionCard({
  data,
  summary,
  selectedRange,
  isMounted,
  onBarClick,
  onExpand,
}: RecencyDistributionCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Recency Distribution
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Days since last purchase
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand chart">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="h-[180px]">
        <ChartWrapper height={180}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 5, right: 10, left: 0, bottom: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  onClick={(_, index) => onBarClick(data[index])}
                  cursor="pointer"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.range}
                      fill={getRecencyColor(index, data.length)}
                      opacity={selectedRange && selectedRange !== entry.range ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
          )}
        </ChartWrapper>
      </div>

      {/* Key Stats */}
      <div className="mt-2 grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {summary.avg_recency_days.toFixed(0)} days
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Avg Recency</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[#10B981]">
            {summary.active_30_days_pct.toFixed(1)}%
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Active (30d)</p>
        </div>
      </div>
    </div>
  );
}
