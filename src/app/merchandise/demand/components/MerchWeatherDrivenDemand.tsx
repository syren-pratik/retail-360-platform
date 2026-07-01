'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface WeatherStripPoint {
  date: string;
  temp_anom_f: number;
  precip_anom_in: number;
  demand_adj_pct: number;
}

interface Props {
  strip: WeatherStripPoint[];
}

export default function MerchWeatherDrivenDemand({ strip }: Props) {
  return (
    <div className="card p-4 flex flex-col">
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)]">Weather-Driven Demand</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          90-day temperature anomaly overlay · demand adjustment ±25% cap
        </p>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={strip} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#64748B' }}
              tickFormatter={(v: string) => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              interval={Math.floor(strip.length / 8)}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={38} label={{ value: 'Demand adj %', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94A3B8' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              content={(props) => {
                const tp = props as unknown as { active?: boolean; payload?: Array<{ payload: WeatherStripPoint }> };
                if (!tp.active || !tp.payload?.length) return null;
                const d = tp.payload[0].payload;
                return (
                  <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-md text-xs">
                    <p className="font-medium">{d.date}</p>
                    <p className="text-[var(--text-secondary)]">Temp anom: {d.temp_anom_f > 0 ? '+' : ''}{d.temp_anom_f}°F</p>
                    <p className="text-[var(--text-secondary)]">Precip anom: +{d.precip_anom_in}"</p>
                    <p className={d.demand_adj_pct >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                      Demand: {d.demand_adj_pct >= 0 ? '+' : ''}{d.demand_adj_pct}%
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine yAxisId="left" y={0} stroke="#94A3B8" strokeDasharray="3 3" />
            <Bar yAxisId="right" dataKey="temp_anom_f" fill="#F59E0B" fillOpacity={0.45} name="Temp anom °F" />
            <Line yAxisId="left" type="monotone" dataKey="demand_adj_pct" stroke="#3B82F6" strokeWidth={2} dot={false} name="Demand adj %" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
