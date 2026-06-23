'use client';

import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import type { MerchDemandFullPayload, MerchDemandActionItem } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

function derivePriority(item: MerchDemandActionItem): Priority {
  const absImpact = Math.abs(item.revenue_impact_inr);
  if (
    absImpact >= 400_000 ||
    (item.action_type === 'understock_risk' && item.days_to_impact <= 2)
  )
    return 'Critical';
  if (absImpact >= 150_000 || item.days_to_impact <= 5) return 'High';
  if (absImpact >= 50_000) return 'Medium';
  return 'Low';
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  understock_risk: 'Understock Risk',
  overstock_risk:  'Overstock Risk',
  event_ramp:      'Event Ramp',
  demand_spike:    'Demand Spike',
  demand_drop:     'Demand Drop',
  anomaly:         'Anomaly',
  promo_extend:    'Promo Extend',
  promo_pull:      'Promo Pull',
  launch_scale:    'Launch Scale',
};

const ACTION_TYPE_BADGE: Record<string, string> = {
  understock_risk: 'bg-rose-100 text-rose-700',
  overstock_risk:  'bg-amber-100 text-amber-700',
  event_ramp:      'bg-violet-100 text-violet-700',
  demand_spike:    'bg-emerald-100 text-emerald-700',
  demand_drop:     'bg-blue-100 text-blue-700',
  anomaly:         'bg-indigo-100 text-indigo-700',
  promo_extend:    'bg-teal-100 text-teal-700',
  promo_pull:      'bg-orange-100 text-orange-700',
  launch_scale:    'bg-sky-100 text-sky-700',
};

const PRIORITY_DOT: Record<Priority, string> = {
  Critical: 'bg-rose-500',
  High:     'bg-amber-500',
  Medium:   'bg-blue-500',
  Low:      'bg-slate-400',
};

const PRIORITY_LABEL_COLOR: Record<Priority, string> = {
  Critical: 'text-rose-700',
  High:     'text-amber-700',
  Medium:   'text-blue-700',
  Low:      'text-slate-500',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  core: MerchDemandFullPayload;
}

// ─── Sort key type ────────────────────────────────────────────────────────────

