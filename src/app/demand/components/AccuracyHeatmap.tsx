'use client';

import { DepartmentAccuracy } from '@/app/lib/demand-types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AccuracyHeatmapProps {
  data: DepartmentAccuracy[];
  onDepartmentClick?: (department: string) => void;
}

export default function AccuracyHeatmap({ data, onDepartmentClick }: AccuracyHeatmapProps) {
  // Sort by accuracy descending
  const sortedData = [...data].sort((a, b) => b.accuracy - a.accuracy);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'bg-emerald-100 text-emerald-800';
    if (accuracy >= 92) return 'bg-emerald-50 text-emerald-700';
    if (accuracy >= 90) return 'bg-amber-50 text-amber-700';
    if (accuracy >= 88) return 'bg-amber-100 text-amber-800';
    return 'bg-red-50 text-red-700';
  };

  const getMAPEColor = (mape: number) => {
    if (mape <= 6) return 'text-emerald-600';
    if (mape <= 8) return 'text-emerald-500';
    if (mape <= 10) return 'text-amber-600';
    if (mape <= 12) return 'text-amber-700';
    return 'text-red-600';
  };

  const getBiasColor = (bias: number) => {
    const absBias = Math.abs(bias);
    if (absBias <= 2) return 'text-emerald-600';
    if (absBias <= 4) return 'text-amber-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0.5) return <TrendingUp size={14} className="text-emerald-500" />;
    if (trend < -0.5) return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-[var(--text-tertiary)]" />;
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[var(--bg-tertiary)]">
          <tr>
            <th className="text-left py-2 px-3 font-medium text-[var(--text-secondary)]">Department</th>
            <th className="text-center py-2 px-3 font-medium text-[var(--text-secondary)]">Accuracy</th>
            <th className="text-center py-2 px-3 font-medium text-[var(--text-secondary)]">MAPE</th>
            <th className="text-center py-2 px-3 font-medium text-[var(--text-secondary)]">Bias</th>
            <th className="text-center py-2 px-3 font-medium text-[var(--text-secondary)]">SKUs</th>
            <th className="text-center py-2 px-3 font-medium text-[var(--text-secondary)]">Trend</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((dept) => (
            <tr
              key={dept.department}
              className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
              onClick={() => onDepartmentClick?.(dept.department)}
            >
              <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                {dept.department}
              </td>
              <td className="py-2.5 px-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getAccuracyColor(dept.accuracy)}`}>
                  {dept.accuracy.toFixed(1)}%
                </span>
              </td>
              <td className={`py-2.5 px-3 text-center font-medium ${getMAPEColor(dept.mape)}`}>
                {dept.mape.toFixed(1)}%
              </td>
              <td className={`py-2.5 px-3 text-center font-medium ${getBiasColor(dept.bias)}`}>
                {dept.bias > 0 ? '+' : ''}{dept.bias.toFixed(1)}%
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--text-secondary)]">
                {dept.skuCount.toLocaleString()}
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center justify-center gap-1">
                  {getTrendIcon(dept.trend)}
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {dept.trend > 0 ? '+' : ''}{dept.trend.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
