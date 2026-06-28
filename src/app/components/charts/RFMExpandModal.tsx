'use client';

import { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { RFMDetailData, RFMCustomer } from '@/app/lib/types';
import { formatMoneyAuto, formatMoneyPlainAuto } from '@/app/lib/format-money';

interface RFMExpandModalProps {
  data: RFMDetailData;
  rfmSample: RFMCustomer[];
  onClose: () => void;
}

const TABS = ['9-Box Grid', 'Density', 'Action Playbook', 'Migration', 'Scatter', 'Definitions'];

const TIER_COLORS: Record<string, string> = {
  Platinum: '#6366F1',
  Gold: '#F59E0B',
  Silver: '#64748B',
  Bronze: '#92400E',
  'At-Risk': '#F43F5E',
};

function fmtInr(n: number) {
  return formatMoneyAuto(n);
}

export default function RFMExpandModal({ data, rfmSample, onClose }: RFMExpandModalProps) {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const s = data.summary;

  // Build 3x3 grid from nine_box data
  const rBands = ['Recent (1-3)', 'Mid (2)', 'Lapsed (1)'];
  const fBands = ['Frequent (3)', 'Medium (2)', 'Low (1)'];
  const boxMap: Record<string, typeof data.nine_box[0]> = {};
  data.nine_box.forEach((cell) => { boxMap[`${cell.r_band}__${cell.f_band}`] = cell; });

  // Density heatmap: 3x3 grid of r_score x f_score, sum m_scores
  const densityMap: Record<string, number> = {};
  data.density_heatmap.forEach((d) => {
    const key = `${d.r_score}__${d.f_score}`;
    densityMap[key] = (densityMap[key] ?? 0) + d.count;
  });
  const maxDensity = Math.max(...Object.values(densityMap));

  function getDensityColor(count: number) {
    const pct = count / maxDensity;
    if (pct >= 0.8) return '#1a3a5c';
    if (pct >= 0.6) return '#2a5a8c';
    if (pct >= 0.4) return '#5a9ad4';
    if (pct >= 0.2) return '#9ac8ec';
    return '#deedf8';
  }

  const tierGroups = rfmSample.reduce((acc, c) => {
    if (!acc[c.clv_tier]) acc[c.clv_tier] = [];
    acc[c.clv_tier].push(c);
    return acc;
  }, {} as Record<string, RFMCustomer[]>);

  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'At-Risk'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/cx360" onClick={onClose} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={15} />
            Back to CX360
          </Link>
          <span className="text-[var(--border-default)]">|</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">RFM Analysis</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* KPI Strip */}
      <div className="flex gap-6 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        {[
          { label: 'Champions', value: `${s.champions_pct}%` },
          { label: 'At Risk', value: `${s.at_risk_pct}%`, red: true },
          { label: 'Avg RFM Score', value: `${s.avg_rfm_score.toFixed(1)}/9` },
          { label: 'Segments', value: s.segments_monitored.toString() },
          { label: 'High-Value at Risk', value: fmtInr(s.high_value_at_risk_revenue), red: true },
        ].map((k) => (
          <div key={k.label} className="text-center">
            <p className="text-xs text-[var(--text-tertiary)]">{k.label}</p>
            <p className={`text-sm font-semibold ${k.red ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-[var(--border-subtle)]">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === i
                ? 'bg-white border border-b-white border-[var(--border-default)] text-[var(--accent-primary)] -mb-px'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Tab 0: 9-Box Grid */}
        {tab === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <p className="text-sm text-[var(--text-secondary)]">Rows = Recency · Columns = Frequency. Click any cell for actions.</p>
            </div>
            <div className="flex">
              {/* Y-axis label */}
              <div className="flex flex-col justify-around pr-3 py-8 text-xs text-[var(--text-tertiary)] font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                RECENCY →
              </div>
              <div className="flex-1">
                {/* Column headers */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {fBands.map((fb) => (
                    <div key={fb} className="text-center text-xs font-semibold text-[var(--text-secondary)]">{fb}</div>
                  ))}
                </div>
                <p className="text-center text-xs text-[var(--text-tertiary)] mb-2">FREQUENCY →</p>
                {/* Grid */}
                {rBands.map((rb) => (
                  <div key={rb} className="grid grid-cols-3 gap-2 mb-2">
                    {fBands.map((fb) => {
                      const cell = boxMap[`${rb}__${fb}`];
                      if (!cell) return <div key={fb} className="h-28 bg-gray-50 rounded-lg border border-[var(--border-subtle)]" />;
                      return (
                        <div
                          key={fb}
                          className="h-28 rounded-lg p-3 flex flex-col justify-between cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ background: `${cell.color}22`, border: `1.5px solid ${cell.color}` }}
                        >
                          <div>
                            <p className="text-xs font-bold" style={{ color: cell.color }}>{cell.label}</p>
                            <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                              {(cell.customer_count / 1000).toFixed(1)}K
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">{fmtInr(cell.revenue)}</p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-tight">{cell.action.split('—')[0]}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              {data.insights.map((ins, i) => (
                <p key={i} className="text-sm text-blue-800 mb-1 last:mb-0">• {ins}</p>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Density Heatmap */}
        {tab === 1 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-[var(--text-primary)]">RFM Score Density Heatmap (R × F scores)</h3>
            <div className="max-w-lg mx-auto">
              <div className="mb-3 text-center text-xs text-[var(--text-tertiary)]">FREQUENCY SCORE →</div>
              <div className="flex gap-3 mb-2 ml-16">
                {[1, 2, 3].map((f) => (
                  <div key={f} className="flex-1 text-center text-xs font-semibold text-[var(--text-secondary)]">F={f}</div>
                ))}
              </div>
              {[3, 2, 1].map((r) => (
                <div key={r} className="flex items-center gap-3 mb-2">
                  <div className="w-16 text-xs font-semibold text-[var(--text-secondary)] text-right shrink-0">R={r}</div>
                  {[1, 2, 3].map((f) => {
                    const count = densityMap[`${r}__${f}`] ?? 0;
                    const color = getDensityColor(count);
                    const textColor = count / maxDensity >= 0.4 ? '#ffffff' : '#1a3a5c';
                    return (
                      <div
                        key={f}
                        className="flex-1 h-16 rounded-lg flex items-center justify-center"
                        style={{ background: color, color: textColor }}
                      >
                        <div className="text-center">
                          <p className="font-bold text-sm">{(count / 1000).toFixed(1)}K</p>
                          <p className="text-xs opacity-80">{Math.round(count / s.total_customers * 100)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <p className="text-center text-xs text-[var(--text-tertiary)] mt-3">← RECENCY SCORE</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-[var(--text-tertiary)]">Density:</span>
              {[0.9, 0.6, 0.4, 0.2, 0.05].map((pct) => (
                <div key={pct} className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded" style={{ background: getDensityColor(maxDensity * pct) }} />
                  <span className="text-xs">{Math.round(pct * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Action Playbook */}
        {tab === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Action Playbook by Segment</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.action_playbook} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="segment" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [`${((v as number) * 100).toFixed(0)}%`, 'Expected Lift']} />
                  <Bar dataKey="expected_lift" radius={[0, 4, 4, 0]} fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {['Segment', 'Size', 'Message', 'Channel', 'Timing', 'Lift', 'Cost/Customer'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.action_playbook.map((row) => (
                    <tr key={row.segment} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-medium">{row.segment}</td>
                      <td className="px-3 py-2">{row.size.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-xs text-[var(--text-secondary)] max-w-xs">{row.message}</td>
                      <td className="px-3 py-2">{row.channel}</td>
                      <td className="px-3 py-2 text-xs">{row.timing}</td>
                      <td className="px-3 py-2 font-semibold text-green-600">{(row.expected_lift * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2">{formatMoneyPlainAuto(row.cost_per_customer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Migration */}
        {tab === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">RFM Segment Migration</h3>
              <p className="text-sm text-[var(--text-secondary)]">{data.migration.period}</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Upgraded', value: data.migration.net_change.upgraded, color: '#10B981' },
                { label: 'Stable',   value: data.migration.net_change.stable,   color: '#6366F1' },
                { label: 'Downgraded',value: data.migration.net_change.downgraded, color: '#F59E0B' },
                { label: 'Lost',     value: data.migration.net_change.lost,     color: '#EF4444' },
              ].map((k) => (
                <div key={k.label} className="p-4 rounded-lg text-center" style={{ background: `${k.color}18`, border: `1px solid ${k.color}44` }}>
                  <p className="text-xs text-[var(--text-secondary)]">{k.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">From Segment</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">To Segment</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">Customers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.migration.flows.map((f, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2 font-medium">{f.from}</td>
                      <td className="px-3 py-2 font-medium">{f.to}</td>
                      <td className="px-3 py-2 text-right">{f.count.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Scatter View */}
        {tab === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">RFM Scatter Plot — Recency vs Frequency (bubble = CLV)</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" dataKey="recency_days" name="Recency" unit=" days" tick={{ fontSize: 11 }}
                    label={{ value: 'Recency (days)', position: 'bottom', offset: 0, style: { fontSize: 11, fill: 'var(--text-tertiary)' } }} />
                  <YAxis type="number" dataKey="purchase_frequency" name="Frequency" tick={{ fontSize: 11 }}
                    label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--text-tertiary)' } }} />
                  <ZAxis type="number" dataKey="clv_12m" range={[20, 400]} name="CLV" />
                  <Tooltip formatter={(v: unknown) => [String(v)]} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconSize={8} />
                  {tiers.map((tier) => (
                    tierGroups[tier] && (
                      <Scatter key={tier} name={tier} data={tierGroups[tier]} fill={TIER_COLORS[tier]} fillOpacity={0.6} />
                    )
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 5: Definitions */}
        {tab === 5 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Metric Definitions & Reconciliation</h3>
            <div className="grid grid-cols-1 gap-4">
              {data.definitions.map((def) => (
                <div key={def.metric} className="p-4 border border-[var(--border-subtle)] rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] mt-2 shrink-0" />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{def.metric}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{def.definition}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1 italic">Why it matters: {def.why}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 mb-2">Reconciliation Notes</p>
              <p className="text-sm text-amber-700">RFM segments map to CLV tiers as follows: Champions + Loyal Customers ≈ Platinum/Gold · Potential Loyalists + At Need ≈ Silver · At Risk + Slipping Away ≈ Bronze/At-Risk CLV · Lost ≈ Churned.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
