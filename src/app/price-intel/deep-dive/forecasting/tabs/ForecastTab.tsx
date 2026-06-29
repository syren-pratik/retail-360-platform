'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props { core: PriceIntelCore }

type Zoom = '4W' | '8W' | '14W';

export default function ForecastTab({ core }: Props) {
  const [zoom, setZoom] = useState<Zoom>('14W');
  const [showMargin, setShowMargin] = useState(true);
  const [showCI, setShowCI] = useState(true);
  const [showFestivals, setShowFestivals] = useState(true);
  const [showSpend, setShowSpend] = useState(false);

  const zoomCount: Record<Zoom, number> = { '4W': 4, '8W': 8, '14W': 14 };
  const data = core.forecast_14w.slice(0, zoomCount[zoom]);

  const chartData = data.map((d) => ({
    ...d,
    ci_band: [d.lower_ci_inr, d.upper_ci_inr],
    ci_diff: d.upper_ci_inr - d.lower_ci_inr,
  }));

  const totalRevenue = core.forecast_14w.reduce((s, d) => s + d.forecast_revenue_inr, 0);
  const totalMargin = core.forecast_14w.reduce((s, d) => s + d.forecast_margin_inr, 0);

  const exportCSV = () => {
    const header = 'Week,Week Label,Forecast Revenue,Forecast Margin,Lower CI,Upper CI,Seasonality,Event';
    const rows = core.forecast_14w.map((d) =>
      [d.week, d.week_label, d.forecast_revenue_inr, d.forecast_margin_inr, d.lower_ci_inr, d.upper_ci_inr, d.seasonality_index, d.event_label ?? ''].join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'price-intel-forecast.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-8 py-6">
      {/* Controls */}
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          {(['4W', '8W', '14W'] as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                zoom === z ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          {([
            { key: 'showMargin', label: 'Margin line', val: showMargin, set: setShowMargin },
            { key: 'showCI', label: 'CI band', val: showCI, set: setShowCI },
            { key: 'showFestivals', label: 'Festivals', val: showFestivals, set: setShowFestivals },
            { key: 'showSpend', label: 'Campaign spend', val: showSpend, set: setShowSpend },
          ] as Array<{ key: string; label: string; val: boolean; set: (v: boolean) => void }>).map((o) => (
            <label key={o.key} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={o.val} onChange={(e) => o.set(e.target.checked)} className="rounded" />
              {o.label}
            </label>
          ))}
        </div>
        <button onClick={exportCSV} className="ml-auto text-xs px-3 py-1.5 border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
          ↓ Export CSV
        </button>
      </div>

      <div className="card p-6 mb-6">
        <div style={{ height: 560 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
              <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <YAxis yAxisId="rev" tickFormatter={(v: number) => formatMoneyAuto(v)} tick={{ fontSize: 11, fill: '#111827' }} stroke="#D1D5DB" />
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                formatter={(v: unknown, name: unknown): [string, string] => {
                  const num = v as number;
                  if (name === 'forecast_revenue_inr') return [formatMoneyAuto(num), 'Revenue'];
                  if (name === 'forecast_margin_inr') return [formatMoneyAuto(num), 'Margin'];
                  if (name === 'lower_ci_inr') return [formatMoneyAuto(num), 'Lower CI'];
                  if (name === 'upper_ci_inr') return [formatMoneyAuto(num), 'Upper CI'];
                  return [String(num), String(name)];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {showCI && <Area yAxisId="rev" dataKey="lower_ci_inr" fill="#C7D2FE" stroke="none" name="Lower CI" />}
              {showCI && <Area yAxisId="rev" dataKey="upper_ci_inr" fill="#C7D2FE" stroke="none" fillOpacity={0} name="Upper CI" />}
              <Line yAxisId="rev" dataKey="forecast_revenue_inr" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 3 }} name="forecast_revenue_inr" />
              {showMargin && <Line yAxisId="rev" dataKey="forecast_margin_inr" stroke="#10B981" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="forecast_margin_inr" />}
              {showFestivals && chartData.filter((d) => d.event_label).map((d) => (
                <ReferenceLine key={d.week_label} yAxisId="rev" x={d.week_label} stroke="#F59E0B" strokeDasharray="4 2" label={{ value: d.event_label ?? '', position: 'top', fontSize: 9, fill: '#F59E0B' }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">14-Week Forecast Table</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            14W total revenue: {formatMoneyAuto(totalRevenue)} · margin: {formatMoneyAuto(totalMargin)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                {['Week', 'Forecast Revenue', 'Forecast Margin', 'Lower CI', 'Upper CI', 'Seasonality', 'Event'].map((h) => (
                  <th key={h} className="text-right first:text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {core.forecast_14w.map((d) => (
                <tr key={d.week} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{d.week_label}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-primary)]">{formatMoneyAuto(d.forecast_revenue_inr)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600">{formatMoneyAuto(d.forecast_margin_inr)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{formatMoneyAuto(d.lower_ci_inr)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{formatMoneyAuto(d.upper_ci_inr)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--text-secondary)]">{d.seasonality_index.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {d.event_label ? (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-medium">{d.event_label}</span>
                    ) : '—'}
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
