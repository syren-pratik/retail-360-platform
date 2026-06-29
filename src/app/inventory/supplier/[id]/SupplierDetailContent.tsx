'use client';


import { formatCrOrUsdMAuto } from '@/app/lib/format-money';
import Link from 'next/link';
import { ArrowLeft, Download, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OTIFPoint { month: string; otif_pct: number; target: number }
interface DelayReasons { manufacturing_pct: number; logistics_pct: number; quality_pct: number; documentation_pct: number; no_reason_pct: number }
interface CategoryPerf { category: string; otif_pct: number; fill_rate_pct: number; avg_delay_days: number; order_value_cr: number; stockouts_caused: number }
interface StoreImpact { store_id: string; store_name: string; city: string; stockouts_caused: number; rev_at_risk_cr: number; last_delivery_status: string }
interface OpenPO { po_id: string; category: string; store_name: string; qty: number; value_cr: number; expected_date: string; status: string }
interface TopSKU { product_id: string; product_name: string; category: string; avg_daily_demand: number; current_stock: number; days_of_supply: number; status: string; stockout_events_90d: number; rev_at_risk_cr: number }
interface PeerEntry { supplier_id: string; name: string; category: string; otif_pct: number; order_value_cr: number }
interface AIRec { priority: 'critical' | 'high' | 'medium'; action: string; detail: string; expected_impact: string }

export interface SupplierProfile {
  supplier_id: string;
  name: string;
  short_name: string;
  category: string;
  categories_supplied: string[];
  headquarters: string;
  account_manager: string;
  contract_expiry: string;
  relationship_years: number;
  overall_score: number;
  score_trend: string;
  otif_pct: number;
  fill_rate_pct: number;
  avg_delay_days: number;
  order_value_cr: number;
  stockouts_caused: number;
  trend: string;
  otif_12m: OTIFPoint[];
  delay_reasons: DelayReasons;
  category_performance: CategoryPerf[];
  store_impact: StoreImpact[];
  open_pos: OpenPO[];
  top_skus: TopSKU[];
  peer_comparison: PeerEntry[];
  ai_recommendations: AIRec[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreBg(score: number) {
  if (score < 50) return 'bg-red-100 text-red-700 border-red-300';
  if (score < 70) return 'bg-amber-100 text-amber-700 border-amber-300';
  return 'bg-green-100 text-green-700 border-green-300';
}

function otifColor(pct: number) {
  if (pct < 70) return 'text-red-600';
  if (pct < 85) return 'text-amber-600';
  return 'text-green-600';
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    on_time: 'bg-green-50 text-green-700 border-green-200',
    delayed: 'bg-red-50 text-red-700 border-red-200',
    at_risk: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    pending: 'bg-gray-50 text-gray-600 border-gray-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    low: 'bg-amber-50 text-amber-700 border-amber-200',
    healthy: 'bg-green-50 text-green-700 border-green-200',
    overstock: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return map[status] ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

function priorityBadge(p: string) {
  if (p === 'critical') return 'bg-red-50 border-red-200 text-red-800';
  if (p === 'high') return 'bg-amber-50 border-amber-200 text-amber-800';
  return 'bg-blue-50 border-blue-200 text-blue-800';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupplierDetailContent({ profile }: { profile: SupplierProfile }) {
  const delayChartData = [
    { name: 'Manufacturing', value: profile.delay_reasons.manufacturing_pct, fill: '#FCA5A5' },
    { name: 'Logistics', value: profile.delay_reasons.logistics_pct, fill: '#FCD34D' },
    { name: 'Quality', value: profile.delay_reasons.quality_pct, fill: '#6EE7B7' },
    { name: 'Documentation', value: profile.delay_reasons.documentation_pct, fill: '#93C5FD' },
    { name: 'No Reason', value: profile.delay_reasons.no_reason_pct, fill: '#D1D5DB' },
  ];

  const peerData = profile.peer_comparison.map(p => ({
    name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
    otif_pct: p.otif_pct,
    isThis: p.supplier_id === profile.supplier_id,
  }));

  const TrendIcon = profile.score_trend === 'improving'
    ? TrendingUp
    : profile.score_trend === 'declining'
    ? TrendingDown
    : Minus;
  const trendColor = profile.score_trend === 'improving'
    ? 'text-green-600'
    : profile.score_trend === 'declining'
    ? 'text-red-600'
    : 'text-gray-500';

  const handleExport = () => {
    const rows = profile.top_skus.map(s =>
      [s.product_name, s.category, s.avg_daily_demand, s.current_stock, s.days_of_supply, s.status, s.stockout_events_90d, s.rev_at_risk_cr].join(',')
    );
    const csv = ['Product,Category,Avg Daily Demand,Current Stock,DOS,Status,Stockouts 90d,Rev Risk Cr', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${profile.short_name}_supplier_360.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/deep/supply-chain"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Supply Chain
          </Link>
          <span className="text-[var(--border-default)]">|</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{profile.name}</span>
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Supplier 360</span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* SECTION 1 — HERO IDENTITY */}
        <section className="card">
          <div className="flex items-start gap-6">
            <div className={`flex-shrink-0 w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center ${scoreBg(profile.overall_score)}`}>
              <span className="text-2xl font-bold">{profile.overall_score}</span>
              <span className="text-[10px] uppercase tracking-wide font-medium">Score</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">{profile.name}</h1>
                <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                  <TrendIcon size={14} />
                  {profile.score_trend}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">{profile.categories_supplied.join(' · ')}</p>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Headquarters</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{profile.headquarters}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Account Manager</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{profile.account_manager}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Contract Expiry</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{profile.contract_expiry}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Relationship</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{profile.relationship_years} years</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — KPI STRIP */}
        <section>
          <div className="grid grid-cols-5 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">OTIF %</p>
              <p className={`text-lg font-semibold ${otifColor(profile.otif_pct)}`}>{profile.otif_pct}%</p>
              <p className="text-xs text-[var(--text-tertiary)]">target: 90%</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Fill Rate</p>
              <p className={`text-lg font-semibold ${otifColor(profile.fill_rate_pct)}`}>{profile.fill_rate_pct}%</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Delay</p>
              <p className={`text-lg font-semibold ${profile.avg_delay_days > 3 ? 'text-red-600' : profile.avg_delay_days > 1.5 ? 'text-amber-600' : 'text-green-600'}`}>
                {profile.avg_delay_days}d
              </p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Order Value</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCrOrUsdMAuto(profile.order_value_cr)}</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Stockouts Caused</p>
              <p className={`text-lg font-semibold ${profile.stockouts_caused > 20 ? 'text-red-600' : profile.stockouts_caused > 10 ? 'text-amber-600' : 'text-green-600'}`}>
                {profile.stockouts_caused}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3 — OTIF TREND + DELAY REASONS */}
        <section className="grid grid-cols-2 gap-6">
          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">OTIF 12-Month Trend</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Monthly OTIF % vs 90% target</p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profile.otif_12m} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} tickLine={false} interval={2} />
                  <YAxis
                    domain={[50, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v: unknown) => [`${v as number}%`]} />
                  <ReferenceLine y={90} stroke="#EF4444" strokeDasharray="4 3"
                    label={{ value: '90% target', position: 'right', fontSize: 9, fill: '#EF4444' }} />
                  <Line
                    type="monotone"
                    dataKey="otif_pct"
                    name="OTIF %"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Delay Root Causes</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">% share by delay category</p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delayChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(v: unknown) => [`${v as number}%`]} contentStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="value" name="Share">
                    {delayChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* SECTION 4 — CATEGORY PERFORMANCE */}
        <section className="card overflow-x-auto">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Performance by Category</h4>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Breakdown across supplied categories</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                {['Category', 'OTIF %', 'Fill Rate', 'Avg Delay', 'Order ($)', 'Stockouts'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.category_performance.map(cat => (
                <tr key={cat.category} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{cat.category}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs font-semibold ${otifColor(cat.otif_pct)}`}>{cat.otif_pct}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{cat.fill_rate_pct}%</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{cat.avg_delay_days}d</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{formatCrOrUsdMAuto(cat.order_value_cr)}</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{cat.stockouts_caused}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* SECTION 5 — STORE IMPACT + OPEN POs */}
        <section className="grid grid-cols-2 gap-6">
          <div className="card overflow-x-auto">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Store Impact</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Stores most affected by this supplier</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  {['Store', 'City', 'Stockouts', 'Rev Risk', 'Last Delivery'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.store_impact.map(s => (
                  <tr key={s.store_id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-2 px-2 font-medium text-[var(--text-primary)] text-xs">{s.store_name}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)] text-xs">{s.city}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)] text-xs">{s.stockouts_caused}</td>
                    <td className="py-2 px-2 text-red-600 text-xs font-medium">{formatCrOrUsdMAuto(s.rev_at_risk_cr)}</td>
                    <td className="py-2 px-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge(s.last_delivery_status)}`}>
                        {s.last_delivery_status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-x-auto">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Open Purchase Orders</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Active POs with expected delivery dates</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  {['PO ID', 'Category', 'Store', 'Value', 'Due', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-[var(--text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.open_pos.map(po => (
                  <tr key={po.po_id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-2 px-2 font-mono text-[var(--text-tertiary)] text-[10px]">{po.po_id}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)] text-xs">{po.category}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)] text-xs">{po.store_name}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)] text-xs">{formatCrOrUsdMAuto(po.value_cr)}</td>
                    <td className="py-2 px-2 text-[var(--text-secondary)] text-xs">{po.expected_date}</td>
                    <td className="py-2 px-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 6 — TOP SKUs */}
        <section className="card overflow-x-auto">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Top SKUs by Risk</h4>
          <p className="text-xs text-[var(--text-secondary)] mb-3">SKUs with highest exposure to supply disruption from this supplier</p>
          <table className="w-full text-sm" style={{ minWidth: 820 }}>
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                {['Product', 'Category', 'Avg Daily Demand', 'Stock', 'DOS', 'Status', 'Stockouts (90d)', 'Rev Risk'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.top_skus.map(sku => (
                <tr key={sku.product_id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{sku.product_name}</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)] text-xs">{sku.category}</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{sku.avg_daily_demand}</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{sku.current_stock}</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-medium ${sku.days_of_supply < 7 ? 'text-red-600' : sku.days_of_supply < 14 ? 'text-amber-600' : 'text-green-600'}`}>
                      {sku.days_of_supply}d
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${statusBadge(sku.status)}`}>
                      {sku.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">{sku.stockout_events_90d}</td>
                  <td className="py-2.5 px-3 text-red-600 font-medium">{formatCrOrUsdMAuto(sku.rev_at_risk_cr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* SECTION 7 — PEER COMPARISON + AI RECOMMENDATIONS */}
        <section className="grid grid-cols-2 gap-6">
          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">Peer Comparison</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">OTIF % vs category peers · highlighted = this supplier</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peerData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(v: unknown) => [`${v as number}%`, 'OTIF']} contentStyle={{ fontSize: '11px' }} />
                  <ReferenceLine x={90} stroke="#EF4444" strokeDasharray="4 3"
                    label={{ value: 'Target', position: 'top', fontSize: 9, fill: '#EF4444' }} />
                  <Bar dataKey="otif_pct" name="OTIF %">
                    {peerData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.isThis ? '#6366F1' : '#BFDBFE'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">AI Recommendations</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Actions to improve supplier performance</p>
            <div className="space-y-3">
              {profile.ai_recommendations.map((rec, idx) => (
                <div key={idx} className={`rounded-lg border p-3 ${priorityBadge(rec.priority)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide">{rec.priority}</span>
                    <span className="text-xs opacity-75">{rec.expected_impact}</span>
                  </div>
                  <p className="text-sm font-medium mb-0.5">{rec.action}</p>
                  <p className="text-xs opacity-80">{rec.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </div>
  );
}
