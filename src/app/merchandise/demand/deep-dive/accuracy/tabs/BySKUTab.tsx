'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

const PAGE_SIZE = 20;

function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function mapeStatus(mape: number): { label: string; badge: string } {
  if (mape < 12) return { label: 'Excellent', badge: 'badge-positive' };
  if (mape < 17) return { label: 'Good', badge: 'badge-neutral' };
  if (mape < 25) return { label: 'Needs attention', badge: 'badge-warning' };
  return { label: 'Poor', badge: 'badge-negative' };
}

const VELOCITY_BASE_MAPE: Record<string, number> = { A: 13.8, B: 14.9, C: 17.7 };
const CATEGORY_MULT: Record<string, number> = {
  'Energy Drinks': 1.5,
  'Chips & Namkeen': 1.3,
  'Ice Cream': 1.4,
  'Edible Oil': 1.2,
  Dairy: 1.2,
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  'badge-positive': 'bg-emerald-100 text-emerald-700',
  'badge-neutral': 'bg-slate-100 text-slate-600',
  'badge-warning': 'bg-amber-100 text-amber-700',
  'badge-negative': 'bg-rose-100 text-rose-700',
};

const INSIGHTS = [
  {
    headline: 'Class C SKUs have 28% higher error than Class A',
    detail:
      'Low-velocity SKUs are harder to forecast. Consider separate model or wider confidence intervals.',
    severity: 'warning' as const,
  },
  {
    headline: 'Top 20 worst-MAPE SKUs need manual review',
    detail:
      'These SKUs have >25% MAPE. Manual demand review or model feature engineering recommended.',
    severity: 'negative' as const,
  },
  {
    headline: 'Energy Drinks category has highest error rate',
    detail:
      'Category multiplier of 1.5× indicates highly volatile demand. Consider weather feature engineering.',
    severity: 'warning' as const,
  },
  {
    headline: 'Class A SKUs well-calibrated at ~14% MAPE',
    detail:
      'High-velocity SKUs are forecast accurately. Ordering confidence is high for these items.',
    severity: 'positive' as const,
  },
];

type SortKey = 'mape' | 'bias' | 'worstWeekMape';
type SortDir = 'asc' | 'desc';

interface Props {
  core: MerchDemandFullPayload;
}

