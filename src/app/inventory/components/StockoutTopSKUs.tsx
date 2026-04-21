'use client';

import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface StockoutSKU {
  product_id: string;
  product_name: string;
  department: string;
  total_stockout_hours: number;
  events: number;
  lost_sales: number;
  affected_stores: number;
}

interface StockoutTopSKUsProps {
  data: StockoutSKU[];
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: StockoutSKU }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">
        {data.product_name}
      </p>
      <p className="text-xs text-[var(--text-tertiary)] mb-2">{data.department}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-[var(--text-tertiary)]">Lost Sales:</span>
        <span className="font-medium text-red-600">₹{((data.lost_sales ?? 0) / 100000).toFixed(1)}L</span>

        <span className="text-[var(--text-tertiary)]">Stockout Hours:</span>
        <span className="font-medium text-[var(--text-primary)]">{(data.total_stockout_hours ?? 0)}h</span>

        <span className="text-[var(--text-tertiary)]">Events:</span>
        <span className="font-medium text-[var(--text-primary)]">{(data.events ?? 0)}</span>

        <span className="text-[var(--text-tertiary)]">Stores Affected:</span>
        <span className="font-medium text-[var(--text-primary)]">{(data.affected_stores ?? 0)}</span>
      </div>
    </div>
  );
}

export default function StockoutTopSKUs({ data }: StockoutTopSKUsProps) {
  const router = useRouter();

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  // Sort by lost_sales and take top 10
  const chartData = (data ?? [])
    .slice()
    .sort((a, b) => (b.lost_sales ?? 0) - (a.lost_sales ?? 0))
    .slice(0, 10)
    .map(d => ({
      ...d,
      displayName: (d.product_name ?? '').length > 20
        ? (d.product_name ?? '').substring(0, 18) + '...'
        : (d.product_name ?? ''),
      lost_sales_lakhs: (d.lost_sales ?? 0) / 100000,
    }));

  const handleBarClick = (data: StockoutSKU) => {
    router.push(`/inventory/product/${data.product_id}`);
  };

  // Calculate total lost sales
  const totalLostSales = (data ?? []).reduce((sum, d) => sum + (d.lost_sales ?? 0), 0);

  return (
    <ChartCard
      id="stockout-top-skus"
      title="Top Stockout SKUs"
      subtitle={`₹${(totalLostSales / 100000).toFixed(1)}L total lost sales`}
      height={280}
      data={data as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, bottom: 5, left: 100 }}
        >
          <defs>
            <linearGradient id="stockoutBarGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FCA5A5" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />

          <XAxis
            type="number"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickFormatter={(val) => `₹${(val ?? 0).toFixed(0)}L`}
          />

          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={95}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="lost_sales_lakhs"
            fill="url(#stockoutBarGradient)"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            isAnimationActive={false}
          >
            {(chartData ?? []).map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                onClick={() => handleBarClick(entry)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
