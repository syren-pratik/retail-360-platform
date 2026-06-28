'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ChartWrapper from './ChartWrapper';
import { RETURN_REASON_COLORS, DEFAULT_APPAREL_COLOR } from '@/app/lib/palette-apparel';
import { useFormatMoney } from '@/app/lib/format-money';

interface ReasonRow {
  reason: string;
  count: number;
  pct: number;
  avg_refund_usd: number;
  margin_impact_usd: number;
}

export interface ReturnsByReasonData {
  total_returns_90d: number;
  return_rate_pct: number;
  return_margin_impact_usd: number;
  reasons: ReasonRow[];
}

interface ReturnsByReasonProps {
  data: ReturnsByReasonData;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ReasonRow }>;
}

export default function ReturnsByReason({ data }: ReturnsByReasonProps) {
  const fmtMoney = useFormatMoney();

  if (!data?.reasons?.length) return null;

  const total = data.total_returns_90d ?? data.reasons.reduce((s, r) => s + r.count, 0);

  const ReasonTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{d.reason}</p>
        <p className="text-sm">{d.count.toLocaleString('en-US')} returns ({d.pct.toFixed(1)}%)</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Margin impact: {fmtMoney(d.margin_impact_usd)}
        </p>
      </div>
    );
  };

  return (
    <section className="card h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Returns by Reason
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Last 90 days · share of total returns
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md bg-[var(--bg-secondary)] p-2 text-center">
          <p className="text-xs text-[var(--text-tertiary)]">Return Rate</p>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {data.return_rate_pct?.toFixed(1) ?? '0'}%
          </p>
        </div>
        <div className="rounded-md bg-[var(--bg-secondary)] p-2 text-center">
          <p className="text-xs text-[var(--text-tertiary)]">Margin Impact</p>
          <p className="text-base font-semibold text-red-600">
            {fmtMoney(data.return_margin_impact_usd)}
          </p>
        </div>
      </div>

      <div className="h-[220px] relative flex-1">
        <ChartWrapper height={220}>
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
                  <Cell
                    key={r.reason}
                    fill={RETURN_REASON_COLORS[r.reason] ?? DEFAULT_APPAREL_COLOR}
                  />
                ))}
              </Pie>
              <Tooltip content={<ReasonTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center -mt-2">
            <p className="text-xl font-bold text-[var(--text-primary)]">
              {total.toLocaleString('en-US')}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">total returns</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
        {data.reasons.map((r) => (
          <div key={r.reason} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: RETURN_REASON_COLORS[r.reason] ?? DEFAULT_APPAREL_COLOR }}
            />
            <span className="text-[var(--text-secondary)] truncate">{r.reason}</span>
            <span className="ml-auto font-medium text-[var(--text-primary)]">
              {r.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
