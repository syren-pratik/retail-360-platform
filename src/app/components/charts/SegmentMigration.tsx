'use client';

import { Maximize2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { SegmentMigrationData, SegmentFlow } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartExpandModal from './ChartExpandModal';
import { getLocaleAuto } from '@/app/lib/format-money';

interface SegmentMigrationProps {
  data: SegmentMigrationData;
}

const CHART_ID = 'segment_migration';

// Segment colors
const segmentColors: Record<string, string> = {
  'Champions': '#10B981',
  'Loyal': '#3B82F6',
  'Potential': '#8B5CF6',
  'At Risk': '#F59E0B',
  'Lost': '#EF4444',
};

const getFlowColor = (from: string, to: string, segments: string[]): string => {
  const fromIndex = segments.indexOf(from);
  const toIndex = segments.indexOf(to);

  if (fromIndex === toIndex) return '#94A3B8'; // Stable - gray
  if (toIndex < fromIndex) return '#10B981'; // Upgrade - green
  return '#EF4444'; // Downgrade - red
};

const getFlowIntensity = (pct: number): number => {
  // Map percentage to opacity (0.2 to 1.0)
  return Math.max(0.2, Math.min(1.0, pct / 100));
};

export default function SegmentMigration({ data }: SegmentMigrationProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();

  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedSegment = activeDrilldown?.value;

  const handleSegmentClick = (segment: string) => {
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

  // Create matrix for display
  const matrix: Record<string, Record<string, SegmentFlow | undefined>> = {};
  data.segments.forEach(from => {
    matrix[from] = {};
    data.segments.forEach(to => {
      matrix[from][to] = data.flows.find(f => f.from === from && f.to === to);
    });
  });

  // Table data for export
  const tableData = data.flows.map(flow => ({
    from: flow.from,
    to: flow.to,
    customers: flow.count,
    percentage: `${flow.pct.toFixed(1)}%`,
    direction: data.segments.indexOf(flow.to) < data.segments.indexOf(flow.from)
      ? 'Upgrade'
      : data.segments.indexOf(flow.to) > data.segments.indexOf(flow.from)
        ? 'Downgrade'
        : 'Stable',
  }));

  const renderMatrix = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)] rounded-tl-md">
              From ↓ / To →
            </th>
            {data.segments.map((segment) => (
              <th
                key={segment}
                className="px-3 py-2 text-center font-medium cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors last:rounded-tr-md"
                style={{ color: segmentColors[segment] }}
                onClick={() => handleSegmentClick(segment)}
              >
                {segment}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-[var(--text-secondary)]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.segments.map((fromSegment, rowIndex) => {
            const rowTotal = data.flows
              .filter(f => f.from === fromSegment)
              .reduce((sum, f) => sum + f.count, 0);

            return (
              <tr
                key={fromSegment}
                className={`border-b border-[var(--border-subtle)] transition-colors ${
                  rowIndex === data.segments.length - 1 ? 'border-b-0' : ''
                } ${selectedSegment === fromSegment ? 'bg-[var(--accent-primary-light)]' : ''} ${
                  selectedSegment && selectedSegment !== fromSegment ? 'opacity-50' : ''
                }`}
              >
                <td
                  className="px-3 py-2 font-medium cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: segmentColors[fromSegment] }}
                  onClick={() => handleSegmentClick(fromSegment)}
                >
                  {fromSegment}
                </td>
                {data.segments.map((toSegment) => {
                  const flow = matrix[fromSegment][toSegment];
                  const color = getFlowColor(fromSegment, toSegment, data.segments);
                  const opacity = flow ? getFlowIntensity(flow.pct) : 0;

                  return (
                    <td key={toSegment} className="px-2 py-2 text-center">
                      {flow && flow.count > 0 ? (
                        <div
                          className="inline-flex flex-col items-center px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${color}${Math.round(opacity * 30).toString(16).padStart(2, '0')}`,
                          }}
                        >
                          <span className="text-xs font-medium" style={{ color }}>
                            {flow.count.toLocaleString(getLocaleAuto())}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {flow.pct.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center text-[var(--text-secondary)] font-medium">
                  {rowTotal.toLocaleString(getLocaleAuto())}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <SegmentMigrationCard
          data={data}
          matrix={matrix}
          selectedSegment={selectedSegment}
          onSegmentClick={handleSegmentClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Segment Migration"
          subtitle={`Customer movement from ${data.period.from} to ${data.period.to}`}
          rawData={tableData}
          columns={[
            { key: 'from', label: 'From Segment' },
            { key: 'to', label: 'To Segment' },
            { key: 'customers', label: 'Customers', format: (v) => (v as number).toLocaleString(getLocaleAuto()) },
            { key: 'percentage', label: 'Percentage' },
            { key: 'direction', label: 'Direction' },
          ]}
        >
          {renderMatrix()}
        </ChartExpandModal>
      </>
    );
  }

  return (
    <SegmentMigrationCard
      data={data}
      matrix={matrix}
      selectedSegment={selectedSegment}
      onSegmentClick={handleSegmentClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface SegmentMigrationCardProps {
  data: SegmentMigrationData;
  matrix: Record<string, Record<string, SegmentFlow | undefined>>;
  selectedSegment?: string;
  onSegmentClick: (segment: string) => void;
  onExpand: () => void;
}

function SegmentMigrationCard({
  data,
  matrix,
  selectedSegment,
  onSegmentClick,
  onExpand,
}: SegmentMigrationCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Segment Migration
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Customer movement from {data.period.from} to {data.period.to}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand chart">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)] rounded-tl-md">
                From ↓ / To →
              </th>
              {data.segments.map((segment) => (
                <th
                  key={segment}
                  className="px-3 py-2 text-center font-medium cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors last:rounded-tr-md"
                  style={{ color: segmentColors[segment] }}
                  onClick={() => onSegmentClick(segment)}
                >
                  {segment}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.segments.map((fromSegment, rowIndex) => (
              <tr
                key={fromSegment}
                className={`border-b border-[var(--border-subtle)] transition-colors ${
                  rowIndex === data.segments.length - 1 ? 'border-b-0' : ''
                } ${selectedSegment === fromSegment ? 'bg-[var(--accent-primary-light)]' : ''} ${
                  selectedSegment && selectedSegment !== fromSegment ? 'opacity-50' : ''
                }`}
              >
                <td
                  className="px-3 py-2 font-medium cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: segmentColors[fromSegment] }}
                  onClick={() => onSegmentClick(fromSegment)}
                >
                  {fromSegment}
                </td>
                {data.segments.map((toSegment) => {
                  const flow = matrix[fromSegment][toSegment];
                  const color = getFlowColor(fromSegment, toSegment, data.segments);
                  const opacity = flow ? getFlowIntensity(flow.pct) : 0;

                  return (
                    <td key={toSegment} className="px-2 py-2 text-center">
                      {flow && flow.count > 0 ? (
                        <div
                          className="inline-flex flex-col items-center px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${color}${Math.round(opacity * 30).toString(16).padStart(2, '0')}`,
                          }}
                        >
                          <span className="text-xs font-medium" style={{ color }}>
                            {flow.count.toLocaleString(getLocaleAuto())}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {flow.pct.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[#10B981]">
            <ArrowUpRight size={14} />
            <span className="text-lg font-semibold">{data.summary.upgraded.toLocaleString(getLocaleAuto())}</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">Upgraded</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[var(--text-secondary)]">
            <Minus size={14} />
            <span className="text-lg font-semibold">{data.summary.stable.toLocaleString(getLocaleAuto())}</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">Stable</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[#F59E0B]">
            <ArrowDownRight size={14} />
            <span className="text-lg font-semibold">{data.summary.downgraded.toLocaleString(getLocaleAuto())}</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">Downgraded</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[#EF4444]">
            <ArrowDownRight size={14} />
            <span className="text-lg font-semibold">{data.summary.churned.toLocaleString(getLocaleAuto())}</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">Churned</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
          <span className="text-[var(--text-secondary)]">Upgrade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#94A3B8]" />
          <span className="text-[var(--text-secondary)]">Stable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
          <span className="text-[var(--text-secondary)]">Downgrade</span>
        </div>
      </div>
    </div>
  );
}
