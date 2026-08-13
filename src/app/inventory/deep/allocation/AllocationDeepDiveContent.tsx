'use client';


import { formatCrOrUsdMAuto, formatLOrUsdKAuto } from '@/app/lib/format-money';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreAllocation {
  store_id: string;
  store_name: string;
  city: string;
  current_allocation_cr: number;
  revenue_optimal_allocation_cr: number;
  gap_cr: number;
  gap_type: string;
  daily_revenue_cr: number;
  revenue_lost_daily_cr: number;
  top_gap_category: string;
  allocation_score: number;
}

interface CategoryAllocation {
  category: string;
  total_current_allocation_cr: number;
  total_optimal_allocation_cr: number;
  gap_cr: number;
  stores_under: number;
  stores_over: number;
  revenue_opportunity_cr: number;
}

interface AllocationData {
  summary: {
    revenue_optimal_gap_cr: number;
    stores_over_allocated: number;
    stores_under_allocated: number;
    skus_misallocated: number;
    reallocation_opportunity_cr: number;
  };
  by_store: StoreAllocation[];
  by_category: CategoryAllocation[];
}

interface Transfer {
  transfer_id: string;
  from_store_id: string;
  from_store: string;
  from_city: string;
  to_store_id: string;
  to_store: string;
  to_city: string;
  category: string;
  skus: string[];
  transfer_qty: number;
  transfer_value_cr: number;
  from_current_dos: number;
  from_post_transfer_dos: number;
  to_current_dos: number;
  to_post_transfer_dos: number;
  revenue_preserved_cr: number;
  urgency: string;
  logistics_days: number;
  logistics_cost_cr: number;
  net_benefit_cr: number;
  status: string;
}

interface TransferData {
  summary: {
    total_opportunities: number;
    total_value_cr: number;
    immediate_action_count: number;
    estimated_revenue_preserved_cr: number;
  };
  transfers: Transfer[];
}

