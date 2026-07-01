'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';

interface SizeCurveGridRow {
  style_id: string;
  style_name: string;
  sizes: string[];
  forecast_units_per_size: number[];
  actual_units_per_size: number[];
  broken_size_flags: boolean[];
}

interface Props {
  grid: SizeCurveGridRow;
}

export default function MerchSizeCurveForecast({ grid }: Props) {
  const data = grid.sizes.map((size, i) => ({
    size,
    forecast: grid.forecast_units_per_size[i] ?? 0,
    actual: grid.actual_units_per_size[i] ?? 0,
    broken: grid.broken_size_flags[i] ?? false,
    delta_pct: grid.forecast_units_per_size[i]
      ? Math.round(((grid.actual_units_per_size[i] - grid.forecast_units_per_size[i]) / grid.forecast_units_per_size[i]) * 100)
      : 0,
  }));

  return (
    <div className="card p-4 flex flex-col">
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)]">Size-Curve Forecast</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          {grid.style_name} · bell-curve forecast vs actual · broken sizes flagged
        </p>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="size" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              content={(props) => {
                const tp = props as unknown as { active?: boolean; payload?: Array<{ payload: typeof data[0] }> };
                if (!tp.active || !tp.payload?.length) return null;
                const d = tp.payload[0].payload;
                return (
                  <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-md text-xs">
                    <p className="font-medium">Size {d.size}</p>
                    <p className="text-[var(--text-secondary)]">Forecast: {d.forecast}</p>
                    <p className="text-[var(--text-secondary)]">Actual: {d.actual}</p>
                    <p className={d.broken ? 'text-rose-600 font-medium' : 'text-[var(--text-tertiary)]'}>
                      Δ {d.delta_pct >= 0 ? '+' : ''}{d.delta_pct}%{d.broken ? ' · broken' : ''}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="actual" fill="#10B981" name="Actual" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="forecast" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Forecast" />
            {data.map((d, i) => (d.broken ? <ReferenceDot key={i} x={d.size} y={d.actual} r={5} fill="#EF4444" stroke="white" /> : null))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
