'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

function mapeColor(v: number): string {
  if (v <= 14) return 'var(--chart-emerald)';
  if (v <= 17) return 'var(--chart-amber)';
  return 'var(--chart-rose)';
}

const OVERALL_AVG = 15.9;

const INSIGHTS = [
  {
    headline: 'Velocity class drives most accuracy variance',
    detail:
      'Class C SKUs have 28% higher MAPE than Class A. The primary accuracy improvement lever is class-specific models.',
    severity: 'warning' as const,
  },
  {
    headline: 'Dark Store format most predictable',
    detail:
      'Dark Store MAPE of 15.1% vs Supermarket 16.2%. Controlled fulfillment environment reduces variability.',
    severity: 'positive' as const,
  },
  {
    headline: 'Festival period accuracy is excellent',
    detail:
      'Only 0.14pp difference between festival and non-festival MAPE. Festival feature engineering is working.',
    severity: 'positive' as const,
  },
  {
    headline: 'Personal Care needs category-specific attention',
    detail:
      '18.4% MAPE is significantly above average. New product launches and competitor activity drive volatility.',
    severity: 'warning' as const,
  },
];

interface Props {
  core: MerchDemandFullPayload;
}

export default function ByDimensionTab({ }: Props) {
  const velocityData = useMemo(
    () => [
      { name: 'Class A', mape: 13.8, skus: 72, bias: -0.8 },
      { name: 'Class B', mape: 14.9, skus: 89, bias: -1.2 },
      { name: 'Class C', mape: 17.7, skus: 39, bias: -1.8 },
    ],
    [],
  );

  const storeTypeData = useMemo(
    () => [
      { name: 'Dark Store', mape: 15.1 },
      { name: 'Express', mape: 15.7 },
      { name: 'Hypermarket', mape: 16.0 },
      { name: 'Supermarket', mape: 16.2 },
    ],
    [],
  );

  const deptData = useMemo(
    () =>
      [
        { name: 'Beverages', mape: 14.3 },
        { name: 'Dairy & Frozen', mape: 15.1 },
        { name: 'Snacks & Biscuits', mape: 15.8 },
        { name: 'Grocery & Staples', mape: 16.2 },
        { name: 'Personal Care', mape: 18.4 },
      ].sort((a, b) => a.mape - b.mape),
    [],
  );

  const festivalData = useMemo(
    () => [
      { name: 'Festival period', mape: 15.987 },
      { name: 'Non-festival', mape: 15.849 },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* CHART 1 — By velocity class */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Accuracy by Velocity Class
            </p>
            <AIInsightButton id="merch-dd-accuracy-by-velocity-class" title="Accuracy by Velocity Class" data={velocityData as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            High-velocity SKUs are easier to forecast accurately
          </p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={velocityData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="40%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={[10, 22]}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'MAPE']}
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    const d = velocityData.find((x) => x.name === label);
                    return (
                      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
                        <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                          {label}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          MAPE: {Number(payload[0]?.value ?? 0).toFixed(1)}%
                        </p>
                        {d && (
                          <>
                            <p className="text-xs text-[var(--text-secondary)]">
                              SKUs: {d.skus}
                            </p>
                            <p className="text-xs text-amber-600">
                              Bias: {d.bias > 0 ? '+' : ''}
                              {d.bias.toFixed(1)}%
                            </p>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={OVERALL_AVG}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Overall avg',
                    position: 'right',
                    fontSize: 9,
                    fill: '#94A3B8',
                  }}
                />
                <Bar dataKey="mape" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {velocityData.map((entry, i) => (
                    <Cell key={i} fill={mapeColor(entry.mape)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Sub-labels */}
          <div className="flex justify-around mt-2">
            {velocityData.map((d) => (
              <div key={d.name} className="text-center">
                <p className="text-[10px] text-[var(--text-tertiary)]">{d.skus} SKUs</p>
                <p className="text-[10px] text-amber-600">
                  Bias: {d.bias > 0 ? '+' : ''}
                  {d.bias.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-[10px] text-amber-700">
              Class C SKUs (low velocity) have 28% higher error than Class A. Consider
              class-specific models.
            </p>
          </div>
        </div>

        {/* CHART 2 — By store type */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Accuracy by Store Format
            </p>
            <AIInsightButton id="merch-dd-accuracy-by-store-format" title="Accuracy by Store Format" data={storeTypeData as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Controlled fulfillment environments yield better accuracy
          </p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={storeTypeData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="40%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={[13, 18]}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'MAPE']}
                  contentStyle={{ fontSize: 11 }}
                />
                <ReferenceLine
                  y={OVERALL_AVG}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Overall avg',
                    position: 'right',
                    fontSize: 9,
                    fill: '#94A3B8',
                  }}
                />
                <Bar dataKey="mape" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {storeTypeData.map((entry, i) => (
                    <Cell key={i} fill={mapeColor(entry.mape)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-[10px] text-emerald-700">
              Dark Store accuracy best at 15.1% MAPE — predictable demand patterns from
              dark/quick-commerce fulfillment.
            </p>
          </div>
        </div>

        {/* CHART 3 — By department (horizontal) */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Accuracy by Department
            </p>
            <AIInsightButton id="merch-dd-accuracy-by-department" title="Accuracy by Department" data={deptData as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Sorted best to worst — green below average, red above
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptData}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                  tickLine={false}
                  domain={[10, 22]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'MAPE']}
                  contentStyle={{ fontSize: 11 }}
                />
                <ReferenceLine
                  x={OVERALL_AVG}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Avg',
                    position: 'top',
                    fontSize: 9,
                    fill: '#94A3B8',
                  }}
                />
                <Bar dataKey="mape" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {deptData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.mape < OVERALL_AVG ? 'var(--chart-emerald)' : 'var(--chart-rose)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-2 bg-rose-50 rounded-lg border border-rose-100">
            <p className="text-[10px] text-rose-700">
              Personal Care 18.4% MAPE is the highest-error department. New launches and competitor
              promotions drive volatility.
            </p>
          </div>
        </div>

        {/* CHART 4 — Festival vs non-festival */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Festival vs Non-Festival Accuracy
            </p>
            <AIInsightButton id="merch-dd-festival-vs-non-festival" title="Festival vs Non-Festival Accuracy" data={festivalData as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Model handles festival seasonality with minimal accuracy degradation
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={festivalData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="50%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  domain={[15.5, 16.5]}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${Number(v).toFixed(3)}%`, 'MAPE']}
                  contentStyle={{ fontSize: 11 }}
                />
                <ReferenceLine
                  y={OVERALL_AVG}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Overall avg',
                    position: 'right',
                    fontSize: 9,
                    fill: '#94A3B8',
                  }}
                />
                <Bar dataKey="mape" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {festivalData.map((entry, i) => (
                    <Cell key={i} fill={mapeColor(entry.mape)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-[10px] text-emerald-700">
              Festival accuracy nearly identical to non-festival (15.987% vs 15.849%, only 0.14pp
              gap) — model handles festival seasonality well.
            </p>
          </div>
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
