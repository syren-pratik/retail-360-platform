'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface DeptCoverage {
  department: string;
  coverage_pct: number;
  target: number;
  gap_skus: number;
}

interface ABCCoverage {
  abc_class: string;
  coverage_pct: number;
  target: number;
  gap_skus: number;
}

interface SafetyStockCoverageProps {
  byDepartment: DeptCoverage[];
  byABC: ABCCoverage[];
}

type ViewMode = 'department' | 'abc';

function getBarColor(coverage: number, target: number): string {
  const ratio = coverage / target;
  if (ratio >= 1) return '#22C55E'; // Green - meeting target
  if (ratio >= 0.9) return '#F59E0B'; // Amber - close to target
  if (ratio >= 0.8) return '#EA580C'; // Orange - needs attention
  return '#DC2626'; // Red - critical
}

interface ChartTooltipData {
  name: string;
  coverage_pct: number;
  target: number;
  gap_skus: number;
}

function CustomTooltip({ active, payload, viewMode }: {
  active?: boolean;
  payload?: Array<{ payload: ChartTooltipData }>;
  viewMode: ViewMode;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const name = viewMode === 'abc' ? `Class ${data.name}` : data.name;
  const gap = (data.target ?? 0) - (data.coverage_pct ?? 0);

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3">
      <p className="font-semibold text-sm text-[var(--text-primary)] mb-2">
        {name}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-tertiary)]">Coverage:</span>
          <span className="font-medium text-[var(--text-primary)]">{data.coverage_pct}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-tertiary)]">Target:</span>
          <span className="font-medium text-[var(--text-primary)]">{data.target}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-tertiary)]">Gap:</span>
          <span className={`font-medium ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {gap > 0 ? `-${gap}%` : `+${Math.abs(gap)}%`}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-tertiary)]">SKUs Below SS:</span>
          <span className="font-medium text-red-600">{data.gap_skus}</span>
        </div>
      </div>
    </div>
  );
}

// Unified chart data type
interface ChartDataPoint {
  name: string;
  coverage_pct: number;
  target: number;
  gap_skus: number;
}

export default function SafetyStockCoverage({ byDepartment, byABC }: SafetyStockCoverageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('department');

  // Transform data to unified chart format
  const chartData: ChartDataPoint[] = viewMode === 'department'
    ? (byDepartment ?? []).map(d => ({ name: d.department ?? '', coverage_pct: d.coverage_pct ?? 0, target: d.target ?? 0, gap_skus: d.gap_skus ?? 0 }))
    : (byABC ?? []).map(d => ({ name: d.abc_class ?? '', coverage_pct: d.coverage_pct ?? 0, target: d.target ?? 0, gap_skus: d.gap_skus ?? 0 }));

  // Calculate overall coverage
  const overallCoverage = useMemo(() => {
    const total = (byDepartment ?? []).reduce((sum, d) => sum + (d.coverage_pct ?? 0), 0);
    return (total / (byDepartment?.length ?? 1)).toFixed(0);
  }, [byDepartment]);

  // Count below target
  const belowTarget = useMemo(() => {
    return (byDepartment ?? []).filter(d => (d.coverage_pct ?? 0) < (d.target ?? 0)).length;
  }, [byDepartment]);

  // Guard against null/undefined data - after all hooks
  if (!byDepartment || !Array.isArray(byDepartment) || byDepartment.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  // Format x-axis label for ABC
  const formatXLabel = (value: string) => {
    if (viewMode === 'abc') {
      return `Class ${value ?? ''}`;
    }
    return (value ?? '').length > 10 ? (value ?? '').substring(0, 8) + '...' : (value ?? '');
  };

  return (
    <ChartCard
      id="safety-stock-coverage"
      title="Safety Stock Coverage"
      subtitle={`${overallCoverage}% avg coverage • ${belowTarget} depts below target`}
      height={280}
      data={chartData as unknown as Record<string, unknown>[]}
    >
      <div className="h-full flex flex-col">
        {/* Toggle buttons */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden">
            <button
              onClick={() => setViewMode('department')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'department'
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              By Department
            </button>
            <button
              onClick={() => setViewMode('abc')}
              className={`px-3 py-1 text-xs font-medium transition-colors border-l border-[var(--border-default)] ${
                viewMode === 'abc'
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              By ABC Class
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <span className="text-[var(--text-tertiary)]">Met</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span className="text-[var(--text-tertiary)]">90%+</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-600" />
              <span className="text-[var(--text-tertiary)]">&lt;80%</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickFormatter={formatXLabel}
                angle={viewMode === 'department' ? -20 : 0}
                textAnchor={viewMode === 'department' ? 'end' : 'middle'}
              />

              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />

              {/* Target reference line at 95% (default) */}
              <ReferenceLine
                y={95}
                stroke="#6B7280"
                strokeDasharray="5 5"
                label={{ value: 'Target 95%', position: 'right', fill: '#6B7280', fontSize: 9 }}
              />

              <Tooltip content={<CustomTooltip viewMode={viewMode} />} />

              <Bar
                dataKey="coverage_pct"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {(chartData ?? []).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.coverage_pct ?? 0, entry.target ?? 0)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