type SortKey = 'revenue_impact_inr' | 'days_to_impact' | 'confidence';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AllExceptionsTab({ core }: Props) {
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('revenue_impact_inr');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  // ── derived counts for insights ──────────────────────────────────────────
  const criticalCount = useMemo(
    () => core.action_items.filter((i) => derivePriority(i) === 'Critical').length,
    [core.action_items],
  );
  const highConfCount = useMemo(
    () => core.action_items.filter((i) => i.confidence === 'High').length,
    [core.action_items],
  );

  // ── filtered + sorted ────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    let items = [...core.action_items];
    if (priorityFilter !== 'All') items = items.filter((i) => derivePriority(i) === priorityFilter);
    if (typeFilter !== 'all') items = items.filter((i) => i.action_type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => {
        const sku = core.skus.find((s) => s.sku_id === i.sku_id);
        return (
          i.sku_id.toLowerCase().includes(q) ||
          sku?.product_name.toLowerCase().includes(q) ||
          i.action_type.includes(q)
        );
      });
    }
    items.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'revenue_impact_inr')
        diff = Math.abs(a.revenue_impact_inr) - Math.abs(b.revenue_impact_inr);
      else if (sortKey === 'days_to_impact')
        diff = a.days_to_impact - b.days_to_impact;
      else diff = a.confidence.localeCompare(b.confidence);
      return sortDir === 'desc' ? -diff : diff;
    });
    return items;
  }, [core.action_items, core.skus, priorityFilter, typeFilter, searchQuery, sortKey, sortDir]);

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── sort toggle ───────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  }

  // ── page select helpers ───────────────────────────────────────────────────
  function resetPage() {
    setPage(0);
    setSelectedIds(new Set());
  }

  // ── bulk selection ────────────────────────────────────────────────────────
  const pageIds = paginated.map((i) => i.action_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── unique action types for filter dropdown ───────────────────────────────
  const allTypes = useMemo(
    () => Array.from(new Set(core.action_items.map((i) => i.action_type))).sort(),
    [core.action_items],
  );

  const INSIGHTS = [
    {
      headline: `${criticalCount} critical exceptions need immediate action`,
      detail:
        'Prioritise understock risks with <3 days to impact — these can cause immediate stockouts.',
      severity: 'negative' as const,
    },
    {
      headline: 'Revenue at stake concentration',
      detail:
        'Top 10 exceptions account for 65% of total revenue at stake. Focus here first.',
      severity: 'warning' as const,
    },
    {
      headline: 'Event ramp exceptions increasing',
      detail:
        'Eid al-Adha preparation is generating most new exceptions. Bulk approve event ramp items.',
      severity: 'warning' as const,
    },
    {
      headline: 'High confidence exceptions: act immediately',
      detail: `${highConfCount} High-confidence exceptions have >85% probability of impact. No need to wait.`,
      severity: 'neutral' as const,
    },
  ];

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'desc' ? (
        <ChevronDown size={12} className="inline ml-0.5" />
      ) : (
        <ChevronUp size={12} className="inline ml-0.5" />
      )
    ) : (
      <ChevronDown size={12} className="inline ml-0.5 opacity-30" />
    );

  const showStart = page * PAGE_SIZE + 1;
  const showEnd = Math.min((page + 1) * PAGE_SIZE, sorted.length);

  return (
    <div className="space-y-6">
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search SKU, product name..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
          className="px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />

        {/* Priority filter */}
        <div className="flex gap-1">
          {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setPriorityFilter(p); resetPage(); }}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                priorityFilter === p
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
          className="px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>{ACTION_TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>

        <span className="text-xs text-[var(--text-tertiary)] ml-auto">
          {sorted.length} exception{sorted.length !== 1 ? 's' : ''}
        </span>
        <AIInsightButton id="merch-dd-all-exceptions" title="All Exceptions" data={sorted as unknown as Record<string, unknown>[]} />
      </div>

      {/* ── Bulk actions bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="font-medium text-blue-800">{selectedIds.size} selected</span>
          <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors">
            Approve selected
          </button>
          <button className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors flex items-center gap-1">
            <Clock size={12} /> Snooze 7 days
          </button>
          <button className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors">
            Export selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-blue-500 hover:text-blue-700 text-xs"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Action Type
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer select-none hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('revenue_impact_inr')}
                >
                  Revenue at Stake <SortIcon col="revenue_impact_inr" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer select-none hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('days_to_impact')}
                >
                  Days to Impact <SortIcon col="days_to_impact" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer select-none hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('confidence')}
                >
                  Confidence <SortIcon col="confidence" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-[var(--text-tertiary)]"
                  >
                    No exceptions match the current filters.
                  </td>
                </tr>
              )}
              {paginated.map((item) => {
                const sku = core.skus.find((s) => s.sku_id === item.sku_id);
                const priority = derivePriority(item);
                const isSelected = selectedIds.has(item.action_id);
                return (
                  <tr
                    key={item.action_id}
                    className={`hover:bg-[var(--bg-secondary)] transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(item.action_id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[priority]}`}
                        />
                        <span
                          className={`text-xs font-medium ${PRIORITY_LABEL_COLOR[priority]}`}
                        >
                          {priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)] text-xs truncate max-w-[140px]">
                        {sku?.product_name ?? item.sku_id}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{item.sku_id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {sku?.category ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          ACTION_TYPE_BADGE[item.action_type] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ACTION_TYPE_LABELS[item.action_type] ?? item.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-[var(--text-primary)]">
                      {formatLakhsCrores(Math.abs(item.revenue_impact_inr))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs font-medium ${
                          item.days_to_impact <= 2
                            ? 'text-rose-600'
                            : item.days_to_impact <= 5
                            ? 'text-amber-600'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {item.days_to_impact}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          item.confidence === 'High'
                            ? 'text-emerald-700'
                            : item.confidence === 'Medium'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button className="px-2 py-1 bg-blue-600 text-white text-[10px] font-medium rounded-md hover:bg-blue-700 transition-colors">
                          Approve
                        </button>
                        <button className="px-2 py-1 border border-[var(--border-default)] text-[var(--text-secondary)] text-[10px] font-medium rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
                          Override
                        </button>
                        <button className="p-1 border border-[var(--border-default)] text-[var(--text-tertiary)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
                          <Clock size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <span className="text-xs text-[var(--text-tertiary)]">
              Showing {showStart}–{showEnd} of {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-[var(--text-secondary)]">
                {page + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="px-3 py-1 text-xs border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Insights ── */}
      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
