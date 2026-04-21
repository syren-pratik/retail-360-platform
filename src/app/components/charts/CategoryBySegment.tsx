'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { CategoryBySegment as CategoryBySegmentData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface CategoryBySegmentProps {
  data: CategoryBySegmentData[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Electronics': '#3B82F6',
  'Fashion': '#6366F1',
  'Grocery': '#10B981',
  'Beauty': '#F43F5E',
  'Home & Living': '#F59E0B',
};

const CHART_ID = 'category_by_segment';

const formatNumber = (num: number) => {
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}: {formatNumber(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CategoryBySegment({ data }: CategoryBySegmentProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();

  // Find if this chart has an active drilldown
  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedSegment = activeDrilldown?.value;

  // Transform data for grouped bar chart
  const segments = Array.from(new Set(data.map(d => d.customer_segment)));
  const categories = Array.from(new Set(data.map(d => d.top_category))).slice(0, 5);

  const chartData = segments.map(segment => {
    const segmentData: Record<string, string | number> = { segment };
    data
      .filter(d => d.customer_segment === segment)
      .forEach(d => {
        if (categories.includes(d.top_category)) {
          segmentData[d.top_category] = d.customer_count;
        }
      });
    return segmentData;
  });

  const handleBarClick = (segment: string) => {
    addDrilldown({
      source: CHART_ID,
      field: 'customer_segment',
      value: segment,
      label: `Segment: ${segment}`,
    });
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          dataKey="segment"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
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
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
          iconSize={10}
          iconType="square"
        />
        {categories.map((category) => (
          <Bar
            key={category}
            dataKey={category}
            fill={CATEGORY_COLORS[category] || '#64748B'}
            radius={[2, 2, 0, 0]}
            onClick={(payload) => handleBarClick((payload as unknown as Record<string, unknown>).segment as string)}
            cursor="pointer"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.segment as string}
                opacity={selectedSegment && selectedSegment !== entry.segment ? 0.3 : 1}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <CategoryBySegmentCard
          chartData={chartData}
          categories={categories}
          selectedSegment={selectedSegment}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Top Categories by Segment"
          subtitle="Customer distribution across categories per segment"
          rawData={data}
          columns={[
            { key: 'customer_segment', label: 'Segment' },
            { key: 'top_category', label: 'Category' },
            { key: 'customer_count', label: 'Customers', format: (v) => formatNumber(v as number) },
            { key: 'avg_spend', label: 'Avg Spend', format: (v) => `₹${(v as number).toLocaleString('en-IN')}` },
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
    <CategoryBySegmentCard
      chartData={chartData}
      categories={categories}
      selectedSegment={selectedSegment}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface CategoryBySegmentCardProps {
  chartData: Record<string, string | number>[];
  categories: string[];
  selectedSegment?: string;
  onBarClick: (segment: string) => void;
  onExpand: () => void;
}

function CategoryBySegmentCard({
  chartData,
  categories,
  selectedSegment,
  onBarClick,
  onExpand,
}: CategoryBySegmentCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Top Categories by Segment
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Customer distribution across categories per segment
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
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="segment"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
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
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                iconSize={10}
                iconType="square"
              />
              {categories.map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  fill={CATEGORY_COLORS[category] || '#64748B'}
                  radius={[2, 2, 0, 0]}
                  onClick={(payload) => onBarClick((payload as unknown as Record<string, unknown>).segment as string)}
                  cursor="pointer"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.segment as string}
                      opacity={selectedSegment && selectedSegment !== entry.segment ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </div>
  );
}
