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
import { GeographyByState } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';
import { AIInsightButton } from './ChartCard';

interface CustomersByGeographyProps {
  data: GeographyByState[];
}

const CHART_ID = 'customers_by_geography';

// Color scale based on avg CLV (darker = higher CLV)
const getColorByClv = (avgClv: number, maxClv: number): string => {
  const intensity = avgClv / maxClv;
  // Blue scale from light to dark
  if (intensity > 0.8) return '#1E40AF'; // Very high CLV
  if (intensity > 0.6) return '#2563EB'; // High CLV
  if (intensity > 0.4) return '#3B82F6'; // Medium CLV
  if (intensity > 0.2) return '#60A5FA'; // Low CLV
  return '#93C5FD'; // Very low CLV
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GeographyByState }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.state}</p>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">{data.region} Region</p>
        <p className="text-sm">
          Customers: <span className="font-medium">{(data.customers ?? 0).toLocaleString('en-IN')}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Avg CLV: <span className="font-medium">₹{(data.avg_clv ?? 0).toLocaleString('en-IN')}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Churn Rate: <span className={`font-medium ${data.avg_churn > 0.15 ? 'text-[var(--status-danger)]' : ''}`}>
            {(data.avg_churn * 100).toFixed(1)}%
          </span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Revenue: ₹{(data.revenue / 10000000).toFixed(1)} Cr
        </p>
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to filter by state</p>
      </div>
    );
  }
  return null;
};

export default function CustomersByGeography({ data }: CustomersByGeographyProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart, setGlobalFilters } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  // Sort by customers descending
  const sortedData = [...(data ?? [])].sort((a, b) => b.customers - a.customers);
  const maxClv = Math.max(...data.map(d => d.avg_clv));

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedState = activeDrilldown?.value;

  const handleBarClick = (entry: GeographyByState) => {
    // Set the state filter in global filters
    setGlobalFilters({ states: [entry.state] });
    // Add drilldown for visual feedback
    addDrilldown({
      source: CHART_ID,
      field: 'state',
      value: entry.state,
      label: `State: ${entry.state}`,
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
            data={sortedData}
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
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <YAxis
              type="category"
              dataKey="state"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="customers"
              radius={[0, 4, 4, 0]}
              onClick={(_, index) => handleBarClick(sortedData[index])}
              cursor="pointer"
            >
              {(sortedData ?? []).map((entry) => (
                <Cell
                  key={entry.state}
                  fill={getColorByClv(entry.avg_clv, maxClv)}
                  opacity={selectedState && selectedState !== entry.state ? 0.3 : 1}
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
  const tableData = sortedData.map(state => ({
    state: state.state,
    region: state.region,
    customers: state.customers,
    avg_clv: `₹${(state.avg_clv ?? 0).toLocaleString('en-IN')}`,
    avg_churn: `${(state.avg_churn * 100).toFixed(1)}%`,
    revenue: `₹${(state.revenue / 10000000).toFixed(2)} Cr`,
  }));

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <CustomersByGeographyCard
          data={sortedData}
          maxClv={maxClv}
          selectedState={selectedState}
          isMounted={isMounted}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Customers by State"
          subtitle="Customer distribution and CLV by state"
          rawData={tableData}
          columns={[
            { key: 'state', label: 'State' },
            { key: 'region', label: 'Region' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString('en-IN') },
            { key: 'avg_clv', label: 'Avg CLV' },
            { key: 'avg_churn', label: 'Churn Rate' },
            { key: 'revenue', label: 'Revenue' },
          ]}
        >
          {renderChart(400)}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <CustomersByGeographyCard
      data={sortedData}
      maxClv={maxClv}
      selectedState={selectedState}
      isMounted={isMounted}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface CustomersByGeographyCardProps {
  data: GeographyByState[];
  maxClv: number;
  selectedState?: string;
  isMounted: boolean;
  onBarClick: (entry: GeographyByState) => void;
  onExpand: () => void;
}

function CustomersByGeographyCard({
  data,
  maxClv,
  selectedState,
  isMounted,
  onBarClick,
  onExpand,
}: CustomersByGeographyCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Customers by State
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Color intensity indicates avg CLV
          </p>
        </div>
        <div className="flex items-center gap-1">
          <AIInsightButton id={CHART_ID} title="Customers by State" data={data as unknown as Record<string, unknown>[]} />
          <button
            onClick={onExpand}
            className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Expand chart"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="h-[220px]">
        <ChartWrapper height={220}>
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
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  type="category"
                  dataKey="state"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="customers"
                  radius={[0, 4, 4, 0]}
                  onClick={(_, index) => onBarClick(data[index])}
                  cursor="pointer"
                >
                  {(data ?? []).map((entry) => (
                    <Cell
                      key={entry.state}
                      fill={getColorByClv(entry.avg_clv, maxClv)}
                      opacity={selectedState && selectedState !== entry.state ? 0.3 : 1}
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

      {/* CLV Legend */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span>Lower CLV</span>
          <div className="flex gap-1">
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#93C5FD' }} />
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#60A5FA' }} />
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#3B82F6' }} />
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#2563EB' }} />
            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#1E40AF' }} />
          </div>
          <span>Higher CLV</span>
        </div>
      </div>
    </div>
  );
}
