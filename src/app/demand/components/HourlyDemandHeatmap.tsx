'use client';

import { useState } from 'react';
import { useDemand } from '@/app/context/DemandContext';

interface HourlyDataPoint {
  day: string;
  hour: number;
  value: number;
}

interface HourlyDemandHeatmapProps {
  data: HourlyDataPoint[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6AM to 10PM

function getIntensityColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);

  if (normalized < 0.2) return 'bg-blue-50';
  if (normalized < 0.4) return 'bg-blue-100';
  if (normalized < 0.6) return 'bg-blue-200';
  if (normalized < 0.8) return 'bg-blue-400';
  return 'bg-blue-600';
}

function getTextColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  return normalized > 0.6 ? 'text-white' : 'text-[var(--text-secondary)]';
}

function formatHour(hour: number): string {
  if (hour === 12) return '12PM';
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

export default function HourlyDemandHeatmap({ data }: HourlyDemandHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number } | null>(null);
  const { addDrilldown } = useDemand();

  // Create lookup map
  const dataMap = new Map<string, number>();
  data.forEach((d) => {
    dataMap.set(`${d.day}-${d.hour}`, d.value);
  });

  // Calculate min/max for intensity
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const handleCellClick = (day: string, hour: number) => {
    addDrilldown({
      source: 'hourly-heatmap',
      field: 'day_hour',
      value: `${day}-${hour}`,
      label: `${day} ${formatHour(hour)}`,
    });
  };

  const getValue = (day: string, hour: number): number => {
    return dataMap.get(`${day}-${hour}`) || 0;
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1.5 text-left font-medium text-[var(--text-tertiary)] w-20">Day</th>
            {HOURS.map((hour) => (
              <th key={hour} className="p-1 text-center font-medium text-[var(--text-tertiary)] min-w-[40px]">
                {formatHour(hour)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <td className="p-1.5 font-medium text-[var(--text-secondary)]">{day.slice(0, 3)}</td>
              {HOURS.map((hour) => {
                const value = getValue(day, hour);
                const isHovered = hoveredCell?.day === day && hoveredCell?.hour === hour;
                const showValue = value > (maxValue * 0.3) || isHovered;

                return (
                  <td
                    key={hour}
                    className={`
                      p-1 text-center cursor-pointer transition-all relative
                      ${getIntensityColor(value, minValue, maxValue)}
                      ${isHovered ? 'ring-2 ring-[var(--accent-primary)] z-10' : ''}
                    `}
                    onMouseEnter={() => setHoveredCell({ day, hour })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(day, hour)}
                  >
                    <span className={`text-[10px] ${getTextColor(value, minValue, maxValue)}`}>
                      {showValue ? (value / 1000).toFixed(1) + 'K' : ''}
                    </span>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--text-primary)] text-white rounded text-xs whitespace-nowrap">
                        <div className="font-medium">{day} {formatHour(hour)}</div>
                        <div>{value.toLocaleString('en-IN')} units</div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-[var(--text-tertiary)]">
        <span>Low</span>
        <div className="flex">
          <div className="w-5 h-3 bg-blue-50" />
          <div className="w-5 h-3 bg-blue-100" />
          <div className="w-5 h-3 bg-blue-200" />
          <div className="w-5 h-3 bg-blue-400" />
          <div className="w-5 h-3 bg-blue-600" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
