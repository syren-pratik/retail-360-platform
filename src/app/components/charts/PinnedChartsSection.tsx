'use client';

import { useState, useEffect } from 'react';
import { Pin, X, Sparkles } from 'lucide-react';
import { getPinnedCharts, unpinChart, PinnedChart } from '@/app/lib/pinned-charts';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PinnedChartsSectionProps {
  section: 'after_kpis' | 'after_churn' | 'after_cohort' | 'bottom';
  module?: 'cx360' | 'demand';
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#22C55E'];

// Format numbers for display
const formatValue = (value: unknown, key?: string): string => {
  if (typeof value !== 'number') return String(value);

  // Check if it's a rate/percentage (0-1 range)
  if (key?.includes('rate') || key?.includes('prob') || (value > 0 && value < 1)) {
    return `${(value * 100).toFixed(1)}%`;
  }

  // Check if it's currency-like
  if (key?.includes('clv') || key?.includes('spend') || key?.includes('revenue') || value > 1000) {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  return value.toLocaleString('en-IN');
};

// Render chart based on type
function renderChart(chart: PinnedChart) {
  const { chart_type, data, config } = chart;

  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[var(--text-tertiary)]">
        No data available
      </div>
    );
  }

  switch (chart_type) {
    case 'bar_chart':
    case 'grouped_bar':
    case 'stacked_bar':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data as Record<string, unknown>[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey={config.x_key}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatValue(v, config.y_key)}
            />
            <Tooltip
              formatter={(value) => formatValue(value, config.y_key)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey={config.y_key}
              fill="#6366F1"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'horizontal_bar':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data as Record<string, unknown>[]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatValue(v, config.y_key)}
            />
            <YAxis
              type="category"
              dataKey={config.x_key}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value) => formatValue(value, config.y_key)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey={config.y_key}
              fill="#6366F1"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line_chart':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data as Record<string, unknown>[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey={config.x_key}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatValue(v, config.y_key)}
            />
            <Tooltip
              formatter={(value) => formatValue(value, config.y_key)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey={config.y_key}
              stroke="#6366F1"
              strokeWidth={2}
              dot={{ fill: '#6366F1', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area_chart':
      const areaYKey = config.y_key || 'value';
      return (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data as Record<string, unknown>[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey={config.x_key || 'name'}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatValue(v, areaYKey)}
            />
            <Tooltip
              formatter={(value) => formatValue(value, areaYKey)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey={areaYKey}
              stroke="#6366F1"
              fill="#6366F1"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'scatter_chart':
      const scatterXKey = config.x_key || 'x';
      const scatterYKey = config.y_key || 'y';
      return (
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey={scatterXKey}
              name={scatterXKey}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey={scatterYKey}
              name={scatterYKey}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
            />
            <ZAxis range={[50, 200]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Scatter
              data={data as Record<string, unknown>[]}
              fill="#6366F1"
            />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case 'donut_chart':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data as Record<string, unknown>[]}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey={config.value_key}
              nameKey={config.name_key}
            >
              {(data as Record<string, unknown>[]).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatValue(value, config.value_key)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'data_table':
      const columns = config.columns as string[] || Object.keys(data[0] as object);
      return (
        <div className="max-h-[200px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-2 py-1.5 text-left font-medium text-[var(--text-secondary)] border-b">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data as Record<string, unknown>[]).slice(0, 10).map((row, idx) => (
                <tr key={idx} className="border-b border-[var(--border-subtle)]">
                  {columns.map((col) => (
                    <td key={col} className="px-2 py-1.5 text-[var(--text-primary)]">
                      {formatValue(row[col], col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'kpi_card':
      return (
        <div className="text-center py-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1">{config.label}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{config.value}</p>
          {config.change && (
            <p className={`text-xs mt-1 ${
              config.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {config.change}
            </p>
          )}
        </div>
      );

    case 'heatmap':
    case 'treemap':
      // For complex chart types, fall back to data table display
      const fallbackColumns = config.columns as string[] || Object.keys(data[0] as object);
      return (
        <div className="max-h-[200px] overflow-auto">
          <div className="text-xs text-[var(--text-tertiary)] mb-2">
            ({chart_type} displayed as table)
          </div>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr>
                {fallbackColumns.map((col) => (
                  <th key={col} className="px-2 py-1.5 text-left font-medium text-[var(--text-secondary)] border-b">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data as Record<string, unknown>[]).slice(0, 10).map((row, idx) => (
                <tr key={idx} className="border-b border-[var(--border-subtle)]">
                  {fallbackColumns.map((col) => (
                    <td key={col} className="px-2 py-1.5 text-[var(--text-primary)]">
                      {formatValue(row[col], col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      // Try to render as bar chart for unknown types
      if (config.x_key && config.y_key) {
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data as Record<string, unknown>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey={config.x_key}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey={config.y_key}
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      // Final fallback: show as data table
      const defaultColumns = Object.keys(data[0] as object);
      return (
        <div className="max-h-[200px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr>
                {defaultColumns.map((col) => (
                  <th key={col} className="px-2 py-1.5 text-left font-medium text-[var(--text-secondary)] border-b">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data as Record<string, unknown>[]).slice(0, 10).map((row, idx) => (
                <tr key={idx} className="border-b border-[var(--border-subtle)]">
                  {defaultColumns.map((col) => (
                    <td key={col} className="px-2 py-1.5 text-[var(--text-primary)]">
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
}

// Individual pinned chart card
function PinnedChartCard({ chart, onUnpin }: { chart: PinnedChart; onUnpin: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`card relative ${chart.size === 'full' ? 'col-span-2' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {chart.title}
          </h3>
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            <Sparkles size={10} />
            AI-generated
          </span>
        </div>

        {/* Actions (show on hover) */}
        {isHovered && (
          <div className="flex items-center gap-1">
            <button
              onClick={onUnpin}
              className="p-1 rounded hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-600 transition-colors"
              title="Unpin chart"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      {renderChart(chart)}

      {/* Pinned indicator */}
      <div className="absolute top-2 right-2 opacity-30">
        <Pin size={12} className="text-indigo-600" />
      </div>
    </div>
  );
}

export default function PinnedChartsSection({ section, module = 'cx360' }: PinnedChartsSectionProps) {
  const [charts, setCharts] = useState<PinnedChart[]>([]);

  // Load pinned charts
  useEffect(() => {
    const loadCharts = () => {
      const allCharts = getPinnedCharts(module);
      const sectionCharts = allCharts.filter((c) => c.section === section);
      setCharts(sectionCharts);
    };

    loadCharts();

    // Listen for changes
    const handleChange = () => {
      loadCharts();
    };

    window.addEventListener('pinnedChartsChanged', handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener('pinnedChartsChanged', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, [section, module]);

  // Handle unpin
  const handleUnpin = (chartId: string) => {
    unpinChart(chartId);
    setCharts((prev) => prev.filter((c) => c.id !== chartId));
  };

  if (charts.length === 0) {
    return null;
  }

  return (
    <section className="grid grid-cols-2 gap-4">
      {charts.map((chart) => (
        <PinnedChartCard
          key={chart.id}
          chart={chart}
          onUnpin={() => handleUnpin(chart.id)}
        />
      ))}
    </section>
  );
}
