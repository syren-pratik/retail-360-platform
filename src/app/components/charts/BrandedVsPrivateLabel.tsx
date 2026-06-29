'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import ChartCard from './ChartCard';
import { formatCrOrUsdMAuto, useFormatMoney } from '@/app/lib/format-money';

interface ByType {
  supplier_type: string;
  count: number;
  total_po_value_usd_m: number;
  avg_margin_pct: number;
  avg_lead_weeks: number;
  avg_otif_pct: number;
}

export interface BrandedVsPLData {
  by_type: ByType[];
  trend_12m?: Array<Record<string, number | string>>;
  margin_gap_usd_m?: number;
}

interface Props {
  data: BrandedVsPLData | null;
}

const TYPE_COLORS: Record<string, string> = {
  'Branded Direct': '#3B82F6',
  'Private Label Vendor': '#10B981',
  'Import Wholesaler': '#F59E0B',
  'Off-Price Reseller': '#A855F7',
};

interface TipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

export default function BrandedVsPrivateLabel({ data }: Props) {
  const fmtMoney = useFormatMoney();

  const rows = useMemo(() => {
    if (!data?.by_type) return [];
    const totalPo = data.by_type.reduce((s, r) => s + r.total_po_value_usd_m, 0) || 1;
    const totalCount = data.by_type.reduce((s, r) => s + r.count, 0) || 1;
    return data.by_type.map((r) => ({
      name: r.supplier_type.replace(' Vendor', '').replace(' Direct', ''),
      fullName: r.supplier_type,
      'PO $M': r.total_po_value_usd_m,
      'SKU share %': Number(((r.count / totalCount) * 100).toFixed(1)),
      'Revenue share %': Number(((r.total_po_value_usd_m / totalPo) * 100).toFixed(1)),
      'Avg margin %': r.avg_margin_pct,
      'Avg OTIF %': r.avg_otif_pct,
    }));
  }, [data]);

  if (!data || !rows.length) {
    return (
      <ChartCard id="branded-vs-pl" title="Branded vs Private-Label" height={340}>
        <div className="text-sm text-[var(--text-secondary)] flex h-full items-center justify-center">
          No supplier-mix data available.
        </div>
      </ChartCard>
    );
  }

  const Tip = ({ active, payload, label }: TipProps) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-2.5 shadow-sm text-xs">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ChartCard
      id="branded-vs-pl"
      title="Branded vs Private-Label"
      subtitle={
        data.margin_gap_usd_m
          ? `PL margin advantage: ${fmtMoney((data.margin_gap_usd_m ?? 0) * 1_000_000)}/yr`
          : 'Mix · revenue share · margin gap'
      }
      height={340}
      data={rows as unknown as Record<string, unknown>[]}
      exportFilename="branded-vs-private-label"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} stroke="#9CA3AF" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" unit="%" />
            <Tooltip content={<Tip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="SKU share %" fill="#94A3B8" />
            <Bar dataKey="Revenue share %" fill="#3B82F6" />
            <Bar dataKey="Avg margin %" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
        <div className="space-y-2 text-xs flex flex-col justify-center">
          {data.by_type.map((r) => (
            <div key={r.supplier_type} className="rounded-md border border-[var(--border-default)] p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: TYPE_COLORS[r.supplier_type] ?? '#94A3B8' }}
                  />
                  {r.supplier_type}
                </span>
                <span className="text-[var(--text-tertiary)]">{r.count} suppliers</span>
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                <span>PO {formatCrOrUsdMAuto(r.total_po_value_usd_m)}</span>
                <span>margin {r.avg_margin_pct}%</span>
                <span>OTIF {r.avg_otif_pct}%</span>
                <span>lead {r.avg_lead_weeks}w</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
