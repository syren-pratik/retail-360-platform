'use client';

import { Maximize2 } from 'lucide-react';
import { CohortRetentionMatrix } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartExpandModal from './ChartExpandModal';

interface CohortRetentionHeatmapProps {
  data: CohortRetentionMatrix[];
}

const CHART_ID = 'cohort_retention';

const getRetentionColor = (value: number | null): string => {
  if (value === null) return 'transparent';
  // Gradient from green (high) to yellow (mid) to red (low)
  if (value >= 70) return '#10B981'; // Green
  if (value >= 50) return '#34D399'; // Light green
  if (value >= 40) return '#FCD34D'; // Yellow
  if (value >= 30) return '#FBBF24'; // Amber
  if (value >= 20) return '#F97316'; // Orange
  return '#EF4444'; // Red
};

const formatMonth = (monthStr: string | undefined | null): string => {
  if (!monthStr || typeof monthStr !== 'string') return 'Unknown';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const [year, month] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(month) - 1;
  if (monthIndex < 0 || monthIndex >= 12) return monthStr;
  return `${months[monthIndex]} ${year?.slice(2) || ''}`;
};

export default function CohortRetentionHeatmap({ data }: CohortRetentionHeatmapProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();

  // Find if this chart has an active drilldown
  const activeDrilldown = activeDrilldowns.find((d) => d.source === CHART_ID);
  const selectedCohort = activeDrilldown?.value;

  // Find max number of periods - safely handle empty data
  const validData = (data ?? []).filter(d => d && d.retention && d.cohort_month);
  const maxPeriods = validData.length > 0
    ? Math.max(...validData.map(d => d.retention?.length ?? 0))
    : 0;
  const periodHeaders = Array.from({ length: maxPeriods }, (_, i) => `M${i}`);

  const handleCohortClick = (cohortMonth: string) => {
    addDrilldown({
      source: CHART_ID,
      field: 'cohort_month',
      value: cohortMonth,
      label: `Cohort: ${formatMonth(cohortMonth)}`,
    });
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  // Transform data for the table export
  const tableData = validData.map((cohort) => ({
    cohort_month: formatMonth(cohort.cohort_month),
    original_customers: cohort.original_customers ?? 0,
    ...(cohort.retention ?? []).reduce((acc, val, i) => {
      acc[`M${i}`] = val !== null ? `${val.toFixed(1)}%` : '—';
      return acc;
    }, {} as Record<string, string>),
  }));

  const renderTable = () => (
    <table className="w-full text-sm">
      <thead>
        <tr className="table-header">
          <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)] rounded-tl-md">
            Cohort
          </th>
          <th className="px-3 py-2 text-right font-medium text-[var(--text-secondary)]">
            Size
          </th>
          {periodHeaders.map((period) => (
            <th
              key={period}
              className="px-3 py-2 text-center font-medium text-[var(--text-secondary)] last:rounded-tr-md"
            >
              {period}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {validData.map((cohort, rowIndex) => (
          <tr
            key={cohort.cohort_month}
            onClick={() => handleCohortClick(cohort.cohort_month)}
            className={`table-row border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${
              rowIndex === validData.length - 1 ? 'border-b-0' : ''
            } ${selectedCohort === cohort.cohort_month ? 'bg-[var(--accent-primary-light)]' : ''} ${
              selectedCohort && selectedCohort !== cohort.cohort_month ? 'opacity-50' : ''
            }`}
          >
            <td className="px-3 py-2 text-[var(--text-primary)] font-medium">
              {formatMonth(cohort.cohort_month)}
            </td>
            <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
              {(cohort.original_customers ?? 0).toLocaleString('en-IN')}
            </td>
            {(cohort.retention ?? []).map((value, i) => (
              <td key={i} className="px-2 py-2 text-center">
                {value !== null ? (
                  <span
                    className="inline-block px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: getRetentionColor(value),
                      color: value >= 40 ? '#1F2937' : 'white',
                    }}
                  >
                    {value.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">—</span>
                )}
              </td>
            ))}
            {/* Fill empty cells for alignment */}
            {Array.from({ length: maxPeriods - cohort.retention.length }).map((_, i) => (
              <td key={`empty-${i}`} className="px-2 py-2 text-center">
                <span className="text-[var(--text-tertiary)]">—</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <CohortRetentionCard
          data={data}
          maxPeriods={maxPeriods}
          periodHeaders={periodHeaders}
          selectedCohort={selectedCohort}
          onCohortClick={handleCohortClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="Cohort Retention Analysis"
          subtitle="Monthly retention rates by acquisition cohort (Click a row to filter)"
          rawData={tableData}
          columns={[
            { key: 'cohort_month', label: 'Cohort' },
            { key: 'original_customers', label: 'Size', format: (v) => (v as number).toLocaleString('en-IN') },
            ...periodHeaders.map((p) => ({ key: p, label: p })),
          ]}
        >
          <div className="overflow-x-auto">{renderTable()}</div>
        </ChartExpandModal>
      </>
    );
  }

  return (
    <CohortRetentionCard
      data={data}
      maxPeriods={maxPeriods}
      periodHeaders={periodHeaders}
      selectedCohort={selectedCohort}
      onCohortClick={handleCohortClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface CohortRetentionCardProps {
  data: CohortRetentionMatrix[];
  maxPeriods: number;
  periodHeaders: string[];
  selectedCohort?: string;
  onCohortClick: (cohortMonth: string) => void;
  onExpand: () => void;
}

function CohortRetentionCard({
  data,
  maxPeriods,
  periodHeaders,
  selectedCohort,
  onCohortClick,
  onExpand,
}: CohortRetentionCardProps) {
  // Filter valid data
  const cardValidData = (data ?? []).filter(d => d && d.retention && d.cohort_month);

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Cohort Retention Analysis
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Monthly retention rates by acquisition cohort
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)] rounded-tl-md">
                Cohort
              </th>
              <th className="px-3 py-2 text-right font-medium text-[var(--text-secondary)]">
                Size
              </th>
              {periodHeaders.map((period) => (
                <th
                  key={period}
                  className="px-3 py-2 text-center font-medium text-[var(--text-secondary)] last:rounded-tr-md"
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cardValidData.map((cohort, rowIndex) => (
              <tr
                key={cohort.cohort_month}
                onClick={() => onCohortClick(cohort.cohort_month)}
                className={`table-row border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${
                  rowIndex === cardValidData.length - 1 ? 'border-b-0' : ''
                } ${selectedCohort === cohort.cohort_month ? 'bg-[var(--accent-primary-light)]' : ''} ${
                  selectedCohort && selectedCohort !== cohort.cohort_month ? 'opacity-50' : ''
                }`}
              >
                <td className="px-3 py-2 text-[var(--text-primary)] font-medium">
                  {formatMonth(cohort.cohort_month)}
                </td>
                <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                  {(cohort.original_customers ?? 0).toLocaleString('en-IN')}
                </td>
                {(cohort.retention ?? []).map((value, i) => (
                  <td key={i} className="px-2 py-2 text-center">
                    {value !== null ? (
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: getRetentionColor(value),
                          color: value >= 40 ? '#1F2937' : 'white',
                        }}
                      >
                        {value.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                ))}
                {/* Fill empty cells for alignment */}
                {Array.from({ length: maxPeriods - cohort.retention.length }).map((_, i) => (
                  <td key={`empty-${i}`} className="px-2 py-2 text-center">
                    <span className="text-[var(--text-tertiary)]">—</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Color Legend */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-[var(--text-secondary)]">
        <span>Retention:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#EF4444]" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#FBBF24]" />
          <span>Mid</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#10B981]" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
