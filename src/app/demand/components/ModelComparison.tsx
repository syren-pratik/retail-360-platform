'use client';

import { useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { CheckCircle2 } from 'lucide-react';

interface ModelComparisonItem {
  model: string;
  mape: number;
  accuracy: number;
  rmse: number;
  mae: number;
  trainingTime: string;
  isActive: boolean;
}

interface ModelComparisonProps {
  data: ModelComparisonItem[];
}

const MODEL_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

// Normalize metrics to 0-100 scale for radar chart
function normalizeMetrics(data: ModelComparisonItem[]) {
  const maxRMSE = Math.max(...data.map((d) => d.rmse));
  const maxMAE = Math.max(...data.map((d) => d.mae));
  const maxMAPE = Math.max(...data.map((d) => d.mape));

  return data.map((item) => ({
    model: item.model,
    // Invert error metrics so higher = better
    MAPE: 100 - ((item.mape / maxMAPE) * 100),
    Accuracy: item.accuracy,
    RMSE: 100 - ((item.rmse / maxRMSE) * 100),
    MAE: 100 - ((item.mae / maxMAE) * 100),
    isActive: item.isActive,
    original: item,
  }));
}

// Prepare data for radar chart
function prepareRadarData(data: ModelComparisonItem[]) {
  const metrics = ['MAPE', 'Accuracy', 'RMSE', 'MAE'];
  const normalized = normalizeMetrics(data);

  return metrics.map((metric) => {
    const point: Record<string, string | number> = { metric };
    normalized.forEach((item) => {
      point[item.model] = item[metric as keyof typeof item] as number;
    });
    return point;
  });
}

export default function ModelComparison({ data }: ModelComparisonProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>(data.map((d) => d.model));

  const radarData = prepareRadarData(data);
  const filteredData = data.filter((d) => selectedModels.includes(d.model));

  const toggleModel = (model: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(model)) {
        return prev.filter((m) => m !== model);
      }
      return [...prev, model];
    });
  };

  // Find best model for each metric
  const bestMAPE = data.reduce((best, d) => d.mape < best.mape ? d : best, data[0]);
  const bestAccuracy = data.reduce((best, d) => d.accuracy > best.accuracy ? d : best, data[0]);
  const bestRMSE = data.reduce((best, d) => d.rmse < best.rmse ? d : best, data[0]);

  return (
    <div className="h-full flex flex-col">
      {/* Model toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {data.map((model, index) => (
          <button
            key={model.model}
            onClick={() => toggleModel(model.model)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
              selectedModels.includes(model.model)
                ? 'border-transparent text-white'
                : 'border-[var(--border-default)] bg-white text-[var(--text-secondary)]'
            }`}
            style={selectedModels.includes(model.model) ? { backgroundColor: MODEL_COLORS[index] } : undefined}
          >
            {model.isActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active Model" />
            )}
            {model.model}
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-4">
        {/* Radar Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="var(--border-subtle)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                        <p className="font-semibold mb-2">{payload[0].payload.metric}</p>
                        {payload.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.name}
                            </span>
                            <span className="font-medium">{Number(entry.value).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              />
              {filteredData.map((model) => (
                <Radar
                  key={model.model}
                  name={model.model}
                  dataKey={model.model}
                  stroke={MODEL_COLORS[data.indexOf(model)]}
                  fill={MODEL_COLORS[data.indexOf(model)]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Metrics table */}
        <div className="w-72 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 font-medium text-[var(--text-tertiary)]">Model</th>
                <th className="text-right py-2 font-medium text-[var(--text-tertiary)]">MAPE</th>
                <th className="text-right py-2 font-medium text-[var(--text-tertiary)]">Accuracy</th>
                <th className="text-right py-2 font-medium text-[var(--text-tertiary)]">RMSE</th>
              </tr>
            </thead>
            <tbody>
              {data.map((model) => (
                <tr key={model.model} className="border-b border-[var(--border-subtle)]">
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      {model.isActive && (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      )}
                      <span className={model.isActive ? 'font-medium' : ''}>{model.model}</span>
                    </div>
                  </td>
                  <td className={`text-right py-2 ${model === bestMAPE ? 'font-bold text-emerald-600' : ''}`}>
                    {model.mape}%
                  </td>
                  <td className={`text-right py-2 ${model === bestAccuracy ? 'font-bold text-emerald-600' : ''}`}>
                    {model.accuracy}%
                  </td>
                  <td className={`text-right py-2 ${model === bestRMSE ? 'font-bold text-emerald-600' : ''}`}>
                    {model.rmse}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
