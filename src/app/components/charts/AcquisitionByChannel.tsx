'use client';

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { AcquisitionChannel } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface AcquisitionByChannelProps {
  data: AcquisitionChannel[];
}

const CHART_ID = 'acquisition_by_channel';

// Acquisition channel colors
const acqColors: string[] = [
  '#3B82F6', // Organic Search
  '#F472B6', // Paid Social
  '#10B981', // Direct
  '#F59E0B', // Referral
  '#8B5CF6', // Email
  '#EF4444', // Paid Search
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AcquisitionChannel }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.channel}</p>
        <p className="text-sm">
          Customers: <span className="font-medium">{data.customers.toLocaleString('en-IN')}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {data.pct.toFixed(1)}% of acquisitions
        </p>
        {data.cac > 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            CAC: ₹{data.cac.toLocaleString('en-IN')}
          </p>
        )}
        {data.ltv_cac_ratio !== null && (
          <p className="text-sm text-[var(--text-secondary)]">
            LTV/CAC: {data.ltv_cac_ratio.toFixed(1)}x
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to filter</p>
      </div>
    );
  }
  return null;
};

export default function AcquisitionByChannel({ data }: AcquisitionByChannelProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedChannel = activeDrilldown?.value;

  const handleSliceClick = (entry: AcquisitionChannel) => {
    addDrilldown({
      source: CHART_ID,
      field: 'acquisition_channel',
      value: entry.channel,
      label: `Acquired via: ${entry.channel}`,
    });
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  const renderChart = (innerRadius: number, outerRadius: number) => (
    <ChartWrapper height={outerRadius * 2 + 50}>
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              dataKey="customers"
              nameKey="channel"
              onClick={(_, index) => handleSliceClick(data[index])}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.channel}
                  fill={acqColors[index % acqColors.length]}
                  opacity={selectedChannel && selectedChannel !== entry.channel ? 0.3 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
      )}
    </ChartWrapper>
  );

  // Table data for export
  const tableData = data.map(ch => ({
    channel: ch.channel,
    customers: ch.customers,
    percentage: `${ch.pct.toFixed(1)}%`,
    cac: ch.cac > 0 ? `₹${ch.cac.toLocaleString('en-IN')}` : 'N/A',
    ltv_cac_ratio: ch.ltv_cac_ratio !== null ? `${ch.ltv_cac_ratio.toFixed(1)}x` : 'N/A',
  }));

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <AcquisitionByChannelCard
          data={data}
          selectedChannel={selectedChannel}
          isMounted={isMounted}
          onSliceClick={handleSliceClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Customer Acquisition by Channel"
          subtitle="Source of customer acquisition"
          rawData={tableData}
          columns={[
            { key: 'channel', label: 'Channel' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString('en-IN') },
            { key: 'percentage', label: 'Share' },
            { key: 'cac', label: 'CAC' },
            { key: 'ltv_cac_ratio', label: 'LTV/CAC' },
          ]}
        >
          {renderChart(80, 140)}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <AcquisitionByChannelCard
      data={data}
      selectedChannel={selectedChannel}
      isMounted={isMounted}
      onSliceClick={handleSliceClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface AcquisitionByChannelCardProps {
  data: AcquisitionChannel[];
  selectedChannel?: string;
  isMounted: boolean;
  onSliceClick: (entry: AcquisitionChannel) => void;
  onExpand: () => void;
}

function AcquisitionByChannelCard({
  data,
  selectedChannel,
  isMounted,
  onSliceClick,
  onExpand,
}: AcquisitionByChannelCardProps) {
  // Find best ROI channel (highest LTV/CAC)
  const bestROI = data
    .filter(d => d.ltv_cac_ratio !== null)
    .reduce((best, ch) => (ch.ltv_cac_ratio ?? 0) > (best.ltv_cac_ratio ?? 0) ? ch : best, data[0]);

  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Acquisition Channels
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Customer acquisition sources
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
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="customers"
                  nameKey="channel"
                  onClick={(_, index) => onSliceClick(data[index])}
                  cursor="pointer"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.channel}
                      fill={acqColors[index % acqColors.length]}
                      opacity={selectedChannel && selectedChannel !== entry.channel ? 0.3 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: '9px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="animate-pulse bg-[var(--bg-secondary)] rounded h-full" />
          )}
        </ChartWrapper>
      </div>

      {/* Best ROI Channel */}
      {bestROI && (
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Best ROI:</span>
            <span className="font-medium text-[#10B981]">
              {bestROI.channel} ({bestROI.ltv_cac_ratio?.toFixed(1)}x)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
