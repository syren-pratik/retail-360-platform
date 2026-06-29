'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import { RETURN_REASON_COLORS, DEFAULT_APPAREL_COLOR } from '@/app/lib/palette-apparel';
import { useFormatMoney } from '@/app/lib/format-money';

interface ReasonRow {
  reason: string;
  count: number;
  pct: number;
  avg_refund_usd: number;
  margin_impact_usd: number;
}

export interface ReturnsByReasonInventoryData {
  total_returns_90d: number;
  return_rate_pct: number;
  return_margin_impact_usd: number;
  reasons: ReasonRow[];
}

interface Props {
  data: ReturnsByReasonInventoryData | null;
}

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload: ReasonRow }>;
}

export default function ReturnsByReasonInventory({ data }: Props) {
  const fmtMoney = useFormatMoney();

  if (!data?.reasons?.length) {
    return (
      <ChartCard id="returns-by-reason-inventory" title="Returns by Reason" height={340}>
        <div className="text-sm text-[var(--text-secondary)] flex h-full items-center justify-center">
          No returns data available.
        </div>
      </ChartCard>
    );
  }

  const Tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-2.5 shadow-sm">
        <p className="font-medium text-sm">{d.reason}</p>
        <p className="text-xs text-[var(--text-secondary)]">
          {d.count.toLocaleString('en-US')} returns · {d.pct.toFixed(1)}%
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">Margin impact: {fmtMoney(d.margin_impact_usd)}</p>
      </div>
    );
  };

  return (
    <ChartCard
      id="returns-by-reason-inventory"
      title="Returns by Reason"
      subtitle="90-day inventory exposure — % of all returns"
      height={340}
      data={data.reasons as unknown as Record<string, unknown>[]}
      exportFilename="returns-by-reason-inventory"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
        <div className="relative h-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.reasons}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="count"
                nameKey="reason"
              >
                {data.reasons.map((r) => (
                  <Cell key={r.reason} fill={RETURN_REASON_COLORS[r.reason] ?? DEFAULT_APPAREL_COLOR} />
                ))}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {data.return_rate_pct?.toFixed(1) ?? '0'}%
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Return Rate</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center space-y-1.5 text-xs">
          {data.reasons.map((r) => (
            <div key={r.reason} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: RETURN_REASON_COLORS[r.reason] ?? DEFAULT_APPAREL_COLOR }}
              />
              <span className="text-[var(--text-secondary)] truncate">{r.reason}</span>
              <span className="ml-auto font-medium text-[var(--text-primary)]">{r.pct.toFixed(1)}%</span>
            </div>
          ))}
          <div className="border-t border-[var(--border-default)] mt-2 pt-2 flex justify-between">
            <span className="text-[var(--text-tertiary)]">Margin impact</span>
            <span className="font-semibold text-rose-600">{fmtMoney(data.return_margin_impact_usd)}</span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
