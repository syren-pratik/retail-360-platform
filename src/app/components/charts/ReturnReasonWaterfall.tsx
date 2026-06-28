'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ChartWrapper from './ChartWrapper';
import { RETURN_REASON_COLORS, DEFAULT_APPAREL_COLOR } from '@/app/lib/palette-apparel';
import { useFormatMoney } from '@/app/lib/format-money';

// Cache shape is per-customer: {customer_id, total_returns_12m, return_value_usd, reasons: [{reason, count, pct}], ...}
interface CustomerReturnRow {
  customer_id: string;
  total_returns_12m: number;
  return_value_usd: number;
  reasons?: Array<{ reason: string; count: number; pct: number }>;
}

interface ReturnReasonWaterfallProps {
  data: CustomerReturnRow[];
}

// Group fine-grained reason ("Fit (too small)") under a top-level bucket
// matching RETURN_REASON_COLORS keys.
function bucketReason(reason: string): string {
  const r = reason.toLowerCase();
  if (r.startsWith('fit')) return 'Fit';
  if (r.startsWith('style')) return 'Style';
  if (r.startsWith('quality')) return 'Quality';
  if (r.startsWith('wrong')) return 'Wrong Item';
  if (r.startsWith('damaged') || r.startsWith('defect')) return 'Damaged';
  if (r.startsWith('changed') || r.includes('mind')) return 'Changed Mind';
  return reason;
}

export default function ReturnReasonWaterfall({ data }: ReturnReasonWaterfallProps) {
  const fmtMoney = useFormatMoney();

  const aggregated = useMemo(() => {
    const counts = new Map<string, { count: number; value: number }>();
    let totalValue = 0;
    (data ?? []).forEach((row) => {
      const rowValue = row.return_value_usd ?? 0;
      const reasons = row.reasons ?? [];
      const rowTotalReturns = row.total_returns_12m || reasons.reduce((s, r) => s + r.count, 0) || 1;
      reasons.forEach((r) => {
        const bucket = bucketReason(r.reason);
        const existing = counts.get(bucket) ?? { count: 0, value: 0 };
        const valShare = rowValue * (r.count / rowTotalReturns);
        counts.set(bucket, { count: existing.count + r.count, value: existing.value + valShare });
        totalValue += valShare;
      });
    });

    const rows = Array.from(counts.entries())
      .map(([reason, { count, value }]) => ({ reason, count, value }))
      .sort((a, b) => b.count - a.count);

    return { rows, totalValue };
  }, [data]);

  if (!aggregated.rows.length) return null;

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{ payload: { reason: string; count: number; value: number } }>;
  }

  const ReasonTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{d.reason}</p>
        <p className="text-sm">{d.count.toLocaleString('en-US')} returns</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Refund value: {fmtMoney(d.value)}
        </p>
      </div>
    );
  };

  const maxCount = aggregated.rows[0]?.count ?? 0;

  return (
    <section className="card h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Return Reason Waterfall
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            12-month returns aggregated by reason · sorted by count
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
            Total refund value
          </p>
          <p className="text-base font-semibold text-red-600">
            {fmtMoney(aggregated.totalValue)}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[280px]">
        <ChartWrapper height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={aggregated.rows}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, Math.ceil(maxCount * 1.1)]}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v))}
              />
              <YAxis
                type="category"
                dataKey="reason"
                tick={{ fontSize: 12, fill: 'var(--text-primary)' }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip content={<ReasonTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {aggregated.rows.map((r) => (
                  <Cell
                    key={r.reason}
                    fill={RETURN_REASON_COLORS[r.reason] ?? DEFAULT_APPAREL_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </section>
  );
}
