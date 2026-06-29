'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelMarkdownQueueItem } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  items: PriceIntelMarkdownQueueItem[];
}

interface CadenceBucket {
  label: string;
  count: number;
  revenueAtRisk: number;
  avgDepth: number;
}

function buildCadenceData(items: PriceIntelMarkdownQueueItem[]): CadenceBucket[] {
  const buckets: Record<string, PriceIntelMarkdownQueueItem[]> = {
    '0–7d':  [],
    '8–14d': [],
    '15–21d':[],
    '22–30d':[],
    '30d+':  [],
  };

  for (const item of items) {
    const d = item.days_remaining;
    if (d <= 7)       buckets['0–7d'].push(item);
    else if (d <= 14) buckets['8–14d'].push(item);
    else if (d <= 21) buckets['15–21d'].push(item);
    else if (d <= 30) buckets['22–30d'].push(item);
    else              buckets['30d+'].push(item);
  }

  return Object.entries(buckets).map(([label, arr]) => ({
    label,
    count: arr.length,
    // Keep raw money (USD or INR units depending on tenant); formatter handles scaling.
    revenueAtRisk: arr.reduce((s, i) => s + i.revenue_at_risk_inr, 0),
    avgDepth: arr.length > 0 ? arr.reduce((s, i) => s + i.recommended_depth_pct, 0) / arr.length : 0,
  }));
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const count = payload.find((p) => p.dataKey === 'count');
  const rev = payload.find((p) => p.dataKey === 'revenueAtRisk');
  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {count && <p className="text-[var(--text-secondary)]">{count.value} SKUs</p>}
      {rev && <p className="text-rose-600">{formatMoneyAuto(rev.value)} at risk</p>}
    </div>
  );
};

export default function MarkdownCadenceChart({ items }: Props) {
  const data = buildCadenceData(items);

  return (
    <PriceIntelChartCard
      data={data as unknown as Record<string, unknown>[]}
      id="price-intel-markdown-cadence"
      title="Markdown Cadence"
      subtitle="SKUs by decision window remaining"
      height={240}
      exportFilename="price_intel_markdown_cadence"
      isEmpty={items.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={36}
          />
          <YAxis
            yAxisId="count"
            orientation="left"
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="rev"
            orientation="right"
            tickFormatter={(v: number) => formatMoneyAuto(v)}
            tick={{ fontSize: 10, fill: '#111827' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar yAxisId="count" dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.label === '0–7d' ? '#F43F5E' : d.label === '8–14d' ? '#F59E0B' : '#6366F1'}
                opacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </PriceIntelChartCard>
  );
}
