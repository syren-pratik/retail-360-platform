'use client';

import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface LostSalesItem {
  sku: string;
  name: string;
  department: string;
  lostUnits: number;
  lostRevenue: number;
  stockoutDays: number;
  reason: string;
}

interface LostSalesTopSKUsProps {
  data: LostSalesItem[];
}

const COLORS = ['#F43F5E', '#FB7185', '#FDA4AF', '#FECDD3', '#FEE2E2', '#FEF2F2', '#FFF1F2', '#FFF5F5', '#FFFAFA', '#FFFFFF'];

export default function LostSalesTopSKUs({ data }: LostSalesTopSKUsProps) {
  const router = useRouter();

  // Sort by lost revenue and take top 10
  const topData = [...data]
    .sort((a, b) => b.lostRevenue - a.lostRevenue)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      shortName: item.name.length > 20 ? item.name.slice(0, 18) + '...' : item.name,
    }));

  const handleBarClick = (sku: string) => {
    router.push(`/demand/product/${sku}`);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={topData}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 100, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          width={95}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload as LostSalesItem;
              return (
                <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                  <p className="font-semibold mb-1">{item.name}</p>
                  <p className="text-[var(--text-tertiary)] mb-2">{item.sku} • {item.department}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span>Lost Revenue</span>
                      <span className="font-medium text-rose-600">
                        ₹{item.lostRevenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Lost Units</span>
                      <span className="font-medium">{item.lostUnits.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Stockout Days</span>
                      <span className="font-medium">{item.stockoutDays}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Reason</span>
                      <span className="font-medium">{item.reason}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[var(--accent-primary)] text-[10px]">Click to view product</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="lostRevenue"
          radius={[0, 4, 4, 0]}
          cursor="pointer"
          onClick={(_, __, e) => {
            const payload = (e as unknown as { payload?: { sku?: string } })?.payload;
            if (payload?.sku) handleBarClick(payload.sku);
          }}
        >
          {topData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
