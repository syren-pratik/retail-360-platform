'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Maximize2, AlertTriangle } from 'lucide-react';
import { GeographyByCity } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';
import { AIInsightButton } from './ChartCard';

interface ChurnByCityProps {
  data: GeographyByCity[];
}

const CHART_ID = 'churn_by_city';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GeographyByCity; value: number; dataKey: string }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const avgChurn = 0.127; // National average
    const isHighChurn = data.avg_churn > avgChurn;

    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.city}</p>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">{data.state}</p>
        <p className="text-sm">
          Customers: <span className="font-medium">{(data.customers ?? 0).toLocaleString('en-IN')}</span>
        </p>
        <p className="text-sm">
          Churn Rate: <span className={`font-medium ${isHighChurn ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
            {(data.avg_churn * 100).toFixed(1)}%
          </span>
          {isHighChurn && (
            <span className="text-xs text-[var(--status-danger)] ml-1">
              (Above avg)
            </span>
          )}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Avg CLV: ₹{(data.avg_clv ?? 0).toLocaleString('en-IN')}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Stores: {data.stores}
        </p>
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to filter by city</p>
      </div>
    );
  }
  return null;
};

export default function ChurnByCity({ data }: ChurnByCityProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart, setGlobalFilters } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sort by customers descending and take top 10
  const sortedData = useMemo(() =>
    [...(data ?? [])].sort((a, b) => (b?.customers ?? 0) - (a?.customers ?? 0)).slice(0, 10),
    [data]
  );

  // Calculate average churn
  const avgChurn = useMemo(() => {
    const total = (sortedData ?? []).reduce((sum, d) => sum + (d?.avg_churn ?? 0), 0);
    return total / ((sortedData ?? []).length || 1);
  }, [sortedData]);

  // Cities with above-average churn
  const highChurnCities = useMemo(() =>
    (sortedData ?? []).filter(d => (d?.avg_churn ?? 0) > avgChurn),
    [sortedData, avgChurn]
  );

  const activeDrilldown = (activeDrilldowns ?? []).find((d) => d.source === CHART_ID);
  const selectedCity = activeDrilldown?.value;

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  const handleBarClick = (entry: GeographyByCity) => {
    // Set the city filter in global filters
    setGlobalFilters({ cities: [entry.city] });
    // Add drilldown for visual feedback
    addDrilldown({
      source: CHART_ID,
      field: 'city',
      value: entry.city,
      label: `City: ${entry.city}`,
    });
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  const renderChart = (height: number) => (
    <ChartWrapper height={height}>
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
            />
            <XAxis
              dataKey="city"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              domain={[0, 0.25]}
            />
            <ReferenceLine
              yAxisId="right"
              y={avgChurn}
              stroke="var(--status-danger)"
              strokeDasharray="5 5"
              strokeOpacity={0.7}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              yAxisId="left"
              dataKey="customers"
              radius={[4, 4, 0, 0]}
              onClick={(_, index) => handleBarClick(sortedData[index])}
              cursor="pointer"
            >
              {(sortedData ?? []).map((entry) => (
                <Cell
                  key={entry.city}
                  fill={entry.avg_churn > avgChurn ? 'var(--status-warning)' : 'var(--accent-primary)'}
                  opacity={selectedCity && selectedCity !== entry.city ? 0.3 : 1}
                />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avg_churn"
              stroke="var(--status-danger)"
              strokeWidth={2}
              dot={{ fill: 'var(--status-danger)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
      )}
    </ChartWrapper>
  );

  // Table data for export
  const tableData = sortedData.map(city => ({
    city: city.city,
    state: city.state,
    customers: city.customers,
    avg_churn: `${(city.avg_churn * 100).toFixed(1)}%`,
    avg_clv: `₹${(city.avg_clv ?? 0).toLocaleString('en-IN')}`,
    stores: city.stores,
    status: city.avg_churn > avgChurn ? 'Above Avg' : 'Normal',
  }));

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <ChurnByCityCard
          data={sortedData}
          avgChurn={avgChurn}
          highChurnCities={highChurnCities}
          selectedCity={selectedCity}
          isMounted={isMounted}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Churn Rate by City"
          subtitle="Customer volume and churn rate across top cities"
          rawData={tableData}
          columns={[
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString('en-IN') },
            { key: 'avg_churn', label: 'Churn Rate' },
            { key: 'avg_clv', label: 'Avg CLV' },
            { key: 'stores', label: 'Stores' },
            { key: 'status', label: 'Status' },
          ]}
        >
          {renderChart(400)}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <ChurnByCityCard
      data={sortedData}
      avgChurn={avgChurn}
      highChurnCities={highChurnCities}
      selectedCity={selectedCity}
      isMounted={isMounted}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface ChurnByCityCardProps {
  data: GeographyByCity[];
  avgChurn: number;
  highChurnCities: GeographyByCity[];
  selectedCity?: string;
  isMounted: boolean;
  onBarClick: (entry: GeographyByCity) => void;
  onExpand: () => void;
}

function ChurnByCityCard({
  data,
  avgChurn,
  highChurnCities,
  selectedCity,
  isMounted,
  onBarClick,
  onExpand,
}: ChurnByCityCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Churn Rate by City
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Bars: customers, Line: churn rate
          </p>
        </div>
        <div className="flex items-center gap-1">
          <AIInsightButton id={CHART_ID} title="Churn Rate by City" data={data as unknown as Record<string, unknown>[]} />
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
              <ComposedChart
                data={data}
                margin={{ top: 15, right: 30, left: 0, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="city"
                  tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  angle={-40}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 0.25]}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={avgChurn}
                  stroke="var(--status-danger)"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="customers"
                  radius={[4, 4, 0, 0]}
                  onClick={(_, index) => onBarClick(data[index])}
                  cursor="pointer"
                >
                  {(data ?? []).map((entry) => (
                    <Cell
                      key={entry.city}
                      fill={entry.avg_churn > avgChurn ? 'var(--status-warning)' : 'var(--accent-primary)'}
                      opacity={selectedCity && selectedCity !== entry.city ? 0.3 : 1}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avg_churn"
                  stroke="var(--status-danger)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--status-danger)', r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
          )}
        </ChartWrapper>
      </div>

      {/* Insight Text */}
      {(highChurnCities ?? []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle size={14} className="text-[var(--status-warning)] mt-0.5 flex-shrink-0" />
            <p className="text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--status-warning)]">
                {(highChurnCities ?? []).length} cities
              </span>
              {' '}have above-average churn ({(avgChurn * 100).toFixed(1)}%): {(highChurnCities ?? []).map(c => c.city).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
