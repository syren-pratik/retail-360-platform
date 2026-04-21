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
  Legend,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { ChannelPerformance as ChannelPerformanceType } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface ChannelPerformanceProps {
  data: ChannelPerformanceType[];
}

const CHART_ID = 'channel_performance';

// Channel colors
const channelColors: Record<string, string> = {
  'Online - Web': '#3B82F6',
  'Online - App': '#10B981',
  'In-Store': '#8B5CF6',
  'Marketplace': '#F59E0B',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChannelPerformanceType; dataKey: string; color: string; name: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <p>Revenue: <span className="font-medium">₹{(data.revenue / 10000000).toFixed(1)} Cr</span></p>
          <p>Customers: <span className="font-medium">{data.customers.toLocaleString('en-IN')}</span></p>
          <p>Orders: <span className="font-medium">{data.orders.toLocaleString('en-IN')}</span></p>
          <p>AOV: <span className="font-medium">₹{data.avg_order_value.toLocaleString('en-IN')}</span></p>
          <p>Retention: <span className="font-medium">{data.retention_rate}%</span></p>
        </div>
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to filter by channel</p>
      </div>
    );
  }
  return null;
};

export default function ChannelPerformance({ data }: ChannelPerformanceProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedChannel = activeDrilldown?.value;

  const handleBarClick = (entry: ChannelPerformanceType) => {
    addDrilldown({
      source: CHART_ID,
      field: 'preferred_channel',
      value: entry.channel,
      label: `Channel: ${entry.channel}`,
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
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="channel"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`}
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
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="Revenue"
              radius={[4, 4, 0, 0]}
              onClick={(_, index) => handleBarClick(data[index])}
              cursor="pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.channel}
                  fill={channelColors[entry.channel] || 'var(--accent-primary)'}
                  opacity={selectedChannel && selectedChannel !== entry.channel ? 0.3 : 1}
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
  const tableData = data.map(ch => ({
    channel: ch.channel,
    revenue: `₹${(ch.revenue / 10000000).toFixed(2)} Cr`,
    customers: ch.customers,
    orders: ch.orders,
    avg_order_value: `₹${ch.avg_order_value.toLocaleString('en-IN')}`,
    retention_rate: `${ch.retention_rate}%`,
  }));

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <ChannelPerformanceCard
          data={data}
          selectedChannel={selectedChannel}
          isMounted={isMounted}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Channel Performance"
          subtitle="Revenue and metrics by sales channel"
          rawData={tableData}
          columns={[
            { key: 'channel', label: 'Channel' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString('en-IN') },
            { key: 'orders', label: 'Orders', format: (v) => (v as number).toLocaleString('en-IN') },
            { key: 'avg_order_value', label: 'AOV' },
            { key: 'retention_rate', label: 'Retention' },
          ]}
        >
          {renderChart(350)}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <ChannelPerformanceCard
      data={data}
      selectedChannel={selectedChannel}
      isMounted={isMounted}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface ChannelPerformanceCardProps {
  data: ChannelPerformanceType[];
  selectedChannel?: string;
  isMounted: boolean;
  onBarClick: (entry: ChannelPerformanceType) => void;
  onExpand: () => void;
}

function ChannelPerformanceCard({
  data,
  selectedChannel,
  isMounted,
  onBarClick,
  onExpand,
}: ChannelPerformanceCardProps) {
  // Find best performing channel
  const topChannel = data.reduce((best, ch) => ch.revenue > best.revenue ? ch : best, data[0]);

  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Channel Performance
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Revenue by sales channel
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
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="channel"
                  tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${(value / 10000000).toFixed(0)}Cr`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  radius={[4, 4, 0, 0]}
                  onClick={(_, index) => onBarClick(data[index])}
                  cursor="pointer"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.channel}
                      fill={channelColors[entry.channel] || 'var(--accent-primary)'}
                      opacity={selectedChannel && selectedChannel !== entry.channel ? 0.3 : 1}
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

      {/* Top Channel */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Top Channel:</span>
          <span className="font-medium" style={{ color: channelColors[topChannel.channel] }}>
            {topChannel.channel}
          </span>
        </div>
      </div>
    </div>
  );
}