interface Props {
  allocation: unknown;
  transfers: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {n}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[var(--border-subtle)]" />;
}

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 leading-relaxed">
      {children}
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-50 text-red-700',
    high: 'bg-orange-50 text-orange-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-green-50 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[urgency] ?? 'bg-gray-50 text-gray-600'}`}>
      {urgency}
    </span>
  );
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StoreGapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: StoreAllocation = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-md space-y-0.5">
      <p className="font-semibold text-gray-800 mb-1">{d.store_name}</p>
      <p className="text-gray-600">City: <span className="font-medium">{d.city}</span></p>
      <p className="text-gray-600">Current: <span className="font-medium">{formatCrOrUsdMAuto(d.current_allocation_cr)}</span></p>
      <p className="text-gray-600">Optimal: <span className="font-medium">{formatCrOrUsdMAuto(d.revenue_optimal_allocation_cr)}</span></p>
      <p className="text-gray-600">Gap: <span className={`font-medium ${d.gap_cr < 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatCrOrUsdMAuto(d.gap_cr)}</span></p>
      {d.revenue_lost_daily_cr > 0 && (
        <p className="text-red-600 font-medium">-{formatCrOrUsdMAuto(d.revenue_lost_daily_cr)}/day lost</p>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CategoryGapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: CategoryAllocation = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-md space-y-0.5">
      <p className="font-semibold text-gray-800 mb-1">{d.category}</p>
      <p className="text-gray-600">Current: <span className="font-medium">{formatCrOrUsdMAuto(d.total_current_allocation_cr)}</span></p>
      <p className="text-gray-600">Optimal: <span className="font-medium">{formatCrOrUsdMAuto(d.total_optimal_allocation_cr)}</span></p>
      <p className="text-gray-600">Gap: <span className={`font-medium ${d.gap_cr < 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatCrOrUsdMAuto(d.gap_cr)}</span></p>
      <p className="text-gray-600">Under-allocated stores: <span className="font-medium">{d.stores_under}</span></p>
      <p className="text-gray-600">Over-allocated stores: <span className="font-medium">{d.stores_over}</span></p>
      {d.revenue_opportunity_cr > 0 && (
        <p className="text-green-600 font-medium">+{formatCrOrUsdMAuto(d.revenue_opportunity_cr)} opportunity</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AllocationDeepDiveContent({ allocation: allocationRaw, transfers: transfersRaw }: Props) {
  const allocation = allocationRaw as AllocationData;
  const transfers = transfersRaw as TransferData;

  const [approvedTransfers, setApprovedTransfers] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const approveTransfer = (id: string) => {
    setApprovedTransfers(prev => { const next = new Set(prev); next.add(id); return next; });
    showToast(`Transfer ${id} approved — logistics team notified`);
  };

  // Sort stores by abs(gap) descending
  const sortedStores = useMemo(() =>
    [...allocation.by_store].sort((a, b) => Math.abs(b.gap_cr) - Math.abs(a.gap_cr)),
    [allocation.by_store]
  );

  // Sort categories by gap ascending (most negative first)
  const sortedCategories = useMemo(() =>
    [...allocation.by_category].sort((a, b) => a.gap_cr - b.gap_cr),
    [allocation.by_category]
  );

  // Derived KPIs
  const totalDailyRevenueLost = useMemo(() =>
    allocation.by_store.reduce((s, st) => s + st.revenue_lost_daily_cr, 0).toFixed(2),
    [allocation.by_store]
  );

  // Derive the two extremes dynamically from data (worst under-allocated city
  // and worst over-allocated city) so captions work for any tenant.
  const { underCity, underTotal, overCity, overTotal } = useMemo(() => {
    const cityGap: Record<string, number> = {};
    for (const s of allocation.by_store) {
      cityGap[s.city] = (cityGap[s.city] ?? 0) + s.gap_cr;
    }
    const entries = Object.entries(cityGap);
    const underEntry = entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min), entries[0] ?? ['—', 0]);
    const overEntry = entries.reduce((max, cur) => (cur[1] > max[1] ? cur : max), entries[0] ?? ['—', 0]);
    return {
      underCity: underEntry[0],
      underTotal: Math.abs(underEntry[1]).toFixed(1),
      overCity: overEntry[0],
      overTotal: Math.max(0, overEntry[1]).toFixed(1),
    };
  }, [allocation.by_store]);

  const criticalRevenuePreserved = useMemo(() =>
    transfers.transfers
      .filter(t => t.urgency === 'critical')
      .reduce((s, t) => s + t.revenue_preserved_cr, 0)
      .toFixed(2),
    [transfers.transfers]
  );

  const criticalTransferValue = useMemo(() =>
    transfers.transfers
      .filter(t => t.urgency === 'critical')
      .reduce((s, t) => s + t.transfer_value_cr, 0)
      .toFixed(2),
    [transfers.transfers]
  );

  // Build from/to store groups for the flow visual
  const fromStores = useMemo(() => {
    const map = new Map<string, { store: string; city: string; totalOut: number; transfers: Transfer[] }>();
    transfers.transfers.forEach(t => {
      if (!map.has(t.from_store_id)) {
        map.set(t.from_store_id, { store: t.from_store, city: t.from_city, totalOut: 0, transfers: [] });
      }
      const entry = map.get(t.from_store_id)!;
      entry.totalOut += t.transfer_value_cr;
      entry.transfers.push(t);
    });
    return Array.from(map.values());
  }, [transfers.transfers]);

  const toStores = useMemo(() => {
    const map = new Map<string, { store: string; city: string; totalPreserved: number; transfers: Transfer[] }>();
    transfers.transfers.forEach(t => {
      if (!map.has(t.to_store_id)) {
        map.set(t.to_store_id, { store: t.to_store, city: t.to_city, totalPreserved: 0, transfers: [] });
      }
      const entry = map.get(t.to_store_id)!;
      entry.totalPreserved += t.revenue_preserved_cr;
      entry.transfers.push(t);
    });
    return Array.from(map.values());
  }, [transfers.transfers]);

  const sortedTransfers = useMemo(() => {
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...transfers.transfers].sort((a, b) => (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9));
  }, [transfers.transfers]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-fade-in">
          ✓ {toast}
        </div>
      )}

      {/* Sticky nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Supply Intelligence
          </Link>
          <span className="text-[var(--border-default)]">|</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Stock Allocation &amp; Transfers</span>
        </div>
        <Link
          href="/inventory/deep/scenarios"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          Want to model a supplier delay? → Run Scenario Simulator
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* Page heading */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Stock Allocation &amp; Transfers</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Where stock should be vs. where it is — and prescriptive transfers to close the gap
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1 — ALLOCATION INTELLIGENCE                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={1}
            title="Current vs Revenue-Optimal Allocation"
            subtitle="Where stock should be vs where it is — and what the gap is costing"
          />

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Revenue Gap (daily)</p>
              <p className="text-lg font-semibold text-red-600">{formatCrOrUsdMAuto(totalDailyRevenueLost)}/day</p>
              <p className="text-xs text-[var(--text-secondary)]">from misallocation</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Under-Allocated Stores</p>
              <p className="text-lg font-semibold text-red-600">{allocation.summary.stores_under_allocated}</p>
              <p className="text-xs text-[var(--text-secondary)]">need more stock</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Over-Allocated Stores</p>
              <p className="text-lg font-semibold text-blue-600">{allocation.summary.stores_over_allocated}</p>
              <p className="text-xs text-[var(--text-secondary)]">capital tied up</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Reallocation Opportunity</p>
              <p className="text-lg font-semibold text-green-600">{formatCrOrUsdMAuto(allocation.summary.reallocation_opportunity_cr)}</p>
              <p className="text-xs text-[var(--text-secondary)]">no new procurement needed</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">

            {/* Store gap chart */}
            <div className="card px-4 pt-4 pb-2">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Allocation Gap by Store (($))</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mr-1" />Under-allocated
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mx-1 ml-3" />Over-allocated
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sortedStores} layout="vertical" margin={{ left: 10, right: 50, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatCrOrUsdMAuto(v)} />
                  <YAxis
                    dataKey="store_name"
                    type="category"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={160}
                    tickFormatter={v => v.length > 22 ? v.slice(0, 22) + '…' : v}
                  />
                  <Tooltip content={<StoreGapTooltip />} />
                  <ReferenceLine x={0} stroke="var(--border-default)" strokeWidth={1.5} />
                  <Bar dataKey="gap_cr" name="Allocation Gap" radius={[0, 2, 2, 0]}>
                    {sortedStores.map((entry, idx) => (
                      <Cell key={idx} fill={entry.gap_cr < 0 ? '#DC2626' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category gap chart */}
            <div className="card px-4 pt-4 pb-2">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Allocation Gap by Category (($))</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mr-1" />Revenue risk
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mx-1 ml-3" />Capital waste
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sortedCategories} layout="vertical" margin={{ left: 10, right: 50, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => formatCrOrUsdMAuto(v)} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <Tooltip content={<CategoryGapTooltip />} />
                  <ReferenceLine x={0} stroke="var(--border-default)" strokeWidth={1.5} />
                  <Bar dataKey="gap_cr" name="Allocation Gap" radius={[0, 2, 2, 0]}>
                    {sortedCategories.map((entry, idx) => (
                      <Cell key={idx} fill={entry.gap_cr < 0 ? '#DC2626' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Insight>
            {underCity} stores are under-allocated by {formatCrOrUsdMAuto(underTotal)} while {overCity} stores carry {formatCrOrUsdMAuto(overTotal)} in excess inventory. A lateral rebalance would preserve {formatCrOrUsdMAuto(transfers.summary.estimated_revenue_preserved_cr)} in daily revenue without any new procurement.
          </Insight>
        </section>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2 — TRANSFER RECOMMENDATIONS                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <SectionHeader
            n={2}
            title="Transfer Opportunities"
            subtitle="Move stock from overstock to understock stores — ranked by net benefit"
          />

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Opportunities</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{transfers.summary.total_opportunities}</p>
              <p className="text-xs text-[var(--text-secondary)]">across all stores</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Immediate Action</p>
              <p className="text-lg font-semibold text-red-600">{transfers.summary.immediate_action_count}</p>
              <p className="text-xs text-[var(--text-secondary)]">critical &amp; high today</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Value to Move</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCrOrUsdMAuto(transfers.summary.total_value_cr)}</p>
              <p className="text-xs text-[var(--text-secondary)]">stock to redistribute</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Revenue Preserved</p>
              <p className="text-lg font-semibold text-green-600">{formatCrOrUsdMAuto(transfers.summary.estimated_revenue_preserved_cr)}</p>
              <p className="text-xs text-[var(--text-secondary)]">from approved transfers</p>
            </div>
          </div>

          {/* Transfer flow visual */}
          <div className="grid grid-cols-3 gap-0 border border-[var(--border-default)] rounded-xl overflow-hidden">

            {/* Column 1: Overstock stores */}
            <div className="bg-blue-50 border-r border-[var(--border-subtle)]">
              <div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Overstock Stores</p>
                <p className="text-xs text-blue-600 mt-0.5">Sending stock out</p>
              </div>
              <div className="p-3 space-y-2">
                {fromStores.map((store, i) => (
                  <div key={i} className="bg-white rounded-lg px-3 py-2.5 border border-blue-100">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{store.store}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{store.city}</p>
                    <div className="mt-1.5 space-y-0.5">
                      {store.transfers.map(t => (
                        <p key={t.transfer_id} className="text-[10px] text-blue-600">
                          {t.category}: {t.from_current_dos}d → {t.from_post_transfer_dos}d DoS
                        </p>
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                      Total out: {formatCrOrUsdMAuto(store.totalOut.toFixed(2))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Transfers (arrows) */}
            <div className="bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)]">
              <div className="px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Transfers</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Category · Qty · Cost</p>
              </div>
              <div className="p-3 space-y-2">
                {sortedTransfers.map(t => (
                  <div key={t.transfer_id} className="bg-white rounded-lg px-3 py-2.5 border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{t.transfer_id}</span>
                      <UrgencyBadge urgency={t.urgency} />
                    </div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{t.category}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{t.transfer_qty.toLocaleString()} units · {formatCrOrUsdMAuto(t.transfer_value_cr)}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {t.logistics_days}d transit · {formatLOrUsdKAuto((t.logistics_cost_cr * 100).toFixed(0))} cost
                    </p>
                    <p className="text-[10px] text-green-600 font-medium mt-1">Net: {formatCrOrUsdMAuto(t.net_benefit_cr)}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">→ {t.from_store.split(' ').slice(0, 2).join(' ')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Understocked stores */}
            <div className="bg-red-50">
              <div className="px-4 py-3 bg-red-100 border-b border-red-200">
                <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">Understocked Stores</p>
                <p className="text-xs text-red-600 mt-0.5">Receiving stock</p>
              </div>
              <div className="p-3 space-y-2">
                {toStores.map((store, i) => (
                  <div key={i} className="bg-white rounded-lg px-3 py-2.5 border border-red-100">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{store.store}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{store.city}</p>
                    <div className="mt-1.5 space-y-0.5">
                      {store.transfers.map(t => (
                        <p key={t.transfer_id} className="text-[10px] text-green-600">
                          {t.category}: {t.to_current_dos}d → {t.to_post_transfer_dos}d DoS ↑
                        </p>
                      ))}
                    </div>
                    <p className="text-[10px] text-green-600 font-medium mt-1">
                      Revenue preserved: {formatCrOrUsdMAuto(store.totalPreserved.toFixed(2))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full transfer table */}
          <div className="card overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-[var(--border-subtle)]">
              <p className="text-sm font-medium text-[var(--text-primary)]">Transfer Detail</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Sorted by urgency — critical first</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="text-left px-3 py-2.5 font-medium text-[var(--text-secondary)]">ID</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[var(--text-secondary)]">From → To</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[var(--text-secondary)]">Category</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[var(--text-secondary)]">SKUs</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Qty</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Value ($)</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[var(--text-secondary)]">DoS Impact</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Revenue ($)</th>
                    <th className="text-center px-3 py-2.5 font-medium text-[var(--text-secondary)]">Logistics</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[var(--text-secondary)]">Net ($)</th>
                    <th className="text-center px-3 py-2.5 font-medium text-[var(--text-secondary)]">Urgency</th>
                    <th className="text-center px-3 py-2.5 font-medium text-[var(--text-secondary)]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {sortedTransfers.map(t => (
                    <tr key={t.transfer_id} className="hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--text-tertiary)]">{t.transfer_id}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[var(--text-primary)]">{t.from_store}</p>
                        <p className="text-[var(--text-tertiary)]">{t.from_city}</p>
                        <p className="text-[var(--text-secondary)] mt-0.5">→ {t.to_store}</p>
                        <p className="text-[var(--text-tertiary)]">{t.to_city}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">{t.category}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[var(--text-primary)]">{t.skus[0]}</span>
                        {t.skus.length > 1 && (
                          <span className="ml-1 text-[var(--text-tertiary)]">+{t.skus.length - 1} more</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">{t.transfer_qty.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-[var(--text-primary)]">{formatCrOrUsdMAuto(t.transfer_value_cr)}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-blue-600">From: {t.from_current_dos}d → {t.from_post_transfer_dos}d</p>
                        <p className="text-green-600">To: {t.to_current_dos}d → {t.to_post_transfer_dos}d</p>
                      </td>
                      <td className="px-3 py-2.5 text-right text-green-600 font-medium">{formatCrOrUsdMAuto(t.revenue_preserved_cr)}</td>
                      <td className="px-3 py-2.5 text-center text-[var(--text-secondary)]">
                        {t.logistics_days}d · {formatLOrUsdKAuto((t.logistics_cost_cr * 100).toFixed(0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-600">{formatCrOrUsdMAuto(t.net_benefit_cr)}</td>
                      <td className="px-3 py-2.5 text-center"><UrgencyBadge urgency={t.urgency} /></td>
                      <td className="px-3 py-2.5 text-center">
                        {approvedTransfers.has(t.transfer_id) ? (
                          <span className="text-[10px] text-green-600 font-medium">✓ Approved</span>
                        ) : (
                          <button
                            onClick={() => approveTransfer(t.transfer_id)}
                            className="text-[10px] px-2.5 py-1 bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90 transition-opacity font-medium"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Insight>
            {transfers.summary.immediate_action_count} transfers totalling {formatCrOrUsdMAuto(criticalTransferValue)} are urgently needed today. Delhi NCR stockouts in Personal Care can be resolved in 2 days by moving excess Mumbai stock — preserving {formatCrOrUsdMAuto(criticalRevenuePreserved)} while waiting for the next supplier delivery.
          </Insight>
        </section>

      </div>
    </div>
  );
}
