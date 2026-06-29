'use client';

import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelForecastPoint } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  forecast: PriceIntelForecastPoint[];
}

function seasonalityColor(idx: number): { bg: string; text: string } {
  if (idx >= 1.15) return { bg: 'bg-violet-100', text: 'text-violet-700' };
  if (idx >= 1.05) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (idx >= 0.95) return { bg: 'bg-[var(--bg-secondary)]', text: 'text-[var(--text-secondary)]' };
  return { bg: 'bg-rose-50', text: 'text-rose-600' };
}

export default function ForecastCalendar({ forecast }: Props) {
  return (
    <PriceIntelChartCard
      data={forecast as unknown as Record<string, unknown>[]}
      id="price-intel-forecast-calendar"
      title="Event Calendar"
      subtitle="Seasonality index · events highlighted"
      height={280}
      exportFilename="price_intel_forecast_calendar"
    >
      <div className="overflow-auto h-full">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium w-12">Week</th>
              <th className="text-left py-1.5 px-2 text-[var(--text-secondary)] font-medium">Event</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium w-16">Season idx</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium w-20">Rev forecast</th>
              <th className="text-right py-1.5 px-2 text-[var(--text-secondary)] font-medium w-20">Margin</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((p) => {
              const colors = seasonalityColor(p.seasonality_index);
              const hasEvent = !!p.event_label;
              return (
                <tr
                  key={p.week}
                  className={`border-b border-[var(--border-default)] last:border-0 ${hasEvent ? 'bg-violet-50' : ''}`}
                >
                  <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">{p.week_label}</td>
                  <td className="py-1.5 px-2">
                    {hasEvent ? (
                      <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-medium">
                        {p.event_label}
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${colors.bg} ${colors.text}`}>
                      {p.seasonality_index.toFixed(2)}×
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[var(--text-primary)]">
                    {formatMoneyAuto(p.forecast_revenue_inr)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-emerald-600">
                    {formatMoneyAuto(p.forecast_margin_inr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PriceIntelChartCard>
  );
}
