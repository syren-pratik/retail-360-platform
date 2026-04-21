'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  X,
  Edit2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PriceProductRow } from '@/app/lib/price-types';
import { usePrice } from '@/app/context/PriceContext';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface ProductPriceTableProps {
  products: PriceProductRow[];
}

type SortField = keyof PriceProductRow;
type SortDirection = 'asc' | 'desc';

function formatCurrency(value: number): string {
  return `₹${(value ?? 0).toLocaleString('en-IN')}`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-gray-100 text-gray-600',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    overridden: 'bg-blue-100 text-blue-700',
  };
  const labels = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    overridden: 'Overridden',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

export default function ProductPriceTable({ products }: ProductPriceTableProps) {
  const router = useRouter();
  const { acceptRecommendation, rejectRecommendation, overrideRecommendation, getRecommendationAction } = usePrice();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('recommendation_priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [rejectDropdown, setRejectDropdown] = useState<string | null>(null);
  const [overrideInput, setOverrideInput] = useState<{ id: string; price: string } | null>(null);

  const pageSize = 20;
  const safeProducts = products ?? [];

  // Get unique departments
  const departments = useMemo(() => {
    return Array.from(new Set((safeProducts ?? []).map(p => p.department))).sort();
  }, [safeProducts]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...safeProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.product_name ?? '').toLowerCase().includes(query) ||
        (p.product_id ?? '').toLowerCase().includes(query) ||
        (p.category ?? '').toLowerCase().includes(query)
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      result = result.filter(p => p.department === departmentFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(p => p.recommendation_priority === priorityFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [safeProducts, searchQuery, sortField, sortDirection, departmentFilter, priorityFilter]);

  // Pagination
  const totalPages = Math.ceil((filteredProducts ?? []).length / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filteredProducts ?? []).slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  const handleAccept = useCallback((productId: string) => {
    acceptRecommendation(productId);
  }, [acceptRecommendation]);

  // Guard against null/undefined data - after all hooks
  if (!products || !Array.isArray(products) || products.length === 0) {
    return <NoDataFallback title="No products" message="Product price data is not available." height="h-[400px]" />;
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === (paginatedProducts ?? []).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set((paginatedProducts ?? []).map(p => p.product_id)));
    }
  };

  const handleSelectRow = (productId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedRows(newSelected);
  };

  const handleReject = (productId: string, reason: string) => {
    rejectRecommendation(productId, reason);
    setRejectDropdown(null);
  };

  const handleOverride = (productId: string, price: number) => {
    overrideRecommendation(productId, price);
    setOverrideInput(null);
  };

  const handleBulkAccept = () => {
    (selectedRows ?? []).forEach(id => acceptRecommendation(id));
    setSelectedRows(new Set());
  };

  const handleExport = () => {
    const dataToExport = selectedRows.size > 0
      ? (products ?? []).filter(p => selectedRows.has(p.product_id))
      : filteredProducts;

    const headers = ['Product ID', 'Product Name', 'Department', 'Category', 'Current Price', 'MRP', 'Cost', 'Margin %', 'Elasticity', 'Competitor Avg', 'Comp Index', 'Recommended Price', 'Priority'];
    const rows = dataToExport.map(p => [
      p.product_id,
      p.product_name,
      p.department,
      p.category,
      p.current_price,
      p.mrp,
      p.cost_price,
      p.margin_pct,
      p.elasticity,
      p.competitor_avg,
      p.competitive_index,
      p.recommended_price,
      p.recommendation_priority,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleRowClick = (productId: string) => {
    router.push(`/price/product/${productId}`);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="p-3 text-left font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        )}
      </div>
    </th>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Product Price Table
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {(filteredProducts ?? []).length} products · {selectedRows.size} selected
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 border border-[var(--border-default)] rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="all">All Departments</option>
            {(departments ?? []).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Bulk Actions */}
          {selectedRows.size > 0 && (
            <button
              onClick={handleBulkAccept}
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Accept {selectedRows.size} Selected
            </button>
          )}

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Download size={16} />
            Export
          </button>
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
                  checked={selectedRows.size === (paginatedProducts ?? []).length && (paginatedProducts ?? []).length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-[var(--border-default)]"
                />
              </th>
              <SortHeader field="product_id">ID</SortHeader>
              <SortHeader field="product_name">Product</SortHeader>
              <SortHeader field="department">Dept</SortHeader>
              <SortHeader field="current_price">Current ₹</SortHeader>
              <SortHeader field="cost_price">Cost ₹</SortHeader>
              <SortHeader field="margin_pct">Margin %</SortHeader>
              <SortHeader field="elasticity">Elasticity</SortHeader>
              <SortHeader field="competitor_avg">Comp ₹</SortHeader>
              <SortHeader field="competitive_index">Index</SortHeader>
              <SortHeader field="recommended_price">Rec ₹</SortHeader>
              <th className="p-3 text-center font-medium text-[var(--text-secondary)]">Change</th>
              <SortHeader field="recommendation_priority">Priority</SortHeader>
              <th className="p-3 text-center font-medium text-[var(--text-secondary)]">Status</th>
              <th className="p-3 text-center font-medium text-[var(--text-secondary)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(paginatedProducts ?? []).map((product) => {
              const actionData = getRecommendationAction(product.product_id);
              const status = actionData?.action || 'pending';
              const changePct = ((product.recommended_price - product.current_price) / product.current_price) * 100;
              const isIncrease = changePct > 0;

              return (
                <tr
                  key={product.product_id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, input, select')) return;
                    handleRowClick(product.product_id);
                  }}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(product.product_id)}
                      onChange={() => handleSelectRow(product.product_id)}
                      className="rounded border-[var(--border-default)]"
                    />
                  </td>
                  <td className="p-3 font-mono text-xs text-[var(--text-tertiary)]">
                    {product.product_id}
                  </td>
                  <td className="p-3">
                    <div className="text-[var(--text-primary)] font-medium">{product.product_name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{product.category}</div>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{product.department}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(product.current_price)}</td>
                  <td className="p-3 text-right text-[var(--text-tertiary)]">{formatCurrency(product.cost_price)}</td>
                  <td className="p-3 text-right">
                    <span className={`font-medium ${
                      product.margin_pct < 10 ? 'text-red-600' :
                      product.margin_pct < 15 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {(product.margin_pct ?? 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-medium ${
                      Math.abs(product.elasticity) > 1 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(product.elasticity ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-right text-[var(--text-secondary)]">{formatCurrency(product.competitor_avg)}</td>
                  <td className="p-3 text-right">
                    <span className={`font-medium ${
                      product.competitive_index > 110 ? 'text-red-600' :
                      product.competitive_index < 100 ? 'text-green-600' : 'text-[var(--text-primary)]'
                    }`}>
                      {(product.competitive_index ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium text-[var(--accent-primary)]">
                    {formatCurrency(product.recommended_price)}
                  </td>
                  <td className="p-3 text-center">
                    {changePct !== 0 ? (
                      <span className={`flex items-center justify-center gap-0.5 font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncrease ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(changePct).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <PriorityBadge priority={product.recommendation_priority} />
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge status={status} />
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAccept(product.product_id)}
                            className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                            title="Accept"
                          >
                            <Check size={14} />
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setOverrideInput(overrideInput?.id === product.product_id ? null : { id: product.product_id, price: product.recommended_price.toString() })}
                              className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                              title="Override"
                            >
                              <Edit2 size={14} />
                            </button>
                            {overrideInput?.id === product.product_id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOverrideInput(null)} />
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-2 min-w-[140px]">
                                  <input
                                    type="number"
                                    value={overrideInput.price}
                                    onChange={(e) => setOverrideInput({ ...overrideInput, price: e.target.value })}
                                    className="w-full px-2 py-1 border border-[var(--border-default)] rounded text-sm mb-2"
                                    placeholder="New price"
                                  />
                                  <button
                                    onClick={() => handleOverride(product.product_id, parseFloat(overrideInput.price))}
                                    className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => setRejectDropdown(rejectDropdown === product.product_id ? null : product.product_id)}
                              className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                            {rejectDropdown === product.product_id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setRejectDropdown(null)} />
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[var(--border-default)] rounded-lg shadow-lg py-1 min-w-[160px]">
                                  {['Competitive pressure', 'Brand positioning', 'Customer feedback', 'Other'].map(reason => (
                                    <button
                                      key={reason}
                                      onClick={() => handleReject(product.product_id, reason)}
                                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
                                    >
                                      {reason}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}
                      {status !== 'pending' && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {status === 'overridden' && actionData?.overridePrice
                            ? formatCurrency(actionData.overridePrice)
                            : '—'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="text-sm text-[var(--text-secondary)]">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, (filteredProducts ?? []).length)} of {(filteredProducts ?? []).length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-[var(--text-primary)]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
