'use client';

import { useState } from 'react';
import { Check, BarChart3, PieChart, Table2, TrendingUp, Layers, Grid3X3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// ============================================================================
// TYPES
// ============================================================================

export interface ChartOptionData {
  option_id: string;
  chart_type: string;
  title: string;
  description: string;
  axes: { x?: string; y?: string; color?: string };
  preview_data: Record<string, unknown>[];
  full_data: Record<string, unknown>[];
  config: Record<string, unknown>;
}

interface ChartOptionsSelectorProps {
  question: string;
  dataSummary: string;
  options: ChartOptionData[];
  onSelect: (option: ChartOptionData) => void;
}

// ============================================================================
// CHART ICON MAP
// ============================================================================

const CHART_ICONS: Record<string, React.ReactNode> = {
  bar_chart: <BarChart3 size={16} />,
  horizontal_bar: <BarChart3 size={16} className="rotate-90" />,
  line_chart: <TrendingUp size={16} />,
  area_chart: <TrendingUp size={16} />,
  donut_chart: <PieChart size={16} />,
  scatter_chart: <Grid3X3 size={16} />,
  stacked_bar: <Layers size={16} />,
  grouped_bar: <BarChart3 size={16} />,
  heatmap: <Grid3X3 size={16} />,
  data_table: <Table2 size={16} />,
  kpi_card: <BarChart3 size={16} />,
  treemap: <Grid3X3 size={16} />,
};

const CHART_LABELS: Record<string, string> = {
  bar_chart: 'Bar Chart',
  horizontal_bar: 'Horizontal Bar',
  line_chart: 'Line Chart',
  area_chart: 'Area Chart',
  donut_chart: 'Donut Chart',
  scatter_chart: 'Scatter Plot',
  stacked_bar: 'Stacked Bar',
  grouped_bar: 'Grouped Bar',
  heatmap: 'Heatmap',
  data_table: 'Data Table',
  kpi_card: 'KPI Card',
  treemap: 'Treemap',
};

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6'];

// ============================================================================
// MINI PREVIEW COMPONENTS
// ============================================================================

function MiniBarChart({ data, config }: { data: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const xKey = (config.x_key as string) || Object.keys(data[0] || {})[0];
  const yKey = (config.y_key as string) || Object.keys(data[0] || {})[1];

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <Bar dataKey={yKey} fill="#6366F1" radius={[2, 2, 0, 0]} />
        <XAxis dataKey={xKey} hide />
        <YAxis hide />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MiniLineChart({ data, config }: { data: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const xKey = (config.x_key as string) || Object.keys(data[0] || {})[0];
  const yKey = (config.y_key as string) || Object.keys(data[0] || {})[1];

  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <Line type="monotone" dataKey={yKey} stroke="#6366F1" strokeWidth={2} dot={false} />
        <XAxis dataKey={xKey} hide />
        <YAxis hide />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MiniAreaChart({ data, config }: { data: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const xKey = (config.x_key as string) || Object.keys(data[0] || {})[0];
  const yKey = (config.y_key as string) || Object.keys(data[0] || {})[1];

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <Area type="monotone" dataKey={yKey} fill="#6366F1" fillOpacity={0.3} stroke="#6366F1" strokeWidth={2} />
        <XAxis dataKey={xKey} hide />
        <YAxis hide />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MiniDonutChart({ data, config }: { data: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const valueKey = (config.value_key as string) || Object.keys(data[0] || {})[1];

  return (
    <ResponsiveContainer width="100%" height={80}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={20}
          outerRadius={35}
          paddingAngle={2}
          dataKey={valueKey}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </RechartsPie>
    </ResponsiveContainer>
  );
}

function MiniDataTable({ data, config }: { data: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const columns = (config.columns as string[]) || Object.keys(data[0] || {}).slice(0, 3);

  const formatValue = (value: unknown, key: string): string => {
    if (typeof value !== 'number') return String(value);
    if (key.includes('rate') || key.includes('prob')) return `${(value * 100).toFixed(1)}%`;
    if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(1);
  };

  return (
    <div className="text-[10px] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {columns.slice(0, 3).map(col => (
              <th key={col} className="px-1 py-0.5 text-left font-medium text-[var(--text-secondary)] truncate">
                {col.replace(/_/g, ' ').slice(0, 8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 3).map((row, idx) => (
            <tr key={idx} className="border-b border-[var(--border-subtle)]">
              {columns.slice(0, 3).map(col => (
                <td key={col} className="px-1 py-0.5 text-[var(--text-primary)] truncate">
                  {formatValue(row[col], col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniChartPreview({ chartType, data, config }: { chartType: string; data: Record<string, unknown>[]; config: Record<string, unknown> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[80px] flex items-center justify-center text-[var(--text-tertiary)] text-xs">
        No preview
      </div>
    );
  }

  switch (chartType) {
    case 'bar_chart':
    case 'horizontal_bar':
    case 'stacked_bar':
    case 'grouped_bar':
      return <MiniBarChart data={data} config={config} />;
    case 'line_chart':
      return <MiniLineChart data={data} config={config} />;
    case 'area_chart':
      return <MiniAreaChart data={data} config={config} />;
    case 'donut_chart':
      return <MiniDonutChart data={data} config={config} />;
    case 'data_table':
      return <MiniDataTable data={data} config={config} />;
    default:
      return <MiniBarChart data={data} config={config} />;
  }
}

// ============================================================================
// OPTION CARD COMPONENT
// ============================================================================

function OptionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: ChartOptionData;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-light)] shadow-md'
          : 'border-[var(--border-default)] bg-white hover:border-[var(--accent-primary)] hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="flex items-center justify-center w-6 h-6 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          {CHART_ICONS[option.chart_type] || <BarChart3 size={16} />}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              {option.option_id}
            </span>
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {CHART_LABELS[option.chart_type] || option.chart_type}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
        {option.title}
      </h4>

      {/* Description */}
      <p className="text-[10px] text-[var(--text-secondary)] italic mb-2 line-clamp-2">
        Best for: {option.description}
      </p>

      {/* Axes Info */}
      <div className="flex flex-wrap gap-1 mb-2">
        {option.axes.x && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
            X: {option.axes.x.slice(0, 20)}...
          </span>
        )}
        {option.axes.y && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
            Y: {option.axes.y.slice(0, 20)}...
          </span>
        )}
      </div>

      {/* Mini Preview */}
      <div className="bg-[var(--bg-secondary)] rounded p-1 mb-2">
        <MiniChartPreview
          chartType={option.chart_type}
          data={option.preview_data}
          config={option.config}
        />
      </div>

      {/* Select Button */}
      <button
        className={`w-full py-1.5 rounded-md text-xs font-medium transition-colors ${
          isSelected
            ? 'bg-[var(--accent-primary)] text-white'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {isSelected ? (
          <span className="flex items-center justify-center gap-1">
            <Check size={12} /> Selected
          </span>
        ) : (
          'Select This'
        )}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChartOptionsSelector({
  question,
  dataSummary,
  options,
  onSelect,
}: ChartOptionsSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (option: ChartOptionData) => {
    setSelectedId(option.option_id);
    onSelect(option);
  };

  return (
    <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
      {/* Header */}
      <div className="mb-3">
        <p className="text-xs text-[var(--text-secondary)] mb-1">
          <span className="font-medium">Question:</span> {question}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          <span className="font-medium">Data:</span> {dataSummary}
        </p>
      </div>

      {/* Options Grid */}
      <div className={`grid gap-3 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {options.map((option) => (
          <OptionCard
            key={option.option_id}
            option={option}
            isSelected={selectedId === option.option_id}
            onSelect={() => handleSelect(option)}
          />
        ))}
      </div>
    </div>
  );
}
