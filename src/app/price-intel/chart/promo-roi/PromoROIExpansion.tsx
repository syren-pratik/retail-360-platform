'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Area,
  Cell,
} from 'recharts';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import type { PriceIntelCore, PriceIntelCampaign } from '@/app/lib/price-intel-types';

interface Props {
  core: PriceIntelCore;
}

const TABS = [
  { id: 'trend', label: 'ROI Trend' },
  { id: 'by-campaign', label: 'By Campaign' },
  { id: 'by-mechanic', label: 'By Mechanic' },
  { id: 'vs-goal', label: 'vs Goal' },
  { id: 'counterfactual', label: 'Counterfactual' },
];

function roiColor(roi: number): string {
  if (roi >= 3.0) return '#10b981';
  if (roi >= 2.0) return '#3b82f6';
  if (roi >= 1.0) return '#f59e0b';
  return '#f43f5e';
}

function mechanicLabel(m: string): string {
  const map: Record<string, string> = {
    pct_off: '% Off',
    bogo: 'BOGO',
    bundle: 'Bundle',
    multipack: 'Multipack',
    cashback: 'Cashback',
  };
  return map[m] ?? m;
}

interface MechanicAgg {
  mechanic: string;
  avgROI: number;
  totalSpend: number;
  totalIncremental: number;
  count: number;
}

function aggregateByMechanic(campaigns: PriceIntelCampaign[]): MechanicAgg[] {
  const map = new Map<string, { roiSum: number; spend: number; incremental: number; count: number }>();
  for (const c of campaigns) {
    const existing = map.get(c.mechanic) ?? { roiSum: 0, spend: 0, incremental: 0, count: 0 };
    map.set(c.mechanic, {
      roiSum: existing.roiSum + c.roi,
      spend: existing.spend + c.spend_to_date_inr,
      incremental: existing.incremental + c.incremental_revenue_inr,
      count: existing.count + 1,
    });
  }
  return Array.from(map.entries()).map(([mechanic, v]) => ({
    mechanic: mechanicLabel(mechanic),
    avgROI: v.count > 0 ? v.roiSum / v.count : 0,
    totalSpend: v.spend,
    totalIncremental: v.incremental,
    count: v.count,
  }));
}

// ─── Trend Tab ────────────────────────────────────────────────────────────────

