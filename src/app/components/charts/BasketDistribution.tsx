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
import { BasketDistribution as BasketDistributionData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface BasketDistributionProps {
  data: BasketDistributionData[];
}

const CHART_ID = 'basket_distribution';

const formatNumber = (num: number) => {
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BasketDistributionData }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.basket_range}</p>
        <p className="text-sm">
          {formatNumber(data.customer_count)} customers
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Avg: ₹{data.avg_value.toLocaleString('en-IN')}
        </p>
      </div>
    );
  }
  return null;
};

export default function BasketDistribution({ data }: BasketDistributionProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();

  // Find if this chart has an active drilldown
  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedRange = activeDrilldown?.value;

  const handleBarClick = (entry: BasketDistributionData) => {
    addDrilldown({
      source: CHART_ID,
      field: 'basket_range',
      value: entry.basket_range,
      label: `Basket: ${entry.basket_range}`,
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
          dataKey="basket_range"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-default)' }}
          interval={0}
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
          {data.map((entry) => (
            <Cell
              key={entry.basket_range}
              fill="var(--chart-blue)"
              opacity={selectedRange && selectedRange !== entry.basket_range ? 0.3 : 1}
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
        <BasketDistributionCard
          data={data}
          selectedRange={selectedRange}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Basket Value Distribution"
          subtitle="Customer count by average basket value range"
          rawData={data}
          columns={[
            { key: 'basket_range', label: 'Basket Range' },
            { key: 'customer_count', label: 'Customers', format: (v) => formatNumber(v as number) },
            { key: 'avg_value', label: 'Avg Value', format: (v) => `₹${(v as number).toLocaleString('en-IN')}` },
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
    <BasketDistributionCard
      data={data}
      selectedRange={selectedRange}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface BasketDistributionCardProps {
  data: BasketDistributionData[];
  selectedRange?: string;
  onBarClick: (entry: BasketDistributionData) => void;
  onExpand: () => void;
}

function BasketDistributionCard({
  data,
  selectedRange,
  onBarClick,
  onExpand,
}: BasketDistributionCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Basket Value Distribution
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Customer count by average basket value range
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
                dataKey="basket_range"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
                interval={0}
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
                {data.map((entry) => (
                  <Cell
                    key={entry.basket_range}
                    fill="var(--chart-blue)"
                    opacity={selectedRange && selectedRange !== entry.basket_range ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </div>
  );
}