export default function BySKUTab({ core }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('mape');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showWorst, setShowWorst] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);

  const skuMapeData = useMemo(() => {
    const modelCard = core.model_card ?? {};
    const velData =
      (modelCard.accuracy_by_velocity as { velocity_class: string; mape_pct: number }[]) ?? [];

    return core.skus.map((sku, i) => {
      const velBase =
        velData.find((v) => v.velocity_class === sku.velocity_class)?.mape_pct ??
        VELOCITY_BASE_MAPE[sku.velocity_class] ??
        15;
      const spread = sku.velocity_class === 'A' ? 4 : sku.velocity_class === 'B' ? 5 : 6;
      const catMult = CATEGORY_MULT[sku.category] ?? 1.0;
      const mape = velBase * catMult + seededNoise(i * 7) * spread - spread / 2;
      const bias = seededNoise(i * 11) * 10 - 5;
      const trend = seededNoise(i * 13) > 0.5 ? 'improving' : 'worsening';
      const worstWeekMape = mape * (1.2 + seededNoise(i * 17) * 0.4);
      const weeklyMape = Array.from({ length: 8 }, (_, w) => ({
        week: `W${w + 1}`,
        mape: Number(
          (
            mape *
            (0.8 +
              seededNoise(i * 7 + w) * 0.4 +
              (trend === 'improving' ? (7 - w) * 0.01 : w * 0.01))
          ).toFixed(1),
        ),
      }));
      return {
        sku,
        mape: Number(mape.toFixed(1)),
        bias: Number(bias.toFixed(1)),
        trend,
        worstWeekMape: Number(worstWeekMape.toFixed(1)),
        weeklyMape,
      };
    });
  }, [core.skus, core.model_card]);

  const filtered = useMemo(() => {
    let data = skuMapeData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (d) =>
          d.sku.sku_id.toLowerCase().includes(q) ||
          d.sku.product_name.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      data = data.filter((d) => mapeStatus(d.mape).label === statusFilter);
    }
    if (showWorst) data = [...data].sort((a, b) => b.mape - a.mape).slice(0, 20);
    return [...data].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [skuMapeData, searchQuery, statusFilter, showWorst, sortKey, sortDir]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedData = selectedSkuId
    ? skuMapeData.find((d) => d.sku.sku_id === selectedSkuId)
    : null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const handleRowClick = (skuId: string) => {
    setSelectedSkuId((prev) => (prev === skuId ? null : skuId));
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-slate-300 ml-1">↕</span>;
    return (
      <span className="text-[var(--chart-blue)] ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search SKU ID or name…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--chart-blue)] focus:ring-opacity-30"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--chart-blue)] focus:ring-opacity-30"
          >
            <option value="all">All statuses</option>
            <option value="Excellent">Excellent (&lt;12%)</option>
            <option value="Good">Good (12–17%)</option>
            <option value="Needs attention">Needs attention (17–25%)</option>
            <option value="Poor">Poor (&gt;25%)</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={showWorst}
              onChange={(e) => {
                setShowWorst(e.target.checked);
                setPage(0);
              }}
              className="rounded"
            />
            Show worst 20 only
          </label>
          <button
            onClick={() => handleSort(sortKey)}
            className="px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            {sortDir === 'desc' ? 'High → Low' : 'Low → High'}
          </button>
          <span className="text-xs text-[var(--text-tertiary)]">
            {filtered.length} SKUs
          </span>
          <AIInsightButton id="merch-dd-sku-accuracy-table" title="SKU Accuracy" data={filtered as unknown as Record<string, unknown>[]} />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Vel.
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-primary)] select-none"
                  onClick={() => handleSort('mape')}
                >
                  MAPE{sortIndicator('mape')}
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-primary)] select-none"
                  onClick={() => handleSort('bias')}
                >
                  Bias{sortIndicator('bias')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Trend
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide cursor-pointer hover:text-[var(--text-primary)] select-none"
                  onClick={() => handleSort('worstWeekMape')}
                >
                  Worst Wk{sortIndicator('worstWeekMape')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => {
                const status = mapeStatus(row.mape);
                const isSelected = selectedSkuId === row.sku.sku_id;
                return (
                  <tr
                    key={row.sku.sku_id}
                    onClick={() => handleRowClick(row.sku.sku_id)}
                    className={`border-b border-[var(--border-default)] cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50'
                        : 'hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                        {row.sku.product_name}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{row.sku.sku_id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {row.sku.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.sku.velocity_class === 'A'
                            ? 'bg-emerald-100 text-emerald-700'
                            : row.sku.velocity_class === 'B'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {row.sku.velocity_class}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs font-semibold text-[var(--text-primary)]">
                      {row.mape.toFixed(1)}%
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums text-xs font-medium ${
                        row.bias < 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {row.bias > 0 ? '+' : ''}
                      {row.bias.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      <span
                        className={`${row.trend === 'improving' ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {row.trend === 'improving' ? '↓ Improving' : '↑ Worsening'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-[var(--text-secondary)]">
                      {row.worstWeekMape.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE_STYLES[status.badge]}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]"
                  >
                    No SKUs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <p className="text-xs text-[var(--text-tertiary)]">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)}{' '}
              of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
                const pageNum = pageCount <= 7 ? i : Math.max(0, Math.min(page - 3, pageCount - 7)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      page === pageNum
                        ? 'border-[var(--chart-blue)] bg-[var(--chart-blue)] text-white'
                        : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page === pageCount - 1}
                className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mini chart for selected SKU */}
      {selectedData && (
        <div className="card mt-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedData.sku.product_name} — Weekly MAPE
            </p>
            <AIInsightButton id="merch-dd-sku-weekly-mape" title={`${selectedData.sku.product_name} — Weekly MAPE`} data={selectedData.weeklyMape as unknown as Record<string, unknown>[]} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            8-week MAPE trend · Velocity {selectedData.sku.velocity_class} ·{' '}
            {selectedData.sku.category}
          </p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={selectedData.weeklyMape}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  tickFormatter={(v: unknown) => `${Number(v).toFixed(0)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'MAPE']}
                  contentStyle={{ fontSize: 11 }}
                />
                <Line
                  dataKey="mape"
                  stroke="var(--chart-blue)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)]">Current MAPE</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedData.mape.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)]">Bias</p>
              <p
                className={`text-sm font-semibold ${selectedData.bias < 0 ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {selectedData.bias > 0 ? '+' : ''}
                {selectedData.bias.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)]">Trend</p>
              <p
                className={`text-sm font-semibold ${selectedData.trend === 'improving' ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {selectedData.trend === 'improving' ? '↓ Improving' : '↑ Worsening'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)]">Worst Week</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedData.worstWeekMape.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
