'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import { formatMoneyAuto } from '@/app/lib/format-money';
import type { PriceIntelCore, PriceIntelActionItem } from '@/app/lib/price-intel-types';

interface Props {
  core: PriceIntelCore;
}

const TABS = [
  { id: 'trend', label: 'Trend' },
  { id: 'by-segment', label: 'By Segment' },
  { id: 'by-sku', label: 'By SKU' },
  { id: 'waste-waterfall', label: 'Waste Waterfall' },
];

// ─── Trend Tab ────────────────────────────────────────────────────────────────

function TrendTab({ core }: { core: PriceIntelCore }) {
  const trendData = [...core.campaigns]
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .map((c) => ({
      name: c.campaign_name,
      freeRiderPct: c.free_rider_ratio_pct,
      wasteCost: (c.spend_to_date_inr * c.free_rider_ratio_pct) / 100,
    }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={trendData} margin={{ top: 16, right: 40, left: 0, bottom: 60 }}>
          <defs>
            <linearGradient id="frGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#111827' }}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={70}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{ value: 'Free-rider %', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11 } }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = trendData.find((p) => p.name === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1 max-w-[200px] truncate">{label}</p>
                  <p className="text-gray-600">Free-rider ratio: <span className="font-medium">{d?.freeRiderPct.toFixed(1)}%</span></p>
                  <p className="text-gray-600">Waste cost: <span className="font-medium text-rose-600">{formatMoneyAuto(d?.wasteCost ?? 0)}</span></p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={50}
            stroke="#f43f5e"
            strokeDasharray="6 3"
            label={{ value: 'Waste threshold (50%)', position: 'insideTopRight', fontSize: 11, fill: '#f43f5e' }}
          />
          <Area
            type="monotone"
            dataKey="freeRiderPct"
            name="Free-rider ratio"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#frGradient)"
            dot={{ r: 4, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Campaigns Above Threshold</p>
          <p className="text-lg font-semibold text-rose-600">{core.campaigns.filter((c) => c.free_rider_ratio_pct > 50).length}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">of {core.campaigns.length} campaigns</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Avg Free-rider Ratio</p>
          <p className="text-lg font-semibold tabular-nums text-amber-600">
            {(core.campaigns.reduce((s, c) => s + c.free_rider_ratio_pct, 0) / core.campaigns.length).toFixed(1)}%
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">across all campaigns</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Total Waste Estimate</p>
          <p className="text-lg font-semibold text-rose-600">
            {formatMoneyAuto(core.campaigns.reduce((s, c) => s + (c.spend_to_date_inr * c.free_rider_ratio_pct) / 100, 0))}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">free-rider promo cost</p>
        </div>
      </div>
    </div>
  );
}

// ─── By-Segment Tab ───────────────────────────────────────────────────────────

function BySegmentTab({ core }: { core: PriceIntelCore }) {
  const segments = core.lift_by_segment;
  const totalLift = segments.reduce((s, seg) => s + seg.lift_pct, 0);
  const worstSegment = segments.reduce((a, b) => (b.free_rider_ratio_pct > a.free_rider_ratio_pct ? b : a), segments[0]);
  const bestSegment = segments.reduce((a, b) => (b.free_rider_ratio_pct < a.free_rider_ratio_pct ? b : a), segments[0]);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-4">Free-rider ratio vs genuine lift by segment</p>
        <div className="space-y-4">
          {segments.map((seg) => {
            const incrementalWidth = Math.max(0, (1 - seg.free_rider_ratio_pct / 100) * seg.bar_width_pct);
            const freeRiderWidth = (seg.free_rider_ratio_pct / 100) * seg.bar_width_pct;
            return (
              <div key={seg.segment}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{seg.segment}</span>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span>Lift: <span className="font-medium text-emerald-600">{seg.lift_pct.toFixed(1)}%</span></span>
                    <span>Free-rider: <span className="font-medium text-rose-600">{seg.free_rider_ratio_pct.toFixed(1)}%</span></span>
                  </div>
                </div>
                <div className="flex h-5 rounded overflow-hidden bg-gray-100" style={{ width: `${seg.bar_width_pct}%` }}>
                  <div
                    className="bg-emerald-400 transition-all"
                    style={{ width: `${incrementalWidth}%` }}
                    title={`Genuine lift: ${(100 - seg.free_rider_ratio_pct).toFixed(1)}%`}
                  />
                  <div
                    className="bg-rose-400 transition-all"
                    style={{ width: `${freeRiderWidth}%` }}
                    title={`Free-rider: ${seg.free_rider_ratio_pct.toFixed(1)}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="w-3 h-3 rounded-sm bg-emerald-400" />Genuine Incremental
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="w-3 h-3 rounded-sm bg-rose-400" />Free-rider Waste
          </span>
        </div>
      </div>

      <div className="col-span-1 space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-1">Highest Waste</p>
          <p className="text-sm font-semibold text-rose-800">{worstSegment.segment}</p>
          <p className="text-xs text-rose-600 mt-1">{worstSegment.free_rider_ratio_pct.toFixed(1)}% free-rider ratio</p>
          <p className="text-xs text-rose-500 mt-0.5">Only {(100 - worstSegment.free_rider_ratio_pct).toFixed(1)}% genuine lift</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Most Efficient</p>
          <p className="text-sm font-semibold text-emerald-800">{bestSegment.segment}</p>
          <p className="text-xs text-emerald-600 mt-1">{bestSegment.free_rider_ratio_pct.toFixed(1)}% free-rider ratio</p>
          <p className="text-xs text-emerald-500 mt-0.5">{(100 - bestSegment.free_rider_ratio_pct).toFixed(1)}% genuine incremental lift</p>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Avg Lift Across Segments</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{(totalLift / segments.length).toFixed(1)}%</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{segments.length} segments analysed</p>
        </div>
      </div>
    </div>
  );
}

// ─── By-SKU Tab ───────────────────────────────────────────────────────────────

function BySkuTab({ core }: { core: PriceIntelCore }) {
  const freeRiderItems: PriceIntelActionItem[] = core.action_queue
    .filter((item) => item.alert_type === 'free_rider')
    .sort((a, b) => b.financial_impact_inr - a.financial_impact_inr);

  const topTen = freeRiderItems.slice(0, 10);

  const chartData = topTen.map((item) => ({
    name: item.product_name.length > 20 ? item.product_name.slice(0, 20) + '…' : item.product_name,
    impact: item.financial_impact_inr,
    priority: item.priority,
  }));

  function priorityColor(p: string): string {
    if (p === 'urgent') return '#f43f5e';
    if (p === 'review') return '#f59e0b';
    return '#6366f1';
  }

  if (freeRiderItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
        <p className="text-lg font-medium">No free-rider SKU alerts</p>
        <p className="text-sm mt-1">All action queue items are of other alert types.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        {freeRiderItems.length} free-rider alert{freeRiderItems.length !== 1 ? 's' : ''} in action queue — sorted by financial impact
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 60, left: 140, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tickFormatter={(v: number) => formatMoneyAuto(v)} tick={{ fontSize: 10, fill: '#111827' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#111827' }} width={130} />
          <Tooltip formatter={(v: unknown) => [formatMoneyAuto(v as number), 'Financial Impact']} />
          <Bar dataKey="impact" radius={[0, 3, 3, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={priorityColor(entry.priority)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">SKU ID</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Product</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Dept</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Alert</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Financial Impact</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Recommended Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {freeRiderItems.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">{item.sku_id}</td>
                <td className="px-3 py-2 font-medium text-[var(--text-primary)] max-w-[180px] truncate">{item.product_name}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{item.department}</td>
                <td className="px-3 py-2 text-xs max-w-[200px]">
                  <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${
                    item.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                    item.priority === 'review' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{item.priority}</span>
                  <p className="mt-1 text-[var(--text-secondary)] truncate">{item.headline}</p>
                </td>
                <td className="px-3 py-2 tabular-nums text-rose-600 font-medium">{formatMoneyAuto(item.financial_impact_inr)}</td>
                <td className="px-3 py-2 text-xs text-[var(--text-secondary)] max-w-[200px]">{item.recommended_action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Waste Waterfall Tab ──────────────────────────────────────────────────────

function WasteWaterfallTab({ core }: { core: PriceIntelCore }) {
  const totalSpend = core.campaigns.reduce((s, c) => s + c.spend_to_date_inr, 0);
  const currentRatio = core.kpis.free_rider_ratio_pct;
  const freeRiderWaste = (totalSpend * currentRatio) / 100;
  const genuineSpend = totalSpend - freeRiderWaste;
  const totalIncremental = core.campaigns.reduce((s, c) => s + c.incremental_revenue_inr, 0);

  const waterfallData = [
    { label: 'Total Promo Spend', value: totalSpend, type: 'base' },
    { label: 'Free-rider Waste', value: -freeRiderWaste, type: 'leak' },
    { label: 'Genuine Promo Spend', value: genuineSpend, type: 'result' },
    { label: 'Incremental Revenue', value: totalIncremental, type: 'revenue' },
  ];

  const barData = waterfallData.map((d) => ({
    label: d.label,
    value: Math.abs(d.value),
    type: d.type,
    original: d.value,
  }));

  function barColor(type: string): string {
    if (type === 'base') return '#818cf8';
    if (type === 'leak') return '#f43f5e';
    if (type === 'result') return '#3b82f6';
    return '#10b981';
  }

  const optimizedWaste = totalSpend * 0.30;
  const saving = freeRiderWaste - optimizedWaste;

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={barData} layout="horizontal" margin={{ top: 16, right: 40, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis tickFormatter={(v: number) => formatMoneyAuto(v)} tick={{ fontSize: 11, fill: '#111827' }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = barData.find((b) => b.label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{label}</p>
                  <p style={{ color: barColor(d?.type ?? '') }}>{formatMoneyAuto(d?.value ?? 0)}</p>
                  {d?.type === 'leak' && <p className="text-xs text-gray-500 mt-0.5">{currentRatio.toFixed(1)}% of total spend</p>}
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {barData.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-3 mt-2 mb-6">
        {[
          { color: '#818cf8', label: 'Total Spend' },
          { color: '#f43f5e', label: 'Free-rider Waste' },
          { color: '#3b82f6', label: 'Genuine Spend' },
          { color: '#10b981', label: 'Incremental Revenue' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <p className="text-sm font-semibold text-amber-800 mb-2">Optimization Opportunity</p>
        <p className="text-sm text-amber-700">
          If the free-rider ratio dropped from{' '}
          <span className="font-semibold">{currentRatio.toFixed(1)}%</span> to{' '}
          <span className="font-semibold">30%</span>, estimated waste would fall from{' '}
          <span className="font-semibold">{formatMoneyAuto(freeRiderWaste)}</span> to{' '}
          <span className="font-semibold">{formatMoneyAuto(optimizedWaste)}</span>, recovering{' '}
          <span className="font-semibold text-emerald-700">{formatMoneyAuto(saving)}</span> in promo budget — redeployable to high-efficiency campaigns.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-4">
        {[
          { label: 'Total Spend', value: formatMoneyAuto(totalSpend), sub: 'across all campaigns' },
          { label: 'Waste (Free-riders)', value: formatMoneyAuto(freeRiderWaste), sub: `${currentRatio.toFixed(1)}% of spend`, color: 'text-rose-600' },
          { label: 'Genuine Promo Spend', value: formatMoneyAuto(genuineSpend), sub: `${(100 - currentRatio).toFixed(1)}% effective`, color: 'text-blue-600' },
          { label: 'Total Incremental Revenue', value: formatMoneyAuto(totalIncremental), sub: 'net of cannibalization', color: 'text-emerald-600' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{item.label}</p>
            <p className={`text-lg font-semibold tabular-nums ${item.color ?? 'text-[var(--text-primary)]'}`}>{item.value}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function FreeRiderExpansion({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('view') ?? 'trend';

  const handleTabChange = useCallback(
    (id: string) => {
      router.push(`?view=${id}`, { scroll: false });
    },
    [router]
  );

  const campaignsAboveThreshold = core.campaigns.filter((c) => c.free_rider_ratio_pct > 50).length;

  const kpiTiles = [
    {
      label: 'Current Free-rider Ratio',
      value: `${core.kpis.free_rider_ratio_pct.toFixed(1)}%`,
    },
    {
      label: 'Waste This Week',
      value: formatMoneyAuto(core.kpis.margin_leakage_breakdown.promo_free_rider_inr),
      color: 'negative' as const,
    },
    {
      label: 'Threshold',
      value: '50%',
      subtext: 'above = majority wasted',
    },
    {
      label: 'Campaigns Above Threshold',
      value: String(campaignsAboveThreshold),
      subtext: `of ${core.campaigns.length} campaigns`,
      color: campaignsAboveThreshold > 0 ? ('negative' as const) : ('positive' as const),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Free-Rider Analysis"
        subtitle="Promotional free-rider ratio and waste decomposition"
        backLabel="← Back to Price Intel"
        backHref="/price-intel?tab=promo"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="px-8 py-6">
        {activeTab === 'trend' && <TrendTab core={core} />}
        {activeTab === 'by-segment' && <BySegmentTab core={core} />}
        {activeTab === 'by-sku' && <BySkuTab core={core} />}
        {activeTab === 'waste-waterfall' && <WasteWaterfallTab core={core} />}
      </div>
    </div>
  );
}
