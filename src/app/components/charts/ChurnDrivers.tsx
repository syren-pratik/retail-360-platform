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
import { ChurnDriver } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';
import { AIInsightButton } from './ChartCard';

interface ChurnDriversProps {
  data: ChurnDriver[];
}

const CHART_ID = 'churn_drivers';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChurnDriver }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const direction = data.direction === 'positive' ? 'Increases churn' : 'Decreases churn';
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.feature_name}</p>
        <p className="text-sm">Importance: {data.importance.toFixed(4)}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{direction}</p>
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to ask AI about this</p>
      </div>
    );
  }
  return null;
};

export default function ChurnDrivers({ data }: ChurnDriversProps) {
  const { expandedChart, setExpandedChart, triggerChatMessage } = useDashboard();

  // Take top 10 for display
  const displayData = data.slice(0, 10);

  const handleBarClick = (entry: ChurnDriver) => {
    const message = `Tell me more about "${entry.feature_name}" as a churn driver. Why does it ${entry.direction === 'positive' ? 'increase' : 'decrease'} customer churn?`;
    triggerChatMessage(message);
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={displayData}
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
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-default)' }}
          tickFormatter={(value) => value.toFixed(2)}
        />
        <YAxis
          type="category"
          dataKey="feature_name"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="importance"
          radius={[0, 4, 4, 0]}
          onClick={(_, index) => handleBarClick(displayData[index])}
          cursor="pointer"
        >
          {displayData.map((entry) => (
            <Cell
              key={entry.feature_name}
              fill={entry.direction === 'positive' ? '#EF4444' : '#10B981'}
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
        <ChurnDriversCard
          displayData={displayData}
          onBarClick={handleBarClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Churn Drivers"
          subtitle="Top factors influencing churn (SHAP importance) - Click to ask AI"
          rawData={data}
          columns={[
            { key: 'rank', label: 'Rank' },
            { key: 'feature_name', label: 'Feature' },
            { key: 'importance', label: 'Importance', format: (v) => (v as number).toFixed(4) },
            { key: 'direction', label: 'Direction', format: (v) => (v === 'positive' ? 'Increases churn' : 'Decreases churn') },
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
    <ChurnDriversCard
      displayData={displayData}
      onBarClick={handleBarClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface ChurnDriversCardProps {
  displayData: ChurnDriver[];
  onBarClick: (entry: ChurnDriver) => void;
  onExpand: () => void;
}

function ChurnDriversCard({
  displayData,
  onBarClick,
  onExpand,
}: ChurnDriversCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Churn Drivers
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Top factors influencing churn (SHAP importance)
          </p>
        </div>
        <div className="flex items-center gap-1">
          <AIInsightButton id={CHART_ID} title="Churn Drivers" data={displayData as unknown as Record<string, unknown>[]} />
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand chart">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
      <div className="h-[280px]">
        <ChartWrapper height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
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
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <YAxis
                type="category"
                dataKey="feature_name"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="importance"
                radius={[0, 4, 4, 0]}
                onClick={(_, index) => onBarClick(displayData[index])}
                cursor="pointer"
              >
                {displayData.map((entry) => (
                  <Cell
                    key={entry.feature_name}
                    fill={entry.direction === 'positive' ? '#EF4444' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
      {/* Legend */}
      <div className="mt-2 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
          <span className="text-[var(--text-secondary)]">Increases churn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
          <span className="text-[var(--text-secondary)]">Decreases churn</span>
        </div>
      </div>
    </div>
  );
}
