'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';

interface BrandVsPLRow {
  department: string;
  weeks: number[];
  brand_share_pct: number[];
  pl_share_pct: number[];
}

interface Props {
  rows: BrandVsPLRow[];
  plTargetPct?: number;
}

export default function MerchBrandVsPLForecastMix({ rows, plTargetPct = 28 }: Props) {
  const [selectedDept, setSelectedDept] = useState<string>(rows[0]?.department ?? 'Mens');
  const row = rows.find((r) => r.department === selectedDept) ?? rows[0];
  if (!row) return null;

  const data = row.weeks.map((w, i) => ({
    week: `W${w}`,
    brand: row.brand_share_pct[i] ?? 0,
    pl: row.pl_share_pct[i] ?? 0,
  }));

  return (
    <div className="card p-4 flex flex-col">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">Brand vs Private Label — Forecast Mix</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {selectedDept} · 14-week outlook · PL target {plTargetPct}%
          </p>
        </div>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded px-2 py-1 border border-[var(--border-default)]"
        >
          {rows.map((r) => (
            <option key={r.department} value={r.department}>{r.department}</option>
          ))}
        </select>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={32} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              content={(props) => {
                const tp = props as unknown as { active?: boolean; payload?: Array<{ payload: typeof data[0] }> };
                if (!tp.active || !tp.payload?.length) return null;
                const d = tp.payload[0].payload;
                return (
                  <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-md text-xs">
                    <p className="font-medium">{d.week}</p>
                    <p className="text-teal-700">Brand: {d.brand.toFixed(1)}%</p>
                    <p className="text-emerald-600">PL: {d.pl.toFixed(1)}%</p>
                    <p className="text-[var(--text-tertiary)]">Gap to target: {(d.pl - plTargetPct).toFixed(1)}pp</p>
                  </div>
                );
              }}
            />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="brand" stackId="mix" fill="#0D9488" stroke="#0D9488" fillOpacity={0.65} name="Brand" />
            <Area type="monotone" dataKey="pl" stackId="mix" fill="#10B981" stroke="#10B981" fillOpacity={0.65} name="Private Label" />
            <ReferenceLine y={100 - plTargetPct} stroke="#F59E0B" strokeDasharray="4 3" label={{ value: `PL target ${plTargetPct}%`, position: 'right', fontSize: 9, fill: '#F59E0B' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