function TrendTab({ core }: { core: PriceIntelCore }) {
  const trend = core.promo_roi_trend;
  const first = trend[0];
  const last = trend[trend.length - 1];
  const avgROI = trend.reduce((s, p) => s + p.roi, 0) / trend.length;
  const bestWeek = trend.reduce((a, b) => (b.roi > a.roi ? b : a), trend[0]);
  const worstWeek = trend.reduce((a, b) => (b.roi < a.roi ? b : a), trend[0]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={520}>
        <ComposedChart data={trend} margin={{ top: 16, right: 60, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis
            yAxisId="roi"
            orientation="left"
            domain={[0, 5]}
            tickFormatter={(v: number) => `${v.toFixed(1)}×`}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{ value: 'ROI', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11 } }}
          />
          <YAxis
            yAxisId="spend"
            orientation="right"
            tickFormatter={(v: number) => formatLakhsCrores(v)}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{ value: 'Spend', angle: 90, position: 'insideRight', offset: 8, style: { fontSize: 11 } }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = trend.find((p) => p.week_label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-2">{label}</p>
                  <p className="text-gray-600">ROI: <span className="font-medium text-gray-900">{point?.roi.toFixed(2)}×</span></p>
                  <p className="text-gray-600">Spend: <span className="font-medium text-gray-900">{formatLakhsCrores(point?.spend_inr ?? 0)}</span></p>
                  <p className="text-gray-600">Incremental Rev: <span className="font-medium text-gray-900">{formatLakhsCrores(point?.incremental_revenue_inr ?? 0)}</span></p>
                  {point?.active_campaign_name && (
                    <p className="text-blue-600 mt-1 text-xs">Campaign: {point.active_campaign_name}</p>
                  )}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine yAxisId="roi" y={3.0} stroke="#10b981" strokeDasharray="6 3" label={{ value: 'Goal 3.0×', position: 'right', fontSize: 11, fill: '#10b981' }} />
          <ReferenceLine yAxisId="roi" y={2.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Minimum', position: 'right', fontSize: 11, fill: '#f59e0b' }} />
          <Bar yAxisId="spend" dataKey="spend_inr" name="Spend" fill="#bfdbfe" opacity={0.7} radius={[2, 2, 0, 0]} />
          <Line yAxisId="roi" type="monotone" dataKey="roi" name="ROI" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">14-Week Summary</p>
          <p className="text-sm text-[var(--text-primary)]">ROI improved from <span className="font-semibold text-indigo-600">{first.roi.toFixed(2)}×</span> to <span className="font-semibold text-emerald-600">{last.roi.toFixed(2)}×</span> over the period.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Average ROI: {avgROI.toFixed(2)}×</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Best Week</p>
          <p className="text-sm font-semibold text-emerald-600">{bestWeek.week_label}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">ROI: {bestWeek.roi.toFixed(2)}× — {bestWeek.active_campaign_name ?? 'No active campaign'}</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Worst Week</p>
          <p className="text-sm font-semibold text-rose-600">{worstWeek.week_label}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">ROI: {worstWeek.roi.toFixed(2)}× — {worstWeek.active_campaign_name ?? 'No active campaign'}</p>
        </div>
      </div>
    </div>
  );
}

// ─── By-Campaign Tab ──────────────────────────────────────────────────────────

function ByCampaignTab({ core }: { core: PriceIntelCore }) {
  const [sortKey, setSortKey] = useState<keyof PriceIntelCampaign>('roi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const scatterData = core.campaigns.map((c) => ({
    x: c.spend_to_date_inr,
    y: c.roi,
    name: c.campaign_name,
    mechanic: mechanicLabel(c.mechanic),
    freeRider: c.free_rider_ratio_pct,
    fill: roiColor(c.roi),
  }));

  const sorted = [...core.campaigns].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  function toggleSort(key: keyof PriceIntelCampaign) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortHeader({ col, label }: { col: keyof PriceIntelCampaign; label: string }) {
    return (
      <th
        className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-primary)] select-none"
        onClick={() => toggleSort(col)}
      >
        {label}{sortKey === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
      </th>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={440}>
        <ScatterChart margin={{ top: 16, right: 40, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name="Spend"
            tickFormatter={(v: number) => formatLakhsCrores(v)}
            label={{ value: 'Total Spend', position: 'insideBottom', offset: -12, style: { fontSize: 11 } }}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="ROI"
            domain={[0, 5]}
            tickFormatter={(v: number) => `${v.toFixed(1)}×`}
            label={{ value: 'ROI', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11 } }}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <ReferenceLine y={3.0} stroke="#10b981" strokeDasharray="6 3" label={{ value: 'Goal 3.0×', position: 'right', fontSize: 11, fill: '#10b981' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as typeof scatterData[0];
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-2">{d.name}</p>
                  <p className="text-gray-600">Mechanic: <span className="font-medium">{d.mechanic}</span></p>
                  <p className="text-gray-600">Spend: <span className="font-medium">{formatLakhsCrores(d.x)}</span></p>
                  <p className="text-gray-600">ROI: <span className="font-medium">{d.y.toFixed(2)}×</span></p>
                  <p className="text-gray-600">Free-rider: <span className="font-medium">{d.freeRider.toFixed(1)}%</span></p>
                </div>
              );
            }}
          />
          <Scatter data={scatterData} name="Campaigns">
            {scatterData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} opacity={0.85} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-3 mb-3 mt-1">
        {[{ color: '#10b981', label: 'ROI ≥ 3.0×' }, { color: '#3b82f6', label: '2–3×' }, { color: '#f59e0b', label: '1–2×' }, { color: '#f43f5e', label: '< 1×' }].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Campaign</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Mechanic</th>
              <SortHeader col="roi" label="ROI" />
              <SortHeader col="spend_to_date_inr" label="Spend" />
              <SortHeader col="incremental_revenue_inr" label="Incremental Rev" />
              <SortHeader col="free_rider_ratio_pct" label="Free-rider %" />
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {sorted.map((c) => (
              <tr key={c.campaign_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-3 py-2 font-medium text-[var(--text-primary)] max-w-[200px] truncate">{c.campaign_name}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{mechanicLabel(c.mechanic)}</td>
                <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: roiColor(c.roi) }}>{c.roi.toFixed(2)}×</td>
                <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">{formatLakhsCrores(c.spend_to_date_inr)}</td>
                <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">{formatLakhsCrores(c.incremental_revenue_inr)}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: c.free_rider_ratio_pct > 50 ? '#f43f5e' : '#10b981' }}>{c.free_rider_ratio_pct.toFixed(1)}%</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                    c.status === 'review' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── By-Mechanic Tab ──────────────────────────────────────────────────────────

function ByMechanicTab({ core }: { core: PriceIntelCore }) {
  const aggs = aggregateByMechanic(core.campaigns);

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={aggs} margin={{ top: 16, right: 40, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="mechanic" tick={{ fontSize: 12, fill: '#111827' }} />
          <YAxis
            yAxisId="roi"
            orientation="left"
            domain={[0, 5]}
            tickFormatter={(v: number) => `${v.toFixed(1)}×`}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{ value: 'Avg ROI', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11 } }}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tickFormatter={(v: number) => String(Math.round(v))}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{ value: '# Campaigns', angle: 90, position: 'insideRight', offset: 8, style: { fontSize: 11 } }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = aggs.find((a) => a.mechanic === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-2">{label}</p>
                  <p className="text-gray-600">Avg ROI: <span className="font-medium">{d?.avgROI.toFixed(2)}×</span></p>
                  <p className="text-gray-600">Total Spend: <span className="font-medium">{formatLakhsCrores(d?.totalSpend ?? 0)}</span></p>
                  <p className="text-gray-600">Total Incremental: <span className="font-medium">{formatLakhsCrores(d?.totalIncremental ?? 0)}</span></p>
                  <p className="text-gray-600">Campaigns: <span className="font-medium">{d?.count}</span></p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine yAxisId="roi" y={3.0} stroke="#10b981" strokeDasharray="6 3" label={{ value: 'Goal 3.0×', position: 'right', fontSize: 11, fill: '#10b981' }} />
          <Bar yAxisId="roi" dataKey="avgROI" name="Avg ROI" radius={[4, 4, 0, 0]}>
            {aggs.map((entry, i) => (
              <Cell key={i} fill={roiColor(entry.avgROI)} />
            ))}
          </Bar>
          <Bar yAxisId="count" dataKey="count" name="# Campaigns" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Mechanic</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide"># Campaigns</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Avg ROI</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Total Spend</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Total Incremental</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {aggs.sort((a, b) => b.avgROI - a.avgROI).map((a) => (
              <tr key={a.mechanic} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{a.mechanic}</td>
                <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">{a.count}</td>
                <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: roiColor(a.avgROI) }}>{a.avgROI.toFixed(2)}×</td>
                <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">{formatLakhsCrores(a.totalSpend)}</td>
                <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">{formatLakhsCrores(a.totalIncremental)}</td>
                <td className="px-3 py-2 text-xs">
                  <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${
                    a.avgROI >= 3.0 ? 'bg-emerald-100 text-emerald-700' :
                    a.avgROI >= 2.0 ? 'bg-blue-100 text-blue-700' :
                    a.avgROI >= 1.0 ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {a.avgROI >= 3.0 ? 'Above Goal' : a.avgROI >= 2.0 ? 'Near Goal' : a.avgROI >= 1.0 ? 'Below Target' : 'Underperforming'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── vs-Goal Tab ──────────────────────────────────────────────────────────────

function VsGoalTab({ core }: { core: PriceIntelCore }) {
  const trend = core.promo_roi_trend;
  const gapData = trend.map((p) => ({
    week_label: p.week_label,
    roi: p.roi,
    gap: p.roi - 3.0,
  }));

  const weeksAbove = gapData.filter((d) => d.gap >= 0).length;
  const weeksBelow = gapData.filter((d) => d.gap < 0).length;
  const avgGap = gapData.reduce((s, d) => s + d.gap, 0) / gapData.length;
  const best = gapData.reduce((a, b) => (b.roi > a.roi ? b : a), gapData[0]);
  const worst = gapData.reduce((a, b) => (b.roi < a.roi ? b : a), gapData[0]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={gapData} margin={{ top: 16, right: 40, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis
            yAxisId="roi"
            domain={[0, 5]}
            tickFormatter={(v: number) => `${v.toFixed(1)}×`}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <YAxis
            yAxisId="gap"
            orientation="right"
            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}×`}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = gapData.find((p) => p.week_label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{label}</p>
                  <p className="text-gray-600">ROI: <span className="font-medium">{d?.roi.toFixed(2)}×</span></p>
                  <p style={{ color: (d?.gap ?? 0) >= 0 ? '#10b981' : '#f43f5e' }}>
                    vs Goal: {(d?.gap ?? 0) >= 0 ? '+' : ''}{d?.gap.toFixed(2)}×
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine yAxisId="roi" y={3.0} stroke="#10b981" strokeDasharray="6 3" label={{ value: 'Goal 3.0×', position: 'right', fontSize: 11, fill: '#10b981' }} />
          <Bar yAxisId="gap" dataKey="gap" name="Gap vs Goal" radius={[2, 2, 0, 0]}>
            {gapData.map((entry, i) => (
              <Cell key={i} fill={entry.gap >= 0 ? '#d1fae5' : '#ffe4e6'} stroke={entry.gap >= 0 ? '#10b981' : '#f43f5e'} strokeWidth={1} />
            ))}
          </Bar>
          <Line yAxisId="roi" type="monotone" dataKey="roi" name="Actual ROI" stroke="#f87171" strokeWidth={2.5} dot={{ r: 4, fill: '#f87171' }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-5 gap-3">
        {[
          { label: 'Weeks Above Goal', value: String(weeksAbove), color: 'text-emerald-600' },
          { label: 'Weeks Below Goal', value: String(weeksBelow), color: 'text-rose-600' },
          { label: 'Avg Gap', value: `${avgGap >= 0 ? '+' : ''}${avgGap.toFixed(2)}×`, color: avgGap >= 0 ? 'text-emerald-600' : 'text-rose-600' },
          { label: 'Best Week', value: `${best.week_label} (${best.roi.toFixed(2)}×)`, color: 'text-emerald-600' },
          { label: 'Worst Week', value: `${worst.week_label} (${worst.roi.toFixed(2)}×)`, color: 'text-rose-600' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{item.label}</p>
            <p className={`text-sm font-semibold tabular-nums ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Counterfactual Tab ───────────────────────────────────────────────────────

function CounterfactualTab({ core }: { core: PriceIntelCore }) {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const trend = core.promo_roi_trend;

  const cfData = trend.map((p) => {
    const baseline = p.spend_inr * 2;
    const actual = p.incremental_revenue_inr;
    const delta = actual - baseline;
    return {
      week_label: p.week_label,
      actual,
      baseline,
      deltaPositive: delta > 0 ? delta : 0,
      deltaNegative: delta < 0 ? delta : 0,
    };
  });

  const totalSpend = trend.reduce((s, p) => s + p.spend_inr, 0);
  const totalIncremental = trend.reduce((s, p) => s + p.incremental_revenue_inr, 0);
  const netROI = totalSpend > 0 ? totalIncremental / totalSpend : 0;

  return (
    <div>
      <ResponsiveContainer width="100%" height={440}>
        <ComposedChart data={cfData} margin={{ top: 16, right: 40, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#111827' }} />
          <YAxis tickFormatter={(v: number) => formatLakhsCrores(v)} tick={{ fontSize: 11, fill: '#111827' }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = cfData.find((p) => p.week_label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-2">{label}</p>
                  <p className="text-gray-600">Actual Incremental: <span className="font-medium">{formatLakhsCrores(d?.actual ?? 0)}</span></p>
                  <p className="text-gray-600">Baseline (2× spend): <span className="font-medium">{formatLakhsCrores(d?.baseline ?? 0)}</span></p>
                  <p style={{ color: (d?.actual ?? 0) >= (d?.baseline ?? 0) ? '#10b981' : '#f43f5e' }}>
                    Delta: {formatLakhsCrores((d?.actual ?? 0) - (d?.baseline ?? 0))}
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="baseline" name="Baseline (2× spend)" stroke="#9ca3af" strokeDasharray="6 3" fill="#f3f4f6" fillOpacity={0.6} />
          <Area type="monotone" dataKey="actual" name="Actual Incremental Revenue" stroke="#f87171" fill="#fecaca" fillOpacity={0.5} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Total Promo Spend', value: formatLakhsCrores(totalSpend), subtext: 'across 14 weeks' },
          { label: 'Total Incremental Revenue', value: formatLakhsCrores(totalIncremental), subtext: 'vs baseline' },
          { label: 'Net ROI', value: `${netROI.toFixed(2)}×`, subtext: 'incremental ÷ spend' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{item.label}</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">{item.value}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.subtext}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-[var(--border-default)] rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setAccordionOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] transition-colors text-sm font-medium text-[var(--text-primary)]"
        >
          <span>How is counterfactual calculated?</span>
          <span className="text-[var(--text-tertiary)]">{accordionOpen ? '−' : '+'}</span>
        </button>
        {accordionOpen && (
          <div className="px-5 py-4 text-sm text-[var(--text-secondary)] space-y-2">
            <p><span className="font-semibold text-[var(--text-primary)]">Step 1 — Baseline construction:</span> The baseline is set at 2× the weekly promo spend. This represents the expected revenue had the same spend been deployed via non-promotional channels at average efficiency.</p>
            <p><span className="font-semibold text-[var(--text-primary)]">Step 2 — Actual incremental:</span> Incremental revenue is computed by subtracting estimated baseline (pre-promo) sales from gross promo sales, then removing estimated cannibalization from sister categories.</p>
            <p><span className="font-semibold text-[var(--text-primary)]">Step 3 — Delta area:</span> Weeks where actual incremental exceeds the baseline are highlighted in emerald (promo outperformed). Weeks below are highlighted in rose, signalling potential over-spend or structural free-rider drag.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function PromoROIExpansion({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('view') ?? 'trend';

  const handleTabChange = useCallback(
    (id: string) => {
      router.push(`?view=${id}`, { scroll: false });
    },
    [router]
  );

  const trend = core.promo_roi_trend;
  const latestROI = trend[trend.length - 1].roi;
  const firstROI = trend[0].roi;
  const roiDelta = latestROI - firstROI;
  const aboveGoalCount = core.campaigns.filter((c) => c.roi >= 3.0).length;

  const kpiTiles = [
    {
      label: 'Latest ROI',
      value: `${latestROI.toFixed(2)}×`,
    },
    {
      label: 'vs W1',
      value: `${roiDelta >= 0 ? '+' : ''}${roiDelta.toFixed(2)}×`,
      color: 'positive' as const,
    },
    {
      label: 'Goal',
      value: '3.0×',
      subtext: 'target ROI',
    },
    {
      label: 'Above Goal',
      value: String(aboveGoalCount),
      subtext: `of ${core.campaigns.length} campaigns`,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Promo ROI Analysis"
        subtitle="14-week promotional return on investment deep-dive"
        backLabel="← Back to Price Intel"
        backHref="/price-intel?tab=promo"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="px-8 py-6">
        {activeTab === 'trend' && <TrendTab core={core} />}
        {activeTab === 'by-campaign' && <ByCampaignTab core={core} />}
        {activeTab === 'by-mechanic' && <ByMechanicTab core={core} />}
        {activeTab === 'vs-goal' && <VsGoalTab core={core} />}
        {activeTab === 'counterfactual' && <CounterfactualTab core={core} />}
      </div>
    </div>
  );
}
