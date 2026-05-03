'use client';

import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { CohortRetentionMatrix, CohortDetailData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import CohortExpandModal from './CohortExpandModal';

interface CohortRetentionHeatmapProps {
  data: CohortRetentionMatrix[];
  cohortDetail: CohortDetailData;
}

const CHART_ID = 'cohort_retention';

function getRetentionColor(rate: number): string {
  if (rate >= 0.95) return '#1a3a5c';
  if (rate >= 0.90) return '#2a5a8c';
  if (rate >= 0.85) return '#3a7abc';
  if (rate >= 0.80) return '#5a9ad4';
  if (rate >= 0.75) return '#7ab4e4';
  if (rate >= 0.70) return '#9ac8ec';
  if (rate >= 0.65) return '#b4d8f2';
  if (rate >= 0.60) return '#cce4f6';
  if (rate >= 0.50) return '#deedf8';
  return '#eef5fb';
}

function getTextColor(rate: number): string {
  return rate >= 0.80 ? '#ffffff' : '#1a3a5c';
}

interface TooltipData {
  cohort: string;
  period: number;
  rate: number;
  retained: number;
  original: number;
  x: number;
  y: number;
}

export default function CohortRetentionHeatmap({ data, cohortDetail }: CohortRetentionHeatmapProps) {
  const { activeDrilldowns, addDrilldown, expandedChart, setExpandedChart } = useDashboard();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const validData = (data ?? []).filter(d => d?.retention?.length > 0 && d.cohort_month);
  const maxPeriods = validData.length > 0
    ? Math.max(...validData.map(d => d.retention.length))
    : 0;

  const activeDrilldown = activeDrilldowns.find(d => d.source === CHART_ID);
  const selectedCohort = activeDrilldown?.value;

  const handleCellClick = (cohortMonth: string, period: number) => {
    addDrilldown({
      source: CHART_ID,
      field: 'cohort_month',
      value: cohortMonth,
      label: `Cohort: ${cohortMonth} · M${period}`,
    });
  };

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLTableCellElement>,
    cohort: CohortRetentionMatrix,
    periodIdx: number
  ) => {
    const rate = cohort.retention[periodIdx];
    const retained = cohort.retained?.[periodIdx] ?? Math.round(rate * cohort.original_customers);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      cohort: cohort.cohort_month,
      period: periodIdx,
      rate,
      retained,
      original: cohort.original_customers,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const periodHeaders = Array.from({ length: maxPeriods }, (_, i) => `M${i}`);

  const renderGrid = (compact = false) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: `${Math.max(600, 220 + maxPeriods * 72)}px` }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)' }}>
            <th
              className="text-left text-xs font-semibold text-[var(--text-secondary)] px-4 py-2.5 whitespace-nowrap"
              style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2, minWidth: 140 }}
            >
              Cohort
            </th>
            <th
              className="text-right text-xs font-semibold text-[var(--text-secondary)] px-4 py-2.5 whitespace-nowrap"
              style={{ position: 'sticky', left: 140, background: 'var(--bg-secondary)', zIndex: 2, minWidth: 80 }}
            >
              Customers
            </th>
            {periodHeaders.map((_, i) => (
              <th
                key={i}
                className="text-center text-xs font-semibold text-[var(--text-secondary)] py-2.5"
                style={{ minWidth: 64 }}
              >
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {validData.map((cohort, rowIdx) => {
            const isDimmed = selectedCohort && selectedCohort !== cohort.cohort_month;
            return (
              <tr
                key={cohort.cohort_month}
                style={{
                  opacity: isDimmed ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                  borderBottom: rowIdx < validData.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                {/* Cohort label — sticky */}
                <td
                  className="px-4 py-1.5 text-sm font-medium text-[var(--text-primary)] whitespace-nowrap"
                  style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                >
                  {cohort.cohort_month}
                </td>
                {/* Customer count — sticky */}
                <td
                  className="px-4 py-1.5 text-sm text-right text-[var(--text-secondary)] whitespace-nowrap"
                  style={{ position: 'sticky', left: 140, background: 'white', zIndex: 1 }}
                >
                  {cohort.original_customers.toLocaleString('en-IN')}
                </td>
                {/* Retention cells */}
                {Array.from({ length: maxPeriods }, (_, periodIdx) => {
                  const rate = cohort.retention[periodIdx];
                  if (rate === undefined) {
                    return (
                      <td key={periodIdx} style={{ minWidth: 64, padding: '4px 2px' }} />
                    );
                  }
                  const bg = getRetentionColor(rate);
                  const color = getTextColor(rate);
                  const pct = Math.round(rate * 100);
                  return (
                    <td
                      key={periodIdx}
                      style={{ minWidth: 64, padding: compact ? '3px 2px' : '4px 2px', cursor: 'pointer' }}
                      onClick={() => handleCellClick(cohort.cohort_month, periodIdx)}
                      onMouseEnter={(e) => handleMouseEnter(e, cohort, periodIdx)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        style={{
                          background: bg,
                          color,
                          borderRadius: 4,
                          padding: compact ? '4px 6px' : '6px 8px',
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: 500,
                          lineHeight: 1,
                          transition: 'opacity 0.1s',
                        }}
                        className="hover:opacity-80"
                      >
                        {pct}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (expandedChart === CHART_ID) {
    return (
      <>
        <CohortCard
          validData={validData}
          renderGrid={renderGrid}
          onExpand={() => setExpandedChart(CHART_ID)}
          tooltip={tooltip}
        />
        <CohortExpandModal data={cohortDetail} onClose={() => setExpandedChart(null)} />
      </>
    );
  }

  return (
    <CohortCard
      validData={validData}
      renderGrid={renderGrid}
      onExpand={() => setExpandedChart(CHART_ID)}
      tooltip={tooltip}
    />
  );
}

interface CohortCardProps {
  validData: CohortRetentionMatrix[];
  renderGrid: (compact?: boolean) => React.ReactNode;
  onExpand: () => void;
  tooltip: TooltipData | null;
}

function CohortCard({ validData, renderGrid, onExpand, tooltip }: CohortCardProps) {
  // Build legend steps
  const legendSteps = [
    { rate: 0.95, label: '95%+' },
    { rate: 0.85, label: '85%' },
    { rate: 0.75, label: '75%' },
    { rate: 0.65, label: '65%' },
    { rate: 0.55, label: '55%' },
  ];

  return (
    <div className="card relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Cohort Retention Analysis
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Month-over-month retention by acquisition cohort · {validData.length} cohorts
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {renderGrid(false)}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 justify-end">
        <span className="text-xs text-[var(--text-tertiary)] mr-1">Retention:</span>
        {legendSteps.map(step => (
          <div key={step.rate} className="flex items-center gap-1">
            <div
              style={{ width: 16, height: 16, borderRadius: 3, background: getRetentionColor(step.rate) }}
            />
            <span className="text-xs text-[var(--text-secondary)]">{step.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-1">
          <div style={{ width: 16, height: 16, borderRadius: 3, background: '#eef5fb', border: '1px solid #e2e8f0' }} />
          <span className="text-xs text-[var(--text-secondary)]">{'<50%'}</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          <div
            className="bg-[#1a3a5c] text-white rounded-lg shadow-xl text-xs leading-relaxed"
            style={{ padding: '8px 12px', minWidth: 200, whiteSpace: 'nowrap' }}
          >
            <div className="font-semibold mb-1">{tooltip.cohort} — Month {tooltip.period}</div>
            <div>{Math.round(tooltip.rate * 100)}% retained ({tooltip.retained.toLocaleString('en-IN')} of {tooltip.original.toLocaleString('en-IN')})</div>
            <div className="text-blue-200 mt-0.5">
              Drop from M0: {tooltip.period === 0 ? '—' : `−${Math.round((1 - tooltip.rate) * 100)} pp`}
            </div>
          </div>
          {/* Arrow */}
          <div
            className="mx-auto"
            style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1a3a5c',
              marginLeft: 'calc(50% - 6px)',
            }}
          />
        </div>
      )}
    </div>
  );
}
