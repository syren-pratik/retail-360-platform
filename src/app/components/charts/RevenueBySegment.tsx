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
import { RevenueBySegment as RevenueBySegmentType } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface RevenueBySegmentProps {
  data: RevenueBySegmentType[];
}

const CHART_ID = 'revenue_by_segment';

// Segment colors
const segmentColors: Record<string, string> = {
  'Champions': '#10B981',
  'Loyal': '#3B82F6',
  'Potential': '#8B5CF6',
  'At Risk': '#F59E0B',
  'Lost': '#EF4444',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RevenueBySegmentType }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.segment}</p>
        <p className="text-sm">
          Revenue: <span className="font-medium">₹{(data.revenue / 10000000).toFixed(1)} Cr</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {data.revenue_pct.toFixed(1)}% of total
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {data.customers.toLocaleString('en-IN')} customers
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Avg: ₹{data.avg_revenue.toLocaleString('en-IN')}
        </p>
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to filter by segment</p>
      </div>
    );
  }
  return null;
};

const formatRevenue = (value: number): string => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(0)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(0)}L`;
  }
  return `₹${(value / 1000).toFixed(0)}K`;
};

export default function RevenueBySegment({ data }: RevenueBySegmentProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedSegment = activeDrilldown?.value;

  const handleBarClick = (entry: RevenueBySegmentType) => {
    addDrilldown({
      source: CHART_ID,
      field: 'customer_segment',
      value: entry.segment,
      label: `Segment: ${entry.segment}`,
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
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickFormatter={formatRevenue}
            />
            <YAxis
              type="category"
              dataKey="segment"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="revenue"
              radius={[0, 4, 4, 0]}
              onClick={(_, index) => handleBarClick(data[index])}
              cursor="pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.segment}
                  fill={segmentColors[entry.segment] || 'var(--accent-primary)'}
                  opacity={selectedSegment && selectedSegment !== entry.segment ? 0.3 : 1}
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
  const tableData = data.map(segment => ({
    segment: segment.segment,
    revenue: `₹${(segment.revenue / 10000000).toFixed(2)} Cr`,
    revenue_pct: `${segment.revenue_pct.toFixed(1)}%`,
    customers: segment.customers,
    avg_revenue: `₹${segment.avg_revenue.toLocaleString('en-IN')}`,
  }));

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <RevenueBySegmentCard
          data={data}
          selectedSegment={selectedSegment}
          isMounted={isMounted}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Revenue by Segment"
          subtitle="Total revenue contribution by customer segment"
          rawData={tableData}
          columns={[
            { key: 'segment', label: 'Segment' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'revenue_pct', label: '% of Total' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString('en-IN') },
            { key: 'avg_revenue', label: 'Avg Revenue' },
          ]}
        >
          {renderChart(350)}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <RevenueBySegmentCard
      data={data}
      selectedSegment={selectedSegment}
      isMounted={isMounted}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface RevenueBySegmentCardProps {
  data: RevenueBySegmentType[];
  selectedSegment?: string;
  isMounted: boolean;
  onBarClick: (entry: RevenueBySegmentType) => void;
  onExpand: () => void;
}

function RevenueBySegmentCard({
  data,
  selectedSegment,
  isMounted,
  onBarClick,
  onExpand,
}: RevenueBySegmentCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Revenue by Segment
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Revenue contribution by customer segment
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

      <div className="h-[200px]">
        <ChartWrapper height={200}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickFormatter={(v) => `₹${(v / 10000000).toFixed(0)}Cr`}
                />
                <YAxis
                  type="category"
                  dataKey="segment"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  radius={[0, 4, 4, 0]}
                  onClick={(_, index) => onBarClick(data[index])}
                  cursor="pointer"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.segment}
                      fill={segmentColors[entry.segment] || 'var(--accent-primary)'}
                      opacity={selectedSegment && selectedSegment !== entry.segment ? 0.3 : 1}
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

      {/* Top Segment Highlight */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Top Segment:</span>
          <span className="font-medium" style={{ color: segmentColors[data[0]?.segment] }}>
            {data[0]?.segment} ({data[0]?.revenue_pct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
