'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelBrandVsPLRow } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  rows: PriceIntelBrandVsPLRow[];
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PriceIntelBrandVsPLRow }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-medium text-[var(--text-primary)]">{d.department}</p>
      <p className="text-[var(--text-secondary)]">
        Brand: {d.brand_margin_pct}% · {formatMoneyAuto(d.brand_revenue_usd)}
      </p>
      <p className="text-[var(--text-secondary)]">
        PL: {d.pl_margin_pct}% · {formatMoneyAuto(d.pl_revenue_usd)}
      </p>
      <p className="text-emerald-700 font-medium">Gap: +{d.margin_gap_pp}pp PL advantage</p>
      <p className="text-[var(--text-tertiary)]">
        PL penetration: {d.pl_penetration_pct}%
      </p>
    </div>
  );
};

export default function PriceIntelBrandVsPLGap({ rows }: Props) {
  return (
    <PriceIntelChartCard
      id="brand_vs_pl_gap"
      title="Brand vs Private Label"
      subtitle="Margin gap · revenue share"
      data={rows as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 40, left: 8, bottom: 4 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="department"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-secondary)' }} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
            iconType="circle"
          />
          <Bar
            dataKey="brand_margin_pct"
            name="Brand margin %"
            fill="#0D9488"
            radius={[0, 3, 3, 0]}
            barSize={10}
          />
          <Bar
            dataKey="pl_margin_pct"
            name="PL margin %"
            fill="#10B981"
            radius={[0, 3, 3, 0]}
            barSize={10}
          >
            <LabelList
              dataKey="margin_gap_pp"
              position="right"
              formatter={(v) => `+${v}pp`}
              style={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
