'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LostSalesDataPoint {
  date: string;
  fulfilled: number;
  lost: number;
}

interface LostSalesTrendProps {
  data: LostSalesDataPoint[];
}

export default function LostSalesTrend({ data }: LostSalesTrendProps) {
  // Add percentage to data
  const chartData = data.map((d) => ({
    ...d,
    total: d.fulfilled + d.lost,
    lostPct: ((d.lost / (d.fulfilled + d.lost)) * 100).toFixed(1),
  }));

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDate}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const dataPoint = payload[0].payload;
              return (
                <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                  <p className="font-semibold mb-2">{formatDate(String(label))}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                        Fulfilled
                      </span>
                      <span className="font-medium">
                        ₹{Number(dataPoint.fulfilled).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                        Lost Sales
                      </span>
                      <span className="font-medium">
                        ₹{Number(dataPoint.lost).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-[var(--border-subtle)]">
                      <span className="text-rose-600 font-medium">
                        {dataPoint.lostPct}% lost
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[var(--text-tertiary)] text-[10px]">Hover for details</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="rect"
          iconSize={10}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey="fulfilled"
          stackId="1"
          stroke="#10B981"
          fill="#10B981"
          name="Fulfilled"
        />
        <Area
          type="monotone"
          dataKey="lost"
          stackId="1"
          stroke="#F43F5E"
          fill="#F43F5E"
          name="Lost Sales"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
