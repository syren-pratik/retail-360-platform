'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  Check,
  Edit3,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PriceRecommendation } from '@/app/lib/price-types';
import { usePrice } from '@/app/context/PriceContext';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface PriceRecommendationTableProps {
  recommendations: PriceRecommendation[];
  onProductClick?: (productId: string) => void;
}

type SortField = 'product_name' | 'department' | 'current_price' | 'recommended_price' | 'price_change_pct' | 'revenue_impact' | 'recommendation_priority';
type SortDirection = 'asc' | 'desc';

const priorityOrder = { High: 0, Medium: 1, Low: 2 };
const priorityColors = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
};

const rejectionReasons = [
  'Competitive pressure',
  'Strategic hold',
  'Customer sensitivity',
  'Seasonal timing',
  'Other',
];

function formatCurrency(value: number): string {
  return `₹${(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function PriceRecommendationTable({
  recommendations,
  onProductClick,
}: PriceRecommendationTableProps) {
  const { recommendationActions, acceptRecommendation, rejectRecommendation, overrideRecommendation } = usePrice();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('revenue_impact');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>({});
  const [rejectDropdown, setRejectDropdown] = useState<string | null>(null);

  const pageSize = 15;

  // Normalize data - convert string values to numbers
  const normalizedRecommendations = useMemo(() => {
    return (recommendations ?? []).map(r => ({
      ...r,
      current_price: Number(r.current_price) || 0,
      recommended_price: Number(r.recommended_price) || 0,
      price_change_pct: Number(r.price_change_pct) || 0,
      revenue_impact: Number(r.revenue_impact) || 0,
      current_margin_pct: Number(r.current_margin_pct) || 0,
      projected_margin_pct: Number(r.projected_margin_pct) || 0,
      total_transactions: Number(r.total_transactions) || 0,
    }));
  }, [recommendations]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...normalizedRecommendations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.product_name ?? '').toLowerCase().includes(query) ||
          (r.product_id ?? '').toLowerCase().includes(query) ||
          (r.department ?? '').toLowerCase().includes(query) ||
          (r.category ?? '').toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];

      if (sortField === 'recommendation_priority') {
        aVal = priorityOrder[a.recommendation_priority];
        bVal = priorityOrder[b.recommendation_priority];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [normalizedRecommendations, searchQuery, sortField, sortDirection]);

  const handleAccept = useCallback((productId: string) => {
    acceptRecommendation(productId);
  }, [acceptRecommendation]);

  // Guard against null/undefined data - after all hooks
  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
    return <NoDataFallback title="No recommendations" message="Price recommendation data is not available." height="h-[400px]" />;
  }

  // Pagination
  const totalPages = Math.ceil((filteredData ?? []).length / pageSize);
  const paginatedData = (filteredData ?? []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === (paginatedData ?? []).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((paginatedData ?? []).map((r) => r.product_id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAccept = () => {
    (selectedIds ?? []).forEach((id) => {
      if (!recommendationActions[id]) {
        acceptRecommendation(id);
      }
    });
    setSelectedIds(new Set());
  };

  const handleReject = (productId: string, reason: string) => {
    rejectRecommendation(productId, reason);
    setRejectDropdown(null);
  };

  const handleOverrideStart = (productId: string, currentRecommended: number) => {
    setOverrideInputs({ ...overrideInputs, [productId]: currentRecommended.toString() });
  };

  const handleOverrideSubmit = (productId: string) => {
    const price = parseFloat(overrideInputs[productId]);
    if (!isNaN(price) && price > 0) {
      overrideRecommendation(productId, price);
      const newInputs = { ...overrideInputs };
      delete newInputs[productId];
      setOverrideInputs(newInputs);
    }
  };

  const handleOverrideCancel = (productId: string) => {
    const newInputs = { ...overrideInputs };
    delete newInputs[productId];
    setOverrideInputs(newInputs);
  };

  const handleExport = () => {
    const selectedData = recommendations.filter((r) => selectedIds.has(r.product_id));
    const csv = [
      ['Product ID', 'Product Name', 'Department', 'Category', 'Current Price', 'Recommended Price', 'Change %', 'Revenue Impact', 'Priority'].join(','),
      ...selectedData.map((r) =>
        [r.product_id, `"${r.product_name}"`, r.department, r.category, r.current_price, r.recommended_price, (r.price_change_pct ?? 0).toFixed(1), r.revenue_impact, r.recommendation_priority].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'price_recommendations.csv';
    a.click();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const getActionStatus = (productId: string) => recommendationActions[productId];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Price Recommendations
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {(filteredData ?? []).length} products · {selectedIds.size} selected
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 border border-[var(--border-default)] rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkAccept}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <Check size={14} />
                Accept Selected
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border-default)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Download size={14} />
                Export
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={(paginatedData ?? []).length > 0 && selectedIds.size === (paginatedData ?? []).length}
                  onChange={handleSelectAll}
                  className="rounded border-[var(--border-default)]"
                />
              </th>
              <th
                className="p-3 text-left font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => handleSort('product_name')}
              >
                <div className="flex items-center gap-1">
                  Product <SortIcon field="product_name" />
                </div>
              </th>
              <th
                className="p-3 text-left font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => handleSort('department')}
              >
                <div className="flex items-center gap-1">
                  Department <SortIcon field="department" />
                </div>
              </th>
              <th
                className="p-3 text-right font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => handleSort('current_price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Current <SortIcon field="current_price" />
                </div>
              </th>
              <th
                className="p-3 text-right font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => handleSort('recommended_price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Recommended <SortIcon field="recommended_price" />
                </div>
              </th>
              <th
                className="p-3 text-right font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => handleSort('price_change_pct')}
              >
                <div className="flex items-center justify-end gap-1">
                  Change <SortIcon field="price_change_pct" />
                </div>
              </th>
              <th
                className="p-3 text-right font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => handleSort('revenue_impact')}
              >
                <div className="flex items-center justify-end gap-1">
                  Impact <SortIcon field="revenue_impact" />
                </div>
              </th>
              <th
                className="p-3 text-center font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => handleSort('recommendation_priority')}
              >
                <div className="flex items-center justify-center gap-1">
                  Priority <SortIcon field="recommendation_priority" />
                </div>
              </th>
              <th className="p-3 text-center font-medium text-[var(--text-secondary)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {(paginatedData ?? []).map((rec) => {
              const action = getActionStatus(rec.product_id);
              const isOverriding = overrideInputs[rec.product_id] !== undefined;
              const isRejectOpen = rejectDropdown === rec.product_id;

              return (
                <tr
                  key={rec.product_id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rec.product_id)}
                      onChange={() => handleSelectOne(rec.product_id)}
                      className="rounded border-[var(--border-default)]"
                    />
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => onProductClick?.(rec.product_id)}
                      className="text-left hover:text-[var(--accent-primary)] transition-colors"
                    >
                      <div className="font-medium text-[var(--text-primary)]">{rec.product_name}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{rec.product_id}</div>
                    </button>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">
                    <div>{rec.department}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{rec.category}</div>
                  </td>
                  <td className="p-3 text-right font-medium text-[var(--text-primary)]">
                    {formatCurrency(rec.current_price)}
                  </td>
                  <td className="p-3 text-right">
                    {isOverriding ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={overrideInputs[rec.product_id]}
                          onChange={(e) =>
                            setOverrideInputs({ ...overrideInputs, [rec.product_id]: e.target.value })
                          }
                          className="w-20 px-2 py-1 border border-[var(--border-default)] rounded text-right text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleOverrideSubmit(rec.product_id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleOverrideCancel(rec.product_id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-[var(--text-primary)]">
                        {action?.action === 'overridden'
                          ? formatCurrency(action.overridePrice!)
                          : formatCurrency(rec.recommended_price)}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {(() => {
                      const pct = Number(rec.price_change_pct) || 0;
                      return (
                        <div className={`flex items-center justify-end gap-1 font-medium ${
                          pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : 'text-[var(--text-tertiary)]'
                        }`}>
                          {pct > 0 ? (
                            <TrendingUp size={14} />
                          ) : pct < 0 ? (
                            <TrendingDown size={14} />
                          ) : null}
                          {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-right">
                    {(() => {
                      const impact = Number(rec.revenue_impact) || 0;
                      return (
                        <span className={`font-medium ${impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {impact >= 0 ? '+' : ''}₹{(impact / 1000).toFixed(0)}K
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[rec.recommendation_priority]}`}>
                      {rec.recommendation_priority}
                    </span>
                  </td>
                  <td className="p-3">
                    {action ? (
                      <div className="text-center">
                        {action.action === 'accepted' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            <Check size={12} /> Accepted
                          </span>
                        )}
                        {action.action === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            <X size={12} /> Rejected
                          </span>
                        )}
                        {action.action === 'overridden' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            <Edit3 size={12} /> Override
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 relative">
                        <button
                          onClick={() => handleAccept(rec.product_id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Accept"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleOverrideStart(rec.product_id, rec.recommended_price)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Override"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => setRejectDropdown(isRejectOpen ? null : rec.product_id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>

                        {/* Reject dropdown */}
                        {isRejectOpen && (
                          <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-[var(--border-default)] rounded-lg shadow-lg py-1 min-w-[180px]">
                            {(rejectionReasons ?? []).map((reason) => (
                              <button
                                key={reason}
                                onClick={() => handleReject(rec.product_id, reason)}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                              >
                                {reason}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="text-sm text-[var(--text-tertiary)]">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, (filteredData ?? []).length)} of {(filteredData ?? []).length} products
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-[var(--border-default)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-[var(--border-default)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
