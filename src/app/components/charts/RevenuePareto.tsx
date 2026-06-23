'use client';

import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { ParetoDataPoint } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';
import { AIInsightButton } from './ChartCard';

interface RevenueParetoProps {
  data: ParetoDataPoint[];
  summary: {
    total_revenue: number;
    top_10_pct_revenue: number;
    top_20_pct_revenue: number;
    gini_coefficient: number;
  };
}

const CHART_ID = 'revenue_pareto';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ParetoDataPoint }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">Top {data.percentile}% of Customers</p>
        <p className="text-sm">
          Revenue: <span className="font-medium">{data.cumulative_revenue_pct.toFixed(1)}%</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {data.customer_count.toLocaleString('en-IN')} customers
        </p>
      </div>
    );
  }
  return null;
};

export default function RevenuePareto({ data, summary }: RevenueParetoProps) {
  const { expandedChart, setExpandedChart } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  // Add incremental revenue for bars
  const chartData = data.map((point, index) => ({
    ...point,
    label: `${point.percentile}%`,
    incremental_revenue: index === 0
      ? point.cumulative_revenue_pct
      : point.cumulative_revenue_pct - data[index - 1].cumulative_revenue_pct,
  }));

  const renderChart = (height: number) => (
    <ChartWrapper height={height}>
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              yAxisId="left"
              y={80}
              stroke="var(--text-tertiary)"
              strokeDasharray="5 5"
              label={{ value: '80%', position: 'left', fontSize: 10 }}
            />
            <Bar
              yAxisId="left"
              dataKey="incremental_revenue"
              fill="var(--accent-primary)"
              radius={[4, 4, 0, 0]}
              opacity={0.7}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative_revenue_pct"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
      )}
    </ChartWrapper>
  );

  // Table data for export
  const tableData = data.map(point => ({
    percentile: `Top ${point.percentile}%`,
    cumulative_revenue: `${point.cumulative_revenue_pct.toFixed(1)}%`,
    customers: point.customer_count,
  }));

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <RevenueParetoCard
          data={data}
          summary={summary}
          chartData={chartData}
          isMounted={isMounted}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Revenue Concentration (Pareto)"
          subtitle="Cumulative revenue by customer percentile"
          rawData={tableData}
          columns={[
            { key: 'percentile', label: 'Customer Percentile' },
            { key: 'cumulative_revenue', label: 'Cumulative Revenue' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString('en-IN') },
          ]}
        >
          {renderChart(400)}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <RevenueParetoCard
      data={data}
      summary={summary}
      chartData={chartData}
      isMounted={isMounted}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface RevenueParetoCardProps {
  data: ParetoDataPoint[];
  summary: {
    total_revenue: number;
    top_10_pct_revenue: number;
    top_20_pct_revenue: number;
    gini_coefficient: number;
  };
  chartData: Array<ParetoDataPoint & { label: string; incremental_revenue: number }>;
  isMounted: boolean;
  onExpand: () => void;
}

function RevenueParetoCard({
  summary,
  chartData,
  isMounted,
  onExpand,
}: RevenueParetoCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Revenue Concentration
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Pareto analysis of customer revenue
          </p>
        </div>
        <div className="flex items-center gap-1">
          <AIInsightButton id={CHART_ID} title="Revenue Concentration" data={chartData as unknown as Record<string, unknown>[]} />
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand chart">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="h-[200px]">
        <ChartWrapper height={200}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={80}
                  stroke="var(--text-tertiary)"
                  strokeDasharray="5 5"
                />
                <Bar
                  dataKey="incremental_revenue"
                  fill="var(--accent-primary)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.7}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative_revenue_pct"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
          )}
        </ChartWrapper>
      </div>

      {/* Key Stats */}
      <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {summary.top_10_pct_revenue.toFixed(0)}%
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Top 10% Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {summary.top_20_pct_revenue.toFixed(0)}%
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Top 20% Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {summary.gini_coefficient.toFixed(2)}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Gini Coefficient</p>
        </div>
      </div>
    </div>
  );
}
