'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface BrandPLRampPoint {
  day: number;
  brand_share_pct: number;
  pl_share_pct: number;
  dallas_baseline_pl_pct: number;
}

interface Props {
  data: BrandPLRampPoint[];
}

export default function ColdstartBrandPenetrationRamp({ data }: Props) {
  return (
    <div className="card p-4 flex flex-col">
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)]">Brand vs PL Penetration Ramp</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          Predicted PL share over 90-day launch window · Dallas baseline reference
        </p>
      </div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v: number) => `D${v}`} interval={9} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} width={40} />
            <Tooltip
              formatter={(value, name) => [`${(Number(value) * 100).toFixed(1)}%`, name]}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="brand_share_pct" stroke="#0d9488" strokeWidth={2} dot={false} name="Brand" />
            <Line type="monotone" dataKey="pl_share_pct" stroke="#10b981" strokeWidth={2} dot={false} name="Private Label" />
            <ReferenceLine y={0.28} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: 'Dallas baseline 28%', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
